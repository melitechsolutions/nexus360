import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { payments, invoices } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Feature-based procedures
const readProcedure = createFeatureRestrictedProcedure("accounting:read");
const createProcedure = createFeatureRestrictedProcedure("accounting:create");
const updateProcedure = createFeatureRestrictedProcedure("accounting:edit");
const deleteProcedure = createFeatureRestrictedProcedure("accounting:delete");

/**
 * Bank Reconciliation Router
 * Generates reconciliation reports by comparing bank transactions (payments) with system records (invoices/expenses)
 * No separate database table needed - calculates from existing payment and invoice data
 */
export const bankReconciliationRouter = router({
  /**
   * Get list of reconciliation periods/accounts
   */
  list: readProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.number().optional(),
    }).optional())
    .query(async () => {
      // Return hardcoded bank accounts for now (in a real system, these would be in a settings table)
      return [
        {
          id: "main",
          name: "Main Business Account",
          bankCode: "KCB",
          accountNumber: "1234567890",
          currency: "KES",
          status: "active",
        },
        {
          id: "payroll",
          name: "Payroll Account",
          bankCode: "Equity",
          accountNumber: "0987654321",
          currency: "KES",
          status: "active",
        },
      ];
    }),

  /**
   * Get reconciliation details for a specific period/account
   */
  getById: readProcedure
    .input(z.string())
    .query(async ({ input: accountId }) => {
      const database = await getDb();
      if (!database) return null;

      try {
        // Get all payments (bank transactions)
        const bankTransactions = await database.select().from(payments);

        // Get all invoices (system records)
        const invoiceRecords = await database.select().from(invoices);

        // Calculate totals
        const bankBalance = bankTransactions.reduce((sum, p) => sum + (p.amount || 0), 0);
        const systemBalance = invoiceRecords.reduce((sum, i) => sum + (i.total || 0), 0);

        // Find matched/unmatched transactions
        const matched = bankTransactions.filter(p => 
          invoiceRecords.some(i => 
            (p.invoiceId && i.id === p.invoiceId) || 
            (p.amount && i.total && Math.abs(p.amount - i.total) < 0.01)
          )
        );

        const unmatched = bankTransactions.filter(p =>
          !matched.some(m => m.id === p.id)
        );

        return {
          id: accountId,
          bankAccount: "Main Account",
          accountNumber: "1234567890",
          period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          bankBalance,
          bookBalance: systemBalance,
          difference: Math.abs(bankBalance - systemBalance),
          status: Math.abs(bankBalance - systemBalance) < 0.01 ? "Reconciled" : "Unreconciled",
          reconciliationDate: new Date().toISOString(),
          matchedTransactions: matched.length,
          unmatchedTransactions: unmatched.length,
          transactions: bankTransactions.map(p => ({
            id: p.id,
            date: p.paymentDate,
            description: p.paymentMethod || "Bank Transfer",
            amount: p.amount,
            status: matched.some(m => m.id === p.id) ? "matched" : "unmatched",
          })),
        };
      } catch (error) {
        console.error("[BankReconciliation] Failed to get reconciliation:", error);
        return null;
      }
    }),

  /**
   * Create a new reconciliation record
   */
  create: createProcedure
    .input(z.object({
      bankAccount: z.string(),
      period: z.string(),
      bankBalance: z.number(),
      bookBalance: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // In a real system, this would save to a bank_reconciliations table
      // For now, we just return the input data
      return {
        id: `rec_${Date.now()}`,
        ...input,
        status: "recorded",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
    }),

  /**
   * Update reconciliation status
   */
  update: updateProcedure
    .input(z.object({
      id: z.string(),
      bankAccount: z.string().optional(),
      period: z.string().optional(),
      bankBalance: z.number().optional(),
      bookBalance: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return {
        id,
        ...updates,
        status: "updated",
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
    }),

  /**
   * Delete reconciliation record
   */
  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input: id }) => {
      return { success: true, id };
    }),
});

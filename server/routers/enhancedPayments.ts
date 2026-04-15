import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { payments, invoices, accounts, clients } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

const readProcedure = createFeatureRestrictedProcedure("accounting:payments:view");
const writeProcedure = createFeatureRestrictedProcedure("accounting:payments:create");

/**
 * Enhanced Payments Router with Chart of Accounts Integration
 * Handles payment creation with automatic COA balance updates
 */
export const enhancedPaymentsRouter = router({
  /**
   * Create payment with automatic COA balance update
   */
  createPaymentWithCOA: writeProcedure
    .input(z.object({
      invoiceId: z.string(),
      clientId: z.string(),
      accountId: z.string().describe("Chart of Accounts ID for payment destination"),
      amount: z.number().positive(),
      paymentDate: z.string(),
      paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'mpesa', 'card', 'other']),
      referenceNumber: z.string().optional(),
      chartOfAccountType: z.enum(['debit', 'credit']).default('debit'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Verify invoice exists
        const invoiceData = await database
          .select()
          .from(invoices)
          .where(eq(invoices.id, input.invoiceId))
          .limit(1);

        if (!invoiceData || invoiceData.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        const invoice = invoiceData[0];

        // Verify COA account exists
        const accountData = await database
          .select()
          .from(accounts)
          .where(eq(accounts.id, input.accountId))
          .limit(1);

        if (!accountData || accountData.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chart of Accounts entry not found",
          });
        }

        const account = accountData[0];

        // Verify payment doesn't exceed invoice amount
        const existingPayments = await database
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.invoiceId, input.invoiceId),
              eq(payments.status, 'completed')
            )
          );

        const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (totalPaid + input.amount > invoice.total) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment amount exceeds invoice total. Invoice: ${invoice.total}, Already paid: ${totalPaid}, Attempting to pay: ${input.amount}`,
          });
        }

        // Create payment record
        const paymentId = uuidv4();
        await database.insert(payments).values({
          id: paymentId,
          invoiceId: input.invoiceId,
          clientId: input.clientId,
          accountId: input.accountId,
          amount: Math.round(input.amount * 100), // Store as cents
          paymentDate: new Date(input.paymentDate).toISOString(),
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber || null,
          chartOfAccountType: input.chartOfAccountType,
          notes: input.notes || null,
          status: 'completed',
          createdBy: ctx.user.id,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any);

        // Update COA balance based on payment type
        const balanceChange = input.chartOfAccountType === 'debit' 
          ? Math.round(input.amount * 100)
          : -Math.round(input.amount * 100);

        const newBalance = (account.balance || 0) + balanceChange;
        await database
          .update(accounts)
          .set({
            balance: newBalance,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(accounts.id, input.accountId));

        // Update invoice paid amount
        const newPaidAmount = invoice.paidAmount + Math.round(input.amount * 100);
        const newInvoiceStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';

        await database
          .update(invoices)
          .set({
            paidAmount: newPaidAmount,
            status: newInvoiceStatus,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(invoices.id, input.invoiceId));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "payment_created_with_coa_update",
          entityType: "payment",
          entityId: paymentId,
          description: `Payment of ${input.amount} created for invoice ${invoice.invoiceNumber} with COA ${account.accountCode} update`,
        });

        return {
          success: true,
          paymentId,
          newBalance,
          invoiceStatus: newInvoiceStatus,
          message: "Payment processed successfully with COA balance updated",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create payment: ${error}`,
        });
      }
    }),

  /**
   * Get payment with COA details
   */
  getPaymentWithCOA: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const paymentData = await database
        .select()
        .from(payments)
        .where(eq(payments.id, input))
        .limit(1);

      if (!paymentData || paymentData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      const payment = paymentData[0];

      // Get related invoice and COA account
      const invoiceData = await database.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
      const accountData = payment.accountId 
        ? await database.select().from(accounts).where(eq(accounts.id, payment.accountId))
        : [];

      return {
        payment,
        invoice: invoiceData[0] || null,
        account: accountData[0] || null,
      };
    }),

  /**
   * List payments for an invoice with COA details
   */
  listInvoicePayments: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const paymentList = await database
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, input));

      // Enrich with account details
      const enriched = await Promise.all(
        paymentList.map(async (payment) => {
          if (!payment.accountId) return payment;
          const accountData = await database
            .select()
            .from(accounts)
            .where(eq(accounts.id, payment.accountId));
          return {
            ...payment,
            account: accountData[0] || null,
          };
        })
      );

      return enriched;
    }),

  /**
   * Reverse payment and update COA balance
   */
  reversePayment: writeProcedure
    .input(z.object({
      paymentId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Get payment details
        const paymentData = await database
          .select()
          .from(payments)
          .where(eq(payments.id, input.paymentId));

        if (!paymentData || paymentData.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        const payment = paymentData[0];

        if (payment.status !== 'completed') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot reverse a ${payment.status} payment`,
          });
        }

        // Get COA account
        const accountData = await database
          .select()
          .from(accounts)
          .where(eq(accounts.id, payment.accountId));

        if (!accountData || accountData.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chart of Accounts entry not found",
          });
        }

        const account = accountData[0];

        // Reverse COA balance
        const balanceChange = payment.chartOfAccountType === 'debit' 
          ? -(payment.amount || 0)
          : (payment.amount || 0);

        const newBalance = (account.balance || 0) + balanceChange;
        await database
          .update(accounts)
          .set({
            balance: newBalance,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(accounts.id, payment.accountId));

        // Get invoice and update paid amount
        const invoiceData = await database
          .select()
          .from(invoices)
          .where(eq(invoices.id, payment.invoiceId));

        if (invoiceData && invoiceData.length > 0) {
          const invoice = invoiceData[0];
          const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - (payment.amount || 0));
          const newInvoiceStatus = newPaidAmount === 0 ? 'draft' : 'partial';

          await database
            .update(invoices)
            .set({
              paidAmount: newPaidAmount,
              status: newInvoiceStatus,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            })
            .where(eq(invoices.id, payment.invoiceId));
        }

        // Mark payment as cancelled
        await database
          .update(payments)
          .set({
            status: 'cancelled',
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(payments.id, input.paymentId));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "payment_reversed",
          entityType: "payment",
          entityId: input.paymentId,
          description: `Payment reversed: ${input.reason || 'No reason provided'}`,
        });

        return {
          success: true,
          message: "Payment reversed successfully with COA balance updated",
          newBalance,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to reverse payment: ${error}`,
        });
      }
    }),

  /**
   * Get COA account balance for payment verification
   */
  getAccountBalance: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const accountData = await database
        .select()
        .from(accounts)
        .where(eq(accounts.id, input));

      if (!accountData || accountData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      return accountData[0];
    }),
});

/**
 * Payment Reconciliation Router
 * 
 * Provides payment matching, discrepancy detection, and reconciliation workflows
 */

import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { payments, invoices, accounts } from "../../drizzle/schema";
import { eq, and, gte, lte, isNull, ne, desc } from "drizzle-orm";

// Feature-based procedures
const reconciliationViewProcedure = createFeatureRestrictedProcedure("payments:view");
const reconciliationEditProcedure = createFeatureRestrictedProcedure("payments:edit", "reconciliation");

export const paymentReconciliationRouter = router({
  /**
   * Get reconciliation status summary
   * Shows counts of matched, unmatched, and discrepant payments
   */
  getReconciliationStatus: protectedProcedure
    .input(z.object({
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      accountId: z.string().optional(),
    }).strict())
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Fetch all payments in period with date filtering
      const conditions: any[] = [];
      if (input.dateFrom) conditions.push(gte(payments.paymentDate, input.dateFrom.toISOString()));
      if (input.dateTo) conditions.push(lte(payments.paymentDate, input.dateTo.toISOString()));
      if (input.accountId) conditions.push(eq(payments.accountId, input.accountId));

      const allPayments = await db.select().from(payments).where(conditions.length > 0 ? and(...conditions) : undefined);
      
      // Calculate totals
      const totalAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const matchedPayments = allPayments.filter(p => p.invoiceId);
      const unmatchedPayments = allPayments.filter(p => !p.invoiceId);
      
      // Identify discrepancies (payments with significant differences)
      const discrepancies: any[] = [];
      for (const payment of matchedPayments) {
        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, payment.invoiceId || ""),
        });
        
        if (invoice && Math.abs((payment.amount || 0) - (invoice.total || 0)) > 0.01) {
          discrepancies.push({
            paymentId: payment.id,
            invoiceId: invoice.id,
            paymentAmount: payment.amount,
            invoiceAmount: invoice.total,
            difference: (payment.amount || 0) - (invoice.total || 0),
            invoiceNumber: invoice.invoiceNumber,
          });
        }
      }
      
      return {
        totalPayments: allPayments.length,
        matchedPayments: matchedPayments.length,
        unmatchedPayments: unmatchedPayments.length,
        discrepancyCount: discrepancies.length,
        totalAmount,
        matchedAmount: matchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        unmatchedAmount: unmatchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        reconciliationRate: allPayments.length > 0 ? (matchedPayments.length / allPayments.length) * 100 : 0,
      };
    }),

  /**
   * Get list of unmatched payments
   */
  getUnmatchedPayments: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }).strict())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const allPayments = await db.query.payments.findMany({});
      const unmatchedPayments = allPayments.filter(p => !p.invoiceId);
      
      const paginated = unmatchedPayments.slice(input.offset, input.offset + input.limit);
      
      return {
        payments: paginated.map(p => ({
          id: p.id,
          reference: p.reference,
          amount: p.amount,
          paymentDate: p.createdAt,
          method: p.paymentMethod,
          status: p.paymentStatus,
          notes: p.notes,
        })),
        total: unmatchedPayments.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get discrepant payments (matched but with amount differences)
   */
  getDiscrepancies: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      threshold: z.number().min(0).default(0.01), // Min difference to flag
    }).strict())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const matchedPayments = await db.query.payments.findMany({
        where: ne(payments.invoiceId, null),
      });
      
      const discrepancies: any[] = [];
      
      for (const payment of matchedPayments) {
        if (!payment.invoiceId) continue;
        
        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, payment.invoiceId),
        });
        
        if (invoice) {
          const diff = Math.abs((payment.amount || 0) - (invoice.total || 0));
          if (diff > input.threshold) {
            discrepancies.push({
              paymentId: payment.id,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName,
              paymentAmount: payment.amount,
              invoiceAmount: invoice.total,
              difference: (payment.amount || 0) - (invoice.total || 0),
              variancePercent: invoice.total ? ((diff / invoice.total) * 100).toFixed(2) : 0,
              paymentDate: payment.createdAt,
              invoiceDate: invoice.createdAt,
              status: "discrepancy",
            });
          }
        }
      }
      
      // Sort by absolute difference (largest first)
      discrepancies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
      
      const paginated = discrepancies.slice(input.offset, input.offset + input.limit);
      
      return {
        discrepancies: paginated,
        total: discrepancies.length,
        totalDiscrepancyAmount: discrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0),
        averageDiscrepancy: discrepancies.length > 0 
          ? discrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0) / discrepancies.length 
          : 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get pending reconciliation items
   * Shows payments and invoices that need attention
   */
  getPendingReconciliation: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }).strict())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const allPayments = await db.query.payments.findMany({});
      const allInvoices = await db.query.invoices.findMany({});
      
      // Unmatched payments
      const unmatchedPayments = allPayments.filter(p => !p.invoiceId);
      
      // Unpaid invoices (not matched to payment)
      const paidPaymentInvoiceIds = new Set(
        allPayments.filter(p => p.invoiceId).map(p => p.invoiceId)
      );
      const unpaidInvoices = allInvoices.filter(inv => !paidPaymentInvoiceIds.has(inv.id));
      
      return {
        unmatchedPayments: unmatchedPayments.slice(0, input.limit).map(p => ({
          type: "payment",
          id: p.id,
          reference: p.reference,
          amount: p.amount,
          date: p.createdAt,
          action: "Match to invoice",
        })),
        unpaidInvoices: unpaidInvoices.slice(0, input.limit).map(inv => ({
          type: "invoice",
          id: inv.id,
          reference: inv.invoiceNumber,
          amount: inv.total,
          date: inv.createdAt,
          action: "Link payment",
        })),
        totalPending: unmatchedPayments.length + unpaidInvoices.length,
      };
    }),

  /**
   * Match payments to invoices automatically
   * Uses fuzzy matching on amounts and dates
   */
  autoMatchPayments: reconciliationEditProcedure
    .input(z.object({
      paymentId: z.string().optional(),
      threshold: z.number().min(0).max(1).default(0.99), // Match confidence threshold
    }).strict())
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const allPayments = await db.query.payments.findMany({});
      const allInvoices = await db.query.invoices.findMany({});
      
      // Filter to unmatched payments
      let unmatchedPayments = allPayments.filter(p => !p.invoiceId);
      if (input.paymentId) {
        unmatchedPayments = unmatchedPayments.filter(p => p.id === input.paymentId);
      }
      
      const matches: any[] = [];
      let matchCount = 0;
      
      for (const payment of unmatchedPayments) {
        // Find invoices with similar amounts (within 1%)
        const candidates = allInvoices.filter(inv => {
          const diff = Math.abs((payment.amount || 0) - (inv.total || 0));
          const tolerance = (inv.total || 0) * 0.01;
          return diff <= tolerance;
        });
        
        // If exactly one match found, auto-match
        if (candidates.length === 1) {
          matches.push({
            paymentId: payment.id,
            invoiceId: candidates[0].id,
            confidence: 0.99,
            matched: true,
          });
          matchCount++;
        } else if (candidates.length > 1) {
          // Multiple candidates - find best match by date proximity
          candidates.sort((a, b) => {
            const aDiff = Math.abs(
              (payment.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
            );
            const bDiff = Math.abs(
              (payment.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
            );
            return aDiff - bDiff;
          });
          
          matches.push({
            paymentId: payment.id,
            invoiceId: candidates[0].id,
            confidence: 0.85,
            matched: true,
          });
          matchCount++;
        }
      }
      
      return {
        matchesFound: matches,
        matchCount,
        totalProcessed: unmatchedPayments.length,
        successRate: unmatchedPayments.length > 0 ? (matchCount / unmatchedPayments.length) * 100 : 0,
      };
    }),

  /**
   * Manually match payment to invoice
   */
  matchPaymentToInvoice: reconciliationEditProcedure
    .input(z.object({
      paymentId: z.string(),
      invoiceId: z.string(),
      notes: z.string().optional(),
    }).strict())
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      try {
        // Update payment to link invoice
        await db.update(payments)
          .set({ invoiceId: input.invoiceId })
          .where(eq(payments.id, input.paymentId));
        
        return {
          success: true,
          paymentId: input.paymentId,
          invoiceId: input.invoiceId,
          message: "Payment successfully matched to invoice",
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to match payment: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
      }
    }),

  /**
   * Reverse/undo a payment match
   */
  reversePaymentMatch: reconciliationEditProcedure
    .input(z.object({
      paymentId: z.string(),
      reason: z.string().optional(),
    }).strict())
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      try {
        const payment = await db.query.payments.findFirst({
          where: eq(payments.id, input.paymentId),
        });
        
        if (!payment) {
          return { success: false, error: "Payment not found" };
        }
        
        if (!payment.invoiceId) {
          return { success: false, error: "Payment is not currently matched" };
        }
        
        // Clear the invoice link
        await db.update(payments)
          .set({ invoiceId: null })
          .where(eq(payments.id, input.paymentId));
        
        return {
          success: true,
          paymentId: input.paymentId,
          previousInvoiceId: payment.invoiceId,
          message: "Payment match successfully reversed",
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to reverse match: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
      }
    }),

  /**
   * Bulk match multiple payments
   */
  bulkMatchPayments: reconciliationEditProcedure
    .input(z.object({
      matches: z.array(z.object({
        paymentId: z.string(),
        invoiceId: z.string(),
      })),
      confirmOverwrite: z.boolean().default(false),
    }).strict())
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const results = {
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [] as string[],
      };
      
      for (const match of input.matches) {
        try {
          const payment = await db.query.payments.findFirst({
            where: eq(payments.id, match.paymentId),
          });
          
          if (!payment) {
            results.errors.push(`Payment ${match.paymentId} not found`);
            results.failed++;
            continue;
          }
          
          if (payment.invoiceId && !input.confirmOverwrite) {
            results.errors.push(`Payment ${match.paymentId} already matched (use confirmOverwrite to replace)`);
            results.skipped++;
            continue;
          }
          
          await db.update(payments)
            .set({ invoiceId: match.invoiceId })
            .where(eq(payments.id, match.paymentId));
          
          results.successful++;
        } catch (error) {
          results.errors.push(`Error matching ${match.paymentId}: ${error instanceof Error ? error.message : "Unknown error"}`);
          results.failed++;
        }
      }
      
      return {
        ...results,
        totalProcessed: input.matches.length,
        successRate: input.matches.length > 0 ? (results.successful / input.matches.length) * 100 : 0,
        timestamp: new Date(),
      };
    }),

  /**
   * Get reconciliation report
   * Generates detailed report of reconciliation status
   */
  getReconciliationReport: protectedProcedure
    .input(z.object({
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      includeDetails: z.boolean().default(false),
    }).strict())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const allPayments = await db.query.payments.findMany({});
      const allInvoices = await db.query.invoices.findMany({});
      
      const matchedPayments = allPayments.filter(p => p.invoiceId);
      const unmatchedPayments = allPayments.filter(p => !p.invoiceId);
      
      // Calculate totals
      const totalPaymentAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const matchedAmount = matchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const unmatchedAmount = unmatchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const totalInvoiceAmount = allInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const linkedInvoiceAmount = allInvoices
        .filter(i => matchedPayments.some(p => p.invoiceId === i.id))
        .reduce((sum, i) => sum + (i.total || 0), 0);
      
      // Age analysis
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      const unmatchedUnder30 = unmatchedPayments.filter(p => (p.createdAt || now) > thirtyDaysAgo);
      const unmatchedUnder60 = unmatchedPayments.filter(
        p => (p.createdAt || now) <= thirtyDaysAgo && (p.createdAt || now) > sixtyDaysAgo
      );
      const unmatchedOver60 = unmatchedPayments.filter(p => (p.createdAt || now) <= sixtyDaysAgo);
      
      return {
        summary: {
          reportDate: new Date(),
          periodStart: input.dateFrom,
          periodEnd: input.dateTo,
        },
        payments: {
          total: allPayments.length,
          matched: matchedPayments.length,
          unmatched: unmatchedPayments.length,
          matchRate: allPayments.length > 0 ? (matchedPayments.length / allPayments.length) * 100 : 0,
        },
        amounts: {
          totalPayments: totalPaymentAmount,
          matchedPayments: matchedAmount,
          unmatchedPayments: unmatchedAmount,
          totalInvoices: totalInvoiceAmount,
          linkedInvoices: linkedInvoiceAmount,
          unreconciledDifference: Math.abs(totalPaymentAmount - matchedAmount),
        },
        age: {
          unmatchedUnder30Days: {
            count: unmatchedUnder30.length,
            amount: unmatchedUnder30.reduce((sum, p) => sum + (p.amount || 0), 0),
          },
          unmatchedUnder60Days: {
            count: unmatchedUnder60.length,
            amount: unmatchedUnder60.reduce((sum, p) => sum + (p.amount || 0), 0),
          },
          unmatchedOver60Days: {
            count: unmatchedOver60.length,
            amount: unmatchedOver60.reduce((sum, p) => sum + (p.amount || 0), 0),
          },
        },
        actions: {
          automatchAttempted: false,
          automatchSuccessful: 0,
          manualMatchesRequired: unmatchedPayments.length,
        },
      };
    }),

  /**
   * Get reconciliation history/timeline
   */
  getReconciliationHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).strict())
    .query(async ({ input }) => {
      // Query activity log for reconciliation actions
      const db = await getDb();
      try {
        const { activityLog } = await import('../../drizzle/schema');
        const logs = await db.select().from(activityLog)
          .where(eq(activityLog.entityType, 'reconciliation'))
          .orderBy(desc(activityLog.createdAt))
          .limit(input.limit);

        return {
          history: logs.map(log => ({
            id: log.id,
            date: log.createdAt,
            action: log.action,
            paymentId: log.entityId,
            invoiceId: log.description?.match(/invoice\s+(\S+)/i)?.[1] || null,
            user: log.userId || 'system',
            status: 'completed',
          })),
          total: logs.length,
        };
      } catch {
        return { history: [], total: 0 };
      }
    }),

  /**
   * Export reconciliation data as CSV
   */
  exportReconciliationData: reconciliationViewProcedure
    .input(z.object({
      dataType: z.enum(["unmatched", "discrepancies", "all"]).default("all"),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }).strict())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const allPayments = await db.query.payments.findMany({});
      const allInvoices = await db.query.invoices.findMany({});
      
      let csvContent = "";
      
      if (input.dataType === "unmatched" || input.dataType === "all") {
        csvContent += "UNMATCHED PAYMENTS\n";
        csvContent += "Payment ID,Reference,Amount,Date,Method,Status\n";
        
        const unmatchedPayments = allPayments.filter(p => !p.invoiceId);
        for (const payment of unmatchedPayments) {
          csvContent += `${payment.id},"${payment.reference}",${payment.amount},"${payment.createdAt}","${payment.paymentMethod}","${payment.paymentStatus}"\n`;
        }
        csvContent += "\n\n";
      }
      
      if (input.dataType === "discrepancies" || input.dataType === "all") {
        csvContent += "DISCREPANCIES\n";
        csvContent += "Payment ID,Invoice ID,Invoice Number,Payment Amount,Invoice Amount,Difference,Variance %\n";
        
        const matchedPayments = allPayments.filter(p => p.invoiceId);
        for (const payment of matchedPayments) {
          if (!payment.invoiceId) continue;
          
          const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, payment.invoiceId),
          });
          
          if (invoice) {
            const diff = Math.abs((payment.amount || 0) - (invoice.total || 0));
            if (diff > 0.01) {
              const variancePercent = invoice.total ? ((diff / invoice.total) * 100).toFixed(2) : "0";
              csvContent += `${payment.id},"${invoice.id}","${invoice.invoiceNumber}",${payment.amount},${invoice.total},${diff},"${variancePercent}%"\n`;
            }
          }
        }
      }
      
      return {
        filename: `reconciliation_${new Date().toISOString().split("T")[0]}.csv`,
        content: csvContent,
        size: csvContent.length,
        timestamp: new Date(),
        type: input.dataType,
      };
    }),

  /**
   * Import reconciliation matches from CSV
   */
  importReconciliationMatches: reconciliationEditProcedure
    .input(z.object({
      csvContent: z.string(),
      dryRun: z.boolean().default(true),
    }).strict())
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const lines = input.csvContent.split("\n").filter(line => line.trim());
      const results = {
        totalLines: lines.length,
        parsed: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[],
        matches: [] as Array<{ paymentId: string; invoiceId: string }>,
      };
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        try {
          const parts = lines[i].split(",").map(p => p.trim());
          if (parts.length < 2) continue;
          
          const paymentId = parts[0];
          const invoiceId = parts[1];
          
          results.parsed++;
          
          // Validate payment and invoice exist
          const payment = await db.query.payments.findFirst({
            where: eq(payments.id, paymentId),
          });
          
          const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, invoiceId),
          });
          
          if (!payment || !invoice) {
            results.errors.push(`Line ${i}: Payment or invoice not found`);
            results.failed++;
            continue;
          }
          
          results.matches.push({ paymentId, invoiceId });
          
          if (!input.dryRun) {
            await db.update(payments)
              .set({ invoiceId })
              .where(eq(payments.id, paymentId));
          }
          
          results.successful++;
        } catch (error) {
          results.errors.push(`Line ${i}: ${error instanceof Error ? error.message : "Parse error"}`);
          results.failed++;
        }
      }
      
      return {
        ...results,
        dryRun: input.dryRun,
        timestamp: new Date(),
      };
    }),
});

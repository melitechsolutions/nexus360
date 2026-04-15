/**
 * Approval Router
 * 
 * Centralized approval endpoints for invoices, estimates, payments, and expenses
 * with role-based access control
 */

import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { invoices, estimates, payments, expenses, users, leaveRequests, budgets, notifications } from "../../drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import { validateApprovalAction } from "../middleware/rbac";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { triggerEventNotification } from "./emailNotifications";
import { v4 as uuidv4 } from "uuid";

// Helper function to create in-app notification
async function createApprovalNotification(
  database: any,
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" | "reminder",
  category: string,
  actionUrl: string,
  priority: "low" | "normal" | "high" = "normal"
) {
  try {
    const notifId = uuidv4();
    await database.insert(notifications).values({
      id: notifId,
      userId,
      title,
      message,
      type,
      category,
      actionUrl,
      priority,
      isRead: 0,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

// Helper function to convert cents (int) to currency (decimal)
const centsToCurrency = (cents: number | null | undefined): number => {
  if (!cents) return 0;
  return cents / 100;
};

export const approvalsRouter = router({
  // Approve invoice
  approveInvoice: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Validate user has permission to approve invoices
      validateApprovalAction(ctx.user.role, "invoice");

      const orgId = ctx.user.organizationId;
      const invoiceCond = orgId
        ? and(eq(invoices.id, input.id), eq(invoices.organizationId, orgId))
        : eq(invoices.id, input.id);
      const invoice = await database.select().from(invoices).where(invoiceCond).limit(1);
      if (!invoice.length) throw new Error("Invoice not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(invoices).set({
        status: "sent",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(invoices.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "invoice_approved",
        entityType: "invoice",
        entityId: input.id,
        description: `Approved invoice: ${invoice[0].invoiceNumber} - Total: ${invoice[0].total}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
      });

      // Send notification to invoice creator
      try {
        const creator = invoice[0].createdBy ? await database.select().from(users).where(eq(users.id, invoice[0].createdBy)).limit(1) : null;
        if (creator && creator.length && creator[0].email) {
          await triggerEventNotification({
            userId: invoice[0].createdBy,
            eventType: "invoice_approved" as any,
            recipientEmail: creator[0].email,
            recipientName: creator[0].name,
            subject: `Invoice ${invoice[0].invoiceNumber} Approved`,
            htmlContent: `<p>Your invoice <strong>${invoice[0].invoiceNumber}</strong> has been approved.</p><p><strong>Amount:</strong> KES ${invoice[0].total}</p>${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ''}`,
            entityType: "invoice",
            entityId: input.id,
            actionUrl: `/invoices/${input.id}`,
          });

          // Create in-app notification for creator
          await createApprovalNotification(
            database,
            invoice[0].createdBy,
            `Invoice Approved`,
            `Your invoice ${invoice[0].invoiceNumber} has been approved by ${ctx.user.name || ctx.user.email}. ${input.notes ? `Notes: ${input.notes}` : ''}`,
            "success",
            "invoices",
            `/invoices/${input.id}`,
            "high"
          );
        }
      } catch (error) {
        console.error("Failed to send approval notification:", error);
      }

      return { success: true, message: "Invoice approved successfully" };
    }),

  // Reject invoice
  rejectInvoice: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      validateApprovalAction(ctx.user.role, "invoice");

      const orgId = ctx.user.organizationId;
      const invoiceCond = orgId
        ? and(eq(invoices.id, input.id), eq(invoices.organizationId, orgId))
        : eq(invoices.id, input.id);
      const invoice = await database.select().from(invoices).where(invoiceCond).limit(1);
      if (!invoice.length) throw new Error("Invoice not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(invoices).set({
        status: "rejected",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(invoices.id, input.id));

      await db.logActivity({
        userId: ctx.user.id,
        action: "invoice_rejected",
        entityType: "invoice",
        entityId: input.id,
        description: `Rejected invoice: ${invoice[0].invoiceNumber} - Reason: ${input.reason}`,
      });

      // Send notification to invoice creator
      try {
        const creator = invoice[0].createdBy ? await database.select().from(users).where(eq(users.id, invoice[0].createdBy)).limit(1) : null;
        if (creator && creator.length && creator[0].email) {
          await triggerEventNotification({
            userId: invoice[0].createdBy,
            eventType: "invoice_rejected" as any,
            recipientEmail: creator[0].email,
            recipientName: creator[0].name,
            subject: `Invoice ${invoice[0].invoiceNumber} Rejected`,
            htmlContent: `<p>Your invoice <strong>${invoice[0].invoiceNumber}</strong> has been rejected.</p><p><strong>Reason:</strong> ${input.reason}</p>`,
            entityType: "invoice",
            entityId: input.id,
            actionUrl: `/invoices/${input.id}`,
          });

          // Create in-app notification for creator
          await createApprovalNotification(
            database,
            invoice[0].createdBy,
            `Invoice Rejected`,
            `Your invoice ${invoice[0].invoiceNumber} has been rejected. Reason: ${input.reason}`,
            "error",
            "invoices",
            `/invoices/${input.id}`,
            "high"
          );
        }
      } catch (error) {
        console.error("Failed to send rejection notification:", error);
      }

      return { success: true, message: "Invoice rejected successfully" };
    }),

  // Approve estimate
  approveEstimate: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Validate user has permission to approve estimates
      validateApprovalAction(ctx.user.role, "estimate");

      const orgId = ctx.user.organizationId;
      const estimateCond = orgId
        ? and(eq(estimates.id, input.id), eq(estimates.organizationId, orgId))
        : eq(estimates.id, input.id);
      const estimate = await database.select().from(estimates).where(estimateCond).limit(1);
      if (!estimate.length) throw new Error("Estimate not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(estimates).set({
        status: "accepted",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(estimates.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "estimate_approved",
        entityType: "estimate",
        entityId: input.id,
        description: `Approved estimate: ${estimate[0].estimateNumber} - Total: ${estimate[0].total}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
      });

      return { success: true, message: "Estimate approved successfully" };
    }),

  // Reject estimate
  rejectEstimate: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      validateApprovalAction(ctx.user.role, "estimate");

      const orgId = ctx.user.organizationId;
      const estimateCond = orgId
        ? and(eq(estimates.id, input.id), eq(estimates.organizationId, orgId))
        : eq(estimates.id, input.id);
      const estimate = await database.select().from(estimates).where(estimateCond).limit(1);
      if (!estimate.length) throw new Error("Estimate not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(estimates).set({
        status: "rejected",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(estimates.id, input.id));

      await db.logActivity({
        userId: ctx.user.id,
        action: "estimate_rejected",
        entityType: "estimate",
        entityId: input.id,
        description: `Rejected estimate: ${estimate[0].estimateNumber} - Reason: ${input.reason}`,
      });

      return { success: true, message: "Estimate rejected successfully" };
    }),

  // Approve payment
  approvePayment: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Validate user has permission to approve payments
      validateApprovalAction(ctx.user.role, "payment");

      const orgId = ctx.user.organizationId;
      const paymentCond = orgId
        ? and(eq(payments.id, input.id), eq(payments.organizationId, orgId))
        : eq(payments.id, input.id);
      const payment = await database.select().from(payments).where(paymentCond).limit(1);
      if (!payment.length) throw new Error("Payment not found");

      // Update payment status and approval info (use MySQL format timestamp)
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(payments).set({
        status: "completed",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(payments.id, input.id));

      await db.logActivity({
        userId: ctx.user.id,
        action: "payment_approved",
        entityType: "payment",
        entityId: input.id,
        description: `Approved payment: ${payment[0].referenceNumber || input.id} - Ksh ${payment[0].amount / 100}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
      });

      // Send notification to payment creator
      try {
        const creator = payment[0].createdBy ? await database.select().from(users).where(eq(users.id, payment[0].createdBy)).limit(1) : null;
        if (creator && creator.length && creator[0].email) {
          await triggerEventNotification({
            userId: payment[0].createdBy,
            eventType: "payment_approved" as any,
            recipientEmail: creator[0].email,
            recipientName: creator[0].name,
            subject: `Payment Approved`,
            htmlContent: `<p>Your payment for <strong>${payment[0].referenceNumber || input.id}</strong> has been approved.</p><p><strong>Amount:</strong> KES ${payment[0].amount / 100}</p>${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ''}`,
            entityType: "payment",
            entityId: input.id,
            actionUrl: `/payments/${input.id}`,
          });
        }
      } catch (error) {
        console.error("Failed to send approval notification:", error);
      }

      return { success: true, message: "Payment approved successfully" };
    }),

  // Reject payment
  rejectPayment: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      validateApprovalAction(ctx.user.role, "payment");

      const orgId = ctx.user.organizationId;
      const paymentCond = orgId
        ? and(eq(payments.id, input.id), eq(payments.organizationId, orgId))
        : eq(payments.id, input.id);
      const payment = await database.select().from(payments).where(paymentCond).limit(1);
      if (!payment.length) throw new Error("Payment not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(payments).set({
        status: "rejected",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(payments.id, input.id));

      await db.logActivity({
        userId: ctx.user.id,
        action: "payment_rejected",
        entityType: "payment",
        entityId: input.id,
        description: `Rejected payment: ${payment[0].referenceNumber || input.id} - Reason: ${input.reason}`,
      });

      // Send notification to payment creator
      try {
        const creator = payment[0].createdBy ? await database.select().from(users).where(eq(users.id, payment[0].createdBy)).limit(1) : null;
        if (creator && creator.length && creator[0].email) {
          await triggerEventNotification({
            userId: payment[0].createdBy,
            eventType: "payment_rejected" as any,
            recipientEmail: creator[0].email,
            recipientName: creator[0].name,
            subject: `Payment Rejected`,
            htmlContent: `<p>Your payment for <strong>${payment[0].referenceNumber || input.id}</strong> has been rejected.</p><p><strong>Reason:</strong> ${input.reason}</p>`,
            entityType: "payment",
            entityId: input.id,
            actionUrl: `/payments/${input.id}`,
          });
        }
      } catch (error) {
        console.error("Failed to send rejection notification:", error);
      }

      return { success: true, message: "Payment rejected successfully" };
    }),

  // Approve expense
  approveExpense: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Validate user has permission to approve expenses
      validateApprovalAction(ctx.user.role, "expense");

      const orgId = ctx.user.organizationId;
      const expenseCond = orgId
        ? and(eq(expenses.id, input.id), eq(expenses.organizationId, orgId))
        : eq(expenses.id, input.id);
      const expense = await database.select().from(expenses).where(expenseCond).limit(1);
      if (!expense.length) throw new Error("Expense not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(expenses).set({
        status: "approved",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(expenses.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "expense_approved",
        entityType: "expense",
        entityId: input.id,
        description: `Approved expense: ${input.id}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
      });

      return { success: true, message: "Expense approved successfully" };
    }),

  // Reject expense
  rejectExpense: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Validate user has permission to approve expenses
      validateApprovalAction(ctx.user.role, "expense");

      const orgId = ctx.user.organizationId;
      const expenseCond = orgId
        ? and(eq(expenses.id, input.id), eq(expenses.organizationId, orgId))
        : eq(expenses.id, input.id);
      const expense = await database.select().from(expenses).where(expenseCond).limit(1);
      if (!expense.length) throw new Error("Expense not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(expenses).set({
        status: "rejected",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(expenses.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "expense_rejected",
        entityType: "expense",
        entityId: input.id,
        description: `Rejected expense: ${input.id} - Reason: ${input.reason}`,
      });

      return { success: true, message: "Expense rejected successfully" };
    }),

  // Approve Budget
  approveBudget: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const orgId = ctx.user.organizationId;
      const budgetCond = orgId
        ? and(eq(budgets.id, input.id), eq(budgets.organizationId, orgId))
        : eq(budgets.id, input.id);
      const budget = await database.select().from(budgets).where(budgetCond).limit(1);
      if (!budget.length) throw new Error("Budget not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(budgets).set({
        budgetStatus: "active",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(budgets.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "budget_approved",
        entityType: "budget",
        entityId: input.id,
        description: `Approved budget: ${budget[0].budgetName} - KES ${budget[0].amount}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
      });

      return { success: true, message: "Budget approved successfully" };
    }),

  // Reject Budget
  rejectBudget: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const orgId = ctx.user.organizationId;
      const budgetCond = orgId
        ? and(eq(budgets.id, input.id), eq(budgets.organizationId, orgId))
        : eq(budgets.id, input.id);
      const budget = await database.select().from(budgets).where(budgetCond).limit(1);
      if (!budget.length) throw new Error("Budget not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(budgets).set({
        budgetStatus: "inactive",
        approvedBy: ctx.user.id,
        approvedAt: now,
      } as any).where(eq(budgets.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "budget_rejected",
        entityType: "budget",
        entityId: input.id,
        description: `Rejected budget: ${budget[0].budgetName} - Reason: ${input.reason}`,
      });

      return { success: true, message: "Budget rejected successfully" };
    }),

  // Approve LPO
  approveLPO: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orgId = ctx.user.organizationId;
        const lpoSql = orgId
          ? `UPDATE lpos SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`
          : `UPDATE lpos SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?`;
        const lpoParams = orgId
          ? ["approved", ctx.user.id, now, now, input.id, orgId]
          : ["approved", ctx.user.id, now, now, input.id];
        await database.raw?.(lpoSql, lpoParams);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "lpo_approved",
          entityType: "lpo",
          entityId: input.id,
          description: `Approved LPO: ${input.id}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
        });

        return { success: true, message: "LPO approved successfully" };
      } catch (error) {
        throw new Error("Failed to approve LPO");
      }
    }),

  // Reject LPO
  rejectLPO: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orgId = ctx.user.organizationId;
        const lpoSql = orgId
          ? `UPDATE lpos SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`
          : `UPDATE lpos SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?`;
        const lpoParams = orgId
          ? ["rejected", ctx.user.id, now, now, input.id, orgId]
          : ["rejected", ctx.user.id, now, now, input.id];
        await database.raw?.(lpoSql, lpoParams);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "lpo_rejected",
          entityType: "lpo",
          entityId: input.id,
          description: `Rejected LPO: ${input.id} - Reason: ${input.reason}`,
        });

        return { success: true, message: "LPO rejected successfully" };
      } catch (error) {
        throw new Error("Failed to reject LPO");
      }
    }),

  // Approve Purchase Order
  approvePurchaseOrder: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orgId = ctx.user.organizationId;
        const poSql = orgId
          ? `UPDATE purchase_orders SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`
          : `UPDATE purchase_orders SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?`;
        const poParams = orgId
          ? ["confirmed", ctx.user.id, now, now, input.id, orgId]
          : ["confirmed", ctx.user.id, now, now, input.id];
        await database.raw?.(poSql, poParams);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "purchase_order_approved",
          entityType: "purchase_order",
          entityId: input.id,
          description: `Approved Purchase Order: ${input.id}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
        });

        return { success: true, message: "Purchase Order approved successfully" };
      } catch (error) {
        throw new Error("Failed to approve Purchase Order");
      }
    }),

  // Reject Purchase Order
  rejectPurchaseOrder: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orgId = ctx.user.organizationId;
        const poSql = orgId
          ? `UPDATE purchase_orders SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`
          : `UPDATE purchase_orders SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?`;
        const poParams = orgId
          ? ["cancelled", ctx.user.id, now, now, input.id, orgId]
          : ["cancelled", ctx.user.id, now, now, input.id];
        await database.raw?.(poSql, poParams);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "purchase_order_rejected",
          entityType: "purchase_order",
          entityId: input.id,
          description: `Rejected Purchase Order: ${input.id} - Reason: ${input.reason}`,
        });

        return { success: true, message: "Purchase Order rejected successfully" };
      } catch (error) {
        throw new Error("Failed to reject Purchase Order");
      }
    }),

  // Approve Imprest
  approveImprest: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orgId = ctx.user.organizationId;
        const impSql = orgId
          ? `UPDATE imprests SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`
          : `UPDATE imprests SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?`;
        const impParams = orgId
          ? ["approved", ctx.user.id, now, now, input.id, orgId]
          : ["approved", ctx.user.id, now, now, input.id];
        await database.raw?.(impSql, impParams);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "imprest_approved",
          entityType: "imprest",
          entityId: input.id,
          description: `Approved Imprest: ${input.id}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
        });

        return { success: true, message: "Imprest approved successfully" };
      } catch (error) {
        throw new Error("Failed to approve Imprest");
      }
    }),

  // Reject Imprest
  rejectImprest: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orgId = ctx.user.organizationId;
        const impSql = orgId
          ? `UPDATE imprests SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`
          : `UPDATE imprests SET status = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?`;
        const impParams = orgId
          ? ["rejected", ctx.user.id, now, now, input.id, orgId]
          : ["rejected", ctx.user.id, now, now, input.id];
        await database.raw?.(impSql, impParams);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "imprest_rejected",
          entityType: "imprest",
          entityId: input.id,
          description: `Rejected Imprest: ${input.id} - Reason: ${input.reason}`,
        });

        return { success: true, message: "Imprest rejected successfully" };
      } catch (error) {
        throw new Error("Failed to reject Imprest");
      }
    }),

  // Approve leave request
  approveLeaveRequest: createFeatureRestrictedProcedure("approvals:approve")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Validate user has permission to approve leave requests
      validateApprovalAction(ctx.user.role, "leave_request");

      const orgId = ctx.user.organizationId;
      const leaveCond = orgId
        ? and(eq(leaveRequests.id, input.id), eq(leaveRequests.organizationId, orgId))
        : eq(leaveRequests.id, input.id);
      const leave = await database.select().from(leaveRequests).where(leaveCond).limit(1);
      if (!leave.length) throw new Error("Leave request not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(leaveRequests).set({
        status: "approved",
        approvedBy: ctx.user.id,
        approvalDate: now,
      } as any).where(eq(leaveRequests.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "leave_request_approved",
        entityType: "leave_request",
        entityId: input.id,
        description: `Approved leave request: ${leave[0].leaveType} from ${leave[0].startDate} to ${leave[0].endDate}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
      });

      // Get employee info for notification
      try {
        const employee = await database.select().from(users).where(eq(users.id, leave[0].employeeId)).limit(1);
        if (employee.length && employee[0].email) {
          await triggerEventNotification({
            userId: leave[0].employeeId,
            eventType: "leave_request_approved" as any,
            recipientEmail: employee[0].email,
            recipientName: employee[0].name,
            subject: "Leave Request Approved",
            htmlContent: `<p>Your ${leave[0].leaveType} leave request from ${leave[0].startDate} to ${leave[0].endDate} has been approved.</p>${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ''}`,
            entityType: "leave_request",
            entityId: input.id,
            actionUrl: `/leave-management/${input.id}`,
          });
        }
      } catch (error) {
        console.error("Failed to send notification:", error);
      }

      return { success: true, message: "Leave request approved successfully" };
    }),

  // Reject leave request
  rejectLeaveRequest: createFeatureRestrictedProcedure("approvals:reject")
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      validateApprovalAction(ctx.user.role, "leave_request");

      const orgId = ctx.user.organizationId;
      const leaveCond = orgId
        ? and(eq(leaveRequests.id, input.id), eq(leaveRequests.organizationId, orgId))
        : eq(leaveRequests.id, input.id);
      const leave = await database.select().from(leaveRequests).where(leaveCond).limit(1);
      if (!leave.length) throw new Error("Leave request not found");

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await database.update(leaveRequests).set({
        status: "rejected",
        approvedBy: ctx.user.id,
        approvalDate: now,
        notes: input.reason,
      } as any).where(eq(leaveRequests.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "leave_request_rejected",
        entityType: "leave_request",
        entityId: input.id,
        description: `Rejected leave request: ${leave[0].leaveType} - Reason: ${input.reason}`,
      });

      // Get employee info for notification
      try {
        const employee = await database.select().from(users).where(eq(users.id, leave[0].employeeId)).limit(1);
        if (employee.length && employee[0].email) {
          await triggerEventNotification({
            userId: leave[0].employeeId,
            eventType: "leave_request_rejected" as any,
            recipientEmail: employee[0].email,
            recipientName: employee[0].name,
            subject: "Leave Request Rejected",
            htmlContent: `<p>Your ${leave[0].leaveType} leave request from ${leave[0].startDate} to ${leave[0].endDate} has been rejected.</p><p><strong>Reason:</strong> ${input.reason}</p>`,
            entityType: "leave_request",
            entityId: input.id,
            actionUrl: `/leave-management/${input.id}`,
          });
        }
      } catch (error) {
        console.error("Failed to send notification:", error);
      }

      return { success: true, message: "Leave request rejected successfully" };
    }),

  // Get pending approvals for current user
  getPendingApprovals: createFeatureRestrictedProcedure("approvals:read")
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return {
        expenses: [],
        invoices: [],
        estimates: [],
      };

      // Only show pending approvals to users with approval permissions
      const canApprove = ["super_admin", "admin", "accountant", "hr"].includes(ctx.user.role);
      
      if (!canApprove) {
        return {
          expenses: [],
          invoices: [],
          estimates: [],
        };
      }

      const pendingInvoices = await database.select().from(invoices).where(
        ctx.user.organizationId
          ? and(eq(invoices.status, "draft"), eq(invoices.organizationId, ctx.user.organizationId))
          : eq(invoices.status, "draft")
      );
      const pendingEstimates = await database.select().from(estimates).where(
        ctx.user.organizationId
          ? and(eq(estimates.status, "draft"), eq(estimates.organizationId, ctx.user.organizationId))
          : eq(estimates.status, "draft")
      );
      const pendingExpenses = await database.select().from(expenses).where(
        ctx.user.organizationId
          ? and(eq(expenses.status, "pending"), eq(expenses.organizationId, ctx.user.organizationId))
          : eq(expenses.status, "pending")
      );

      return {
        invoices: pendingInvoices,
        estimates: pendingEstimates,
        expenses: pendingExpenses,
      };
    }),

  // Get comprehensive list of all approvals (unified endpoint)
  getApprovals: createFeatureRestrictedProcedure("approvals:read")
    .input(z.object({
      type: z.enum(["all", "invoice", "expense", "payment", "purchase_order", "leave_request"]).optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];

      // Only show pending approvals to users with approval permissions
      const canApprove = ["super_admin", "admin", "accountant", "hr"].includes(ctx.user.role);
      
      if (!canApprove) {
        return [];
      }

      const approvals: any[] = [];
      const search = input?.search?.toLowerCase() || "";

      // Fetch invoices
      if (!input?.type || input.type === "all" || input.type === "invoice") {
        try {
          const orgId = ctx.user.organizationId;
          const invoiceWhere = orgId ? eq(invoices.organizationId, orgId) : undefined;
          const invoiceRecords = await database.select().from(invoices).where(invoiceWhere);
          for (const invoice of invoiceRecords) {
            const statusFilter = input?.status || "pending";
            if (statusFilter !== "pending" && statusFilter !== "approved" && statusFilter !== "rejected") continue;
            
            const invoiceStatus = invoice.status === "draft" ? "pending" : invoice.status === "sent" ? "approved" : "rejected";
            if (input?.status && invoiceStatus !== input.status) continue;

            if (search && !invoice.invoiceNumber?.toLowerCase().includes(search) && !invoice.clientId?.toLowerCase().includes(search)) continue;

            const requestedBy = invoice.createdBy ? await database.select().from(users).where(eq(users.id, invoice.createdBy)).then(r => r[0]) : null;
            const approvedByUser = invoice.approvedBy ? await database.select().from(users).where(eq(users.id, invoice.approvedBy)).then(r => r[0]) : null;
            
            approvals.push({
              id: invoice.id,
              type: "invoice",
              referenceId: invoice.id,
              referenceNo: invoice.invoiceNumber || `INV-${invoice.id}`,
              amount: centsToCurrency(invoice.total),
              requestedBy: requestedBy?.name || requestedBy?.email || "Unknown",
              requestedAt: invoice.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
              approvedBy: approvedByUser?.name || approvedByUser?.email || null,
              approvedAt: invoice.approvedAt || null,
              status: invoiceStatus,
              priority: "medium",
              description: `Invoice for KES ${invoice.total}`,
              approvers: ["Super Admin", "Admin", "Accountant"],
            });
          }
        } catch (err) {
          console.warn("Error fetching invoices for approvals:", err);
        }
      }

      // Fetch expenses
      if (!input?.type || input.type === "all" || input.type === "expense") {
        try {
          const orgId = ctx.user.organizationId;
          const expenseWhere = orgId ? eq(expenses.organizationId, orgId) : undefined;
          const expenseRecords = await database.select().from(expenses).where(expenseWhere);
          for (const expense of expenseRecords) {
            const status = expense.status as "pending" | "approved" | "rejected" | "paid";
            if (input?.status && status !== input.status) continue;

            if (search && !expense.expenseNumber?.toLowerCase().includes(search) && !expense.description?.toLowerCase().includes(search)) continue;

            const requestedBy = expense.createdBy ? await database.select().from(users).where(eq(users.id, expense.createdBy)).then(r => r[0]) : null;
            const approvedByUser = expense.approvedBy ? await database.select().from(users).where(eq(users.id, expense.approvedBy)).then(r => r[0]) : null;
            
            // Determine priority based on amount
            let priority: "low" | "medium" | "high" | "critical" = "low";
            if (expense.amount >= 100000) priority = "critical";
            else if (expense.amount >= 50000) priority = "high";  
            else if (expense.amount >= 10000) priority = "medium";

            if (input?.priority && priority !== input.priority) continue;

            approvals.push({
              id: expense.id,
              type: "expense",
              referenceId: expense.id,
              referenceNo: expense.expenseNumber || `EXP-${expense.id.substring(0, 8)}`,
              amount: centsToCurrency(expense.amount),
              requestedBy: requestedBy?.name || requestedBy?.email || "Unknown",
              requestedAt: expense.expenseDate || new Date().toISOString(),
              approvedBy: approvedByUser?.name || approvedByUser?.email || null,
              approvedAt: expense.approvedAt || null,
              status,
              priority,
              description: expense.description || `Expense: ${expense.category}`,
              approvers: ["Super Admin", "Manager", "Finance"],
            });
          }
        } catch (err) {
          console.warn("Error fetching expenses for approvals:", err);
        }
      }

      // Fetch payments
      if (!input?.type || input.type === "all" || input.type === "payment") {
        try {
          const orgId = ctx.user.organizationId;
          const paymentsWhere = orgId ? eq(payments.organizationId, orgId) : undefined;
          const paymentRecords = await database.select().from(payments).where(paymentsWhere);
          for (const payment of paymentRecords) {
            const paymentStatus = payment.status as "pending" | "completed" | "failed";
            if (input?.status) {
              if (input.status === "pending" && paymentStatus !== "pending") continue;
              if (input.status === "approved" && paymentStatus !== "completed") continue;
              if (input.status === "rejected" && paymentStatus !== "failed") continue;
            }

            if (search && !payment.referenceNumber?.toLowerCase().includes(search)) continue;

            const requestedBy = payment.createdBy ? await database.select().from(users).where(eq(users.id, payment.createdBy)).then(r => r[0]) : null;
            const approvedByUser = payment.approvedBy ? await database.select().from(users).where(eq(users.id, payment.approvedBy)).then(r => r[0]) : null;
            
            let priority: "low" | "medium" | "high" | "critical" = "low";
            if (payment.amount >= 500000) priority = "critical";
            else if (payment.amount >= 250000) priority = "high";
            else if (payment.amount >= 50000) priority = "medium";

            if (input?.priority && priority !== input.priority) continue;

            const displayStatus = paymentStatus === "pending" ? "pending" : paymentStatus === "completed" ? "approved" : "rejected";

            approvals.push({
              id: payment.id,
              type: "payment",
              referenceId: payment.id,
              referenceNo: payment.referenceNumber || `PAY-${payment.id.substring(0, 8)}`,
              amount: centsToCurrency(payment.amount),
              requestedBy: requestedBy?.name || requestedBy?.email || "Unknown",
              requestedAt: payment.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
              approvedBy: approvedByUser?.name || approvedByUser?.email || null,
              approvedAt: payment.approvedAt || null,
              status: displayStatus,
              priority,
              description: `Payment: ${payment.description || "No description"}`,
              approvers: ["Super Admin", "Finance Manager", "Accounting Director"],
            });
          }
        } catch (err) {
          console.warn("Error fetching payments for approvals:", err);
        }
      }

      // Fetch leave requests
      if (!input?.type || input.type === "all" || input.type === "leave_request") {
        try {
          const orgId = ctx.user.organizationId;
          const leaveWhere = orgId ? eq(leaveRequests.organizationId, orgId) : undefined;
          const leaveRecords = await database.select().from(leaveRequests).where(leaveWhere);
          for (const leave of leaveRecords) {
            const leaveStatus = leave.status as "pending" | "approved" | "rejected";
            if (input?.status && leaveStatus !== input.status) continue;

            if (input?.priority && "low" !== input.priority) continue;

            const requestedBy = leave.employeeId ? await database.select().from(users).where(eq(users.id, leave.employeeId)).then(r => r[0]) : null;
            const approvedByUser = leave.approvalDate && leave.approvedBy ? await database.select().from(users).where(eq(users.id, leave.approvedBy)).then(r => r[0]) : null;

            approvals.push({
              id: leave.id,
              type: "leave_request",
              referenceId: leave.id,
              referenceNo: `LEAVE-${leave.id.substring(0, 8)}`,
              requestedBy: requestedBy?.name || requestedBy?.email || "Unknown",
              requestedAt: leave.startDate || new Date().toISOString().replace('T', ' ').substring(0, 19),
              approvedBy: approvedByUser?.name || approvedByUser?.email || null,
              approvedAt: leave.approvalDate || null,
              status: leaveStatus,
              priority: "low",
              description: `Leave request: ${leave.leaveType}`,
              approvers: ["Super Admin", "HR Manager"],
            });
          }
        } catch (err) {
          console.warn("Error fetching leave requests for approvals:", err);
        }
      }

      // Fetch Budgets
      if (!input?.type || input.type === "all" || input.type === "budget") {
        try {
          const orgId = ctx.user.organizationId;
          const budgetWhere = orgId ? eq(budgets.organizationId, orgId) : undefined;
          const budgetRecords = await database.select().from(budgets).where(budgetWhere);
          for (const budget of budgetRecords) {
            const budgetStatus = budget.budgetStatus as "draft" | "active" | "inactive" | "closed";
            if (input?.status) {
              if (input.status === "pending" && budgetStatus !== "draft") continue;
              if (input.status === "approved" && budgetStatus !== "active") continue;
              if (input.status === "rejected" && budgetStatus !== "inactive") continue;
            }

            if (search && !budget.budgetName?.toLowerCase().includes(search)) continue;

            const requestedBy = budget.createdBy ? await database.select().from(users).where(eq(users.id, budget.createdBy)).then(r => r[0]) : null;
            const approvedByUser = budget.approvedBy ? await database.select().from(users).where(eq(users.id, budget.approvedBy)).then(r => r[0]) : null;
            
            let priority: "low" | "medium" | "high" | "critical" = "low";
            if (budget.amount >= 1000000) priority = "critical";
            else if (budget.amount >= 500000) priority = "high";
            else if (budget.amount >= 100000) priority = "medium";

            if (input?.priority && priority !== input.priority) continue;

            const displayStatus = budgetStatus === "draft" ? "pending" : budgetStatus === "active" ? "approved" : "rejected";

            approvals.push({
              id: budget.id,
              type: "budget",
              referenceId: budget.id,
              referenceNo: `BUD-${budget.id.substring(0, 8)}`,
              amount: centsToCurrency(budget.amount),
              requestedBy: requestedBy?.name || requestedBy?.email || "Unknown",
              requestedAt: budget.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
              approvedBy: approvedByUser?.name || approvedByUser?.email || null,
              approvedAt: budget.approvedAt || null,
              status: displayStatus,
              priority,
              description: `Budget: ${budget.budgetName} - KES ${budget.amount}`,
              approvers: ["Super Admin", "Finance Manager"],
            });
          }
        } catch (err) {
          console.warn("Error fetching budgets for approvals:", err);
        }
      }

      // Fetch LPOs (from raw database query)
      if (!input?.type || input.type === "all" || input.type === "lpo") {
        try {
          const orgId = ctx.user.organizationId;
          const lpoRecords = orgId
            ? await database.raw?.(`SELECT * FROM lpos WHERE organizationId = ?`, [orgId]) || []
            : await database.raw?.(`SELECT * FROM lpos WHERE 1=1`) || [];
          for (const lpo of lpoRecords) {
            const lpoStatus = lpo.status as "draft" | "submitted" | "approved" | "rejected";
            if (input?.status) {
              if (input.status === "pending" && !["draft", "submitted"].includes(lpoStatus)) continue;
              if (input.status === "approved" && lpoStatus !== "approved") continue;
              if (input.status === "rejected" && lpoStatus !== "rejected") continue;
            }

            if (search && !lpo.lpoNumber?.toLowerCase().includes(search) && !lpo.vendorName?.toLowerCase().includes(search)) continue;

            let priority: "low" | "medium" | "high" | "critical" = "low";
            if (lpo.totalAmount >= 500000) priority = "critical";
            else if (lpo.totalAmount >= 250000) priority = "high";
            else if (lpo.totalAmount >= 50000) priority = "medium";

            if (input?.priority && priority !== input.priority) continue;

            const displayStatus = ["draft", "submitted"].includes(lpoStatus) ? "pending" : lpoStatus;

            approvals.push({
              id: lpo.id,
              type: "lpo",
              referenceId: lpo.id,
              referenceNo: lpo.lpoNumber || `LPO-${lpo.id.substring(0, 8)}`,
              amount: centsToCurrency(lpo.totalAmount),
              requestedBy: lpo.createdBy || "Unknown",
              requestedAt: lpo.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
              status: displayStatus,
              priority,
              description: `LPO from ${lpo.vendorName} - KES ${lpo.totalAmount}`,
              approvers: ["Super Admin", "Procurement Manager"],
            });
          }
        } catch (e) {
          // Table may not exist
        }
      }

      // Fetch Purchase Orders (from raw database query) 
      if (!input?.type || input.type === "all" || input.type === "purchase_order") {
        try {
          const orgId = ctx.user.organizationId;
          const orderRecords = orgId
            ? await database.raw?.(`SELECT * FROM purchase_orders WHERE organizationId = ?`, [orgId]) || []
            : await database.raw?.(`SELECT * FROM purchase_orders WHERE 1=1`) || [];
          for (const order of orderRecords) {
            const orderStatus = order.status as "draft" | "sent" | "confirmed" | "delivered" | "invoiced";
            if (input?.status) {
              if (input.status === "pending" && !["draft", "sent", "confirmed"].includes(orderStatus)) continue;
              if (input.status === "approved" && orderStatus !== "confirmed") continue;
              if (input.status === "rejected" && !["delivered", "invoiced"].includes(orderStatus)) continue;
            }

            if (search && !order.orderNumber?.toLowerCase().includes(search) && !order.supplierName?.toLowerCase().includes(search)) continue;

            let priority: "low" | "medium" | "high" | "critical" = "low";
            if (order.totalAmount >= 500000) priority = "critical";
            else if (order.totalAmount >= 250000) priority = "high";
            else if (order.totalAmount >= 50000) priority = "medium";

            if (input?.priority && priority !== input.priority) continue;

            const displayStatus = ["draft", "sent", "confirmed"].includes(orderStatus) ? "pending" : orderStatus === "delivered" ? "approved" : "rejected";

            approvals.push({
              id: order.id,
              type: "purchase_order",
              referenceId: order.id,
              referenceNo: order.orderNumber || `PO-${order.id.substring(0, 8)}`,
              amount: centsToCurrency(order.totalAmount),
              requestedBy: order.createdBy || "Unknown",
              requestedAt: order.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
              status: displayStatus,
              priority,
              description: `Purchase Order from ${order.supplierName} - KES ${order.totalAmount}`,
              approvers: ["Super Admin", "Procurement Manager"],
            });
          }
        } catch (e) {
          // Table may not exist
        }
      }

      // Fetch Imprests (from raw database query)
      if (!input?.type || input.type === "all" || input.type === "imprest") {
        try {
          const imprestRecords = await database.raw?.(`SELECT * FROM imprests WHERE 1=1`) || [];
          for (const imprest of imprestRecords) {
            const imprestStatus = imprest.status as "requested" | "approved" | "rejected" | "issued" | "surrendered";
            if (input?.status) {
              if (input.status === "pending" && imprestStatus !== "requested") continue;
              if (input.status === "approved" && imprestStatus !== "approved") continue;
              if (input.status === "rejected" && imprestStatus !== "rejected") continue;
            }

            if (search && !imprest.imprestNumber?.toLowerCase().includes(search) && !imprest.employeeName?.toLowerCase().includes(search)) continue;

            let priority: "low" | "medium" | "high" | "critical" = "low";
            if (imprest.amount >= 100000) priority = "critical";
            else if (imprest.amount >= 50000) priority = "high";
            else if (imprest.amount >= 10000) priority = "medium";

            if (input?.priority && priority !== input.priority) continue;

            approvals.push({
              id: imprest.id,
              type: "imprest",
              referenceId: imprest.id,
              referenceNo: imprest.imprestNumber || `IMP-${imprest.id.substring(0, 8)}`,
              amount: centsToCurrency(imprest.amount),
              requestedBy: imprest.employeeName || "Unknown",
              requestedAt: imprest.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
              status: imprestStatus,
              priority,
              description: `Imprest for ${imprest.purpose} - KES ${imprest.amount}`,
              approvers: ["Super Admin", "Finance Manager"],
            });
          }
        } catch (e) {
          // Table may not exist
        }
      }

      // Sort by requested date (newest first)
      return approvals.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }),

  // Delete/Restore an approval item to draft (only pending approvals)
  deleteApproval: createFeatureRestrictedProcedure("approvals:delete")
    .input(z.object({
      id: z.string(),
      type: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        // Move back to draft based on approval type instead of permanently deleting
        switch (input.type) {
          case "invoice": 
            const invoice = await database.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
            if (!invoice.length) throw new Error("Invoice not found");
            
            await database.update(invoices).set({
              status: "draft",
              approvedBy: null,
              approvedAt: null,
            } as any).where(eq(invoices.id, input.id));
            
            await db.logActivity({
              userId: ctx.user.id,
              action: "invoice_reverted_to_draft",
              entityType: "invoice",
              entityId: input.id,
              description: `Reverted invoice to draft: ${invoice[0].invoiceNumber}`,
            });
            break;
            
          case "expense":
            const expense = await database.select().from(expenses).where(eq(expenses.id, input.id)).limit(1);
            if (!expense.length) throw new Error("Expense not found");
            
            await database.update(expenses).set({
              status: "pending",
              approvedBy: null,
              approvedAt: null,
            } as any).where(eq(expenses.id, input.id));
            
            await db.logActivity({
              userId: ctx.user.id,
              action: "expense_reverted_to_pending",
              entityType: "expense",
              entityId: input.id,
              description: `Reverted expense to pending: ${expense[0].expenseNumber}`,
            });
            break;
            
          case "payment":
            const payment = await database.select().from(payments).where(eq(payments.id, input.id)).limit(1);
            if (!payment.length) throw new Error("Payment not found");
            
            await database.update(payments).set({
              status: "pending",
              approvedBy: null,
              approvedAt: null,
            } as any).where(eq(payments.id, input.id));
            
            await db.logActivity({
              userId: ctx.user.id,
              action: "payment_reverted_to_pending",
              entityType: "payment",
              entityId: input.id,
              description: `Reverted payment to pending: ${payment[0].referenceNumber}`,
            });
            break;
            
          case "leave_request":
            const leave = await database.select().from(leaveRequests).where(eq(leaveRequests.id, input.id)).limit(1);
            if (!leave.length) throw new Error("Leave request not found");
            
            await database.update(leaveRequests).set({
              status: "pending",
              approvedBy: null,
              approvalDate: null,
            } as any).where(eq(leaveRequests.id, input.id));
            
            await db.logActivity({
              userId: ctx.user.id,
              action: "leave_request_reverted",
              entityType: "leave_request",
              entityId: input.id,
              description: `Reverted leave request to pending`,
            });
            break;
            
          default:
            throw new Error("Unsupported approval type");
        }

        return { success: true, message: "Approval item reverted to draft successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to revert approval item",
        });
      }
    }),
});

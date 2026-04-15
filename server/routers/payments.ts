import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, createNotification } from "../db";
import { payments, invoices, estimates, receipts } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { triggerEventNotification } from "./emailNotifications";
import { workflowTriggerEngine } from "../workflows/triggerEngine";
import { generateNextDocumentNumber } from "../utils/document-numbering";
import { createFeatureRestrictedProcedure, createRoleRestrictedProcedure } from "../middleware/enhancedRbac";
import { combineOrgFilters, validateOwnership, auditLogSensitiveOperation } from "../middleware/organizationIsolationEnforcer";

// Permission-restricted procedure instances
const viewProcedure = createFeatureRestrictedProcedure("accounting:payments:view");
const createProcedure = createFeatureRestrictedProcedure("accounting:payments:create");
const approveProcedure = createFeatureRestrictedProcedure("accounting:payments:approve");
const deleteProcedure = createRoleRestrictedProcedure(["super_admin", "admin"]);

// Helper function to generate next payment reference number in format PAY-000000
async function generateNextPaymentReferenceNumber(database: any): Promise<string> {
  try {
    const result = await database.select({ payNum: payments.referenceNumber })
      .from(payments)
      .orderBy(desc(payments.referenceNumber))
      .limit(1);
    
    let maxSequence = 0;
    
    if (result && result.length > 0 && result[0].payNum) {
      const match = result[0].payNum.match(/(\d+)$/);
      if (match) {
        maxSequence = parseInt(match[1]);
      }
    }

    const nextSequence = maxSequence + 1;
    return `PAY-${String(nextSequence).padStart(6, '0')}`;
  } catch (err) {
    console.warn("Error generating payment reference number, using default:", err);
    return `PAY-000001`;
  }
}

// Helper function to send payment notifications
async function sendPaymentNotification(
  database: any,
  userId: string,
  action: "recorded" | "approved",
  amount: number,
  invoiceNumber: string,
  paymentId: string
) {
  try {
    const amountFormatted = (amount / 100).toLocaleString("en-KE", {
      style: "currency",
      currency: "KES",
    });

    const messages = {
      recorded: `Payment of ${amountFormatted} received for invoice ${invoiceNumber}`,
      approved: `Payment of ${amountFormatted} for invoice ${invoiceNumber} has been approved`,
    };

    const titles = {
      recorded: "Payment Recorded",
      approved: "Payment Approved",
    };

    await createNotification({
      userId,
      title: titles[action],
      message: messages[action],
      type: "success",
      category: "payment",
      entityType: "payment",
      entityId: paymentId,
      actionUrl: `/payments/${paymentId}`,
      priority: "normal",
    });
  } catch (err) {
    console.warn("Failed to create payment notification:", err);
  }
}

export const paymentsRouter = router({
  list: viewProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];
        const orgId = ctx.user.organizationId;
        const query = orgId
          ? database.select().from(payments).where(eq(payments.organizationId, orgId))
          : database.select().from(payments);
        return await (query as any).limit(input?.limit || 50).offset(input?.offset || 0);
      } catch (error) {
        console.error("Error fetching payments list:", error);
        return [];
      }
    }),

  getNextPaymentReferenceNumber: viewProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      const nextNumber = await generateNextPaymentReferenceNumber(database);
      return { referenceNumber: nextNumber };
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(payments.id, input), eq(payments.organizationId, orgId)) : eq(payments.id, input);
      const result = await database.select().from(payments).where(where).limit(1);
      return result[0] || null;
    }),

  byInvoice: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(payments.invoiceId, input), eq(payments.organizationId, orgId)) : eq(payments.invoiceId, input);
      const result = await database.select().from(payments).where(where);
      return result;
    }),

  byClient: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(payments.clientId, input), eq(payments.organizationId, orgId)) : eq(payments.clientId, input);
      const result = await database.select().from(payments).where(where);
      return result;
    }),

  create: createProcedure
    .input(z.object({
      invoiceId: z.string(),
      clientId: z.string(),
      amount: z.number(),
      paymentDate: z.date().or(z.string()),
      paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "mpesa", "card", "other"]),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
      estimateId: z.string().optional(),
      receiptId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Auto-generate payment reference number if not provided
      let referenceNumber = input.referenceNumber;
      if (!referenceNumber) {
        referenceNumber = await generateNextPaymentReferenceNumber(database);
      }
      
      const id = uuidv4();
      const { estimateId, receiptId, ...paymentData } = input;
      
      // Convert paymentDate to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      const convertToMySQLDateTime = (date?: Date | string | null): string => {
        if (!date) return new Date().toISOString().replace('T', ' ').substring(0, 19);
        if (typeof date === 'string') return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
        if (date instanceof Date) return date.toISOString().replace('T', ' ').substring(0, 19);
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
      };
      
      try {
        // Create payment record
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await database.insert(payments).values({
          id,
          organizationId: ctx.user.organizationId ?? null,
          invoiceId: paymentData.invoiceId,
          clientId: paymentData.clientId,
          accountId: null,  // Default null - will be set during payment processing
          amount: paymentData.amount,
          paymentDate: convertToMySQLDateTime(input.paymentDate),
          paymentMethod: paymentData.paymentMethod,
          referenceNumber,
          chartOfAccountType: 'debit',  // Default to debit
          notes: paymentData.notes || null,
          status: input.status || "pending",
          approvedBy: null,
          approvedAt: null,
          createdBy: ctx.user.id,
          createdAt: now,
        } as any);

        // Update invoice status and paid amount
        const invoiceResult = await database.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
        const invoice = invoiceResult[0];

        if (invoice) {
          const currentPaidAmount = invoice.paidAmount || 0;
          const newPaidAmount = currentPaidAmount + input.amount;
          const invoiceTotal = invoice.total || 0;

          let newInvoiceStatus: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' = invoice.status as any;
          
          if (newPaidAmount >= invoiceTotal) {
            newInvoiceStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newInvoiceStatus = 'partial';
          }

          await database.update(invoices).set({
            paidAmount: newPaidAmount,
            status: newInvoiceStatus,
          }).where(eq(invoices.id, input.invoiceId));

          await db.logActivity({
            userId: ctx.user.id,
            action: "payment_created",
            entityType: "payment",
            entityId: id,
            description: `Created payment of Ksh ${input.amount / 100} for invoice: ${invoice.invoiceNumber}. Invoice status updated to ${newInvoiceStatus}`,
          });
        }

        if (estimateId) {
          const estimateResult = await database.select().from(estimates).where(eq(estimates.id, estimateId)).limit(1);
          const estimate = estimateResult[0];

          if (estimate && estimate.status === 'accepted') {
            await database.update(estimates).set({
              status: 'completed' as any,
            }).where(eq(estimates.id, estimateId));

            await db.logActivity({
              userId: ctx.user.id,
              action: "estimate_completed",
              entityType: "estimate",
              entityId: estimateId,
              description: `Estimate ${estimate.estimateNumber} marked as completed due to payment received`,
            });
          }
        }

        if (receiptId) {
          const receiptResult = await database.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1);
          const receipt = receiptResult[0];

          if (receipt) {
            await database.update(receipts).set({
              paymentId: id,
            }).where(eq(receipts.id, receiptId));

            await db.logActivity({
              userId: ctx.user.id,
              action: "receipt_linked",
              entityType: "receipt",
              entityId: receiptId,
              description: `Receipt ${receipt.receiptNumber} linked to payment ${id}`,
            });
          }
        }

        // Send notification
        if (invoice) {
          await sendPaymentNotification(database, ctx.user.id, "recorded", input.amount, invoice.invoiceNumber, id);
          
          // Send email notification for payment received
          try {
            const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set';
            await triggerEventNotification({
              userId: ctx.user.id,
              eventType: "payment_received",
              recipientEmail: "client@example.com",
              recipientName: "Client",
              subject: `Payment Received - Invoice ${invoice.invoiceNumber}`,
              htmlContent: `
                <h2>Payment Received</h2>
                <p>Thank you! We have received your payment of <strong>Ksh ${(input.amount / 100).toLocaleString("en-KE")}</strong> for invoice <strong>${invoice.invoiceNumber}</strong>.</p>
                ${input.referenceNumber ? `<p><strong>Reference Number:</strong> ${input.referenceNumber}</p>` : ""}
                <p>Your payment has been recorded and your receipt is available for download.</p>
              `,
              entityType: "payment",
              entityId: id,
              actionUrl: `/invoices/${input.invoiceId}`,
            });
          } catch (err) {
            console.error("Failed to send payment received email:", err);
          }

          // Trigger workflows for payment_received
          try {
            await workflowTriggerEngine.trigger({
              triggerType: "payment_received",
              entityType: "payment",
              entityId: id,
              data: { paymentId: id, invoiceId: input.invoiceId, amount: input.amount },
              userId: ctx.user.id,
            });
          } catch (err) {
            console.error("Workflow trigger (payment_received) failed:", err);
          }
        }

        return { 
          id,
          invoiceStatus: invoice?.status,
          message: "Payment recorded successfully and documents updated"
        };
      } catch (error: any) {
        console.error("Error creating payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to record payment: ${error.message}`,
        });
      }
    }),

  update: createProcedure
    .input(z.object({
      id: z.string(),
      invoiceId: z.string().optional(),
      clientId: z.string().optional(),
      amount: z.number().optional(),
      paymentDate: z.date().or(z.string()).optional(),
      paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "mpesa", "card", "other"]).optional(),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { id, ...updateData } = input;
      
      // Convert dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      const convertToMySQLDateTime = (date?: Date | string | null): string | undefined => {
        if (!date) return undefined;
        if (typeof date === 'string') return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
        if (date instanceof Date) return date.toISOString().replace('T', ' ').substring(0, 19);
        return undefined;
      };

      const formattedData: any = { ...updateData };
      if (updateData.paymentDate) {
        formattedData.paymentDate = convertToMySQLDateTime(updateData.paymentDate);
      }

      // Get the current payment to check what's being updated
      const orgId = ctx.user.organizationId;
      const ownerCheck = orgId ? and(eq(payments.id, id), eq(payments.organizationId, orgId)) : eq(payments.id, id);
      const currentPayment = await database.select().from(payments).where(ownerCheck).limit(1);
      if (!currentPayment.length) throw new Error("Payment not found");
      const payment = currentPayment[0];

      await database.update(payments).set(formattedData).where(eq(payments.id, id));

      // If payment status is being updated to "completed", update the associated invoice
      if (updateData.status === "completed" && payment?.invoiceId) {
        try {
          const invoiceResult = await database.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).limit(1);
          const invoice = invoiceResult[0];

          if (invoice) {
            // Calculate total paid amount for this invoice (all completed payments)
            const paidPayments = await database
              .select({ total: payments.amount })
              .from(payments)
              .where(
                and(
                  eq(payments.invoiceId, payment.invoiceId),
                  eq(payments.status, 'completed')
                )
              );

            const totalPaid = paidPayments.reduce((sum, p) => sum + (p.total || 0), 0);
            const invoiceTotal = invoice.total || 0;

            // Determine new invoice status
            let newInvoiceStatus: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' = invoice.status as any;
            
            if (totalPaid >= invoiceTotal) {
              newInvoiceStatus = 'paid';
            } else if (totalPaid > 0) {
              newInvoiceStatus = 'partial';
            }

            // Update invoice with new paid amount and status
            await database.update(invoices).set({
              paidAmount: totalPaid,
              status: newInvoiceStatus,
            }).where(eq(invoices.id, payment.invoiceId));

            await db.logActivity({
              userId: ctx.user.id,
              action: "invoice_updated_via_payment",
              entityType: "invoice",
              entityId: payment.invoiceId,
              description: `Invoice status updated to ${newInvoiceStatus} with paid amount: Ksh ${totalPaid / 100}`,
            });
          }
        } catch (err) {
          console.error("Error updating invoice from payment:", err);
        }
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: "payment_updated",
        entityType: "payment",
        entityId: id,
        description: `Updated payment: ${id}. New status: ${updateData.status || 'unchanged'}`,
      });

      return { success: true };
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(payments.id, input), eq(payments.organizationId, orgId)) : eq(payments.id, input);
      await database.delete(payments).where(where);

      await db.logActivity({
        userId: ctx.user.id,
        action: "payment_deleted",
        entityType: "payment",
        entityId: input,
        description: `Deleted payment: ${input}`,
      });

      return { success: true };
    }),

  recordPayment: approveProcedure
    .input(z.object({
      invoiceId: z.string(),
      clientId: z.string(),
      amount: z.number(),
      paymentDate: z.date().or(z.string()),
      paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "mpesa", "card", "other"]),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
      autoMatch: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      const paymentId = uuidv4();
      const { autoMatch, ...paymentData } = input;

      // Convert dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      const convertToMySQLDateTime = (date?: Date | string | null): string => {
        if (!date) return new Date().toISOString().replace('T', ' ').substring(0, 19);
        if (typeof date === 'string') return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
        if (date instanceof Date) return date.toISOString().replace('T', ' ').substring(0, 19);
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
      };

      try {
        await database.insert(payments).values({
          id: paymentId,
          ...paymentData,
          paymentDate: convertToMySQLDateTime(input.paymentDate),
          createdBy: ctx.user.id,
        } as any);

        const invoiceResult = await database.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
        const invoice = invoiceResult[0];

        if (!invoice) {
          throw new Error("Invoice not found");
        }

        const currentPaidAmount = invoice.paidAmount || 0;
        const newPaidAmount = currentPaidAmount + input.amount;
        const invoiceTotal = invoice.total || 0;

        let invoiceStatus: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' = invoice.status as any;
        let isPaid = false;

        if (newPaidAmount >= invoiceTotal) {
          invoiceStatus = 'paid';
          isPaid = true;
        } else if (newPaidAmount > 0) {
          invoiceStatus = 'partial';
        }

        await database.update(invoices).set({
          paidAmount: newPaidAmount,
          status: invoiceStatus,
        }).where(eq(invoices.id, input.invoiceId));

        let matchedDocuments: any = {
          invoice: {
            id: invoice.id,
            number: invoice.invoiceNumber,
            status: invoiceStatus,
            paidAmount: newPaidAmount,
            total: invoiceTotal,
          },
          estimates: [],
          receipts: [],
        };

        if (autoMatch && isPaid) {
          const relatedEstimates = await database.select().from(estimates).where(eq(estimates.clientId, input.clientId));
          
          for (const estimate of relatedEstimates) {
            if (estimate.status === 'accepted' && estimate.total === invoiceTotal) {
              await database.update(estimates).set({
                status: 'completed' as any,
              }).where(eq(estimates.id, estimate.id));

              matchedDocuments.estimates.push({
                id: estimate.id,
                number: estimate.estimateNumber,
                status: 'completed',
              });

              await db.logActivity({
                userId: ctx.user.id,
                action: "estimate_auto_matched",
                entityType: "estimate",
                entityId: estimate.id,
                description: `Estimate ${estimate.estimateNumber} auto-matched and marked as completed`,
              });
            }
          }

          const receiptId = uuidv4();
          await database.insert(receipts).values({
            id: receiptId,
            receiptNumber: `RCP-${Date.now()}`,
            clientId: input.clientId,
            paymentId: paymentId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            receiptDate: convertToMySQLDateTime(input.paymentDate),
            notes: input.notes,
            createdBy: ctx.user.id,
          } as any);

          matchedDocuments.receipts.push({
            id: receiptId,
            number: `RCP-${Date.now()}`,
            status: 'created',
          });

          await db.logActivity({
            userId: ctx.user.id,
            action: "receipt_auto_created",
            entityType: "receipt",
            entityId: receiptId,
            description: `Receipt automatically created for payment ${paymentId}`,
          });
        }

        await db.logActivity({
          userId: ctx.user.id,
          action: "payment_recorded",
          entityType: "payment",
          entityId: paymentId,
          description: `Recorded payment of Ksh ${input.amount / 100} for invoice ${invoice.invoiceNumber}`,
        });

        // Send notification
        await sendPaymentNotification(database, ctx.user.id, "recorded", input.amount, invoice.invoiceNumber, paymentId);

        return {
          paymentId,
          matchedDocuments,
          message: "Payment recorded and documents matched successfully",
        };
      } catch (error: any) {
        console.error("Error recording payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to record payment: ${error.message}`,
        });
      }
    }),
});

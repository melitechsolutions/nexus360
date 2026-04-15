import { router } from "../_core/trpc";
import { z } from "zod";
import { paymentPlans, paymentPlanInstallments, invoices } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and, lte, gte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";

const createProcedure = createFeatureRestrictedProcedure("payments:create");
const viewProcedure = createFeatureRestrictedProcedure("payments:read");
const updateProcedure = createFeatureRestrictedProcedure("payments:edit");
const deleteProcedure = createFeatureRestrictedProcedure("payments:delete");

const createPaymentPlanSchema = z.object({
  invoiceId: z.string(),
  numInstallments: z.number().int().min(2).max(24),
  frequencyDays: z.number().int().min(1).max(365),
  startDate: z.string().datetime(),
  notes: z.string().optional(),
});

const updatePaymentPlanSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

const recordInstallmentPaymentSchema = z.object({
  installmentId: z.string(),
  paidAmount: z.number().int().min(0),
  paymentId: z.string(),
  notes: z.string().optional(),
});

export const paymentPlansRouter = router({
  createFromInvoice: createProcedure
    .input(createPaymentPlanSchema)
    .mutation(async (opts: any) => {
      const { input, ctx } = opts;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        // Verify invoice exists and fetch details
        const invoice = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, input.invoiceId))
          .limit(1);

        if (!invoice.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        const inv = invoice[0];
        const planId = nanoid();
        const installmentAmount = Math.ceil(inv.total / input.numInstallments);
        const startDate = new Date(input.startDate);

        // Create payment plan
        await db.insert(paymentPlans).values({
          id: planId,
          invoiceId: input.invoiceId,
          clientId: inv.clientId,
          numInstallments: input.numInstallments,
          installmentAmount,
          frequencyDays: input.frequencyDays,
          startDate: input.startDate,
          nextInstallmentDue: startDate.toISOString().replace('T', ' ').substring(0, 19),
          completedInstallments: 0,
          totalPaid: 0,
          status: "active",
          notes: input.notes,
          createdBy: ctx.user.id,
        });

        // Create individual installments
        const installments = [];
        for (let i = 1; i <= input.numInstallments; i++) {
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + (i - 1) * input.frequencyDays);

          installments.push({
            id: nanoid(),
            paymentPlanId: planId,
            installmentNumber: i,
            dueDate: dueDate.toISOString().replace('T', ' ').substring(0, 19),
            amount:
              i === input.numInstallments
                ? inv.total - installmentAmount * (input.numInstallments - 1)
                : installmentAmount,
            status: "pending" as const,
            paidDate: null,
            paidAmount: null,
            paymentId: null,
            notes: null,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
        }

        await db.insert(paymentPlanInstallments).values(installments);

        return {
          id: planId,
          success: true,
          installmentAmount,
          totalInstallments: input.numInstallments,
        };
      } catch (error) {
        console.error("[PAYMENT_PLANS] Create error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment plan",
        });
      }
    }),

  list: viewProcedure
    .input(
      z.object({
        invoiceId: z.string().optional(),
        clientId: z.string().optional(),
        status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const filters = [];
        if (input.invoiceId) {
          filters.push(eq(paymentPlans.invoiceId, input.invoiceId));
        }
        if (input.clientId) {
          filters.push(eq(paymentPlans.clientId, input.clientId));
        }
        if (input.status) {
          filters.push(eq(paymentPlans.status, input.status));
        }

        const result = await db
          .select()
          .from(paymentPlans)
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(desc(paymentPlans.createdAt));

        return result;
      } catch (error) {
        console.error("[PAYMENT_PLANS] List error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch payment plans",
        });
      }
    }),

  getById: viewProcedure.input(z.string()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    try {
      const plan = await db
        .select()
        .from(paymentPlans)
        .where(eq(paymentPlans.id, input))
        .limit(1);

      if (!plan.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment plan not found",
        });
      }

      // Fetch installments
      const installments = await db
        .select()
        .from(paymentPlanInstallments)
        .where(eq(paymentPlanInstallments.paymentPlanId, input))
        .orderBy(paymentPlanInstallments.installmentNumber);

      return {
        ...plan[0],
        installments,
      };
    } catch (error) {
      console.error("[PAYMENT_PLANS] GetById error:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch payment plan",
      });
    }
  }),

  update: updateProcedure
    .input(updatePaymentPlanSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const { id, ...updateData } = input;

        const existing = await db
          .select()
          .from(paymentPlans)
          .where(eq(paymentPlans.id, id))
          .limit(1);

        if (!existing.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment plan not found",
          });
        }

        const updates: any = {
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        if (updateData.status) {
          updates.status = updateData.status;
        }

        if (updateData.notes !== undefined) {
          updates.notes = updateData.notes;
        }

        await db
          .update(paymentPlans)
          .set(updates)
          .where(eq(paymentPlans.id, id));

        return { success: true };
      } catch (error) {
        console.error("[PAYMENT_PLANS] Update error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update payment plan",
        });
      }
    }),

  delete: deleteProcedure.input(z.string()).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    try {
      // Delete installments first
      await db
        .delete(paymentPlanInstallments)
        .where(eq(paymentPlanInstallments.paymentPlanId, input));

      // Delete payment plan
      await db.delete(paymentPlans).where(eq(paymentPlans.id, input));

      return { success: true };
    } catch (error) {
      console.error("[PAYMENT_PLANS] Delete error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete payment plan",
      });
    }
  }),

  recordInstallmentPayment: updateProcedure
    .input(recordInstallmentPaymentSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        // Get installment
        const installment = await db
          .select()
          .from(paymentPlanInstallments)
          .where(eq(paymentPlanInstallments.id, input.installmentId))
          .limit(1);

        if (!installment.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Installment not found",
          });
        }

        const inst = installment[0];

        // Get payment plan
        const plan = await db
          .select()
          .from(paymentPlans)
          .where(eq(paymentPlans.id, inst.paymentPlanId))
          .limit(1);

        if (!plan.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment plan not found",
          });
        }

        const pln = plan[0];

        // Update installment
        await db
          .update(paymentPlanInstallments)
          .set({
            status: "paid",
            paidDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
            paidAmount: input.paidAmount,
            paymentId: input.paymentId,
            notes: input.notes,
          })
          .where(eq(paymentPlanInstallments.id, input.installmentId));

        // Get all installments to check if plan is complete
        const allInstallments = await db
          .select()
          .from(paymentPlanInstallments)
          .where(eq(paymentPlanInstallments.paymentPlanId, inst.paymentPlanId));

        const updatedInstallments = allInstallments.map((i) =>
          i.id === input.installmentId ? { ...i, status: "paid" as const } : i
        );

        const completedCount = updatedInstallments.filter((i) => i.status === "paid").length;
        const totalPaid = updatedInstallments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);

        // Update payment plan
        const planUpdates: any = {
          completedInstallments: completedCount,
          totalPaid,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        if (completedCount === pln.numInstallments) {
          planUpdates.status = "completed";
        }

        // Calculate next installment due date
        const nextPending = updatedInstallments.find((i) => i.status === "pending");
        if (nextPending) {
          planUpdates.nextInstallmentDue = nextPending.dueDate;
        }

        await db
          .update(paymentPlans)
          .set(planUpdates)
          .where(eq(paymentPlans.id, inst.paymentPlanId));

        return { success: true, planCompleted: completedCount === pln.numInstallments };
      } catch (error) {
        console.error("[PAYMENT_PLANS] RecordPayment error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record installment payment",
        });
      }
    }),

  getInstallments: viewProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const installments = await db
          .select()
          .from(paymentPlanInstallments)
          .where(eq(paymentPlanInstallments.paymentPlanId, input))
          .orderBy(paymentPlanInstallments.installmentNumber);

        return installments;
      } catch (error) {
        console.error("[PAYMENT_PLANS] GetInstallments error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch installments",
        });
      }
    }),

  getUpcomingInstallments: viewProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const upcoming = await db
        .select({
          installment: paymentPlanInstallments,
          plan: paymentPlans,
        })
        .from(paymentPlanInstallments)
        .innerJoin(
          paymentPlans,
          eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
        )
        .where(
          and(
            eq(paymentPlanInstallments.status, "pending"),
            gte(paymentPlanInstallments.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
            lte(paymentPlanInstallments.dueDate, thirtyDaysFromNow.toISOString().replace('T', ' ').substring(0, 19)),
            eq(paymentPlans.status, "active")
          )
        )
        .orderBy(paymentPlanInstallments.dueDate);

      return upcoming;
    } catch (error) {
      console.error("[PAYMENT_PLANS] GetUpcoming error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch upcoming installments",
      });
    }
  }),

  getOverdueInstallments: viewProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const now = new Date();

      const overdue = await db
        .select({
          installment: paymentPlanInstallments,
          plan: paymentPlans,
        })
        .from(paymentPlanInstallments)
        .innerJoin(
          paymentPlans,
          eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
        )
        .where(
          and(
            eq(paymentPlanInstallments.status, "pending"),
            lte(paymentPlanInstallments.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
            eq(paymentPlans.status, "active")
          )
        )
        .orderBy(paymentPlanInstallments.dueDate);

      return overdue;
    } catch (error) {
      console.error("[PAYMENT_PLANS] GetOverdue error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch overdue installments",
      });
    }
  }),
});

export type PaymentPlansRouter = typeof paymentPlansRouter;

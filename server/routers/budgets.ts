import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { budgets, departments } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export const budgetsRouter = router({
  list: createFeatureRestrictedProcedure("budgets:view")
    .input(
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        departmentId: z.string().optional(),
        fiscalYear: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];
        const orgId = ctx.user.organizationId;

        // Query budgets with department details
        const q = database
          .select({
            id: budgets.id,
            departmentId: budgets.departmentId,
            departmentName: departments.name,
            amount: budgets.amount,
            remaining: budgets.remaining,
            fiscalYear: budgets.fiscalYear,
            createdAt: budgets.createdAt,
          })
          .from(budgets)
          .leftJoin(departments, eq(budgets.departmentId, departments.id));

        const results = orgId
          ? await q.where(eq(budgets.organizationId, orgId)).orderBy(desc(budgets.fiscalYear), desc(budgets.createdAt)).limit(100).offset(0)
          : await q.orderBy(desc(budgets.fiscalYear), desc(budgets.createdAt)).limit(100).offset(0);

        return results || [];
      } catch (error) {
        console.error("Error fetching budgets:", error);
        return [];
      }
    }),

  getById: createFeatureRestrictedProcedure("budgets:view")
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) return null;

        const result = await database
          .select({
            id: budgets.id,
            departmentId: budgets.departmentId,
            departmentName: departments.name,
            amount: budgets.amount,
            remaining: budgets.remaining,
            fiscalYear: budgets.fiscalYear,
            createdAt: budgets.createdAt,
          })
          .from(budgets)
          .leftJoin(departments, eq(budgets.departmentId, departments.id))
          .where(eq(budgets.id, input))
          .limit(1);

        return result?.[0] || null;
      } catch (error) {
        console.error("Error fetching budget:", error);
        return null;
      }
    }),

  create: createFeatureRestrictedProcedure("budgets:create")
    .input(
      z.object({
        departmentId: z.string(),
        amount: z.number().positive(),
        remaining: z.number().positive(),
        fiscalYear: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const id = uuidv4();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

        await database.insert(budgets).values({
          id,
          departmentId: input.departmentId,
          amount: input.amount,
          remaining: input.remaining,
          fiscalYear: input.fiscalYear,
          budgetStatus: 'draft',
          totalBudgeted: input.amount,
          totalActual: 0,
          variance: input.amount,
          variancePercent: 0,
          createdAt: now,
          updatedAt: now,
          organizationId: ctx.user.organizationId || null,
        });

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_created",
          entityType: "budget",
          entityId: id,
          description: `Created budget: Ksh ${input.amount.toLocaleString()} for FY ${input.fiscalYear}`,
        });

        return { id };
      } catch (error: any) {
        console.error("Error creating budget:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create budget: ${error.message}`,
        });
      }
    }),

  update: createFeatureRestrictedProcedure("budgets:edit")
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive().optional(),
        remaining: z.number().optional(),
        fiscalYear: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const updateData: any = {};

        if (input.amount !== undefined) updateData.amount = input.amount;
        if (input.remaining !== undefined) updateData.remaining = input.remaining;
        if (input.fiscalYear !== undefined) updateData.fiscalYear = input.fiscalYear;

        if (Object.keys(updateData).length === 0) {
          throw new Error("No fields to update");
        }

        updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

        await database.update(budgets).set(updateData).where(eq(budgets.id, input.id));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_updated",
          entityType: "budget",
          entityId: input.id,
          description: `Updated budget`,
        });

        return { success: true };
      } catch (error: any) {
        console.error("Error updating budget:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update budget: ${error.message}`,
        });
      }
    }),

  delete: createFeatureRestrictedProcedure("budgets:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        await database.delete(budgets).where(eq(budgets.id, input));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_deleted",
          entityType: "budget",
          entityId: input,
          description: `Deleted budget`,
        });

        return { success: true };
      } catch (error: any) {
        console.error("Error deleting budget:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete budget: ${error.message}`,
        });
      }
    }),

  deductFromBudget: createFeatureRestrictedProcedure("budgets:edit")
    .input(
      z.object({
        budgetId: z.string(),
        amount: z.number().positive(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        // Get current budget
        const budgetRecord = await database
          .select({ remaining: budgets.remaining })
          .from(budgets)
          .where(eq(budgets.id, input.budgetId))
          .limit(1);

        if (!budgetRecord || budgetRecord.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Budget not found",
          });
        }

        const remaining = budgetRecord[0].remaining - input.amount;

        if (remaining < 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient budget. Available: Ksh ${budgetRecord[0].remaining / 100}`,
          });
        }

        await database
          .update(budgets)
          .set({
            remaining,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(budgets.id, input.budgetId));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_deducted",
          entityType: "budget",
          entityId: input.budgetId,
          description: `Deducted Ksh ${input.amount / 100} from budget. ${input.reason || ""}`,
        });

        return { remaining };
      } catch (error: any) {
        console.error("Error deducting from budget:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to deduct from budget: ${error.message}`,
        });
      }
    }),

  getSummary: createFeatureRestrictedProcedure("budgets:view")
    .input(
      z.object({
        fiscalYear: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) return null;

        const year = input?.fiscalYear || new Date().getFullYear();

        // Use Drizzle for aggregation
        const result = await database
          .select({
            totalBudget: sql<number>`CAST(SUM(${budgets.amount}) AS UNSIGNED)`,
            totalRemaining: sql<number>`CAST(SUM(${budgets.remaining}) AS UNSIGNED)`,
            totalSpent: sql<number>`CAST(SUM(${budgets.amount} - ${budgets.remaining}) AS UNSIGNED)`,
            budgetCount: sql<number>`COUNT(*)`,
            utilizationPercent: sql<number>`ROUND(((SUM(${budgets.amount}) - SUM(${budgets.remaining})) / SUM(${budgets.amount})) * 100, 2)`,
          })
          .from(budgets)
          .where(eq(budgets.fiscalYear, year));

        return result?.[0] || null;
      } catch (error) {
        console.error("Error fetching budget summary:", error);
        return null;
      }
    }),
});

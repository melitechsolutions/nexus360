import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";

const readProcedure = protectedProcedure;
import { projects, departments, expenses, invoices } from "../../drizzle/schema";
import { projectBudgets, departmentBudgets, ledgerBudgets, budgetAllocations } from "../../drizzle/schema-extended";
import { eq, desc, and, gte, lte, sum } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

// Feature-based procedures
const writeProcedure = createFeatureRestrictedProcedure("budget:edit");

export const budgetRouter = router({
  // ========== PROJECT BUDGETS ==========
  
  projectBudgets: router({
    // List project budgets
    list: protectedProcedure
      .input(z.object({
        projectId: z.string().optional(),
        status: z.enum(["under", "at", "over"]).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) return [];

        const orgId = ctx.user.organizationId;
        const conditions: any[] = [];
        if (orgId) conditions.push(eq(projectBudgets.organizationId, orgId));
        if (input?.projectId) conditions.push(eq(projectBudgets.projectId, input.projectId));
        if (input?.status) conditions.push(eq(projectBudgets.budgetStatus, input.status));

        const whereClause = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

        return await database.select().from(projectBudgets)
          .where(whereClause)
          .orderBy(desc(projectBudgets.createdAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0);
      }),

    // Get budget by ID
    getById: readProcedure
      .input(z.string())
      .query(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) return null;

        const orgId = ctx.user.organizationId;
        const where = orgId ? and(eq(projectBudgets.id, input), eq(projectBudgets.organizationId, orgId)) : eq(projectBudgets.id, input);
        const result = await database
          .select()
          .from(projectBudgets)
          .where(where)
          .limit(1);

        return result[0] || null;
      }),

    // Create project budget
    create: writeProcedure
      .input(z.object({
        projectId: z.string(),
        budgetedAmount: z.number(),
        startDate: z.string(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const id = uuidv4();
        const budgetedCents = Math.round(input.budgetedAmount * 100);

        try {
          await database.insert(projectBudgets).values({
            id,
            organizationId: ctx.user.organizationId ?? null,
            projectId: input.projectId,
            budgetedAmount: budgetedCents,
            spent: 0,
            remaining: budgetedCents,
            budgetStatus: "under",
            startDate: new Date(input.startDate),
            endDate: input.endDate ? new Date(input.endDate) : null,
            notes: input.notes,
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          await db.logActivity({
            userId: ctx.user.id,
            action: "project_budget_created",
            entityType: "projectBudget",
            entityId: id,
            description: `Created budget for project: ${input.budgetedAmount}`,
          });

          return { id };
        } catch (error) {
          console.error("Error creating project budget:", error);
          throw new Error("Failed to create project budget");
        }
      }),

    // Update project budget
    update: writeProcedure
      .input(z.object({
        id: z.string(),
        budgetedAmount: z.number().optional(),
        spent: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const budget = await database
          .select()
          .from(projectBudgets)
          .where(eq(projectBudgets.id, input.id))
          .limit(1);

        if (!budget[0]) throw new Error("Budget not found");

        // Verify org ownership
        const orgId = ctx.user.organizationId;
        if (orgId && budget[0].organizationId !== orgId) throw new Error("Budget not found");

        const updates: any = { updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
        let budgeted = budget[0].budgetedAmount;
        let spent = budget[0].spent;

        if (input.budgetedAmount !== undefined) {
          budgeted = Math.round(input.budgetedAmount * 100);
          updates.budgetedAmount = budgeted;
        }

        if (input.spent !== undefined) {
          spent = Math.round(input.spent * 100);
          updates.spent = spent;
        }

        if (input.notes !== undefined) {
          updates.notes = input.notes;
        }

        // Calculate remaining and status
        const remaining = budgeted - spent;
        const status = spent > budgeted ? "over" : spent === budgeted ? "at" : "under";

        updates.remaining = remaining;
        updates.budgetStatus = status;

        try {
          await database.update(projectBudgets).set(updates).where(eq(projectBudgets.id, input.id));

          await db.logActivity({
            userId: ctx.user.id,
            action: "project_budget_updated",
            entityType: "projectBudget",
            entityId: input.id,
            description: "Updated project budget",
          });

          return { success: true };
        } catch (error) {
          console.error("Error updating project budget:", error);
          throw new Error("Failed to update project budget");
        }
      }),

    // Delete project budget
    delete: writeProcedure
      .input(z.string())
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        try {
          // Verify org ownership
          const orgId = ctx.user.organizationId;
          if (orgId) {
            const existing = await database.select().from(projectBudgets).where(eq(projectBudgets.id, input)).limit(1);
            if (!existing.length || existing[0].organizationId !== orgId) throw new Error("Budget not found");
          }

          await database.delete(projectBudgets).where(eq(projectBudgets.id, input));

          await db.logActivity({
            userId: ctx.user.id,
            action: "project_budget_deleted",
            entityType: "projectBudget",
            entityId: input,
            description: "Deleted project budget",
          });

          return { success: true };
        } catch (error) {
          console.error("Error deleting project budget:", error);
          throw new Error("Failed to delete project budget");
        }
      }),
  }),

  // ========== DEPARTMENT BUDGETS ==========

  departmentBudgets: router({
    // List department budgets
    list: readProcedure
      .input(z.object({
        year: z.number(),
        departmentId: z.string().optional(),
        status: z.enum(["under", "at", "over"]).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) return [];

        const orgId = ctx.user.organizationId;
        const conditions: any[] = [];
        conditions.push(eq(departmentBudgets.year, input?.year || new Date().getFullYear()));
        if (orgId) conditions.push(eq(departmentBudgets.organizationId, orgId));
        if (input?.departmentId) conditions.push(eq(departmentBudgets.departmentId, input.departmentId));
        if (input?.status) conditions.push(eq(departmentBudgets.budgetStatus, input.status));

        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

        return await database.select().from(departmentBudgets)
          .where(whereClause)
          .orderBy(desc(departmentBudgets.createdAt));
      }),

    // Create department budget
    create: writeProcedure
      .input(z.object({
        departmentId: z.string(),
        year: z.number(),
        budgetedAmount: z.number(),
        category: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const id = uuidv4();
        const budgetedCents = Math.round(input.budgetedAmount * 100);

        try {
          await database.insert(departmentBudgets).values({
            id,
            departmentId: input.departmentId,
            year: input.year,
            budgetedAmount: budgetedCents,
            spent: 0,
            remaining: budgetedCents,
            budgetStatus: "under",
            category: input.category,
            notes: input.notes,
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          await db.logActivity({
            userId: ctx.user.id,
            action: "department_budget_created",
            entityType: "departmentBudget",
            entityId: id,
            description: `Created budget for department ${input.year}`,
          });

          return { id };
        } catch (error) {
          console.error("Error creating department budget:", error);
          throw new Error("Failed to create department budget");
        }
      }),

    // Update department budget spent amount (based on actual expenses linked via budgetAllocations)
    updateSpent: writeProcedure
      .input(z.object({
        departmentId: z.string(),
        year: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new Error("Database unavailable");
        const orgId = ctx.user.organizationId;

        try {
          // Find the department budget
          const budgetConditions = [
            eq(departmentBudgets.departmentId, input.departmentId),
            eq(departmentBudgets.year, input.year),
          ];
          if (orgId) budgetConditions.push(eq(departmentBudgets.organizationId, orgId));

          const [budget] = await database.select().from(departmentBudgets)
            .where(and(...budgetConditions)).limit(1);

          if (!budget) throw new Error("Department budget not found");

          // Sum approved expenses that belong to employees in this department
          // Join through employees table to get department linkage
          const yearStart = `${input.year}-01-01`;
          const yearEnd = `${input.year}-12-31`;

          const [result] = await (database as any).execute(
            `SELECT COALESCE(SUM(e.amount), 0) as totalSpent
             FROM expenses e
             INNER JOIN employees emp ON e.createdBy = emp.userId
             WHERE emp.department = (SELECT name FROM departments WHERE id = ?)
             AND e.status = 'approved'
             AND e.expenseDate BETWEEN ? AND ?
             ${orgId ? 'AND e.organizationId = ?' : ''}`,
            orgId ? [input.departmentId, yearStart, yearEnd, orgId] : [input.departmentId, yearStart, yearEnd]
          );

          const totalSpent = Number(result?.[0]?.totalSpent || 0);

          await database.update(departmentBudgets).set({
            spent: totalSpent,
            budgetStatus: totalSpent > (budget as any).amount ? 'over' : 'under',
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any).where(eq(departmentBudgets.id, (budget as any).id));

          return { success: true, spent: totalSpent, budgetId: (budget as any).id };
        } catch (error) {
          console.error("Error updating department budget spent:", error);
          throw new Error("Failed to update department budget spent amount");
        }
      }),
  }),

  // ========== BUDGET DASHBOARD & ANALYTICS ==========

  dashboard: router({
    // Get overall budget summary
    summary: readProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) return null;

        const year = input?.year || new Date().getFullYear();
        const orgId = ctx.user.organizationId;

        try {
          const projectBudgetsData = orgId
            ? await database.select().from(projectBudgets).where(eq(projectBudgets.organizationId, orgId))
            : await database.select().from(projectBudgets);
          const deptBudgetData = orgId
            ? await database.select().from(departmentBudgets).where(and(eq(departmentBudgets.year, year), eq(departmentBudgets.organizationId, orgId)))
            : await database.select().from(departmentBudgets).where(eq(departmentBudgets.year, year));

          const totalProjectBudget = projectBudgetsData.reduce((sum, b) => sum + (b.budgetedAmount || 0), 0);
          const totalProjectSpent = projectBudgetsData.reduce((sum, b) => sum + (b.spent || 0), 0);

          const totalDeptBudget = deptBudgetData.reduce((sum, b) => sum + (b.budgetedAmount || 0), 0);
          const totalDeptSpent = deptBudgetData.reduce((sum, b) => sum + (b.spent || 0), 0);

          const overBudgetCount = deptBudgetData.filter(b => b.budgetStatus === "over").length;

          return {
            year,
            projects: {
              total: totalProjectBudget,
              spent: totalProjectSpent,
              remaining: totalProjectBudget - totalProjectSpent,
              percentage: totalProjectBudget > 0 ? Math.round((totalProjectSpent / totalProjectBudget) * 100) : 0,
            },
            departments: {
              total: totalDeptBudget,
              spent: totalDeptSpent,
              remaining: totalDeptBudget - totalDeptSpent,
              percentage: totalDeptBudget > 0 ? Math.round((totalDeptSpent / totalDeptBudget) * 100) : 0,
              overBudgetCount,
            },
            combined: {
              total: totalProjectBudget + totalDeptBudget,
              spent: totalProjectSpent + totalDeptSpent,
              remaining: (totalProjectBudget + totalDeptBudget) - (totalProjectSpent + totalDeptSpent),
            },
          };
        } catch (error) {
          console.error("Error fetching budget summary:", error);
          return null;
        }
      }),

    // Get budget vs actual comparison by department
    byDepartment: readProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) return [];

        const year = input?.year || new Date().getFullYear();
        const orgId = ctx.user.organizationId;

        try {
          const deptBudgets = orgId
            ? await database.select().from(departmentBudgets).where(and(eq(departmentBudgets.year, year), eq(departmentBudgets.organizationId, orgId)))
            : await database.select().from(departmentBudgets).where(eq(departmentBudgets.year, year));

          return deptBudgets.map(budget => ({
            id: budget.id,
            departmentId: budget.departmentId,
            category: budget.category,
            budgeted: budget.budgetedAmount,
            spent: budget.spent,
            remaining: budget.remaining,
            percentage: budget.budgetedAmount > 0 ? Math.round((budget.spent / budget.budgetedAmount) * 100) : 0,
            status: budget.budgetStatus,
            notes: budget.notes,
          }));
        } catch (error) {
          console.error("Error fetching department budgets:", error);
          return [];
        }
      }),

    // Get budget vs actual comparison by project
    byProject: readProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];

      try {
        const orgId = ctx.user.organizationId;
        const budgets = orgId
          ? await database.select().from(projectBudgets).where(eq(projectBudgets.organizationId, orgId))
          : await database.select().from(projectBudgets);

        return budgets.map(budget => ({
          id: budget.id,
          projectId: budget.projectId,
          budgeted: budget.budgetedAmount,
          spent: budget.spent,
          remaining: budget.remaining,
          percentage: budget.budgetedAmount > 0 ? Math.round((budget.spent / budget.budgetedAmount) * 100) : 0,
          status: budget.budgetStatus,
          startDate: budget.startDate,
          endDate: budget.endDate,
        }));
      } catch (error) {
        console.error("Error fetching project budgets:", error);
        return [];
      }
    }),

    // Get alerts for over-budget items
    alerts: readProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];

      try {
        const orgId = ctx.user.organizationId;
        const overBudget = orgId
          ? await database.select().from(departmentBudgets).where(and(eq(departmentBudgets.budgetStatus, "over"), eq(departmentBudgets.organizationId, orgId)))
          : await database.select().from(departmentBudgets).where(eq(departmentBudgets.budgetStatus, "over"));

        return overBudget.map(budget => ({
          id: budget.id,
          type: "department",
          name: budget.departmentId,
          category: budget.category,
          budgeted: budget.budgetedAmount,
          spent: budget.spent,
          overage: budget.spent - budget.budgetedAmount,
          percentage: Math.round((budget.spent / budget.budgetedAmount) * 100),
          severity: budget.spent > budget.budgetedAmount * 1.2 ? "critical" : "warning",
        }));
      } catch (error) {
        console.error("Error fetching budget alerts:", error);
        return [];
      }
    }),
  }),
});

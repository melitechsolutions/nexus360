import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { budgets, departments, accounts } from "../../drizzle/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

// Define typed procedures
const readProcedure = createFeatureRestrictedProcedure("budget:read");
const createProcedure = createFeatureRestrictedProcedure("budget:create");
const updateProcedure = createFeatureRestrictedProcedure("budget:update");
const writeProcedure = createFeatureRestrictedProcedure("budget:update");

/**
 * Budget lines/allocations interface for detailed budget tracking
 */
interface BudgetLine {
  id: string;
  budgetId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  budgeted: number;
  actual: number;
  variance: number;
  description?: string;
}

/**
 * Professional Budgeting Router
 * Implements professional budgeting standards with multi-level allocations,
 * variance analysis, and detailed tracking
 */
export const professionalBudgetingRouter = router({
  /**
   * Create professional budget with line items
   */
  createBudget: createProcedure
    .input(z.object({
      budgetName: z.string().min(1),
      budgetDescription: z.string().optional(),
      departmentId: z.string(),
      fiscalYear: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      budgetLines: z.array(z.object({
        accountId: z.string(),
        budgeted: z.number().nonnegative(),
        description: z.string().optional(),
      })),
      approvalRequired: z.boolean().default(true),
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
        // Verify department exists
        const deptData = await database
          .select()
          .from(departments)
          .where(eq(departments.id, input.departmentId));

        if (!deptData || deptData.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Department not found",
          });
        }

        // Verify all accounts exist and get totals
        let totalBudgeted = 0;
        const accountsToProcess = [];

        for (const line of input.budgetLines) {
          const accountData = await database
            .select()
            .from(accounts)
            .where(eq(accounts.id, line.accountId));

          if (!accountData || accountData.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Account ${line.accountId} not found`,
            });
          }

          totalBudgeted += line.budgeted;
          accountsToProcess.push({ account: accountData[0], line });
        }

        // Create budget record
        const budgetId = uuidv4();
        
        // Convert dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        const convertToMySQLDateTime = (date: string | Date): string => {
          const d = typeof date === 'string' ? new Date(date) : date;
          return d.toISOString().replace('T', ' ').substring(0, 19);
        };

        const budgetData: any = {
          id: budgetId,
          departmentId: input.departmentId,
          amount: totalBudgeted,
          remaining: totalBudgeted,
          fiscalYear: input.fiscalYear,
          budgetStatus: input.approvalRequired ? 'draft' : 'active',
          createdBy: ctx.user.id,
        };

        if (input.budgetName) budgetData.budgetName = input.budgetName;
        if (input.budgetDescription) budgetData.budgetDescription = input.budgetDescription;
        if (input.startDate) budgetData.startDate = convertToMySQLDateTime(input.startDate);
        if (input.endDate) budgetData.endDate = convertToMySQLDateTime(input.endDate);
        budgetData.totalBudgeted = totalBudgeted;

        await database.insert(budgets).values(budgetData);

        // Store budget lines (implementation depends on whether budget_lines table exists)
        // For now, storing in memory/cache structure that can be persisted later
        const budgetLinesData: BudgetLine[] = accountsToProcess.map(({ account, line }) => ({
          id: uuidv4(),
          budgetId,
          accountId: line.accountId,
          accountCode: account.accountCode,
          accountName: account.accountName,
          budgeted: line.budgeted,
          actual: 0,
          variance: line.budgeted,
          description: line.description,
        }));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_created",
          entityType: "budget",
          entityId: budgetId,
          description: `Professional budget "${input.budgetName}" created for FY${input.fiscalYear} with ${input.budgetLines.length} line items, total: ${totalBudgeted}`,
        });

        return {
          success: true,
          budgetId,
          totalBudgeted,
          budgetLines: budgetLinesData,
          status: input.approvalRequired ? 'draft' : 'active',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create budget: ${error}`,
        });
      }
    }),

  /**
   * Import budget from CSV file
   * Supports bulk budget creation from structured CSV data
   */
  importBudgetFromCSV: createProcedure
    .input(z.object({
      budgetName: z.string(),
      budgetDescription: z.string().optional(),
      departmentId: z.string(),
      fiscalYear: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      csvData: z.array(z.object({
        accountCode: z.string(),
        accountName: z.string().optional(),
        budgeted: z.number().nonnegative(),
        description: z.string().optional(),
      })),
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
        const errors: Array<{ row: number; message: string }> = [];
        const budgetLines: BudgetLine[] = [];
        let totalBudgeted = 0;

        // Process each CSV row
        for (let idx = 0; idx < input.csvData.length; idx++) {
          const row = idx + 1;
          const csvLine = input.csvData[idx];

          try {
            // Find account by code
            const accountData = await database
              .select()
              .from(accounts)
              .where(eq(accounts.accountCode, csvLine.accountCode));

            if (!accountData || accountData.length === 0) {
              errors.push({
                row,
                message: `Account with code ${csvLine.accountCode} not found`,
              });
              continue;
            }

            const account = accountData[0];
            totalBudgeted += csvLine.budgeted;

            budgetLines.push({
              id: uuidv4(),
              budgetId: '', // Will be set after budget creation
              accountId: account.id,
              accountCode: account.accountCode,
              accountName: account.accountName,
              budgeted: csvLine.budgeted,
              actual: 0,
              variance: csvLine.budgeted,
              description: csvLine.description || account.description || undefined,
            });
          } catch (error) {
            errors.push({
              row,
              message: `Error processing row: ${error}`,
            });
          }
        }

        if (budgetLines.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `No valid budget lines could be imported from CSV. Errors: ${errors.map(e => e.message).join('; ')}`,
          });
        }

        // Create budget
        const budgetId = uuidv4();
        
        // Convert dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        const convertToMySQLDateTime = (date: string | Date): string => {
          const d = typeof date === 'string' ? new Date(date) : date;
          return d.toISOString().replace('T', ' ').substring(0, 19);
        };

        const budgetData: any = {
          id: budgetId,
          departmentId: input.departmentId,
          amount: totalBudgeted,
          remaining: totalBudgeted,
          fiscalYear: input.fiscalYear,
          budgetStatus: 'draft',
          createdBy: ctx.user.id,
          totalBudgeted: totalBudgeted,
        };

        if (input.budgetName) budgetData.budgetName = input.budgetName;
        if (input.budgetDescription) budgetData.budgetDescription = input.budgetDescription;
        if (input.startDate) budgetData.startDate = convertToMySQLDateTime(input.startDate);
        if (input.endDate) budgetData.endDate = convertToMySQLDateTime(input.endDate);

        await database.insert(budgets).values(budgetData);

        // Update budgetId in budget lines
        budgetLines.forEach(line => line.budgetId = budgetId);

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_imported_from_csv",
          entityType: "budget",
          entityId: budgetId,
          description: `Budget imported from CSV with ${budgetLines.length} line items (${errors.length} errors)`,
        });

        return {
          success: true,
          budgetId,
          totalBudgeted,
          budgetLinesCount: budgetLines.length,
          budgetLines,
          errors: errors.length > 0 ? errors : undefined,
          message: `Budget imported with ${budgetLines.length} lines`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to import budget: ${error}`,
        });
      }
    }),

  /**
   * Approve budget for implementation
   */
  approveBudget: writeProcedure
    .input(z.object({
      budgetId: z.string(),
      approvalNotes: z.string().optional(),
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
        // Only admins/super_admins/managers can approve budgets
        if (!['super_admin', 'admin', 'manager'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins or managers can approve budgets",
          });
        }

        const budgetData = await database
          .select()
          .from(budgets)
          .where(eq(budgets.id, input.budgetId));

        if (!budgetData || budgetData.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Budget not found",
          });
        }

        await database
          .update(budgets)
          .set({
            budgetStatus: 'active',
            approvedBy: ctx.user.id,
            approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(budgets.id, input.budgetId));

        await db.logActivity({
          userId: ctx.user.id,
          action: "budget_approved",
          entityType: "budget",
          entityId: input.budgetId,
          description: `Budget approved for implementation. ${input.approvalNotes || ''}`,
        });

        return {
          success: true,
          message: "Budget approved successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to approve budget: ${error}`,
        });
      }
    }),

  /**
   * Get budget with variance analysis
   */
  getBudgetAnalysis: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const budgetData = await database
        .select()
        .from(budgets)
        .where(eq(budgets.id, input));

      if (!budgetData || budgetData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      }

      const budget = budgetData[0];

      return {
        budget,
        variance: (budget.variancePercent || 0) / 100,
        status: budget.budgetStatus,
        utilizationPercent: budget.totalBudgeted > 0 
          ? ((budget.totalActual || 0) / budget.totalBudgeted) * 100 
          : 0,
      };
    }),

  /**
   * List all budgets for department/fiscal year with summary
   */
  listBudgets: readProcedure
    .input(z.object({
      departmentId: z.string().optional(),
      fiscalYear: z.number().optional(),
      status: z.enum(['draft', 'active', 'inactive', 'closed']).optional(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      let query = database.select().from(budgets);

      if (input.departmentId) {
        query = query.where(eq(budgets.departmentId, input.departmentId)) as any;
      }

      if (input.fiscalYear) {
        query = query.where(eq(budgets.fiscalYear, input.fiscalYear)) as any;
      }

      if (input.status) {
        query = query.where(eq(budgets.budgetStatus, input.status)) as any;
      }

      const budgetList = await query;

      return budgetList.map(b => ({
        ...b,
        utilizationPercent: b.totalBudgeted > 0 
          ? ((b.totalActual || 0) / b.totalBudgeted) * 100 
          : 0,
        variancePercent: ((b.variancePercent || 0) / 100),
      }));
    }),

  /**
   * Generate budget template for download
   */
  generateBudgetTemplate: writeProcedure
    .input(z.object({
      fiscalYear: z.number(),
      departmentId: z.string(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get all active accounts for template
      const accountList = await database
        .select()
        .from(accounts)
        .where(eq(accounts.isActive, 1));

      const template = {
        budgetName: `FY${input.fiscalYear} Department Budget`,
        budgetDescription: 'Professional budget template',
        departmentId: input.departmentId,
        fiscalYear: input.fiscalYear,
        startDate: `${input.fiscalYear}-01-01`,
        endDate: `${input.fiscalYear}-12-31`,
        instructions: [
          '1. Fill in budgeted amounts for each account',
          '2. Ensure all required accounts are included',
          '3. Submit for approval',
          '4. Budget cannot be modified after approval',
        ],
        csvData: accountList.map(acc => ({
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          budgeted: 0,
          description: acc.description || '',
        })),
      };

      return template;
    }),
});

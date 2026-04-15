import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { accounts } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

// Validation schemas
const accountCodeSchema = z.string().min(1, "Account code is required");
const accountTypeEnum = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense', 'cost of goods sold', 'operating expense', 'capital expenditure', 'other income', 'other expense']);

export const chartOfAccountsRouter = router({
  list: createFeatureRestrictedProcedure("chartOfAccounts:read")
    .input(z.object({ 
      limit: z.number().optional(), 
      offset: z.number().optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];
      const orgId = ctx.user.organizationId;
      const activeFilter = eq(accounts.isActive, 1);
      
      let query = database.select().from(accounts).where(
        orgId ? and(activeFilter, eq(accounts.organizationId, orgId)) : activeFilter
      );
      
      if (input?.type && input.type !== 'all') {
        const typeFilter = eq(accounts.accountType, input.type as any);
        query = database
          .select()
          .from(accounts)
          .where(
            orgId ? and(typeFilter, activeFilter, eq(accounts.organizationId, orgId)) : and(typeFilter, activeFilter)
          ) as any;
      }
      
      return await (query as any)
        .orderBy(desc(accounts.createdAt))
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);
    }),

  getById: createFeatureRestrictedProcedure("chartOfAccounts:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(accounts.id, input.id), eq(accounts.organizationId, orgId)) : eq(accounts.id, input.id);
      const result = await database.select().from(accounts).where(where).limit(1);
      return result[0] || null;
    }),

  create: createFeatureRestrictedProcedure("chartOfAccounts:create")
    .input(z.object({
      accountCode: accountCodeSchema,
      accountName: z.string().min(1, "Account name is required").max(100),
      accountType: accountTypeEnum,
      parentAccountId: z.string().nullable().optional(),
      balance: z.number().optional().default(0),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      // Check for duplicate account code
      const existing = await database
        .select()
        .from(accounts)
        .where(and(eq(accounts.accountCode, input.accountCode), eq(accounts.isActive, 1)))
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error(`Account code '${input.accountCode}' already exists`);
      }

      const id = uuidv4();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      await database.insert(accounts).values({
        id,
        accountCode: input.accountCode,
        accountName: input.accountName,
        accountType: input.accountType,
        parentAccountId: input.parentAccountId || null,
        balance: input.balance,
        description: input.description,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
        organizationId: ctx.user.organizationId ?? null,
      });

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "account_created",
        entityType: "account",
        entityId: id,
        description: `Created account: ${input.accountCode} - ${input.accountName}`,
      });
      
      return { id };
    }),

  update: createFeatureRestrictedProcedure("chartOfAccounts:edit")
    .input(z.object({
      id: z.string(),
      accountCode: accountCodeSchema.optional(),
      accountName: z.string().max(100).optional(),
      accountType: accountTypeEnum.optional(),
      parentAccountId: z.string().nullable().optional(),
      balance: z.number().optional(),
      description: z.string().max(500).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      const existingAccount = await database
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.id))
        .limit(1);
      
      if (!existingAccount.length) {
        throw new Error("Account not found");
      }

      // Verify org ownership
      const orgId = ctx.user.organizationId;
      if (orgId && existingAccount[0].organizationId !== orgId) {
        throw new Error("Account not found");
      }

      if (input.accountCode && input.accountCode !== existingAccount[0].accountCode) {
        const duplicate = await database
          .select()
          .from(accounts)
          .where(and(eq(accounts.accountCode, input.accountCode), eq(accounts.isActive, 1)))
          .limit(1);
        
        if (duplicate.length > 0) {
          throw new Error(`Account code '${input.accountCode}' already exists`);
        }
      }

      const { id, isActive, ...data } = input;
      const updateData: any = { ...data };
      if (isActive !== undefined) {
        updateData.isActive = isActive ? 1 : 0;
      }
      
      await database.update(accounts).set(updateData).where(eq(accounts.id, id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "account_updated",
        entityType: "account",
        entityId: id,
        description: `Updated account: ${existingAccount[0].accountCode}`,
      });

      return { success: true };
    }),

  validateCanDelete: createFeatureRestrictedProcedure("chartOfAccounts:read")
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(accounts.id, input), eq(accounts.organizationId, orgId)) : eq(accounts.id, input);
      const account = await database
        .select()
        .from(accounts)
        .where(where)
        .limit(1);
      
      if (!account.length) {
        return { canDelete: false, reason: "Account not found" };
      }

      // Check if account is a parent account
      const childAccounts = await database
        .select()
        .from(accounts)
        .where(and(eq(accounts.parentAccountId, input), eq(accounts.isActive, 1)))
        .limit(1);
      
      if (childAccounts.length > 0) {
        return { 
          canDelete: false, 
          reason: `Cannot delete: This account has ${childAccounts.length} sub-account(s). Please move or delete sub-accounts first.` 
        };
      }

      // Check if account has non-zero balance
      if (account[0].balance !== null && account[0].balance !== 0) {
        return { 
          canDelete: false, 
          reason: `Cannot delete: Account has a balance of ${account[0].balance}. Please reconcile the balance first.` 
        };
      }

      return { canDelete: true, reason: "" };
    }),

  delete: createFeatureRestrictedProcedure("chartOfAccounts:delete")
    .input(z.object({
      id: z.string(),
      force: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      const account = await database
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.id))
        .limit(1);
      
      if (!account.length) {
        throw new Error("Account not found");
      }

      // Verify org ownership
      const orgId = ctx.user.organizationId;
      if (orgId && account[0].organizationId !== orgId) {
        throw new Error("Account not found");
      }

      // Validation checks unless force deletion is enabled
      if (!input.force) {
        // Check if account is a parent account
        const childAccounts = await database
          .select()
          .from(accounts)
          .where(and(eq(accounts.parentAccountId, input.id), eq(accounts.isActive, 1)));
        
        if (childAccounts.length > 0) {
          throw new Error(`Cannot delete: This account has ${childAccounts.length} sub-account(s). Please move or delete sub-accounts first.`);
        }

        // Check if account has non-zero balance
        if (account[0].balance !== null && account[0].balance !== 0) {
          throw new Error(`Cannot delete: Account has a balance of ${account[0].balance}. Please reconcile the balance first.`);
        }
      }

      // Soft delete
      await database.update(accounts).set({ isActive: 0 }).where(eq(accounts.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "account_deleted",
        entityType: "account",
        entityId: input.id,
        description: `Deleted account: ${account[0].accountCode} - ${account[0].accountName}${input.force ? ' (force)' : ''}`,
      });

      return { success: true };
    }),

  getSummary: createFeatureRestrictedProcedure("chartOfAccounts:read")
    .query(async () => {
      const database = await getDb();
      if (!database) return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
        totalExpenses: 0,
      };
      
      const allAccounts = await database.select().from(accounts).where(eq(accounts.isActive, 1));
      
      return {
        totalAssets: allAccounts.filter(a => a.accountType === 'asset').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalLiabilities: allAccounts.filter(a => a.accountType === 'liability').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalEquity: allAccounts.filter(a => a.accountType === 'equity').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalRevenue: allAccounts.filter(a => a.accountType === 'revenue').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalExpenses: allAccounts.filter(a => a.accountType === 'expense').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalCostOfGoodsSold: allAccounts.filter(a => a.accountType === 'cost of goods sold').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalOperatingExpense: allAccounts.filter(a => a.accountType === 'operating expense').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalCapitalExpenditure: allAccounts.filter(a => a.accountType === 'capital expenditure').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalOtherIncome: allAccounts.filter(a => a.accountType === 'other income').reduce((sum, a) => sum + (a.balance || 0), 0),
        totalOtherExpense: allAccounts.filter(a => a.accountType === 'other expense').reduce((sum, a) => sum + (a.balance || 0), 0),
      };
    }),

  getHierarchy: createFeatureRestrictedProcedure("chartOfAccounts:read")
    .query(async () => {
      const database = await getDb();
      if (!database) return [];
      
      const allAccounts = await database.select().from(accounts).where(eq(accounts.isActive, 1));
      
      // Build hierarchical structure
      const buildHierarchy = (items: any[], parentId: string | null = null): any[] => {
        return items
          .filter(item => item.parentAccountId === parentId)
          .map(item => ({
            ...item,
            children: buildHierarchy(items, item.id),
            isParent: allAccounts.some(a => a.parentAccountId === item.id),
          }))
          .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      };
      
      return buildHierarchy(allAccounts);
    }),

  updateBalance: createFeatureRestrictedProcedure("chartOfAccounts:edit")
    .input(z.object({
      accountId: z.string(),
      amount: z.number(),
      operation: z.enum(['add', 'subtract', 'set']).default('set'),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      const account = await database
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.accountId))
        .limit(1);
      
      if (!account.length) {
        throw new Error("Account not found");
      }
      
      const currentBalance = account[0].balance || 0;
      let newBalance = currentBalance;
      
      if (input.operation === 'add') {
        newBalance = currentBalance + input.amount;
      } else if (input.operation === 'subtract') {
        newBalance = currentBalance - input.amount;
      } else {
        newBalance = input.amount;
      }
      
      await database.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, input.accountId));
      
      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "account_balance_updated",
        entityType: "account",
        entityId: input.accountId,
        description: `Updated balance for ${account[0].accountCode}: ${input.operation} ${input.amount}, new balance: ${newBalance}`,
      });
      
      return { success: true, newBalance };
    }),
});

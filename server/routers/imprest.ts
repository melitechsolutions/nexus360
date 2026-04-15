import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { imprests } from "../../drizzle/schema-extended";
import { journalEntries, journalEntryLines } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createFeatureRestrictedProcedure, createRoleRestrictedProcedure } from "../middleware/enhancedRbac";

// Permission-restricted procedure instances
const viewProcedure = createFeatureRestrictedProcedure("procurement:imprest:view");
const createProcedure = createFeatureRestrictedProcedure("procurement:imprest:create");
const approveProcedure = createFeatureRestrictedProcedure("procurement:imprest:approve");
const deleteProcedure = createRoleRestrictedProcedure(["super_admin", "admin"]);

async function generateNextImprestNumber(db: any): Promise<string> {
  try {
    const result = await db.select({ num: imprests.imprestNumber })
      .from(imprests)
      .orderBy(desc(imprests.createdAt))
      .limit(1);
    let seq = 0;
    if (result && result.length > 0 && result[0].num) {
      const match = result[0].num.match(/(\d+)$/);
      if (match) seq = parseInt(match[1]);
    }
    seq++;
    return `IMP-${String(seq).padStart(6,'0')}`;
  } catch (err) {
    console.warn("imprest number generator error", err);
    return `IMP-000001`;
  }
}

export const imprestRouter = router({
  list: viewProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(imprests).orderBy(desc(imprests.createdAt));
  }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(imprests).where(eq(imprests.id, input)).limit(1);
      return rows[0] || null;
    }),

  create: createProcedure
    .input(z.object({ userId: z.string(), purpose: z.string().optional(), amount: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const id = uuidv4();
      const impNum = await generateNextImprestNumber(db);
      await db.insert(imprests).values({
        id,
        imprestNumber: impNum,
        userId: input.userId,
        purpose: input.purpose || null,
        amount: input.amount,
        status: 'requested',
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  update: createProcedure
    .input(z.object({ id: z.string(), status: z.enum(["requested","approved","rejected","settled"]).optional(), purpose: z.string().optional(), amount: z.number().positive().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const upd: any = { updatedAt: new Date().toISOString().replace('T',' ').substring(0,19) };
      if (input.status) {
        upd.status = input.status;
        // create journal entry when approved
        if (input.status === 'approved') {
          try {
            const jeId = uuidv4();
            let expenseAccountId = 'expense:unallocated';
            let payableAccountId = 'liability:accounts_payable';
            try {
              const dbHelpers = await import('../db');
              if (dbHelpers && typeof dbHelpers.getDefaultSetting === 'function') {
                try {
                  const expenseDefault = await dbHelpers.getDefaultSetting('accounting', 'defaultExpenseAccount');
                  const payableDefault = await dbHelpers.getDefaultSetting('accounting', 'accountsPayableAccount');
                  if (expenseDefault && (expenseDefault as any).value) expenseAccountId = (expenseDefault as any).value;
                  if (payableDefault && (payableDefault as any).value) payableAccountId = (payableDefault as any).value;
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore dynamic import failure
            }

            await db.insert(journalEntries).values({
              id: jeId,
              entryNumber: `JE-${Date.now()}`,
              entryDate: new Date().toISOString().replace('T',' ').substring(0,19),
              description: `Imprest approved: ${input.id}`,
              referenceType: 'imprest',
              referenceId: input.id,
              createdBy: '',
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            } as any);
            await db.insert(journalEntryLines).values({
              id: uuidv4(),
              journalEntryId: jeId,
              accountId: expenseAccountId,
              debit: input.amount || 0,
              credit: 0,
              description: `Expense for imprest ${input.id}`,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            } as any);
            await db.insert(journalEntryLines).values({
              id: uuidv4(),
              journalEntryId: jeId,
              accountId: payableAccountId,
              debit: 0,
              credit: input.amount || 0,
              description: `Accounts payable for imprest ${input.id}`,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            } as any);
          } catch (err) {
            console.warn('failed to create journal entry for imprest', err);
          }
        }
      }
      if (input.purpose !== undefined) upd.purpose = input.purpose;
      if (input.amount !== undefined) upd.amount = input.amount;
      await db.update(imprests).set(upd).where(eq(imprests.id, input.id));
      return { success: true };
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(imprests).where(eq(imprests.id, input));
      return { success: true };
    }),
});

import { z } from "zod";
import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import { journalEntries, journalEntryLines, accounts } from "../../drizzle/schema";

const readProcedure = createFeatureRestrictedProcedure("accounting:view");
const writeProcedure = createFeatureRestrictedProcedure("accounting:edit");

const lineSchema = z.object({
  accountId: z.string(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional(),
});

export const journalEntriesRouter = router({
  list: readProcedure
    .input(z.object({
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { entries: [], total: 0 };
      const filters: any[] = [];
      if (input?.search) filters.push(like(journalEntries.description, `%${input.search}%`));
      if (input?.startDate) filters.push(gte(journalEntries.entryDate, input.startDate));
      if (input?.endDate) filters.push(lte(journalEntries.entryDate, input.endDate));

      const where = filters.length > 0 ? and(...filters) : undefined;
      const rows = await db.select().from(journalEntries).where(where).orderBy(desc(journalEntries.entryDate)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
      const [countRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(journalEntries).where(where);
      return { entries: rows, total: Number(countRes?.count ?? rows.length) };
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, input)).limit(1);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Journal entry not found" });
      const lines = await db.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, input));
      return { ...entry, lines };
    }),

  create: writeProcedure
    .input(z.object({
      entryDate: z.string(),
      description: z.string().min(1),
      referenceType: z.string().optional(),
      referenceId: z.string().optional(),
      lines: z.array(lineSchema).min(2),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      // Validate debits = credits
      const totalDebit = input.lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = input.lines.reduce((s, l) => s + l.credit, 0);
      if (totalDebit !== totalCredit) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Debits (${totalDebit}) must equal credits (${totalCredit})` });
      }
      if (totalDebit === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Entry must have non-zero amounts" });
      }

      // Generate entry number
      const now = new Date();
      const prefix = `JE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [last] = await db.select({ entryNumber: journalEntries.entryNumber })
        .from(journalEntries)
        .where(like(journalEntries.entryNumber, `${prefix}%`))
        .orderBy(desc(journalEntries.entryNumber))
        .limit(1);
      const seq = last ? parseInt(last.entryNumber.slice(-4)) + 1 : 1;
      const entryNumber = `${prefix}-${String(seq).padStart(4, "0")}`;

      const entryId = `je_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const nowStr = now.toISOString().replace("T", " ").substring(0, 19);

      await db.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: input.entryDate,
        description: input.description,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        createdBy: (ctx as any).userId ?? null,
        createdAt: nowStr,
      });

      for (const line of input.lines) {
        const lineId = `jel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.insert(journalEntryLines).values({
          id: lineId,
          journalEntryId: entryId,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? null,
          createdAt: nowStr,
        });
      }

      return { success: true, id: entryId, entryNumber };
    }),

  delete: writeProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, input));
      await db.delete(journalEntries).where(eq(journalEntries.id, input));
      return { success: true };
    }),

  // General Ledger — account balances with running totals
  generalLedger: readProcedure
    .input(z.object({
      accountId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ledger: [] };

      const filters: any[] = [];
      if (input?.accountId) filters.push(eq(journalEntryLines.accountId, input.accountId));
      if (input?.startDate) filters.push(gte(journalEntries.entryDate, input.startDate));
      if (input?.endDate) filters.push(lte(journalEntries.entryDate, input.endDate));

      const where = filters.length > 0 ? and(...filters) : undefined;

      const rows = await db
        .select({
          lineId: journalEntryLines.id,
          entryId: journalEntries.id,
          entryNumber: journalEntries.entryNumber,
          entryDate: journalEntries.entryDate,
          entryDescription: journalEntries.description,
          accountId: journalEntryLines.accountId,
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
          lineDescription: journalEntryLines.description,
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(where)
        .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

      return { ledger: rows };
    }),

  // Trial balance — sum of debits/credits per account
  trialBalance: readProcedure
    .input(z.object({
      asOfDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { accounts: [], totalDebit: 0, totalCredit: 0 };

      const filters: any[] = [];
      if (input?.asOfDate) filters.push(lte(journalEntries.entryDate, input.asOfDate));
      const where = filters.length > 0 ? and(...filters) : undefined;

      const rows = await db
        .select({
          accountId: journalEntryLines.accountId,
          totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
          totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(where)
        .groupBy(journalEntryLines.accountId);

      // Fetch account names
      const allAccounts = await db.select().from(accounts);
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));

      const result = rows.map(r => ({
        accountId: r.accountId,
        accountName: accountMap.get(r.accountId)?.name ?? "Unknown",
        accountCode: accountMap.get(r.accountId)?.code ?? "",
        accountType: accountMap.get(r.accountId)?.type ?? "",
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        balance: Number(r.totalDebit) - Number(r.totalCredit),
      }));

      return {
        accounts: result,
        totalDebit: result.reduce((s, a) => s + a.totalDebit, 0),
        totalCredit: result.reduce((s, a) => s + a.totalCredit, 0),
      };
    }),

  // Account summary for dashboard
  accountSummary: readProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 };

    const allAccounts = await db.select().from(accounts);
    const balances = await db
      .select({
        accountId: journalEntryLines.accountId,
        totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .groupBy(journalEntryLines.accountId);

    const balMap = new Map(balances.map(b => [b.accountId, Number(b.totalDebit) - Number(b.totalCredit)]));
    const summary = { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 };

    for (const acct of allAccounts) {
      const bal = balMap.get(acct.id) ?? 0;
      const t = (acct.type ?? "").toLowerCase();
      if (t.includes("asset")) summary.assets += bal;
      else if (t.includes("liabilit")) summary.liabilities += Math.abs(bal);
      else if (t.includes("equity")) summary.equity += Math.abs(bal);
      else if (t.includes("revenue") || t.includes("income")) summary.revenue += Math.abs(bal);
      else if (t.includes("expense") || t.includes("cost")) summary.expenses += bal;
    }

    return summary;
  }),
});

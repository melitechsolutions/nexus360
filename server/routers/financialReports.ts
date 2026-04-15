import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { invoices } from "../../drizzle/schema";
import { expenses } from "../../drizzle/schema";
import { accounts } from "../../drizzle/schema";
import { and, gte, lte, ne } from "drizzle-orm";

export const financialReportsRouter = router({
  profitLoss: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { revenue: 0, expenses: 0, netProfit: 0, netMarginPercentage: 0 };

      const start = new Date(input.startDate).toISOString().replace('T', ' ').substring(0, 19);
      const end = new Date(input.endDate).toISOString().replace('T', ' ').substring(0, 19);

      // revenue is recognized when invoice is issued (exclude cancelled)
      const revRows: Array<{ amt: number }> = await db
        .select({ amt: invoices.total })
        .from(invoices)
        .where(
          and(
            gte(invoices.issueDate, start),
            lte(invoices.issueDate, end),
            ne(invoices.status, "cancelled")
          )
        );
      const revenue = revRows.reduce((sum, r) => sum + (r.amt || 0), 0);

      // expenses incurred in range (exclude cancelled)
      const expRows: Array<{ amt: number }> = await db
        .select({ amt: expenses.amount })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, start),
            lte(expenses.expenseDate, end),
            ne(expenses.status, "cancelled")
          )
        );
      const expensesSum = expRows.reduce((sum, r) => sum + (r.amt || 0), 0);

      const netProfit = revenue - expensesSum;
      const netMarginPercentage = revenue === 0 ? 0 : (netProfit / revenue) * 100;

      return { revenue, expenses: expensesSum, netProfit, netMarginPercentage };
    }),

  balanceSheet: createFeatureRestrictedProcedure("reporting:view").query(async () => {
    const db = await getDb();
    if (!db) return {};

    const rows: Array<{ type: string; balance: number }> = await db
      .select({ type: accounts.accountType, balance: accounts.balance })
      .from(accounts);

    const summary: Record<string, number> = {};
    rows.forEach((r) => {
      if (!summary[r.type]) summary[r.type] = 0;
      summary[r.type] += r.balance || 0;
    });

    return summary;
  }),
});

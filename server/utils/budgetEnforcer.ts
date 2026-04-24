/**
 * Budget Enforcement & COA Update Utility
 *
 * Provides shared helpers for:
 * - Checking budget availability before a transaction
 * - Deducting from budget remaining/totalActual after approval
 * - Restoring budget on cancellation/rejection
 * - Updating Chart of Accounts balance (debit / credit)
 */

import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import { budgets, accounts, departments } from "../../drizzle/schema";

export type COADirection = "debit" | "credit";

/**
 * Account types that INCREASE on debit (assets, expenses) vs credit (liabilities, equity, revenue).
 * For expense/purchase flows we always DEBIT the expense account and CREDIT cash/payable.
 */
const DEBIT_NORMAL_TYPES = new Set([
  "asset",
  "expense",
  "cost of goods sold",
  "operating expense",
  "capital expenditure",
  "other expense",
]);

// ─── COA helpers ──────────────────────────────────────────────────────────────

/**
 * Update a COA account's balance by accountId (string uuid).
 * direction='debit'  → increases asset/expense accounts, decreases liabilities/equity/revenue
 * direction='credit' → opposite
 * reverse=true       → undo a previous debit/credit (e.g. on cancellation)
 */
export async function updateCOAByAccountId(
  database: any,
  accountId: string | null | undefined,
  amountCents: number,
  direction: COADirection,
  reverse = false
): Promise<void> {
  if (!accountId || amountCents === 0) return;

  try {
    const rows = await database
      .select({ id: accounts.id, accountType: accounts.accountType, balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!rows.length) return;

    const acct = rows[0];
    const isDebitNormal = DEBIT_NORMAL_TYPES.has(acct.accountType);

    // Determine whether balance goes up or down
    let delta: number;
    if (direction === "debit") {
      delta = isDebitNormal ? amountCents : -amountCents;
    } else {
      delta = isDebitNormal ? -amountCents : amountCents;
    }
    if (reverse) delta = -delta;

    const newBalance = (acct.balance ?? 0) + delta;
    await database
      .update(accounts)
      .set({ balance: newBalance, updatedAt: now() })
      .where(eq(accounts.id, accountId));
  } catch (err) {
    console.error("[budgetEnforcer] updateCOAByAccountId error:", err);
  }
}

/**
 * Update a COA account's balance by legacy numeric chartOfAccountId.
 * Kept for backward compat with expenses.ts.
 */
export async function updateCOAByNumericId(
  database: any,
  chartOfAccountId: number | null | undefined,
  amountCents: number,
  operation: "add" | "subtract"
): Promise<void> {
  if (!chartOfAccountId || amountCents === 0) return;

  try {
    const rows = await database
      .select({ id: accounts.id, balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.id, chartOfAccountId.toString()))
      .limit(1);

    if (!rows.length) return;
    const current = rows[0].balance ?? 0;
    const newBalance = operation === "add" ? current + amountCents : current - amountCents;
    await database
      .update(accounts)
      .set({ balance: newBalance })
      .where(eq(accounts.id, chartOfAccountId.toString()));
  } catch (err) {
    console.error("[budgetEnforcer] updateCOAByNumericId error:", err);
  }
}

// ─── Budget helpers ────────────────────────────────────────────────────────────

export interface BudgetCheckResult {
  budgetId: string;
  budgetName: string;
  remaining: number;      // cents
  allocated: number;      // cents (amount field)
  totalActual: number;    // cents
}

/**
 * Resolve the best matching active budget for an org + optional departmentId.
 * Returns null when no active budget found (no block – caller decides).
 */
export async function findActiveBudget(
  database: any,
  orgId: string | null | undefined,
  departmentId?: string | null,
  fiscalYear?: number
): Promise<BudgetCheckResult | null> {
  try {
    const year = fiscalYear ?? new Date().getFullYear();
    const conditions: any[] = [eq(budgets.fiscalYear, year)];
    if (orgId) conditions.push(eq(budgets.organizationId, orgId));
    if (departmentId) conditions.push(eq(budgets.departmentId, departmentId));

    // Prefer active, then draft
    const rows = await database
      .select()
      .from(budgets)
      .where(and(...conditions))
      .limit(10);

    if (!rows.length) return null;

    // Prefer active over draft
    const active = rows.find((b: any) => b.budgetStatus === "active");
    const best = active ?? rows[0];

    return {
      budgetId: best.id,
      budgetName: best.budgetName || `Budget FY${year}`,
      remaining: best.remaining ?? (best.amount - (best.totalActual ?? 0)),
      allocated: best.amount,
      totalActual: best.totalActual ?? 0,
    };
  } catch (err) {
    console.error("[budgetEnforcer] findActiveBudget error:", err);
    return null;
  }
}

/**
 * Check whether a budget can absorb `amountCents`.
 * Throws TRPC BAD_REQUEST with code BUDGET_DEPLETED when insufficient.
 * Returns the matched budget info.
 */
export async function checkBudget(
  database: any,
  amountCents: number,
  orgId: string | null | undefined,
  options?: {
    budgetId?: string;          // explicit budget to check
    departmentId?: string | null;
    fiscalYear?: number;
    label?: string;             // e.g. "LPO-000012"
  }
): Promise<BudgetCheckResult | null> {
  let budget: BudgetCheckResult | null = null;

  if (options?.budgetId) {
    // Explicit budget lookup
    try {
      const rows = await database
        .select()
        .from(budgets)
        .where(eq(budgets.id, options.budgetId))
        .limit(1);

      if (rows.length) {
        const b = rows[0];
        budget = {
          budgetId: b.id,
          budgetName: b.budgetName || `Budget ${b.id}`,
          remaining: b.remaining ?? (b.amount - (b.totalActual ?? 0)),
          allocated: b.amount,
          totalActual: b.totalActual ?? 0,
        };
      }
    } catch (err) {
      console.error("[budgetEnforcer] explicit budget lookup error:", err);
    }
  } else {
    budget = await findActiveBudget(database, orgId, options?.departmentId, options?.fiscalYear);
  }

  if (!budget) return null; // No budget configured — allow through (no block)

  if (budget.remaining < amountCents) {
    const label = options?.label ? ` for ${options.label}` : "";
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: JSON.stringify({
        code: "BUDGET_DEPLETED",
        budgetName: budget.budgetName,
        requested: amountCents,
        remaining: budget.remaining,
        message: `Budget "${budget.budgetName}" is insufficient${label}. Requested: Ksh ${(amountCents / 100).toLocaleString("en-KE")}, Available: Ksh ${(budget.remaining / 100).toLocaleString("en-KE")}.`,
      }),
    });
  }

  return budget;
}

/**
 * Deduct amountCents from a budget (increase totalActual, decrease remaining).
 * Call AFTER the transaction record is created (on success path).
 */
export async function deductFromBudget(
  database: any,
  budgetId: string,
  amountCents: number
): Promise<void> {
  try {
    const rows = await database
      .select({ remaining: budgets.remaining, totalActual: budgets.totalActual, amount: budgets.amount })
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1);

    if (!rows.length) return;

    const b = rows[0];
    const newTotalActual = (b.totalActual ?? 0) + amountCents;
    const newRemaining = b.amount - newTotalActual;

    await database
      .update(budgets)
      .set({
        totalActual: newTotalActual,
        remaining: Math.max(0, newRemaining),
        budgetStatus: newRemaining <= 0 ? "closed" : b.budgetStatus ?? "active",
        updatedAt: now(),
      })
      .where(eq(budgets.id, budgetId));
  } catch (err) {
    console.error("[budgetEnforcer] deductFromBudget error:", err);
  }
}

/**
 * Restore amountCents to a budget (decrease totalActual, increase remaining).
 * Call on cancellation / rejection of a transaction.
 */
export async function restoreBudget(
  database: any,
  budgetId: string,
  amountCents: number
): Promise<void> {
  try {
    const rows = await database
      .select({ remaining: budgets.remaining, totalActual: budgets.totalActual, amount: budgets.amount, budgetStatus: budgets.budgetStatus })
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1);

    if (!rows.length) return;

    const b = rows[0];
    const newTotalActual = Math.max(0, (b.totalActual ?? 0) - amountCents);
    const newRemaining = b.amount - newTotalActual;

    await database
      .update(budgets)
      .set({
        totalActual: newTotalActual,
        remaining: newRemaining,
        // Re-open if it was closed due to depletion
        budgetStatus: b.budgetStatus === "closed" && newRemaining > 0 ? "active" : b.budgetStatus,
        updatedAt: now(),
      })
      .where(eq(budgets.id, budgetId));
  } catch (err) {
    console.error("[budgetEnforcer] restoreBudget error:", err);
  }
}

// ─── Convenience ──────────────────────────────────────────────────────────────

/**
 * Full budget+COA transaction helper.
 * 1. Check budget has enough remaining
 * 2. Deduct from budget
 * 3. Debit the expense COA account
 * 4. Credit the cash/payable COA account
 *
 * Returns the matched budgetId or null.
 */
export async function applyBudgetTransaction(
  database: any,
  opts: {
    amountCents: number;
    orgId: string | null | undefined;
    budgetId?: string | null;
    departmentId?: string | null;
    fiscalYear?: number;
    expenseAccountId?: string | null;   // COA account to debit
    cashOrPayableAccountId?: string | null; // COA account to credit
    label?: string;
  }
): Promise<string | null> {
  const budget = await checkBudget(database, opts.amountCents, opts.orgId, {
    budgetId: opts.budgetId ?? undefined,
    departmentId: opts.departmentId,
    fiscalYear: opts.fiscalYear,
    label: opts.label,
  });

  if (budget) {
    await deductFromBudget(database, budget.budgetId, opts.amountCents);
  }

  // COA: debit expense account
  if (opts.expenseAccountId) {
    await updateCOAByAccountId(database, opts.expenseAccountId, opts.amountCents, "debit");
  }
  // COA: credit cash/payable account
  if (opts.cashOrPayableAccountId) {
    await updateCOAByAccountId(database, opts.cashOrPayableAccountId, opts.amountCents, "credit");
  }

  return budget?.budgetId ?? null;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

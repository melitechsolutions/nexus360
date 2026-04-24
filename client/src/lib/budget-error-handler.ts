import { toast } from "sonner";

interface BudgetDepletedPayload {
  code: "BUDGET_DEPLETED";
  budgetName: string;
  requested: number;
  remaining: number;
  message: string;
}

/**
 * Call this in any mutation's onError to surface budget depletion as a
 * user-friendly toast notification.
 *
 * Returns `true` when the error was a BUDGET_DEPLETED error (so you can
 * skip generic error handling), `false` otherwise.
 *
 * Usage:
 *   const mutation = trpc.expense.create.useMutation({
 *     onError(err) {
 *       if (handleBudgetError(err)) return;
 *       toast.error(err.message);
 *     },
 *   });
 */
export function handleBudgetError(error: { message?: string; data?: { code?: string } }): boolean {
  if (!error?.message) return false;
  try {
    const parsed: BudgetDepletedPayload = JSON.parse(error.message);
    if (parsed?.code === "BUDGET_DEPLETED") {
      const requestedStr = (parsed.requested / 100).toLocaleString("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 2,
      });
      const remainingStr = (parsed.remaining / 100).toLocaleString("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 2,
      });
      toast.error(`Budget Depleted: ${parsed.budgetName}`, {
        description: `Requested ${requestedStr} but only ${remainingStr} remains.`,
        duration: 7000,
      });
      return true;
    }
  } catch {
    // Not a JSON error — fall through
  }
  return false;
}

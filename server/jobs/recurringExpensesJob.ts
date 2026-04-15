/**
 * Scheduled Job: Generate Due Recurring Expenses
 * 
 * This job runs periodically to check for recurring expenses that are due
 * and automatically generates new expense records from them.
 * 
 * Should be called at least once daily, preferably during off-peak hours.
 */

import { getDb } from "../db";
import { expenses, recurringExpenses, activityLog } from "../../drizzle/schema";
import { eq, lte, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface GenerateRecurringExpensesResult {
  success: boolean;
  expensesGenerated: number;
  expenseIds: string[];
  errors: string[];
  message: string;
  itemsProcessed: number;
  itemsFailed: number;
}

/**
 * Generate next expense number (EXP-XXXXXX)
 */
async function generateNextExpenseNumber(db: any): Promise<string> {
  try {
    const result = await db.select({ expNum: expenses.expenseNumber })
      .from(expenses)
      .orderBy(desc(expenses.expenseNumber))
      .limit(1000);

    let maxSequence = 0;
    for (const rec of result) {
      if (rec.expNum) {
        const match = rec.expNum.match(/(\d+)$/);
        if (match) {
          const seq = parseInt(match[1]);
          if (seq > maxSequence) maxSequence = seq;
        }
      }
    }

    const nextSequence = maxSequence + 1;
    return `EXP-${String(nextSequence).padStart(6, '0')}`;
  } catch (err) {
    console.warn("[RECURRING_EXPENSES] Error generating expense number:", err);
    return `EXP-${Date.now()}`;
  }
}

/**
 * Calculate next due date based on frequency
 */
function calculateNextDueDate(currentDueDate: string, frequency: string, dayOfMonth?: number | null): Date {
  const current = new Date(currentDueDate);
  
  switch (frequency) {
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      current.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      if (dayOfMonth) {
        const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    case 'quarterly':
      current.setMonth(current.getMonth() + 3);
      if (dayOfMonth) {
        const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    case 'annually':
      current.setFullYear(current.getFullYear() + 1);
      break;
    default:
      current.setMonth(current.getMonth() + 1);
  }
  
  return current;
}

/**
 * Generate expenses for all due recurring patterns
 */
export async function generateDueRecurringExpenses(): Promise<GenerateRecurringExpensesResult> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      expensesGenerated: 0,
      expenseIds: [],
      errors: ["Database not available"],
      message: "Failed: Database connection unavailable",
      itemsProcessed: 0,
      itemsFailed: 0,
    };
  }

  const errors: string[] = [];
  const generatedExpenseIds: string[] = [];

  try {
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const systemUserId = "system-job";

    // Get all active recurring expenses with nextDueDate <= now
    const duePatterns = await db.select()
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.isActive, 1),
          lte(recurringExpenses.nextDueDate, nowStr)
        )
      );

    console.log(`[RECURRING_EXPENSES] Found ${duePatterns.length} due patterns to process`);

    for (const pattern of duePatterns) {
      try {
        // Check if pattern has ended
        if (pattern.endDate && pattern.endDate < nowStr) {
          await db.update(recurringExpenses)
            .set({ isActive: 0, updatedAt: nowStr } as any)
            .where(eq(recurringExpenses.id, pattern.id));
          console.log(`[RECURRING_EXPENSES] Marked pattern ${pattern.id} as inactive (ended)`);
          continue;
        }

        // Generate a new expense
        const newExpenseId = uuidv4();
        const expenseNumber = await generateNextExpenseNumber(db);

        await db.insert(expenses).values({
          id: newExpenseId,
          organizationId: pattern.organizationId,
          expenseNumber,
          category: pattern.category,
          vendor: pattern.vendor,
          amount: pattern.amount,
          expenseDate: nowStr,
          paymentMethod: pattern.paymentMethod,
          description: pattern.description
            ? `${pattern.description} (Auto-generated)`
            : `Recurring ${pattern.category} expense (Auto-generated)`,
          chartOfAccountId: pattern.chartOfAccountId,
          status: 'pending',
          createdBy: systemUserId,
          createdAt: nowStr as any,
          updatedAt: nowStr as any,
        } as any);

        generatedExpenseIds.push(newExpenseId);

        // Calculate next due date
        const nextDueDate = calculateNextDueDate(
          pattern.nextDueDate,
          pattern.frequency,
          pattern.dayOfMonth,
        );

        // Update recurring pattern
        await db.update(recurringExpenses)
          .set({
            nextDueDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
            lastGeneratedDate: nowStr,
            updatedAt: nowStr,
          } as any)
          .where(eq(recurringExpenses.id, pattern.id));

        // Log activity
        try {
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: systemUserId,
            action: "recurring_expense_generated",
            entityType: "expense",
            entityId: newExpenseId,
            description: `Auto-generated expense ${expenseNumber} from recurring pattern ${pattern.id} (${pattern.category})`,
          } as any);
        } catch (err) {
          console.warn("[RECURRING_EXPENSES] Could not log activity:", err);
        }

        console.log(`[RECURRING_EXPENSES] Generated expense ${expenseNumber} for pattern ${pattern.id}`);

      } catch (error) {
        const errorMsg = `Error generating expense for pattern ${pattern.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[RECURRING_EXPENSES] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }
    }

    const success = errors.length === 0;
    const message = success
      ? `Successfully generated ${generatedExpenseIds.length} expense(s)`
      : `Generated ${generatedExpenseIds.length} expense(s) with ${errors.length} error(s)`;

    console.log(`[RECURRING_EXPENSES] Job completed: ${message}`);

    return {
      success,
      expensesGenerated: generatedExpenseIds.length,
      expenseIds: generatedExpenseIds,
      errors,
      message,
      itemsProcessed: duePatterns.length,
      itemsFailed: errors.length,
    };
  } catch (error) {
    const errorMsg = `Fatal error in recurring expenses job: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[RECURRING_EXPENSES] ${errorMsg}`);
    return {
      success: false,
      expensesGenerated: generatedExpenseIds.length,
      expenseIds: generatedExpenseIds,
      errors: [errorMsg],
      message: errorMsg,
      itemsProcessed: 0,
      itemsFailed: 1,
    };
  }
}

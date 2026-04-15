/**
 * Scheduled Job: Mark Overdue Invoices
 * 
 * This job runs daily to check for invoices past their due date
 * and automatically marks them as overdue. Also sends notifications
 * for newly overdue invoices.
 */

import { getDb } from "../db";
import { invoices, activityLog } from "../../drizzle/schema";
import { eq, lt, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface OverdueCheckResult {
  success: boolean;
  invoicesMarked: number;
  invoiceIds: string[];
  errors: string[];
  message: string;
  itemsProcessed: number;
  itemsFailed: number;
}

/**
 * Find and mark overdue invoices
 */
export async function markOverdueInvoices(): Promise<OverdueCheckResult> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      invoicesMarked: 0,
      invoiceIds: [],
      errors: ["Database not available"],
      message: "Failed: Database connection unavailable",
      itemsProcessed: 0,
      itemsFailed: 0,
    };
  }

  const errors: string[] = [];
  const markedIds: string[] = [];

  try {
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const systemUserId = "system-job";

    // Find invoices that are past due date and still in sent/partial status
    const overdueInvoices = await db.select()
      .from(invoices)
      .where(
        and(
          lt(invoices.dueDate, nowStr),
          inArray(invoices.status, ['sent', 'partial'])
        )
      );

    console.log(`[OVERDUE_INVOICES] Found ${overdueInvoices.length} invoices to mark as overdue`);

    for (const invoice of overdueInvoices) {
      try {
        await db.update(invoices)
          .set({
            status: 'overdue',
            updatedAt: nowStr,
          } as any)
          .where(eq(invoices.id, invoice.id));

        markedIds.push(invoice.id);

        // Log activity
        try {
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: systemUserId,
            action: "invoice_marked_overdue",
            entityType: "invoice",
            entityId: invoice.id,
            description: `Invoice ${invoice.invoiceNumber} automatically marked as overdue (due: ${invoice.dueDate})`,
          } as any);
        } catch (err) {
          console.warn("[OVERDUE_INVOICES] Could not log activity:", err);
        }

        console.log(`[OVERDUE_INVOICES] Marked invoice ${invoice.invoiceNumber} as overdue`);
      } catch (error) {
        const errorMsg = `Error marking invoice ${invoice.id} as overdue: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[OVERDUE_INVOICES] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const success = errors.length === 0;
    const message = success
      ? `Marked ${markedIds.length} invoice(s) as overdue`
      : `Marked ${markedIds.length} invoice(s) with ${errors.length} error(s)`;

    console.log(`[OVERDUE_INVOICES] Job completed: ${message}`);

    return {
      success,
      invoicesMarked: markedIds.length,
      invoiceIds: markedIds,
      errors,
      message,
      itemsProcessed: overdueInvoices.length,
      itemsFailed: errors.length,
    };
  } catch (error) {
    const errorMsg = `Fatal error in overdue invoices job: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[OVERDUE_INVOICES] ${errorMsg}`);
    return {
      success: false,
      invoicesMarked: 0,
      invoiceIds: [],
      errors: [errorMsg],
      message: errorMsg,
      itemsProcessed: 0,
      itemsFailed: 1,
    };
  }
}

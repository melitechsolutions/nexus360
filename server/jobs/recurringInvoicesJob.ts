/**
 * Scheduled Job: Generate Due Recurring Invoices
 * 
 * This job runs periodically to check for recurring invoices that are due
 * and automatically generates new invoices from them.
 * 
 * Should be called at least once daily, preferably during off-peak hours
 */

import { getDb } from "../db";
import { invoices, recurringInvoices, invoiceItems, activityLog } from "../../drizzle/schema";
import { eq, lte, isNull, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { applyRecurringLabel } from "../utils/recurringLabels";

export interface GenerateRecurringResult {
  success: boolean;
  invoicesGenerated: number;
  invoiceIds: string[];
  errors: string[];
  message: string;
}

/**
 * Generate invoices for all due recurring patterns
 */
export async function generateDueRecurringInvoices(): Promise<GenerateRecurringResult> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      invoicesGenerated: 0,
      invoiceIds: [],
      errors: ["Database not available"],
      message: "Failed: Database connection unavailable",
    };
  }

  const errors: string[] = [];
  const generatedInvoiceIds: string[] = [];

  try {
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const systemUserId = "system-job";

    // Get all active recurring invoices with nextDueDate <= now
    const duePatterns = await db.select()
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.isActive, 1),
          lte(recurringInvoices.nextDueDate, nowStr)
        )
      );

    console.log(`[RECURRING_INVOICES] Found ${duePatterns.length} due patterns to process`);

    for (const pattern of duePatterns) {
      try {
        // Check if pattern has ended
        if (pattern.endDate && pattern.endDate < nowStr) {
          // Mark as inactive
          await db.update(recurringInvoices)
            .set({ isActive: 0, updatedAt: nowStr })
            .where(eq(recurringInvoices.id, pattern.id));
          console.log(`[RECURRING_INVOICES] Marked pattern ${pattern.id} as inactive (ended)`);
          continue;
        }

        // Get template invoice if it exists
        let templateData: any = null;
        if (pattern.templateInvoiceId) {
          const template = await db.select()
            .from(invoices)
            .where(eq(invoices.id, pattern.templateInvoiceId))
            .limit(1);
          if (template.length > 0) {
            templateData = template[0];
          }
        }

        // Helper to generate next invoice number
        async function generateNextInvoiceNumber(): Promise<string> {
          try {
            const result = await db.select({ invNum: invoices.invoiceNumber })
              .from(invoices)
              .orderBy(invoices.invoiceNumber)
              .limit(1000); // Get last 1000 to find max

            let maxSequence = 0;
            for (const rec of result) {
              if (rec.invNum) {
                const match = rec.invNum.match(/(\d+)$/);
                if (match) {
                  const seq = parseInt(match[1]);
                  if (seq > maxSequence) maxSequence = seq;
                }
              }
            }

            const nextSequence = maxSequence + 1;
            return `INV-${String(nextSequence).padStart(6, '0')}`;
          } catch (err) {
            console.warn("Error generating invoice number:", err);
            return `INV-${Date.now()}`;
          }
        }

        // Create new invoice from template
        const newInvoiceId = uuidv4();
        const newInvoiceNumber = await generateNextInvoiceNumber();

        const issueDate = now.toISOString().replace('T', ' ').substring(0, 19);
        const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const dueDateStr = dueDate.toISOString().replace('T', ' ').substring(0, 19);

        // Apply auto-labeling with month/year
        const baseTitle = templateData?.title || `Invoice for ${pattern.clientId}`;
        const baseNotes = pattern.noteToInvoice || templateData?.notes || "";
        const { title: labeledTitle, notes: labeledNotes } = applyRecurringLabel(
          baseTitle,
          baseNotes,
          pattern.noteToInvoice,
          now
        );

        const newInvoiceValues: any = {
          id: newInvoiceId,
          invoiceNumber: newInvoiceNumber,
          invoiceSequence: parseInt(newInvoiceNumber.replace('INV-', '')) || 0,
          clientId: pattern.clientId,
          title: labeledTitle,
          status: "draft",
          issueDate,
          dueDate: dueDateStr,
          subtotal: templateData?.subtotal || 0,
          taxAmount: templateData?.taxAmount || 0,
          discountAmount: templateData?.discountAmount || 0,
          total: templateData?.total || 0,
          paidAmount: 0,
          notes: labeledNotes,
          terms: templateData?.terms || null,
          createdBy: systemUserId,
          createdAt: nowStr,
          updatedAt: nowStr,
        };

        await db.insert(invoices).values(newInvoiceValues);
        generatedInvoiceIds.push(newInvoiceId);

        // Copy line items if template exists
        if (pattern.templateInvoiceId && templateData) {
          try {
            const templateItems = await db.select()
              .from(invoiceItems)
              .where(eq(invoiceItems.invoiceId, pattern.templateInvoiceId));

            for (const item of templateItems) {
              await db.insert(invoiceItems).values({
                id: uuidv4(),
                invoiceId: newInvoiceId,
                itemType: item.itemType,
                itemId: item.itemId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
                taxRate: item.taxRate,
                discountPercent: item.discountPercent,
                createdAt: nowStr,
              });
            }
          } catch (err) {
            console.warn(`[RECURRING_INVOICES] Could not copy line items for ${newInvoiceId}:`, err);
          }
        }

        // Calculate next due date
        const nextDueDate = new Date(pattern.nextDueDate);
        const frequencyDays = {
          weekly: 7,
          biweekly: 14,
          monthly: 30,
          quarterly: 90,
          annually: 365,
        };

        const daysToAdd = frequencyDays[pattern.frequency as keyof typeof frequencyDays] || 30;
        nextDueDate.setDate(nextDueDate.getDate() + daysToAdd);

        // Update pattern with next due date
        await db.update(recurringInvoices)
          .set({
            nextDueDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
            lastGeneratedDate: nowStr,
            updatedAt: nowStr,
          })
          .where(eq(recurringInvoices.id, pattern.id));

        // Log activity
        try {
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: systemUserId,
            action: "recurring_invoice_generated",
            entityType: "invoice",
            entityId: newInvoiceId,
            description: `Auto-generated invoice ${newInvoiceNumber} from recurring pattern ${pattern.id}`,
          });
        } catch (err) {
          console.warn("Could not log activity:", err);
        }

        console.log(`[RECURRING_INVOICES] Generated invoice ${newInvoiceNumber} for pattern ${pattern.id}`);

      } catch (error) {
        const errorMsg = `Error generating invoice for pattern ${pattern.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[RECURRING_INVOICES] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }
    }

    const success = errors.length === 0;
    const message = success
      ? `Successfully generated ${generatedInvoiceIds.length} invoice(s)`
      : `Generated ${generatedInvoiceIds.length} invoice(s) with ${errors.length} error(s)`;

    console.log(`[RECURRING_INVOICES] Job completed: ${message}`);

    return {
      success,
      invoicesGenerated: generatedInvoiceIds.length,
      invoiceIds: generatedInvoiceIds,
      errors,
      message,
    };

  } catch (error) {
    const errorMsg = `Fatal error in recurring invoices job: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[RECURRING_INVOICES] ${errorMsg}`);
    return {
      success: false,
      invoicesGenerated: 0,
      invoiceIds: generatedInvoiceIds,
      errors: [...errors, errorMsg],
      message: "Job failed with errors",
    };
  }
}

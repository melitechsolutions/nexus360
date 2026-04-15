import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import { queueEmail } from "./emailQueue";
import { differenceInDays } from "date-fns";
import { triggerEventNotification } from "./emailNotifications";

const readProcedure = createFeatureRestrictedProcedure("accounting:payments:view");
const writeProcedure = createFeatureRestrictedProcedure("tools:automation");

/**
 * Get overdue invoices for a client
 */
export async function getOverdueInvoices(options?: {
  clientId?: string;
  daysOverdue?: number; // Only invoices overdue by at least this many days
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.collection("invoices")
      .where("status", "in", ["overdue", "sent"])
      .where("dueDate", "<", new Date().toISOString().replace('T', ' ').substring(0, 19))
      .where("paidAmount", "<", db.raw("total"));

    if (options?.clientId) {
      query = query.where("clientId", "==", options.clientId);
    }

    const invoices = await query.get();
    let results = invoices.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (options?.daysOverdue || options?.daysOverdue === 0) {
      results = results.filter(invoice => {
        const daysLate = differenceInDays(new Date(), new Date(invoice.dueDate));
        return daysLate >= (options.daysOverdue || 1);
      });
    }

    return results;
  } catch (error) {
    console.error("[OVERDUE REMINDERS] Error getting overdue invoices:", error);
    return [];
  }
}

/**
 * Check if reminder was already sent for this invoice/type combination
 */
export async function hasReminderBeenSent(
  invoiceId: string,
  reminderType: "overdue_1day" | "overdue_3days" | "overdue_7days" | "overdue_14days" | "overdue_30days"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const reminders = await db.queryInvoiceReminders(invoiceId, reminderType);
    return reminders.length > 0;
  } catch (error) {
    console.error("[OVERDUE REMINDERS] Error checking reminder history:", error);
    return false;
  }
}

/**
 * Record that a reminder was sent
 */
export async function recordReminderSent(
  invoiceId: string,
  reminderType: string,
  clientEmail: string,
  userId?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insertInvoiceReminder({
      id: uuidv4(),
      invoiceId,
      reminderType: reminderType as any,
      clientEmail,
      sentBy: userId,
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  } catch (error) {
    console.error("[OVERDUE REMINDERS] Error recording reminder:", error);
  }
}

/**
 * Generate overdue reminder email template
 */
function generateOverdueReminderTemplate(input: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  dueDate: string;
  link: string;
  appName?: string;
  currency?: string;
}): { html: string; text: string } {
  const appName = input.appName || 'CRM';
  const cur = input.currency || 'KES';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">Payment Reminder - Invoice Overdue</h2>
      
      <p>Dear ${input.clientName},</p>
      
      <p style="color: #333;">
        This invoice is now <strong style="color: #d32f2f;">${input.daysOverdue} days overdue</strong>.
      </p>
      
      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${input.invoiceNumber}</p>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> ${cur} ${input.amount.toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Original Due Date:</strong> ${new Date(input.dueDate).toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Days Overdue:</strong> ${input.daysOverdue}</p>
      </div>
      
      <p>Please arrange payment at your earliest convenience. If you have already sent the payment, please disregard this notice.</p>
      
      <p style="margin-bottom: 30px;">
        <a href="${input.link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Pay Invoice
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        ${appName} - Financial Management System<br>
        This is an automated reminder. Please do not reply to this email.
      </p>
    </div>
  `;

  const text = `
Payment Reminder - Invoice Overdue

Dear ${input.clientName},

This invoice is now ${input.daysOverdue} days overdue.

Invoice #: ${input.invoiceNumber}
Amount Due: ${cur} ${input.amount.toLocaleString()}
Original Due Date: ${new Date(input.dueDate).toLocaleDateString()}
Days Overdue: ${input.daysOverdue}

Please arrange payment at your earliest convenience. If you have already sent the payment, please disregard this notice.

View Invoice: ${input.link}

---
${appName} - Financial Management System
This is an automated reminder. Please do not reply to this email.
  `;

  return { html, text };
}

/**
 * Send overdue reminders based on configured schedule
 * 1 day late, 3 days late, 7 days late, 14 days late, 30 days late
 */
export async function sendOverdueReminders() {
  const db = await getDb();
  if (!db) {
    console.error("[OVERDUE REMINDERS] Database not available");
    return { sent: 0, skipped: 0, errors: 0 };
  }

  // Fetch company name and currency from settings
  let appName = 'CRM';
  let cur = 'KES';
  const baseUrl = process.env.APP_URL || '';
  try {
    const { getCompanyInfo } = await import('../utils/company-info');
    const info = await getCompanyInfo();
    if (info.name) appName = info.name;
    if (info.currency) cur = info.currency;
  } catch {}

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Get all invoices that are overdue
    const allInvoices = await getOverdueInvoices();

    for (const invoice of allInvoices) {
      try {
        const daysOverdue = differenceInDays(new Date(), new Date(invoice.dueDate));

        // Determine which reminder tiers apply
        const remindersToSend: { type: string; days: number }[] = [];
        if (daysOverdue >= 1) remindersToSend.push({ type: "overdue_1day", days: 1 });
        if (daysOverdue >= 3) remindersToSend.push({ type: "overdue_3days", days: 3 });
        if (daysOverdue >= 7) remindersToSend.push({ type: "overdue_7days", days: 7 });
        if (daysOverdue >= 14) remindersToSend.push({ type: "overdue_14days", days: 14 });
        if (daysOverdue >= 30) remindersToSend.push({ type: "overdue_30days", days: 30 });

        // Get invoice client for email
        const client = await db.getClient(invoice.clientId);
        if (!client?.email) {
          console.warn(`[OVERDUE REMINDERS] No email for client ${invoice.clientId}`);
          skipped++;
          continue;
        }

        // Send each applicable reminder (that hasn't been sent yet)
        for (const reminder of remindersToSend) {
          const alreadySent = await hasReminderBeenSent(invoice.id, reminder.type as any);
          if (alreadySent) {
            console.log(`[OVERDUE REMINDERS] Reminder ${reminder.type} already sent for invoice ${invoice.id}`);
            skipped++;
            continue;
          }

          // Generate email
          const { html, text } = generateOverdueReminderTemplate({
            clientName: client.companyName,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.total - invoice.paidAmount,
            daysOverdue,
            dueDate: invoice.dueDate,
            link: `${baseUrl}/invoices/${invoice.id}`,
            appName,
            currency: cur,
          });

          // Queue email (use queueEmail for better reliability)
          const queueResult = await queueEmail({
            recipientEmail: client.email,
            recipientName: client.companyName,
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
            htmlContent: html,
            textContent: text,
            eventType: "invoice_overdue",
            entityType: "invoice",
            entityId: invoice.id,
            metadata: {
              reminderType: reminder.type,
              daysOverdue,
              amountDue: invoice.total - invoice.paidAmount,
            },
          });

          if (queueResult.success) {
            // Record that this reminder was sent
            await recordReminderSent(invoice.id, reminder.type, client.email);
            console.log(
              `[OVERDUE REMINDERS] Queued ${reminder.type} reminder for invoice ${invoice.invoiceNumber}`
            );
            sent++;
          } else {
            console.error(
              `[OVERDUE REMINDERS] Failed to queue reminder for invoice ${invoice.id}:`,
              queueResult.error
            );
            errors++;
          }
        }
      } catch (error) {
        console.error(`[OVERDUE REMINDERS] Error processing invoice ${invoice.id}:`, error);
        errors++;
      }
    }

    console.log(`[OVERDUE REMINDERS] Processed ${allInvoices.length} invoices - Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
    return { sent, skipped, errors };
  } catch (error) {
    console.error("[OVERDUE REMINDERS] Error sending overdue reminders:", error);
    return { sent: 0, skipped: 0, errors: allInvoices.length };
  }
}

export const paymentRemindersRouter = router({
  /**
   * Get overdue invoices for current user's clients
   */
  getOverdueInvoices: readProcedure
    .input(
      z.object({
        daysOverdue: z.number().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { invoices: [], total: 0 };

      try {
        // Get invoices for this user's assigned clients
        const invoices = await db.getOverdueInvoicesByUser(ctx.user?.id || "", input.daysOverdue, input.limit);
        return { invoices, total: invoices.length };
      } catch (error) {
        console.error("[PAYMENT REMINDERS] Error getting overdue invoices:", error);
        return { invoices: [], total: 0 };
      }
    }),

  /**
   * Send overdue reminder for specific invoice
   */
  sendReminder: writeProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        reminderType: z.enum(["overdue_1day", "overdue_3days", "overdue_7days", "overdue_14days", "overdue_30days"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Get invoice
        const invoice = await db.getInvoice(input.invoiceId);
        if (!invoice) {
          return { success: false, error: "Invoice not found" };
        }

        // Check if invoice is actually overdue
        const daysOverdue = differenceInDays(new Date(), new Date(invoice.dueDate));
        if (daysOverdue < 0) {
          return { success: false, error: "Invoice is not overdue" };
        }

        // Get client
        const client = await db.getClient(invoice.clientId);
        if (!client?.email) {
          return { success: false, error: "Client has no email address" };
        }

        // Fetch company name for branding
        let appName = 'CRM';
        let cur = 'KES';
        try {
          const { getCompanyInfo } = await import('../utils/company-info');
          const info = await getCompanyInfo();
          if (info.name) appName = info.name;
          if (info.currency) cur = info.currency;
        } catch {}

        // Generate email
        const { html, text } = generateOverdueReminderTemplate({
          clientName: client.companyName,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total - invoice.paidAmount,
          daysOverdue,
          dueDate: invoice.dueDate,
          link: `${process.env.APP_URL || ''}/invoices/${invoice.id}`,
          appName,
          currency: cur,
        });

        // Queue email
        const queueResult = await queueEmail({
          recipientEmail: client.email,
          recipientName: client.companyName,
          subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
          htmlContent: html,
          textContent: text,
          eventType: "invoice_overdue",
          entityType: "invoice",
          entityId: invoice.id,
          userId: ctx.user?.id,
          metadata: {
            reminderType: input.reminderType,
            daysOverdue,
            manuallyTriggered: true,
          },
        });

        if (!queueResult.success) {
          return { success: false, error: queueResult.error };
        }

        // Record reminder sent
        await recordReminderSent(invoice.id, input.reminderType, client.email, ctx.user?.id);

        return {
          success: true,
          message: `Reminder queued for ${client.companyName}`,
          queueId: queueResult.queueId,
        };
      } catch (error) {
        console.error("[PAYMENT REMINDERS] Error sending reminder:", error);
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get reminder history for invoice
   */
  getReminderHistory: readProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { reminders: [] };

      try {
        const reminders = await db.getInvoiceReminderHistory(input.invoiceId);
        return { reminders };
      } catch (error) {
        console.error("[PAYMENT REMINDERS] Error getting reminder history:", error);
        return { reminders: [] };
      }
    }),

  /**
   * Manually trigger overdue reminder process (admin)
   */
  processOverdueReminders: writeProcedure.mutation(async ({ ctx }) => {
    if (ctx.user?.role !== "admin" && ctx.user?.role !== "super_admin" && ctx.user?.role !== "system") {
      throw new Error("Unauthorized - admin only");
    }

    const result = await sendOverdueReminders();
    return result;
  }),
});

import { router } from "../_core/trpc";
import { z } from "zod";
import { getDb, createNotification } from "../db";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../_core/mail";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { settings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getCompanyInfo } from "../utils/company-info";

const notificationCreateProcedure = createFeatureRestrictedProcedure("notifications:create");

// Map event types to notification preference keys (from Settings → Notifications)
const EVENT_TO_PREF_KEY: Record<string, string> = {
  invoice_created: "invoiceDue",
  invoice_sent: "invoiceDue",
  invoice_overdue: "invoiceDue",
  payment_received: "paymentReceived",
  client_created: "newClient",
  proposal_sent: "invoiceDue",
  estimate_converted: "invoiceDue",
  project_created: "invoiceDue",
};

/** Check if notification pref is enabled in settings (defaults to enabled) */
async function isNotificationEnabled(eventType: string): Promise<boolean> {
  const prefKey = EVENT_TO_PREF_KEY[eventType];
  if (!prefKey) return true; // unknown events default to enabled
  try {
    const db = await getDb();
    if (!db) return true;
    const rows = await db.select().from(settings)
      .where(and(eq(settings.category, "notifications"), eq(settings.key, prefKey)))
      .limit(1);
    if (!rows.length) return true; // not configured = enabled
    return rows[0].value !== "false" && rows[0].value !== "0";
  } catch {
    return true;
  }
}

interface NotificationTriggerInput {
  userId: string;
  eventType: "invoice_created" | "invoice_sent" | "payment_received" | "invoice_overdue" | "proposal_sent" | "estimate_converted" | "client_created" | "project_created" | "opportunity_created" | "employee_created" | string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  entityType: string;
  entityId: string;
  actionUrl?: string;
}

/**
 * Send email and create database notification for event.
 * Respects notification preferences from Settings → Notifications.
 */
export async function triggerEventNotification(input: NotificationTriggerInput) {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for notification trigger");
    return;
  }

  // Check notification preferences
  const enabled = await isNotificationEnabled(input.eventType);
  if (!enabled) {
    console.log(`[NOTIFY] Skipping ${input.eventType} — disabled in settings`);
    return;
  }

  try {
    // Create database notification record
    const notificationId = uuidv4();
    await createNotification({
      userId: input.userId,
      title: input.subject,
      message: input.htmlContent.substring(0, 200), // Truncate for preview
      type: getNotificationType(input.eventType),
      category: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
      priority: getPriority(input.eventType),
    });

    // Send email via SMTP helper if configured
    try {
      const mailResult = await sendEmail({
        to: input.recipientEmail,
        subject: input.subject,
        html: input.htmlContent,
      });

      if (!mailResult.success) {
        console.warn('[EMAIL] Sending failed for', input.recipientEmail, mailResult.error);
      }
    } catch (err) {
      console.error('[EMAIL] Error sending email:', err);
    }
  } catch (error) {
    console.error("Error triggering notification:", error);
  }
}

function getNotificationType(eventType: string): "info" | "success" | "warning" | "error" | "reminder" {
  const typeMap = {
    invoice_created: "info" as const,
    invoice_sent: "info" as const,
    payment_received: "success" as const,
    invoice_overdue: "warning" as const,
    proposal_sent: "info" as const,
    estimate_converted: "success" as const,
  };
  return typeMap[eventType as keyof typeof typeMap] || "info";
}

function getPriority(eventType: string): "low" | "normal" | "high" {
  const priorityMap = {
    invoice_created: "normal" as const,
    invoice_sent: "normal" as const,
    payment_received: "high" as const,
    invoice_overdue: "high" as const,
    proposal_sent: "normal" as const,
    estimate_converted: "high" as const,
  };
  return priorityMap[eventType as keyof typeof priorityMap] || "normal";
}

export const emailNotificationRouter = router({
  /**
   * Send invoice created notification to accountant
   */
  onInvoiceCreated: notificationCreateProcedure
    .input(z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string(),
      clientName: z.string(),
      amount: z.number(),
      accountantEmail: z.string().email(),
      dueDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const htmlContent = `
        <h2>New Invoice Created</h2>
        <p>Invoice <strong>${input.invoiceNumber}</strong> has been created for <strong>${input.clientName}</strong>.</p>
        <ul>
          <li><strong>Amount:</strong> Ksh ${(input.amount / 100).toLocaleString("en-KE")}</li>
          <li><strong>Due Date:</strong> ${input.dueDate}</li>
        </ul>
        <p><a href="/invoices/${input.invoiceId}">View Invoice</a></p>
      `;

      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "invoice_created",
        recipientEmail: input.accountantEmail,
        recipientName: "Accountant",
        subject: `Invoice ${input.invoiceNumber} Created - ${input.clientName}`,
        htmlContent,
        entityType: "invoice",
        entityId: input.invoiceId,
        actionUrl: `/invoices/${input.invoiceId}`,
      });

      return { success: true };
    }),

  /**
   * Send invoice sent notification
   */
  onInvoiceSent: notificationCreateProcedure
    .input(z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string(),
      clientEmail: z.string().email(),
      clientName: z.string(),
      amount: z.number(),
      dueDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const htmlContent = `
        <h2>Invoice Sent</h2>
        <p>Hello ${input.clientName},</p>
        <p>We have sent you invoice <strong>${input.invoiceNumber}</strong>.</p>
        <ul>
          <li><strong>Amount:</strong> Ksh ${(input.amount / 100).toLocaleString("en-KE")}</li>
          <li><strong>Due Date:</strong> ${input.dueDate}</li>
        </ul>
        <p>Please remit payment by the due date to avoid late fees.</p>
        <p>Thank you for your business!</p>
      `;

      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "invoice_sent",
        recipientEmail: input.clientEmail,
        recipientName: input.clientName,
        subject: `Invoice ${input.invoiceNumber} from ${(await getCompanyInfo()).name}`,
        htmlContent,
        entityType: "invoice",
        entityId: input.invoiceId,
        actionUrl: `/invoices/${input.invoiceId}`,
      });

      return { success: true };
    }),

  /**
   * Send payment received notification
   */
  onPaymentReceived: notificationCreateProcedure
    .input(z.object({
      paymentId: z.string(),
      invoiceId: z.string(),
      invoiceNumber: z.string(),
      clientEmail: z.string().email(),
      clientName: z.string(),
      amount: z.number(),
      referenceNumber: z.string().optional(),
      accountantEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientHtml = `
        <h2>Payment Received</h2>
        <p>Hello ${input.clientName},</p>
        <p>Thank you! We have received your payment of <strong>Ksh ${(input.amount / 100).toLocaleString("en-KE")}</strong> for invoice <strong>${input.invoiceNumber}</strong>.</p>
        ${input.referenceNumber ? `<p><strong>Reference Number:</strong> ${input.referenceNumber}</p>` : ""}
        <p>Your receipt has been generated and is available for download.</p>
      `;

      const accountantHtml = `
        <h2>Payment Recorded</h2>
        <p>Payment of <strong>Ksh ${(input.amount / 100).toLocaleString("en-KE")}</strong> has been recorded for invoice <strong>${input.invoiceNumber}</strong> from ${input.clientName}.</p>
        ${input.referenceNumber ? `<p><strong>Reference Number:</strong> ${input.referenceNumber}</p>` : ""}
      `;

      // Notify client
      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "payment_received",
        recipientEmail: input.clientEmail,
        recipientName: input.clientName,
        subject: `Payment Received - Invoice ${input.invoiceNumber}`,
        htmlContent: clientHtml,
        entityType: "payment",
        entityId: input.paymentId,
        actionUrl: `/invoices/${input.invoiceId}`,
      });

      // Notify accountant
      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "payment_received",
        recipientEmail: input.accountantEmail,
        recipientName: "Accountant",
        subject: `Payment Recorded - Invoice ${input.invoiceNumber}`,
        htmlContent: accountantHtml,
        entityType: "payment",
        entityId: input.paymentId,
        actionUrl: `/payments/${input.paymentId}`,
      });

      return { success: true };
    }),

  /**
   * Send invoice overdue notification
   */
  onInvoiceOverdue: notificationCreateProcedure
    .input(z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string(),
      clientEmail: z.string().email(),
      clientName: z.string(),
      amount: z.number(),
      daysOverdue: z.number(),
      accountantEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientHtml = `
        <h2>Payment Reminder</h2>
        <p>Hello ${input.clientName},</p>
        <p>Invoice <strong>${input.invoiceNumber}</strong> is now <strong>${input.daysOverdue} days overdue</strong>.</p>
        <p><strong>Amount Due:</strong> Ksh ${(input.amount / 100).toLocaleString("en-KE")}</p>
        <p>Please process payment immediately to avoid further action.</p>
        <p>Contact us if you have any questions.</p>
      `;

      const accountantHtml = `
        <h2>Overdue Invoice Alert</h2>
        <p>Invoice <strong>${input.invoiceNumber}</strong> from ${input.clientName} is <strong>${input.daysOverdue} days overdue</strong>.</p>
        <p><strong>Amount Due:</strong> Ksh ${(input.amount / 100).toLocaleString("en-KE")}</p>
        <p>Consider following up with the client.</p>
      `;

      // Notify client
      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "invoice_overdue",
        recipientEmail: input.clientEmail,
        recipientName: input.clientName,
        subject: `Payment Reminder - Invoice ${input.invoiceNumber} is Overdue`,
        htmlContent: clientHtml,
        entityType: "invoice",
        entityId: input.invoiceId,
        actionUrl: `/invoices/${input.invoiceId}`,
      });

      // Notify accountant
      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "invoice_overdue",
        recipientEmail: input.accountantEmail,
        recipientName: "Accountant",
        subject: `Overdue Invoice Alert - ${input.invoiceNumber}`,
        htmlContent: accountantHtml,
        entityType: "invoice",
        entityId: input.invoiceId,
        actionUrl: `/invoices/${input.invoiceId}`,
      });

      return { success: true };
    }),

  /**
   * Send proposal/estimate sent notification
   */
  onProposalSent: notificationCreateProcedure
    .input(z.object({
      proposalId: z.string(),
      proposalNumber: z.string(),
      clientEmail: z.string().email(),
      clientName: z.string(),
      amount: z.number(),
      expiryDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const htmlContent = `
        <h2>Proposal Sent</h2>
        <p>Hello ${input.clientName},</p>
        <p>We have sent you proposal <strong>${input.proposalNumber}</strong> for your consideration.</p>
        <ul>
          <li><strong>Amount:</strong> Ksh ${(input.amount / 100).toLocaleString("en-KE")}</li>
          <li><strong>Valid Until:</strong> ${input.expiryDate}</li>
        </ul>
        <p>Please review and let us know if you have any questions.</p>
      `;

      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "proposal_sent",
        recipientEmail: input.clientEmail,
        recipientName: input.clientName,
        subject: `Proposal ${input.proposalNumber} from ${(await getCompanyInfo()).name}`,
        htmlContent,
        entityType: "proposal",
        entityId: input.proposalId,
        actionUrl: `/proposals/${input.proposalId}`,
      });

      return { success: true };
    }),



  /**
   * Send team assignment notification to employee
   */
  onTeamAssigned: notificationCreateProcedure
    .input(z.object({
      employeeEmail: z.string().email(),
      employeeName: z.string(),
      projectName: z.string(),
      projectId: z.string(),
      role: z.string(),
      hoursAllocated: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const htmlContent = `
        <h2>Team Assignment Notification</h2>
        <p>Dear ${input.employeeName},</p>
        <p>You have been assigned to a new project. Here are the details:</p>
        <ul>
          <li><strong>Project:</strong> ${input.projectName}</li>
          <li><strong>Role:</strong> ${input.role}</li>
          <li><strong>Hours Allocated:</strong> ${input.hoursAllocated} hours per week</li>
          ${input.startDate ? `<li><strong>Start Date:</strong> ${new Date(input.startDate).toLocaleDateString("en-KE")}</li>` : ""}
          ${input.endDate ? `<li><strong>End Date:</strong> ${new Date(input.endDate).toLocaleDateString("en-KE")}</li>` : ""}
        </ul>
        <p>If you have any questions about this assignment, please reach out to your manager.</p>
      `;

      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "invoice_sent", // Reusing existing event type, could create new one
        recipientEmail: input.employeeEmail,
        recipientName: input.employeeName,
        subject: `Team Assignment: ${input.projectName}`,
        htmlContent,
        entityType: "project",
        entityId: input.projectId,
        actionUrl: `/projects/${input.projectId}`,
      });

      return { success: true };
    }),

  /**
   * Send bulk operation completion notification
   */
  onBulkOperationComplete: notificationCreateProcedure
    .input(z.object({
      userEmail: z.string().email(),
      userName: z.string(),
      operationType: z.string(),
      itemsProcessed: z.number(),
      successCount: z.number(),
      failureCount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const htmlContent = `
        <h2>Bulk Operation Complete</h2>
        <p>Dear ${input.userName},</p>
        <p>Your batch operation has been completed. Here is the summary:</p>
        <ul>
          <li><strong>Operation:</strong> ${input.operationType}</li>
          <li><strong>Total Items:</strong> ${input.itemsProcessed}</li>
          <li><strong>Successful:</strong> ${input.successCount}</li>
          <li><strong>Failed:</strong> ${input.failureCount}</li>
          <li><strong>Success Rate:</strong> ${((input.successCount / input.itemsProcessed) * 100).toFixed(1)}%</li>
        </ul>
        ${input.failureCount > 0
          ? "<p style='color: orange;'>Some items failed processing. Please review the operation details.</p>"
          : "<p style='color: green;'>All items were processed successfully!</p>"}
      `;

      await triggerEventNotification({
        userId: ctx.user.id,
        eventType: "invoice_sent", // Reusing existing type
        recipientEmail: input.userEmail,
        recipientName: input.userName,
        subject: `Bulk Operation Complete: ${input.operationType}`,
        htmlContent,
        entityType: "operation",
        entityId: `bulk_${Date.now()}`,
      });

      return { success: true };
    }),
});

import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { clients, invoices, estimates, payments, settings } from "../../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import * as db from "../db";
import { sendEmail } from "../_core/mail";import { getCompanyInfo } from "../utils/company-info";
/**
 * Resolve an email template by looking up user-customized version from settings.
 * Falls back to the provided default if no custom template is saved.
 * Replaces {variable} placeholders with actual values.
 */
async function resolveTemplate(
  templateId: string,
  variables: Record<string, string>,
  fallback: { subject: string; html: string; text: string },
): Promise<{ subject: string; html: string; text: string }> {
  try {
    const database = await getDb();
    if (!database) return fallback;

    const rows = await database.select().from(settings)
      .where(eq(settings.category, `email_template:${templateId}`));

    if (!rows.length) return fallback;

    const saved: Record<string, string> = {};
    rows.forEach(r => { if (r.key) saved[r.key] = r.value ?? ""; });

    if (!saved.subject && !saved.body) return fallback;

    let subject = saved.subject || fallback.subject;
    let html = saved.body || fallback.html;

    // Also load signature & footer from settings
    const sigRows = await database.select().from(settings)
      .where(eq(settings.category, "email_template:email-signature-all"));
    const footerRows = await database.select().from(settings)
      .where(eq(settings.category, "email_template:email-footer-all"));

    const sigBody = sigRows.find(r => r.key === "body")?.value || "";
    const footerBody = footerRows.find(r => r.key === "body")?.value || "";

    // Add general variables
    variables.email_signature = replaceVars(sigBody, variables);
    variables.email_footer = replaceVars(footerBody, variables);
    variables.todays_date = variables.todays_date || new Date().toLocaleDateString();

    subject = replaceVars(subject, variables);
    html = replaceVars(html, variables);

    // Wrap in base email styling
    const wrappedHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">${html}${variables.email_signature ? `<div>${variables.email_signature}</div>` : ""}${variables.email_footer ? `<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"><div>${variables.email_footer}</div>` : ""}</div>`;

    const text = wrappedHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    return { subject, html: wrappedHtml, text };
  } catch {
    return fallback;
  }
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

// Read company name from settings, fall back to env var, then default
async function getCompanyName(): Promise<string> {
  try {
    const info = await getCompanyInfo();
    return info.name;
  } catch { return process.env.COMPANY_NAME || "Your Company"; }
}

// Email templates with HTML and text versions (defaults — overridden by settings)
const emailTemplates = {
  invoice: (clientName: string, invoiceNumber: string, amount: number, dueDate: string, companyName: string = "Your Company") => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a5490; margin-bottom: 20px;">Invoice ${invoiceNumber}</h2>
        <p>Dear ${clientName},</p>
        <p>Please find below the details of your invoice:</p>
        <div style="background-color: #f5f5f5; border-left: 4px solid #1a5490; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Thank you for your business!</p>
        <p>Best regards,<br><strong>${companyName}</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply directly.</p>
      </div>
    `;
    const text = `Invoice ${invoiceNumber}\n\nDear ${clientName},\n\nPlease find below the details of your invoice:\n\nInvoice Number: ${invoiceNumber}\nAmount: KES ${amount.toLocaleString()}\nDue Date: ${dueDate}\n\nThank you for your business!\n\nBest regards,\n${companyName}`;
    return {
      subject: `Invoice ${invoiceNumber} from ${companyName}`,
      html,
      text,
    };
  },
  estimate: (clientName: string, estimateNumber: string, amount: number, validUntil: string, companyName: string = "Your Company") => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a5490; margin-bottom: 20px;">Estimate ${estimateNumber}</h2>
        <p>Dear ${clientName},</p>
        <p>Please find below the details of your estimate:</p>
        <div style="background-color: #f5f5f5; border-left: 4px solid #1a5490; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Estimate Number:</strong> ${estimateNumber}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${validUntil}</p>
        </div>
        <p>Please let us know if you have any questions or need any clarifications.</p>
        <p>Best regards,<br><strong>${companyName}</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply directly.</p>
      </div>
    `;
    const text = `Estimate ${estimateNumber}\n\nDear ${clientName},\n\nPlease find below the details of your estimate:\n\nEstimate Number: ${estimateNumber}\nAmount: KES ${amount.toLocaleString()}\nValid Until: ${validUntil}\n\nPlease let us know if you have any questions.\n\nBest regards,\n${companyName}`;
    return {
      subject: `Estimate ${estimateNumber} from ${companyName}`,
      html,
      text,
    };
  },
  paymentReminder: (clientName: string, invoiceNumber: string, amount: number, daysOverdue: number, dueDate: string, companyName: string = "Your Company") => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #d32f2f; margin-bottom: 20px;">Payment Reminder - Invoice Overdue</h2>
        <p>Dear ${clientName},</p>
        <p style="color: #d32f2f; font-weight: bold;">This invoice is <strong>${daysOverdue} days overdue</strong>.</p>
        <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 5px 0;"><strong>Amount Due:</strong> KES ${amount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Original Due Date:</strong> ${dueDate}</p>
          <p style="margin: 5px 0;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
        </div>
        <p>Please arrange payment at your earliest convenience. If you have already sent the payment, please disregard this notice.</p>
        <p>Thank you,<br><strong>${companyName}</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated reminder. Please do not reply directly.</p>
      </div>
    `;
    const text = `Payment Reminder - Invoice Overdue\n\nDear ${clientName},\n\nThis invoice is ${daysOverdue} days overdue.\n\nInvoice Number: ${invoiceNumber}\nAmount Due: KES ${amount.toLocaleString()}\nOriginal Due Date: ${dueDate}\nDays Overdue: ${daysOverdue}\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n${companyName}`;
    return {
      subject: `Payment Reminder: Invoice ${invoiceNumber} is ${daysOverdue} days overdue`,
      html,
      text,
    };
  },
  paymentReceived: (clientName: string, invoiceNumber: string, amount: number, companyName: string = "Your Company") => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4CAF50; margin-bottom: 20px;">Payment Received - Thank You!</h2>
        <p>Dear ${clientName},</p>
        <p>Thank you for your payment of <strong>KES ${amount.toLocaleString()}</strong> for invoice <strong>${invoiceNumber}</strong>.</p>
        <div style="background-color: #f1f8e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 5px 0;"><strong>Amount Received:</strong> KES ${amount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Your account is now up to date. We appreciate your prompt payment.</p>
        <p>Best regards,<br><strong>${companyName}</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply directly.</p>
      </div>
    `;
    const text = `Payment Received - Thank You!\n\nDear ${clientName},\n\nThank you for your payment of KES ${amount.toLocaleString()} for invoice ${invoiceNumber}.\n\nInvoice Number: ${invoiceNumber}\nAmount Received: KES ${amount.toLocaleString()}\nDate: ${new Date().toLocaleDateString()}\n\nYour account is now up to date.\n\nBest regards,\n${companyName}`;
    return {
      subject: `Payment Received for Invoice ${invoiceNumber}`,
      html,
      text,
    };
  },
};

export const emailRouter = router({
  // Send invoice to client
  sendInvoice: createFeatureRestrictedProcedure("communications:email")
    .input(z.object({
      invoiceId: z.string(),
      recipientEmail: z.string().email(),
      message: z.string().max(1000).optional(),
      attachPDF: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get invoice and client details
      const invoiceResult = await database
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (!invoiceResult.length) {
        throw new Error("Invoice not found");
      }

      const invoice = invoiceResult[0];
      const clientResult = await database
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      if (!clientResult.length) {
        throw new Error("Client not found");
      }

      const client = clientResult[0];
      const companyName = await getCompanyName();
      const contactName = client.contactPerson || client.companyName;
      const defaultTemplate = emailTemplates.invoice(
        contactName,
        invoice.invoiceNumber,
        invoice.total || 0,
        new Date(invoice.dueDate).toLocaleDateString(),
        companyName
      );

      const template = await resolveTemplate("invoice-new-client", {
        first_name: contactName.split(" ")[0],
        last_name: contactName.split(" ").slice(1).join(" "),
        invoice_id: invoice.invoiceNumber,
        invoice_amount: `KES ${(invoice.total || 0).toLocaleString()}`,
        invoice_amount_due: `KES ${(invoice.total || 0).toLocaleString()}`,
        invoice_date_created: new Date(invoice.createdAt || new Date()).toLocaleDateString(),
        invoice_date_due: new Date(invoice.dueDate).toLocaleDateString(),
        client_name: client.companyName,
        client_id: client.id,
        invoice_status: invoice.status || "pending",
        invoice_url: `${process.env.APP_URL || ""}/invoices/${invoice.id}`,
        our_company_name: companyName,
        dashboard_url: process.env.APP_URL || "",
      }, defaultTemplate);

      // Send email through SMTP
      const emailResult = await sendEmail({
        to: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "invoice_sent",
        entityType: "invoice",
        entityId: input.invoiceId,
        description: `Sent invoice ${invoice.invoiceNumber} to ${input.recipientEmail}`,
      });

      return {
        success: true,
        message: `Invoice sent to ${input.recipientEmail}`,
        messageId: emailResult.messageId,
      };
    }),

  // Send estimate to client
  sendEstimate: createFeatureRestrictedProcedure("communications:email")
    .input(z.object({
      estimateId: z.string(),
      recipientEmail: z.string().email(),
      message: z.string().max(1000).optional(),
      attachPDF: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get estimate and client details
      const estimateResult = await database
        .select()
        .from(estimates)
        .where(eq(estimates.id, input.estimateId))
        .limit(1);

      if (!estimateResult.length) {
        throw new Error("Estimate not found");
      }

      const estimate = estimateResult[0];
      const clientResult = await database
        .select()
        .from(clients)
        .where(eq(clients.id, estimate.clientId))
        .limit(1);

      if (!clientResult.length) {
        throw new Error("Client not found");
      }

      const client = clientResult[0];
      const companyName = await getCompanyName();
      const contactName = client.contactPerson || client.companyName;
      const defaultTemplate = emailTemplates.estimate(
        contactName,
        estimate.estimateNumber,
        estimate.total || 0,
        new Date(estimate.expiryDate || new Date()).toLocaleDateString(),
        companyName
      );

      const template = await resolveTemplate("estimate-new-client", {
        first_name: contactName.split(" ")[0],
        last_name: contactName.split(" ").slice(1).join(" "),
        estimate_id: estimate.estimateNumber,
        estimate_amount: `KES ${(estimate.total || 0).toLocaleString()}`,
        estimate_date: new Date(estimate.createdAt || new Date()).toLocaleDateString(),
        client_name: client.companyName,
        client_id: client.id,
        our_company_name: companyName,
        dashboard_url: process.env.APP_URL || "",
      }, defaultTemplate);

      // Send email through SMTP
      const emailResult = await sendEmail({
        to: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "estimate_sent",
        entityType: "estimate",
        entityId: input.estimateId,
        description: `Sent estimate ${estimate.estimateNumber} to ${input.recipientEmail}`,
      });

      return {
        success: true,
        message: `Estimate sent to ${input.recipientEmail}`,
        messageId: emailResult.messageId,
      };
    }),

  // Send payment reminder
  sendPaymentReminder: createFeatureRestrictedProcedure("communications:email")
    .input(z.object({
      invoiceId: z.string(),
      recipientEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get invoice and client details
      const invoiceResult = await database
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (!invoiceResult.length) {
        throw new Error("Invoice not found");
      }

      const invoice = invoiceResult[0];
      const clientResult = await database
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      if (!clientResult.length) {
        throw new Error("Client not found");
      }

      const client = clientResult[0];
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const companyName = await getCompanyName();
      const contactName = client.contactPerson || client.companyName;

      const defaultTemplate = emailTemplates.paymentReminder(
        contactName,
        invoice.invoiceNumber,
        invoice.total || 0,
        Math.max(daysOverdue, 0),
        new Date(invoice.dueDate).toLocaleDateString(),
        companyName
      );

      const template = await resolveTemplate("invoice-reminder-client", {
        first_name: contactName.split(" ")[0],
        last_name: contactName.split(" ").slice(1).join(" "),
        invoice_id: invoice.invoiceNumber,
        invoice_amount: `KES ${(invoice.total || 0).toLocaleString()}`,
        invoice_amount_due: `KES ${(invoice.total || 0).toLocaleString()}`,
        invoice_date_due: new Date(invoice.dueDate).toLocaleDateString(),
        client_name: client.companyName,
        invoice_url: `${process.env.APP_URL || ""}/invoices/${invoice.id}`,
        our_company_name: companyName,
        dashboard_url: process.env.APP_URL || "",
      }, defaultTemplate);

      // Send email through SMTP
      const emailResult = await sendEmail({
        to: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "payment_reminder_sent",
        entityType: "invoice",
        entityId: input.invoiceId,
        description: `Sent payment reminder for invoice ${invoice.invoiceNumber} to ${input.recipientEmail}`,
      });

      return {
        success: true,
        message: `Payment reminder sent to ${input.recipientEmail}`,
        messageId: emailResult.messageId,
      };
    }),

  // Send payment received notification
  sendPaymentReceivedNotification: createFeatureRestrictedProcedure("communications:email")
    .input(z.object({
      invoiceId: z.string(),
      recipientEmail: z.string().email(),
      paymentAmount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get invoice and client details
      const invoiceResult = await database
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (!invoiceResult.length) {
        throw new Error("Invoice not found");
      }

      const invoice = invoiceResult[0];
      const clientResult = await database
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      if (!clientResult.length) {
        throw new Error("Client not found");
      }

      const client = clientResult[0];
      const companyName = await getCompanyName();
      const contactName = client.contactPerson || client.companyName;
      const defaultTemplate = emailTemplates.paymentReceived(
        contactName,
        invoice.invoiceNumber,
        input.paymentAmount,
        companyName
      );

      const template = await resolveTemplate("payment-thankyou-client", {
        first_name: contactName.split(" ")[0],
        last_name: contactName.split(" ").slice(1).join(" "),
        invoice_id: invoice.invoiceNumber,
        payment_amount: `KES ${input.paymentAmount.toLocaleString()}`,
        client_name: client.companyName,
        our_company_name: companyName,
        dashboard_url: process.env.APP_URL || "",
      }, defaultTemplate);

      // Send email through SMTP
      const emailResult = await sendEmail({
        to: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "payment_notification_sent",
        entityType: "invoice",
        entityId: input.invoiceId,
        description: `Sent payment received notification for invoice ${invoice.invoiceNumber} to ${input.recipientEmail}`,
      });

      return {
        success: true,
        message: `Payment notification sent to ${input.recipientEmail}`,
        messageId: emailResult.messageId,
      };
    }),

  // Batch send invoices
  batchSendInvoices: createFeatureRestrictedProcedure("communications:email")
    .input(z.object({
      invoiceIds: z.array(z.string()).min(1),
      message: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const invoiceId of input.invoiceIds) {
        try {
          const invoiceResult = await database
            .select()
            .from(invoices)
            .where(eq(invoices.id, invoiceId))
            .limit(1);

          if (!invoiceResult.length) {
            results.failed++;
            results.errors.push(`Invoice ${invoiceId} not found`);
            continue;
          }

          const invoice = invoiceResult[0];
          const clientResult = await database
            .select()
            .from(clients)
            .where(eq(clients.id, invoice.clientId))
            .limit(1);

          if (!clientResult.length || !clientResult[0].email) {
            results.failed++;
            results.errors.push(`No email found for invoice ${invoice.invoiceNumber}`);
            continue;
          }

          const client = clientResult[0];
          const companyName = await getCompanyName();
          const contactName = client.contactPerson || client.companyName;
          const defaultTemplate = emailTemplates.invoice(
            contactName,
            invoice.invoiceNumber,
            invoice.total || 0,
            new Date(invoice.dueDate).toLocaleDateString(),
            companyName
          );

          const template = await resolveTemplate("invoice-new-client", {
            first_name: contactName.split(" ")[0],
            last_name: contactName.split(" ").slice(1).join(" "),
            invoice_id: invoice.invoiceNumber,
            invoice_amount: `KES ${(invoice.total || 0).toLocaleString()}`,
            invoice_amount_due: `KES ${(invoice.total || 0).toLocaleString()}`,
            invoice_date_created: new Date(invoice.createdAt || new Date()).toLocaleDateString(),
            invoice_date_due: new Date(invoice.dueDate).toLocaleDateString(),
            client_name: client.companyName,
            client_id: client.id,
            invoice_status: invoice.status || "pending",
            invoice_url: `${process.env.APP_URL || ""}/invoices/${invoice.id}`,
            our_company_name: companyName,
            dashboard_url: process.env.APP_URL || "",
          }, defaultTemplate);

          // Send email through SMTP
          const emailResult = await sendEmail({
            to: client.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });

          if (!emailResult.success) {
            results.failed++;
            results.errors.push(`Failed to send invoice ${invoice.invoiceNumber}: ${emailResult.error}`);
            continue;
          }

          // Log activity
          await db.logActivity({
            userId: ctx.user.id,
            action: "invoice_sent",
            entityType: "invoice",
            entityId: invoiceId,
            description: `Batch sent invoice ${invoice.invoiceNumber} to ${client.email}`,
          });

          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Error sending invoice ${invoiceId}: ${error}`);
        }
      }

      return {
        ...results,
        message: `Sent ${results.sent} invoice(s), ${results.failed} failed`,
      };
    }),

  // Batch send payment reminders
  batchSendPaymentReminders: createFeatureRestrictedProcedure("communications:email")
    .input(z.object({
      invoiceIds: z.array(z.string()).min(1),
      daysOverdueThreshold: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const invoiceId of input.invoiceIds) {
        try {
          const invoiceResult = await database
            .select()
            .from(invoices)
            .where(eq(invoices.id, invoiceId))
            .limit(1);

          if (!invoiceResult.length) {
            results.failed++;
            results.errors.push(`Invoice ${invoiceId} not found`);
            continue;
          }

          const invoice = invoiceResult[0];
          
          // Check if invoice is overdue
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysOverdue < input.daysOverdueThreshold) {
            results.failed++;
            results.errors.push(`Invoice ${invoice.invoiceNumber} not overdue by ${input.daysOverdueThreshold} days`);
            continue;
          }

          const clientResult = await database
            .select()
            .from(clients)
            .where(eq(clients.id, invoice.clientId))
            .limit(1);

          if (!clientResult.length || !clientResult[0].email) {
            results.failed++;
            results.errors.push(`No email found for invoice ${invoice.invoiceNumber}`);
            continue;
          }

          const client = clientResult[0];
          const companyName = await getCompanyName();
          const contactName = client.contactPerson || client.companyName;
          const defaultTemplate = emailTemplates.paymentReminder(
            contactName,
            invoice.invoiceNumber,
            invoice.total || 0,
            Math.max(daysOverdue, 0),
            new Date(invoice.dueDate).toLocaleDateString(),
            companyName
          );

          const template = await resolveTemplate("invoice-reminder-client", {
            first_name: contactName.split(" ")[0],
            last_name: contactName.split(" ").slice(1).join(" "),
            invoice_id: invoice.invoiceNumber,
            invoice_amount: `KES ${(invoice.total || 0).toLocaleString()}`,
            invoice_amount_due: `KES ${(invoice.total || 0).toLocaleString()}`,
            invoice_date_due: new Date(invoice.dueDate).toLocaleDateString(),
            client_name: client.companyName,
            invoice_url: `${process.env.APP_URL || ""}/invoices/${invoice.id}`,
            our_company_name: companyName,
            dashboard_url: process.env.APP_URL || "",
          }, defaultTemplate);

          // Send email through SMTP
          const emailResult = await sendEmail({
            to: client.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });

          if (!emailResult.success) {
            results.failed++;
            results.errors.push(`Failed to send reminder for invoice ${invoice.invoiceNumber}: ${emailResult.error}`);
            continue;
          }

          // Log activity
          await db.logActivity({
            userId: ctx.user.id,
            action: "payment_reminder_sent",
            entityType: "invoice",
            entityId: invoiceId,
            description: `Batch sent payment reminder for invoice ${invoice.invoiceNumber} to ${client.email}`,
          });

          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Error sending reminder for invoice ${invoiceId}: ${error}`);
        }
      }

      return {
        ...results,
        message: `Sent ${results.sent} reminder(s), ${results.failed} failed`,
      };
    }),

  // Get email templates
  getTemplates: createFeatureRestrictedProcedure("communications:email")
    .query(async () => {
      return {
        invoice: "Invoice notification template",
        estimate: "Estimate notification template",
        paymentReminder: "Payment reminder template",
        paymentReceived: "Payment received notification template",
      };
    }),
});

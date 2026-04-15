import { CronJob } from "cron";
import { getDb } from "../db";
import { invoices, clients, recurringInvoices, lineItems, paymentPlans, paymentPlanInstallments, projectMilestones, projects } from "../../drizzle/schema";
import { eq, lt, and, lte, gte } from "drizzle-orm";
import { triggerEventNotification } from "../routers/emailNotifications";
import { nanoid } from "nanoid";

/**
 * Initialize scheduled jobs for invoice reminders
 * Runs daily at 9 AM to check for overdue invoices and send reminders
 */
export function initializeScheduledJobs() {
  // Daily invoice reminder job - runs at 9:00 AM
  const invoiceReminderJob = new CronJob(
    "0 9 * * *", // Every day at 9 AM
    async () => {
      console.log("[CRON] Running invoice reminder job...");
      await processInvoiceReminders();
    },
    null,
    true, // Start immediately
    "Africa/Nairobi" // Timezone
  );

  // Weekly unpaid invoice summary - runs every Monday at 8 AM
  const weeklyUnpaidJob = new CronJob(
    "0 8 * * 1", // Every Monday at 8 AM
    async () => {
      console.log("[CRON] Running weekly unpaid invoices summary job...");
      await sendWeeklyUnpaidSummary();
    },
    null,
    true, // Start immediately
    "Africa/Nairobi"
  );

  // Recurring invoices generation job - runs at 10:00 AM
  const recurringInvoicesJob = new CronJob(
    "0 10 * * *", // Every day at 10 AM
    async () => {
      console.log("[CRON] Running recurring invoices generation job...");
      await processRecurringInvoices();
    },
    null,
    true, // Start immediately
    "Africa/Nairobi"
  );

  // Installment reminders job - runs at 11:00 AM daily
  const installmentRemindersJob = new CronJob(
    "0 11 * * *", // Every day at 11 AM
    async () => {
      console.log("[CRON] Running installment reminders job...");
      await processInstallmentReminders();
    },
    null,
    true, // Start immediately
    "Africa/Nairobi"
  );

  // Milestone reminders job - runs at 12:00 PM daily
  const milestoneRemindersJob = new CronJob(
    "0 12 * * *", // Every day at 12 PM
    async () => {
      console.log("[CRON] Running milestone reminders job...");
      await processMilestoneReminders();
    },
    null,
    true, // Start immediately
    "Africa/Nairobi"
  );

  console.log("[SCHEDULER] Invoice reminder jobs initialized");

  return {
    invoiceReminder: invoiceReminderJob,
    weeklyUnpaid: weeklyUnpaidJob,
    recurringInvoices: recurringInvoicesJob,
    installmentReminders: installmentRemindersJob,
    milestoneReminders: milestoneRemindersJob,
  };
}

/**
 * Process overdue invoices and send reminders
 */
async function processInvoiceReminders() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[CRON] Database not available");
      return;
    }

    const now = new Date();
    const oneDayBefore = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before due date
    const overdueBefore = new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000); // Today (for overdue)

    // Find invoices due in 1 day (upcoming reminders)
    const upcomingInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "sent" as any),
          // Due within next 24 hours
          lt(invoices.dueDate, new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19))
        )
      )
      .limit(100);

    console.log(`[CRON] Found ${upcomingInvoices.length} invoices with upcoming due dates`);

    // Send reminders for upcoming invoices
    for (const invoice of upcomingInvoices) {
      try {
        const daysUntilDue = Math.ceil(
          (new Date(invoice.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysUntilDue <= 1 && daysUntilDue > 0) {
          console.log(`[CRON] Sending reminder for invoice ${invoice.invoiceNumber} (due in ${daysUntilDue} day)`);

          await triggerEventNotification({
            userId: invoice.createdBy || "system",
            eventType: "invoice_overdue",
            recipientEmail: "client@example.com",
            recipientName: "Client",
            subject: `Invoice Reminder - ${invoice.invoiceNumber} Due Tomorrow`,
            htmlContent: `
              <h2>Payment Reminder</h2>
              <p>Invoice <strong>${invoice.invoiceNumber}</strong> is due tomorrow!</p>
              <ul>
                <li><strong>Amount:</strong> Ksh ${(invoice.total / 100).toLocaleString("en-KE")}</li>
                <li><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</li>
              </ul>
              <p>Please process payment to avoid late fees.</p>
            `,
            entityType: "invoice",
            entityId: invoice.id,
            actionUrl: `/invoices/${invoice.id}`,
          });
        }
      } catch (err) {
        console.error(`[CRON] Failed to send reminder for invoice ${invoice.invoiceNumber}:`, err);
      }
    }

    // Find overdue invoices (past due date but not marked as overdue yet)
    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          // Not paid or partial
          lt(invoices.paidAmount, invoices.total),
          // Past due date
          lt(invoices.dueDate, now.toISOString().replace('T', ' ').substring(0, 19))
        )
      )
      .limit(100);

    console.log(`[CRON] Found ${overdueInvoices.length} overdue invoices`);

    // Send overdue reminders
    for (const invoice of overdueInvoices) {
      try {
        const daysOverdue = Math.ceil(
          (now.getTime() - new Date(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000)
        );

        // Only send overdue reminders if truly overdue and not already sent recently
        if (daysOverdue > 0 && daysOverdue <= 30) {
          // Limit reminders to first 30 days
          console.log(`[CRON] Sending overdue reminder for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);

          await triggerEventNotification({
            userId: invoice.createdBy || "system",
            eventType: "invoice_overdue",
            recipientEmail: "client@example.com",
            recipientName: "Client",
            subject: `Urgent: Invoice ${invoice.invoiceNumber} is ${daysOverdue} Days Overdue`,
            htmlContent: `
              <h2>Payment Urgent</h2>
              <p>Invoice <strong>${invoice.invoiceNumber}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
              <ul>
                <li><strong>Amount Due:</strong> Ksh ${((invoice.total - (invoice.paidAmount || 0)) / 100).toLocaleString("en-KE")}</li>
                <li><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</li>
              </ul>
              <p>Please remit payment immediately. Contact us if you have any questions.</p>
            `,
            entityType: "invoice",
            entityId: invoice.id,
            actionUrl: `/invoices/${invoice.id}`,
          });
        }
      } catch (err) {
        console.error(`[CRON] Failed to send overdue reminder for invoice ${invoice.invoiceNumber}:`, err);
      }
    }

    console.log("[CRON] Invoice reminder job completed successfully");
  } catch (err) {
    console.error("[CRON] Error processing invoice reminders:", err);
  }
}

/**
 * Send weekly summary of unpaid invoices
 */
async function sendWeeklyUnpaidSummary() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[CRON] Database not available");
      return;
    }

    const now = new Date();

    // Find all unpaid invoices
    const unpaidInvoices = await db
      .select()
      .from(invoices)
      .where(
        lt(invoices.paidAmount, invoices.total) // paidAmount < total
      )
      .limit(100);

    if (unpaidInvoices.length === 0) {
      console.log("[CRON] No unpaid invoices for weekly summary");
      return;
    }

    console.log(`[CRON] Sending weekly summary for ${unpaidInvoices.length} unpaid invoices`);

    const totalUnpaid = unpaidInvoices.reduce(
      (sum, inv) => sum + (inv.total - (inv.paidAmount || 0)),
      0
    );

    const overdueCount = unpaidInvoices.filter(
      (inv) => new Date(inv.dueDate) < new Date()
    ).length;

    const invoiceList = unpaidInvoices
      .slice(0, 10)
      .map(
        (inv) =>
          `<li>${inv.invoiceNumber} - Ksh ${((inv.total - (inv.paidAmount || 0)) / 100).toLocaleString("en-KE")} (Due: ${new Date(inv.dueDate).toLocaleDateString()})</li>`
      )
      .join("");

    const htmlContent = `
      <h2>Weekly Unpaid Invoices Summary</h2>
      <p>Total unpaid invoices: <strong>${unpaidInvoices.length}</strong></p>
      <p>Total amount due: <strong>Ksh ${(totalUnpaid / 100).toLocaleString("en-KE")}</strong></p>
      <p>Overdue invoices: <strong>${overdueCount}</strong></p>
      
      <h3>Top Unpaid Invoices</h3>
      <ul>${invoiceList}</ul>
      
      <p><a href="/invoices?status=unpaid">View All Unpaid Invoices</a></p>
    `;

    await triggerEventNotification({
      userId: "system",
      eventType: "invoice_overdue", // Using same type for consistency
      recipientEmail: "accounting@company.com",
      recipientName: "Accounting Team",
      subject: `Weekly Summary: ${unpaidInvoices.length} Unpaid Invoices Worth Ksh ${(totalUnpaid / 100).toLocaleString("en-KE")}`,
      htmlContent,
      entityType: "invoice",
      entityId: "summary",
      actionUrl: `/invoices?status=unpaid`,
    });

    console.log("[CRON] Weekly unpaid summary sent successfully");
  } catch (err) {
    console.error("[CRON] Error sending weekly unpaid summary:", err);
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(jobs: {
  invoiceReminder: CronJob;
  weeklyUnpaid: CronJob;
  recurringInvoices: CronJob;
  installmentReminders: CronJob;
  milestoneReminders: CronJob;
}) {
  try {
    jobs.invoiceReminder.stop();
    jobs.weeklyUnpaid.stop();
    jobs.recurringInvoices.stop();
    jobs.installmentReminders.stop();
    jobs.milestoneReminders.stop();
    console.log("[SCHEDULER] All scheduled jobs stopped");
  } catch (err) {
    console.error("[SCHEDULER] Error stopping scheduled jobs:", err);
  }
}

/**
 * Process recurring invoices and auto-generate new invoices when due
 */
async function processRecurringInvoices() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[CRON] Database not available for recurring invoices");
      return;
    }

    const now = new Date();

    // Find all active recurring invoices where nextDueDate <= now
    const dueRecurringInvoices = await db
      .select()
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.isActive, 1),
          lte(recurringInvoices.nextDueDate, now.toISOString().replace('T', ' ').substring(0, 19))
        )
      )
      .limit(100);

    console.log(`[CRON] Found ${dueRecurringInvoices.length} recurring invoices to process`);

    for (const recurring of dueRecurringInvoices) {
      try {
        // Check if end date has passed
        if (recurring.endDate && new Date(recurring.endDate) < now) {
          console.log(`[CRON] Recurring invoice ${recurring.id} has passed end date, deactivating`);
          await db
            .update(recurringInvoices)
            .set({ isActive: 0 })
            .where(eq(recurringInvoices.id, recurring.id));
          continue;
        }

        // Get template invoice
        const template = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, recurring.templateInvoiceId))
          .limit(1);

        if (!template.length) {
          console.error(`[CRON] Template invoice ${recurring.templateInvoiceId} not found`);
          continue;
        }

        // Get template line items
        const templateLineItems = await db
          .select()
          .from(lineItems)
          .where(
            and(
              eq(lineItems.documentId, template[0].id),
              eq(lineItems.documentType, "invoice")
            )
          );

        // Generate new invoice from template
        const newInvoiceId = nanoid();
        const invoiceNumber = `${template[0].invoiceNumber}-REC-${now.toISOString().split("T")[0].replace(/-/g, "")}`;

        // Calculate next due date
        const nextDueDate = calculateNextDueDate(now, recurring.frequency);

        await db.insert(invoices).values({
          id: newInvoiceId,
          invoiceNumber,
          clientId: recurring.clientId,
          recurringInvoiceId: recurring.id,
          title: template[0].title,
          status: "draft",
          issueDate: now.toISOString().replace('T', ' ').substring(0, 19),
          dueDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
          subtotal: template[0].subtotal,
          taxAmount: template[0].taxAmount || 0,
          discountAmount: template[0].discountAmount || 0,
          total: template[0].total,
          paidAmount: 0,
          createdFromRecurring: 1,
          notes:
            (template[0].notes || "") +
            "\n\n--- Auto-generated from recurring invoice ---" +
            (recurring.noteToInvoice ? "\n" + recurring.noteToInvoice : ""),
          terms: template[0].terms,
          createdBy: "system",
        });

        // Copy line items
        if (templateLineItems.length > 0) {
          await db.insert(lineItems).values(
            templateLineItems.map((item) => ({
              id: nanoid(),
              documentId: newInvoiceId,
              documentType: "invoice" as const,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              productId: item.productId,
              serviceId: item.serviceId,
              taxRate: item.taxRate || 0,
              taxAmount: item.taxAmount || 0,
              lineNumber: item.lineNumber || 1,
              createdBy: "system",
            }))
          );
        }

        // Update recurring invoice's nextDueDate and lastGeneratedDate
        await db
          .update(recurringInvoices)
          .set({
            nextDueDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
            lastGeneratedDate: now.toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(recurringInvoices.id, recurring.id));

        console.log(`[CRON] Generated invoice ${invoiceNumber} from recurring template ${recurring.id}`);

        // Trigger notification
        await triggerEventNotification({
          userId: "system",
          eventType: "invoice_created",
          recipientEmail: "accounting@company.com",
          recipientName: "Accounting Team",
          subject: `Recurring Invoice Generated: ${invoiceNumber}`,
          htmlContent: `
            <h2>Recurring Invoice Generated</h2>
            <p>Invoice <strong>${invoiceNumber}</strong> has been auto-generated from recurring template.</p>
            <ul>
              <li><strong>Amount:</strong> Ksh ${(template[0].total / 100).toLocaleString("en-KE")}</li>
              <li><strong>Due Date:</strong> ${nextDueDate.toLocaleDateString()}</li>
              <li><strong>From Template:</strong> ${template[0].invoiceNumber}</li>
            </ul>
            <p><a href="/invoices/${newInvoiceId}">View Invoice</a></p>
          `,
          entityType: "invoice",
          entityId: newInvoiceId,
          actionUrl: `/invoices/${newInvoiceId}`,
        });
      } catch (err) {
        console.error(`[CRON] Error processing recurring invoice ${recurring.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[CRON] Error in processRecurringInvoices:", err);
  }
}

/**
 * Calculate next due date based on frequency
 */
function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "biweekly":
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "annually":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  return nextDate;
}

/**
 * Process payment plan installment reminders
 */
async function processInstallmentReminders() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[CRON] Database not available for installment reminders");
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const overdueBefore = new Date(now.getTime());

    // Find upcoming installments (due within 24 hours)
    const upcomingInstallments = await db
      .select({
        installment: paymentPlanInstallments,
        plan: paymentPlans,
      })
      .from(paymentPlanInstallments)
      .innerJoin(
        paymentPlans,
        eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
      )
      .where(
        and(
          eq(paymentPlanInstallments.status, "pending"),
          gte(paymentPlanInstallments.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
          lte(paymentPlanInstallments.dueDate, tomorrow.toISOString().replace('T', ' ').substring(0, 19)),
          eq(paymentPlans.status, "active")
        )
      );

    console.log(
      `[CRON] Found ${upcomingInstallments.length} upcoming payment plan installments`
    );

    for (const record of upcomingInstallments) {
      try {
        const { installment, plan } = record;

        console.log(
          `[CRON] Sending reminder for installment ${installment.installmentNumber} of plan ${plan.id}`
        );

        await triggerEventNotification({
          userId: plan.createdBy || "system",
          eventType: "invoice_overdue",
          recipientEmail: "client@example.com",
          recipientName: "Client",
          subject: `Payment Reminder - Installment ${installment.installmentNumber} Due Tomorrow`,
          htmlContent: `
            <h2>Payment Plan Installment Due Tomorrow</h2>
            <ul>
              <li><strong>Installment:</strong> ${installment.installmentNumber}</li>
              <li><strong>Amount:</strong> Ksh ${(installment.amount / 100).toLocaleString("en-KE")}</li>
              <li><strong>Due Date:</strong> ${new Date(installment.dueDate).toLocaleDateString()}</li>
            </ul>
            <p>Please process payment to avoid late penalties.</p>
          `,
          entityType: "payment_plan",
          entityId: plan.id,
        });
      } catch (err) {
        console.error(
          `[CRON] Error processing upcoming installment ${record.installment.id}:`,
          err
        );
      }
    }

    // Find overdue installments
    const overdueInstallments = await db
      .select({
        installment: paymentPlanInstallments,
        plan: paymentPlans,
      })
      .from(paymentPlanInstallments)
      .innerJoin(
        paymentPlans,
        eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
      )
      .where(
        and(
          eq(paymentPlanInstallments.status, "pending"),
          lte(paymentPlanInstallments.dueDate, overdueBefore.toISOString().replace('T', ' ').substring(0, 19)),
          eq(paymentPlans.status, "active")
        )
      );

    console.log(`[CRON] Found ${overdueInstallments.length} overdue installments`);

    for (const record of overdueInstallments) {
      try {
        const { installment, plan } = record;

        console.log(
          `[CRON] Sending overdue notice for installment ${installment.installmentNumber} of plan ${plan.id}`
        );

        // Mark as overdue in DB
        await db
          .update(paymentPlanInstallments)
          .set({ status: "overdue" })
          .where(eq(paymentPlanInstallments.id, installment.id));

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(installment.dueDate).getTime()) / (24 * 60 * 60 * 1000)
        );

        await triggerEventNotification({
          userId: plan.createdBy || "system",
          eventType: "invoice_overdue",
          recipientEmail: "client@example.com",
          recipientName: "Client",
          subject: `URGENT: Overdue Payment - Installment ${installment.installmentNumber} (${daysOverdue} days overdue)`,
          htmlContent: `
            <h2>URGENT: Overdue Payment Notification</h2>
            <p style="color: red;"><strong>Your payment is ${daysOverdue} days overdue</strong></p>
            <ul>
              <li><strong>Installment:</strong> ${installment.installmentNumber}</li>
              <li><strong>Amount:</strong> Ksh ${(installment.amount / 100).toLocaleString("en-KE")}</li>
              <li><strong>Due Date:</strong> ${new Date(installment.dueDate).toLocaleDateString()}</li>
              <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
            </ul>
            <p>Immediate payment is required to avoid additional penalties and suspension of further credits.</p>
          `,
          entityType: "payment_plan",
          entityId: plan.id,
        });
      } catch (err) {
        console.error(
          `[CRON] Error processing overdue installment ${record.installment.id}:`,
          err
        );
      }
    }

    console.log("[CRON] Installment reminders processed successfully");
  } catch (err) {
    console.error("[CRON] Error in processInstallmentReminders:", err);
  }
}
/**
 * Process project milestone reminders
 */
async function processMilestoneReminders() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[CRON] Database not available for milestone reminders");
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find upcoming milestones (due within 24 hours)
    const upcomingMilestones = await db
      .select({
        milestone: projectMilestones,
        project: projects,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projectMilestones.status, "planning"),
          gte(projectMilestones.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
          lte(projectMilestones.dueDate, tomorrow.toISOString().replace('T', ' ').substring(0, 19))
        )
      );

    console.log(`[CRON] Found ${upcomingMilestones.length} upcoming project milestones`);

    for (const record of upcomingMilestones) {
      try {
        const { milestone, project } = record;

        console.log(
          `[CRON] Sending reminder for milestone "${milestone.phaseName}" of project ${project.projectNumber}`
        );

        await triggerEventNotification({
          userId: project.projectManager || project.createdBy || "system",
          eventType: "invoice_overdue",
          recipientEmail: "team@company.com",
          recipientName: "Project Team",
          subject: `Project Milestone Reminder: ${project.projectNumber} - ${milestone.phaseName}`,
          htmlContent: `
            <h2>Project Milestone Due Tomorrow</h2>
            <p><strong>Project:</strong> ${project.projectNumber} - ${project.name}</p>
            <p><strong>Milestone:</strong> ${milestone.phaseName}</p>
            <p><strong>Due Date:</strong> ${new Date(milestone.dueDate).toLocaleDateString()}</p>
            ${milestone.deliverables ? `<p><strong>Deliverables:</strong> ${milestone.deliverables}</p>` : ""}
            <p>Please ensure all deliverables are on track for completion.</p>
          `,
          entityType: "project_milestone",
          entityId: milestone.id,
          actionUrl: `/projects/${project.id}`,
        });
      } catch (err) {
        console.error(
          `[CRON] Error processing upcoming milestone ${record.milestone.id}:`,
          err
        );
      }
    }

    // Find overdue milestones
    const overdueMilestones = await db
      .select({
        milestone: projectMilestones,
        project: projects,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projectMilestones.status, "in_progress"),
          lte(projectMilestones.dueDate, now.toISOString().replace('T', ' ').substring(0, 19))
        )
      );

    console.log(`[CRON] Found ${overdueMilestones.length} overdue project milestones`);

    for (const record of overdueMilestones) {
      try {
        const { milestone, project } = record;

        console.log(
          `[CRON] Sending overdue notice for milestone "${milestone.phaseName}" of project ${project.projectNumber}`
        );

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(milestone.dueDate).getTime()) / (24 * 60 * 60 * 1000)
        );

        await triggerEventNotification({
          userId: project.projectManager || project.createdBy || "system",
          eventType: "invoice_overdue",
          recipientEmail: "team@company.com",
          recipientName: "Project Team",
          subject: `URGENT: Overdue Project Milestone - ${project.projectNumber} (${daysOverdue} days overdue)`,
          htmlContent: `
            <h2>URGENT: Overdue Project Milestone</h2>
            <p style="color: red;"><strong>Milestone is ${daysOverdue} day(s) overdue</strong></p>
            <p><strong>Project:</strong> ${project.projectNumber} - ${project.name}</p>
            <p><strong>Milestone:</strong> ${milestone.phaseName}</p>
            <p><strong>Due Date:</strong> ${new Date(milestone.dueDate).toLocaleDateString()}</p>
            <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
            ${milestone.deliverables ? `<p><strong>Deliverables:</strong> ${milestone.deliverables}</p>` : ""}
            <p>Immediate action is required to get this milestone back on track.</p>
          `,
          entityType: "project_milestone",
          entityId: milestone.id,
          actionUrl: `/projects/${project.id}`,
        });
      } catch (err) {
        console.error(
          `[CRON] Error processing overdue milestone ${record.milestone.id}:`,
          err
        );
      }
    }

    console.log("[CRON] Milestone reminders processed successfully");
  } catch (err) {
    console.error("[CRON] Error in processMilestoneReminders:", err);
  }
}
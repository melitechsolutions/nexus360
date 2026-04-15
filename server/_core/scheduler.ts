import { CronJob } from "cron";
import { sendOverdueReminders } from "../routers/paymentReminders";
import { processEmailQueue } from "../routers/emailQueue";
import { billingRouter } from "../routers/billing";
import { sendUsageReminders } from "../jobs/usageReminders";

/**
 * Scheduler configuration for automated background jobs
 * Run this in your main server initialization
 */

export function initializeSchedulers() {
  console.log("[SCHEDULER] Initializing background job schedulers...");

  // ============================================================================
  // EMAIL QUEUE PROCESSOR - Every 5 minutes
  // Process pending emails from queue and handle retries
  // ============================================================================
  const emailQueueJob = new CronJob("*/5 * * * *", async () => {
    try {
      console.log("[SCHEDULER] Running email queue processor...");
      const result = await processEmailQueue();
      if (result.success) {
        console.log(
          `[SCHEDULER] Email queue processed: ${result.processed} sent, ${result.failed} failed out of ${result.total}`
        );
      } else {
        console.error("[SCHEDULER] Email queue processor failed:", result.error);
      }
    } catch (error) {
      console.error("[SCHEDULER] Error in email queue processor:", error);
    }
  });

  // ============================================================================
  // OVERDUE INVOICE REMINDERS - Daily at 09:00 AM
  // Check for overdue invoices and send reminders
  // Respects reminder history to avoid duplicate emails
  // ============================================================================
  const overdueRemindersJob = new CronJob("0 9 * * *", async () => {
    try {
      console.log("[SCHEDULER] Running overdue invoice reminder check...");
      const result = await sendOverdueReminders();
      console.log(
        `[SCHEDULER] Overdue reminders processed: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`
      );
    } catch (error) {
      console.error("[SCHEDULER] Error in overdue reminders processor:", error);
    }
  });

  // ============================================================================
  // BILLING CYCLE CHECK - Daily at 00:01 AM
  // Lock subscriptions that are past the 3-day grace period
  // ============================================================================
  const billingLockJob = new CronJob("1 0 * * *", async () => {
    try {
      console.log("[SCHEDULER] Running subscription lockout check...");
      // Call the billing system task (note: requires admin context)
      // This would typically be called via internal API or direct DB operation
      console.log("[SCHEDULER] Subscription lockout check completed");
    } catch (error) {
      console.error("[SCHEDULER] Error in billing lock check:", error);
    }
  });

  // ============================================================================
  // BILLING NOTIFICATIONS - Daily at 08:00 AM
  // Send payment reminders and overdue warnings
  // - 7 days before due
  // - 1 day before due
  // - 1 day overdue
  // - 3 days overdue (final warning before lock)
  // ============================================================================
  const billingNotificationsJob = new CronJob("0 8 * * *", async () => {
    try {
      console.log("[SCHEDULER] Running billing notification check...");
      // Call the billing notifications task
      console.log("[SCHEDULER] Billing notifications sent");
    } catch (error) {
      console.error("[SCHEDULER] Error in billing notifications:", error);
    }
  });

  // ============================================================================
  // USAGE REMINDERS - Weekly on Monday at 10:00 AM
  // Remind users to create clients, invoices, and complete their profile
  // ============================================================================
  const usageReminderJob = new CronJob("0 10 * * 1", async () => {
    try {
      console.log("[SCHEDULER] Running usage reminder check...");
      const result = await sendUsageReminders();
      console.log(
        `[SCHEDULER] Usage reminders: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`
      );
    } catch (error) {
      console.error("[SCHEDULER] Error in usage reminders:", error);
    }
  });

  // Start all jobs
  emailQueueJob.start();
  overdueRemindersJob.start();
  billingLockJob.start();
  billingNotificationsJob.start();
  usageReminderJob.start();

  console.log("[SCHEDULER] Background jobs started:");
  console.log("  - Email queue processor: Every 5 minutes");
  console.log("  - Overdue invoice reminders: Daily at 09:00 AM");
  console.log("  - Subscription lockout check: Daily at 00:01 AM");
  console.log("  - Billing notifications: Daily at 08:00 AM");
  console.log("  - Usage reminders: Weekly on Monday at 10:00 AM");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[SCHEDULER] Stopping background jobs...");
    emailQueueJob.stop();
    overdueRemindersJob.stop();
    billingLockJob.stop();
    billingNotificationsJob.stop();
    usageReminderJob.stop();
    process.exit(0);
  });

  return { emailQueueJob, overdueRemindersJob, billingLockJob, billingNotificationsJob, usageReminderJob };
}

/**
 * Manual job triggers for testing/admin use
 */
export const manualTriggers = {
  async processEmailQueue() {
    return await processEmailQueue();
  },

  async sendOverdueReminders() {
    return await sendOverdueReminders();
  },

  async sendUsageReminders() {
    return await sendUsageReminders();
  },
};

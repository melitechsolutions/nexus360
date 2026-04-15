/**
 * Job Scheduler Service
 * Manages scheduled background jobs, monitoring, and alerting
 * Supports cron-based scheduling, manual triggers, and health checks
 */

import * as CronJob from 'cron';
import * as db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { TRPCError } from '@trpc/server';

export interface ScheduledJobConfig {
  jobName: string;
  description?: string;
  jobType: string;
  cronExpression: string;
  handler: () => Promise<any>;
  isActive?: boolean;
  isManualOnly?: boolean;
  timezone?: string;
}

export interface JobExecutionResult {
  jobId: string;
  status: 'success' | 'failed' | 'partial' | 'timeout';
  duration: number;
  itemsProcessed: number;
  itemsFailed: number;
  errorMessage?: string;
  stdout?: string;
  stderr?: string;
}

class JobSchedulerService {
  private jobs: Map<string, CronJob.CronJob> = new Map();
  private jobHandlers: Map<string, () => Promise<any>> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize scheduler and load jobs from database
   */
  async initialize() {
    console.log('[JobScheduler] Initializing...');
    
    try {
      const database = await db.getDb();
      if (!database) {
        console.warn('[JobScheduler] Database not available - jobs will not be scheduled');
        return;
      }

      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
      const { eq } = await import('drizzle-orm');

      // Load active jobs from database
      const jobs = await database.select()
        .from(scheduledJobs)
        .where(eq(scheduledJobs.isActive, true));

      for (const job of jobs) {
        // Register standard job handlers
        const handler = this.getJobHandler(job.jobType);
        if (handler) {
          this.registerJob({
            jobName: job.jobName,
            description: job.description || undefined,
            jobType: job.jobType,
            cronExpression: job.cronExpression,
            handler,
            isActive: true,
            timezone: job.timezone || 'UTC',
          });
        }
      }

      // Start health check tick
      this.startHealthCheckTick();

      console.log(`[JobScheduler] Initialized with ${this.jobs.size} active jobs`);
    } catch (error) {
      console.error('[JobScheduler] Initialization error:', error);
    }
  }

  /**
   * Register a new scheduled job
   */
  registerJob(config: ScheduledJobConfig): { success: boolean; jobId?: string } {
    try {
      // Stop existing job if any
      if (this.jobs.has(config.jobName)) {
        const existing = this.jobs.get(config.jobName);
        existing?.stop();
        this.jobs.delete(config.jobName);
      }

      // Create and start cron job
      const cronJob = CronJob.CronJob.from({
        cronTime: config.cronExpression,
        onTick: () => this.executeJob(config.jobName, config.handler),
        start: config.isActive !== false,
        timeZone: config.timezone || 'UTC',
      });

      this.jobs.set(config.jobName, cronJob);
      this.jobHandlers.set(config.jobName, config.handler);

      console.log(`[JobScheduler] Registered job: ${config.jobName} (${config.cronExpression})`);
      return { success: true, jobId: config.jobName };
    } catch (error) {
      console.error(`[JobScheduler] Failed to register job ${config.jobName}:`, error);
      return { success: false };
    }
  }

  /**
   * Execute a job immediately
   */
  private async executeJob(jobName: string, handler: () => Promise<any>) {
    const database = await db.getDb();
    if (!database) {
      console.error('[JobScheduler] Database not available - cannot execute job');
      return;
    }

    const logId = uuidv4();
    const startTime = new Date();
    const jobExecutionLogs = (await import('../../drizzle/schema')).jobExecutionLogs;
    const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
    const { eq } = await import('drizzle-orm');

    try {
      console.log(`[JobScheduler] Executing job: ${jobName}`);

      // Get job ID
      const jobRecord = await database.select()
        .from(scheduledJobs)
        .where(eq(scheduledJobs.jobName, jobName))
        .limit(1);

      if (!jobRecord.length) {
        console.warn(`[JobScheduler] Job record not found: ${jobName}`);
        return;
      }

      const jobId = jobRecord[0].id;

      // Create execution log entry
      await database.insert(jobExecutionLogs).values({
        id: logId,
        jobId,
        status: 'running',
      });

      // Execute job with timeout (2 hours)
      const result = await Promise.race([
        handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Job execution timeout (2h)')), 2 * 60 * 60 * 1000)
        ),
      ]);

      const duration = Date.now() - startTime.getTime();

      // Update execution log
      await database.update(jobExecutionLogs)
        .set({
          status: 'success',
          duration,
          itemsProcessed: result?.itemsProcessed || 0,
          itemsFailed: result?.itemsFailed || 0,
          endTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          stdout: JSON.stringify(result, null, 2),
        })
        .where(eq(jobExecutionLogs.id, logId));

      // Update job metadata
      await database.update(scheduledJobs)
        .set({
          lastRunAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          lastRunStatus: 'success',
          lastRunDuration: duration,
          nextScheduledRun: this.getNextCronTime(jobName),
        })
        .where(eq(scheduledJobs.id, jobId));

      console.log(`[JobScheduler] Job completed: ${jobName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      const errorMsg = error instanceof Error ? error.message : String(error);

      console.error(`[JobScheduler] Job failed: ${jobName}`, error);

      // Update execution log
      await database.update(jobExecutionLogs)
        .set({
          status: 'failed',
          duration,
          endTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          errorMessage: errorMsg,
          stderr: errorMsg,
        })
        .where(eq(jobExecutionLogs.id, logId));

      // Update job metadata
      const jobRecord = await database.select()
        .from(scheduledJobs)
        .where(eq(scheduledJobs.jobName, jobName))
        .limit(1);

      if (jobRecord.length) {
        await database.update(scheduledJobs)
          .set({
            lastRunAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            lastRunStatus: 'failed',
            lastRunDuration: duration,
            lastFailureReason: errorMsg,
            nextScheduledRun: this.getNextCronTime(jobName),
          })
          .where(eq(scheduledJobs.id, jobRecord[0].id));

        // Trigger alerts if configured
        await this.triggerJobAlert(jobRecord[0].id, 'failure', errorMsg);
      }
    }
  }

  /**
   * Execute job manually
   */
  async executeJobManually(jobName: string): Promise<JobExecutionResult> {
    const handler = this.jobHandlers.get(jobName);
    if (!handler) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Job not found: ${jobName}`,
      });
    }

    const startTime = Date.now();
    try {
      await this.executeJob(jobName, handler);
      return {
        jobId: jobName,
        status: 'success',
        duration: Date.now() - startTime,
        itemsProcessed: 0,
        itemsFailed: 0,
      };
    } catch (error) {
      return {
        jobId: jobName,
        status: 'failed',
        duration: Date.now() - startTime,
        itemsProcessed: 0,
        itemsFailed: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get job execution history
   */
  async getJobHistory(jobId: string, limit: number = 10) {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database connection lost');

      const jobExecutionLogs = (await import('../../drizzle/schema')).jobExecutionLogs;
      const { eq, desc } = await import('drizzle-orm');

      const logs = await database.select()
        .from(jobExecutionLogs)
        .where(eq(jobExecutionLogs.jobId, jobId))
        .orderBy(desc(jobExecutionLogs.startTime))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error('[JobScheduler] History retrieval error:', error);
      return [];
    }
  }

  /**
   * Health check tick (runs every 5 minutes)
   */
  private startHealthCheckTick() {
    if (this.tickInterval) clearInterval(this.tickInterval);

    this.tickInterval = setInterval(async () => {
      try {
        await this.checkJobHealth();
      } catch (error) {
        console.error('[JobScheduler] Health check error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Check job health and trigger alerts
   */
  private async checkJobHealth() {
    try {
      const database = await db.getDb();
      if (!database) return;

      const jobHeartbeat = (await import('../../drizzle/schema')).jobHeartbeat;
      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
      const { eq } = await import('drizzle-orm');

      const heartbeats = await database.select().from(jobHeartbeat);

      for (const hb of heartbeats) {
        const jobRecord = await database.select()
          .from(scheduledJobs)
          .where(eq(scheduledJobs.id, hb.jobId))
          .limit(1);

        if (!jobRecord.length) continue;

        const expectedInterval = hb.expectedHeartbeatInterval || 86400; // Default 1 day
        const timeSinceLastHeartbeat = (Date.now() - new Date(hb.lastHeartbeatAt).getTime()) / 1000;

        if (timeSinceLastHeartbeat > expectedInterval) {
          // Job hasn't executed within expected interval
          const newConsecutiveFailures = (hb.consecutiveFailures || 0) + 1;

          await database.update(jobHeartbeat)
            .set({
              isHealthy: false,
              consecutiveFailures: newConsecutiveFailures,
            })
            .where(eq(jobHeartbeat.id, hb.id));

          // Trigger alert
          if (newConsecutiveFailures >= 2) {
            await this.triggerJobAlert(
              hb.jobId,
              'no_execution',
              `Job ${jobRecord[0].jobName} hasn't executed in ${timeSinceLastHeartbeat}s`
            );
          }
        }
      }
    } catch (error) {
      console.error('[JobScheduler] Health check failed:', error);
    }
  }

  /**
   * Trigger job alert
   */
  private async triggerJobAlert(jobId: string, alertType: string, message: string) {
    try {
      const database = await db.getDb();
      if (!database) return;

      const jobAlertRules = (await import('../../drizzle/schema')).jobAlertRules;
      const jobAlertHistory = (await import('../../drizzle/schema')).jobAlertHistory;
      const { eq, and } = await import('drizzle-orm');

      const rules = await database.select()
        .from(jobAlertRules)
        .where(
          and(
            eq(jobAlertRules.jobId, jobId),
            eq(jobAlertRules.isActive, true)
          )
        );

      for (const rule of rules) {
        // Log alert
        await database.insert(jobAlertHistory).values({
          id: uuidv4(),
          alertRuleId: rule.id,
          jobId,
          alert_type: alertType,
          message,
          recipients: rule.recipients,
        });

        // Send notification (email, SMS, webhook)
        console.log(`[JobScheduler] Alert triggered: ${alertType} for job ${jobId}`);

        if (rule.action === 'email' || rule.action === 'both') {
          // Queue email notification
          const emailService = await import('./emailService');
          const recipients = Array.isArray(rule.recipients) ? rule.recipients : [];
          for (const recipient of recipients) {
            await emailService.queueEmail({
              toEmail: recipient,
              subject: `[ALERT] Job Scheduler: ${alertType}`,
              htmlContent: `<p>${message}</p>`,
              relatedEntityType: 'job',
              relatedEntityId: jobId,
            });
          }
        }

        if (rule.action === 'sms' || rule.action === 'both') {
          // Queue SMS notification
          const smsService = await import('./smsService');
          const recipients = Array.isArray(rule.recipients) ? rule.recipients : [];
          for (const recipient of recipients) {
            await smsService.queueSms({
              phoneNumber: recipient,
              message: `Alert: ${alertType} - ${message}`,
              relatedEntityType: 'job',
              relatedEntityId: jobId,
            });
          }
        }
      }
    } catch (error) {
      console.error('[JobScheduler] Alert trigger error:', error);
    }
  }

  /**
   * Get next cron execution time
   */
  private getNextCronTime(jobName: string): Date {
    const job = this.jobs.get(jobName);
    if (!job) return new Date();
    
    return job.nextDate().toDate();
  }

  /**
   * Get job handler by type
   */
  private getJobHandler(jobType: string): (() => Promise<any>) | null {
    const handlers: Record<string, () => Promise<any>> = {
      recurringInvoice: async () => {
        const { generateDueRecurringInvoices } = await import('../jobs/recurringInvoicesJob');
        return generateDueRecurringInvoices();
      },

      recurringExpense: async () => {
        const { generateDueRecurringExpenses } = await import('../jobs/recurringExpensesJob');
        return generateDueRecurringExpenses();
      },

      overdue_invoices: async () => {
        const { markOverdueInvoices } = await import('../jobs/overdueInvoicesJob');
        return markOverdueInvoices();
      },

      payment_reminder: async () => {
        const { sendPaymentReminders } = await import('../jobs/invoiceReminders');
        return sendPaymentReminders();
      },

      email_queue: async () => {
        const emailService = await import('./emailService');
        return emailService.processEmailQueue(20);
      },

      sms_queue: async () => {
        const smsService = await import('./smsService');
        return smsService.processSmsQueue(20);
      },

      cleanup: async () => {
        console.log('[JobScheduler] Running cleanup job');
        return { itemsProcessed: 0 };
      },

      reconciliation: async () => {
        console.log('[JobScheduler] Running reconciliation job');
        return { itemsProcessed: 0 };
      },

      subscription_renewal: async () => {
        console.log('[JobScheduler] Running subscription renewal job');
        return { itemsProcessed: 0 };
      },
    };

    return handlers[jobType] || null;
  }

  /**
   * Get all jobs and their status
   */
  async getAllJobsStatus() {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database connection lost');

      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;

      const jobs = await database.select().from(scheduledJobs);

      return jobs.map((job) => ({
        id: job.id,
        name: job.jobName,
        type: job.jobType,
        isActive: job.isActive,
        cron: job.cronExpression,
        lastRun: job.lastRunAt,
        lastStatus: job.lastRunStatus,
        nextRun: job.nextScheduledRun,
        duration: job.lastRunDuration,
      }));
    } catch (error) {
      console.error('[JobScheduler] Get status error:', error);
      return [];
    }
  }

  /**
   * Shutdown scheduler
   */
  shutdown() {
    console.log('[JobScheduler] Shutting down...');
    
    // Stop all cron jobs
    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();

    // Stop health check tick
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    console.log('[JobScheduler] Stopped');
  }
}

// Singleton instance
const scheduler = new JobSchedulerService();

export default scheduler;
export const initializeScheduler = () => scheduler.initialize();
export const registerJob = (config: ScheduledJobConfig) => scheduler.registerJob(config);
export const executeJobManually = (jobName: string) => scheduler.executeJobManually(jobName);
export const getJobHistory = (jobId: string, limit?: number) =>
  scheduler.getJobHistory(jobId, limit);
export const getAllJobsStatus = () => scheduler.getAllJobsStatus();
export const shutdownScheduler = () => scheduler.shutdown();

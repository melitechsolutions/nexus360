/**
 * Job Scheduler Router
 * tRPC endpoints for job management, health monitoring, and alerting
 * 
 * Endpoints:
 * - schedulerRouter.listJobs() - List all scheduled jobs
 * - schedulerRouter.getJobDetails() - Get job details and execution stats
 * - schedulerRouter.triggerJobNow() - Manually trigger a job (admin only)
 * - schedulerRouter.getExecutionHistory() - View job execution history
 * - schedulerRouter.getHealthStatus() - Get scheduler health status
 * - schedulerRouter.getAlertRules() - View alert configuration (admin only)
 * - schedulerRouter.updateAlertRules() - Modify alert rules (admin only)
 * - schedulerRouter.getMetrics() - Get performance metrics
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import * as db from '../db';
import { and, eq, desc, gte, count } from 'drizzle-orm';

// Feature-restricted procedure for scheduler operations
const schedulerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User authentication required' });
  }
  return next({ ctx });
});

// Admin-only procedure for sensitive scheduler operations
const schedulerAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const schedulerRouter = router({
  /**
   * List all scheduled jobs
   */
  listJobs: schedulerProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
      const jobs = await database.select().from(scheduledJobs);

      return jobs.map((job) => ({
        jobId: job.id,
        jobName: job.jobName,
        jobType: job.jobType,
        description: job.description,
        cronExpression: job.cronExpression,
        timezone: job.timezone || 'UTC',
        isActive: job.isActive,
        isManualOnly: job.isManualOnly,
        lastExecutedAt: job.lastExecutedAt,
        nextExecutionAt: job.nextExecutionAt,
        failureCount: job.failureCount || 0,
      }));
    } catch (error) {
      console.error('[schedulerRouter] listJobs error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch jobs list',
      });
    }
  }),

  /**
   * Get job details with recent execution stats
   */
  getJobDetails: schedulerProcedure.input(
    z.object({
      jobId: z.string(),
    })
  ).query(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
      const jobLogs = (await import('../../drizzle/schema')).jobExecutionLogs;

      const jobRows = await database.select().from(scheduledJobs).where(eq(scheduledJobs.id, input.jobId)).limit(1);
      const job = jobRows[0];

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      // Get last 10 executions
      const recentExecutions = await database.select()
        .from(jobLogs)
        .where(eq(jobLogs.jobId, input.jobId))
        .orderBy(desc(jobLogs.executedAt))
        .limit(10);

      // Calculate stats
      const successCount = recentExecutions.filter((e) => e.status === 'success').length;
      const failureCount = recentExecutions.filter((e) => e.status === 'failed').length;
      const avgDuration = recentExecutions.length > 0
        ? recentExecutions.reduce((sum, e) => sum + (e.durationMs || 0), 0) / recentExecutions.length
        : 0;

      return {
        jobId: job.id,
        jobName: job.jobName,
        jobType: job.jobType,
        description: job.description,
        cronExpression: job.cronExpression,
        timezone: job.timezone || 'UTC',
        isActive: job.isActive,
        isManualOnly: job.isManualOnly,
        lastExecutedAt: job.lastExecutedAt,
        nextExecutionAt: job.nextExecutionAt,
        stats: {
          totalExecutions: recentExecutions.length,
          successCount,
          failureCount,
          successRate: recentExecutions.length > 0 ? (successCount / recentExecutions.length) * 100 : 0,
          averageDuration: Math.round(avgDuration),
          lastStatus: recentExecutions[0]?.status || 'unknown',
        },
        recentExecutions: recentExecutions.slice(0, 5).map((e) => ({
          executedAt: e.executedAt,
          status: e.status,
          durationMs: e.durationMs,
          itemsProcessed: e.itemsProcessed,
          itemsFailed: e.itemsFailed,
          errorMessage: e.errorMessage,
        })),
      };
    } catch (error) {
      console.error('[schedulerRouter] getJobDetails error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch job details',
      });
    }
  }),

  /**
   * Manually trigger a job execution (admin only)
   */
  triggerJobNow: schedulerAdminProcedure.input(
    z.object({
      jobId: z.string(),
    })
  ).mutation(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
      const [job] = await database.select().from(scheduledJobs).where(eq(scheduledJobs.id, input.jobId)).limit(1);

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      if (!job.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot trigger inactive job',
        });
      }

      // Execute the job based on jobName
      const jobLogs = (await import('../../drizzle/schema')).jobExecutionLogs;
      const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const startTime = Date.now();
      let jobResult: { success: boolean; itemsProcessed: number; itemsFailed: number; message: string; errors: string[] } = { success: false, itemsProcessed: 0, itemsFailed: 0, message: '', errors: [] };

      try {
        switch (job.jobName) {
          case 'generateRecurringExpenses': {
            const { generateDueRecurringExpenses } = await import('../jobs/recurringExpensesJob');
            const result = await generateDueRecurringExpenses();
            jobResult = { success: result.success, itemsProcessed: result.itemsProcessed, itemsFailed: result.itemsFailed, message: result.message, errors: result.errors };
            break;
          }
          case 'generateRecurringInvoices':
          case 'generateInvoices': {
            const { generateDueRecurringInvoices } = await import('../jobs/recurringInvoicesJob');
            const result = await generateDueRecurringInvoices();
            jobResult = { success: result.success, itemsProcessed: result.itemsProcessed || 0, itemsFailed: result.itemsFailed || 0, message: result.message, errors: result.errors || [] };
            break;
          }
          case 'markOverdueInvoices': {
            const { markOverdueInvoices } = await import('../jobs/overdueInvoicesJob');
            const result = await markOverdueInvoices();
            jobResult = { success: result.success, itemsProcessed: result.count || 0, itemsFailed: result.errors?.length || 0, message: result.message, errors: result.errors || [] };
            break;
          }
          case 'sendInvoiceReminders': {
            const { processInvoiceReminders } = await import('../jobs/invoiceReminders');
            await processInvoiceReminders();
            jobResult = { success: true, itemsProcessed: 1, itemsFailed: 0, message: 'Invoice reminders processed', errors: [] };
            break;
          }
          case 'sendUsageReminders': {
            const { sendUsageReminders } = await import('../jobs/usageReminders');
            const result = await sendUsageReminders();
            jobResult = { success: true, itemsProcessed: result.sent || 0, itemsFailed: result.errors || 0, message: `Usage reminders: ${result.sent} sent, ${result.skipped} skipped`, errors: [] };
            break;
          }
          default:
            jobResult = { success: false, itemsProcessed: 0, itemsFailed: 0, message: `Unknown job type: ${job.jobName}`, errors: [`No handler registered for job: ${job.jobName}`] };
        }

        const durationMs = Date.now() - startTime;

        // Log execution result
        await database.insert(jobLogs).values({
          id: logId,
          jobId: job.id,
          executedAt: new Date(),
          status: jobResult.success ? 'success' : 'failed',
          durationMs,
          itemsProcessed: jobResult.itemsProcessed,
          itemsFailed: jobResult.itemsFailed,
          errorMessage: jobResult.errors.length > 0 ? jobResult.errors.join('; ') : null,
          stdout: jobResult.message,
        } as any);

        // Update job's lastExecutedAt
        await database.update(scheduledJobs).set({ lastExecutedAt: new Date() } as any).where(eq(scheduledJobs.id, job.id));

        console.log(`[Scheduler] Job "${job.jobName}" completed: ${jobResult.message}`);
      } catch (execError: any) {
        const durationMs = Date.now() - startTime;
        await database.insert(jobLogs).values({
          id: logId,
          jobId: job.id,
          executedAt: new Date(),
          status: 'failed',
          durationMs,
          itemsProcessed: 0,
          itemsFailed: 1,
          errorMessage: execError?.message || 'Unknown execution error',
        } as any).catch(() => {});
        console.error(`[Scheduler] Job "${job.jobName}" failed:`, execError);
      }

      return {
        success: jobResult.success,
        message: jobResult.success ? `Job "${job.jobName}" completed: ${jobResult.message}` : `Job "${job.jobName}" failed: ${jobResult.message}`,
        jobId: job.id,
        itemsProcessed: jobResult.itemsProcessed,
        itemsFailed: jobResult.itemsFailed,
      };
    } catch (error) {
      console.error('[schedulerRouter] triggerJobNow error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to trigger job',
      });
    }
  }),

  /**
   * Get job execution history with filtering
   */
  getExecutionHistory: schedulerProcedure.input(
    z.object({
      jobId: z.string().optional(),
      status: z.enum(['success', 'failed', 'partial', 'timeout']).optional(),
      limit: z.number().max(500).default(100),
      offset: z.number().default(0),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
  ).query(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const jobLogs = (await import('../../drizzle/schema')).jobExecutionLogs;

      const conditions = [];
      if (input.jobId) conditions.push(eq(jobLogs.jobId, input.jobId));
      if (input.status) conditions.push(eq(jobLogs.status, input.status));
      if (input.startDate) conditions.push(gte(jobLogs.executedAt, input.startDate));
      if (input.endDate) conditions.push(gte(jobLogs.executedAt, input.endDate));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const records = await database.select()
        .from(jobLogs)
        .where(where)
        .orderBy(desc(jobLogs.executedAt))
        .limit(input.limit)
        .offset(input.offset);

      return records.map((log) => ({
        logId: log.id,
        jobId: log.jobId,
        executedAt: log.executedAt,
        status: log.status,
        durationMs: log.durationMs,
        itemsProcessed: log.itemsProcessed,
        itemsFailed: log.itemsFailed,
        errorMessage: log.errorMessage,
        stdout: log.stdout ? log.stdout.substring(0, 200) : null,
      }));
    } catch (error) {
      console.error('[schedulerRouter] getExecutionHistory error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch execution history',
      });
    }
  }),

  /**
   * Get overall scheduler health status
   */
  getHealthStatus: schedulerProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const scheduledJobs = (await import('../../drizzle/schema')).scheduledJobs;
      const jobHeartbeat = (await import('../../drizzle/schema')).jobHeartbeat;

      // Get active jobs count
      const activeJobsCount = await database.select({ count: count() })
        .from(scheduledJobs)
        .where(eq(scheduledJobs.isActive, true));

      // Get latest heartbeat
      const heartbeats = await database.select()
        .from(jobHeartbeat)
        .orderBy(desc(jobHeartbeat.checkedAt))
        .limit(1);

      const latestHeartbeat = heartbeats[0];
      const isHealthy = latestHeartbeat && (Date.now() - latestHeartbeat.checkedAt.getTime()) < 5 * 60 * 1000; // 5 minutes

      // Get recent failures
      const jobLogs = (await import('../../drizzle/schema')).jobExecutionLogs;
      const recentFailures = await database.select({ count: count() })
        .from(jobLogs)
        .where(
          and(
            eq(jobLogs.status, 'failed'),
            gte(jobLogs.executedAt, new Date(Date.now() - 1 * 60 * 60 * 1000)) // Last hour
          )
        );

      return {
        isHealthy,
        statusMessage: isHealthy ? 'Scheduler running normally' : 'Scheduler health check stale',
        activeJobsCount: activeJobsCount[0]?.count || 0,
        lastHeartbeatAt: latestHeartbeat?.checkedAt,
        recentFailuresLastHour: recentFailures[0]?.count || 0,
        uptime: latestHeartbeat ? Date.now() - latestHeartbeat.checkedAt.getTime() : null,
      };
    } catch (error) {
      console.error('[schedulerRouter] getHealthStatus error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch health status',
      });
    }
  }),

  /**
   * Get alert rules configuration (admin only)
   */
  getAlertRules: schedulerAdminProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const alertRules = (await import('../../drizzle/schema')).jobAlertRules;
      const rules = await database.select().from(alertRules);

      return rules.map((rule) => ({
        ruleId: rule.id,
        jobId: rule.jobId,
        triggerCondition: rule.triggerCondition,
        failureThreshold: rule.failureThreshold,
        durationThresholdMs: rule.durationThresholdMs,
        notificationChannels: rule.notificationChannels as string[],
        isActive: rule.isActive,
        createdAt: rule.createdAt,
      }));
    } catch (error) {
      console.error('[schedulerRouter] getAlertRules error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch alert rules',
      });
    }
  }),

  /**
   * Update alert rules (admin only)
   */
  updateAlertRules: schedulerAdminProcedure.input(
    z.object({
      ruleId: z.string(),
      triggerCondition: z.enum(['on_failure', 'on_duration_threshold', 'on_multiple_failures']).optional(),
      failureThreshold: z.number().min(1).max(10).optional(),
      durationThresholdMs: z.number().min(1000).optional(),
      notificationChannels: z.array(z.enum(['email', 'sms', 'slack', 'webhook'])).optional(),
      isActive: z.boolean().optional(),
    })
  ).mutation(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const alertRules = (await import('../../drizzle/schema')).jobAlertRules;
      const [rule] = await database.select().from(alertRules).where(eq(alertRules.id, input.ruleId)).limit(1);

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Alert rule not found',
        });
      }

      await database.update(alertRules)
        .set({
          triggerCondition: input.triggerCondition ?? rule.triggerCondition,
          failureThreshold: input.failureThreshold ?? rule.failureThreshold,
          durationThresholdMs: input.durationThresholdMs ?? rule.durationThresholdMs,
          notificationChannels: input.notificationChannels ?? rule.notificationChannels,
          isActive: input.isActive ?? rule.isActive,
        })
        .where(eq(alertRules.id, input.ruleId));

      return {
        success: true,
        message: 'Alert rule updated successfully',
      };
    } catch (error) {
      console.error('[schedulerRouter] updateAlertRules error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update alert rules',
      });
    }
  }),

  /**
   * Get scheduler performance metrics
   */
  getMetrics: schedulerProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const jobLogs = (await import('../../drizzle/schema')).jobExecutionLogs;

      // Last 24 hours stats
      const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const logsLastDay = await database.select()
        .from(jobLogs)
        .where(gte(jobLogs.executedAt, lastDay));

      const successCount = logsLastDay.filter((e) => e.status === 'success').length;
      const failureCount = logsLastDay.filter((e) => e.status === 'failed').length;
      const avgDuration = logsLastDay.length > 0
        ? logsLastDay.reduce((sum, e) => sum + (e.durationMs || 0), 0) / logsLastDay.length
        : 0;

      // Last 7 days trend
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const logsLast7Days = await database.select()
        .from(jobLogs)
        .where(gte(jobLogs.executedAt, last7Days));

      return {
        lastTwentyFourHours: {
          totalExecutions: logsLastDay.length,
          successCount,
          failureCount,
          successRate: logsLastDay.length > 0 ? (successCount / logsLastDay.length) * 100 : 0,
          averageDurationMs: Math.round(avgDuration),
        },
        last7Days: {
          totalExecutions: logsLast7Days.length,
          averageExecutionsPerDay: Math.round(logsLast7Days.length / 7),
          successRate: logsLast7Days.length > 0
            ? (logsLast7Days.filter((e) => e.status === 'success').length / logsLast7Days.length) * 100
            : 0,
        },
        topFailingJobs: [], // Placeholder - calculate from data if needed
      };
    } catch (error) {
      console.error('[schedulerRouter] getMetrics error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch metrics',
      });
    }
  }),
});

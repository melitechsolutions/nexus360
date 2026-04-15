/**
 * Email Router
 * tRPC endpoints for email queue management, templates, and delivery tracking
 * 
 * Endpoints:
 * - emailRouter.queueEmail() - Queue a new email
 * - emailRouter.getQueueStatus() - Check email queue status
 * - emailRouter.getEmailTemplates() - List available templates
 * - emailRouter.sendEmailTemplate() - Send email using template
 * - emailRouter.getDeliveryHistory() - View email delivery history
 * - emailRouter.getQueueStats() - Admin dashboard statistics
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router, publicProcedure } from '../_core/trpc';
import * as emailService from '../services/emailService';
import * as db from '../db';
import { and, eq, desc, gte, sql } from 'drizzle-orm';

// Feature-restricted procedure for email operations
const emailProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User authentication required' });
  }
  return next({ ctx });
});

// Admin-only procedure for email management
const emailAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const emailRouter = router({
  /**
   * Queue an email for sending
   * Supports immediate send or queued delivery
   */
  queueEmail: emailProcedure.input(
    z.object({
      toEmail: z.string().email('Invalid email address'),
      subject: z.string().min(1, 'Subject required'),
      htmlContent: z.string().optional(),
      plainTextContent: z.string().optional(),
      templateId: z.string().optional(),
      templateVariables: z.record(z.string(), z.any()).optional(),
      relatedEntityType: z.enum(['invoice', 'receipt', 'payment', 'quote', 'ticket']).optional(),
      relatedEntityId: z.string().optional(),
      sendImmediately: z.boolean().default(false),
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      if (!input.htmlContent && !input.templateId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either htmlContent or templateId required',
        });
      }

      if (input.sendImmediately) {
        // Send immediately
        const result = await emailService.sendEmailImmediately({
          toEmail: input.toEmail,
          subject: input.subject,
          htmlContent: input.htmlContent,
          plainTextContent: input.plainTextContent,
          templateId: input.templateId,
          templateVariables: input.templateVariables,
        });

        return {
          success: true,
          queued: false,
          messageId: result.messageId,
        };
      } else {
        // Queue for later sending
        const result = await emailService.queueEmail({
          toEmail: input.toEmail,
          subject: input.subject,
          htmlContent: input.htmlContent,
          plainTextContent: input.plainTextContent,
          templateId: input.templateId,
          templateVariables: input.templateVariables,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        });

        return {
          success: true,
          queued: true,
          queueId: result.queueId,
        };
      }
    } catch (error) {
      console.error('[emailRouter] queueEmail error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to queue email',
      });
    }
  }),

  /**
   * Check email queue status for a specific email
   */
  getQueueStatus: emailProcedure.input(
    z.object({
      queueId: z.string(),
    })
  ).query(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;
      const [record] = await database.select().from(emailQueue).where(eq(emailQueue.id, input.queueId)).limit(1);

      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email queue record not found',
        });
      }

      return {
        queueId: record.id,
        status: record.status,
        toEmail: record.toEmail,
        subject: record.subject,
        createdAt: record.createdAt,
        sentAt: record.sentAt,
        failureReason: record.failureReason,
        retryCount: record.retryCount,
        nextRetryAt: record.nextRetryAt,
      };
    } catch (error) {
      console.error('[emailRouter] getQueueStatus error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch queue status',
      });
    }
  }),

  /**
   * Get list of available email templates
   */
  getEmailTemplates: emailProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const emailTemplates = (await import('../../drizzle/schema')).emailTemplates;
      const templates = await database.select().from(emailTemplates);

      return templates.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        description: t.description,
        variables: t.variables as string[],
        createdAt: t.createdAt,
      }));
    } catch (error) {
      console.error('[emailRouter] getEmailTemplates error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch templates',
      });
    }
  }),

  /**
   * Send email using a template
   */
  sendEmailTemplate: emailProcedure.input(
    z.object({
      toEmail: z.string().email(),
      templateId: z.string(),
      templateVariables: z.record(z.string(), z.any()),
      relatedEntityType: z.enum(['invoice', 'receipt', 'payment', 'quote', 'ticket']).optional(),
      relatedEntityId: z.string().optional(),
      sendImmediately: z.boolean().default(true),
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const emailTemplates = (await import('../../drizzle/schema')).emailTemplates;
      const templateRows = await database.select().from(emailTemplates).where(eq(emailTemplates.id, input.templateId)).limit(1);
      const template = templateRows[0];

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email template not found',
        });
      }

      if (input.sendImmediately) {
        const result = await emailService.sendEmailImmediately({
          toEmail: input.toEmail,
          subject: template.subject,
          htmlContent: template.htmlContent,
          templateVariables: input.templateVariables,
          templateId: input.templateId,
        });

        return {
          success: true,
          queued: false,
          messageId: result.messageId,
        };
      } else {
        const result = await emailService.queueEmail({
          toEmail: input.toEmail,
          subject: template.subject,
          templateId: input.templateId,
          templateVariables: input.templateVariables,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        });

        return {
          success: true,
          queued: true,
          queueId: result.queueId,
        };
      }
    } catch (error) {
      console.error('[emailRouter] sendEmailTemplate error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send email',
      });
    }
  }),

  /**
   * Get email delivery history
   */
  getDeliveryHistory: emailProcedure.input(
    z.object({
      limit: z.number().max(200).default(50),
      offset: z.number().default(0),
      status: z.enum(['pending', 'sending', 'delivered', 'failed']).optional(),
      relatedEntityId: z.string().optional(),
    })
  ).query(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;
      const where = and(
        input.status ? eq(emailQueue.status, input.status) : undefined,
        input.relatedEntityId ? eq(emailQueue.relatedEntityId, input.relatedEntityId) : undefined
      );

      const records = await database.select()
        .from(emailQueue)
        .where(where)
        .orderBy(desc(emailQueue.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return records.map((r) => ({
        queueId: r.id,
        toEmail: r.toEmail,
        subject: r.subject,
        status: r.status,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
        failureReason: r.failureReason,
        retryCount: r.retryCount,
      }));
    } catch (error) {
      console.error('[emailRouter] getDeliveryHistory error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch delivery history',
      });
    }
  }),

  /**
   * Get email queue statistics (admin only)
   */
  getQueueStats: emailAdminProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;
      const { eq, count, ne } = await import('drizzle-orm');

      // Get counts by status
      const stats = await database.select({
        status: emailQueue.status,
        count: count(),
      })
        .from(emailQueue)
        .groupBy(emailQueue.status);

      // Get yesterday's stats
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayStats = await database.select({
        count: count(),
      })
        .from(emailQueue)
        .where(gte(emailQueue.createdAt, yesterday));

      const statusMap = Object.fromEntries(
        stats.map((s) => [s.status, s.count])
      );

      return {
        pending: statusMap['pending'] || 0,
        sending: statusMap['sending'] || 0,
        delivered: statusMap['delivered'] || 0,
        failed: statusMap['failed'] || 0,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        totalLastDay: yesterdayStats[0]?.count || 0,
        averageRetries: 2.5, // Placeholder - calculate from actual data
      };
    } catch (error) {
      console.error('[emailRouter] getQueueStats error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch queue statistics',
      });
    }
  }),

  /**
   * Retry sending a failed email (admin only)
   */
  retryEmail: emailAdminProcedure.input(
    z.object({
      queueId: z.string(),
    })
  ).mutation(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;
      const [record] = await database.select().from(emailQueue).where(eq(emailQueue.id, input.queueId)).limit(1);

      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email queue record not found',
        });
      }

      // Reset status to pending for retry
      await database.update(emailQueue)
        .set({
          status: 'pending',
          nextRetryAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          retryCount: (record.retryCount || 0) + 1,
        })
        .where(eq(emailQueue.id, input.queueId));

      return {
        success: true,
        message: 'Email queued for retry',
      };
    } catch (error) {
      console.error('[emailRouter] retryEmail error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retry email',
      });
    }
  }),
});

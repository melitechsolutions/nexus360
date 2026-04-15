/**
 * SMS Router
 * tRPC endpoints for SMS queue management, delivery tracking, and customer preferences
 * 
 * Endpoints:
 * - smsRouter.queueSms() - Queue a new SMS
 * - smsRouter.getQueueStatus() - Check SMS queue status
 * - smsRouter.getDeliveryHistory() - View SMS delivery history
 * - smsRouter.getCustomerPreferences() - Get customer SMS preferences
 * - smsRouter.updatePreferences() - Update opt-in/out preferences
 * - smsRouter.getQueueStats() - Admin dashboard statistics
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import * as smsService from '../services/smsService';
import * as db from '../db';
import { and, eq, desc, gte, count } from 'drizzle-orm';
import { smsQueue, smsCustomerPreferences } from '../../drizzle/schema';

// Feature-restricted procedure for SMS operations
const smsProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User authentication required' });
  }
  return next({ ctx });
});

// Admin-only procedure for SMS management
const smsAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const smsRouter = router({
  /**
   * Queue an SMS for sending
   */
  queueSms: smsProcedure.input(
    z.object({
      phoneNumber: z.string().regex(
        /^(?:\+254|254|0)[1-9]\d{8,9}$/,
        'Invalid Kenyan phone number format'
      ),
      message: z.string().min(1, 'Message required').max(160, 'Message too long'),
      relatedEntityType: z.enum(['invoice', 'receipt', 'payment', 'quote', 'ticket']).optional(),
      relatedEntityId: z.string().optional(),
      sendImmediately: z.boolean().default(true),
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      // Validate phone number format
      if (!input.phoneNumber.match(/^(?:\+254|254|0)[1-9]\d{8,9}$/)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Kenyan phone number',
        });
      }

      // Normalize phone number to +254 format
      let normalizedPhone = input.phoneNumber;
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.slice(1);
      } else if (normalizedPhone.startsWith('254')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      if (input.sendImmediately) {
        // Send immediately
        const result = await smsService.sendSmsImmediately({
          phoneNumber: normalizedPhone,
          message: input.message,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        });

        return {
          success: result.success,
          queued: false,
          statusCode: result.statusCode,
        };
      } else {
        // Queue for later sending
        const result = await smsService.queueSms({
          phoneNumber: normalizedPhone,
          message: input.message,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        });

        return {
          success: result.success,
          queued: true,
          queueId: result.queueId,
        };
      }
    } catch (error) {
      console.error('[smsRouter] queueSms error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to queue SMS',
      });
    }
  }),

  /**
   * Check SMS queue status
   */
  getQueueStatus: smsProcedure.input(
    z.object({
      queueId: z.string(),
    })
  ).query(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const records = await database.select().from(smsQueue).where(eq(smsQueue.id, input.queueId)).limit(1);
      const record = records[0] || null;

      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SMS queue record not found',
        });
      }

      return {
        queueId: record.id,
        status: record.status,
        phoneNumber: record.phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
        message: record.message.substring(0, 50) + (record.message.length > 50 ? '...' : ''),
        createdAt: record.createdAt,
        sentAt: record.sentAt,
        failureReason: record.failureReason,
        retryCount: record.retryCount,
      };
    } catch (error) {
      console.error('[smsRouter] getQueueStatus error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch queue status',
      });
    }
  }),

  /**
   * Get SMS delivery history
   */
  getDeliveryHistory: smsProcedure.input(
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

            const where = and(
        input.status ? eq(smsQueue.status, input.status) : undefined,
        input.relatedEntityId ? eq(smsQueue.relatedEntityId, input.relatedEntityId) : undefined
      );

      const records = await database.select()
        .from(smsQueue)
        .where(where)
        .orderBy(desc(smsQueue.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return records.map((r) => ({
        queueId: r.id,
        phoneNumber: r.phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone for privacy
        status: r.status,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
        failureReason: r.failureReason,
        retryCount: r.retryCount,
      }));
    } catch (error) {
      console.error('[smsRouter] getDeliveryHistory error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch delivery history',
      });
    }
  }),

  /**
   * Get customer SMS preferences
   */
  getCustomerPreferences: smsProcedure.input(
    z.object({
      phoneNumber: z.string().regex(
        /^(?:\+254|254|0)[1-9]\d{8,9}$/,
        'Invalid phone number'
      ),
    })
  ).query(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      // Normalize phone number
      let normalizedPhone = input.phoneNumber;
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.slice(1);
      } else if (normalizedPhone.startsWith('254')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      const records = await database.select().from(smsCustomerPreferences)
        .where(eq(smsCustomerPreferences.phoneNumber, normalizedPhone))
        .limit(1);
      const record = records[0] || null;

      if (!record) {
        // Return default preferences
        return {
          phoneNumber: normalizedPhone,
          optedIn: true,
          marketingOptedIn: false,
          transactionalOptedIn: true,
          reminderPreferences: {
            invoices: true,
            payments: true,
            receipts: true,
          },
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
      }

      return {
        phoneNumber: record.phoneNumber,
        optedIn: record.optedIn,
        marketingOptedIn: record.marketingOptedIn,
        transactionalOptedIn: record.transactionalOptedIn,
        reminderPreferences: record.reminderPreferences as Record<string, boolean>,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      console.error('[smsRouter] getCustomerPreferences error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch customer preferences',
      });
    }
  }),

  /**
   * Update customer SMS preferences
   */
  updatePreferences: smsProcedure.input(
    z.object({
      phoneNumber: z.string().regex(/^(?:\+254|254|0)[1-9]\d{8,9}$/, 'Invalid phone number'),
      optedIn: z.boolean().optional(),
      marketingOptedIn: z.boolean().optional(),
      transactionalOptedIn: z.boolean().optional(),
      reminderPreferences: z.object({
        invoices: z.boolean().optional(),
        payments: z.boolean().optional(),
        receipts: z.boolean().optional(),
      }).optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      // Normalize phone number
      let normalizedPhone = input.phoneNumber;
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.slice(1);
      } else if (normalizedPhone.startsWith('254')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      // Check if record exists
      const existingRecords = await database.select().from(smsCustomerPreferences)
        .where(eq(smsCustomerPreferences.phoneNumber, normalizedPhone))
        .limit(1);
      const existing = existingRecords[0] || null;

      if (existing) {
        await database.update(smsCustomerPreferences)
          .set({
            optedIn: input.optedIn ?? existing.optedIn,
            marketingOptedIn: input.marketingOptedIn ?? existing.marketingOptedIn,
            transactionalOptedIn: input.transactionalOptedIn ?? existing.transactionalOptedIn,
            reminderPreferences: input.reminderPreferences
              ? { ...(existing.reminderPreferences as any), ...input.reminderPreferences }
              : existing.reminderPreferences,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(smsCustomerPreferences.phoneNumber, normalizedPhone));
      } else {
        // Create new preference record
        const crypto = await import('crypto');
        await database.insert(smsCustomerPreferences).values({
          id: crypto.randomUUID(),
          phoneNumber: normalizedPhone,
          optedIn: input.optedIn ?? true,
          marketingOptedIn: input.marketingOptedIn ?? false,
          transactionalOptedIn: input.transactionalOptedIn ?? true,
          reminderPreferences: input.reminderPreferences || {
            invoices: true,
            payments: true,
            receipts: true,
          },
        });
      }

      return {
        success: true,
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      console.error('[smsRouter] updatePreferences error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update preferences',
      });
    }
  }),

  /**
   * Get SMS queue statistics (admin only)
   */
  getQueueStats: smsAdminProcedure.query(async () => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

            // Get counts by status
      const stats = await database.select({
        status: smsQueue.status,
        count: count(),
      })
        .from(smsQueue)
        .groupBy(smsQueue.status);

      // Get yesterday's stats
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayStats = await database.select({
        count: count(),
      })
        .from(smsQueue)
        .where(gte(smsQueue.createdAt, yesterday));

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
        provider: process.env.SMS_PROVIDER || 'africa_talking',
      };
    } catch (error) {
      console.error('[smsRouter] getQueueStats error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch queue statistics',
      });
    }
  }),

  /**
   * Retry sending a failed SMS (admin only)
   */
  retrySms: smsAdminProcedure.input(
    z.object({
      queueId: z.string(),
    })
  ).mutation(async ({ input }) => {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database unavailable');

      const records = await database.select().from(smsQueue).where(eq(smsQueue.id, input.queueId)).limit(1);
      const record = records[0] || null;

      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SMS queue record not found',
        });
      }

      // Reset status to pending for retry
      await database.update(smsQueue)
        .set({
          status: 'pending',
          nextRetryAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          retryCount: (record.retryCount || 0) + 1,
        })
        .where(eq(smsQueue.id, input.queueId));

      return {
        success: true,
        message: 'SMS queued for retry',
      };
    } catch (error) {
      console.error('[smsRouter] retrySms error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retry SMS',
      });
    }
  }),
});

/**
 * Enhanced Notifications Router
 * Multi-channel notification delivery (in-app, email, SMS, Slack)
 */

import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { notifications, emailGenerationHistory } from "../../drizzle/schema";
import { eq, and, isNull, desc, gt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  broadcastNotification,
  broadcastNotificationRead,
  broadcastNotificationDeleted,
  broadcastUnreadCountChanged,
  notificationsSubscription,
} from "../websocket/notificationBroadcaster";
import { notificationService } from "../services/notificationService";

const notificationProcedure = createFeatureRestrictedProcedure("notifications:read");
const notificationCreateProcedure = createFeatureRestrictedProcedure("notifications:create");
const notificationEditProcedure = createFeatureRestrictedProcedure("notifications:edit");
const notificationDeleteProcedure = createFeatureRestrictedProcedure("notifications:delete");

export const notificationsRouter = router({
  /**
   * Get user's unread notifications
   */
  unread: notificationProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const results = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, 0)),
      )
      .orderBy(desc(notifications.createdAt));

    return results;
  }),

  /**
   * Get paginated user notifications with filtering
   */
  list: notificationProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
        category: z.string().optional(),
        type: z.enum(["info", "success", "warning", "error", "reminder"]).optional(),
        priority: z.enum(["low", "normal", "high"]).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0 };

      const whereConditions: any[] = [eq(notifications.userId, ctx.user.id)];

      if (input.unreadOnly) {
        whereConditions.push(eq(notifications.isRead, 0));
      }

      if (input.category) {
        whereConditions.push(eq(notifications.category, input.category));
      }

      if (input.type) {
        whereConditions.push(eq(notifications.type, input.type));
      }

      if (input.priority) {
        whereConditions.push(eq(notifications.priority, input.priority));
      }

      const whereClause = and(...whereConditions);

      // Get total count
      const allResults = await db.select().from(notifications).where(whereClause);
      const total = allResults.length;

      // Get paginated results
      const results = await db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { data: results, total };
    }),

  /**
   * Get unread notification count
   */
  unreadCount: notificationProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, 0)),
      );

    return result.length;
  }),

  /**
   * Mark single notification as read
   */
  markAsRead: notificationEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        })
        .where(
          and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)),
        );

      broadcastNotificationRead(ctx.user.id, input.id);
      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: notificationEditProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      })
      .where(
        and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, 0)),
      );

    broadcastUnreadCountChanged(ctx.user.id, 0);
    return { success: true };
  }),

  /**
   * Send multi-channel notification
   */
  send: notificationCreateProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.enum(["info", "success", "warning", "error", "reminder"]).default("info"),
        category: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        actionUrl: z.string().optional(),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        channels: z.array(z.enum(["in-app", "email", "sms", "slack"])).default(["in-app"]),
        emailData: z
          .object({
            to: z.string().email(),
            subject: z.string(),
            htmlContent: z.string(),
          })
          .optional(),
        smsData: z
          .object({
            phoneNumber: z.string(),
            message: z.string(),
          })
          .optional(),
        slackData: z
          .object({
            channel: z.string(),
            message: z.string(),
          })
          .optional(),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await notificationService.send({
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        category: input.category || "general",
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
        priority: input.priority,
        channels: input.channels,
        emailData: input.emailData,
        smsData: input.smsData,
        slackData: input.slackData,
        expiresAt: input.expiresAt,
      });

      return result;
    }),

  /**
   * Delete single notification
   */
  delete: notificationDeleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(eq(notifications.id, input), eq(notifications.userId, ctx.user.id)),
        );

      broadcastNotificationDeleted(ctx.user.id, input);
      return { success: true };
    }),

  /**
   * Delete all read notifications
   */
  deleteRead: notificationDeleteProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(notifications)
      .where(
        and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, 1)),
      );

    return { success: true };
  }),

  /**
   * Delete all expired notifications
   */
  deleteExpired: notificationDeleteProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          gt(notifications.expiresAt, now),
        ),
      );

    return { success: true };
  }),

  /**
   * Get notifications by category
   */
  byCategory: notificationProcedure
    .input(
      z.object({
        category: z.string(),
        unreadOnly: z.boolean().default(false),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const whereConditions: any[] = [
        eq(notifications.userId, ctx.user.id),
        eq(notifications.category, input.category),
      ];

      if (input.unreadOnly) {
        whereConditions.push(eq(notifications.isRead, 0));
      }

      return await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);
    }),

  /**
   * Get notifications by type
   */
  byType: notificationProcedure
    .input(
      z.object({
        type: z.enum(["info", "success", "warning", "error", "reminder"]),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.type, input.type),
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);
    }),

  /**
   * Get high-priority notifications
   */
  highPriority: notificationProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.priority, "high"),
          eq(notifications.isRead, 0),
        ),
      )
      .orderBy(desc(notifications.createdAt));
  }),

  /**
   * Get notification by ID with full details
   */
  getById: notificationProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(notifications)
        .where(
          and(eq(notifications.id, input), eq(notifications.userId, ctx.user.id)),
        );

      return result[0] || null;
    }),

  /**
   * Get email send history
   */
  emailHistory: notificationProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(emailGenerationHistory)
        .where(eq(emailGenerationHistory.userId, ctx.user.id))
        .orderBy(desc(emailGenerationHistory.sentAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /**
   * Resend notification via different channel
   */
  resendVia: notificationCreateProcedure
    .input(
      z.object({
        notificationId: z.string(),
        channel: z.enum(["email", "sms", "slack"]),
        recipient: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get original notification
      const originalNotif = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.notificationId));

      if (!originalNotif[0]) {
        throw new Error("Notification not found");
      }

      const notif = originalNotif[0];

      // Resend via specified channel
      if (input.channel === "email" && recipient) {
        return await notificationService.sendEmail(
          input.recipient || "",
          notif.title,
          notif.message,
          notif.userId,
        );
      } else if (input.channel === "sms" && input.recipient) {
        return await notificationService.sendSms(input.recipient, notif.message);
      } else if (input.channel === "slack") {
        return await notificationService.sendSlack(notif.message);
      }

      return { success: false, error: "Invalid channel or missing recipient" };
    }),

  /**
   * Subscribe to real-time notification updates
   */
  onNotification: notificationsSubscription,
});

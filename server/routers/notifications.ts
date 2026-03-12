import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { 
  broadcastNotification, 
  broadcastNotificationRead, 
  broadcastNotificationDeleted, 
  broadcastUnreadCountChanged,
  notificationsSubscription 
} from "../websocket/notificationBroadcaster";

export const notificationsRouter = router({
  /**
   * Get user's unread notifications
   */
  unread: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const results = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, 0)
        )
      )
      .orderBy(desc(notifications.createdAt));

    return results;
  }),

  /**
   * Get user's notifications with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        unreadOnly: z.boolean().default(false),
        category: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const whereConditions: any[] = [eq(notifications.userId, ctx.user.id)];

      if (input.unreadOnly) {
        whereConditions.push(eq(notifications.isRead, 0));
      }

      if (input.category) {
        whereConditions.push(eq(notifications.type, input.category));
      }

      const results = await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /**
   * Get count of unread notifications
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, 0)
        )
      );

    return result.length;
  }),

  /**
   * Mark notification as read
   */
  markAsRead: createFeatureRestrictedProcedure("notifications:edit")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );

      // Broadcast read event
      broadcastNotificationRead(ctx.user.id, input.id);

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: createFeatureRestrictedProcedure("notifications:edit").mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, 0)
        )
      );

    // Broadcast count change
    broadcastUnreadCountChanged(ctx.user.id, 0);

    return { success: true };
  }),

  /**
   * Create notification (internal use by other routers)
   */
  create: createFeatureRestrictedProcedure("notifications:create")
    .input(
      z.object({
        userId: z.string(),
        title: z.string(),
        message: z.string(),
        type: z
          .enum(["info", "success", "warning", "error", "reminder"])
          .default("info"),
        category: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        actionUrl: z.string().optional(),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = uuidv4();

      const notificationData = {
        id,
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        category: input.category,
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
        priority: input.priority,
        expiresAt: input.expiresAt?.toISOString(),
        isRead: 0,
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      await db.insert(notifications).values(notificationData as any);

      // Broadcast notification to subscribed clients
      broadcastNotification(input.userId, notificationData as any);
      broadcastUnreadCountChanged(input.userId, 1); // Increment unread count

      return { id };
    }),

  /**
   * Delete notification
   */
  delete: createFeatureRestrictedProcedure("notifications:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input),
            eq(notifications.userId, ctx.user.id)
          )
        );

      // Broadcast delete event
      broadcastNotificationDeleted(ctx.user.id, input);

      return { success: true };
    }),

  /**
   * Delete all read notifications
   */
  deleteRead: createFeatureRestrictedProcedure("notifications:delete").mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, 1)
        )
      );

    return { success: true };
  }),

  /**
   * Get notifications by category
   */
  byCategory: createFeatureRestrictedProcedure("notifications:read")
    .input(
      z.object({
        category: z.string(),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      let query: any = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.category, input.category)
          )
        );

      if (input.unreadOnly) {
        query = query.where(eq(notifications.isRead, 0));
      }

      return await query.orderBy(desc(notifications.createdAt));
    }),

  /**
   * Subscribe to real-time notification updates
   */
  onNotification: notificationsSubscription,
});

import { z } from "zod";
import { protectedProcedure, router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb, getPool } from "../db";
import { staffChatMessages, staffChatChannels, users } from "../../drizzle/schema";
import { eq, desc, like, or, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

// Define typed procedures
const createProcedure = createFeatureRestrictedProcedure("chat:send");
const readProcedure = createFeatureRestrictedProcedure("chat:read");
const deleteProcedure = createFeatureRestrictedProcedure("chat:delete");

export const staffChatRouter = router({
  // ===== CHANNEL MANAGEMENT =====

  // Create a channel (team or private)
  createChannel: createProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      type: z.enum(["team", "private"]),
      description: z.string().max(255).optional(),
      members: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const channelId = uuidv4();
      // Always include the creator as a member
      const memberList = Array.from(new Set([ctx.user.id, ...input.members]));

      // For private chats, check if one already exists between these two users
      if (input.type === "private" && memberList.length === 2) {
        const existing = await db.select().from(staffChatChannels).where(
          and(eq(staffChatChannels.type, "private"), eq(staffChatChannels.isActive, 1))
        );
        const found = existing.find((ch: any) => {
          const chMembers = (ch.members as string[]) || [];
          return chMembers.length === 2 && memberList.every(m => chMembers.includes(m));
        });
        if (found) return found;
      }

      await db.insert(staffChatChannels).values({
        id: channelId,
        name: input.name,
        type: input.type,
        description: input.description ?? null,
        members: memberList,
        createdBy: ctx.user.id,
        isActive: 1,
      });

      const rows = await db.select().from(staffChatChannels).where(eq(staffChatChannels.id, channelId)).limit(1);
      return rows[0];
    }),

  // List channels the user belongs to (+ "general" always)
  listChannels: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const allChannels = await db.select().from(staffChatChannels).where(eq(staffChatChannels.isActive, 1));
    const myChannels = allChannels.filter((ch: any) => {
      const members = (ch.members as string[]) || [];
      return ch.type === "team" || members.includes(ctx.user.id);
    });

    // Prepend the virtual "general" channel
    return [
      { id: "general", name: "General Chat", type: "general", description: "Open channel for all staff", members: [], createdBy: "system", isActive: 1, createdAt: null, updatedAt: null },
      ...myChannels,
    ];
  }),

  // Update channel
  updateChannel: createProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(255).optional(),
      members: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.members) updates.members = input.members;

      await db.update(staffChatChannels).set(updates).where(eq(staffChatChannels.id, input.id));
      const rows = await db.select().from(staffChatChannels).where(eq(staffChatChannels.id, input.id)).limit(1);
      return rows[0];
    }),

  // Delete / archive channel
  deleteChannel: deleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(staffChatChannels).set({ isActive: 0 }).where(eq(staffChatChannels.id, input.id));
      return { success: true };
    }),

  // ===== MESSAGES =====

  // Send a new message
  sendMessage: createProcedure
    .input(
      z.object({
        content: z.string().min(1).max(2000),
        channelId: z.string().default("general"),
        emoji: z.string().optional(),
        replyToId: z.string().optional(),
        fileUrl: z.string().max(2000).optional(),
        fileName: z.string().max(255).optional(),
        fileType: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let replyToUser: string | undefined;
      if (input.replyToId) {
        const replyMsg = await db.select().from(staffChatMessages).where(eq(staffChatMessages.id, input.replyToId)).limit(1);
        replyToUser = replyMsg[0]?.userName;
      }

      const messageId = uuidv4();
      await db.insert(staffChatMessages).values({
        id: messageId,
        channelId: input.channelId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "Unknown",
        content: input.content,
        emoji: input.emoji ?? null,
        replyToId: input.replyToId ?? null,
        replyToUser: replyToUser ?? null,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        fileType: input.fileType ?? null,
        isEdited: 0,
      });

      const rows = await db.select().from(staffChatMessages).where(eq(staffChatMessages.id, messageId)).limit(1);
      return rows[0];
    }),

  // Get messages with pagination, filtered by channel
  getMessages: readProcedure
    .input(
      z.object({
        channelId: z.string().default("general"),
        limit: z.number().max(100).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { messages: [], total: 0, hasMore: false };

      const rows = await db
        .select()
        .from(staffChatMessages)
        .where(eq(staffChatMessages.channelId, input.channelId))
        .orderBy(desc(staffChatMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countRows = await db.select({ id: staffChatMessages.id }).from(staffChatMessages)
        .where(eq(staffChatMessages.channelId, input.channelId));
      const total = countRows.length;

      return {
        messages: rows.reverse(),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Delete a message (only by sender or admin)
  deleteMessage: deleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const rows = await db.select().from(staffChatMessages).where(eq(staffChatMessages.id, input.id)).limit(1);
      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      const message = rows[0];
      if (message.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own messages" });
      }

      await db.delete(staffChatMessages).where(eq(staffChatMessages.id, input.id));
      return { success: true };
    }),

  // Edit a message (only by sender)
  editMessage: createProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1).max(2000),
        emoji: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const rows = await db.select().from(staffChatMessages).where(eq(staffChatMessages.id, input.id)).limit(1);
      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      const message = rows[0];
      if (message.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own messages" });
      }

      await db.update(staffChatMessages).set({
        content: input.content,
        emoji: input.emoji ?? message.emoji,
        isEdited: 1,
      }).where(eq(staffChatMessages.id, input.id));

      const updated = await db.select().from(staffChatMessages).where(eq(staffChatMessages.id, input.id)).limit(1);
      return updated[0];
    }),

  // Get online members (users who sent messages recently)
  getMembers: readProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(staffChatMessages)
      .orderBy(desc(staffChatMessages.createdAt))
      .limit(200);

    const seen = new Map<string, { userId: string; userName: string; lastSeen: string }>();
    for (const row of rows) {
      if (!seen.has(row.userId)) {
        seen.set(row.userId, { userId: row.userId, userName: row.userName, lastSeen: row.createdAt || "" });
      }
    }

    return Array.from(seen.values());
  }),

  // Search messages
  searchMessages: readProcedure
    .input(z.object({ query: z.string().min(1), channelId: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const q = `%${input.query}%`;
      const conditions = [
        or(
          like(staffChatMessages.content, q),
          like(staffChatMessages.userName, q)
        ),
      ];
      if (input.channelId) {
        conditions.push(eq(staffChatMessages.channelId, input.channelId));
      }

      return db.select().from(staffChatMessages).where(
        conditions.length > 1 ? and(...conditions) : conditions[0]
      ).orderBy(desc(staffChatMessages.createdAt)).limit(50);
    }),

  // Clear chat history (admin only)
  clearHistory: deleteProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can clear chat history" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    await db.delete(staffChatMessages);
    return { success: true };
  }),

  // Mark messages as read up to a given message ID
  markChatRead: createProcedure
    .input(z.object({
      channelId: z.string().default("general"),
      lastReadMessageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const p = getPool();
      if (!p) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = `crs_${ctx.user.id}_${input.channelId}`;
      await p.query(
        `INSERT INTO chat_read_status (id, user_id, channel_id, last_read_message_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE last_read_message_id = VALUES(last_read_message_id), read_at = NOW()`,
        [id, ctx.user.id, input.channelId, input.lastReadMessageId]
      );
      return { success: true };
    }),

  // Get unread message count per channel for current user
  getUnreadCounts: readProcedure.query(async ({ ctx }) => {
    const p = getPool();
    if (!p) return [];

    const [rows] = await p.query(
      `SELECT m.channelId AS channelId, COUNT(*) AS unreadCount
       FROM staffChatMessages m
       LEFT JOIN chat_read_status crs
         ON crs.user_id = ? AND crs.channel_id = m.channelId
       WHERE m.userId != ?
         AND (crs.last_read_message_id IS NULL OR m.id > crs.last_read_message_id)
       GROUP BY m.channelId`,
      [ctx.user.id, ctx.user.id]
    );
    return rows as { channelId: string; unreadCount: number }[];
  }),

  // Get unread messages only (for floating notification popups)
  getUnreadMessages: readProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        limit: z.number().max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const p = getPool();
      if (!p) return [];

      const query = input.channelId
        ? `SELECT m.*
           FROM staffChatMessages m
           LEFT JOIN chat_read_status crs
             ON crs.user_id = ? AND crs.channel_id = m.channelId
           WHERE m.userId != ?
             AND m.channelId = ?
             AND (crs.last_read_message_id IS NULL OR m.id > crs.last_read_message_id)
           ORDER BY m.createdAt DESC
           LIMIT ?`
        : `SELECT m.*
           FROM staffChatMessages m
           LEFT JOIN chat_read_status crs
             ON crs.user_id = ? AND crs.channel_id = m.channelId
           WHERE m.userId != ?
             AND (crs.last_read_message_id IS NULL OR m.id > crs.last_read_message_id)
           ORDER BY m.createdAt DESC
           LIMIT ?`;

      const params = input.channelId
        ? [ctx.user.id, ctx.user.id, input.channelId, input.limit]
        : [ctx.user.id, ctx.user.id, input.limit];

      const [rows] = await p.query(query, params);
      return rows || [];
    }),

  // List all active system users for member selection (private chat, group channel)
  listUsers: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const orgId = ctx.user.organizationId;
    let rows: any[];
    if (orgId) {
      rows = await db
        .select({ id: users.id, name: users.name, email: users.email, department: users.department, role: users.role })
        .from(users)
        .where(and(eq(users.isActive, 1), eq(users.organizationId, orgId)));
    } else {
      rows = await db
        .select({ id: users.id, name: users.name, email: users.email, department: users.department, role: users.role })
        .from(users)
        .where(eq(users.isActive, 1));
    }
    return rows;
  }),
});

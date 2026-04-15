import { router } from "./base.js";
import { z } from "zod";
import { getDb } from "../db.js";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  conversations,
  conversationMembers,
  messages,
  messageReadReceipts,
  users,
} from "../../drizzle/schema.js";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac.js";
import { nanoid } from "nanoid";

/**
 * Intrachat Router
 * Handles messages, conversations, and secured internal communication
 */
export const intrachatRouter = router({
  /**
   * Create a new conversation (direct, group, or channel)
   */
  createConversation: createFeatureRestrictedProcedure("communications:create")
    .input(
      z.object({
        type: z.enum(["direct", "group", "channel"]),
        name: z.string().optional(),
        description: z.string().optional(),
        memberIds: z.array(z.string()),
        isEncrypted: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const conversationId = nanoid(16);
        const encryptionKey = input.isEncrypted
          ? Buffer.from(`key_${nanoid(32)}`).toString("base64")
          : null;

        // Create conversation
        await db.insert(conversations).values({
          id: conversationId,
          type: input.type,
          name: input.name || (input.type === "direct" ? "Direct Message" : ""),
          description: input.description,
          createdBy: ctx.user.id,
          isEncrypted: input.isEncrypted ? 1 : 0,
          encryptionKey,
        });

        // Add members
        const memberIds = [ctx.user.id, ...input.memberIds];
        const members = memberIds.map((userId) => ({
          id: nanoid(16),
          conversationId,
          userId,
          role: userId === ctx.user.id ? ("admin" as const) : ("member" as const),
          isActive: 1,
        }));

        await db.insert(conversationMembers).values(members);

        return {
          success: true,
          conversationId,
          message: "Conversation created successfully",
        };
      } catch (error) {
        console.error("[Intrachat] Create conversation error:", error);
        throw error;
      }
    }),

  /**
   * Send a message
   */
  sendMessage: createFeatureRestrictedProcedure("communications:create")
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        messageType: z.enum(["text", "image", "file", "system"]).default("text"),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const messageId = nanoid(16);

        // Verify user is member of conversation
        const member = await db.query.conversationMembers.findFirst({
          where: and(
            eq(conversationMembers.conversationId, input.conversationId),
            eq(conversationMembers.userId, ctx.user.id)
          ),
        });

        if (!member) {
          throw new Error("You are not a member of this conversation");
        }

        // Create message
        await db.insert(messages).values({
          id: messageId,
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          messageType: input.messageType,
          content: input.content,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        });

        // Update conversation's last message time
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
          .where(eq(conversations.id, input.conversationId));

        return {
          success: true,
          messageId,
          message: "Message sent successfully",
        };
      } catch (error) {
        console.error("[Intrachat] Send message error:", error);
        throw error;
      }
    }),

  /**
   * Get messages in a conversation
   */
  getMessages: createFeatureRestrictedProcedure("communications:read")
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Verify membership
        const member = await db.query.conversationMembers.findFirst({
          where: and(
            eq(conversationMembers.conversationId, input.conversationId),
            eq(conversationMembers.userId, ctx.user.id)
          ),
        });

        if (!member) {
          throw new Error("You are not a member of this conversation");
        }

        // Get messages
        const convMessages = await db.query.messages.findMany({
          where: and(
            eq(messages.conversationId, input.conversationId),
            eq(messages.isDeleted, 0)
          ),
          orderBy: desc(messages.createdAt),
          limit: input.limit,
          offset: input.offset,
        });

        // Get sender info
        const messageIds = convMessages.map((m) => m.id);
        const readReceipts = messageIds.length > 0
          ? await db.query.messageReadReceipts.findMany({
              where: (db as any).raw(
                `messageId IN (${messageIds.map(() => "?").join(",")})`
              ),
            })
          : [];

        return {
          success: true,
          data: convMessages.reverse(), // Return in chronological order
          readReceipts,
        };
      } catch (error) {
        console.error("[Intrachat] Get messages error:", error);
        throw error;
      }
    }),

  /**
   * Get user's conversations
   */
  getConversations: createFeatureRestrictedProcedure("communications:read")
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get conversations where user is member
        const userConversations = await db
          .select()
          .from(conversations)
          .innerJoin(
            conversationMembers,
            eq(conversations.id, conversationMembers.conversationId)
          )
          .where(
            and(
              eq(conversationMembers.userId, ctx.user.id),
              eq(conversationMembers.isActive, 1),
              eq(conversations.isArchived, 0)
            )
          )
          .orderBy(desc(conversations.lastMessageAt))
          .limit(input.limit)
          .offset(input.offset);

        // Format response
        const response = await Promise.all(
          userConversations.map(async (uc) => {
            const unreadCount = await db
              .select({ count: sql`COUNT(*)` })
              .from(messages)
              .where(
                and(
                  eq(messages.conversationId, uc.conversations.id),
                  (db as any).raw(
                    `NOT EXISTS (SELECT 1 FROM messageReadReceipts WHERE messageId = messages.id AND userId = '${ctx.user.id}')`
                  )
                )
              );

            return {
              ...uc.conversations,
              unreadCount: unreadCount[0]?.count || 0,
            };
          })
        );

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        console.error("[Intrachat] Get conversations error:", error);
        throw error;
      }
    }),

  /**
   * Mark messages as read
   */
  markAsRead: createFeatureRestrictedProcedure("communications:edit")
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get unread messages
        const unreadMessages = await db.query.messages.findMany({
          where: and(
            eq(messages.conversationId, input.conversationId),
            (db as any).raw(
              `NOT EXISTS (SELECT 1 FROM messageReadReceipts WHERE messageId = messages.id AND userId = '${ctx.user.id}')`
            )
          ),
        });

        // Mark as read
        const receipts = unreadMessages.map((msg) => ({
          id: nanoid(16),
          messageId: msg.id,
          userId: ctx.user.id,
          readAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        }));

        if (receipts.length > 0) {
          await db.insert(messageReadReceipts).values(receipts);
        }

        return { success: true, readCount: receipts.length };
      } catch (error) {
        console.error("[Intrachat] Mark as read error:", error);
        throw error;
      }
    }),

  /**
   * Delete a message
   */
  deleteMessage: createFeatureRestrictedProcedure("communications:edit")
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Verify user is message sender
        const message = await db.query.messages.findFirst({
          where: eq(messages.id, input.messageId),
        });

        if (!message) {
          throw new Error("Message not found");
        }

        if (message.senderId !== ctx.user.id) {
          throw new Error("You can only delete your own messages");
        }

        // Soft delete
        await db
          .update(messages)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            content: "[Deleted]",
          })
          .where(eq(messages.id, input.messageId));

        return { success: true, message: "Message deleted" };
      } catch (error) {
        console.error("[Intrachat] Delete message error:", error);
        throw error;
      }
    }),

  /**
   * Leave a conversation
   */
  leaveConversation: createFeatureRestrictedProcedure("communications:edit")
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        await db
          .update(conversationMembers)
          .set({
            isActive: 0,
            leftAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(
            and(
              eq(conversationMembers.conversationId, input.conversationId),
              eq(conversationMembers.userId, ctx.user.id)
            )
          );

        return { success: true, message: "Left conversation" };
      } catch (error) {
        console.error("[Intrachat] Leave conversation error:", error);
        throw error;
      }
    }),
});

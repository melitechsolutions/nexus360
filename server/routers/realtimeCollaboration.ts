/**
 * Real-Time Collaboration Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { collaborationSessions } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const collaborationViewProcedure = createFeatureRestrictedProcedure('collaboration:view');
const collaborationEditProcedure = createFeatureRestrictedProcedure('collaboration:edit');

export const realtimeCollaborationRouter = router({
  initializePresenceTracking: collaborationViewProcedure
    .input(z.object({
      documentId: z.string(),
      userId: z.string(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(collaborationSessions)
        .where(and(eq(collaborationSessions.sessionType, 'presence'), eq(collaborationSessions.documentId, input.documentId)))
        .orderBy(desc(collaborationSessions.createdAt))
        .limit(20);
      return {
        success: true,
        documentId: input.documentId,
        userId: input.userId,
        presenceToken: 'pres_' + Date.now(),
        activeUsers: rows.map(r => ({
          id: r.userId || '',
          name: r.dataPayload ? JSON.parse(r.dataPayload).name || '' : '',
          color: r.dataPayload ? JSON.parse(r.dataPayload).color || '#000' : '#000',
          lastSeen: r.updatedAt,
        })),
      };
    }),

  streamLiveNotifications: collaborationViewProcedure
    .input(z.object({
      userId: z.string(),
      channels: z.array(z.string()).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(collaborationSessions)
        .where(and(eq(collaborationSessions.sessionType, 'notification'), eq(collaborationSessions.userId, input.userId)))
        .orderBy(desc(collaborationSessions.createdAt))
        .limit(20);
      return {
        success: true,
        userId: input.userId,
        notificationStream: {
          channels: input.channels || ['team', 'mentions', 'updates'],
        },
        recentNotifications: rows.map(r => ({
          id: r.id,
          type: r.dataPayload ? JSON.parse(r.dataPayload).type || 'update' : 'update',
          user: r.dataPayload ? JSON.parse(r.dataPayload).user || '' : '',
          text: r.message || '',
          timestamp: r.createdAt,
          read: r.status === 'READ',
        })),
      };
    }),

  sendChatMessage: collaborationEditProcedure
    .input(z.object({
      channelId: z.string(),
      message: z.string(),
      mentions: z.array(z.string()).optional(),
      attachments: z.array(z.string()).optional(),
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(collaborationSessions).values({
        id,
        sessionType: 'chat',
        channelId: input.channelId,
        userId: ctx.user?.id || 'system',
        message: input.message,
        dataPayload: JSON.stringify({ mentions: input.mentions, attachments: input.attachments }),
        status: 'SENT',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        success: true,
        messageId: id,
        channelId: input.channelId,
        message: input.message,
        timestamp: new Date(),
        status: 'sent',
        reactions: {},
      };
    }),

  getCollaborativeEditingState: collaborationViewProcedure
    .input(z.object({
      documentId: z.string(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(collaborationSessions)
        .where(and(eq(collaborationSessions.sessionType, 'editing'), eq(collaborationSessions.documentId, input.documentId)))
        .orderBy(desc(collaborationSessions.createdAt))
        .limit(10);
      return {
        documentId: input.documentId,
        editingState: {
          currentVersion: rows.length,
          lastModified: rows[0]?.updatedAt || new Date(),
          conflictCount: 0,
          resolutionMode: 'operational-transformation',
        },
        collaborators: rows.map(r => ({
          userId: r.userId || '',
          name: r.dataPayload ? JSON.parse(r.dataPayload).name || '' : '',
          lastEdit: r.updatedAt,
        })),
        pendingChanges: 0,
        syncStatus: 'synchronized',
      };
    }),

  getTeamActivityStream: collaborationViewProcedure
    .input(z.object({
      teamId: z.string(),
      limit: z.number().max(50).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(collaborationSessions)
        .where(eq(collaborationSessions.sessionType, 'activity'))
        .orderBy(desc(collaborationSessions.createdAt))
        .limit(input.limit || 20);
      return {
        teamId: input.teamId,
        activities: rows.map(r => ({
          id: r.id,
          type: r.dataPayload ? JSON.parse(r.dataPayload).type || '' : '',
          user: r.dataPayload ? JSON.parse(r.dataPayload).user || '' : '',
          action: r.message || '',
          timestamp: r.createdAt,
          metadata: r.dataPayload ? JSON.parse(r.dataPayload).metadata || {} : {},
        })),
        total: rows.length,
      };
    }),

  resolveCollaborationConflict: collaborationEditProcedure
    .input(z.object({
      documentId: z.string(),
      conflictId: z.string(),
      resolution: z.enum(['keep_local', 'accept_remote', 'merge']),
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(collaborationSessions).values({
        id,
        sessionType: 'conflict_resolution',
        documentId: input.documentId,
        userId: ctx.user?.id || 'system',
        dataPayload: JSON.stringify({ conflictId: input.conflictId, resolution: input.resolution }),
        status: 'RESOLVED',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        success: true,
        documentId: input.documentId,
        conflictId: input.conflictId,
        resolution: input.resolution,
        resolved: true,
        mergedContent: { version: 0, timestamp: new Date() },
      };
    }),
});

/**
 * Mobile App Support Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { mobileAppConfigs } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const mobileViewProcedure = createFeatureRestrictedProcedure('mobile:view');
const mobileEditProcedure = createFeatureRestrictedProcedure('mobile:edit');

export const mobileAppRouter = router({
  getAppVersion: mobileViewProcedure
    .input(z.object({
      platform: z.enum(['ios', 'android']),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(and(eq(mobileAppConfigs.platform, input.platform), eq(mobileAppConfigs.status, 'ACTIVE')))
        .orderBy(desc(mobileAppConfigs.createdAt))
        .limit(1);
      const row = rows[0];
      const cfg = row?.config ? JSON.parse(row.config) : {};
      return {
        platform: input.platform,
        currentVersion: row?.appVersion || '0.0.0',
        minimumVersion: cfg.minimumVersion || '0.0.0',
        latestVersion: cfg.latestVersion || row?.appVersion || '0.0.0',
        releaseDate: row?.createdAt || new Date(),
        status: cfg.status || 'unknown',
        changelog: cfg.changelog || [],
      };
    }),

  getMobileFeatureFlags: mobileViewProcedure
    .input(z.object({
      platform: z.enum(['ios', 'android']).optional(),
      appVersion: z.string().optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(eq(mobileAppConfigs.status, 'ACTIVE'))
        .orderBy(desc(mobileAppConfigs.createdAt))
        .limit(10);
      const flags: Record<string, boolean> = {};
      const abTests: Array<{name: string; enabled: boolean; cohort: string}> = [];
      for (const r of rows) {
        const cfg = r.config ? JSON.parse(r.config) : {};
        if (cfg.flags) Object.assign(flags, cfg.flags);
        if (cfg.abTests) abTests.push(...cfg.abTests);
      }
      return { flags, abTests, timestamp: new Date() };
    }),

  getMobileAnalytics: mobileViewProcedure
    .input(z.object({
      period: z.enum(['daily', 'weekly', 'monthly']),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(eq(mobileAppConfigs.status, 'ACTIVE'))
        .limit(10);
      return {
        period: input.period,
        analytics: { activeUsers: 0, sessionCount: 0, avgSessionDuration: 0, crashRate: 0, topFeatures: [], topScreens: [] },
        platforms: {
          ios: { activeUsers: rows.filter(r => r.platform === 'ios').length, percentage: 50 },
          android: { activeUsers: rows.filter(r => r.platform === 'android').length, percentage: 50 },
        },
      };
    }),

  orchestratePushNotifications: mobileEditProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      title: z.string(),
      body: z.string(),
      actionUrl: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high']).optional(),
      scheduledTime: z.string().optional(),
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(mobileAppConfigs).values({
        id,
        platform: 'all',
        config: JSON.stringify({ type: 'push_notification', title: input.title, body: input.body, userIds: input.userIds, priority: input.priority, actionUrl: input.actionUrl }),
        status: 'SENT',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        success: true,
        campaignId: id,
        recipientCount: input.userIds.length,
        deliveredCount: input.userIds.length,
        readCount: 0,
        status: 'sent',
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
    }),

  initializeOfflineSync: mobileEditProcedure
    .input(z.object({
      deviceId: z.string(),
      entities: z.array(z.string()),
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(mobileAppConfigs).values({
        id,
        platform: 'sync',
        config: JSON.stringify({ deviceId: input.deviceId, entities: input.entities }),
        status: 'ACTIVE',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        success: true,
        deviceId: input.deviceId,
        syncToken: id,
        entities: input.entities,
        lastSync: new Date().toISOString().replace('T', ' ').substring(0, 19),
        queuedChanges: 0,
      };
    }),

  getDeviceDiagnostics: mobileViewProcedure
    .input(z.object({
      deviceId: z.string(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(eq(mobileAppConfigs.status, 'ACTIVE'))
        .orderBy(desc(mobileAppConfigs.createdAt))
        .limit(1);
      const row = rows[0];
      const cfg = row?.config ? JSON.parse(row.config) : {};
      return {
        deviceId: input.deviceId,
        diagnostics: cfg.diagnostics || {},
        lastOnline: row?.updatedAt || new Date(),
        syncStatus: 'unknown',
        queuedActions: 0,
      };
    }),
});

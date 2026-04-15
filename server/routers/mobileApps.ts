/**
 * Mobile Apps Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { mobileAppConfigs } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const featureViewProcedure = createFeatureRestrictedProcedure('mobile:view');
const featureEditProcedure = createFeatureRestrictedProcedure('mobile:edit');

export const mobileAppsRouter = router({
  getIosAppMetrics: featureViewProcedure
    .input(z.object({ buildVersion: z.string().optional() }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(and(eq(mobileAppConfigs.platform, 'ios'), eq(mobileAppConfigs.status, 'ACTIVE')))
        .orderBy(desc(mobileAppConfigs.createdAt))
        .limit(1);
      const row = rows[0];
      const cfg = row?.config ? JSON.parse(row.config) : {};
      return {
        appName: cfg.appName || 'Melitech CRM iOS',
        version: row?.appVersion || '0.0.0',
        buildVersion: input.buildVersion || row?.appVersion || '0.0.0',
        appStore: cfg.appStore || {},
        deviceSupport: cfg.deviceSupport || {},
        performance: cfg.performance || {},
        features: cfg.features || {},
        bugs: cfg.bugs || {},
      };
    }),

  getAndroidAppMetrics: featureEditProcedure
    .input(z.object({ buildVersion: z.string().optional() }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(and(eq(mobileAppConfigs.platform, 'android'), eq(mobileAppConfigs.status, 'ACTIVE')))
        .orderBy(desc(mobileAppConfigs.createdAt))
        .limit(1);
      const row = rows[0];
      const cfg = row?.config ? JSON.parse(row.config) : {};
      return {
        appName: cfg.appName || 'Melitech CRM Android',
        version: row?.appVersion || '0.0.0',
        buildVersion: input.buildVersion || row?.appVersion || '0.0.0',
        playStore: cfg.playStore || {},
        deviceSupport: cfg.deviceSupport || {},
        performance: cfg.performance || {},
        targetSdk: cfg.targetSdk || 0,
        features: cfg.features || {},
      };
    }),

  manageOfflineSync: featureEditProcedure
    .input(z.object({ syncStrategy: z.enum(["INCREMENTAL", "FULL", "SMART"]) }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(mobileAppConfigs).values({
        id,
        platform: 'sync',
        config: JSON.stringify({ type: 'offline_sync', strategy: input.syncStrategy }),
        status: 'ACTIVE',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        syncConfigId: id,
        strategy: input.syncStrategy,
        status: 'ACTIVE',
        lastSync: new Date().toISOString().replace('T', ' ').substring(0, 19),
        dataSize: 0,
        cacheSize: 0,
        syncFrequency: '5 minutes',
        conflictResolution: 'LAST_WRITE_WINS',
        compressionEnabled: true,
        encryptionEnabled: true,
        p2pSyncEnabled: false,
        syncStats: { successfulSyncs: 0, failedSyncs: 0, retries: 0, averageSyncTime: 0 },
      };
    }),

  configurePushNotifications: featureViewProcedure
    .input(z.object({ platform: z.enum(["iOS", "ANDROID", "ALL"]) }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(eq(mobileAppConfigs.status, 'ACTIVE'))
        .orderBy(desc(mobileAppConfigs.createdAt))
        .limit(1);
      const row = rows[0];
      const cfg = row?.config ? JSON.parse(row.config) : {};
      return {
        platform: input.platform,
        provider: cfg.provider || 'Firebase Cloud Messaging',
        status: row?.status || 'INACTIVE',
        notificationsSent: cfg.notificationsSent || 0,
        deliveryRate: cfg.deliveryRate || 0,
        engagementRate: cfg.engagementRate || 0,
        openRate: cfg.openRate || 0,
        topics: cfg.topics || 0,
        subscribers: cfg.subscribers || 0,
        segmentation: true,
        scheduling: true,
        automation: true,
        analytics: cfg.analytics || {},
      };
    }),

  getNativePlatformFeatures: featureViewProcedure
    .input(z.object({ feature: z.string().optional() }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs)
        .where(eq(mobileAppConfigs.status, 'ACTIVE'))
        .limit(10);
      const iosConfig = rows.find(r => r.platform === 'ios');
      const androidConfig = rows.find(r => r.platform === 'android');
      const iosCfg = iosConfig?.config ? JSON.parse(iosConfig.config) : {};
      const androidCfg = androidConfig?.config ? JSON.parse(androidConfig.config) : {};
      return {
        iosFeatures: iosCfg.nativeFeatures || {},
        androidFeatures: androidCfg.nativeFeatures || {},
        featureAdoption: [],
      };
    }),

  monitorAppHealth: featureEditProcedure
    .input(z.object({ checkType: z.enum(["CRASH", "PERFORTMANCE", "BATTERY"]) }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(mobileAppConfigs).values({
        id,
        platform: 'health_check',
        config: JSON.stringify({ checkType: input.checkType, timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)}),
        status: 'ACTIVE',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        healthCheckId: id,
        checkType: input.checkType,
        status: 'HEALTHY',
        ios: { crashes: 0, crashRate: 0, anrCount: 0, memoryUsage: 0 },
        android: { crashes: 0, crashRate: 0, anrCount: 0, memoryUsage: 0 },
        overall: { healthScore: 0, trends: 'STABLE', alerts: 0 },
      };
    }),
});

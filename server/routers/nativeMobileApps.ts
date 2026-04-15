/**
 * Native Mobile Apps Router - DB-backed
 */
import { router, featureViewProcedure, featureEditProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { mobileAppConfigs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const nativeMobileAppsRouter = router({
  configureNativeApp: featureEditProcedure
    .input(z.object({ platform: z.enum(['ios', 'android']), bundleId: z.string(), packageName: z.string().optional(), appVersion: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(mobileAppConfigs).values({ id, platform: input.platform, bundleId: input.bundleId, packageName: input.packageName || null, appVersion: input.appVersion, status: 'configured', createdBy: ctx.user?.id || 'system' });
      return { success: true, appId: id, platform: input.platform, appVersion: input.appVersion, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  triggerBuild: featureEditProcedure
    .input(z.object({ appId: z.string(), buildType: z.enum(['debug', 'release']).default('debug') }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(mobileAppConfigs).set({ status: 'building' }).where(eq(mobileAppConfigs.id, input.appId));
      return { success: true, appId: input.appId, buildType: input.buildType, status: 'building', startedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  getBuildStatus: featureViewProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(mobileAppConfigs).where(eq(mobileAppConfigs.id, input.appId));
      const app = rows[0];
      if (!app) return { appId: input.appId, status: 'not_found' };
      return { appId: app.id, platform: app.platform, appVersion: app.appVersion, status: app.status };
    }),

  managePushNotifications: featureEditProcedure
    .input(z.object({ appId: z.string(), enabled: z.boolean(), fcmKey: z.string().optional(), apnsKey: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(mobileAppConfigs).set({ config: JSON.stringify({ pushEnabled: input.enabled, fcmKey: input.fcmKey, apnsKey: input.apnsKey }) }).where(eq(mobileAppConfigs.id, input.appId));
      return { success: true, appId: input.appId, pushEnabled: input.enabled };
    }),

  listApps: featureViewProcedure
    .input(z.object({ platform: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query;
      if (input.platform) {
        query = db.select().from(mobileAppConfigs).where(eq(mobileAppConfigs.platform, input.platform)).orderBy(desc(mobileAppConfigs.createdAt)).limit(input.limit);
      } else {
        query = db.select().from(mobileAppConfigs).orderBy(desc(mobileAppConfigs.createdAt)).limit(input.limit);
      }
      const rows = await query;
      return { apps: rows.map(r => ({ ...r, config: r.config ? JSON.parse(r.config) : null })), total: rows.length };
    }),
});

/**
 * Mobile Responsive Router - DB-backed
 */
import { router, featureViewProcedure, featureEditProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { registeredDevices } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const mobileResponsiveRouter = router({
  registerDevice: featureEditProcedure
    .input(z.object({ deviceType: z.enum(['phone', 'tablet', 'desktop']), platform: z.string(), pushToken: z.string().optional(), appVersion: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(registeredDevices).values({ id, deviceId: uuidv4(), deviceType: input.deviceType, platform: input.platform, pushToken: input.pushToken || null, appVersion: input.appVersion || null, userId: ctx.user?.id || null, createdBy: ctx.user?.id || 'system' });
      return { success: true, deviceId: id, deviceType: input.deviceType, platform: input.platform, registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  getResponsiveConfig: featureViewProcedure
    .input(z.object({ deviceType: z.enum(['phone', 'tablet', 'desktop']).optional() }))
    .query(async ({ input }) => {
      const breakpoints = { phone: { maxWidth: 768, columns: 1, fontSize: 14 }, tablet: { maxWidth: 1024, columns: 2, fontSize: 15 }, desktop: { maxWidth: 1920, columns: 3, fontSize: 16 } };
      if (input.deviceType) return { config: breakpoints[input.deviceType], deviceType: input.deviceType };
      return { configs: breakpoints };
    }),

  listDevices: featureViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(registeredDevices).orderBy(desc(registeredDevices.createdAt)).limit(input.limit);
      return { devices: rows, total: rows.length };
    }),

  revokeDevice: featureEditProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(registeredDevices).where(eq(registeredDevices.id, input.deviceId));
      return { success: true, deviceId: input.deviceId, status: 'revoked' };
    }),
});

/**
 * Global Features Router - DB-backed
 */
import { router, featureViewProcedure, featureEditProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { globalConfigs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const globalFeaturesRouter = router({
  configureInternationalization: featureEditProcedure
    .input(z.object({ defaultLocale: z.string(), supportedLocales: z.array(z.string()), fallbackLocale: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(globalConfigs).values({ id, configType: 'i18n', name: 'localization', config: JSON.stringify({ defaultLocale: input.defaultLocale, supportedLocales: input.supportedLocales, fallbackLocale: input.fallbackLocale || 'en' }), status: 'ACTIVE', createdBy: ctx.user?.id || 'system' });
      return { success: true, configId: id, defaultLocale: input.defaultLocale, supportedLocales: input.supportedLocales, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  manageRegionalCompliance: featureEditProcedure
    .input(z.object({ region: z.string(), regulations: z.array(z.string()), dataResidency: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(globalConfigs).values({ id, configType: 'compliance', name: `region_${input.region}`, region: input.region, config: JSON.stringify({ regulations: input.regulations, dataResidency: input.dataResidency }), status: 'ACTIVE', createdBy: ctx.user?.id || 'system' });
      return { success: true, configId: id, region: input.region, regulations: input.regulations, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  configureTimezones: featureEditProcedure
    .input(z.object({ defaultTimezone: z.string(), autoDetect: z.boolean().default(true), displayFormat: z.enum(['12h', '24h']).default('24h') }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(globalConfigs).values({ id, configType: 'timezone', name: 'timezone_settings', config: JSON.stringify(input), status: 'ACTIVE', createdBy: ctx.user?.id || 'system' });
      return { success: true, configId: id, defaultTimezone: input.defaultTimezone, autoDetect: input.autoDetect, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  handleCurrencyConversion: featureViewProcedure
    .input(z.object({ from: z.string(), to: z.string(), amount: z.number() }))
    .query(async ({ input }) => {
      const rates: Record<string, number> = { USD: 1, EUR: 0.85, GBP: 0.73, KES: 130.5, JPY: 110.0, CAD: 1.25, AUD: 1.35 };
      const fromRate = rates[input.from] || 1;
      const toRate = rates[input.to] || 1;
      const converted = (input.amount / fromRate) * toRate;
      return { from: input.from, to: input.to, amount: input.amount, convertedAmount: Math.round(converted * 100) / 100, rate: toRate / fromRate, timestamp: new Date() };
    }),

  listConfigs: featureViewProcedure
    .input(z.object({ configType: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query;
      if (input.configType) {
        query = db.select().from(globalConfigs).where(eq(globalConfigs.configType, input.configType)).orderBy(desc(globalConfigs.createdAt)).limit(input.limit);
      } else {
        query = db.select().from(globalConfigs).orderBy(desc(globalConfigs.createdAt)).limit(input.limit);
      }
      const rows = await query;
      return { configs: rows.map(r => ({ ...r, config: r.config ? JSON.parse(r.config) : null })), total: rows.length };
    }),
});

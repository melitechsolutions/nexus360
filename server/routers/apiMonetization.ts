/**
 * API Monetization Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { apiPricingConfigs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const featureViewProcedure = createFeatureRestrictedProcedure('api:view');
const featureEditProcedure = createFeatureRestrictedProcedure('api:edit');

export const apiMonetizationRouter = router({
  listApiMarketplace: featureViewProcedure
    .input(z.object({ category: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(apiPricingConfigs).orderBy(desc(apiPricingConfigs.createdAt)).limit(input.limit);
      return { totalApis: rows.length, apis: rows.map(r => ({ id: r.id, name: r.name, pricingModel: r.pricingModel, basePrice: r.basePrice, status: r.status })) };
    }),

  configureApiPricing: featureEditProcedure
    .input(z.object({ apiId: z.string(), pricingModel: z.enum(["FIXED", "USAGE_BASED", "TIERED"]), basePrice: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(apiPricingConfigs).values({ id, apiId: input.apiId, name: 'API ' + input.apiId, pricingModel: input.pricingModel, basePrice: String(input.basePrice || 99), currency: 'USD', rateLimit: 10000, status: 'ACTIVE', createdBy: ctx.user?.id || 'system' });
      return { priceConfigId: id, apiId: input.apiId, pricingModel: input.pricingModel, basePrice: input.basePrice || 99, currency: 'USD', status: 'ACTIVE', effectiveDate: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  trackUsageMetrics: featureViewProcedure
    .input(z.object({ apiId: z.string(), timeRange: z.string().default("30d") }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(apiPricingConfigs).where(eq(apiPricingConfigs.apiId, input.apiId));
      const cfg = rows[0];
      return { apiId: input.apiId, timeRange: input.timeRange, totalRequests: 0, successfulRequests: 0, failedRequests: 0, errorRate: 0, avgResponseTime: 0, uniqueConsumers: 0, config: cfg || null };
    }),

  generateBillingReport: featureViewProcedure
    .input(z.object({ period: z.string(), format: z.enum(["JSON", "CSV", "PDF"]).default("JSON") }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(apiPricingConfigs).where(eq(apiPricingConfigs.status, 'ACTIVE'));
      return { reportId: uuidv4(), period: input.period, format: input.format, generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19), totalApis: rows.length, apis: rows.map(r => ({ name: r.name, pricingModel: r.pricingModel, basePrice: r.basePrice })) };
    }),

  manageApiKeys: featureEditProcedure
    .input(z.object({ action: z.enum(["create", "revoke", "rotate"]), apiId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(apiPricingConfigs).values({ id, apiId: input.apiId, name: 'Key for ' + input.apiId, pricingModel: 'FIXED', status: 'ACTIVE', config: JSON.stringify({ action: input.action, keyType: 'API_KEY' }), createdBy: ctx.user?.id || 'system' });
      return { keyId: id, action: input.action, apiId: input.apiId, status: 'ACTIVE', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  getMonetizationDashboard: featureViewProcedure
    .input(z.object({}))
    .query(async () => {
      const db = await getDb();
      const rows = await db.select().from(apiPricingConfigs).where(eq(apiPricingConfigs.status, 'ACTIVE'));
      return { activeApis: rows.length, totalConfigs: rows.length, configs: rows };
    }),
});

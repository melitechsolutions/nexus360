/**
 * Partner Channel Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { partnerDeals } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const partnerViewProcedure = createFeatureRestrictedProcedure('partners:view');
const partnerEditProcedure = createFeatureRestrictedProcedure('partners:edit');

export const partnerChannelRouter = router({
  registerPartner: partnerEditProcedure
    .input(z.object({ partnerName: z.string(), tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'), commissionRate: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(partnerDeals).values({ id, partnerId: uuidv4(), partnerName: input.partnerName, dealName: `Partnership: ${input.partnerName}`, dealValue: '0', tier: input.tier, commissionRate: String(input.commissionRate || 10), status: 'active', createdBy: ctx.user?.id || 'system' });
      return { success: true, partnerId: id, partnerName: input.partnerName, tier: input.tier, registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  createDeal: partnerEditProcedure
    .input(z.object({ partnerName: z.string(), dealName: z.string(), dealValue: z.number(), customerId: z.string().optional(), commissionRate: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(partnerDeals).values({ id, partnerId: uuidv4(), partnerName: input.partnerName, dealName: input.dealName, dealValue: String(input.dealValue), customerId: input.customerId || null, commissionRate: String(input.commissionRate || 10), status: 'pending', createdBy: ctx.user?.id || 'system' });
      return { success: true, dealId: id, dealName: input.dealName, dealValue: input.dealValue, status: 'pending' };
    }),

  listDeals: partnerViewProcedure
    .input(z.object({ partnerName: z.string().optional(), status: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query;
      if (input.partnerName) {
        query = db.select().from(partnerDeals).where(eq(partnerDeals.partnerName, input.partnerName)).orderBy(desc(partnerDeals.createdAt)).limit(input.limit);
      } else if (input.status) {
        query = db.select().from(partnerDeals).where(eq(partnerDeals.status, input.status)).orderBy(desc(partnerDeals.createdAt)).limit(input.limit);
      } else {
        query = db.select().from(partnerDeals).orderBy(desc(partnerDeals.createdAt)).limit(input.limit);
      }
      const rows = await query;
      return { deals: rows, total: rows.length };
    }),

  updateDealStatus: partnerEditProcedure
    .input(z.object({ dealId: z.string(), status: z.enum(['pending', 'active', 'won', 'lost', 'closed']) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(partnerDeals).set({ status: input.status }).where(eq(partnerDeals.id, input.dealId));
      return { success: true, dealId: input.dealId, status: input.status };
    }),

  getPartnerPerformance: partnerViewProcedure
    .input(z.object({ partnerName: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(partnerDeals).where(eq(partnerDeals.partnerName, input.partnerName));
      const totalValue = rows.reduce((sum, r) => sum + parseFloat(r.dealValue || '0'), 0);
      const wonDeals = rows.filter(r => r.status === 'won');
      return { partnerName: input.partnerName, totalDeals: rows.length, wonDeals: wonDeals.length, totalValue, avgDealValue: rows.length > 0 ? totalValue / rows.length : 0 };
    }),
});

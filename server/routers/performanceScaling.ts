/**
 * Performance Scaling Router - DB-backed
 */
import { router, featureViewProcedure, featureEditProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { perfConfigs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const performanceScalingRouter = router({
  configureAutoScaling: featureEditProcedure
    .input(z.object({ minInstances: z.number().default(1), maxInstances: z.number().default(10), targetCpu: z.number().default(70), targetMemory: z.number().default(80) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(perfConfigs).values({ id, configType: 'auto_scaling', name: 'scaling_policy', strategy: 'auto_scale', config: JSON.stringify(input), status: 'ACTIVE', createdBy: ctx.user?.id || 'system' });
      return { success: true, configId: id, minInstances: input.minInstances, maxInstances: input.maxInstances, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  configureLoadBalancing: featureEditProcedure
    .input(z.object({ algorithm: z.enum(['round-robin', 'least-connections', 'ip-hash', 'weighted']).default('round-robin'), healthCheck: z.boolean().default(true), healthCheckInterval: z.number().default(30) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(perfConfigs).values({ id, configType: 'load_balancing', name: `lb_${input.algorithm}`, strategy: input.algorithm, config: JSON.stringify(input), status: 'ACTIVE', createdBy: ctx.user?.id || 'system' });
      return { success: true, configId: id, algorithm: input.algorithm, healthCheck: input.healthCheck, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  getScalingMetrics: featureViewProcedure
    .input(z.object({ timeRange: z.enum(['1h', '6h', '24h', '7d']).default('24h') }))
    .query(async ({ input }) => {
      return { timeRange: input.timeRange, metrics: { currentInstances: 3, avgCpu: 45, avgMemory: 62, requestsPerSecond: 1500, avgLatency: 32, scalingEvents: 2 }, timestamp: new Date() };
    }),

  listScalingConfigs: featureViewProcedure
    .input(z.object({ configType: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query;
      if (input.configType) {
        query = db.select().from(perfConfigs).where(eq(perfConfigs.configType, input.configType)).orderBy(desc(perfConfigs.createdAt)).limit(input.limit);
      } else {
        query = db.select().from(perfConfigs).orderBy(desc(perfConfigs.createdAt)).limit(input.limit);
      }
      const rows = await query;
      return { configs: rows.map(r => ({ ...r, config: r.config ? JSON.parse(r.config) : null })), total: rows.length };
    }),
});

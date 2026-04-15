/**
 * AI Agents Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { aiConfigurations } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const featureViewProcedure = createFeatureRestrictedProcedure('ai:view');
const featureEditProcedure = createFeatureRestrictedProcedure('ai:edit');

export const aiAgentsRouter = router({
  configureAutonomousAgent: featureEditProcedure
    .input(z.object({ agentType: z.string(), capabilities: z.array(z.string()).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      const caps = input.capabilities || ['SCHEDULING', 'REPORTING', 'OPTIMIZATION'];
      await db.insert(aiConfigurations).values({ id, configType: 'AGENT', name: input.agentType, model: 'GPT-4', capabilities: JSON.stringify(caps), status: 'ACTIVE', metrics: JSON.stringify({ taskCompletionRate: 0, successRate: 0 }), createdBy: ctx.user?.id || 'system' });
      return { agentId: id, agentType: input.agentType, status: 'ACTIVE', capabilities: caps, aiModel: 'GPT-4', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  deployIntelligentAssistant: featureEditProcedure
    .input(z.object({ assistantRole: z.string(), channel: z.enum(["CHAT", "EMAIL", "PHONE", "API"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(aiConfigurations).values({ id, configType: 'ASSISTANT', name: input.assistantRole, model: 'GPT-4', capabilities: JSON.stringify({ channel: input.channel }), status: 'DEPLOYED', createdBy: ctx.user?.id || 'system' });
      return { assistantId: id, role: input.assistantRole, channel: input.channel, status: 'DEPLOYED', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  implementNlpProcessing: featureEditProcedure
    .input(z.object({ nlpTasks: z.array(z.string()).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      const tasks = input.nlpTasks || ['SENTIMENT', 'ENTITY', 'INTENT'];
      await db.insert(aiConfigurations).values({ id, configType: 'NLP', name: 'NLP Processing', capabilities: JSON.stringify(tasks), status: 'OPERATIONAL', createdBy: ctx.user?.id || 'system' });
      return { nlpConfigId: id, tasks, status: 'OPERATIONAL', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  listAgents: featureViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(aiConfigurations).where(eq(aiConfigurations.configType, 'AGENT')).orderBy(desc(aiConfigurations.createdAt)).limit(input.limit);
      return { agents: rows.map(r => ({ ...r, capabilities: r.capabilities ? JSON.parse(r.capabilities) : [], metrics: r.metrics ? JSON.parse(r.metrics) : {} })), total: rows.length };
    }),
});

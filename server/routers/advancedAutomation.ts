/**
 * Advanced Automation Engine Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { smartWorkflows } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const automationViewProcedure = createFeatureRestrictedProcedure('automation:view');
const automationEditProcedure = createFeatureRestrictedProcedure('automation:edit');

export const advancedAutomationRouter = router({
  createSmartWorkflow: automationEditProcedure
    .input(z.object({
      name: z.string(),
      trigger: z.object({ type: z.enum(['time', 'event', 'condition']), config: z.record(z.string(), z.any()) }),
      actions: z.array(z.object({ type: z.string(), config: z.record(z.string(), z.any()) })),
      conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.any() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(smartWorkflows).values({
        id,
        name: input.name,
        triggerType: input.trigger.type,
        triggerConfig: JSON.stringify(input.trigger.config),
        actions: JSON.stringify(input.actions),
        conditions: input.conditions ? JSON.stringify(input.conditions) : null,
        status: 'active',
        executionCount: 0,
        createdBy: ctx.user?.id || 'system',
      });
      return { success: true, workflowId: id, name: input.name, status: 'active', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19), executionCount: 0 };
    }),

  getWorkflowExecutionHistory: automationViewProcedure
    .input(z.object({ workflowId: z.string(), limit: z.number().max(100).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(smartWorkflows).where(eq(smartWorkflows.id, input.workflowId));
      const wf = rows[0];
      if (!wf) return { workflowId: input.workflowId, executions: [], totalExecutions: 0 };
      return { workflowId: input.workflowId, executions: [], totalExecutions: wf.executionCount, lastExecuted: wf.lastExecuted, status: wf.status };
    }),

  listWorkflows: automationViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(smartWorkflows).orderBy(desc(smartWorkflows.createdAt)).limit(input.limit);
      return {
        workflows: rows.map(r => ({ ...r, triggerConfig: r.triggerConfig ? JSON.parse(r.triggerConfig) : null, actions: r.actions ? JSON.parse(r.actions) : [], conditions: r.conditions ? JSON.parse(r.conditions) : [] })),
        total: rows.length,
      };
    }),

  deleteWorkflow: automationEditProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(smartWorkflows).where(eq(smartWorkflows.id, input.workflowId));
      return { success: true, deletedId: input.workflowId };
    }),
});

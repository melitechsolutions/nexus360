/**
 * Dashboard Builder Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { customDashboards } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const dashboardViewProcedure = createFeatureRestrictedProcedure('dashboards:view');
const dashboardEditProcedure = createFeatureRestrictedProcedure('dashboards:edit');

export const dashboardBuilderRouter = router({
  createDashboard: dashboardEditProcedure
    .input(z.object({ name: z.string(), description: z.string().optional(), layout: z.enum(['grid', 'flex', 'column']), isPublic: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(customDashboards).values({ id, name: input.name, description: input.description || null, layout: input.layout, widgets: JSON.stringify([]), isPublic: input.isPublic ? 1 : 0, createdBy: ctx.user?.id || 'system' });
      return { success: true, dashboardId: id, name: input.name, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19), status: 'active', widgetCount: 0 };
    }),

  addWidgetToDashboard: dashboardEditProcedure
    .input(z.object({ dashboardId: z.string(), type: z.enum(['metric', 'chart', 'table', 'gauge', 'heatmap']), config: z.object({ title: z.string(), dataSource: z.string(), refreshInterval: z.number().optional(), height: z.number().optional(), width: z.number().optional() }) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(customDashboards).where(eq(customDashboards.id, input.dashboardId));
      const dash = rows[0];
      const widgets = dash?.widgets ? JSON.parse(dash.widgets) : [];
      const widgetId = uuidv4();
      widgets.push({ id: widgetId, type: input.type, ...input.config });
      await db.update(customDashboards).set({ widgets: JSON.stringify(widgets) }).where(eq(customDashboards.id, input.dashboardId));
      return { success: true, widgetId, dashboardId: input.dashboardId, type: input.type, addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  getDashboardWidgets: dashboardViewProcedure
    .input(z.object({ dashboardId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(customDashboards).where(eq(customDashboards.id, input.dashboardId));
      const dash = rows[0];
      if (!dash) return { dashboardId: input.dashboardId, widgets: [], total: 0 };
      const widgets = dash.widgets ? JSON.parse(dash.widgets) : [];
      return { dashboardId: input.dashboardId, widgets, total: widgets.length };
    }),

  shareDashboard: dashboardEditProcedure
    .input(z.object({ dashboardId: z.string(), sharedWith: z.array(z.string()), permission: z.enum(['view', 'edit']), expiresAt: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(customDashboards).set({ sharedWith: JSON.stringify({ users: input.sharedWith, permission: input.permission, expiresAt: input.expiresAt }) }).where(eq(customDashboards.id, input.dashboardId));
      return { success: true, dashboardId: input.dashboardId, sharedWith: input.sharedWith.length };
    }),

  listDashboards: dashboardViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(customDashboards).orderBy(desc(customDashboards.createdAt)).limit(input.limit);
      return { dashboards: rows.map(r => ({ ...r, widgets: r.widgets ? JSON.parse(r.widgets) : [], sharedWith: r.sharedWith ? JSON.parse(r.sharedWith) : null })), total: rows.length };
    }),

  deleteDashboard: dashboardEditProcedure
    .input(z.object({ dashboardId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(customDashboards).where(eq(customDashboards.id, input.dashboardId));
      return { success: true, deletedId: input.dashboardId };
    }),
});

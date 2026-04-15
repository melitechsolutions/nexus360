import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  dashboardLayouts,
  dashboardWidgets,
  dashboardWidgetData,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Zod schemas for validation
const DashboardWidgetSchema = z.object({
  id: z.string(),
  widgetType: z.string(),
  widgetTitle: z.string().optional(),
  widgetSize: z.enum(["small", "medium", "large"]).default("medium"),
  rowIndex: z.number().default(0),
  colIndex: z.number().default(0),
  refreshInterval: z.number().default(300),
  config: z.record(z.string(), z.any()).optional(),
});

const DashboardLayoutSchema = z.object({
  id: z.string().optional(),
  name: z.string().default("My Dashboard"),
  description: z.string().optional(),
  gridColumns: z.number().min(4).max(12).default(6),
  isDefault: z.boolean().default(false),
  widgets: z.array(DashboardWidgetSchema).default([]),
});

export const enhancedDashboardRouter = router({
  /**
   * Get user's default dashboard layout
   */
  getDefault: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const layout = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.userId, ctx.user.id),
          eq(dashboardLayouts.isDefault, 1)
        )
      )
      .limit(1);

    if (!layout || layout.length === 0) return null;

    return formatLayoutResponse(layout[0], db);
  }),

  /**
   * Get specific dashboard layout by ID
   */
  getLayout: createFeatureRestrictedProcedure("dashboard:view")
    .input(z.string())
    .query(async ({ input: layoutId, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const layout = await db
        .select()
        .from(dashboardLayouts)
        .where(
          and(
            eq(dashboardLayouts.id, layoutId),
            eq(dashboardLayouts.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!layout || layout.length === 0) return null;

      return formatLayoutResponse(layout[0], db);
    }),

  /**
   * List all dashboard layouts for current user
   */
  listLayouts: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const layouts = await db
      .select()
      .from(dashboardLayouts)
      .where(eq(dashboardLayouts.userId, ctx.user.id));

    return Promise.all(layouts.map((l) => formatLayoutResponse(l, db)));
  }),

  /**
   * Create new dashboard layout
   */
  createLayout: createFeatureRestrictedProcedure("dashboard:edit")
    .input(DashboardLayoutSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const layoutId = uuid();

      // If this is default, unset other defaults
      if (input.isDefault) {
        await db
          .update(dashboardLayouts)
          .set({ isDefault: 0 })
          .where(
            and(
              eq(dashboardLayouts.userId, ctx.user.id),
              eq(dashboardLayouts.isDefault, 1)
            )
          );
      }

      // Create layout
      await db.insert(dashboardLayouts).values({
        id: layoutId,
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        gridColumns: input.gridColumns,
        isDefault: input.isDefault ? 1 : 0,
        layoutData: {},
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      // Add widgets if provided
      for (const widget of input.widgets || []) {
        const widgetId = uuid();
        await db.insert(dashboardWidgets).values({
          id: widgetId,
          layoutId,
          widgetType: widget.widgetType,
          widgetTitle: widget.widgetTitle,
          widgetSize: widget.widgetSize,
          rowIndex: widget.rowIndex,
          colIndex: widget.colIndex,
          refreshInterval: widget.refreshInterval,
          config: widget.config || {},
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      }

      return { id: layoutId, success: true };
    }),

  /**
   * Update dashboard layout
   */
  updateLayout: createFeatureRestrictedProcedure("dashboard:edit")
    .input(
      z.object({
        id: z.string(),
        ...DashboardLayoutSchema.shape,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const layout = await db
        .select()
        .from(dashboardLayouts)
        .where(
          and(
            eq(dashboardLayouts.id, input.id),
            eq(dashboardLayouts.userId, ctx.user.id)
          )
        );

      if (!layout || layout.length === 0) {
        throw new Error("Layout not found");
      }

      // If setting as default, unset others
      if (input.isDefault) {
        await db
          .update(dashboardLayouts)
          .set({ isDefault: 0 })
          .where(
            and(
              eq(dashboardLayouts.userId, ctx.user.id),
              eq(dashboardLayouts.isDefault, 1)
            )
          );
      }

      // Update layout
      await db
        .update(dashboardLayouts)
        .set({
          name: input.name,
          description: input.description,
          gridColumns: input.gridColumns,
          isDefault: input.isDefault ? 1 : 0,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        })
        .where(eq(dashboardLayouts.id, input.id));

      // Remove old widgets and add new ones
      await db
        .delete(dashboardWidgets)
        .where(eq(dashboardWidgets.layoutId, input.id));

      for (const widget of input.widgets || []) {
        const widgetId = widget.id || uuid();
        await db.insert(dashboardWidgets).values({
          id: widgetId,
          layoutId: input.id,
          widgetType: widget.widgetType,
          widgetTitle: widget.widgetTitle,
          widgetSize: widget.widgetSize,
          rowIndex: widget.rowIndex,
          colIndex: widget.colIndex,
          refreshInterval: widget.refreshInterval,
          config: widget.config || {},
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      }

      return { success: true };
    }),

  /**
   * Delete dashboard layout
   */
  deleteLayout: createFeatureRestrictedProcedure("dashboard:edit")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const layout = await db
        .select()
        .from(dashboardLayouts)
        .where(
          and(
            eq(dashboardLayouts.id, input),
            eq(dashboardLayouts.userId, ctx.user.id)
          )
        );

      if (!layout || layout.length === 0) {
        throw new Error("Layout not found");
      }

      // Can't delete default layout if it's the only one
      if (layout[0].isDefault) {
        const allLayouts = await db
          .select()
          .from(dashboardLayouts)
          .where(eq(dashboardLayouts.userId, ctx.user.id));

        if (allLayouts.length === 1) {
          throw new Error("Cannot delete the only layout");
        }
      }

      // Delete layout (cascade deletes widgets)
      await db
        .delete(dashboardLayouts)
        .where(eq(dashboardLayouts.id, input));

      return { success: true };
    }),

  /**
   * Add widget to layout
   */
  addWidget: createFeatureRestrictedProcedure("dashboard:edit")
    .input(
      z.object({
        layoutId: z.string(),
        widget: DashboardWidgetSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const layout = await db
        .select()
        .from(dashboardLayouts)
        .where(
          and(
            eq(dashboardLayouts.id, input.layoutId),
            eq(dashboardLayouts.userId, ctx.user.id)
          )
        );

      if (!layout || layout.length === 0) {
        throw new Error("Layout not found");
      }

      const widgetId = uuid();

      await db.insert(dashboardWidgets).values({
        id: widgetId,
        layoutId: input.layoutId,
        widgetType: input.widget.widgetType,
        widgetTitle: input.widget.widgetTitle,
        widgetSize: input.widget.widgetSize,
        rowIndex: input.widget.rowIndex,
        colIndex: input.widget.colIndex,
        refreshInterval: input.widget.refreshInterval,
        config: input.widget.config || {},
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      return { id: widgetId, success: true };
    }),

  /**
   * Remove widget from layout
   */
  removeWidget: createFeatureRestrictedProcedure("dashboard:edit")
    .input(z.string())
    .mutation(async ({ input: widgetId, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership by checking layout
      const widget = await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, widgetId));

      if (!widget || widget.length === 0) {
        throw new Error("Widget not found");
      }

      const layoutId = widget[0].layoutId;
      const layout = await db
        .select()
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.id, layoutId));

      if (!layout || layout[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, widgetId));

      return { success: true };
    }),

  /**
   * Update widget position and config
   */
  updateWidget: createFeatureRestrictedProcedure("dashboard:edit")
    .input(
      z.object({
        id: z.string(),
        rowIndex: z.number().optional(),
        colIndex: z.number().optional(),
        widgetSize: z.enum(["small", "medium", "large"]).optional(),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const widget = await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, input.id));

      if (!widget || widget.length === 0) {
        throw new Error("Widget not found");
      }

      const layoutId = widget[0].layoutId;
      const layout = await db
        .select()
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.id, layoutId));

      if (!layout || layout[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const updateData: any = {
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      if (input.rowIndex !== undefined)
        updateData.rowIndex = input.rowIndex;
      if (input.colIndex !== undefined)
        updateData.colIndex = input.colIndex;
      if (input.widgetSize) updateData.widgetSize = input.widgetSize;
      if (input.config) updateData.config = input.config;

      await db
        .update(dashboardWidgets)
        .set(updateData)
        .where(eq(dashboardWidgets.id, input.id));

      return { success: true };
    }),

  /**
   * Cache widget data (for performance)
   */
  cacheWidgetData: createFeatureRestrictedProcedure("dashboard:edit")
    .input(
      z.object({
        widgetId: z.string(),
        dataKey: z.string(),
        dataValue: z.any(),
        expiresIn: z.number().default(300), // seconds
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = uuid();
      const expiresAt = new Date(Date.now() + input.expiresIn * 1000);

      await db.insert(dashboardWidgetData).values({
        id,
        widgetId: input.widgetId,
        dataKey: input.dataKey,
        dataValue: input.dataValue,
        cachedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        expiresAt: expiresAt.toISOString().replace('T', ' ').substring(0, 19),
      });

      return { success: true };
    }),

  /**
   * Get cached widget data
   */
  getCachedData: createFeatureRestrictedProcedure("dashboard:view")
    .input(
      z.object({
        widgetId: z.string(),
        dataKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      let query = db
        .select()
        .from(dashboardWidgetData)
        .where(eq(dashboardWidgetData.widgetId, input.widgetId));

      if (input.dataKey) {
        query = query.where(eq(dashboardWidgetData.dataKey, input.dataKey));
      }

      const data = await query;

      // Filter out expired entries
      const now = new Date();
      return data
        .filter((d) => !d.expiresAt || new Date(d.expiresAt) > now)
        .map((d) => ({
          key: d.dataKey,
          value: d.dataValue,
          cachedAt: d.cachedAt,
        }));
    }),
});

/**
 * Format layout response with widgets
 */
async function formatLayoutResponse(layout: any, db: any) {
  const widgets = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.layoutId, layout.id));

  return {
    id: layout.id,
    name: layout.name,
    description: layout.description,
    gridColumns: layout.gridColumns,
    isDefault: !!layout.isDefault,
    widgets: widgets.map((w: any) => ({
      id: w.id,
      widgetType: w.widgetType,
      widgetTitle: w.widgetTitle,
      widgetSize: w.widgetSize,
      rowIndex: w.rowIndex,
      colIndex: w.colIndex,
      refreshInterval: w.refreshInterval,
      config: w.config,
    })),
    createdAt: layout.createdAt,
    updatedAt: layout.updatedAt,
  };
}

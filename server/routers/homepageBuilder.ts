/**
 * Homepage Builder Widgets
 * Customizable dashboard widgets for the homepage
 */

import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuid } from "uuid";

// Widget types available for homepage
export const WIDGET_TYPES = {
  STAT_CARD: "stat_card",
  CHART: "chart",
  TABLE: "table",
  LIST: "list",
  CALENDAR: "calendar",
  TIMELINE: "timeline",
  METRIC: "metric",
  QUICK_ACTION: "quick_action",
  ALERTS: "alerts",
  UPCOMING_EVENTS: "upcoming_events",
  REVENUE_TRACKER: "revenue_tracker",
  EXPENSE_BREAKDOWN: "expense_breakdown",
  USER_ACTIVITY: "user_activity",
  TASK_BOARD: "task_board",
  NOTIFICATIONS: "notifications",
  RECENT_ITEMS: "recent_items",
  CUSTOM_HTML: "custom_html",
};

// Widget configurations
export const WIDGET_CONFIGS = {
  stat_card: {
    name: "Statistic Card",
    description: "Display a single metric or statistic",
    defaultSize: { width: 2, height: 1 },
    configurable: ["title", "value", "color", "icon"],
  },
  chart: {
    name: "Chart Widget",
    description: "Display graphs and charts (line, bar, pie, etc)",
    defaultSize: { width: 4, height: 3 },
    configurable: ["chartType", "dataSource", "title", "colors"],
  },
  table: {
    name: "Data Table",
    description: "Display tabular data with sorting and filtering",
    defaultSize: { width: 6, height: 4 },
    configurable: ["columns", "dataSource", "pageSize", "actions"],
  },
  list: {
    name: "List Widget",
    description: "Display a list of items",
    defaultSize: { width: 3, height: 3 },
    configurable: ["title", "dataSource", "showIcons", "actionable"],
  },
  calendar: {
    name: "Calendar",
    description: "Display calendar with events and deadlines",
    defaultSize: { width: 4, height: 4 },
    configurable: ["eventSource", "showWeekends", "timezone"],
  },
  timeline: {
    name: "Timeline",
    description: "Display chronological events",
    defaultSize: { width: 4, height: 3 },
    configurable: ["dataSource", "dateField", "descriptionField"],
  },
  metric: {
    name: "Metric Card",
    description: "Display metric with trend indicator",
    defaultSize: { width: 2, height: 1 },
    configurable: ["title", "value", "trend", "unit"],
  },
  quick_action: {
    name: "Quick Action Button",
    description: "Trigger common actions",
    defaultSize: { width: 2, height: 1 },
    configurable: ["action", "label", "icon", "color"],
  },
  alerts: {
    name: "Alerts Panel",
    description: "Display system and business alerts",
    defaultSize: { width: 3, height: 3 },
    configurable: ["severity", "limit", "autoRefresh"],
  },
  upcoming_events: {
    name: "Upcoming Events",
    description: "Show next scheduled events and deadlines",
    defaultSize: { width: 3, height: 3 },
    configurable: ["daysAhead", "types", "limit"],
  },
  revenue_tracker: {
    name: "Revenue Tracker",
    description: "Track revenue with month/year comparison",
    defaultSize: { width: 4, height: 3 },
    configurable: ["period", "comparison", "currency"],
  },
  expense_breakdown: {
    name: "Expense Breakdown",
    description: "Pie/donut chart showing expense distribution",
    defaultSize: { width: 4, height: 3 },
    configurable: ["period", "categories", "limit"],
  },
  user_activity: {
    name: "User Activity",
    description: "Show recent user activities in the system",
    defaultSize: { width: 3, height: 3 },
    configurable: ["limit", "activityTypes", "timeRange"],
  },
  task_board: {
    name: "Task Board",
    description: "Kanban-style task board",
    defaultSize: { width: 6, height: 4 },
    configurable: ["statuses", "limit", "assignedTo"],
  },
  notifications: {
    name: "Notifications",
    description: "Display system and user notifications",
    defaultSize: { width: 3, height: 3 },
    configurable: ["limit", "types", "autoRefresh"],
  },
  recent_items: {
    name: "Recent Items",
    description: "Show recently accessed items",
    defaultSize: { width: 3, height: 3 },
    configurable: ["itemTypes", "limit", "timeframe"],
  },
  custom_html: {
    name: "Custom HTML",
    description: "Display custom HTML content",
    defaultSize: { width: 3, height: 3 },
    configurable: ["htmlContent", "cssClass"],
  },
};

export const homepageBuilderRouter = router({
  /**
   * Get available widget types
   */
  getWidgetTypes: protectedProcedure.query(async () => {
    return Object.entries(WIDGET_TYPES).map(([key, value]) => ({
      id: value,
      name: WIDGET_CONFIGS[value as keyof typeof WIDGET_CONFIGS]?.name || key,
      description:
        WIDGET_CONFIGS[value as keyof typeof WIDGET_CONFIGS]?.description ||
        "Custom widget",
      defaultSize:
        WIDGET_CONFIGS[value as keyof typeof WIDGET_CONFIGS]?.defaultSize ||
        { width: 2, height: 2 },
    }));
  }),

  /**
   * Get widget configuration
   */
  getWidgetConfig: protectedProcedure
    .input(z.object({ widgetType: z.string() }))
    .query(async ({ input }) => {
      const config =
        WIDGET_CONFIGS[input.widgetType as keyof typeof WIDGET_CONFIGS];
      if (!config) {
        throw new Error(`Unknown widget type: ${input.widgetType}`);
      }
      return config;
    }),

  /**
   * Get default layout for role
   */
  getDefaultLayout: protectedProcedure.query(async ({ ctx }) => {
    // Return different default layouts based on user role
    const defaultLayouts: Record<string, any[]> = {
      super_admin: [
        {
          id: "stat_1",
          type: "stat_card",
          position: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          config: { title: "Total Revenue", dataSource: "accounting.revenue" },
        },
        {
          id: "stat_2",
          type: "stat_card",
          position: { x: 2, y: 0 },
          size: { width: 2, height: 1 },
          config: { title: "Total Expenses", dataSource: "accounting.expenses" },
        },
        {
          id: "chart_1",
          type: "chart",
          position: { x: 0, y: 1 },
          size: { width: 4, height: 3 },
          config: { chartType: "line", dataSource: "dashboard.revenue_trend" },
        },
        {
          id: "alerts_1",
          type: "alerts",
          position: { x: 4, y: 0 },
          size: { width: 2, height: 4 },
          config: { severity: "all" },
        },
      ],
      admin: [
        {
          id: "stat_1",
          type: "stat_card",
          position: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          config: { title: "Active Users", dataSource: "users.active_count" },
        },
        {
          id: "activity_1",
          type: "user_activity",
          position: { x: 2, y: 0 },
          size: { width: 4, height: 3 },
          config: { limit: 10 },
        },
        {
          id: "notifications_1",
          type: "notifications",
          position: { x: 0, y: 3 },
          size: { width: 3, height: 2 },
          config: { limit: 5 },
        },
      ],
      accountant: [
        {
          id: "revenue_1",
          type: "revenue_tracker",
          position: { x: 0, y: 0 },
          size: { width: 4, height: 3 },
          config: { period: "month" },
        },
        {
          id: "expense_1",
          type: "expense_breakdown",
          position: { x: 4, y: 0 },
          size: { width: 4, height: 3 },
          config: { period: "month" },
        },
        {
          id: "recent_1",
          type: "recent_items",
          position: { x: 0, y: 3 },
          size: { width: 3, height: 2 },
          config: { itemTypes: ["invoice", "payment"] },
        },
      ],
      hr: [
        {
          id: "stat_1",
          type: "stat_card",
          position: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          config: { title: "Total Employees", dataSource: "hr.employee_count" },
        },
        {
          id: "calendar_1",
          type: "calendar",
          position: { x: 2, y: 0 },
          size: { width: 4, height: 4 },
          config: { eventSource: "hr.leaves_and_events" },
        },
        {
          id: "upcoming_1",
          type: "upcoming_events",
          position: { x: 6, y: 0 },
          size: { width: 2, height: 4 },
          config: { daysAhead: 30 },
        },
      ],
      project_manager: [
        {
          id: "stat_1",
          type: "stat_card",
          position: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          config: { title: "Active Projects", dataSource: "projects.active_count" },
        },
        {
          id: "task_board_1",
          type: "task_board",
          position: { x: 2, y: 0 },
          size: { width: 6, height: 4 },
          config: { statuses: ["todo", "in_progress", "review", "done"] },
        },
        {
          id: "upcoming_1",
          type: "upcoming_events",
          position: { x: 0, y: 4 },
          size: { width: 4, height: 2 },
          config: { types: ["milestone", "deadline"] },
        },
      ],
    };

    return defaultLayouts[ctx.user.role] || defaultLayouts.admin;
  }),

  /**
   * Save widget layout
   */
  saveLayout: createFeatureRestrictedProcedure("dashboard:customize")
    .input(
      z.object({
        widgets: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            position: z.object({ x: z.number(), y: z.number() }),
            size: z.object({ width: z.number(), height: z.number() }),
            config: z.record(z.string(), z.any()),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // In a real implementation, save to database
      // For now, just return success
      return {
        success: true,
        message: "Layout saved successfully",
        widgets: input.widgets,
      };
    }),

  /**
   * Get widget data
   */
  getWidgetData: protectedProcedure
    .input(
      z.object({
        widgetType: z.string(),
        config: z.record(z.string(), z.any()),
      })
    )
    .query(async ({ input }) => {
      // Fetch data based on widget type and configuration
      // This would connect to various data sources
      switch (input.widgetType) {
        case "stat_card":
          return {
            value: "1000",
            unit: "KES",
            change: "+5%",
            trend: "up",
          };
        case "chart":
          return {
            labels: ["Jan", "Feb", "Mar"],
            datasets: [
              { label: "Revenue", data: [100, 150, 200] },
            ],
          };
        case "alerts":
          return [
            { id: "1", severity: "high", message: "Payment overdue", date: new Date() },
            { id: "2", severity: "medium", message: "Low inventory", date: new Date() },
          ];
        default:
          return { message: "Widget data not available" };
      }
    }),

  /**
   * Preview widget
   */
  previewWidget: protectedProcedure
    .input(
      z.object({
        widgetType: z.string(),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .query(async ({ input }) => {
      return {
        type: input.widgetType,
        config: input.config,
        preview: true,
      };
    }),
});

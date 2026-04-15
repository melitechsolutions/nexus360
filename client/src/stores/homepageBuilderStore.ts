import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { broadcastHomepageUpdate } from '@/hooks/customizationBroadcast';

export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  category: "finance" | "hr" | "sales" | "operations" | "analytics";
  enabled: boolean;
  size: "small" | "medium" | "large";
  order: number;
}

const DEFAULT_WIDGETS: Record<string, DashboardWidget> = {
  revenueMetrics: {
    id: "revenue",
    title: "Revenue Metrics",
    description: "Monthly revenue and income summary",
    category: "finance",
    enabled: true,
    size: "medium",
    order: 1,
  },
  employeeOverview: {
    id: "employees",
    title: "Employee Overview",
    description: "Total employees and department breakdown",
    category: "hr",
    enabled: true,
    size: "medium",
    order: 2,
  },
  activeSales: {
    id: "activeSales",
    title: "Active Sales",
    description: "Current sales pipeline",
    category: "sales",
    enabled: true,
    size: "medium",
    order: 3,
  },
  expenseTracker: {
    id: "expenses",
    title: "Expense Tracker",
    description: "Track business expenses and budgets",
    category: "finance",
    enabled: false,
    size: "medium",
    order: 4,
  },
  invoiceStatus: {
    id: "invoices",
    title: "Invoice Status",
    description: "Pending and overdue invoices",
    category: "finance",
    enabled: false,
    size: "small",
    order: 5,
  },
  attendanceTracker: {
    id: "attendance",
    title: "Attendance Tracker",
    description: "Real-time employee attendance",
    category: "hr",
    enabled: false,
    size: "medium",
    order: 6,
  },
  tasksOverview: {
    id: "tasks",
    title: "Tasks Overview",
    description: "Pending and completed tasks",
    category: "operations",
    enabled: false,
    size: "medium",
    order: 7,
  },
  performanceMetrics: {
    id: "performance",
    title: "Performance Metrics",
    description: "KPIs and performance indicators",
    category: "analytics",
    enabled: false,
    size: "large",
    order: 8,
  },
};

interface HomepageBuilderStore {
  widgets: Record<string, DashboardWidget>;
  widgetOrder: string[];

  // Actions
  toggleWidget: (id: string) => void;
  enableWidget: (id: string) => void;
  disableWidget: (id: string) => void;
  reorderWidgets: (order: string[]) => void;
  moveWidgetUp: (id: string) => void;
  moveWidgetDown: (id: string) => void;
  resetToDefault: () => void;
  getEnabledWidgets: () => DashboardWidget[];
  getWidgetsByCategory: (category: string) => DashboardWidget[];
}

export const useHomepageBuilderStore = create<HomepageBuilderStore>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,
      widgetOrder: Object.keys(DEFAULT_WIDGETS).sort(
        (a, b) => (get().widgets[a]?.order ?? 0) - (get().widgets[b]?.order ?? 0)
      ),

      toggleWidget: (id) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [id]: {
              ...state.widgets[id],
              enabled: !state.widgets[id]?.enabled,
            },
          },
        }));
      },

      enableWidget: (id) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [id]: {
              ...state.widgets[id],
              enabled: true,
            },
          },
        }));
      },

      disableWidget: (id) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [id]: {
              ...state.widgets[id],
              enabled: false,
            },
          },
        }));
      },

      reorderWidgets: (order) => {
        set((state) => {
          const newWidgets = { ...state.widgets };
          order.forEach((id, index) => {
            if (newWidgets[id]) {
              newWidgets[id].order = index + 1;
            }
          });
          return {
            widgets: newWidgets,
            widgetOrder: order,
          };
        });
        // Broadcast to all tabs
        const state = get();
        broadcastHomepageUpdate(state.widgets, state.widgetOrder);
      },

      moveWidgetUp: (id) => {
        const { widgets, widgetOrder } = get();
        const currentIndex = widgetOrder.indexOf(id);
        if (currentIndex > 0) {
          const newOrder = [...widgetOrder];
          [newOrder[currentIndex], newOrder[currentIndex - 1]] = [
            newOrder[currentIndex - 1],
            newOrder[currentIndex],
          ];
          get().reorderWidgets(newOrder);
        }
      },

      moveWidgetDown: (id) => {
        const { widgets, widgetOrder } = get();
        const currentIndex = widgetOrder.indexOf(id);
        if (currentIndex < widgetOrder.length - 1) {
          const newOrder = [...widgetOrder];
          [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
            newOrder[currentIndex + 1],
            newOrder[currentIndex],
          ];
          get().reorderWidgets(newOrder);
        }
      },

      resetToDefault: () => {
        set({
          widgets: DEFAULT_WIDGETS,
          widgetOrder: Object.keys(DEFAULT_WIDGETS).sort(
            (a, b) => (DEFAULT_WIDGETS[a]?.order ?? 0) - (DEFAULT_WIDGETS[b]?.order ?? 0)
          ),
        });
      },

      getEnabledWidgets: () => {
        const { widgets, widgetOrder } = get();
        return widgetOrder
          .filter((id) => widgets[id]?.enabled)
          .map((id) => widgets[id])
          .filter(Boolean);
      },

      getWidgetsByCategory: (category) => {
        const { widgets, widgetOrder } = get();
        return widgetOrder
          .map((id) => widgets[id])
          .filter((w) => w && w.category === category)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: "homepage-builder-store",
      version: 1,
    }
  )
);

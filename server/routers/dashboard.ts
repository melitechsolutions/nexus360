import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, gte, lte, lt, desc, inArray, sum, count, sql } from "drizzle-orm";
import { z } from "zod";
import { 
  projects, 
  clients, 
  invoices, 
  payments, 
  expenses, 
  products, 
  services, 
  employees,
  activityLog,
  projectTasks,
} from "../../drizzle/schema";

export const dashboardRouter = router({
  // Get dashboard stats for Quick Actions sidebar
  stats: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        activeProjects: 0,
        newProjects: 0,
        totalClients: 0,
        newClients: 0,
      };
    }

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const monthStartStr = monthStart.toISOString();
      const lastMonthStartStr = lastMonthStart.toISOString().replace('T', ' ').substring(0, 19);
      const lastMonthEndStr = lastMonthEnd.toISOString().replace('T', ' ').substring(0, 19);

      // Get total revenue (all payments)
      const allPayments = await db.select({ amount: payments.amount, status: payments.status }).from(payments).limit(10000);
      const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Get this month's revenue
      const thisMonthPayments = await db
        .select({ amount: payments.amount, paymentDate: payments.paymentDate })
        .from(payments)
        .where(gte(payments.paymentDate, monthStartStr))
        .limit(1000);
      const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Get last month's revenue
      const lastMonthPayments = await db
        .select({ amount: payments.amount, paymentDate: payments.paymentDate })
        .from(payments)
        .where(
          and(
            gte(payments.paymentDate, lastMonthStartStr),
            lte(payments.paymentDate, lastMonthEndStr)
          )
        )
        .limit(1000);
      const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calculate revenue growth
      const revenueGrowth = lastMonthRevenue > 0 
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      // Get active projects
      const activeProjectsData = await db
        .select()
        .from(projects)
        .where(eq(projects.status, "active"))
        .limit(1000);
      const activeProjects = activeProjectsData.length;

      // Get new projects this month
      const newProjectsData = await db
        .select()
        .from(projects)
        .where(gte(projects.createdAt, monthStartStr))
        .limit(1000);
      const newProjects = newProjectsData.length;

      // Get total clients
      const allClients = await db.select().from(clients).limit(10000);
      const totalClients = allClients.length;

      // Get new clients this month
      const newClientsData = await db
        .select()
        .from(clients)
        .where(gte(clients.createdAt, monthStartStr))
        .limit(1000);
      const newClients = newClientsData.length;

      return {
        totalRevenue,
        revenueGrowth,
        activeProjects,
        newProjects,
        totalClients,
        newClients,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        activeProjects: 0,
        newProjects: 0,
        totalClients: 0,
        newClients: 0,
      };
    }
  }),

  // Get recent activity for Quick Actions sidebar
  recentActivity: createFeatureRestrictedProcedure("dashboard:view")
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const limit = input?.limit || 10;
        const activities = await db
          .select()
          .from(activityLog)
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);

        // Convert frozen objects to mutable objects to avoid React error #306
        return activities.map(activity => ({
          id: activity.id || '',
          userId: activity.userId || '',
          action: activity.action || '',
          entityType: activity.entityType || '',
          entityId: activity.entityId || '',
          description: activity.description || '',
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
        }));
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
      }
    }),

  // Get dashboard metrics
  metrics: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        totalProjects: 0,
        activeClients: 0,
        pendingInvoices: 0,
        monthlyRevenue: 0,
        totalProducts: 0,
        totalServices: 0,
        totalEmployees: 0,
        totalAccounts: 0,
      };
    }

    try {
      // Get total projects
      const projectsData = await db.select().from(projects).limit(1000);
      const totalProjects = projectsData.length;

      // Get active clients
      const clientsData = await db.select().from(clients).where(eq(clients.status, "active")).limit(1000);
      const activeClients = clientsData.length;

      // Get pending invoices
      const invoicesData = await db.select().from(invoices).where(eq(invoices.status, "sent")).limit(1000);
      const pendingInvoices = invoicesData.length;

      // Get monthly revenue (payments from this month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const monthStartStr = monthStart.toISOString().replace('T', ' ').substring(0, 19);
      const monthEndStr = monthEnd.toISOString().replace('T', ' ').substring(0, 19);

      const paymentsData = await db
        .select()
        .from(payments)
        .where(
          and(
            gte(payments.paymentDate, monthStartStr),
            lte(payments.paymentDate, monthEndStr)
          )
        )
        .limit(1000);

      const monthlyRevenue = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Get total products
      const productsData = await db.select().from(products).limit(1000);
      const totalProducts = productsData.length;

      // Get total services
      const servicesData = await db.select().from(services).limit(1000);
      const totalServices = servicesData.length;

      // Get total employees
      const employeesData = await db.select().from(employees).limit(1000);
      const totalEmployees = employeesData.length;

      return {
        totalProjects,
        activeClients,
        pendingInvoices,
        monthlyRevenue,
        totalProducts,
        totalServices,
        totalEmployees,
        totalAccounts: 0, // Placeholder
      };
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      return {
        totalProjects: 0,
        activeClients: 0,
        pendingInvoices: 0,
        monthlyRevenue: 0,
        totalProducts: 0,
        totalServices: 0,
        totalEmployees: 0,
        totalAccounts: 0,
      };
    }
  }),

  // Get accounting metrics
  accountingMetrics: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        totalInvoices: 0,
        totalPayments: 0,
        totalExpenses: 0,
        totalRevenue: 0,
      };
    }

    try {
      // Get total invoices
      const invoicesData = await db.select({ total: invoices.total }).from(invoices).limit(1000);
      const totalInvoices = invoicesData.length;

      // Get total payments
      const paymentsData = await db.select({ amount: payments.amount }).from(payments).limit(1000);
      const totalPayments = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Get total expenses
      const expensesData = await db.select({ amount: expenses.amount }).from(expenses).limit(1000);
      const totalExpenses = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Get total revenue (from invoices)
      const totalRevenue = invoicesData.reduce((sum, i) => sum + (i.total || 0), 0);

      return {
        totalInvoices,
        totalPayments,
        totalExpenses,
        totalRevenue,
      };
    } catch (error) {
      console.error("Error fetching accounting metrics:", error);
      return {
        totalInvoices: 0,
        totalPayments: 0,
        totalExpenses: 0,
        totalRevenue: 0,
      };
    }
  }),

  // Get HR metrics
  hrMetrics: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalDepartments: 0,
      };
    }

    try {
      // Get total employees
      const employeesData = await db.select().from(employees).limit(1000);
      const totalEmployees = employeesData.length;

      // Get active employees
      const activeEmployees = employeesData.filter((e) => e.status === "active").length;

      // Get total departments (placeholder)
      const totalDepartments = 0;

      return {
        totalEmployees,
        activeEmployees,
        totalDepartments,
      };
    } catch (error) {
      console.error("Error fetching HR metrics:", error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalDepartments: 0,
      };
    }
  }),

  /**
   * Get calendar events for a given month (global – no org scope).
   * Aggregates invoice due dates, project end dates, and task due dates.
   */
  getCalendarEvents: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { events: [] };

      try {
        const padded = (n: number) => String(n).padStart(2, '0');
        const startOfMonth = `${input.year}-${padded(input.month)}-01 00:00:00`;
        const lastDay = new Date(input.year, input.month, 0).getDate();
        const endOfMonth = `${input.year}-${padded(input.month)}-${padded(lastDay)} 23:59:59`;

        const [monthInvoices, allProjects] = await Promise.all([
          db.select().from(invoices).where(
            and(
              gte(invoices.dueDate, startOfMonth),
              lte(invoices.dueDate, endOfMonth),
            )
          ).limit(500),
          db.select().from(projects).limit(2000),
        ]);

        const projectsDueThisMonth = allProjects.filter((p) => {
          if (!p.endDate) return false;
          const d = String(p.endDate).slice(0, 10);
          return d >= startOfMonth.slice(0, 10) && d <= endOfMonth.slice(0, 10);
        });

        const allProjectIds = allProjects.map((p) => p.id);
        let tasksDue: any[] = [];
        if (allProjectIds.length > 0) {
          tasksDue = await db.select().from(projectTasks).where(
            and(
              inArray(projectTasks.projectId, allProjectIds),
              gte(projectTasks.dueDate, startOfMonth),
              lte(projectTasks.dueDate, endOfMonth),
            )
          ).limit(500);
        }

        const events: Array<{
          id: string;
          type: 'invoice' | 'project' | 'task';
          title: string;
          date: string;
          status: string;
          href: string;
          color: string;
        }> = [];

        for (const inv of monthInvoices) {
          events.push({
            id: `inv_${inv.id}`,
            type: 'invoice',
            title: `Invoice ${inv.invoiceNumber} due`,
            date: String(inv.dueDate).slice(0, 10),
            status: inv.status,
            href: `/invoices/${inv.id}`,
            color: inv.status === 'paid' ? '#22c55e' : inv.status === 'overdue' ? '#ef4444' : '#3b82f6',
          });
        }

        for (const proj of projectsDueThisMonth) {
          events.push({
            id: `proj_${proj.id}`,
            type: 'project',
            title: `${proj.name} deadline`,
            date: String(proj.endDate!).slice(0, 10),
            status: proj.status,
            href: `/projects/${proj.id}`,
            color: proj.status === 'completed' ? '#22c55e' : proj.status === 'on_hold' ? '#f59e0b' : '#a855f7',
          });
        }

        for (const task of tasksDue) {
          if (!task.dueDate) continue;
          events.push({
            id: `task_${task.id}`,
            type: 'task',
            title: task.title,
            date: String(task.dueDate).slice(0, 10),
            status: task.status,
            href: `/projects/${task.projectId}`,
            color: task.status === 'completed' ? '#22c55e' : task.priority === 'urgent' ? '#ef4444' : '#f97316',
          });
        }

        return { events };
      } catch (error) {
        console.error('[dashboard.getCalendarEvents] Error:', error);
        return { events: [] };
      }
    }),

  // Monthly income vs expenses chart data (last 12 months)
  monthlyChart: createFeatureRestrictedProcedure("dashboard:view")
    .input(z.object({ year: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { months: [], year: new Date().getFullYear() };

      try {
        const year = input?.year || new Date().getFullYear();
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const months = [];

        for (let m = 0; m < 12; m++) {
          const start = new Date(year, m, 1).toISOString().slice(0, 19).replace('T', ' ');
          const end = new Date(year, m + 1, 0, 23, 59, 59).toISOString().slice(0, 19).replace('T', ' ');

          const paymentsData = await db
            .select({ amount: payments.amount })
            .from(payments)
            .where(and(gte(payments.paymentDate, start), lte(payments.paymentDate, end)))
            .limit(1000);
          const income = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);

          const expensesData = await db
            .select({ amount: expenses.amount })
            .from(expenses)
            .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end)))
            .limit(1000);
          const expense = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);

          months.push({ month: m + 1, name: monthNames[m], income, expense });
        }

        return { months, year };
      } catch (error) {
        console.error("Error fetching monthly chart data:", error);
        return { months: [], year: input?.year || new Date().getFullYear() };
      }
    }),

  // Financial summary cards (like crm.africa top stats)
  financialSummary: createFeatureRestrictedProcedure("dashboard:view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { paymentsToday: 0, paymentsMonth: 0, invoicesDue: 0, invoicesOverdue: 0 };

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 19).replace('T', ' ');
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString().slice(0, 19).replace('T', ' ');
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19).replace('T', ' ');
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19).replace('T', ' ');
      const todayStr = now.toISOString().replace('T', ' ').substring(0, 19).slice(0, 10);

      const todayPay = await db.select({ amount: payments.amount }).from(payments)
        .where(and(gte(payments.paymentDate, todayStart), lte(payments.paymentDate, todayEnd))).limit(500);
      const paymentsToday = todayPay.reduce((s, p) => s + (p.amount || 0), 0);

      const monthPay = await db.select({ amount: payments.amount }).from(payments)
        .where(and(gte(payments.paymentDate, monthStart), lte(payments.paymentDate, monthEnd))).limit(1000);
      const paymentsMonth = monthPay.reduce((s, p) => s + (p.amount || 0), 0);

      const dueInv = await db.select({ total: invoices.total }).from(invoices)
        .where(and(eq(invoices.status, 'sent'), gte(invoices.dueDate, todayStr))).limit(500);
      const invoicesDue = dueInv.reduce((s, i) => s + (i.total || 0), 0);

      const overdueInv = await db.select({ total: invoices.total }).from(invoices)
        .where(and(inArray(invoices.status, ['sent', 'partial']), lte(invoices.dueDate, todayStr))).limit(500);
      const invoicesOverdue = overdueInv.reduce((s, i) => s + (i.total || 0), 0);

      return { paymentsToday, paymentsMonth, invoicesDue, invoicesOverdue };
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      return { paymentsToday: 0, paymentsMonth: 0, invoicesDue: 0, invoicesOverdue: 0 };
    }
  }),
});

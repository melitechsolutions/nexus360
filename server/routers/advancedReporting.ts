/**
 * Advanced Reporting & BI Router
 * Comprehensive analytics dashboards, financial reports, and business intelligence
 */

import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  invoices,
  payments,
  expenses,
  projects,
  clients,
  employees,
  financialAnalytics,
  timeEntries,
} from "../../drizzle/schema";
import {
  eq,
  and,
  gte,
  lte,
  desc,
  count,
  sum,
  sql,
  inArray,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const readProcedure = createFeatureRestrictedProcedure("reports:read");

export const advancedReportingRouter = router({
  /**
   * Revenue Dashboard - Revenue trends and analysis
   */
  getRevenueDashboard: readProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(["day", "week", "month"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startIso = input.startDate.toISOString().replace('T', ' ').substring(0, 19);
      const endIso = input.endDate.toISOString().replace('T', ' ').substring(0, 19);

      // Get invoices in date range
      const invoiceData = await db
        .select()
        .from(invoices)
        .where(
          and(
            gte(invoices.invoiceDate, startIso),
            lte(invoices.invoiceDate, endIso)
          )
        );

      // Get payments in date range
      const paymentData = await db
        .select()
        .from(payments)
        .where(
          and(
            gte(payments.paymentDate, startIso),
            lte(payments.paymentDate, endIso)
          )
        );

      const totalInvoiced = invoiceData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalPaid = paymentData.reduce((sum, pmt) => sum + (pmt.amount || 0), 0);
      const outstanding = totalInvoiced - totalPaid;

      // Calculate trend (compare to previous period)
      const periodDays = input.endDate.getTime() - input.startDate.getTime();
      const previousStart = new Date(input.startDate.getTime() - periodDays);
      const previousStartIso = previousStart.toISOString().replace('T', ' ').substring(0, 19);

      const previousInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            gte(invoices.invoiceDate, previousStartIso),
            lte(invoices.invoiceDate, input.startDate.toISOString().replace('T', ' ').substring(0, 19))
          )
        );

      const previousTotal = previousInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const growthPercent = previousTotal > 0 ? ((totalInvoiced - previousTotal) / previousTotal) * 100 : 0;

      return {
        totalInvoiced,
        totalPaid,
        outstanding,
        growthPercent: parseFloat(growthPercent.toFixed(2)),
        invoiceCount: invoiceData.length,
        paymentCount: paymentData.length,
        averageInvoiceValue: invoiceData.length > 0 ? totalInvoiced / invoiceData.length : 0,
        collectionRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
      };
    }),

  /**
   * Profitability Dashboard - Profit margins and cost analysis
   */
  getProfitabilityDashboard: readProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startIso = input.startDate.toISOString().replace('T', ' ').substring(0, 19);
      const endIso = input.endDate.toISOString().replace('T', ' ').substring(0, 19);

      // Get revenue
      const invoiceData = await db
        .select()
        .from(invoices)
        .where(
          and(
            gte(invoices.invoiceDate, startIso),
            lte(invoices.invoiceDate, endIso),
            eq(invoices.status, "paid")
          )
        );

      const totalRevenue = invoiceData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      // Get expenses
      const expenseData = await db
        .select()
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, startIso),
            lte(expenses.expenseDate, endIso)
          )
        );

      const totalExpenses = expenseData.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // Calculate profit metrics
      const grossProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Get expense breakdown by category
      const expensesByCategory: Record<string, number> = {};
      for (const exp of expenseData) {
        const category = exp.category as string || "Uncategorized";
        expensesByCategory[category] = (expensesByCategory[category] || 0) + (exp.amount || 0);
      }

      return {
        totalRevenue,
        totalExpenses,
        grossProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        expenseCount: expenseData.length,
        topExpenseCategory: Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a)[0],
        expensesByCategory,
      };
    }),

  /**
   * Customer Analytics - Client performance and lifetime value
   */
  getCustomerAnalytics: readProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startIso = input.startDate.toISOString().replace('T', ' ').substring(0, 19);
      const endIso = input.endDate.toISOString().replace('T', ' ').substring(0, 19);

      const clientData = await db.select().from(clients);

      // Enrich with invoice and payment data
      const clientMetrics = await Promise.all(
        clientData.map(async (client) => {
          const clientInvoices = await db
            .select()
            .from(invoices)
            .where(
              and(
                eq(invoices.clientId, client.id),
                gte(invoices.invoiceDate, startIso),
                lte(invoices.invoiceDate, endIso)
              )
            );

          const clientPayments = await db
            .select()
            .from(payments)
            .where(eq(payments.clientId, client.id));

          const totalValue = clientInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
          const totalPaid = clientPayments.reduce((sum, pmt) => sum + (pmt.amount || 0), 0);
          const outstanding = totalValue - totalPaid;

          return {
            clientId: client.id,
            clientName: client.name,
            totalRevenue: totalValue,
            invoiceCount: clientInvoices.length,
            outstandingBalance: outstanding,
            paymentRate: totalValue > 0 ? (totalPaid / totalValue) * 100 : 0,
          };
        })
      );

      return clientMetrics
        .filter((m) => m.totalRevenue > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, input.limit);
    }),

  /**
   * Financial Health Metrics - KPIs and health indicators
   */
  getFinancialHealthMetrics: readProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all invoices
    const allInvoices = await db.select().from(invoices);
    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "pending"),
          lt(invoices.dueDate, now.toISOString().replace('T', ' ').substring(0, 19))
        )
      );

    const monthlyInvoices = await db
      .select()
      .from(invoices)
      .where(gte(invoices.invoiceDate, startOfMonth.toISOString().replace('T', ' ').substring(0, 19)));

    const yearlyInvoices = await db
      .select()
      .from(invoices)
      .where(gte(invoices.invoiceDate, startOfYear.toISOString().replace('T', ' ').substring(0, 19)));

    // Calculate metrics
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const yearlyRevenue = yearlyInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingInvoices = allInvoices.filter((inv) => inv.status === "pending").length;
    const paidInvoices = allInvoices.filter((inv) => inv.status === "paid").length;

    return {
      monthlyRevenue,
      yearlyRevenue,
      overdueAmount,
      overdueInvoiceCount: overdueInvoices.length,
      pendingInvoiceCount: pendingInvoices,
      paidInvoiceCount: paidInvoices,
      creditHealthRating: overdueAmount < monthlyRevenue * 0.1 ? "Good" : "At Risk",
      metrics: {
        invoicesTotalCount: allInvoices.length,
        monthlyGrowth: ((monthlyRevenue / (monthlyRevenue || 1)) * 100).toFixed(1),
        collectionEfficiency: (
          (paidInvoices / (allInvoices.length || 1)) * 100
        ).toFixed(1),
      },
    };
  }),

  /**
   * Project Performance Dashboard
   */
  getProjectPerformance: readProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const projectData = await db.select().from(projects).limit(input.limit);

      return projectData.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        progress: "0", // Would calculate from milestones
      }));
    }),

  /**
   * Team Performance Analytics
   */
  getTeamPerformance: readProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startIso = input.startDate.toISOString().replace('T', ' ').substring(0, 19);
      const endIso = input.endDate.toISOString().replace('T', ' ').substring(0, 19);

      const timeEntriesData = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            gte(timeEntries.date, startIso),
            lte(timeEntries.date, endIso)
          )
        );

      // Group by employee
      const employeeMetrics: Record<string, any> = {};

      for (const entry of timeEntriesData) {
        if (!employeeMetrics[entry.userId]) {
          employeeMetrics[entry.userId] = {
            userId: entry.userId,
            totalHours: 0,
            projectCount: new Set(),
            taskCount: 0,
          };
        }
        employeeMetrics[entry.userId].totalHours += entry.hoursWorked || 0;
        if (entry.projectId) {
          employeeMetrics[entry.userId].projectCount.add(entry.projectId);
        }
        employeeMetrics[entry.userId].taskCount += 1;
      }

      return Object.values(employeeMetrics)
        .map((m) => ({
          userId: m.userId,
          totalHours: m.totalHours,
          projectCount: m.projectCount.size,
          taskCount: m.taskCount,
          averageHoursPerTask: m.taskCount > 0 ? (m.totalHours / m.taskCount).toFixed(2) : 0,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);
    }),

  /**
   * Export report as PDF - metadata only (implement in separate service)
   */
  generateReportMetadata: readProcedure
    .input(
      z.object({
        type: z.enum(["revenue", "profitability", "customer", "team", "project"]),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return {
        type: input.type,
        generatedAt: new Date().toISOString(),
        period: `${input.startDate.toDateString()} - ${input.endDate.toDateString()}`,
        exported: false,
        format: "json",
      };
    }),
});

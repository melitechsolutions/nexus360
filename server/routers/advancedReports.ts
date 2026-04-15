/**
 * Advanced Reporting Router
 * 
 * Provides analytics and reporting endpoints for quotes, conversions, revenue, and performance
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { quotes, quoteLogs } from "../../drizzle/schema-extended";
import { invoices } from "../../drizzle/schema";
import { eq, gte, lte, and } from "drizzle-orm";

export const advancedReportsRouter = router({
  /**
   * Get overall quote metrics
   */
  getQuoteMetrics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const allQuotes = await db.query.quotes.findMany({});
        
        const metrics = {
          total: allQuotes.length,
          draft: allQuotes.filter(q => q.status === "draft").length,
          sent: allQuotes.filter(q => q.status === "sent").length,
          accepted: allQuotes.filter(q => q.status === "accepted").length,
          declined: allQuotes.filter(q => q.status === "declined").length,
          expired: allQuotes.filter(q => q.status === "expired").length,
          converted: allQuotes.filter(q => q.status === "converted").length,
          totalValue: allQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
          averageValue: allQuotes.length > 0 
            ? allQuotes.reduce((sum, q) => sum + (q.total || 0), 0) / allQuotes.length
            : 0,
        };

        return metrics;
      } catch (error) {
        console.error("Metrics error:", error);
        return null;
      }
    }),

  /**
   * Get quote to invoice conversion analytics
   */
  getConversionAnalytics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const allQuotes = await db.query.quotes.findMany({});

        const converted = allQuotes.filter(q => q.status === "converted").length;
        const total = allQuotes.length;
        const conversionRate = total > 0 ? (converted / total) * 100 : 0;

        // Calculate by month
        const monthlyData = new Map<string, { sent: number; converted: number }>();
        
        allQuotes.forEach(q => {
          if (q.createdAt) {
            const month = q.createdAt.toISOString().replace('T', ' ').substring(0, 19).slice(0, 7); // YYYY-MM
            const current = monthlyData.get(month) || { sent: 0, converted: 0 };
            current.sent++;
            if (q.status === "converted") current.converted++;
            monthlyData.set(month, current);
          }
        });

        const monthlyTrends = Array.from(monthlyData.entries())
          .sort()
          .map(([month, data]) => ({
            month,
            sent: data.sent,
            converted: data.converted,
            conversionRate: data.sent > 0 ? (data.converted / data.sent) * 100 : 0,
          }));

        // Calculate by status transition
        const statusBreakdown = {
          draft: allQuotes.filter(q => q.status === "draft").length,
          sent: allQuotes.filter(q => q.status === "sent").length,
          accepted: allQuotes.filter(q => q.status === "accepted").length,
          declined: allQuotes.filter(q => q.status === "declined").length,
          expired: allQuotes.filter(q => q.status === "expired").length,
          converted: allQuotes.filter(q => q.status === "converted").length,
        };

        return {
          overallConversionRate: conversionRate,
          totalQuotes: total,
          convertedQuotes: converted,
          monthlyTrends,
          statusBreakdown,
          topConvertedAmount: allQuotes
            .filter(q => q.status === "converted")
            .sort((a, b) => (b.total || 0) - (a.total || 0))[0]?.total || 0,
          averageConversionTime: 0, // Placeholder for future calculation
        };
      } catch (error) {
        console.error("Conversion analytics error:", error);
        return null;
      }
    }),

  /**
   * Get revenue forecasting data
   */
  getRevenueForecasting: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const allQuotes = await db.query.quotes.findMany({});

        // Calculate monthly revenue from converted quotes
        const monthlyRevenue = new Map<string, number>();
        
        allQuotes.forEach(q => {
          if (q.status === "converted" && q.createdAt) {
            const month = q.createdAt.toISOString().replace('T', ' ').substring(0, 19).slice(0, 7);
            const current = monthlyRevenue.get(month) || 0;
            monthlyRevenue.set(month, current + (q.total || 0));
          }
        });

        // Generate forecast based on average of last 3 months
        const revenueArray = Array.from(monthlyRevenue.entries())
          .sort()
          .slice(-3)
          .map(([_, rev]) => rev);

        const averageMonthlyRevenue = revenueArray.length > 0
          ? revenueArray.reduce((a, b) => a + b, 0) / revenueArray.length
          : 0;

        // Create historical + forecast data
        const historicalMonths = Array.from(monthlyRevenue.entries())
          .sort()
          .map(([month, revenue]) => ({
            month,
            actual: revenue,
            forecast: null,
          }));

        // Generate forecast for next N months
        const currentDate = new Date();
        const forecast = [];
        for (let i = 1; i <= input.months; i++) {
          const futureDate = new Date(currentDate);
          futureDate.setMonth(futureDate.getMonth() + i);
          const month = futureDate.toISOString().slice(0, 7);
          
          // Add variation to forecast (±15%)
          const variation = (Math.random() - 0.5) * 0.3;
          const forecastedRevenue = averageMonthlyRevenue * (1 + variation);
          
          forecast.push({
            month,
            actual: null,
            forecast: Math.max(0, forecastedRevenue),
          });
        }

        return {
          averageMonthlyRevenue,
          historicalData: historicalMonths,
          forecastData: forecast,
          totalHistoricalRevenue: Array.from(monthlyRevenue.values()).reduce((a, b) => a + b, 0),
          projectedRevenue: forecast.reduce((sum, m) => sum + (m.forecast || 0), 0),
        };
      } catch (error) {
        console.error("Revenue forecasting error:", error);
        return null;
      }
    }),

  /**
   * Get client performance metrics
   */
  getClientPerformance: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const allQuotes = await db.query.quotes.findMany({});

        // Group by client
        const clientMap = new Map<string, {
          clientId: string;
          totalQuotes: number;
          convertedQuotes: number;
          conversionRate: number;
          totalValue: number;
          averageValue: number;
        }>();

        allQuotes.forEach(q => {
          const clientId = q.clientId;
          const current = clientMap.get(clientId) || {
            clientId,
            totalQuotes: 0,
            convertedQuotes: 0,
            conversionRate: 0,
            totalValue: 0,
            averageValue: 0,
          };

          current.totalQuotes++;
          if (q.status === "converted") current.convertedQuotes++;
          current.totalValue += q.total || 0;

          clientMap.set(clientId, current);
        });

        // Calculate metrics and sort
        const clientPerformance = Array.from(clientMap.values())
          .map(c => ({
            ...c,
            conversionRate: c.totalQuotes > 0 ? (c.convertedQuotes / c.totalQuotes) * 100 : 0,
            averageValue: c.totalQuotes > 0 ? c.totalValue / c.totalQuotes : 0,
          }))
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, input.limit);

        return {
          topClients: clientPerformance,
          totalUniqueClients: clientMap.size,
          averageClientValue: Array.from(clientMap.values()).reduce((sum, c) => sum + c.totalValue, 0) / clientMap.size,
        };
      } catch (error) {
        console.error("Client performance error:", error);
        return null;
      }
    }),

  /**
   * Get monthly trends data
   */
  getMonthlyTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const allQuotes = await db.query.quotes.findMany({});

        const monthlyData = new Map<string, {
          created: number;
          sent: number;
          accepted: number;
          converted: number;
          declined: number;
          revenue: number;
        }>();

        allQuotes.forEach(q => {
          if (q.createdAt) {
            const month = q.createdAt.toISOString().replace('T', ' ').substring(0, 19).slice(0, 7);
            const current = monthlyData.get(month) || {
              created: 0,
              sent: 0,
              accepted: 0,
              converted: 0,
              declined: 0,
              revenue: 0,
            };

            current.created++;
            if (q.status === "sent") current.sent++;
            if (q.status === "accepted") current.accepted++;
            if (q.status === "converted") {
              current.converted++;
              current.revenue += q.total || 0;
            }
            if (q.status === "declined") current.declined++;

            monthlyData.set(month, current);
          }
        });

        const trends = Array.from(monthlyData.entries())
          .sort()
          .slice(-input.months)
          .map(([month, data]) => ({
            month,
            ...data,
          }));

        return {
          trends,
          totalMonths: monthlyData.size,
        };
      } catch (error) {
        console.error("Monthly trends error:", error);
        return null;
      }
    }),

  /**
   * Get quote status distribution
   */
  getStatusDistribution: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const allQuotes = await db.query.quotes.findMany({});

        const distribution = {
          draft: allQuotes.filter(q => q.status === "draft").length,
          sent: allQuotes.filter(q => q.status === "sent").length,
          accepted: allQuotes.filter(q => q.status === "accepted").length,
          declined: allQuotes.filter(q => q.status === "declined").length,
          expired: allQuotes.filter(q => q.status === "expired").length,
          converted: allQuotes.filter(q => q.status === "converted").length,
        };

        const total = Object.values(distribution).reduce((a, b) => a + b, 0);

        return {
          distribution,
          total,
          percentages: {
            draft: total > 0 ? (distribution.draft / total) * 100 : 0,
            sent: total > 0 ? (distribution.sent / total) * 100 : 0,
            accepted: total > 0 ? (distribution.accepted / total) * 100 : 0,
            declined: total > 0 ? (distribution.declined / total) * 100 : 0,
            expired: total > 0 ? (distribution.expired / total) * 100 : 0,
            converted: total > 0 ? (distribution.converted / total) * 100 : 0,
          },
        };
      } catch (error) {
        console.error("Status distribution error:", error);
        return null;
      }
    }),
});

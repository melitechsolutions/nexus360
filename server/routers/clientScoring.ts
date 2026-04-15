import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";

const readProcedure = createFeatureRestrictedProcedure("analytics:view");

/**
 * Calculate client health score (0-100)
 * Based on: payment timeliness, invoice frequency, revenue, overdue amount, project success
 */
export async function calculateClientHealthScore(clientId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const client = await db.getClient(clientId);
    if (!client) return null;

    // 1. Payment Timeliness (0-25 points)
    const invoices = await db.getInvoicesByClient(clientId);
    let paidOnTimeCount = 0;
    let totalInvoices = 0;

    for (const invoice of invoices) {
      const daysLate = differenceInDays(new Date(invoice.paidAt || new Date()), new Date(invoice.dueDate));
      if (daysLate <= 0) {
        paidOnTimeCount++;
      }
      totalInvoices++;
    }
    const paymentTimelinessScore = totalInvoices > 0 ? Math.round((paidOnTimeCount / totalInvoices) * 25) : 12;

    // 2. Invoice Frequency (0-20 points)
    // More frequent invoicing = higher engagement
    const invoiceFrequency = totalInvoices;
    let invoiceFrequencyScore = 0;
    if (invoiceFrequency >= 12) invoiceFrequencyScore = 20;
    else if (invoiceFrequency >= 8) invoiceFrequencyScore = 15;
    else if (invoiceFrequency >= 4) invoiceFrequencyScore = 10;
    else if (invoiceFrequency >= 1) invoiceFrequencyScore = 5;

    // 3. Total Revenue (0-20 points)
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    let revenueScore = 0;
    if (totalRevenue >= 5000000) revenueScore = 20;
    else if (totalRevenue >= 1000000) revenueScore = 15;
    else if (totalRevenue >= 500000) revenueScore = 10;
    else if (totalRevenue > 0) revenueScore = 5;

    // 4. Overdue Amount (0-20 points, higher is worse)
    const overdueAmount = invoices
      .filter(inv => new Date(inv.dueDate) < new Date())
      .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);
    let overdueScore = 20;
    if (overdueAmount > 1000000) overdueScore = 0;
    else if (overdueAmount > 500000) overdueScore = 5;
    else if (overdueAmount > 100000) overdueScore = 10;
    else if (overdueAmount > 0) overdueScore = 15;

    // 5. Project Success Rate (0-15 points)
    const projects = await db.getClientProjects(clientId);
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const projectSuccessRate = projects.length > 0 ? Math.round((completedProjects / projects.length) * 15) : 7;

    // Calculate overall score
    const totalScore = paymentTimelinessScore + invoiceFrequencyScore + revenueScore + overdueScore + projectSuccessRate;

    // Calculate churn risk (0-100, higher = more risk)
    let churnRisk = 0;
    if (totalScore < 40) churnRisk = 80;
    else if (totalScore < 60) churnRisk = 50;
    else if (totalScore < 80) churnRisk = 20;
    else churnRisk = 5;

    // Determine risk level
    let riskLevel: 'green' | 'yellow' | 'red' = 'green';
    if (totalScore >= 80) riskLevel = 'green';
    else if (totalScore >= 60) riskLevel = 'yellow';
    else riskLevel = 'red';

    // Calculate lifetime value
    const lifetimeValue = totalRevenue;

    // Store score
    const scoreId = uuidv4();
    await db.insertClientHealthScore({
      id: scoreId,
      clientId,
      healthScore: Math.min(100, totalScore),
      riskLevel,
      paymentTimeliness: paymentTimelinessScore,
      invoiceFrequency: invoiceFrequencyScore,
      totalRevenue: totalRevenue,
      overdueAmount: overdueAmount,
      projectSuccessRate: projectSuccessRate,
      churnRisk,
      lifetimeValue,
    });

    return {
      id: scoreId,
      clientId,
      healthScore: Math.min(100, totalScore),
      riskLevel,
      paymentTimeliness: paymentTimelinessScore,
      invoiceFrequency: invoiceFrequencyScore,
      totalRevenue: totalRevenue,
      overdueAmount: overdueAmount,
      projectSuccessRate: projectSuccessRate,
      churnRisk,
      lifetimeValue,
    };
  } catch (error) {
    console.error("[CLIENT SCORING] Error calculating health score:", error);
    return null;
  }
}

export const clientScoringRouter = router({
  /**
   * Get health score for a specific client
   */
  getClientScore: readProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        let score = await db.getClientHealthScore(input.clientId);
        if (!score || differenceInDays(new Date(), new Date(score.calculatedAt)) > 7) {
          // Recalculate if older than 7 days
          score = await calculateClientHealthScore(input.clientId);
        }
        return score;
      } catch (error) {
        console.error("[CLIENT SCORING] Error getting client score:", error);
        return null;
      }
    }),

  /**
   * Get all client scores (risk dashboard)
   */
  getAllClientScores: readProcedure
    .input(
      z.object({
        riskLevel: z.enum(['green', 'yellow', 'red']).optional(),
        sortBy: z.enum(['healthScore', 'totalRevenue', 'churnRisk']).default('healthScore'),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { scores: [] };

      try {
        const scores = await db.getClientHealthScores({
          riskLevel: input.riskLevel,
          sortBy: input.sortBy,
          limit: input.limit,
        });

        return { scores };
      } catch (error) {
        console.error("[CLIENT SCORING] Error getting all scores:", error);
        return { scores: [] };
      }
    }),

  /**
   * Get at-risk clients (red flag)
   */
  getAtRiskClients: readProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { clients: [] };

      try {
        const scores = await db.getClientHealthScores({
          riskLevel: 'red',
          limit: input.limit,
        });

        const clients = [];
        for (const score of scores) {
          const client = await db.getClient(score.clientId);
          if (client) {
            clients.push({
              ...client,
              healthScore: score,
            });
          }
        }

        return { clients };
      } catch (error) {
        console.error("[CLIENT SCORING] Error getting at-risk clients:", error);
        return { clients: [] };
      }
    }),

  /**
   * Get high-value clients
   */
  getHighValueClients: readProcedure
    .input(z.object({ minRevenue: z.number().default(500000), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { clients: [] };

      try {
        const scores = await db.getClientHealthScoresByRevenue(input.minRevenue, input.limit);

        const clients = [];
        for (const score of scores) {
          const client = await db.getClient(score.clientId);
          if (client) {
            clients.push({
              ...client,
              healthScore: score,
            });
          }
        }

        return { clients };
      } catch (error) {
        console.error("[CLIENT SCORING] Error getting high-value clients:", error);
        return { clients: [] };
      }
    }),

  /**
   * Get churn risk analysis
   */
  getChurnRiskAnalysis: readProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return { veryHigh: 0, high: 0, medium: 0, low: 0, atRisk: [] };
      }

      try {
        const scores = await db.getClientHealthScores({ limit: 10000 });

        let veryHigh = 0;
        let high = 0;
        let medium = 0;
        let low = 0;
        const atRisk = [];

        for (const score of scores) {
          if (score.churnRisk >= 75) {
            veryHigh++;
            if (atRisk.length < 20) {
              const client = await db.getClient(score.clientId);
              if (client) {
                atRisk.push({
                  clientName: client.companyName,
                  churnRisk: score.churnRisk,
                  healthScore: score.healthScore,
                  lastInvoice: await db.getLatestInvoice(score.clientId),
                });
              }
            }
          } else if (score.churnRisk >= 50) {
            high++;
          } else if (score.churnRisk >= 25) {
            medium++;
          } else {
            low++;
          }
        }

        return { veryHigh, high, medium, low, atRisk };
      } catch (error) {
        console.error("[CLIENT SCORING] Error getting churn risk analysis:", error);
        return { veryHigh: 0, high: 0, medium: 0, low: 0, atRisk: [] };
      }
    }),

  /**
   * Get growth trends for a client
   */
  getClientGrowthTrends: readProcedure
    .input(z.object({ clientId: z.string(), months: z.number().default(12) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { trends: [] };

      try {
        const trends = await db.getClientRevenueTrends(input.clientId, input.months);
        return { trends };
      } catch (error) {
        console.error("[CLIENT SCORING] Error getting growth trends:", error);
        return { trends: [] };
      }
    }),

  /**
   * Recalculate all client scores
   */
  refreshAllScores: readProcedure.mutation(async ({ ctx }) => {
    if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin') {
      throw new Error('Unauthorized - admin only');
    }

    const db = await getDb();
    if (!db) {
      return { success: false, updated: 0 };
    }

    try {
      const clients = await db.getClients({ limit: 10000 });
      let updated = 0;

      for (const client of clients) {
        await calculateClientHealthScore(client.id);
        updated++;
      }

      return { success: true, updated };
    } catch (error) {
      console.error("[CLIENT SCORING] Error refreshing scores:", error);
      return { success: false, error: String(error) };
    }
  }),
});

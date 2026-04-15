/**
 * AI & Intelligent Insights Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { aiInsights } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const aiViewProcedure = createFeatureRestrictedProcedure('ai:view');
const aiEditProcedure = createFeatureRestrictedProcedure('ai:edit');

export const aiInsightsRouter = router({
  getAiInsightsDashboard: aiViewProcedure
    .input(z.object({
      period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(aiInsights)
        .where(and(eq(aiInsights.insightType, 'dashboard'), eq(aiInsights.period, input.period)))
        .orderBy(desc(aiInsights.createdAt))
        .limit(20);
      const topInsights = rows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        confidence: Number(r.confidence) || 0,
        impact: r.impact,
        trend: r.trend,
        recommendation: r.recommendation,
        dataPoints: r.dataPayload ? JSON.parse(r.dataPayload) : {},
      }));
      return {
        period: input.period,
        topInsights,
        predictiveMetrics: { nextQtrRevenue: { predicted: 0, confidence: 0 }, nextQtrChurn: { predicted: 0, confidence: 0 }, cashFlowRisk: { risk: 'low', days: 0 } },
        anomalies: [],
      };
    }),

  getPredictiveAnalytics: aiViewProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
      forecastPeriod: z.number().default(90),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(aiInsights)
        .where(and(eq(aiInsights.insightType, 'prediction'), eq(aiInsights.entityType, input.entityType), eq(aiInsights.entityId, String(input.entityId))))
        .orderBy(desc(aiInsights.createdAt))
        .limit(10);
      return {
        entity: { type: input.entityType, id: input.entityId },
        forecast: {
          nextRevenue: rows.map(r => ({ date: r.createdAt, predicted: Number(r.dataPayload ? JSON.parse(r.dataPayload).predicted : 0), confidence: Number(r.confidence) || 0 })),
          confidence: rows.length > 0 ? Number(rows[0].confidence) || 0 : 0,
          modelPerformance: { mae: 0, rmse: 0, accuracy: 0 },
        },
        seasonality: { detected: false, strength: 0, factors: [] },
        recommendations: rows.map(r => r.recommendation).filter(Boolean),
      };
    }),

  getSmartRecommendations: aiViewProcedure
    .input(z.object({
      category: z.string(),
      context: z.record(z.string(), z.any()).optional(),
      limit: z.number().min(1).max(20).default(10),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(aiInsights)
        .where(and(eq(aiInsights.insightType, 'recommendation'), eq(aiInsights.entityType, input.category)))
        .orderBy(desc(aiInsights.createdAt))
        .limit(input.limit);
      return {
        category: input.category,
        recommendations: rows.map((r, i) => ({
          id: i + 1,
          title: r.title || '',
          description: r.description || '',
          priority: r.impact || 'medium',
          estimatedImpact: r.dataPayload ? JSON.parse(r.dataPayload) : {},
          successProbability: Number(r.confidence) || 0,
        })),
        historicalAccuracy: 0,
        basedOnDataPoints: 0,
      };
    }),

  detectAnomalies: aiViewProcedure
    .input(z.object({
      entityType: z.string(),
      sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
      lookbackDays: z.number().min(7).max(365).default(30),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(aiInsights)
        .where(and(eq(aiInsights.insightType, 'anomaly'), eq(aiInsights.entityType, input.entityType)))
        .orderBy(desc(aiInsights.createdAt))
        .limit(20);
      return {
        entity: input.entityType,
        sensitivity: input.sensitivity,
        period: `Last ${input.lookbackDays} days`,
        anomalies: rows.map((r, i) => ({
          id: i + 1,
          type: r.title || 'unknown',
          description: r.description || '',
          severity: r.impact || 'medium',
          confidence: Number(r.confidence) || 0,
          firstDetected: r.createdAt,
          recommendation: r.recommendation,
        })),
        summaryStats: { totalAnomalies: rows.length, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
      };
    }),

  getNaturalLanguageSummary: aiViewProcedure
    .input(z.object({
      source: z.string(),
      format: z.enum(['executive_brief', 'detailed', 'bullet_points']).default('executive_brief'),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(aiInsights)
        .where(and(eq(aiInsights.insightType, 'summary'), eq(aiInsights.entityType, input.source)))
        .orderBy(desc(aiInsights.createdAt))
        .limit(1);
      const row = rows[0];
      return {
        format: input.format,
        summary: {
          executiveBrief: row?.description || 'No summary available.',
          keyMetrics: row?.dataPayload ? JSON.parse(row.dataPayload) : [],
          nextSteps: row?.recommendation ? [row.recommendation] : [],
        },
        generatedAt: row?.createdAt || new Date(),
        confidence: Number(row?.confidence) || 0,
      };
    }),

  getModelPerformance: aiViewProcedure
    .input(z.object({
      modelType: z.string().optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(aiInsights)
        .where(eq(aiInsights.insightType, 'model_performance'))
        .orderBy(desc(aiInsights.createdAt))
        .limit(10);
      return {
        models: rows.map(r => ({
          name: r.title || '',
          type: r.entityType || '',
          accuracy: Number(r.confidence) || 0,
          ...(r.dataPayload ? JSON.parse(r.dataPayload) : {}),
          lastTrained: r.updatedAt,
        })),
        overallHealth: rows.length > 0 ? 'active' : 'no_models',
        recommendedActions: [],
      };
    }),
});

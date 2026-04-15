/**
 * Analytics Engine Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { analyticsMetrics } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const analyticsViewProcedure = createFeatureRestrictedProcedure('analytics:view');
const analyticsEditProcedure = createFeatureRestrictedProcedure('analytics:edit');

export const analyticsEngineRouter = router({
  getTrendAnalysis: analyticsViewProcedure
    .input(z.object({
      metric: z.string(),
      period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
      dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(analyticsMetrics)
        .where(and(eq(analyticsMetrics.metricType, 'trend'), eq(analyticsMetrics.period, input.period)))
        .orderBy(desc(analyticsMetrics.createdAt))
        .limit(20);
      return {
        metric: input.metric,
        period: input.period,
        trends: rows.map(r => ({ date: r.createdAt, value: Number(r.value) || 0, trend: Number(r.changePercent) > 0 ? 'up' : 'down' })),
        average: rows.length > 0 ? rows.reduce((s, r) => s + (Number(r.value) || 0), 0) / rows.length : 0,
        growth: rows.length > 0 ? Number(rows[0].changePercent) || 0 : 0,
        volatility: 'moderate',
        forecastNext: 0,
      };
    }),

  getCustomMetrics: analyticsViewProcedure
    .input(z.object({
      metrics: z.array(z.string()),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(analyticsMetrics)
        .where(eq(analyticsMetrics.metricType, 'custom'))
        .orderBy(desc(analyticsMetrics.createdAt))
        .limit(20);
      return {
        metrics: rows.map(r => ({
          name: r.metricName,
          value: Number(r.value) || 0,
          unit: r.unit || '',
          change: `${Number(r.changePercent) > 0 ? '+' : ''}${r.changePercent}%`,
        })),
        calculatedAt: new Date(),
        nextUpdate: new Date(Date.now() + 3600000),
      };
    }),

  getAnomalyInsights: analyticsViewProcedure
    .input(z.object({
      dataType: z.enum(['revenue', 'expenses', 'customers', 'transactions']),
      sensitivity: z.enum(['low', 'medium', 'high']).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(analyticsMetrics)
        .where(and(eq(analyticsMetrics.metricType, 'anomaly'), eq(analyticsMetrics.metricName, input.dataType)))
        .orderBy(desc(analyticsMetrics.createdAt))
        .limit(10);
      return {
        dataType: input.dataType,
        anomalyCount: rows.length,
        anomalies: rows.map(r => ({
          id: r.id,
          date: r.createdAt,
          value: Number(r.value) || 0,
          expected: Number(r.benchmark) || 0,
          deviation: r.changePercent ? `${r.changePercent}%` : '0%',
          severity: r.dimensions ? JSON.parse(r.dimensions).severity || 'medium' : 'medium',
          cause: r.dataPayload || '',
        })),
        recommendations: [],
      };
    }),

  getPerformanceMetrics: analyticsViewProcedure
    .input(z.object({
      dimensions: z.array(z.string()).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(analyticsMetrics)
        .where(eq(analyticsMetrics.metricType, 'kpi'))
        .orderBy(desc(analyticsMetrics.createdAt))
        .limit(20);
      return {
        kpis: rows.map(r => ({
          name: r.metricName,
          value: Number(r.value) || 0,
          unit: r.unit || '',
          change: `${Number(r.changePercent) > 0 ? '+' : ''}${r.changePercent}%`,
          benchmark: Number(r.benchmark) || 0,
        })),
        comparisons: { vsLastMonth: '0%', vsLastYear: '0%', vsBenchmark: '0%' },
        period: new Date().toISOString().substring(0, 7),
      };
    }),

  forecastMetrics: analyticsViewProcedure
    .input(z.object({
      metric: z.string(),
      periods: z.number().min(1).max(12),
      method: z.enum(['linear', 'exponential', 'seasonal']).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(analyticsMetrics)
        .where(and(eq(analyticsMetrics.metricType, 'forecast'), eq(analyticsMetrics.metricName, input.metric)))
        .orderBy(desc(analyticsMetrics.createdAt))
        .limit(input.periods);
      return {
        metric: input.metric,
        method: input.method || 'seasonal',
        forecasts: rows.map((r, i) => ({
          period: i + 1,
          forecast: Number(r.value) || 0,
          lower: Number(r.benchmark) || 0,
          upper: r.dataPayload ? JSON.parse(r.dataPayload).upper || 0 : 0,
          confidence: 0.85,
        })),
        accuracy: 0,
        lastActual: rows.length > 0 ? Number(rows[0].value) || 0 : 0,
      };
    }),

  getCorrelationAnalysis: analyticsViewProcedure
    .input(z.object({
      variables: z.array(z.string()).min(2),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(analyticsMetrics)
        .where(eq(analyticsMetrics.metricType, 'correlation'))
        .orderBy(desc(analyticsMetrics.createdAt))
        .limit(10);
      return {
        correlations: rows.map(r => ({
          variable1: r.metricName,
          variable2: r.unit || '',
          correlation: Number(r.value) || 0,
        })),
        insights: rows.map(r => r.dataPayload || '').filter(Boolean),
      };
    }),
});

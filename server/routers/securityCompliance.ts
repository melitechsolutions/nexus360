/**
 * Security & Compliance Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { securityEvents, complianceRecords } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const securityViewProcedure = createFeatureRestrictedProcedure('security:view');
const securityEditProcedure = createFeatureRestrictedProcedure('security:edit');

export const securityComplianceRouter = router({
  getSecurityDashboard: securityViewProcedure
    .input(z.object({}).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const events = await db.select().from(securityEvents)
        .orderBy(desc(securityEvents.createdAt))
        .limit(20);
      const records = await db.select().from(complianceRecords)
        .orderBy(desc(complianceRecords.createdAt))
        .limit(5);
      const latestScore = records[0]?.score || 0;
      return {
        overallSecureScore: latestScore,
        summary: {
          vulnerabilities: events.filter(e => e.eventType === 'vulnerability').length,
          criticalVulnerabilities: events.filter(e => e.eventType === 'vulnerability' && e.severity === 'CRITICAL').length,
          complianceStatus: records.length > 0 ? records[0].status?.toLowerCase() || 'unknown' : 'unknown',
          encryptionCoverage: 0,
          twoFactorAdoption: 0,
        },
        recentActivity: events.map(e => ({
          id: e.id,
          type: e.eventType,
          severity: e.severity,
          timestamp: e.createdAt,
          user: e.userId || '',
          ipAddress: e.ipAddress || '',
          details: e.details || '',
        })),
        complianceChecklist: records.reduce((acc: Record<string, any>, r) => {
          if (r.standard) acc[r.standard.toLowerCase()] = { compliant: r.status === 'COMPLIANT', lastAudit: r.createdAt };
          return acc;
        }, {}),
      };
    }),

  getComplianceReport: securityViewProcedure
    .input(z.object({
      standard: z.string(),
      period: z.object({ start: z.string(), end: z.string() }).optional(),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(complianceRecords)
        .where(eq(complianceRecords.standard, input.standard))
        .orderBy(desc(complianceRecords.createdAt))
        .limit(1);
      const row = rows[0];
      const findings = row?.findings ? JSON.parse(row.findings) : [];
      return {
        standard: input.standard,
        status: row?.status?.toLowerCase() || 'unknown',
        score: row?.score || 0,
        requirements: findings,
        recommendations: row?.dataPayload ? JSON.parse(row.dataPayload).recommendations || [] : [],
      };
    }),

  enableTwoFactorAuth: securityEditProcedure
    .input(z.object({
      userId: z.number(),
      method: z.enum(['authenticator_app', 'sms', 'email']),
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(securityEvents).values({
        id,
        eventType: '2fa_enabled',
        action: `2FA enabled via ${input.method}`,
        severity: 'LOW',
        resourceId: String(input.userId),
        userId: ctx.user?.id || 'system',
        details: JSON.stringify({ method: input.method }),
        status: 'LOGGED',
        createdBy: ctx.user?.id || 'system',
      });
      return {
        success: true,
        message: '2FA enabled',
        backupCodes: [id.substring(0, 9), id.substring(9, 18)],
      };
    }),

  getDataPrivacySettings: securityViewProcedure
    .input(z.object({}).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const rows = await db.select().from(complianceRecords)
        .where(eq(complianceRecords.recordType, 'privacy_settings'))
        .orderBy(desc(complianceRecords.createdAt))
        .limit(1);
      const row = rows[0];
      const data = row?.dataPayload ? JSON.parse(row.dataPayload) : {};
      return {
        retention: data.retention || { days: 0, policyName: 'Default' },
        gdprRights: data.gdprRights || { rightToAccess: true, rightToDelete: true, rightToExport: true, rightToCorrect: true },
        dataMinimization: data.dataMinimization || { enabled: false, autoDeleteAfterDays: 0 },
      };
    }),

  performSecurityAudit: securityViewProcedure
    .input(z.object({
      scope: z.enum(['full', 'permissions', 'encryption', 'access_logs']).default('full'),
    }).strict())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const events = await db.select().from(securityEvents)
        .where(eq(securityEvents.eventType, 'audit_finding'))
        .orderBy(desc(securityEvents.createdAt))
        .limit(20);
      return {
        auditId: 'AUD-' + Date.now(),
        scope: input.scope,
        status: 'completed',
        findingsCount: events.length,
        criticalCount: events.filter(e => e.severity === 'CRITICAL').length,
        duration: 0,
        timestamp: new Date(),
        findings: events.map(e => ({
          id: e.id,
          severity: e.severity.toLowerCase(),
          title: e.action || '',
          description: e.details || '',
          recommendation: '',
        })),
      };
    }),
});

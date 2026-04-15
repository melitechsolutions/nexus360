/**
 * Advanced Data Export Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { exportJobs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const exportViewProcedure = createFeatureRestrictedProcedure('export:view');
const exportEditProcedure = createFeatureRestrictedProcedure('export:edit');

export const advancedExportRouter = router({
  exportData: exportEditProcedure
    .input(z.object({
      dataType: z.enum(['invoices', 'clients', 'payments', 'employees', 'all']),
      format: z.enum(['csv', 'excel', 'json', 'xml', 'pdf']),
      dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
      includeRelated: z.boolean().optional(),
      anonymize: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(exportJobs).values({
        id,
        dataType: input.dataType,
        format: input.format,
        filters: input.dateRange ? JSON.stringify({ dateRange: input.dateRange, includeRelated: input.includeRelated, anonymize: input.anonymize }) : null,
        status: 'processing',
        createdBy: ctx.user?.id || 'system',
      });
      return { success: true, exportId: id, dataType: input.dataType, format: input.format, status: 'processing', estimatedRows: 0, estimatedCompletion: new Date(Date.now() + 30000) };
    }),

  getExportStatus: exportViewProcedure
    .input(z.object({ exportId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(exportJobs).where(eq(exportJobs.id, input.exportId));
      const job = rows[0];
      if (!job) return { exportId: input.exportId, status: 'not_found' };
      return { exportId: job.id, status: job.status, dataType: job.dataType, format: job.format, rowsExported: job.rowsExported, fileSize: job.fileSize, fileUrl: job.fileUrl, expiresAt: job.expiresAt, createdAt: job.createdAt };
    }),

  scheduleRecurringExport: exportEditProcedure
    .input(z.object({
      name: z.string(),
      dataType: z.string(),
      format: z.string(),
      schedule: z.enum(['daily', 'weekly', 'monthly']),
      recipients: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(exportJobs).values({
        id,
        name: input.name,
        dataType: input.dataType,
        format: input.format,
        schedule: input.schedule,
        recipients: JSON.stringify(input.recipients),
        status: 'scheduled',
        createdBy: ctx.user?.id || 'system',
      });
      return { success: true, scheduleId: id, name: input.name, schedule: input.schedule, status: 'scheduled', nextRun: new Date(Date.now() + 86400000) };
    }),

  listExports: exportViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(exportJobs).orderBy(desc(exportJobs.createdAt)).limit(input.limit);
      return { exports: rows, total: rows.length };
    }),
});

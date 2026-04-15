/**
 * SysAdmin Router - Full Backup & Restore
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import * as db from '../db';
import {
  backupSchedules, backupHistory,
  clients, services, products, invoices, payroll, employees, departments,
  estimates, receipts, expenses, jobGroups, bankAccounts, journalEntries,
  accounts, recurringInvoices, communicationLogs, users, auditLogs,
  organizations, organizationFeatures,
} from '../../drizzle/schema';
import { suppliers } from '../../drizzle/schema-extended';
import { eq, desc, sql, and, getTableColumns } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { TRPCError } from '@trpc/server';

const adminViewProcedure = createFeatureRestrictedProcedure('admin:view');
const adminEditProcedure = createFeatureRestrictedProcedure('admin:edit');

// All tables available for backup
const ALL_TABLES = [
  { key: 'users', schema: users, label: 'Users' },
  { key: 'employees', schema: employees, label: 'Employees' },
  { key: 'departments', schema: departments, label: 'Departments' },
  { key: 'jobGroups', schema: jobGroups, label: 'Job Groups' },
  { key: 'clients', schema: clients, label: 'Clients' },
  { key: 'suppliers', schema: suppliers, label: 'Suppliers' },
  { key: 'services', schema: services, label: 'Services' },
  { key: 'products', schema: products, label: 'Products' },
  { key: 'invoices', schema: invoices, label: 'Invoices' },
  { key: 'estimates', schema: estimates, label: 'Estimates' },
  { key: 'receipts', schema: receipts, label: 'Receipts' },
  { key: 'expenses', schema: expenses, label: 'Expenses' },
  { key: 'payroll', schema: payroll, label: 'Payroll' },
  { key: 'recurringInvoices', schema: recurringInvoices, label: 'Recurring Invoices' },
  { key: 'bankAccounts', schema: bankAccounts, label: 'Bank Accounts' },
  { key: 'journalEntries', schema: journalEntries, label: 'Journal Entries' },
  { key: 'accounts', schema: accounts, label: 'Accounts' },
  { key: 'communicationLogs', schema: communicationLogs, label: 'Communication Logs' },
  { key: 'organizations', schema: organizations, label: 'Organizations' },
  { key: 'organizationFeatures', schema: organizationFeatures, label: 'Organization Features' },
] as const;

export const sysAdminRouter = router({
  // ─── Dashboard Stats ──────────────────────────────────────────────
  getBackupStats: adminViewProcedure.query(async () => {
    const database = await getDb();
    const [historyRows] = await database.select({ count: sql<number>`COUNT(*)` }).from(backupHistory);
    const lastBackup = await database.select().from(backupHistory).where(eq(backupHistory.status, 'completed')).orderBy(desc(backupHistory.completedAt)).limit(1);
    const [schedRrows] = await database.select({ count: sql<number>`COUNT(*)` }).from(backupSchedules);
    const [totalSize] = await database.select({ total: sql<number>`COALESCE(SUM(sizeBytes), 0)` }).from(backupHistory).where(eq(backupHistory.status, 'completed'));
    return {
      totalBackups: historyRows?.count ?? 0,
      totalSchedules: schedRrows?.count ?? 0,
      lastBackup: lastBackup[0] ?? null,
      totalSizeBytes: totalSize?.total ?? 0,
    };
  }),

  // ─── List Organizations (for scoped backup) ───────────────────────
  listOrganizations: adminViewProcedure.query(async () => {
    const database = await getDb();
    try {
      const orgs = await database.select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        isActive: organizations.isActive,
      }).from(organizations).orderBy(organizations.name);
      return orgs;
    } catch {
      return [];
    }
  }),

  // ─── List available tables ────────────────────────────────────────
  listTables: adminViewProcedure.query(async () => {
    return ALL_TABLES.map(t => ({ key: t.key, label: t.label }));
  }),

  // ─── Create Backup ────────────────────────────────────────────────
  createBackup: adminEditProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      scope: z.enum(['full', 'organization', 'tables']).default('full'),
      organizationId: z.string().optional(),
      selectedTables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      // Insert history placeholder
      const createdBy = ctx.user?.id || 'system';
      const scopeEntityId = input.organizationId || null;
      await database.execute(sql`INSERT INTO backup_history (id, name, backupType, scope, scopeEntityId, status, createdBy) VALUES (${id}, ${input.name}, 'manual', ${input.scope}, ${scopeEntityId}, 'running', ${createdBy})`);

      try {
        const backupData: Record<string, unknown> = {
          metadata: {
            version: '2.0',
            id,
            name: input.name,
            scope: input.scope,
            organizationId: input.organizationId || null,
            timestamp,
            createdBy: ctx.user?.id || 'system',
            createdByEmail: ctx.user?.email || '',
          },
          data: {} as Record<string, unknown[]>,
        };

        let tablesToBackup = ALL_TABLES;

        // Filter by selected tables
        if (input.scope === 'tables' && input.selectedTables?.length) {
          tablesToBackup = ALL_TABLES.filter(t => input.selectedTables!.includes(t.key));
        }

        let totalRecords = 0;
        const backedUpTables: string[] = [];

        for (const table of tablesToBackup) {
          try {
            let records: unknown[];
            // Organization-scoped backup: filter tables that have organizationId
            if (input.scope === 'organization' && input.organizationId) {
              try {
                records = await database.select().from(table.schema as any)
                  .where(eq((table.schema as any).organizationId, input.organizationId));
              } catch {
                // Table doesn't have organizationId column, backup all rows
                records = await database.select().from(table.schema as any);
              }
            } else {
              records = await database.select().from(table.schema as any);
            }
            if (records.length > 0) {
              (backupData.data as Record<string, unknown[]>)[table.key] = records;
              totalRecords += records.length;
              backedUpTables.push(table.key);
            }
          } catch (err: any) {
            console.warn(`Backup: skipping table ${table.key}: ${err.message}`);
          }
        }

        const jsonStr = JSON.stringify(backupData);
        const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');
        const fileName = `backup_${input.scope}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        // Update history record using raw SQL to avoid ORM issues
        await database.execute(sql`UPDATE backup_history SET status = 'completed', tablesList = ${backedUpTables.join(',')}, recordCount = ${totalRecords}, sizeBytes = ${sizeBytes}, fileName = ${fileName}, completedAt = NOW() WHERE id = ${id}`);

        // Log activity
        try {
          await db.logActivity({
            userId: ctx.user?.id || 'system',
            action: 'backup_created',
            entityType: 'backup',
            entityId: id,
            description: `Backup "${input.name}" created: ${totalRecords} records from ${backedUpTables.length} tables (${input.scope})`,
          });
        } catch {}

        return {
          success: true,
          backupId: id,
          backup: backupData,
          fileName,
          stats: { totalRecords, tablesBackedUp: backedUpTables.length, sizeBytes },
        };
      } catch (err: any) {
        console.error('Backup error:', err);
        // Mark as failed using raw SQL
        try {
          await database.execute(sql`UPDATE backup_history SET status = 'failed', errorMessage = ${err.message} WHERE id = ${id}`);
        } catch (updateErr: any) {
          console.error('Failed to update backup status:', updateErr);
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Backup failed: ${err.message}` });
      }
    }),

  // ─── Restore Backup ───────────────────────────────────────────────
  restoreBackup: adminEditProcedure
    .input(z.object({
      backupData: z.string(),
      mode: z.enum(['merge', 'replace']).default('merge'),
      selectedTables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();

      let backup: any;
      try {
        backup = JSON.parse(input.backupData);
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid backup file: not valid JSON' });
      }

      if (!backup.metadata || !backup.data) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid backup file: missing metadata or data' });
      }

      const results = { restored: 0, skipped: 0, errors: [] as string[], tablesProcessed: 0 };

      // Determine which tables to restore
      const dataKeys = Object.keys(backup.data);
      const tablesToRestore = input.selectedTables?.length
        ? dataKeys.filter(k => input.selectedTables!.includes(k))
        : dataKeys;

      for (const key of tablesToRestore) {
        const tableDef = ALL_TABLES.find(t => t.key === key);
        if (!tableDef) continue;

        const records = backup.data[key];
        if (!Array.isArray(records) || records.length === 0) continue;

        // Get valid column names from the Drizzle schema
        const schemaColumns = getTableColumns(tableDef.schema as any);
        const validColNames = new Set(Object.keys(schemaColumns));

        try {
          // In replace mode, delete existing data first
          if (input.mode === 'replace') {
            await database.execute(sql.raw(`DELETE FROM \`${key}\``));
          }

          for (const record of records) {
            try {
              const cleanRecord = { ...record };
              // Don't restore password hashes for security
              if (key === 'users') delete cleanRecord.password;

              // Filter to only valid schema columns
              const cols = Object.keys(cleanRecord).filter(c => validColNames.has(c));
              if (cols.length === 0) continue;

              // Build parameterized INSERT using raw SQL
              const colStr = cols.map(c => `\`${c}\``).join(', ');
              const valueParts = cols.map(c => sql`${cleanRecord[c]}`);
              const valuesSql = sql.join(valueParts, sql.raw(', '));
              const insertKeyword = input.mode === 'merge' ? 'INSERT IGNORE' : 'INSERT';
              const insertSql = sql.join([
                sql.raw(`${insertKeyword} INTO \`${key}\` (${colStr}) VALUES (`),
                valuesSql,
                sql.raw(')')
              ]);

              const insertResult: any = await database.execute(insertSql);
              // Check if row was actually inserted (affectedRows > 0)
              const affected = insertResult?.[0]?.affectedRows ?? insertResult?.affectedRows ?? 1;
              if (affected > 0) {
                results.restored++;
              } else {
                results.skipped++;
              }
            } catch (err: any) {
              if (err?.message?.includes('Duplicate entry') || err?.code === 'ER_DUP_ENTRY') {
                results.skipped++;
              } else {
                results.errors.push(`${key}: ${err.message}`);
              }
            }
          }
          results.tablesProcessed++;
        } catch (err: any) {
          results.errors.push(`Table ${key}: ${err.message}`);
        }
      }

      // Record in history
      const id = uuidv4();
      try {
        const name = `Restore: ${backup.metadata.name || 'uploaded backup'}`;
        const scope = backup.metadata.scope || 'full';
        const status = results.errors.length === 0 ? 'completed' : 'completed_with_errors';
        const tablesStr = tablesToRestore.join(',');
        const createdBy = ctx.user?.id || 'system';
        await database.execute(sql`INSERT INTO backup_history (id, name, backupType, scope, status, recordCount, tablesList, createdBy, completedAt) VALUES (${id}, ${name}, 'restore', ${scope}, ${status}, ${results.restored}, ${tablesStr}, ${createdBy}, NOW())`);
      } catch {}

      try {
        await db.logActivity({
          userId: ctx.user?.id || 'system',
          action: 'backup_restored',
          entityType: 'backup',
          entityId: id,
          description: `Backup restored (${input.mode}): ${results.restored} records, ${results.skipped} skipped, ${results.errors.length} errors`,
        });
      } catch {}

      return {
        success: results.errors.length === 0,
        results,
        message: `Restored ${results.restored} records from ${results.tablesProcessed} tables`,
      };
    }),

  // ─── Backup History ───────────────────────────────────────────────
  listHistory: adminViewProcedure
    .input(z.object({ limit: z.number().default(50), status: z.string().optional() }))
    .query(async ({ input }) => {
      const database = await getDb();
      try {
        let rows;
        if (input.status) {
          rows = await database.select().from(backupHistory)
            .where(eq(backupHistory.status, input.status))
            .orderBy(desc(backupHistory.createdAt)).limit(input.limit);
        } else {
          rows = await database.select().from(backupHistory)
            .orderBy(desc(backupHistory.createdAt)).limit(input.limit);
        }
        return rows;
      } catch {
        return [];
      }
    }),

  // ─── Delete History Entry ─────────────────────────────────────────
  deleteHistoryEntry: adminEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      await database.delete(backupHistory).where(eq(backupHistory.id, input.id));
      return { success: true };
    }),

  // ─── Backup Schedules CRUD ────────────────────────────────────────
  scheduleBackup: adminEditProcedure
    .input(z.object({
      name: z.string(),
      backupType: z.enum(['full', 'incremental', 'differential']).default('full'),
      schedule: z.string(),
      retentionDays: z.number().default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      const id = uuidv4();
      const createdBy = ctx.user?.id || 'system';
      await database.execute(sql`INSERT INTO backup_schedules (id, name, backupType, schedule, retentionDays, status, nextRun, createdBy) VALUES (${id}, ${input.name}, ${input.backupType}, ${input.schedule}, ${input.retentionDays}, 'scheduled', NOW(), ${createdBy})`);
      return { success: true, backupId: id };
    }),

  listSchedules: adminViewProcedure.query(async () => {
    const database = await getDb();
    try {
      return await database.select().from(backupSchedules).orderBy(desc(backupSchedules.createdAt));
    } catch {
      return [];
    }
  }),

  deleteSchedule: adminEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      await database.delete(backupSchedules).where(eq(backupSchedules.id, input.id));
      return { success: true };
    }),

  // ─── System Health ────────────────────────────────────────────────
  getSystemHealth: adminViewProcedure.query(async () => {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      timestamp: new Date(),
    };
  }),
});

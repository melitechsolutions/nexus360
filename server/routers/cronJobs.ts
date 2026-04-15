import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.jobName,
    description: row.description || "",
    schedule: row.cronExpression,
    functionName: row.handler,
    enabled: !!row.isActive,
    lastRun: row.lastRunAt || null,
    nextRun: row.nextScheduledRun || null,
    status: row.lastRunStatus === "success" ? "success" : row.lastRunStatus === "failed" ? "failed" : "idle",
    lastError: row.lastFailureReason || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const AVAILABLE_FUNCTIONS = [
  { name: "sendReminderEmails", description: "Send payment reminder emails" },
  { name: "generateMonthlyReports", description: "Generate monthly financial reports" },
  { name: "backupDatabase", description: "Create database backup" },
  { name: "cleanupLogs", description: "Clean up old audit and system logs" },
  { name: "processFailedPayments", description: "Retry failed payment processing" },
  { name: "generateInvoices", description: "Generate recurring invoices" },
  { name: "syncData", description: "Sync data with external systems" },
  { name: "archiveOldRecords", description: "Archive records older than 1 year" },
];

export const cronJobsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query("SELECT * FROM scheduledJobs WHERE organizationId = ? ORDER BY createdAt DESC", [orgId]);
      return (rows as any[]).map(mapRow);
    }
    const [rows] = await pool.query("SELECT * FROM scheduledJobs ORDER BY createdAt DESC");
    return (rows as any[]).map(mapRow);
  }),

  getById: adminProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) return null;
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query("SELECT * FROM scheduledJobs WHERE id = ? AND organizationId = ?", [input, orgId]);
      const arr = rows as any[];
      return arr.length ? mapRow(arr[0]) : null;
    }
    const [rows] = await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input]);
    const arr = rows as any[];
    return arr.length ? mapRow(arr[0]) : null;
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        schedule: z.string(),
        functionName: z.string(),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = uuidv4();
      const orgId = ctx.user?.organizationId || null;
      await pool.query(
        `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, createdBy, organizationId)
         VALUES (?, ?, ?, 'custom', ?, ?, ?, ?, ?)`,
        [id, input.name, input.description || null, input.schedule, input.functionName, input.enabled ? 1 : 0, ctx.user?.id || null, orgId]
      );
      const [rows] = await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [id]);
      return mapRow((rows as any[])[0]);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        schedule: z.string().optional(),
        functionName: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const orgId = ctx.user?.organizationId;
      const [existing] = orgId
        ? await pool.query("SELECT id FROM scheduledJobs WHERE id = ? AND organizationId = ?", [input.id, orgId])
        : await pool.query("SELECT id FROM scheduledJobs WHERE id = ?", [input.id]);
      if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Cron job not found" });

      const sets: string[] = [];
      const vals: any[] = [];
      if (input.name !== undefined) { sets.push("jobName = ?"); vals.push(input.name); }
      if (input.description !== undefined) { sets.push("description = ?"); vals.push(input.description); }
      if (input.schedule !== undefined) { sets.push("cronExpression = ?"); vals.push(input.schedule); }
      if (input.functionName !== undefined) { sets.push("handler = ?"); vals.push(input.functionName); }
      if (input.enabled !== undefined) { sets.push("isActive = ?"); vals.push(input.enabled ? 1 : 0); }

      if (sets.length > 0) {
        vals.push(input.id);
        await pool.query(`UPDATE scheduledJobs SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
      const [rows] = await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input.id]);
      return mapRow((rows as any[])[0]);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [existing] = orgId
      ? await pool.query("SELECT id FROM scheduledJobs WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT id FROM scheduledJobs WHERE id = ?", [input]);
    if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Cron job not found" });
    await pool.query("DELETE FROM scheduledJobs WHERE id = ?", [input]);
    return { success: true };
  }),

  toggle: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [rows] = orgId
      ? await pool.query("SELECT * FROM scheduledJobs WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input]);
    const arr = rows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Cron job not found" });
    const current = arr[0];
    await pool.query("UPDATE scheduledJobs SET isActive = ? WHERE id = ?", [current.isActive ? 0 : 1, input]);
    const [updated] = await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input]);
    return mapRow((updated as any[])[0]);
  }),

  run: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [rows] = orgId
      ? await pool.query("SELECT * FROM scheduledJobs WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input]);
    const arr = rows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Cron job not found" });

    // Log execution start
    const logId = uuidv4();
    await pool.query(
      "INSERT INTO jobExecutionLogs (id, jobId, status) VALUES (?, ?, 'running')",
      [logId, input]
    );

    try {
      // Mark as running
      await pool.query("UPDATE scheduledJobs SET lastRunAt = NOW(), lastRunStatus = 'success', lastFailureReason = NULL WHERE id = ?", [input]);
      // Update execution log
      await pool.query("UPDATE jobExecutionLogs SET status = 'success', endTime = NOW() WHERE id = ?", [logId]);
      const [updated] = await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input]);
      return mapRow((updated as any[])[0]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await pool.query("UPDATE scheduledJobs SET lastRunAt = NOW(), lastRunStatus = 'failed', lastFailureReason = ? WHERE id = ?", [msg, input]);
      await pool.query("UPDATE jobExecutionLogs SET status = 'failed', endTime = NOW(), errorMessage = ? WHERE id = ?", [msg, logId]);
      throw error;
    }
  }),

  listAvailableFunctions: adminProcedure.query(async () => {
    return AVAILABLE_FUNCTIONS;
  }),

  getLogs: adminProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) return { id: input, name: "", logs: [] };
    const orgId = ctx.user?.organizationId;
    const [jobRows] = orgId
      ? await pool.query("SELECT * FROM scheduledJobs WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT * FROM scheduledJobs WHERE id = ?", [input]);
    const arr = jobRows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Cron job not found" });
    const job = arr[0];

    const [logRows] = await pool.query(
      "SELECT * FROM jobExecutionLogs WHERE jobId = ? ORDER BY startTime DESC LIMIT 20",
      [input]
    );

    return {
      id: job.id,
      name: job.jobName,
      lastRun: job.lastRunAt,
      lastError: job.lastFailureReason,
      status: job.lastRunStatus || "idle",
      logs: logRows as any[],
    };
  }),
});

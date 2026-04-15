import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function mapRow(row: any) {
  const toStr = (v: any) => v instanceof Date ? v.toISOString() : v ?? null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    subject: row.subject,
    message: row.message,
    type: row.type,
    priority: row.priority,
    status: row.status,
    recipientType: row.recipientType,
    recipientFilter: row.recipientFilter ? (typeof row.recipientFilter === "string" ? JSON.parse(row.recipientFilter) : row.recipientFilter) : null,
    sentAt: toStr(row.sentAt),
    scheduledAt: toStr(row.scheduledAt),
    createdBy: row.createdBy,
    createdAt: toStr(row.createdAt),
    updatedAt: toStr(row.updatedAt),
  };
}

export const tenantCommunicationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query(
        "SELECT * FROM tenantCommunications WHERE organizationId = ? ORDER BY createdAt DESC",
        [orgId]
      );
      return (rows as any[]).map(mapRow);
    }
    const [rows] = await pool.query("SELECT * FROM tenantCommunications ORDER BY createdAt DESC");
    return (rows as any[]).map(mapRow);
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) return null;
    const orgId = ctx.user?.organizationId;
    const [rows] = orgId
      ? await pool.query("SELECT * FROM tenantCommunications WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT * FROM tenantCommunications WHERE id = ?", [input]);
    const arr = rows as any[];
    return arr.length ? mapRow(arr[0]) : null;
  }),

  create: adminProcedure
    .input(
      z.object({
        subject: z.string().min(1),
        message: z.string().min(1),
        type: z.enum(["announcement", "alert", "notice", "update", "maintenance"]).default("announcement"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        status: z.enum(["draft", "sent", "scheduled"]).default("draft"),
        recipientType: z.enum(["all_tenants", "specific_tenant", "tier_based"]).default("all_tenants"),
        recipientFilter: z.any().optional(),
        scheduledAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = uuidv4();
      const orgId = ctx.user?.organizationId || "system";
      const sentAt = input.status === "sent" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;
      await pool.query(
        `INSERT INTO tenantCommunications (id, organizationId, subject, message, type, priority, status, recipientType, recipientFilter, sentAt, scheduledAt, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, orgId, input.subject, input.message, input.type, input.priority, input.status,
          input.recipientType, input.recipientFilter ? JSON.stringify(input.recipientFilter) : null,
          sentAt, input.scheduledAt || null, ctx.user?.id || null,
        ]
      );
      const [rows] = await pool.query("SELECT * FROM tenantCommunications WHERE id = ?", [id]);
      return mapRow((rows as any[])[0]);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        subject: z.string().optional(),
        message: z.string().optional(),
        type: z.enum(["announcement", "alert", "notice", "update", "maintenance"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        status: z.enum(["draft", "sent", "scheduled"]).optional(),
        recipientType: z.enum(["all_tenants", "specific_tenant", "tier_based"]).optional(),
        recipientFilter: z.any().optional(),
        scheduledAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const orgId = ctx.user?.organizationId;
      const [existing] = orgId
        ? await pool.query("SELECT id FROM tenantCommunications WHERE id = ? AND organizationId = ?", [input.id, orgId])
        : await pool.query("SELECT id FROM tenantCommunications WHERE id = ?", [input.id]);
      if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });

      const sets: string[] = [];
      const vals: any[] = [];
      if (input.subject !== undefined) { sets.push("subject = ?"); vals.push(input.subject); }
      if (input.message !== undefined) { sets.push("message = ?"); vals.push(input.message); }
      if (input.type !== undefined) { sets.push("type = ?"); vals.push(input.type); }
      if (input.priority !== undefined) { sets.push("priority = ?"); vals.push(input.priority); }
      if (input.status !== undefined) {
        sets.push("status = ?"); vals.push(input.status);
        if (input.status === "sent") { sets.push("sentAt = NOW()"); }
      }
      if (input.recipientType !== undefined) { sets.push("recipientType = ?"); vals.push(input.recipientType); }
      if (input.recipientFilter !== undefined) { sets.push("recipientFilter = ?"); vals.push(JSON.stringify(input.recipientFilter)); }
      if (input.scheduledAt !== undefined) { sets.push("scheduledAt = ?"); vals.push(input.scheduledAt); }

      if (sets.length > 0) {
        vals.push(input.id);
        await pool.query(`UPDATE tenantCommunications SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
      const [rows] = await pool.query("SELECT * FROM tenantCommunications WHERE id = ?", [input.id]);
      return mapRow((rows as any[])[0]);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [existing] = orgId
      ? await pool.query("SELECT id FROM tenantCommunications WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT id FROM tenantCommunications WHERE id = ?", [input]);
    if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
    await pool.query("DELETE FROM tenantCommunications WHERE id = ?", [input]);
    return { success: true };
  }),

  send: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [rows] = orgId
      ? await pool.query("SELECT * FROM tenantCommunications WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT * FROM tenantCommunications WHERE id = ?", [input]);
    const arr = rows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
    await pool.query("UPDATE tenantCommunications SET status = 'sent', sentAt = NOW() WHERE id = ?", [input]);
    const [updated] = await pool.query("SELECT * FROM tenantCommunications WHERE id = ?", [input]);
    return mapRow((updated as any[])[0]);
  }),

  // ─── Read Tracking ───────────────────────────────────────────

  markAsRead: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: commId, ctx }) => {
      const pool = getPool();
      if (!pool) return { success: false };
      const userId = ctx.user?.id;
      if (!userId) return { success: false };
      await pool.query(
        "INSERT IGNORE INTO tenantCommunicationReads (id, communicationId, userId, readAt) VALUES (?, ?, ?, NOW())",
        [uuidv4(), commId, userId]
      );
      return { success: true };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return 0;
    const userId = ctx.user?.id;
    if (!userId) return 0;
    const orgId = ctx.user?.organizationId;
    try {
      const [rows] = orgId
        ? await pool.query(
            `SELECT COUNT(*) as cnt FROM tenantCommunications tc
             WHERE tc.status = 'sent'
             AND (tc.recipientType = 'all_tenants' OR tc.organizationId = ?)
             AND tc.id NOT IN (SELECT communicationId FROM tenantCommunicationReads WHERE userId = ?)`,
            [orgId, userId]
          )
        : await pool.query(
            `SELECT COUNT(*) as cnt FROM tenantCommunications tc
             WHERE tc.status = 'sent'
             AND tc.id NOT IN (SELECT communicationId FROM tenantCommunicationReads WHERE userId = ?)`,
            [userId]
          );
      return Number((rows as any[])[0]?.cnt ?? 0);
    } catch { return 0; }
  }),

  getUnreadMessages: protectedProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];
    const userId = ctx.user?.id;
    if (!userId) return [];
    const orgId = ctx.user?.organizationId;
    try {
      const [rows] = orgId
        ? await pool.query(
            `SELECT tc.* FROM tenantCommunications tc
             WHERE tc.status = 'sent'
             AND (tc.recipientType = 'all_tenants' OR tc.organizationId = ?)
             AND tc.id NOT IN (SELECT communicationId FROM tenantCommunicationReads WHERE userId = ?)
             ORDER BY FIELD(tc.priority, 'urgent', 'high', 'normal', 'low'), tc.sentAt DESC
             LIMIT 20`,
            [orgId, userId]
          )
        : await pool.query(
            `SELECT tc.* FROM tenantCommunications tc
             WHERE tc.status = 'sent'
             AND tc.id NOT IN (SELECT communicationId FROM tenantCommunicationReads WHERE userId = ?)
             ORDER BY FIELD(tc.priority, 'urgent', 'high', 'normal', 'low'), tc.sentAt DESC
             LIMIT 20`,
            [userId]
          );
      return (rows as any[]).map(mapRow);
    } catch { return []; }
  }),

  getCriticalMessages: protectedProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];
    const userId = ctx.user?.id;
    if (!userId) return [];
    const orgId = ctx.user?.organizationId;
    try {
      const [rows] = orgId
        ? await pool.query(
            `SELECT tc.* FROM tenantCommunications tc
             WHERE tc.status = 'sent' AND tc.priority IN ('urgent', 'high')
             AND (tc.recipientType = 'all_tenants' OR tc.organizationId = ?)
             AND tc.id NOT IN (SELECT communicationId FROM tenantCommunicationReads WHERE userId = ?)
             ORDER BY FIELD(tc.priority, 'urgent', 'high') ASC, tc.sentAt DESC
             LIMIT 5`,
            [orgId, userId]
          )
        : await pool.query(
            `SELECT tc.* FROM tenantCommunications tc
             WHERE tc.status = 'sent' AND tc.priority IN ('urgent', 'high')
             AND tc.id NOT IN (SELECT communicationId FROM tenantCommunicationReads WHERE userId = ?)
             ORDER BY FIELD(tc.priority, 'urgent', 'high') ASC, tc.sentAt DESC
             LIMIT 5`,
            [userId]
          );
      return (rows as any[]).map(mapRow);
    } catch { return []; }
  }),
});

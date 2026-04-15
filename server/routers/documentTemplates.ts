import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function mapRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    createdBy: row.createdBy || "System",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const documentTemplatesRouter = router({
  list: protectedProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) return [];
      const orgId = ctx.user?.organizationId;
      if (orgId) {
        const [rows] = await pool.query(
          "SELECT * FROM documentTemplates WHERE type = ? AND organizationId = ? ORDER BY createdAt DESC",
          [input.type, orgId]
        );
        return (rows as any[]).map(mapRow);
      }
      const [rows] = await pool.query(
        "SELECT * FROM documentTemplates WHERE type = ? ORDER BY createdAt DESC",
        [input.type]
      );
      return (rows as any[]).map(mapRow);
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) return null;
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query(
        "SELECT * FROM documentTemplates WHERE id = ? AND organizationId = ?",
        [input, orgId]
      );
      const arr = rows as any[];
      return arr.length ? mapRow(arr[0]) : null;
    }
    const [rows] = await pool.query("SELECT * FROM documentTemplates WHERE id = ?", [input]);
    const arr = rows as any[];
    return arr.length ? mapRow(arr[0]) : null;
  }),

  create: adminProcedure
    .input(z.object({ type: z.string(), title: z.string().min(1), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = uuidv4();
      const orgId = ctx.user?.organizationId || null;
      await pool.query(
        "INSERT INTO documentTemplates (id, type, title, content, createdBy, organizationId) VALUES (?, ?, ?, ?, ?, ?)",
        [id, input.type, input.title, input.content, ctx.user?.name || ctx.user?.id || "System", orgId]
      );
      const [rows] = await pool.query("SELECT * FROM documentTemplates WHERE id = ?", [id]);
      return mapRow((rows as any[])[0]);
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), title: z.string().optional(), content: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const orgId = ctx.user?.organizationId;
      const [existing] = orgId
        ? await pool.query("SELECT id FROM documentTemplates WHERE id = ? AND organizationId = ?", [input.id, orgId])
        : await pool.query("SELECT id FROM documentTemplates WHERE id = ?", [input.id]);
      if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const updates: string[] = [];
      const values: any[] = [];
      if (input.title !== undefined) { updates.push("title = ?"); values.push(input.title); }
      if (input.content !== undefined) { updates.push("content = ?"); values.push(input.content); }
      if (updates.length) {
        values.push(input.id);
        await pool.query(`UPDATE documentTemplates SET ${updates.join(", ")} WHERE id = ?`, values);
      }
      const [rows] = await pool.query("SELECT * FROM documentTemplates WHERE id = ?", [input.id]);
      return mapRow((rows as any[])[0]);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      await pool.query("DELETE FROM documentTemplates WHERE id = ? AND organizationId = ?", [input, orgId]);
    } else {
      await pool.query("DELETE FROM documentTemplates WHERE id = ?", [input]);
    }
    return { success: true };
  }),

  duplicate: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [rows] = orgId
      ? await pool.query("SELECT * FROM documentTemplates WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT * FROM documentTemplates WHERE id = ?", [input]);
    const arr = rows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    const orig = arr[0];
    const newId = uuidv4();
    await pool.query(
      "INSERT INTO documentTemplates (id, type, title, content, createdBy, organizationId) VALUES (?, ?, ?, ?, ?, ?)",
      [newId, orig.type, orig.title + " (Copy)", orig.content, ctx.user?.name || ctx.user?.id || "System", orig.organizationId]
    );
    const [newRows] = await pool.query("SELECT * FROM documentTemplates WHERE id = ?", [newId]);
    return mapRow((newRows as any[])[0]);
  }),
});

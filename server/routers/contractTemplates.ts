import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function mapRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdBy: row.createdBy || "System",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const contractTemplatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query("SELECT * FROM contractTemplates WHERE organizationId = ? ORDER BY createdAt DESC", [orgId]);
      return (rows as any[]).map(mapRow);
    }
    const [rows] = await pool.query("SELECT * FROM contractTemplates ORDER BY createdAt DESC");
    return (rows as any[]).map(mapRow);
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) return null;
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query("SELECT * FROM contractTemplates WHERE id = ? AND organizationId = ?", [input, orgId]);
      const arr = rows as any[];
      return arr.length ? mapRow(arr[0]) : null;
    }
    const [rows] = await pool.query("SELECT * FROM contractTemplates WHERE id = ?", [input]);
    const arr = rows as any[];
    return arr.length ? mapRow(arr[0]) : null;
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = uuidv4();
      const orgId = ctx.user?.organizationId || null;
      await pool.query(
        "INSERT INTO contractTemplates (id, title, content, createdBy, organizationId) VALUES (?, ?, ?, ?, ?)",
        [id, input.title, input.content, ctx.user?.name || ctx.user?.id || "System", orgId]
      );
      const [rows] = await pool.query("SELECT * FROM contractTemplates WHERE id = ?", [id]);
      return mapRow((rows as any[])[0]);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const orgId = ctx.user?.organizationId;
      const [existing] = orgId
        ? await pool.query("SELECT id FROM contractTemplates WHERE id = ? AND organizationId = ?", [input.id, orgId])
        : await pool.query("SELECT id FROM contractTemplates WHERE id = ?", [input.id]);
      if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const sets: string[] = [];
      const vals: any[] = [];
      if (input.title !== undefined) { sets.push("title = ?"); vals.push(input.title); }
      if (input.content !== undefined) { sets.push("content = ?"); vals.push(input.content); }

      if (sets.length > 0) {
        vals.push(input.id);
        await pool.query(`UPDATE contractTemplates SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
      const [rows] = await pool.query("SELECT * FROM contractTemplates WHERE id = ?", [input.id]);
      return mapRow((rows as any[])[0]);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [existing] = orgId
      ? await pool.query("SELECT id FROM contractTemplates WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT id FROM contractTemplates WHERE id = ?", [input]);
    if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    await pool.query("DELETE FROM contractTemplates WHERE id = ?", [input]);
    return { success: true };
  }),

  duplicate: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [rows] = await pool.query("SELECT * FROM contractTemplates WHERE id = ?", [input]);
    const arr = rows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    const orig = arr[0];
    const newId = uuidv4();
    const orgId = ctx.user?.organizationId || null;
    await pool.query(
      "INSERT INTO contractTemplates (id, title, content, createdBy, organizationId) VALUES (?, ?, ?, ?, ?)",
      [newId, `${orig.title} (Copy)`, orig.content, ctx.user?.name || ctx.user?.id || "System", orgId]
    );
    const [newRows] = await pool.query("SELECT * FROM contractTemplates WHERE id = ?", [newId]);
    return mapRow((newRows as any[])[0]);
  }),
});

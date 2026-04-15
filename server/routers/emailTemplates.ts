import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.htmlContent || "",
    htmlBody: row.htmlContent || "",
    category: row.category || "general",
    variables: row.variables ? (typeof row.variables === "string" ? JSON.parse(row.variables) : row.variables) : [],
    attachments: row.attachments ? (typeof row.attachments === "string" ? JSON.parse(row.attachments) : row.attachments) : [],
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDefault: false,
  };
}

export const emailTemplatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE organizationId = ? ORDER BY createdAt DESC", [orgId]);
      return (rows as any[]).map(mapRow);
    }
    const [rows] = await pool.query("SELECT * FROM emailTemplates ORDER BY createdAt DESC");
    return (rows as any[]).map(mapRow);
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) return null;
    const orgId = ctx.user?.organizationId;
    if (orgId) {
      const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE id = ? AND organizationId = ?", [input, orgId]);
      const arr = rows as any[];
      return arr.length ? mapRow(arr[0]) : null;
    }
    const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE id = ?", [input]);
    const arr = rows as any[];
    return arr.length ? mapRow(arr[0]) : null;
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        subject: z.string(),
        body: z.string(),
        htmlBody: z.string().optional(),
        category: z.string().optional(),
        variables: z.array(z.string()).optional(),
        attachments: z.array(z.object({ type: z.string(), label: z.string() })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = uuidv4();
      const orgId = ctx.user?.organizationId || null;
      await pool.query(
        `INSERT INTO emailTemplates (id, name, subject, htmlContent, plainTextContent, variables, category, attachments, createdBy, organizationId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.name, input.subject, input.htmlBody || input.body, input.body.replace(/<[^>]+>/g, ""), JSON.stringify(input.variables || []), input.category || "general", JSON.stringify(input.attachments || []), ctx.user?.id || null, orgId]
      );
      const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE id = ?", [id]);
      return mapRow((rows as any[])[0]);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        htmlBody: z.string().optional(),
        category: z.string().optional(),
        variables: z.array(z.string()).optional(),
        attachments: z.array(z.object({ type: z.string(), label: z.string() })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const orgId = ctx.user?.organizationId;
      const [existing] = orgId
        ? await pool.query("SELECT id FROM emailTemplates WHERE id = ? AND organizationId = ?", [input.id, orgId])
        : await pool.query("SELECT id FROM emailTemplates WHERE id = ?", [input.id]);
      if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const sets: string[] = [];
      const vals: any[] = [];
      if (input.name !== undefined) { sets.push("name = ?"); vals.push(input.name); }
      if (input.subject !== undefined) { sets.push("subject = ?"); vals.push(input.subject); }
      if (input.htmlBody !== undefined || input.body !== undefined) {
        const html = input.htmlBody || input.body || "";
        sets.push("htmlContent = ?"); vals.push(html);
        sets.push("plainTextContent = ?"); vals.push(html.replace(/<[^>]+>/g, ""));
      }
      if (input.category !== undefined) { sets.push("category = ?"); vals.push(input.category); }
      if (input.variables !== undefined) { sets.push("variables = ?"); vals.push(JSON.stringify(input.variables)); }
      if (input.attachments !== undefined) { sets.push("attachments = ?"); vals.push(JSON.stringify(input.attachments)); }

      if (sets.length > 0) {
        vals.push(input.id);
        await pool.query(`UPDATE emailTemplates SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
      const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE id = ?", [input.id]);
      return mapRow((rows as any[])[0]);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.user?.organizationId;
    const [existing] = orgId
      ? await pool.query("SELECT id FROM emailTemplates WHERE id = ? AND organizationId = ?", [input, orgId])
      : await pool.query("SELECT id FROM emailTemplates WHERE id = ?", [input]);
    if (!(existing as any[]).length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    await pool.query("DELETE FROM emailTemplates WHERE id = ?", [input]);
    return { success: true };
  }),

  duplicate: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE id = ?", [input]);
    const arr = rows as any[];
    if (!arr.length) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    const orig = arr[0];
    const newId = uuidv4();
    const orgId = ctx.user?.organizationId || null;
    await pool.query(
      `INSERT INTO emailTemplates (id, name, subject, htmlContent, plainTextContent, variables, category, createdBy, organizationId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, `${orig.name} (Copy)`, orig.subject, orig.htmlContent, orig.plainTextContent, orig.variables, orig.category, orig.createdBy, orgId]
    );
    const [newRows] = await pool.query("SELECT * FROM emailTemplates WHERE id = ?", [newId]);
    return mapRow((newRows as any[])[0]);
  }),

  listByCategory: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) return [];
      const orgId = ctx.user?.organizationId;
      if (orgId) {
        const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE category = ? AND organizationId = ? ORDER BY createdAt DESC", [input, orgId]);
        return (rows as any[]).map(mapRow);
      }
      const [rows] = await pool.query("SELECT * FROM emailTemplates WHERE category = ? ORDER BY createdAt DESC", [input]);
      return (rows as any[]).map(mapRow);
    }),
});

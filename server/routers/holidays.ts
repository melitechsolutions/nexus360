/**
 * Public Holidays Router
 * Manages company and public holiday calendar
 */
import { router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return p;
}

const hrView = createFeatureRestrictedProcedure("employees:view");
const hrWrite = createFeatureRestrictedProcedure("employees:edit");

export const holidaysRouter = router({
  list: hrView
    .input(z.object({
      year: z.number().optional(),
      type: z.enum(["public", "company", "optional"]).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const p = pool();
      const orgId = ctx.user.organizationId;
      const year = input?.year || new Date().getFullYear();
      let query = `SELECT * FROM publicHolidays WHERE year = ? AND (organizationId = ? OR organizationId IS NULL)`;
      const params: any[] = [year, orgId];
      if (input?.type) { query += ` AND type = ?`; params.push(input.type); }
      query += ` ORDER BY date`;
      const [rows] = await p.query(query, params);
      return rows || [];
    }),

  create: hrWrite
    .input(z.object({
      name: z.string().min(1),
      date: z.string(),
      year: z.number(),
      isRecurring: z.boolean().optional(),
      type: z.enum(["public", "company", "optional"]).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const id = uuidv4();
      await p.query(
        `INSERT INTO publicHolidays (id, organizationId, name, date, year, isRecurring, type, description, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ctx.user.organizationId, input.name, input.date, input.year, input.isRecurring ? 1 : 0, input.type || "company", input.description || null, ctx.user.id]
      );
      return { id };
    }),

  update: hrWrite
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      date: z.string().optional(),
      type: z.enum(["public", "company", "optional"]).optional(),
      description: z.string().optional(),
      isRecurring: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const sets: string[] = [];
      const params: any[] = [];
      if (input.name) { sets.push("name = ?"); params.push(input.name); }
      if (input.date) { sets.push("date = ?"); params.push(input.date); }
      if (input.type) { sets.push("type = ?"); params.push(input.type); }
      if (input.description !== undefined) { sets.push("description = ?"); params.push(input.description); }
      if (input.isRecurring !== undefined) { sets.push("isRecurring = ?"); params.push(input.isRecurring ? 1 : 0); }
      if (sets.length === 0) return { success: true };
      params.push(input.id);
      await p.query(`UPDATE publicHolidays SET ${sets.join(", ")} WHERE id = ?`, params);
      return { success: true };
    }),

  delete: hrWrite
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query(`DELETE FROM publicHolidays WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // Check if a date is a holiday
  isHoliday: hrView
    .input(z.object({ date: z.string() }))
    .query(async ({ input, ctx }) => {
      const p = pool();
      const [rows] = await p.query(
        `SELECT * FROM publicHolidays WHERE date = ? AND (organizationId = ? OR organizationId IS NULL) LIMIT 1`,
        [input.date, ctx.user.organizationId]
      );
      return { isHoliday: (rows?.length || 0) > 0, holiday: rows?.[0] || null };
    }),
});

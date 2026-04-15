/**
 * Training Management Router
 * Programs, enrollments, progress tracking
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

const hrView = createFeatureRestrictedProcedure("hr:view");
const hrWrite = createFeatureRestrictedProcedure("hr:edit");

export const trainingRouter = router({
  // --- Programs CRUD ---
  listPrograms: hrView
    .input(z.object({
      category: z.string().optional(),
      status: z.enum(["active", "completed", "cancelled", "draft"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const p = pool();
      const orgId = ctx.user.organizationId;
      let query = `SELECT tp.*, (SELECT COUNT(*) FROM trainingEnrollments te WHERE te.programId = tp.id) as enrollmentCount
        FROM trainingPrograms tp WHERE (tp.organizationId = ? OR tp.organizationId IS NULL)`;
      const params: any[] = [orgId];

      if (input?.category) { query += ` AND tp.category = ?`; params.push(input.category); }
      if (input?.status) { query += ` AND tp.status = ?`; params.push(input.status); }
      query += ` ORDER BY tp.startDate DESC LIMIT ? OFFSET ?`;
      params.push(input?.limit || 50, input?.offset || 0);

      const [rows] = await p.query(query, params);
      return rows || [];
    }),

  getProgram: hrView
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const p = pool();
      const [rows] = await p.query(
        `SELECT * FROM trainingPrograms WHERE id = ?`, [input.id]
      );
      if (!rows?.[0]) return null;

      const [enrollments] = await p.query(
        `SELECT te.*, e.firstName, e.lastName, e.department, e.position
         FROM trainingEnrollments te
         LEFT JOIN employees e ON te.employeeId = e.id
         WHERE te.programId = ? ORDER BY te.enrolledAt DESC`, [input.id]
      );
      return { ...rows[0], enrollments: enrollments || [] };
    }),

  createProgram: hrWrite
    .input(z.object({
      name: z.string().max(200),
      description: z.string().max(2000).optional(),
      category: z.string().max(100).optional(),
      trainer: z.string().max(200).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      maxParticipants: z.number().optional(),
      cost: z.number().optional(),
      location: z.string().max(200).optional(),
      isOnline: z.boolean().default(false),
      isMandatory: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const id = uuidv4();
      await p.query(
        `INSERT INTO trainingPrograms (id, organizationId, name, description, category, trainer, startDate, endDate, maxParticipants, cost, location, isOnline, isMandatory, status, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [id, ctx.user.organizationId, input.name, input.description || null, input.category || null, input.trainer || null, input.startDate || null, input.endDate || null, input.maxParticipants || null, input.cost || null, input.location || null, input.isOnline ? 1 : 0, input.isMandatory ? 1 : 0, ctx.user.id]
      );
      return { id, success: true };
    }),

  updateProgram: hrWrite
    .input(z.object({
      id: z.string(),
      name: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      category: z.string().max(100).optional(),
      trainer: z.string().max(200).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      maxParticipants: z.number().optional(),
      cost: z.number().optional(),
      location: z.string().max(200).optional(),
      isOnline: z.boolean().optional(),
      isMandatory: z.boolean().optional(),
      status: z.enum(["active", "completed", "cancelled", "draft"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const { id, ...fields } = input;
      const setClauses: string[] = [];
      const params: any[] = [];
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          setClauses.push(`${key} = ?`);
          params.push(typeof val === "boolean" ? (val ? 1 : 0) : val);
        }
      }
      if (setClauses.length === 0) return { success: true };
      setClauses.push(`updatedAt = NOW()`);
      params.push(id);
      await p.query(`UPDATE trainingPrograms SET ${setClauses.join(", ")} WHERE id = ?`, params);
      return { success: true };
    }),

  deleteProgram: hrWrite
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query(`DELETE FROM trainingEnrollments WHERE programId = ?`, [input.id]);
      await p.query(`DELETE FROM trainingPrograms WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // --- Enrollments ---
  enroll: hrWrite
    .input(z.object({
      programId: z.string(),
      employeeIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      let enrolled = 0;
      for (const employeeId of input.employeeIds) {
        const [existing] = await p.query(
          `SELECT id FROM trainingEnrollments WHERE programId = ? AND employeeId = ?`,
          [input.programId, employeeId]
        );
        if ((existing as any[])?.length > 0) continue;
        const id = uuidv4();
        await p.query(
          `INSERT INTO trainingEnrollments (id, programId, employeeId, status, enrolledBy) VALUES (?, ?, ?, 'enrolled', ?)`,
          [id, input.programId, employeeId, ctx.user.id]
        );
        enrolled++;
      }
      return { enrolled, total: input.employeeIds.length };
    }),

  updateEnrollment: hrWrite
    .input(z.object({
      id: z.string(),
      status: z.enum(["enrolled", "in_progress", "completed", "dropped", "failed"]),
      score: z.number().optional(),
      certificate: z.string().optional(),
      feedback: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const setClauses = [`status = ?`];
      const params: any[] = [input.status];
      if (input.score !== undefined) { setClauses.push(`score = ?`); params.push(input.score); }
      if (input.certificate) { setClauses.push(`certificate = ?`); params.push(input.certificate); }
      if (input.feedback) { setClauses.push(`feedback = ?`); params.push(input.feedback); }
      if (input.status === "completed") { setClauses.push(`completedAt = NOW()`); }
      setClauses.push(`updatedAt = NOW()`);
      params.push(input.id);
      await p.query(`UPDATE trainingEnrollments SET ${setClauses.join(", ")} WHERE id = ?`, params);
      return { success: true };
    }),

  removeEnrollment: hrWrite
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query(`DELETE FROM trainingEnrollments WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // Employee's training history
  employeeTraining: hrView
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      const p = pool();
      const [rows] = await p.query(
        `SELECT te.*, tp.name as programName, tp.category, tp.trainer, tp.startDate, tp.endDate, tp.isOnline, tp.isMandatory
         FROM trainingEnrollments te
         LEFT JOIN trainingPrograms tp ON te.programId = tp.id
         WHERE te.employeeId = ? ORDER BY te.enrolledAt DESC`,
        [input.employeeId]
      );
      return rows || [];
    }),

  // Dashboard stats
  stats: hrView.query(async ({ ctx }) => {
    const p = pool();
    const orgId = ctx.user.organizationId;
    const [programs] = await p.query(
      `SELECT status, COUNT(*) as cnt FROM trainingPrograms WHERE (organizationId = ? OR organizationId IS NULL) GROUP BY status`, [orgId]
    );
    const [enrollments] = await p.query(
      `SELECT te.status, COUNT(*) as cnt FROM trainingEnrollments te
       LEFT JOIN trainingPrograms tp ON te.programId = tp.id
       WHERE (tp.organizationId = ? OR tp.organizationId IS NULL)
       GROUP BY te.status`, [orgId]
    );
    return { programs: programs || [], enrollments: enrollments || [] };
  }),
});

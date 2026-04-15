import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getPool, logActivity } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return p;
}

const readProcedure = createFeatureRestrictedProcedure("hr:view");
const writeProcedure = createFeatureRestrictedProcedure("hr:edit");

export const performanceReviewsRouter = router({
  list: readProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      reviewerId: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const conditions: string[] = [];
        const params: any[] = [];
        if (input?.employeeId) { conditions.push("pr.employeeId = ?"); params.push(input.employeeId); }
        if (input?.reviewerId) { conditions.push("pr.reviewerId = ?"); params.push(input.reviewerId); }
        if (input?.status) { conditions.push("pr.status = ?"); params.push(input.status); }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const limit = input?.limit || 100;
        const offset = input?.offset || 0;
        const [rows] = await pool().query(
          `SELECT pr.*, 
            CONCAT(e.firstName, ' ', e.lastName) as employeeName,
            CONCAT(r.firstName, ' ', r.lastName) as reviewerName
           FROM performanceReviews pr
           LEFT JOIN employees e ON pr.employeeId = e.id
           LEFT JOIN employees r ON pr.reviewerId = r.id
           ${where} ORDER BY pr.createdAt DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        return rows as any[];
      } catch (err) {
        console.error('Error listing performance reviews', err);
        return [];
      }
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const [rows] = await pool().query(
        `SELECT pr.*, 
          CONCAT(e.firstName, ' ', e.lastName) as employeeName,
          CONCAT(r.firstName, ' ', r.lastName) as reviewerName
         FROM performanceReviews pr
         LEFT JOIN employees e ON pr.employeeId = e.id
         LEFT JOIN employees r ON pr.reviewerId = r.id
         WHERE pr.id = ? LIMIT 1`, [input]
      );
      return (rows as any[])[0] || null;
    }),

  create: writeProcedure
    .input(z.object({
      employeeId: z.string(),
      reviewerId: z.string(),
      overallRating: z.number().min(1).max(5).optional(),
      comments: z.string().optional(),
      goals: z.string().optional(),
      status: z.enum(["draft", "in_progress", "completed", "archived"]).optional(),
      reviewDate: z.date().optional(),
      period: z.string().optional(),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
      kpiScore: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = uuidv4();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await pool().query(
        `INSERT INTO performanceReviews (id, employeeId, reviewerId, overallRating, comments, goals, status, period, reviewDate, strengths, improvements, kpiScore, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.employeeId, input.reviewerId, input.overallRating ?? 0, input.comments || null, input.goals || null, input.status || 'draft', input.period || new Date().getFullYear().toString(), input.reviewDate ? input.reviewDate.toISOString().replace('T', ' ').substring(0, 19) : now, input.strengths || null, input.improvements || null, input.kpiScore ?? null, now, now]
      );
      await logActivity({ userId: ctx.user.id, action: 'performance_review_created', entityType: 'performanceReview', entityId: id, description: `Created performance review for ${input.employeeId}` });
      return { id };
    }),

  update: writeProcedure
    .input(z.object({
      id: z.string(),
      overallRating: z.number().min(1).max(5).optional(),
      comments: z.string().optional(),
      goals: z.string().optional(),
      status: z.enum(["draft", "in_progress", "completed", "archived"]).optional(),
      reviewDate: z.date().optional(),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
      kpiScore: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sets: string[] = ["updatedAt = ?"];
      const params: any[] = [new Date().toISOString().replace('T', ' ').substring(0, 19)];
      if (input.overallRating !== undefined) { sets.push("overallRating = ?"); params.push(input.overallRating); }
      if (input.comments !== undefined) { sets.push("comments = ?"); params.push(input.comments); }
      if (input.goals !== undefined) { sets.push("goals = ?"); params.push(input.goals); }
      if (input.status !== undefined) { sets.push("status = ?"); params.push(input.status); }
      if (input.reviewDate !== undefined) { sets.push("reviewDate = ?"); params.push(input.reviewDate.toISOString().replace('T', ' ').substring(0, 19)); }
      if (input.strengths !== undefined) { sets.push("strengths = ?"); params.push(input.strengths); }
      if (input.improvements !== undefined) { sets.push("improvements = ?"); params.push(input.improvements); }
      if (input.kpiScore !== undefined) { sets.push("kpiScore = ?"); params.push(input.kpiScore); }
      params.push(input.id);
      await pool().query(`UPDATE performanceReviews SET ${sets.join(", ")} WHERE id = ?`, params);
      await logActivity({ userId: ctx.user.id, action: 'performance_review_updated', entityType: 'performanceReview', entityId: input.id, description: `Updated performance review ${input.id}` });
      return { success: true };
    }),

  delete: writeProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      await pool().query(`DELETE FROM performanceReviews WHERE id = ?`, [input]);
      await logActivity({ userId: ctx.user.id, action: 'performance_review_deleted', entityType: 'performanceReview', entityId: input, description: `Deleted performance review ${input}` });
      return { success: true };
    }),

  stats: readProcedure
    .query(async () => {
      try {
        const [rows] = await pool().query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
            AVG(overallRating) as avgRating
          FROM performanceReviews
        `);
        const r = (rows as any[])[0];
        return { total: Number(r.total || 0), completed: Number(r.completed || 0), inProgress: Number(r.inProgress || 0), draft: Number(r.draft || 0), avgRating: Number(r.avgRating || 0) };
      } catch { return { total: 0, completed: 0, inProgress: 0, draft: 0, avgRating: 0 }; }
    }),
});

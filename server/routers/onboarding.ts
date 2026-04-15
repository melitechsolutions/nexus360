/**
 * HR Onboarding/Offboarding Router
 * Manages employee onboarding and offboarding checklists and tasks
 */
import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getPool } from "../db";
import * as db from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return p;
}

const hrProcedure = createFeatureRestrictedProcedure("employees:view");
const hrWriteProcedure = createFeatureRestrictedProcedure("employees:edit");

export const onboardingRouter = router({
  // ── Templates ──
  listTemplates: hrProcedure
    .input(z.object({ type: z.enum(["onboarding", "offboarding"]).optional() }).optional())
    .query(async ({ input, ctx }) => {
      const p = pool();
      const orgId = ctx.user.organizationId;
      const type = input?.type;
      const [rows] = await p.query(
        `SELECT * FROM onboardingTemplates WHERE (organizationId = ? OR organizationId IS NULL) ${type ? "AND type = ?" : ""} ORDER BY name`,
        type ? [orgId, type] : [orgId]
      );
      return rows || [];
    }),

  createTemplate: hrWriteProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["onboarding", "offboarding"]),
      tasks: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.enum(["documentation", "equipment", "access", "training", "introduction", "other"]).optional(),
        isRequired: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const id = uuidv4();
      await p.query(
        `INSERT INTO onboardingTemplates (id, organizationId, name, description, type, createdBy) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ctx.user.organizationId, input.name, input.description || null, input.type, ctx.user.id]
      );

      // Create template tasks if provided
      if (input.tasks?.length) {
        for (let i = 0; i < input.tasks.length; i++) {
          const task = input.tasks[i];
          await p.query(
            `INSERT INTO onboardingTasks (id, organizationId, checklistId, templateId, title, description, category, sortOrder, isRequired) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), ctx.user.organizationId, id, id, task.title, task.description || null, task.category || "other", task.sortOrder ?? i, task.isRequired !== false ? 1 : 0]
          );
        }
      }
      return { id };
    }),

  deleteTemplate: hrWriteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query(`DELETE FROM onboardingTasks WHERE templateId = ?`, [input.id]);
      await p.query(`DELETE FROM onboardingTemplates WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // ── Checklists ──
  listChecklists: hrProcedure
    .input(z.object({
      type: z.enum(["onboarding", "offboarding"]).optional(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
      employeeId: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const p = pool();
      const orgId = ctx.user.organizationId;
      let query = `SELECT c.*, e.firstName, e.lastName, e.employeeNumber, e.department, e.position
        FROM onboardingChecklists c
        LEFT JOIN employees e ON c.employeeId = e.id
        WHERE (c.organizationId = ? OR c.organizationId IS NULL)`;
      const params: any[] = [orgId];

      if (input?.type) { query += ` AND c.type = ?`; params.push(input.type); }
      if (input?.status) { query += ` AND c.status = ?`; params.push(input.status); }
      if (input?.employeeId) { query += ` AND c.employeeId = ?`; params.push(input.employeeId); }
      query += ` ORDER BY c.createdAt DESC`;

      const [rows] = await p.query(query, params);
      return rows || [];
    }),

  getChecklist: hrProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const p = pool();
      const [checklists] = await p.query(
        `SELECT c.*, e.firstName, e.lastName, e.employeeNumber, e.department, e.position
         FROM onboardingChecklists c
         LEFT JOIN employees e ON c.employeeId = e.id
         WHERE c.id = ?`, [input.id]
      );
      if (!checklists?.[0]) return null;

      const [tasks] = await p.query(
        `SELECT * FROM onboardingTasks WHERE checklistId = ? ORDER BY sortOrder, createdAt`, [input.id]
      );

      return { ...checklists[0], tasks: tasks || [] };
    }),

  createChecklist: hrWriteProcedure
    .input(z.object({
      employeeId: z.string(),
      type: z.enum(["onboarding", "offboarding"]),
      templateId: z.string().optional(),
      assignedTo: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const id = uuidv4();
      await p.query(
        `INSERT INTO onboardingChecklists (id, organizationId, employeeId, templateId, type, status, startDate, assignedTo, notes, createdBy) VALUES (?, ?, ?, ?, ?, 'in_progress', NOW(), ?, ?, ?)`,
        [id, ctx.user.organizationId, input.employeeId, input.templateId || null, input.type, input.assignedTo || ctx.user.id, input.notes || null, ctx.user.id]
      );

      // Copy tasks from template if specified
      if (input.templateId) {
        const [templateTasks] = await p.query(
          `SELECT * FROM onboardingTasks WHERE templateId = ? ORDER BY sortOrder`, [input.templateId]
        );
        for (const task of (templateTasks || [])) {
          await p.query(
            `INSERT INTO onboardingTasks (id, organizationId, checklistId, templateId, title, description, category, assignedTo, sortOrder, isRequired) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), ctx.user.organizationId, id, input.templateId, task.title, task.description, task.category, task.assignedTo, task.sortOrder, task.isRequired]
          );
        }
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: `${input.type}_started`,
        entityType: "onboarding",
        entityId: id,
        description: `${input.type} checklist created for employee ${input.employeeId}`,
      });

      return { id };
    }),

  // ── Tasks ──
  updateTask: hrWriteProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const sets: string[] = [];
      const params: any[] = [];

      if (input.status) {
        sets.push("status = ?");
        params.push(input.status);
        if (input.status === "completed") {
          sets.push("completedAt = NOW()", "completedBy = ?");
          params.push(ctx.user.id);
        }
      }
      if (input.notes !== undefined) { sets.push("notes = ?"); params.push(input.notes); }

      if (sets.length === 0) return { success: true };
      params.push(input.taskId);
      await p.query(`UPDATE onboardingTasks SET ${sets.join(", ")} WHERE id = ?`, params);

      // Check if all required tasks are complete → auto-complete checklist
      const [task] = await p.query(`SELECT checklistId FROM onboardingTasks WHERE id = ?`, [input.taskId]);
      if (task?.[0]?.checklistId) {
        const checklistId = task[0].checklistId;
        const [pending] = await p.query(
          `SELECT COUNT(*) as cnt FROM onboardingTasks WHERE checklistId = ? AND isRequired = 1 AND status NOT IN ('completed', 'skipped')`,
          [checklistId]
        );
        if (pending?.[0]?.cnt === 0) {
          await p.query(
            `UPDATE onboardingChecklists SET status = 'completed', completedDate = NOW() WHERE id = ?`, [checklistId]
          );
        }
      }

      return { success: true };
    }),

  addTask: hrWriteProcedure
    .input(z.object({
      checklistId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      category: z.enum(["documentation", "equipment", "access", "training", "introduction", "other"]).optional(),
      assignedTo: z.string().optional(),
      dueDate: z.string().optional(),
      isRequired: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const id = uuidv4();
      await p.query(
        `INSERT INTO onboardingTasks (id, organizationId, checklistId, title, description, category, assignedTo, dueDate, isRequired) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ctx.user.organizationId, input.checklistId, input.title, input.description || null, input.category || "other", input.assignedTo || null, input.dueDate || null, input.isRequired !== false ? 1 : 0]
      );
      return { id };
    }),

  deleteTask: hrWriteProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query(`DELETE FROM onboardingTasks WHERE id = ?`, [input.taskId]);
      return { success: true };
    }),
});

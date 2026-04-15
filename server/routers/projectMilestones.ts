import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { projectMilestones, projects } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

// Define typed procedures
const createProcedure = createFeatureRestrictedProcedure("projects:milestones");
const readProcedure = createFeatureRestrictedProcedure("projects:read");
const updateProcedure = createFeatureRestrictedProcedure("projects:milestones");
const deleteProcedure = createFeatureRestrictedProcedure("projects:delete");

const createMilestoneSchema = z.object({
  projectId: z.string(),
  phaseName: z.string().min(1).max(255),
  description: z.string().optional(),
  deliverables: z.string().optional(),
  dueDate: z.string().datetime(),
  startDate: z.string().datetime().optional(),
  budget: z.number().int().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

const updateMilestoneSchema = z.object({
  id: z.string(),
  phaseName: z.string().optional(),
  description: z.string().optional(),
  deliverables: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
  completionPercentage: z.number().int().min(0).max(100).optional(),
  assignedTo: z.string().optional(),
  budget: z.number().int().optional(),
  actualCost: z.number().int().optional(),
  notes: z.string().optional(),
});

export const projectMilestonesRouter = router({
  create: createProcedure
    .input(createMilestoneSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        // Verify project exists
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1);

        if (!project.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const id = nanoid();
        const toMysqlDate = (iso: string) => iso.replace('T', ' ').substring(0, 19);

        await db.insert(projectMilestones).values({
          id,
          projectId: input.projectId,
          phaseName: input.phaseName,
          description: input.description,
          deliverables: input.deliverables,
          dueDate: toMysqlDate(input.dueDate),
          startDate: input.startDate ? toMysqlDate(input.startDate) : undefined,
          budget: input.budget,
          assignedTo: input.assignedTo,
          notes: input.notes,
          status: "planning",
          completionPercentage: 0,
          createdBy: ctx.user.id,
        });

        return { id, success: true };
      } catch (error) {
        console.error("[PROJECT_MILESTONES] Create error:", error);
        if (error instanceof TRPCError) throw error;
        const msg = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create milestone: ${msg}`,
        });
      }
    }),

  list: readProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const filters = [];
        if (input.projectId) {
          filters.push(eq(projectMilestones.projectId, input.projectId));
        }
        if (input.status) {
          filters.push(eq(projectMilestones.status, input.status));
        }

        const result = await db
          .select()
          .from(projectMilestones)
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(projectMilestones.dueDate);

        return result;
      } catch (error) {
        console.error("[PROJECT_MILESTONES] List error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch milestones",
        });
      }
    }),

  getById: readProcedure.input(z.string()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    try {
      const result = await db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, input))
        .limit(1);

      if (!result.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Milestone not found",
        });
      }

      return result[0];
    } catch (error) {
      console.error("[PROJECT_MILESTONES] GetById error:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch milestone",
      });
    }
  }),

  update: updateProcedure
    .input(updateMilestoneSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const { id, ...updateData } = input;

        const existing = await db
          .select()
          .from(projectMilestones)
          .where(eq(projectMilestones.id, id))
          .limit(1);

        if (!existing.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Milestone not found",
          });
        }

        const updates: any = {
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        if (updateData.phaseName !== undefined) {
          updates.phaseName = updateData.phaseName;
        }
        if (updateData.description !== undefined) {
          updates.description = updateData.description;
        }
        if (updateData.deliverables !== undefined) {
          updates.deliverables = updateData.deliverables;
        }
        if (updateData.dueDate !== undefined) {
          updates.dueDate = updateData.dueDate;
        }
        if (updateData.startDate !== undefined) {
          updates.startDate = updateData.startDate;
        }
        if (updateData.status !== undefined) {
          updates.status = updateData.status;
          if (updateData.status === "completed") {
            updates.completionPercentage = 100;
            updates.completionDate = new Date().toISOString();
          }
        }
        if (updateData.completionPercentage !== undefined) {
          updates.completionPercentage = updateData.completionPercentage;
          if (updateData.completionPercentage === 100 && !updates.completionDate) {
            updates.completionDate = new Date().toISOString();
            updates.status = "completed";
          }
        }
        if (updateData.assignedTo !== undefined) {
          updates.assignedTo = updateData.assignedTo;
        }
        if (updateData.budget !== undefined) {
          updates.budget = updateData.budget;
        }
        if (updateData.actualCost !== undefined) {
          updates.actualCost = updateData.actualCost;
        }
        if (updateData.notes !== undefined) {
          updates.notes = updateData.notes;
        }

        await db
          .update(projectMilestones)
          .set(updates)
          .where(eq(projectMilestones.id, id));

        return { success: true };
      } catch (error) {
        console.error("[PROJECT_MILESTONES] Update error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update milestone",
        });
      }
    }),

  delete: deleteProcedure.input(z.string()).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    try {
      await db
        .delete(projectMilestones)
        .where(eq(projectMilestones.id, input));

      return { success: true };
    } catch (error) {
      console.error("[PROJECT_MILESTONES] Delete error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete milestone",
      });
    }
  }),

  updateProgress: updateProcedure
    .input(
      z.object({
        id: z.string(),
        completionPercentage: z.number().int().min(0).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const updates: any = {
          completionPercentage: input.completionPercentage,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        // Auto-complete if 100%
        if (input.completionPercentage === 100) {
          updates.status = "completed";
          updates.completionDate = new Date().toISOString();
        } else if (input.completionPercentage > 0) {
          updates.status = "in_progress";
        }

        await db
          .update(projectMilestones)
          .set(updates)
          .where(eq(projectMilestones.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[PROJECT_MILESTONES] UpdateProgress error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update milestone progress",
        });
      }
    }),

  getUpcomingMilestones: readProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        daysAhead: z.number().int().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const now = new Date();
        const futureDate = new Date(now.getTime() + input.daysAhead * 24 * 60 * 60 * 1000);

        const filters = [
          eq(projectMilestones.status, "planning"),
          gte(projectMilestones.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
          lte(projectMilestones.dueDate, futureDate.toISOString().replace('T', ' ').substring(0, 19)),
        ];

        if (input.projectId) {
          filters.push(eq(projectMilestones.projectId, input.projectId));
        }

        const result = await db
          .select()
          .from(projectMilestones)
          .where(and(...filters))
          .orderBy(projectMilestones.dueDate);

        return result;
      } catch (error) {
        console.error("[PROJECT_MILESTONES] GetUpcoming error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch upcoming milestones",
        });
      }
    }),

  getOverdueMilestones: readProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const now = new Date();

        const filters = [
          eq(projectMilestones.status, "in_progress"),
          lte(projectMilestones.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
        ];

        if (input.projectId) {
          filters.push(eq(projectMilestones.projectId, input.projectId));
        }

        const result = await db
          .select()
          .from(projectMilestones)
          .where(and(...filters))
          .orderBy(projectMilestones.dueDate);

        return result;
      } catch (error) {
        console.error("[PROJECT_MILESTONES] GetOverdue error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch overdue milestones",
        });
      }
    }),

  getProjectStats: readProcedure.input(z.string()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    try {
      const milestones = await db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, input));

      const total = milestones.length;
      const completed = milestones.filter((m) => m.status === "completed").length;
      const inProgress = milestones.filter((m) => m.status === "in_progress").length;
      const avgCompletion =
        total > 0
          ? Math.round(
              milestones.reduce((sum, m) => sum + m.completionPercentage, 0) / total
            )
          : 0;

      return {
        total,
        completed,
        inProgress,
        avgCompletion,
        milestones,
      };
    } catch (error) {
      console.error("[PROJECT_MILESTONES] GetStats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch milestone stats",
      });
    }
  }),
});

export type ProjectMilestonesRouter = typeof projectMilestonesRouter;

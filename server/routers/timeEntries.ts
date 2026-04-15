import { protectedProcedure, router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { timeEntries, projects, projectTasks, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

// Feature-based procedures
const readProcedure = createFeatureRestrictedProcedure("timeEntries:read");
const createProcedure = createFeatureRestrictedProcedure("timeEntries:create");
const updateProcedure = createFeatureRestrictedProcedure("timeEntries:edit");
const deleteProcedure = createFeatureRestrictedProcedure("timeEntries:delete");
const writeProcedure = createFeatureRestrictedProcedure("timeEntries:edit");

const createEntrySchema = z.object({
  projectId: z.string(),
  projectTaskId: z.string().optional(),
  entryDate: z.string().datetime(),
  durationMinutes: z.number().int().min(1).max(1440), // 1 min to 24 hours
  description: z.string().min(1).max(500),
  billable: z.boolean().default(true),
  hourlyRate: z.number().int().optional(),
  notes: z.string().optional(),
});

const updateEntrySchema = z.object({
  id: z.string(),
  entryDate: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  description: z.string().min(1).max(500).optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().int().optional(),
  notes: z.string().optional(),
});

const listEntriesSchema = z.object({
  projectId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "invoiced", "rejected"]).optional(),
  billable: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const timeEntriesRouter = router({
  create: writeProcedure
    .input(createEntrySchema)
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

        // If projectTaskId provided, verify it exists
        if (input.projectTaskId) {
          const task = await db
            .select()
            .from(projectTasks)
            .where(eq(projectTasks.id, input.projectTaskId))
            .limit(1);

          if (!task.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project task not found",
            });
          }
        }

        const id = nanoid();
        const amount = input.hourlyRate 
          ? Math.round((input.durationMinutes / 60) * input.hourlyRate)
          : 0;

        // Convert ISO 8601 to MySQL datetime format
        const entryDate = new Date(input.entryDate).toISOString().slice(0, 19).replace("T", " ");

        await db.insert(timeEntries).values({
          id,
          projectId: input.projectId,
          projectTaskId: input.projectTaskId,
          userId: ctx.user.id,
          entryDate,
          durationMinutes: input.durationMinutes,
          description: input.description,
          billable: input.billable ? 1 : 0,
          hourlyRate: input.hourlyRate,
          amount,
          status: "draft",
          notes: input.notes,
          createdBy: ctx.user.id,
        });

        return { id, success: true };
      } catch (error) {
        console.error("[TIME_ENTRIES] Create error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create time entry",
        });
      }
    }),

  list: readProcedure
    .input(listEntriesSchema.optional().default({}))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const filters: any[] = [];

        if (input.projectId) {
          filters.push(eq(timeEntries.projectId, input.projectId));
        }

        if (input.userId) {
          filters.push(eq(timeEntries.userId, input.userId));
        } else {
          // Non-admins see only their own entries by default
          if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "staff") {
            filters.push(eq(timeEntries.userId, ctx.user.id));
          }
        }

        if (input.status) {
          filters.push(eq(timeEntries.status, input.status));
        }

        if (input.billable !== undefined) {
          filters.push(eq(timeEntries.billable, input.billable ? 1 : 0));
        }

        if (input.startDate) {
          filters.push(gte(timeEntries.entryDate, input.startDate));
        }

        if (input.endDate) {
          filters.push(lte(timeEntries.entryDate, input.endDate));
        }

        const entries = await db
          .select()
          .from(timeEntries)
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(desc(timeEntries.entryDate));

        return entries.map((entry) => ({
          ...entry,
          billable: entry.billable === 1,
        }));
      } catch (error) {
        console.error("[TIME_ENTRIES] List error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list time entries",
        });
      }
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const entry = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.id, input))
          .limit(1);

        if (!entry.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time entry not found",
          });
        }

        // Check authorization
        const e = entry[0];
        if (
          ctx.user.id !== e.userId &&
          ctx.user.role !== "admin" &&
          ctx.user.role !== "super_admin" &&
          ctx.user.role !== "staff"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to view this entry",
          });
        }

        return { ...e, billable: e.billable === 1 };
      } catch (error) {
        console.error("[TIME_ENTRIES] GetById error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch time entry",
        });
      }
    }),

  update: writeProcedure
    .input(updateEntrySchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        // Get entry first
        const entry = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.id, input.id))
          .limit(1);

        if (!entry.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time entry not found",
          });
        }

        const e = entry[0];

        // Check authorization - only owner or admin can update
        if (
          ctx.user.id !== e.userId &&
          ctx.user.role !== "admin" &&
          ctx.user.role !== "super_admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to update this entry",
          });
        }

        // Can't update if already invoiced or approved (unless admin)
        if ((e.status === "invoiced" || e.status === "approved") && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot update approved or invoiced entries",
          });
        }

        const durationMinutes = input.durationMinutes ?? e.durationMinutes;
        const hourlyRate = input.hourlyRate ?? e.hourlyRate;

        const amount = hourlyRate
          ? Math.round((durationMinutes / 60) * hourlyRate)
          : e.amount;

        await db
          .update(timeEntries)
          .set({
            entryDate: input.entryDate,
            durationMinutes,
            description: input.description,
            billable: input.billable !== undefined ? (input.billable ? 1 : 0) : e.billable,
            hourlyRate,
            amount,
            notes: input.notes,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(timeEntries.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[TIME_ENTRIES] Update error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update time entry",
        });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const entry = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.id, input))
          .limit(1);

        if (!entry.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time entry not found",
          });
        }

        const e = entry[0];

        // Check authorization
        if (
          ctx.user.id !== e.userId &&
          ctx.user.role !== "admin" &&
          ctx.user.role !== "super_admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to delete this entry",
          });
        }

        // Can't delete if invoiced or approved (unless admin)
        if ((e.status === "invoiced" || e.status === "approved") && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete approved or invoiced entries",
          });
        }

        await db.delete(timeEntries).where(eq(timeEntries.id, input));

        return { success: true };
      } catch (error) {
        console.error("[TIME_ENTRIES] Delete error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete time entry",
        });
      }
    }),

  submit: updateProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const entry = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.id, input))
          .limit(1);

        if (!entry.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time entry not found",
          });
        }

        const e = entry[0];

        if (ctx.user.id !== e.userId && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to submit this entry",
          });
        }

        if (e.status !== "draft") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only submit draft entries",
          });
        }

        await db
          .update(timeEntries)
          .set({
            status: "submitted",
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(timeEntries.id, input));

        return { success: true };
      } catch (error) {
        console.error("[TIME_ENTRIES] Submit error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit time entry",
        });
      }
    }),

  approve: updateProcedure
    .input(
      z.object({
        id: z.string(),
        approve: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        // Only admins/staff can approve
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "staff") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can approve time entries",
          });
        }

        const entry = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.id, input.id))
          .limit(1);

        if (!entry.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time entry not found",
          });
        }

        const e = entry[0];

        if (e.status !== "submitted") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only approve submitted entries",
          });
        }

        await db
          .update(timeEntries)
          .set({
            status: input.approve ? "approved" : "rejected",
            approvedBy: ctx.user.id,
            approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(timeEntries.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[TIME_ENTRIES] Approve error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve time entry",
        });
      }
    }),

  getUtilizationReport: readProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        userId: z.string().optional(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        const filters: any[] = [];

        if (input.projectId) {
          filters.push(eq(timeEntries.projectId, input.projectId));
        }

        if (input.userId) {
          filters.push(eq(timeEntries.userId, input.userId));
        } else {
          // Non-admins see only their own data
          if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "staff") {
            filters.push(eq(timeEntries.userId, ctx.user.id));
          }
        }

        filters.push(gte(timeEntries.entryDate, input.startDate));
        filters.push(lte(timeEntries.entryDate, input.endDate));

        const entries = await db
          .select()
          .from(timeEntries)
          .where(and(...filters));

        const report = {
          totalMinutes: 0,
          billableMinutes: 0,
          nonBillableMinutes: 0,
          totalAmount: 0,
          entryCount: entries.length,
          draftCount: 0,
          submittedCount: 0,
          approvedCount: 0,
          invoicedCount: 0,
          utilization: 0,
        };

        entries.forEach((entry) => {
          report.totalMinutes += entry.durationMinutes;
          report.totalAmount += entry.amount || 0;

          if (entry.billable === 1) {
            report.billableMinutes += entry.durationMinutes;
          } else {
            report.nonBillableMinutes += entry.durationMinutes;
          }

          if (entry.status === "draft") report.draftCount++;
          else if (entry.status === "submitted") report.submittedCount++;
          else if (entry.status === "approved") report.approvedCount++;
          else if (entry.status === "invoiced") report.invoicedCount++;
        });

        // Calculate utilization percentage
        if (report.totalMinutes > 0) {
          report.utilization = Math.round((report.billableMinutes / report.totalMinutes) * 100);
        }

        return report;
      } catch (error) {
        console.error("[TIME_ENTRIES] GetUtilizationReport error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate utilization report",
        });
      }
    }),

  getProjectSummary: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      try {
        // Verify project exists
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, input))
          .limit(1);

        if (!project.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const entries = await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.projectId, input));

        const summary = {
          projectId: input,
          totalMinutes: 0,
          billableMinutes: 0,
          totalAmount: 0,
          entryCount: entries.length,
          approvedAmount: 0,
          invoicedAmount: 0,
          pendingAmount: 0,
          byUser: {} as Record<string, any>,
        };

        entries.forEach((entry) => {
          summary.totalMinutes += entry.durationMinutes;
          summary.totalAmount += entry.amount || 0;

          if (entry.billable === 1) {
            summary.billableMinutes += entry.durationMinutes;
          }

          if (entry.status === "approved" || entry.status === "invoiced") {
            summary.approvedAmount += entry.amount || 0;
          }

          if (entry.status === "invoiced") {
            summary.invoicedAmount += entry.amount || 0;
          } else if (entry.status === "approved" || entry.status === "submitted") {
            summary.pendingAmount += entry.amount || 0;
          }

          // Group by user
          if (!summary.byUser[entry.userId]) {
            summary.byUser[entry.userId] = {
              userId: entry.userId,
              minutes: 0,
              amount: 0,
              entryCount: 0,
            };
          }

          summary.byUser[entry.userId].minutes += entry.durationMinutes;
          summary.byUser[entry.userId].amount += entry.amount || 0;
          summary.byUser[entry.userId].entryCount += 1;
        });

        return summary;
      } catch (error) {
        console.error("[TIME_ENTRIES] GetProjectSummary error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate project summary",
        });
      }
    }),
});

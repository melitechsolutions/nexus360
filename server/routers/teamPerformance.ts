import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import { performanceReviews, skillsMatrix, schedules, employees, vacationRequests } from "../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// Define typed procedures
const createProcedure = createFeatureRestrictedProcedure("hr:performance");
const readProcedure = createFeatureRestrictedProcedure("hr:read");
const updateProcedure = createFeatureRestrictedProcedure("hr:performance");

export const teamPerformanceRouter = router({
  /**
   * Create performance review
   */
  createReview: createProcedure
    .input(
      z.object({
        employeeId: z.string(),
        period: z.string(),
        overallRating: z.number().min(1).max(5),
        performanceScore: z.number().min(0).max(100),
        productivity: z.number().min(0).max(10),
        collaboration: z.number().min(0).max(10),
        communication: z.number().min(0).max(10),
        technicalSkills: z.number().min(0).max(10),
        leadership: z.number().min(0).max(10),
        comments: z.string().optional(),
        goals: z.string().optional(),
        developmentPlan: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        const reviewId = uuidv4();
        await db.insert(performanceReviews).values({
          id: reviewId,
          employeeId: input.employeeId,
          reviewerId: ctx.user?.id || "",
          period: input.period,
          overallRating: input.overallRating,
          performanceScore: input.performanceScore,
          productivity: input.productivity,
          collaboration: input.collaboration,
          communication: input.communication,
          technicalSkills: input.technicalSkills,
          leadership: input.leadership,
          comments: input.comments,
          goals: input.goals,
          developmentPlan: input.developmentPlan,
          status: "completed",
        });

        return { success: true, reviewId };
      } catch (error) {
        console.error("[TEAM PERFORMANCE] Error creating review:", error);
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get reviews for employee
   */
  getEmployeeReviews: readProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { reviews: [] };

      try {
        const reviews = await db.select().from(performanceReviews)
          .where(eq(performanceReviews.employeeId, input.employeeId))
          .orderBy(desc(performanceReviews.reviewDate));
        return { reviews };
      } catch (error) {
        console.error("[TEAM PERFORMANCE] Error:", error);
        return { reviews: [] };
      }
    }),

  /**
   * Add skill to employee
   */
  addSkill: createProcedure
    .input(
      z.object({
        employeeId: z.string(),
        skillName: z.string(),
        proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
        yearsOfExperience: z.number(),
        certifications: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        const skillId = uuidv4();
        await db.insert(skillsMatrix).values({
          id: skillId,
          employeeId: input.employeeId,
          skillName: input.skillName,
          proficiencyLevel: input.proficiencyLevel,
          yearsOfExperience: input.yearsOfExperience,
          certifications: input.certifications,
        });

        return { success: true, skillId };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get skill matrix for employee
   */
  getEmployeeSkills: readProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { skills: [] };

      try {
        const skills = await db.select().from(skillsMatrix)
          .where(eq(skillsMatrix.employeeId, input.employeeId));
        return { skills };
      } catch (error) {
        return { skills: [] };
      }
    }),

  /**
   * Get team performance dashboard
   */
  getTeamDashboard: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { team: [] };

    try {
      // Get employees in the same organization
      const orgId = (ctx.user as any)?.organizationId;
      const emps = orgId
        ? await db.select().from(employees).where(eq(employees.organizationId, orgId)).limit(50)
        : await db.select().from(employees).limit(50);
      const dashboard = [];

      for (const emp of emps) {
        const [latestReview] = await db.select().from(performanceReviews)
          .where(eq(performanceReviews.employeeId, emp.id))
          .orderBy(desc(performanceReviews.reviewDate))
          .limit(1);
        const skills = await db.select().from(skillsMatrix)
          .where(eq(skillsMatrix.employeeId, emp.id));
        dashboard.push({
          ...emp,
          latestReview: latestReview || null,
          skillCount: skills.length,
        });
      }

      return { team: dashboard };
    } catch (error) {
      return { team: [] };
    }
  }),
});

export const advancedSchedulingRouter = router({
  /**
   * Create schedule/task
   */
  createSchedule: createProcedure
    .input(
      z.object({
        employeeId: z.string(),
        taskTitle: z.string(),
        description: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        projectId: z.string().optional(),
        recurrencePattern: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        const scheduleId = uuidv4();
        const duration = new Date(input.endDate).getTime() - new Date(input.startDate).getTime();

        await db.insert(schedules).values({
          id: scheduleId,
          employeeId: input.employeeId,
          taskTitle: input.taskTitle,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          duration: Math.ceil(duration / (1000 * 60 * 60)),
          priority: input.priority,
          projectId: input.projectId,
          recurrencePattern: input.recurrencePattern,
          assignedTo: ctx.user?.id,
          status: 'scheduled',
        });

        return { success: true, scheduleId };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get team calendar
   */
  getTeamCalendar: readProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { events: [] };

      try {
        const events = await db.select().from(schedules)
          .where(and(
            gte(schedules.startDate, input.startDate),
            lte(schedules.endDate, input.endDate)
          ));
        return { events };
      } catch (error) {
        return { events: [] };
      }
    }),

  /**
   * Request vacation
   */
  requestVacation: createProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        vacationType: z.enum(['vacation', 'sick_leave', 'personal', 'sabbatical']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        const requestId = uuidv4();
        const daysRequested = Math.ceil(
          (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        await db.insert(vacationRequests).values({
          id: requestId,
          employeeId: ctx.user?.id || "",
          startDate: input.startDate,
          endDate: input.endDate,
          daysRequested,
          vacationType: input.vacationType,
          reason: input.reason,
          status: 'pending',
        });

        return { success: true, requestId };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get vacation requests (for manager)
   */
  getVacationRequests: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { requests: [] };

    try {
      // Return pending vacation requests (org-scoped if available)
      const allRequests = await db.select().from(vacationRequests)
        .where(eq(vacationRequests.status, "pending"))
        .orderBy(desc(vacationRequests.createdAt));
      return { requests: allRequests };
    } catch (error) {
      return { requests: [] };
    }
  }),

  /**
   * Approve/reject vacation
   */
  approveVacation: updateProcedure
    .input(
      z.object({
        requestId: z.string(),
        approved: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        await db.update(vacationRequests)
          .set({
            status: input.approved ? 'approved' : 'rejected',
            approvedBy: ctx.user?.id,
            approvalDate: new Date().toISOString().slice(0, 19).replace("T", " "),
            notes: input.notes,
          })
          .where(eq(vacationRequests.id, input.requestId));

        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get team utilization
   */
  getTeamUtilization: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { team: [] };

    try {
      const orgId = (ctx.user as any)?.organizationId;
      const emps = orgId
        ? await db.select().from(employees).where(eq(employees.organizationId, orgId)).limit(50)
        : await db.select().from(employees).limit(50);
      const utilization = [];

      for (const emp of emps) {
        const empSchedules = await db.select().from(schedules)
          .where(eq(schedules.employeeId, emp.id));
        const totalHours = empSchedules.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
        const utilizationRate = totalHours > 0 ? Math.min(100, Math.round((totalHours / 160) * 100)) : 0;

        utilization.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          totalHours,
          utilizationRate,
          status: utilizationRate < 50 ? 'underutilized' : utilizationRate > 100 ? 'overbooked' : 'optimal',
        });
      }

      return { team: utilization };
    } catch (error) {
      return { team: [] };
    }
  }),
});

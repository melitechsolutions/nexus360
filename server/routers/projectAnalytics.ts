import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";

/**
 * Calculate project analytics and metrics
 */
export async function calculateProjectMetrics(projectId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get project details
    const project = await db.getProject(projectId);
    if (!project) return null;

    // Get invoices for this project
    const invoices = await db.getInvoicesByProject(projectId);
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    // Get team members allocation
    const teamMembers = await db.getProjectTeamMembers(projectId);
    const totalHoursEstimated = teamMembers.reduce((sum, tm) => sum + (tm.hoursAllocated || 0), 0);

    // Get actual hours from timesheets (if available)
    const actualHours = await db.getProjectActualHours(projectId);

    // Calculate completion percentage
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const now = new Date();
    const totalDays = differenceInDays(endDate, startDate);
    const daysPassed = differenceInDays(now, startDate);
    const completionPercentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

    // Determine status
    let statusKey = 'on-time';
    if (now > endDate) {
      statusKey = 'delayed';
    } else if (completionPercentage > 75) {
      statusKey = 'on-track';
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const costOverrunPercentage = project.budget ? ((project.budget - project.cost) / project.budget) * 100 : 0;
    const scheduleRisk = completionPercentage < (daysPassed / totalDays) * 100 ? 30 : 0;
    
    if (costOverrunPercentage < 10 && scheduleRisk < 20) {
      riskLevel = 'low';
    } else if (costOverrunPercentage < 25 || scheduleRisk < 50) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Store metrics
    const metricsId = uuidv4();
    await db.insertProjectMetrics({
      id: metricsId,
      projectId,
      revenue: totalRevenue,
      costs: project.cost || 0,
      profit: totalRevenue - (project.cost || 0),
      profitMargin: totalRevenue > 0 ? Math.round((((totalRevenue - (project.cost || 0)) / totalRevenue) * 100)) : 0,
      hoursEstimated: totalHoursEstimated,
      hoursActual: actualHours,
      teamMembersCount: teamMembers.length,
      completionPercentage,
      statusKey,
      riskLevel,
    });

    return {
      id: metricsId,
      projectId,
      revenue: totalRevenue,
      costs: project.cost || 0,
      profit: totalRevenue - (project.cost || 0),
      profitMargin: totalRevenue > 0 ? Math.round((((totalRevenue - (project.cost || 0)) / totalRevenue) * 100)) : 0,
      hoursEstimated: totalHoursEstimated,
      hoursActual: actualHours,
      teamMembersCount: teamMembers.length,
      completionPercentage,
      statusKey,
      riskLevel,
    };
  } catch (error) {
    console.error("[PROJECT ANALYTICS] Error calculating metrics:", error);
    return null;
  }
}

export const projectAnalyticsRouter = router({
  /**
   * Get analytics for a specific project
   */
  getProjectAnalytics: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }

      try {
        const metrics = await db.getProjectMetrics(input.projectId);
        if (metrics) {
          return metrics;
        }
        
        // If not cached, calculate on-demand
        return await calculateProjectMetrics(input.projectId);
      } catch (error) {
        console.error("[PROJECT ANALYTICS] Error getting analytics:", error);
        return null;
      }
    }),

  /**
   * Get analytics for all projects (dashboard view)
   */
  getAllProjectAnalytics: createFeatureRestrictedProcedure("reporting:view")
    .input(
      z.object({
        status: z.enum(['active', 'completed', 'on_hold']).optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { projects: [] };

      try {
        const projects = await db.getProjects({ status: input.status, limit: input.limit });
        const analytics = [];

        for (const project of projects) {
          const metrics = await calculateProjectMetrics(project.id);
          if (metrics) {
            analytics.push({
              ...project,
              metrics,
            });
          }
        }

        return { projects: analytics };
      } catch (error) {
        console.error("[PROJECT ANALYTICS] Error getting all analytics:", error);
        return { projects: [] };
      }
    }),

  /**
   * Get projects by risk level
   */
  getProjectsByRisk: createFeatureRestrictedProcedure("reporting:view")
    .input(
      z.object({
        riskLevel: z.enum(['low', 'medium', 'high']),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { projects: [] };

      try {
        const metrics = await db.getProjectMetricsByRisk(input.riskLevel, input.limit);
        const projects = [];

        for (const metric of metrics) {
          const project = await db.getProject(metric.projectId);
          if (project) {
            projects.push({
              ...project,
              metrics: metric,
            });
          }
        }

        return { projects };
      } catch (error) {
        console.error("[PROJECT ANALYTICS] Error getting projects by risk:", error);
        return { projects: [] };
      }
    }),

  /**
   * Get profitability analysis
   */
  getProfitabilityAnalysis: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return { summary: { totalRevenue: 0, totalCosts: 0, totalProfit: 0, averageMargin: 0 }, byProject: [] };
      }

      try {
        const metrics = await db.getProjectMetrics();
        const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
        const totalCosts = metrics.reduce((sum, m) => sum + (m.costs || 0), 0);
        const totalProfit = totalRevenue - totalCosts;
        const averageMargin = metrics.length > 0 
          ? Math.round(metrics.reduce((sum, m) => sum + (m.profitMargin || 0), 0) / metrics.length)
          : 0;

        return {
          summary: {
            totalRevenue,
            totalCosts,
            totalProfit,
            averageMargin,
          },
          byProject: metrics.sort((a, b) => (b.profit || 0) - (a.profit || 0)),
        };
      } catch (error) {
        console.error("[PROJECT ANALYTICS] Error getting profitability:", error);
        return { summary: { totalRevenue: 0, totalCosts: 0, totalProfit: 0, averageMargin: 0 }, byProject: [] };
      }
    }),

  /**
   * Get timeline analysis (on-time vs delays)
   */
  getTimelineAnalysis: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return { onTime: 0, delayed: 0, onTrack: 0, completed: [] };
      }

      try {
        const projects = await db.getProjects({ limit: 1000 });
        let onTime = 0;
        let delayed = 0;
        let onTrack = 0;
        const completed = [];

        for (const project of projects) {
          const metrics = await calculateProjectMetrics(project.id);
          if (metrics) {
            if (metrics.statusKey === 'on-time') onTime++;
            else if (metrics.statusKey === 'delayed') delayed++;
            else if (metrics.statusKey === 'on-track') onTrack++;

            if (project.status === 'completed') {
              completed.push({
                projectName: project.name,
                completionDate: project.endDate,
                onTime: metrics.statusKey !== 'delayed',
              });
            }
          }
        }

        return { onTime, delayed, onTrack, completed };
      } catch (error) {
        console.error("[PROJECT ANALYTICS] Error getting timeline analysis:", error);
        return { onTime: 0, delayed: 0, onTrack: 0, completed: [] };
      }
    }),

  /**
   * Get resource utilization
   */
  getResourceUtilization: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { utilization: [] };
      }

      try {
        const teamMembers = await db.getProjectTeamMembers(input.projectId);
        const utilization = [];

        for (const member of teamMembers) {
          const actualHours = await db.getTeamMemberActualHours(member.employeeId, input.projectId);
          const utilizationRate = member.hoursAllocated > 0 
            ? Math.round((actualHours / member.hoursAllocated) * 100)
            : 0;

          utilization.push({
            employeeId: member.employeeId,
            allocated: member.hoursAllocated,
            actual: actualHours,
            utilizationRate,
            role: member.role,
          });
        }

        return { utilization };
      } catch (error) {
        console.error("[PROJECT ANALYTICS] Error getting resource utilization:", error);
        return { utilization: [] };
      }
    }),

  /**
   * Refresh metrics for all projects
   */
  refreshAllMetrics: createFeatureRestrictedProcedure("reporting:view").mutation(async ({ ctx }) => {
    if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin') {
      throw new Error('Unauthorized - admin only');
    }

    const db = await getDb();
    if (!db) {
      return { success: false, updated: 0 };
    }

    try {
      const projects = await db.getProjects({ limit: 10000 });
      let updated = 0;

      for (const project of projects) {
        await calculateProjectMetrics(project.id);
        updated++;
      }

      return { success: true, updated };
    } catch (error) {
      console.error("[PROJECT ANALYTICS] Error refreshing metrics:", error);
      return { success: false, error: String(error) };
    }
  }),
});

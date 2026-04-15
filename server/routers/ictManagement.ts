import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import { 
  systemHealth, 
  systemLogs, 
  activeSessions,
  emailQueue,
  auditLogs 
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const ictManagementRouter = router({
  // System Health Monitoring
  getSystemHealth: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Use mock data for system health (avoid heavyweight SI dependency)
        const uptime = process.uptime(); // in seconds
        const cpuLoad = Math.random() * 60 + 10; // 10-70%
        const memUsage = Math.random() * 50 + 20; // 20-70%
        const diskUsage = Math.random() * 40 + 30; // 30-70%

        // Query database for historical data
        let healthRecord: any = null;
        try {
          const result = await db
            .select()
            .from(systemHealth)
            .orderBy(desc(systemHealth.createdAt))
            .limit(1);
          healthRecord = result[0] || null;
        } catch (e) {
          console.error("Error querying system health record:", e);
        }

        return {
          timestamp: new Date().toISOString(),
          cpuUsage: cpuLoad,
          memoryUsage: memUsage,
          diskUsagePercent: diskUsage,
          cpu: {
            model: "Intel/AMD Processor",
            cores: 4,
            physicalCores: 2,
            currentSpeed: 2400,
            temperature: 55,
            load: cpuLoad,
            loadPercent: cpuLoad,
          },
          memory: {
            total: 16, // GB
            used: Math.round((memUsage / 100) * 16),
            available: Math.round(((100 - memUsage) / 100) * 16),
            percent: Math.round(memUsage),
          },
          disk: {
            total: 500, // GB
            usage: [{
              disk: "/dev/sda1",
              used: Math.round((diskUsage / 100) * 500),
              size: 500,
              percent: Math.round(diskUsage),
            }],
          },
          system: {
            platform: "linux",
            distro: "Ubuntu",
            release: "20.04 LTS",
            arch: "x64",
            manufacturer: "Docker",
          },
          uptime: Math.round(uptime / 3600), // hours
          systemUptime: (uptime / 3600).toFixed(1),
          status: calculateHealthStatus(cpuLoad, memUsage, diskUsage),
          lastCheck: healthRecord?.createdAt || null,
        };
      } catch (error) {
        console.error("Error fetching system health:", error);
        throw new Error("Failed to retrieve system health information");
      }
    }),

  // Get System Logs
  getSystemLogs: protectedProcedure
    .input(z.object({
      limit: z.number().max(500).default(50),
      offset: z.number().default(0),
      severity: z.enum(["info", "warning", "error", "critical"]).optional(),
      organizationId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        let query = db.select().from(systemLogs);
        
        // Build where clause
        const conditions: any[] = [];
        
        if (input.severity) {
          conditions.push(eq(systemLogs.severity, input.severity));
        }
        
        // For org-level logs, restrict to org
        if (input.organizationId) {
          conditions.push(eq(systemLogs.organizationId, input.organizationId));
        } else if (ctx.user?.role !== "super_admin") {
          // Non-super-admin only sees their org logs
          conditions.push(eq(systemLogs.organizationId, ctx.user?.organizationId || ""));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const total = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(systemLogs)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const logs = await query
          .orderBy(desc(systemLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          logs,
          total: total[0]?.count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error fetching system logs:", error);
        throw new Error("Failed to retrieve system logs");
      }
    }),

  // Get Active Sessions
  getActiveSessions: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
      limit: z.number().max(500).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        let query = db
          .select({
            id: activeSessions.id,
            userId: activeSessions.userId,
            userEmail: activeSessions.userEmail,
            organizationId: activeSessions.organizationId,
            organizationName: organizations.name,
            ipAddress: activeSessions.ipAddress,
            userAgent: activeSessions.userAgent,
            createdAt: activeSessions.createdAt,
            lastActivity: activeSessions.lastActivity,
            expiresAt: activeSessions.expiresAt,
          })
          .from(activeSessions)
          .leftJoin(organizations, eq(activeSessions.organizationId, organizations.id));

        const conditions: any[] = [];

        if (input.organizationId) {
          conditions.push(eq(activeSessions.organizationId, input.organizationId));
        } else if (ctx.user?.role !== "super_admin") {
          conditions.push(eq(activeSessions.organizationId, ctx.user?.organizationId || ""));
        }

        // Only include non-expired sessions
        conditions.push(gte(activeSessions.expiresAt, new Date().toISOString()));

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const sessions = await query
          .orderBy(desc(activeSessions.lastActivity))
          .limit(input.limit);

        return {
          sessions,
          count: sessions.length,
        };
      } catch (error) {
        console.error("Error fetching active sessions:", error);
        throw new Error("Failed to retrieve active sessions");
      }
    }),

  // Terminate Session
  terminateSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get session first
        const session = await db
          .select()
          .from(activeSessions)
          .where(eq(activeSessions.id, input.sessionId));

        if (!session || session.length === 0) {
          throw new Error("Session not found");
        }

        // Check authorization - ICT can only terminate their org's sessions
        if (ctx.user?.role === "ict_manager" && 
            session[0].organizationId !== ctx.user?.organizationId) {
          throw new Error("Unauthorized to terminate this session");
        }

        // Delete the session
        await db
          .delete(activeSessions)
          .where(eq(activeSessions.id, input.sessionId));

        // Log the action
        await logAuditEvent(db, {
          action: "TERMINATE_SESSION",
          userId: ctx.user?.id || "unknown",
          organizationId: ctx.user?.organizationId || "",
          details: `Session ${input.sessionId} terminated by ${ctx.user?.email}`,
          ipAddress: ctx.ipAddress || "",
        });

        return {
          success: true,
          message: "Session terminated successfully",
        };
      } catch (error) {
        console.error("Error terminating session:", error);
        throw new Error("Failed to terminate session");
      }
    }),

  // Get Email Queue Status
  getEmailQueueStatus: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        let query = db
          .select({
            status: emailQueue.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(emailQueue)
          .groupBy(emailQueue.status);

        if (input.organizationId) {
          query = query.where(eq(emailQueue.organizationId, input.organizationId));
        } else if (ctx.user?.role !== "super_admin") {
          query = query.where(eq(emailQueue.organizationId, ctx.user?.organizationId || ""));
        }

        const results = await query;

        // Get recent failures
        let failedEmails = db
          .select()
          .from(emailQueue)
          .where(eq(emailQueue.status, "failed"))
          .orderBy(desc(emailQueue.updatedAt))
          .limit(10);

        if (input.organizationId) {
          failedEmails = failedEmails.where(eq(emailQueue.organizationId, input.organizationId));
        } else if (ctx.user?.role !== "super_admin") {
          failedEmails = failedEmails.where(eq(emailQueue.organizationId, ctx.user?.organizationId || ""));
        }

        const failed = await failedEmails;

        return {
          summary: results,
          recentFailures: failed,
          totalQueued: results.reduce((sum, r) => sum + Number(r.count), 0),
        };
      } catch (error) {
        console.error("Error fetching email queue status:", error);
        throw new Error("Failed to retrieve email queue status");
      }
    }),

  // Get Audit Logs
  getAuditLogs: protectedProcedure
    .input(z.object({
      limit: z.number().max(500).default(50),
      offset: z.number().default(0),
      action: z.string().optional(),
      userId: z.string().optional(),
      organizationId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        let query = db.select().from(auditLogs);
        const conditions: any[] = [];

        if (input.action) {
          conditions.push(eq(auditLogs.action, input.action));
        }

        if (input.userId) {
          conditions.push(eq(auditLogs.userId, input.userId));
        }

        if (input.organizationId) {
          conditions.push(eq(auditLogs.organizationId, input.organizationId));
        } else if (ctx.user?.role !== "super_admin") {
          conditions.push(eq(auditLogs.organizationId, ctx.user?.organizationId || ""));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const total = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(auditLogs)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const logs = await query
          .orderBy(desc(auditLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          logs,
          total: total[0]?.count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        throw new Error("Failed to retrieve audit logs");
      }
    }),

  // Database Maintenance Check
  getDatabaseStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get table statistics
        const tables = await db.query.users.findMany({ limit: 1 });
        
        // This is a basic check - extend with actual DB-specific queries
        return {
          status: "healthy",
          lastCheck: new Date().toISOString(),
          connected: !!db,
          message: "Database connection is operational",
          recommendations: [
            "Run regular maintenance queries",
            "Monitor backup schedules",
            "Check disk space usage",
          ],
        };
      } catch (error) {
        console.error("Error checking database status:", error);
        return {
          status: "unhealthy",
          lastCheck: new Date().toISOString(),
          connected: false,
          message: "Database connection failed",
          recommendations: [
            "Check database service status",
            "Verify connection credentials",
            "Check network connectivity",
          ],
        };
      }
    }),

  // Get System Alerts/Notifications
  getSystemAlerts: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
      severity: z.enum(["info", "warning", "critical"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // This would query alerts from your monitoring system
      // For now, return calculated alerts based on system health
      try {
        const health = await getSystemHealthForAlerts();
        const alerts = [];

        if (health.cpuLoad > 80) {
          alerts.push({
            id: "cpu_high",
            severity: "warning",
            title: "High CPU Usage",
            message: `CPU usage at ${health.cpuLoad}%`,
            createdAt: new Date().toISOString(),
          });
        }

        if (health.memoryUsage > 85) {
          alerts.push({
            id: "mem_high",
            severity: "critical",
            title: "High Memory Usage",
            message: `Memory usage at ${health.memoryUsage}%`,
            createdAt: new Date().toISOString(),
          });
        }

        if (health.diskUsage > 90) {
          alerts.push({
            id: "disk_full",
            severity: "critical",
            title: "Disk Space Low",
            message: `Disk usage at ${health.diskUsage}%`,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          alerts: alerts.filter(a => 
            !input.severity || a.severity.includes(input.severity)
          ),
          count: alerts.length,
        };
      } catch (error) {
        console.error("Error fetching system alerts:", error);
        throw new Error("Failed to retrieve system alerts");
      }
    }),
});

// Helper Functions
function calculateHealthStatus(cpuLoad: number, memUsage: number, diskUsage: number): string {
  if (cpuLoad > 90 || memUsage > 90 || diskUsage > 95) {
    return "critical";
  }
  if (cpuLoad > 75 || memUsage > 80 || diskUsage > 85) {
    return "warning";
  }
  return "healthy";
}

async function getSystemHealthForAlerts() {
  try {
    // Return mock data (avoid heavy SI dependency)
    return {
      cpuLoad: Math.random() * 60 + 10,
      memoryUsage: Math.random() * 50 + 20,
      diskUsage: Math.random() * 40 + 30,
    };
  } catch (error) {
    console.error("Error getting system health for alerts:", error);
    return {
      cpuLoad: 0,
      memoryUsage: 0,
      diskUsage: 0,
    };
  }
}

async function logAuditEvent(db: any, event: {
  action: string;
  userId: string;
  organizationId: string;
  details: string;
  ipAddress: string;
}) {
  try {
    await db.insert(auditLogs).values({
      id: `audit_${Date.now()}`,
      action: event.action,
      userId: event.userId,
      organizationId: event.organizationId,
      details: event.details,
      ipAddress: event.ipAddress,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
}

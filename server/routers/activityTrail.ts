import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const activityTrailRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).optional().default(50),
      offset: z.number().min(0).optional().default(0),
      page: z.number().min(1).optional(),
      userId: z.number().optional(),
      entityType: z.string().optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const params = input || {};
      const limit = params.limit ?? 50;
      const offset = params.page ? (params.page - 1) * limit : (params.offset ?? 0);
      try {
        const conditions: any[] = [];
        if (params.userId) conditions.push(sql`userId = ${params.userId}`);
        if (params.entityType) conditions.push(sql`entityType = ${params.entityType}`);
        if (params.action) conditions.push(sql`action = ${params.action}`);
        if (params.search) conditions.push(sql`description LIKE ${`%${params.search}%`}`);
        if (params.startDate) conditions.push(sql`createdAt >= ${params.startDate}`);
        if (params.endDate) conditions.push(sql`createdAt <= ${params.endDate}`);

        const whereClause = conditions.length > 0
          ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
          : sql``;

        const [rows] = await db.execute(
          sql`SELECT * FROM activityLog ${whereClause} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`
        );

        const [countResult] = await db.execute(
          sql`SELECT COUNT(*) as total FROM activityLog ${whereClause}`
        );
        const total = (countResult as any[])?.[0]?.total ?? 0;

        const activities = ((rows as any[]) || []).map((row: any) => ({
          ...row,
          timestamp: row.createdAt,
        }));

        return { activities, total };
      } catch (err) {
        console.error('activityTrail.list error:', err);
        return { activities: [], total: 0 };
      }
    }),

  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [actionRows] = await db.execute(
        sql`SELECT action, COUNT(*) as count FROM activityLog GROUP BY action ORDER BY count DESC LIMIT 10`
      );
      const actionStats = (actionRows as any[]) || [];

      const [summaryRows] = await db.execute(
        sql`SELECT COUNT(*) as totalActivities, COUNT(DISTINCT userId) as uniqueUsers FROM activityLog`
      );
      const summary = (summaryRows as any[])?.[0] || {};

      return {
        actions: actionStats,
        totalActivities: Number(summary.totalActivities || 0),
        successCount: Number(summary.totalActivities || 0),
        failedCount: 0,
        uniqueUsers: Number(summary.uniqueUsers || 0),
      };
    } catch {
      return { actions: [], totalActivities: 0, successCount: 0, failedCount: 0, uniqueUsers: 0 };
    }
  }),

  getEntityTypes: protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [rows] = await db.execute(
        sql`SELECT DISTINCT entityType FROM activityLog WHERE entityType IS NOT NULL ORDER BY entityType`
      );
      return ((rows as any[]) || []).map((r: any) => r.entityType).filter(Boolean);
    } catch {
      return [
        "invoice", "payment", "client", "employee",
        "project", "expense", "report", "system",
        "user", "payroll", "leave", "attendance",
      ];
    }
  }),

  getActions: protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [rows] = await db.execute(
        sql`SELECT DISTINCT action FROM activityLog ORDER BY action`
      );
      return ((rows as any[]) || []).map((r: any) => r.action).filter(Boolean);
    } catch {
      return [
        "created", "updated", "deleted", "approved",
        "rejected", "exported", "login", "logout",
        "sent", "viewed", "printed",
      ];
    }
  }),
});

import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { reminders, scheduledReminders } from "../../drizzle/schema";
import { and, asc, eq, lte } from "drizzle-orm";
import { z } from "zod";

const listInput = z.object({
  status: z.enum(["pending", "sent", "failed", "cancelled"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  includeDueOnly: z.boolean().optional(),
});

export const remindersRouter = router({
  list: protectedProcedure
    .input(listInput.optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const conditions = [
        input?.status ? eq(scheduledReminders.status, input.status) : undefined,
        input?.includeDueOnly ? lte(scheduledReminders.scheduledFor, now) : undefined,
      ].filter(Boolean) as any[];

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: scheduledReminders.id,
          scheduledFor: scheduledReminders.scheduledFor,
          status: scheduledReminders.status,
          referenceType: scheduledReminders.referenceType,
          referenceId: scheduledReminders.referenceId,
          reminderId: reminders.id,
          title: reminders.name,
          type: reminders.type,
        })
        .from(scheduledReminders)
        .leftJoin(reminders, eq(reminders.id, scheduledReminders.reminderId))
        .where(whereClause)
        .orderBy(asc(scheduledReminders.scheduledFor))
        .limit(input?.limit ?? 20);

      return rows;
    }),
});

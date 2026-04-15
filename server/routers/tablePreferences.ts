import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userTablePreferences } from "../../drizzle/schema-extended";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export const tablePreferencesRouter = router({
  /** Get table preferences for the current user + table */
  get: protectedProcedure
    .input(z.object({ tableName: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const [pref] = await db
        .select()
        .from(userTablePreferences)
        .where(
          and(
            eq(userTablePreferences.userId, ctx.user.id),
            eq(userTablePreferences.tableName, input.tableName)
          )
        )
        .limit(1);

      if (!pref) return null;

      return {
        id: pref.id,
        tableName: pref.tableName,
        visibleColumns: pref.visibleColumns
          ? (JSON.parse(pref.visibleColumns) as string[])
          : null,
        columnOrder: pref.columnOrder
          ? (JSON.parse(pref.columnOrder) as string[])
          : null,
        pageSize: pref.pageSize ?? 25,
      };
    }),

  /** Upsert table preferences (create or update) */
  save: protectedProcedure
    .input(
      z.object({
        tableName: z.string().min(1).max(100),
        visibleColumns: z.array(z.string()).optional(),
        columnOrder: z.array(z.string()).optional(),
        pageSize: z.number().min(5).max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [existing] = await db
        .select()
        .from(userTablePreferences)
        .where(
          and(
            eq(userTablePreferences.userId, ctx.user.id),
            eq(userTablePreferences.tableName, input.tableName)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(userTablePreferences)
          .set({
            ...(input.visibleColumns !== undefined && {
              visibleColumns: JSON.stringify(input.visibleColumns),
            }),
            ...(input.columnOrder !== undefined && {
              columnOrder: JSON.stringify(input.columnOrder),
            }),
            ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
            updatedAt: new Date(),
          })
          .where(eq(userTablePreferences.id, existing.id));

        return { id: existing.id };
      }

      const id = nanoid();
      await db.insert(userTablePreferences).values({
        id,
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId ?? null,
        tableName: input.tableName,
        visibleColumns: input.visibleColumns
          ? JSON.stringify(input.visibleColumns)
          : null,
        columnOrder: input.columnOrder
          ? JSON.stringify(input.columnOrder)
          : null,
        pageSize: input.pageSize ?? 25,
      });

      return { id };
    }),

  /** Reset table preferences to defaults */
  reset: protectedProcedure
    .input(z.object({ tableName: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db
        .delete(userTablePreferences)
        .where(
          and(
            eq(userTablePreferences.userId, ctx.user.id),
            eq(userTablePreferences.tableName, input.tableName)
          )
        );
      return { success: true };
    }),
});

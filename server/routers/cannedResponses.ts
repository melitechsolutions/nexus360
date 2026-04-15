import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { cannedResponses } from "../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

export const cannedResponsesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const orgId = (ctx.user as any).organizationId ?? null;
    const rows = await db
      .select()
      .from(cannedResponses)
      .where(orgId ? eq(cannedResponses.organizationId, orgId) : undefined)
      .orderBy(asc(cannedResponses.category), asc(cannedResponses.title));
    return rows;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        category: z.string().min(1).max(100).default("General"),
        shortCode: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = uuidv4();
      const orgId = (ctx.user as any).organizationId ?? null;
      await db.insert(cannedResponses).values({
        id,
        organizationId: orgId,
        title: input.title,
        content: input.content,
        category: input.category,
        shortCode: input.shortCode ?? null,
        createdBy: ctx.user.id,
      });
      const [created] = await db.select().from(cannedResponses).where(eq(cannedResponses.id, id)).limit(1);
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        category: z.string().min(1).max(100).optional(),
        shortCode: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...rest } = input;
      await db
        .update(cannedResponses)
        .set({ ...rest, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
        .where(eq(cannedResponses.id, id));
      const [updated] = await db.select().from(cannedResponses).where(eq(cannedResponses.id, id)).limit(1);
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(cannedResponses).where(eq(cannedResponses.id, input.id));
      return { success: true };
    }),

  categories: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const orgId = (ctx.user as any).organizationId ?? null;
    const rows = await db
      .select({ category: cannedResponses.category })
      .from(cannedResponses)
      .where(orgId ? eq(cannedResponses.organizationId, orgId) : undefined)
      .orderBy(asc(cannedResponses.category));

    // Deduplicate categories
    const seen = new Set<string>();
    const cats: string[] = [];
    for (const row of rows) {
      if (!seen.has(row.category)) {
        seen.add(row.category);
        cats.push(row.category);
      }
    }
    return cats;
  }),
});

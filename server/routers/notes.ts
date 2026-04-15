import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { notes } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

export const notesRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const filters: any[] = [eq(notes.createdBy, ctx.user.id)];
      if (input?.category) {
        filters.push(eq(notes.category, input.category));
      }

      const rows = await db
        .select()
        .from(notes)
        .where(and(...filters))
        .orderBy(desc(notes.createdAt));

      return rows.map((r) => ({
        ...r,
        pinned: r.pinned === 1,
        favorite: r.favorite === 1,
      }));
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(300),
      content: z.string().optional(),
      category: z.string().default("General"),
      pinned: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = nanoid();
      await db.insert(notes).values({
        id,
        title: input.title,
        content: input.content ?? "",
        category: input.category,
        pinned: input.pinned ? 1 : 0,
        favorite: 0,
        createdBy: ctx.user.id,
        organizationId: (ctx.user as any).organizationId ?? null,
      });

      return { id, success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(300).optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      pinned: z.boolean().optional(),
      favorite: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select().from(notes).where(eq(notes.id, input.id)).limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      if (existing[0].createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your note" });

      const updates: any = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.content !== undefined) updates.content = input.content;
      if (input.category !== undefined) updates.category = input.category;
      if (input.pinned !== undefined) updates.pinned = input.pinned ? 1 : 0;
      if (input.favorite !== undefined) updates.favorite = input.favorite ? 1 : 0;

      await db.update(notes).set(updates).where(eq(notes.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select().from(notes).where(eq(notes.id, input)).limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      if (existing[0].createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your note" });

      await db.delete(notes).where(eq(notes.id, input));
      return { success: true };
    }),
});

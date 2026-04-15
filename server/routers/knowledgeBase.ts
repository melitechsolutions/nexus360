import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { kbCategories, kbArticles } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const knowledgeBaseRouter = router({
  // ── Categories ──
  listCategories: protectedProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(kbCategories).orderBy(kbCategories.sortOrder);
  }),

  createCategory: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const id = uuid();
      await db.insert(kbCategories).values({ id, ...input });
      return { id };
    }),

  updateCategory: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db.update(kbCategories).set(data).where(eq(kbCategories.id, id));
      return { success: true };
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(kbArticles).where(eq(kbArticles.categoryId, input.id));
      await db.delete(kbCategories).where(eq(kbCategories.id, input.id));
      return { success: true };
    }),

  // ── Articles ──
  listArticles: protectedProcedure
    .input(z.object({
      categoryId: z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      if (input?.categoryId) conditions.push(eq(kbArticles.categoryId, input.categoryId));
      if (input?.status) conditions.push(eq(kbArticles.status, input.status));
      if (input?.search) conditions.push(like(kbArticles.title, `%${input.search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(kbArticles).where(where).orderBy(desc(kbArticles.createdAt));
    }),

  getArticle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, input.id));
      if (article) {
        await db.update(kbArticles).set({ views: sql`${kbArticles.views} + 1` }).where(eq(kbArticles.id, input.id));
      }
      return article || null;
    }),

  createArticle: protectedProcedure
    .input(z.object({
      categoryId: z.string(),
      title: z.string().min(1),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      status: z.string().optional(),
      featured: z.boolean().optional(),
      readTime: z.number().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuid();
      await db.insert(kbArticles).values({ id, ...input, createdBy: (ctx as any).user?.id });
      return { id };
    }),

  updateArticle: protectedProcedure
    .input(z.object({
      id: z.string(),
      categoryId: z.string().optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      status: z.string().optional(),
      featured: z.boolean().optional(),
      readTime: z.number().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db.update(kbArticles).set(data).where(eq(kbArticles.id, id));
      return { success: true };
    }),

  deleteArticle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(kbArticles).where(eq(kbArticles.id, input.id));
      return { success: true };
    }),
});

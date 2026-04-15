import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import * as db from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { userFavorites } from '../../drizzle/schema';

export const favoritesRouter = router({
  /** List current user's favorites, optionally filtered by type */
  list: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const conditions = [eq(userFavorites.userId, ctx.user.id)];
        if (input?.entityType) {
          conditions.push(eq(userFavorites.entityType, input.entityType));
        }

        return await database.select().from(userFavorites)
          .where(and(...conditions))
          .orderBy(desc(userFavorites.createdAt))
          .limit(100);
      } catch (e: any) {
        // Table may not exist yet — return empty gracefully
        if (e?.code === 'ER_NO_SUCH_TABLE') return [];
        throw e;
      }
    }),

  /** Toggle a favorite on/off. Returns { starred: boolean } */
  toggle: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.string(),
      entityName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        // Check if already favorited
        const existing = await database.select().from(userFavorites)
          .where(and(
            eq(userFavorites.userId, ctx.user.id),
            eq(userFavorites.entityType, input.entityType),
            eq(userFavorites.entityId, input.entityId),
          ))
          .limit(1);

        if (existing.length > 0) {
          // Remove favorite
          await database.delete(userFavorites)
            .where(eq(userFavorites.id, existing[0].id));
          return { starred: false };
        } else {
          // Add favorite
          const crypto = await import('crypto');
          await database.insert(userFavorites).values({
            id: crypto.randomUUID(),
            userId: ctx.user.id,
            entityType: input.entityType,
            entityId: input.entityId,
            entityName: input.entityName || null,
          });
          return { starred: true };
        }
      } catch (e: any) {
        if (e?.code === 'ER_NO_SUCH_TABLE') return { starred: false };
        throw e;
      }
    }),

  /** Check if an entity is starred by the current user */
  isStarred: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        const existing = await database.select().from(userFavorites)
          .where(and(
            eq(userFavorites.userId, ctx.user.id),
            eq(userFavorites.entityType, input.entityType),
            eq(userFavorites.entityId, input.entityId),
          ))
          .limit(1);

        return { starred: existing.length > 0 };
      } catch (e: any) {
        if (e?.code === 'ER_NO_SUCH_TABLE') return { starred: false };
        throw e;
      }
    }),

  /** Remove a specific favorite by ID */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        await database.delete(userFavorites)
          .where(and(
            eq(userFavorites.id, input.id),
            eq(userFavorites.userId, ctx.user.id),
          ));
      } catch (e: any) {
        if (e?.code !== 'ER_NO_SUCH_TABLE') throw e;
      }

      return { success: true };
    }),
});

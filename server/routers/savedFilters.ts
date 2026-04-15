import { z } from "zod";
import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { savedFilters } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Validation schemas
const SaveFilterInput = z.object({
  moduleName: z.string().min(1, "Module name is required"),
  filterName: z.string().min(1, "Filter name is required"),
  description: z.string().optional(),
  filterConfig: z.record(z.string(), z.any()), // JSON object with filter configuration
  isDefault: z.boolean().optional().default(false),
});

const UpdateFilterInput = z.object({
  id: z.string(),
  filterName: z.string().optional(),
  description: z.string().optional(),
  filterConfig: z.record(z.string(), z.any()).optional(),
  isDefault: z.boolean().optional(),
});

const createProcedure = createFeatureRestrictedProcedure("filters:create");
const readProcedure = createFeatureRestrictedProcedure("filters:read");
const writeProcedure = createFeatureRestrictedProcedure("filters:update");

export const savedFiltersRouter = router({
  // Create a new saved filter
  create: createProcedure
    .input(SaveFilterInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = crypto.randomUUID();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      try {
        await db.insert(savedFilters).values({
          id,
          userId: ctx.user.id,
          moduleName: input.moduleName,
          filterName: input.filterName,
          description: input.description || null,
          filterConfig: JSON.stringify(input.filterConfig),
          isDefault: input.isDefault ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        });

        return {
          id,
          moduleName: input.moduleName,
          filterName: input.filterName,
          description: input.description,
          filterConfig: input.filterConfig,
          isDefault: input.isDefault,
          createdAt: now,
          updatedAt: now,
        };
      } catch (error) {
        console.error("Failed to create saved filter:", error);
        throw new Error("Failed to create saved filter");
      }
    }),

  // Get all saved filters for a module
  listByModule: readProcedure
    .input(z.object({ moduleName: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const filters = await db
          .select()
          .from(savedFilters)
          .where(
            and(
              eq(savedFilters.userId, ctx.user.id),
              eq(savedFilters.moduleName, input.moduleName)
            )
          );

        return filters.map((f) => ({
          id: f.id,
          moduleName: f.moduleName,
          filterName: f.filterName,
          description: f.description ?? undefined,
          filterConfig: JSON.parse(f.filterConfig),
          isDefault: f.isDefault === 1,
          createdAt: f.createdAt ?? '',
          updatedAt: f.updatedAt ?? '',
        }));
      } catch (error) {
        console.error("Failed to list saved filters:", error);
        return [];
      }
    }),

  // Get all saved filters for user
  listAll: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    try {
      const filters = await db
        .select()
        .from(savedFilters)
        .where(eq(savedFilters.userId, ctx.user.id));

      return filters.map((f) => ({
        id: f.id,
        moduleName: f.moduleName,
        filterName: f.filterName,
        description: f.description ?? undefined,
        filterConfig: JSON.parse(f.filterConfig),
        isDefault: f.isDefault === 1,
        createdAt: f.createdAt ?? '',
        updatedAt: f.updatedAt ?? '',
      }));
    } catch (error) {
      console.error("Failed to list all saved filters:", error);
      return [];
    }
  }),

  // Update a saved filter
  update: writeProcedure
    .input(UpdateFilterInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const updateData: any = {
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        if (input.filterName) updateData.filterName = input.filterName;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.filterConfig) updateData.filterConfig = JSON.stringify(input.filterConfig);
        if (input.isDefault !== undefined) updateData.isDefault = input.isDefault ? 1 : 0;

        await db
          .update(savedFilters)
          .set(updateData)
          .where(
            and(
              eq(savedFilters.id, input.id),
              eq(savedFilters.userId, ctx.user.id)
            )
          );

        return { success: true };
      } catch (error) {
        console.error("Failed to update saved filter:", error);
        throw new Error("Failed to update saved filter");
      }
    }),

  // Delete a saved filter
  delete: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        await db
          .delete(savedFilters)
          .where(
            and(
              eq(savedFilters.id, input.id),
              eq(savedFilters.userId, ctx.user.id)
            )
          );

        return { success: true };
      } catch (error) {
        console.error("Failed to delete saved filter:", error);
        throw new Error("Failed to delete saved filter");
      }
    }),

  // Set a filter as default for a module
  setDefault: writeProcedure
    .input(z.object({ id: z.string(), moduleName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Remove default from all other filters in this module
        await db
          .update(savedFilters)
          .set({ isDefault: 0 })
          .where(
            and(
              eq(savedFilters.userId, ctx.user.id),
              eq(savedFilters.moduleName, input.moduleName)
            )
          );

        // Set this filter as default
        await db
          .update(savedFilters)
          .set({ isDefault: 1 })
          .where(eq(savedFilters.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("Failed to set default filter:", error);
        throw new Error("Failed to set default filter");
      }
    }),
});

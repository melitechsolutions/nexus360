import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { assets } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// Permission-restricted procedures
const viewProcedure = createFeatureRestrictedProcedure("assets:view");
const createProcedure = createFeatureRestrictedProcedure("assets:create");
const editProcedure = createFeatureRestrictedProcedure("assets:edit");
const deleteProcedure = createFeatureRestrictedProcedure("assets:delete");

export const assetsRouter = router({
  list: viewProcedure
    .input(z.object({ 
      limit: z.number().optional(), 
      offset: z.number().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const conditions: any[] = [];
        if (input?.category) conditions.push(eq(assets.category, input.category));
        if (input?.status) conditions.push(eq(assets.status, input.status as any));

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;

        const [rows, countResult] = await Promise.all([
          db.select().from(assets).where(where).orderBy(desc(assets.createdAt)).limit(limit).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(assets).where(where),
        ]);

        return {
          data: rows,
          total: countResult[0]?.count ?? 0,
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch assets" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const rows = await db.select().from(assets).where(eq(assets.id, input));
        if (!rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
        }
        return rows[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch asset" });
      }
    }),

  create: createProcedure
    .input(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      location: z.string().min(1),
      value: z.number().positive(),
      assignedTo: z.string().optional(),
      serialNumber: z.string().optional(),
      purchaseDate: z.string().optional(),
      status: z.enum(["active", "inactive", "maintenance", "disposed"]).default("active"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const id = uuidv4();
        const record = {
          id,
          name: input.name,
          category: input.category,
          location: input.location,
          value: Math.round(input.value * 100),
          assignedTo: input.assignedTo ?? null,
          serialNumber: input.serialNumber ?? null,
          purchaseDate: input.purchaseDate ?? null,
          status: input.status,
          notes: input.notes ?? null,
          createdBy: ctx.user.id,
        };
        await db.insert(assets).values(record);
        const rows = await db.select().from(assets).where(eq(assets.id, id));
        return rows[0];
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create asset" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      category: z.string().optional(),
      location: z.string().optional(),
      value: z.number().positive().optional(),
      assignedTo: z.string().optional(),
      serialNumber: z.string().optional(),
      purchaseDate: z.string().optional(),
      status: z.enum(["active", "inactive", "maintenance", "disposed"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        const existing = await db.select().from(assets).where(eq(assets.id, input.id));
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
        }

        const { id, ...updates } = input;
        const setValues: Record<string, any> = {};
        if (updates.name !== undefined) setValues.name = updates.name;
        if (updates.category !== undefined) setValues.category = updates.category;
        if (updates.location !== undefined) setValues.location = updates.location;
        if (updates.value !== undefined) setValues.value = Math.round(updates.value * 100);
        if (updates.assignedTo !== undefined) setValues.assignedTo = updates.assignedTo;
        if (updates.serialNumber !== undefined) setValues.serialNumber = updates.serialNumber;
        if (updates.purchaseDate !== undefined) setValues.purchaseDate = updates.purchaseDate;
        if (updates.status !== undefined) setValues.status = updates.status;
        if (updates.notes !== undefined) setValues.notes = updates.notes;

        if (Object.keys(setValues).length > 0) {
          await db.update(assets).set(setValues).where(eq(assets.id, id));
        }

        const rows = await db.select().from(assets).where(eq(assets.id, id));
        return rows[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update asset" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        const existing = await db.select().from(assets).where(eq(assets.id, input));
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
        }
        await db.delete(assets).where(eq(assets.id, input));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete asset" });
      }
    }),
});

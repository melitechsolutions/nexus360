import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { warranties } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// Permission-restricted procedures
const viewProcedure = createFeatureRestrictedProcedure("warranty:view");
const createProcedure = createFeatureRestrictedProcedure("warranty:create");
const editProcedure = createFeatureRestrictedProcedure("warranty:edit");
const deleteProcedure = createFeatureRestrictedProcedure("warranty:delete");

export const warrantyRouter = router({
  list: viewProcedure
    .input(z.object({ 
      limit: z.number().optional(), 
      offset: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const conditions: any[] = [];
        if (orgId) conditions.push(eq(warranties.organizationId, orgId));
        if (input?.status) conditions.push(eq(warranties.status, input.status as any));
        const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;

        const [rows, countResult] = await Promise.all([
          db.select().from(warranties).where(where).orderBy(desc(warranties.createdAt)).limit(limit).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(warranties).where(where),
        ]);

        return {
          data: rows,
          total: countResult[0]?.count ?? 0,
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch warranties" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const conditions = orgId
          ? and(eq(warranties.id, input), eq(warranties.organizationId, orgId))
          : eq(warranties.id, input);
        const rows = await db.select().from(warranties).where(conditions);
        if (!rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Warranty not found" });
        }
        return rows[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch warranty" });
      }
    }),

  create: createProcedure
    .input(z.object({
      product: z.string().min(1),
      vendor: z.string().min(1),
      expiryDate: z.string(),
      coverage: z.string(),
      status: z.enum(["active", "expiring_soon", "expired"]).default("active"),
      serialNumber: z.string().optional(),
      claimTerms: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const id = uuidv4();
        const record = {
          id,
          organizationId: ctx.user.organizationId ?? null,
          product: input.product,
          vendor: input.vendor,
          expiryDate: input.expiryDate,
          coverage: input.coverage,
          status: input.status,
          serialNumber: input.serialNumber ?? null,
          claimTerms: input.claimTerms ?? null,
          notes: input.notes ?? null,
          createdBy: ctx.user.id,
        };
        await db.insert(warranties).values(record);
        const rows = await db.select().from(warranties).where(eq(warranties.id, id));
        return rows[0];
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create warranty" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      product: z.string().optional(),
      vendor: z.string().optional(),
      expiryDate: z.string().optional(),
      coverage: z.string().optional(),
      status: z.enum(["active", "expiring_soon", "expired"]).optional(),
      serialNumber: z.string().optional(),
      claimTerms: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const idCondition = orgId
          ? and(eq(warranties.id, input.id), eq(warranties.organizationId, orgId))
          : eq(warranties.id, input.id);
        const existing = await db.select().from(warranties).where(idCondition);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Warranty not found" });
        }

        const { id, ...updates } = input;
        const setValues: Record<string, any> = {};
        if (updates.product !== undefined) setValues.product = updates.product;
        if (updates.vendor !== undefined) setValues.vendor = updates.vendor;
        if (updates.expiryDate !== undefined) setValues.expiryDate = updates.expiryDate;
        if (updates.coverage !== undefined) setValues.coverage = updates.coverage;
        if (updates.status !== undefined) setValues.status = updates.status;
        if (updates.serialNumber !== undefined) setValues.serialNumber = updates.serialNumber;
        if (updates.claimTerms !== undefined) setValues.claimTerms = updates.claimTerms;
        if (updates.notes !== undefined) setValues.notes = updates.notes;

        if (Object.keys(setValues).length > 0) {
          await db.update(warranties).set(setValues).where(idCondition);
        }

        const rows = await db.select().from(warranties).where(idCondition);
        return rows[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update warranty" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const idCondition = orgId
          ? and(eq(warranties.id, input), eq(warranties.organizationId, orgId))
          : eq(warranties.id, input);
        const existing = await db.select().from(warranties).where(idCondition);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Warranty not found" });
        }
        await db.delete(warranties).where(idCondition);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete warranty" });
      }
    }),
});

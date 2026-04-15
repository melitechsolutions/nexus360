import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb, getNextDocumentNumber } from "../db";
import { contracts } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// Permission-restricted procedures
const viewProcedure = createFeatureRestrictedProcedure("contracts:view");
const createProcedure = createFeatureRestrictedProcedure("contracts:create");
const editProcedure = createFeatureRestrictedProcedure("contracts:edit");
const deleteProcedure = createFeatureRestrictedProcedure("contracts:delete");

export const contractsRouter = router({
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
        const statusFilter = input?.status ? eq(contracts.status, input.status as any) : undefined;
        const where = orgId && statusFilter ? and(eq(contracts.organizationId, orgId), statusFilter) : orgId ? eq(contracts.organizationId, orgId) : statusFilter;
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;

        const [rows, countResult] = await Promise.all([
          db.select().from(contracts).where(where).orderBy(desc(contracts.createdAt)).limit(limit).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(contracts).where(where),
        ]);

        return {
          data: rows,
          total: countResult[0]?.count ?? 0,
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch contracts" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const where = orgId ? and(eq(contracts.id, input), eq(contracts.organizationId, orgId)) : eq(contracts.id, input);
        const rows = await db.select().from(contracts).where(where);
        if (!rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
        }
        return rows[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch contract" });
      }
    }),

  create: createProcedure
    .input(z.object({
      name: z.string().min(1),
      vendor: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      value: z.number().positive(),
      status: z.enum(["draft", "active", "expired", "terminated"]).default("draft"),
      contractType: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const id = uuidv4();
        const contractNumber = await getNextDocumentNumber('contract');
        const record = {
          id,
          contractNumber,
          name: input.name,
          vendor: input.vendor,
          startDate: input.startDate,
          endDate: input.endDate,
          value: Math.round(input.value * 100),
          status: input.status,
          contractType: input.contractType ?? null,
          description: input.description ?? null,
          notes: input.notes ?? null,
          createdBy: ctx.user.id,
          organizationId: ctx.user.organizationId ?? null,
        };
        await db.insert(contracts).values(record);
        const rows = await db.select().from(contracts).where(eq(contracts.id, id));
        return rows[0];
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create contract" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      vendor: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      value: z.number().positive().optional(),
      status: z.enum(["draft", "active", "expired", "terminated"]).optional(),
      contractType: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const ownerCheck = orgId ? and(eq(contracts.id, input.id), eq(contracts.organizationId, orgId)) : eq(contracts.id, input.id);
        const existing = await db.select().from(contracts).where(ownerCheck);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
        }

        const { id, ...updates } = input;
        const setValues: Record<string, any> = {};
        if (updates.name !== undefined) setValues.name = updates.name;
        if (updates.vendor !== undefined) setValues.vendor = updates.vendor;
        if (updates.startDate !== undefined) setValues.startDate = updates.startDate;
        if (updates.endDate !== undefined) setValues.endDate = updates.endDate;
        if (updates.value !== undefined) setValues.value = Math.round(updates.value * 100);
        if (updates.status !== undefined) setValues.status = updates.status;
        if (updates.contractType !== undefined) setValues.contractType = updates.contractType;
        if (updates.description !== undefined) setValues.description = updates.description;
        if (updates.notes !== undefined) setValues.notes = updates.notes;

        if (Object.keys(setValues).length > 0) {
          await db.update(contracts).set(setValues).where(eq(contracts.id, id));
        }

        const rows = await db.select().from(contracts).where(eq(contracts.id, id));
        return rows[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update contract" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const where = orgId ? and(eq(contracts.id, input), eq(contracts.organizationId, orgId)) : eq(contracts.id, input);
        const existing = await db.select().from(contracts).where(where);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
        }
        await db.delete(contracts).where(where);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete contract" });
      }
    }),
});

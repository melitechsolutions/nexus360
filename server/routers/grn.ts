import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { grnRecords } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const viewProcedure = createFeatureRestrictedProcedure("grn:view");
const createProcedure = createFeatureRestrictedProcedure("grn:create");
const editProcedure = createFeatureRestrictedProcedure("grn:edit");
const deleteProcedure = createFeatureRestrictedProcedure("grn:delete");

export const grnRouter = router({
  list: viewProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const conditions: any[] = [];
        if (input?.status) conditions.push(eq(grnRecords.status, input.status as any));
        if (ctx.user?.organizationId) conditions.push(eq(grnRecords.organizationId, ctx.user.organizationId));

        const whereClause = conditions.length > 1 ? and(...conditions) : conditions.length === 1 ? conditions[0] : undefined;
        const all = await db.select().from(grnRecords)
          .where(whereClause)
          .orderBy(desc(grnRecords.createdAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0);

        const countResult = await db.select({ count: sql<number>`count(*)` }).from(grnRecords)
          .where(whereClause);

        return { data: all, total: countResult[0]?.count || 0 };
      } catch (error) {
        console.error("Error listing GRNs:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch GRNs" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const result = await db.select().from(grnRecords).where(eq(grnRecords.id, input));
        if (!result.length) throw new TRPCError({ code: "NOT_FOUND", message: "GRN not found" });
        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch GRN" });
      }
    }),

  create: createProcedure
    .input(z.object({
      grnNo: z.string().min(1),
      supplier: z.string().min(1),
      invNo: z.string().optional(),
      receivedDate: z.string(),
      items: z.number().positive(),
      value: z.number().positive(),
      status: z.enum(["accepted", "partial", "rejected", "pending"]).default("pending"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const id = uuidv4();
        await db.insert(grnRecords).values({
          id,
          organizationId: ctx.user?.organizationId || null,
          grnNo: input.grnNo,
          supplier: input.supplier,
          invNo: input.invNo || null,
          receivedDate: input.receivedDate,
          items: input.items,
          value: Math.round(input.value * 100),
          status: input.status,
          notes: input.notes || null,
          createdBy: ctx.user?.id || "",
        });
        const created = await db.select().from(grnRecords).where(eq(grnRecords.id, id));
        return created[0] || { id, ...input };
      } catch (error) {
        console.error("Error creating GRN:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create GRN" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      grnNo: z.string().optional(),
      supplier: z.string().optional(),
      invNo: z.string().optional(),
      receivedDate: z.string().optional(),
      items: z.number().positive().optional(),
      value: z.number().positive().optional(),
      status: z.enum(["accepted", "partial", "rejected", "pending"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const existing = await db.select().from(grnRecords).where(eq(grnRecords.id, input.id));
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "GRN not found" });

        const { id, ...updates } = input;
        const setObj: any = {};
        if (updates.grnNo !== undefined) setObj.grnNo = updates.grnNo;
        if (updates.supplier !== undefined) setObj.supplier = updates.supplier;
        if (updates.invNo !== undefined) setObj.invNo = updates.invNo;
        if (updates.receivedDate !== undefined) setObj.receivedDate = updates.receivedDate;
        if (updates.items !== undefined) setObj.items = updates.items;
        if (updates.value !== undefined) setObj.value = Math.round(updates.value * 100);
        if (updates.status !== undefined) setObj.status = updates.status;
        if (updates.notes !== undefined) setObj.notes = updates.notes;

        await db.update(grnRecords).set(setObj).where(eq(grnRecords.id, id));
        const updated = await db.select().from(grnRecords).where(eq(grnRecords.id, id));
        return updated[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update GRN" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const existing = await db.select().from(grnRecords).where(eq(grnRecords.id, input));
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "GRN not found" });
        await db.delete(grnRecords).where(eq(grnRecords.id, input));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete GRN" });
      }
    }),
});

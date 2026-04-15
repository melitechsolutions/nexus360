import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { quotations } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const viewProcedure = createFeatureRestrictedProcedure("quotations:view");
const createProcedure = createFeatureRestrictedProcedure("quotations:create");
const editProcedure = createFeatureRestrictedProcedure("quotations:edit");
const deleteProcedure = createFeatureRestrictedProcedure("quotations:delete");

export const quotationsRouter = router({
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
        const orgId = ctx.user.organizationId;
        if (orgId) conditions.push(eq(quotations.organizationId, orgId));
        if (input?.status) conditions.push(eq(quotations.status, input.status as any));

        const whereClause = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

        const all = await db.select().from(quotations)
          .where(whereClause)
          .orderBy(desc(quotations.createdAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0);

        const countResult = await db.select({ count: sql<number>`count(*)` }).from(quotations)
          .where(whereClause);

        return { data: all, total: countResult[0]?.count || 0 };
      } catch (error) {
        console.error("Error listing quotations:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch quotations" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const where = orgId ? and(eq(quotations.id, input), eq(quotations.organizationId, orgId)) : eq(quotations.id, input);
        const result = await db.select().from(quotations).where(where);
        if (!result.length) throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch quotation" });
      }
    }),

  create: createProcedure
    .input(z.object({
      rfqNo: z.string().min(1),
      supplier: z.string().min(1),
      description: z.string().optional(),
      amount: z.number().positive(),
      dueDate: z.string().optional(),
      status: z.enum(["draft", "submitted", "under_review", "approved", "rejected"]).default("draft"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const id = uuidv4();
        await db.insert(quotations).values({
          id,
          organizationId: ctx.user?.organizationId ?? null,
          rfqNo: input.rfqNo,
          supplier: input.supplier,
          description: input.description || null,
          amount: Math.round(input.amount * 100),
          dueDate: input.dueDate || null,
          status: input.status,
          createdBy: ctx.user?.id || "",
        });
        const created = await db.select().from(quotations).where(eq(quotations.id, id));
        return created[0] || { id, ...input };
      } catch (error) {
        console.error("Error creating quotation:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create quotation" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      rfqNo: z.string().optional(),
      supplier: z.string().optional(),
      description: z.string().optional(),
      amount: z.number().positive().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["draft", "submitted", "under_review", "approved", "rejected"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const ownerCheck = orgId ? and(eq(quotations.id, input.id), eq(quotations.organizationId, orgId)) : eq(quotations.id, input.id);
        const existing = await db.select().from(quotations).where(ownerCheck);
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });

        const { id, ...updates } = input;
        const setObj: any = {};
        if (updates.rfqNo !== undefined) setObj.rfqNo = updates.rfqNo;
        if (updates.supplier !== undefined) setObj.supplier = updates.supplier;
        if (updates.description !== undefined) setObj.description = updates.description;
        if (updates.amount !== undefined) setObj.amount = Math.round(updates.amount * 100);
        if (updates.dueDate !== undefined) setObj.dueDate = updates.dueDate;
        if (updates.status !== undefined) setObj.status = updates.status;

        await db.update(quotations).set(setObj).where(eq(quotations.id, id));
        const updated = await db.select().from(quotations).where(eq(quotations.id, id));
        return updated[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update quotation" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const where = orgId ? and(eq(quotations.id, input), eq(quotations.organizationId, orgId)) : eq(quotations.id, input);
        const existing = await db.select().from(quotations).where(where);
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
        await db.delete(quotations).where(where);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete quotation" });
      }
    }),
});

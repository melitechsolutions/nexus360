import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { deliveryNotes } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

const viewProcedure = createFeatureRestrictedProcedure("delivery_notes:view");
const createProcedure = createFeatureRestrictedProcedure("delivery_notes:create");
const editProcedure = createFeatureRestrictedProcedure("delivery_notes:edit");
const deleteProcedure = createFeatureRestrictedProcedure("delivery_notes:delete");

export const deliveryNotesRouter = router({
  list: viewProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const conditions: any[] = [];
        if (input?.status) conditions.push(eq(deliveryNotes.status, input.status as any));

        const all = await db.select().from(deliveryNotes)
          .where(conditions.length ? conditions[0] : undefined)
          .orderBy(desc(deliveryNotes.createdAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0);

        const countResult = await db.select({ count: sql<number>`count(*)` }).from(deliveryNotes)
          .where(conditions.length ? conditions[0] : undefined);

        return { data: all, total: countResult[0]?.count || 0 };
      } catch (error) {
        console.error("Error listing delivery notes:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch delivery notes" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const result = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, input));
        if (!result.length) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery note not found" });
        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch delivery note" });
      }
    }),

  create: createProcedure
    .input(z.object({
      dnNo: z.string().min(1),
      supplier: z.string().min(1),
      orderId: z.string().optional(),
      deliveryDate: z.string(),
      items: z.number().positive(),
      status: z.enum(["pending", "partial", "delivered", "cancelled"]).default("pending"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const id = uuidv4();
        await db.insert(deliveryNotes).values({
          id,
          dnNo: input.dnNo,
          supplier: input.supplier,
          orderId: input.orderId || null,
          deliveryDate: input.deliveryDate,
          items: input.items,
          status: input.status,
          notes: input.notes || null,
          createdBy: ctx.user?.id || "",
        });
        const created = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, id));
        return created[0] || { id, ...input };
      } catch (error) {
        console.error("Error creating delivery note:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create delivery note" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      dnNo: z.string().optional(),
      supplier: z.string().optional(),
      deliveryDate: z.string().optional(),
      items: z.number().positive().optional(),
      status: z.enum(["pending", "partial", "delivered", "cancelled"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const existing = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, input.id));
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery note not found" });

        const { id, ...updates } = input;
        const setObj: any = {};
        if (updates.dnNo !== undefined) setObj.dnNo = updates.dnNo;
        if (updates.supplier !== undefined) setObj.supplier = updates.supplier;
        if (updates.deliveryDate !== undefined) setObj.deliveryDate = updates.deliveryDate;
        if (updates.items !== undefined) setObj.items = updates.items;
        if (updates.status !== undefined) setObj.status = updates.status;
        if (updates.notes !== undefined) setObj.notes = updates.notes;

        await db.update(deliveryNotes).set(setObj).where(eq(deliveryNotes.id, id));
        const updated = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, id));
        return updated[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update delivery note" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const existing = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, input));
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery note not found" });
        await db.delete(deliveryNotes).where(eq(deliveryNotes.id, input));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete delivery note" });
      }
    }),
});

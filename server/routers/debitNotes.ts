import { router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { debitNotes } from "../../drizzle/schema";
import { lineItems } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";

const viewProcedure = createFeatureRestrictedProcedure("accounting:debit-notes:view");
const createProcedure = createFeatureRestrictedProcedure("accounting:debit-notes:create");
const editProcedure = createFeatureRestrictedProcedure("accounting:debit-notes:edit");
const deleteProcedure = createFeatureRestrictedProcedure("accounting:debit-notes:delete");

const debitNoteLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  taxRate: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
});

const issueDateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value.toISOString().replace('T', ' ').substring(0, 19);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().replace('T', ' ').substring(0, 19);
    }
    return value;
  }
  return value;
}, z.string());

const nullableNumberSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}, z.number().nonnegative().optional());

const createDebitNoteSchema = z.object({
  debitNoteNumber: z.string().min(1),
  issueDate: issueDateSchema,
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  purchaseOrderId: z.string().optional(),
  reason: z.enum(["quality-shortage", "price-adjustment", "damaged", "underdelivery", "penalty"]),
  items: z.array(debitNoteLineItemSchema).min(1),
  subtotal: nullableNumberSchema,
  taxAmount: nullableNumberSchema,
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  status: z.enum(["draft", "approved", "settled", "void"]).default("draft"),
});

export const debitNotesRouter = router({
  list: viewProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const where = orgId ? eq(debitNotes.organizationId, orgId) : undefined;
      return await db.select().from(debitNotes).where(where).orderBy(desc(debitNotes.createdAt));
    } catch (error) {
      console.error("Error listing debit notes:", error);
      throw new Error("Failed to list debit notes");
    }
  }),

  get: viewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const conditions = orgId
        ? and(eq(debitNotes.id, input.id), eq(debitNotes.organizationId, orgId))
        : eq(debitNotes.id, input.id);
      const [dn] = await db.select().from(debitNotes).where(conditions);
      if (!dn) return null;
      const items = await db.select().from(lineItems).where(
        and(eq(lineItems.documentId, input.id), eq(lineItems.documentType, 'debit_note'))
      );
      return { ...dn, items };
    }),

  create: createProcedure
    .input(createDebitNoteSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const id = uuidv4();
        const computedSubtotal = input.items.reduce((sum, item) => sum + item.total, 0);
        const subtotal = input.subtotal ?? computedSubtotal;
        await db.insert(debitNotes).values({
          id,
          organizationId: ctx.user?.organizationId ?? null,
          debitNoteNumber: input.debitNoteNumber,
          supplierId: input.supplierId,
          supplierName: input.supplierName,
          purchaseOrderId: input.purchaseOrderId || null,
          issueDate: input.issueDate,
          reason: input.reason,
          subtotal,
          taxAmount: input.taxAmount || 0,
          total: input.total,
          status: input.status,
          notes: input.notes || null,
          createdBy: ctx.user?.id,
        });

        for (const item of input.items) {
          await db.insert(lineItems).values({
            id: uuidv4(),
            documentId: id,
            documentType: 'debit_note',
            description: item.description,
            quantity: item.quantity,
            rate: item.unitPrice,
            amount: item.total,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount || 0,
          });
        }

        return { id, debitNoteNumber: input.debitNoteNumber };
      } catch (error) {
        console.error("Error creating debit note:", error);
        throw new Error("Failed to create debit note");
      }
    }),

  update: editProcedure
    .input(z.object({ id: z.string() }).merge(createDebitNoteSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const idCondition = orgId
          ? and(eq(debitNotes.id, input.id), eq(debitNotes.organizationId, orgId))
          : eq(debitNotes.id, input.id);
        const computedSubtotal = input.items.reduce((sum, item) => sum + item.total, 0);
        const subtotal = input.subtotal ?? computedSubtotal;
        await db.update(debitNotes).set({
          debitNoteNumber: input.debitNoteNumber,
          supplierId: input.supplierId,
          supplierName: input.supplierName,
          purchaseOrderId: input.purchaseOrderId || null,
          issueDate: input.issueDate,
          reason: input.reason,
          subtotal,
          taxAmount: input.taxAmount || 0,
          total: input.total,
          status: input.status,
          notes: input.notes || null,
        }).where(idCondition);

        // Replace line items
        await db.delete(lineItems).where(
          and(eq(lineItems.documentId, input.id), eq(lineItems.documentType, 'debit_note'))
        );
        for (const item of input.items) {
          await db.insert(lineItems).values({
            id: uuidv4(),
            documentId: input.id,
            documentType: 'debit_note',
            description: item.description,
            quantity: item.quantity,
            rate: item.unitPrice,
            amount: item.total,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount || 0,
          });
        }

        return { id: input.id };
      } catch (error) {
        console.error("Error updating debit note:", error);
        throw new Error("Failed to update debit note");
      }
    }),

  delete: deleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const orgId = ctx.user.organizationId;
        const idCondition = orgId
          ? and(eq(debitNotes.id, input.id), eq(debitNotes.organizationId, orgId))
          : eq(debitNotes.id, input.id);
        await db.delete(lineItems).where(
          and(eq(lineItems.documentId, input.id), eq(lineItems.documentType, 'debit_note'))
        );
        await db.delete(debitNotes).where(idCondition);
        return { success: true, id: input.id };
      } catch (error) {
        console.error("Error deleting debit note:", error);
        throw new Error("Failed to delete debit note");
      }
    }),
});

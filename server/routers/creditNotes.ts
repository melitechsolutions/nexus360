import { router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { creditNotes, lineItems } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";

const viewProcedure = createFeatureRestrictedProcedure("accounting:credit-notes:view");
const createProcedure = createFeatureRestrictedProcedure("accounting:credit-notes:create");
const editProcedure = createFeatureRestrictedProcedure("accounting:credit-notes:edit");
const deleteProcedure = createFeatureRestrictedProcedure("accounting:credit-notes:delete");

const creditNoteItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  taxRate: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
});

const createCreditNoteSchema = z.object({
  creditNoteNumber: z.string().min(1),
  issueDate: z.string(),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  invoiceId: z.string().optional(),
  reason: z.enum(["goods-returned", "service-cancelled", "discount", "quality-issue", "error", "other"]),
  items: z.array(creditNoteItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  status: z.enum(["draft", "approved"]).default("draft"),
});

export const creditNotesRouter = router({
  list: viewProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const where = orgId ? eq(creditNotes.organizationId, orgId) : undefined;
      const rows = await db.select().from(creditNotes).where(where).orderBy(desc(creditNotes.createdAt));
      return rows;
    }),

  get: viewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const conditions = orgId
        ? and(eq(creditNotes.id, input.id), eq(creditNotes.organizationId, orgId))
        : eq(creditNotes.id, input.id);
      const [cn] = await db.select().from(creditNotes).where(conditions);
      if (!cn) return null;
      const items = await db.select().from(lineItems).where(
        and(eq(lineItems.documentId, input.id), eq(lineItems.documentType, 'credit_note'))
      );
      return { ...cn, items };
    }),

  create: createProcedure
    .input(createCreditNoteSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(creditNotes).values({
        id,
        organizationId: ctx.user?.organizationId ?? null,
        creditNoteNumber: input.creditNoteNumber,
        clientId: input.clientId,
        clientName: input.clientName,
        invoiceId: input.invoiceId || null,
        issueDate: input.issueDate,
        reason: input.reason,
        subtotal: input.subtotal,
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
          documentType: 'credit_note',
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          taxRate: item.taxRate || 0,
          taxAmount: item.taxAmount || 0,
        });
      }

      return { id, creditNoteNumber: input.creditNoteNumber };
    }),

  update: editProcedure
    .input(z.object({ id: z.string() }).merge(createCreditNoteSchema))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const idCondition = orgId
        ? and(eq(creditNotes.id, input.id), eq(creditNotes.organizationId, orgId))
        : eq(creditNotes.id, input.id);
      await db.update(creditNotes).set({
        creditNoteNumber: input.creditNoteNumber,
        clientId: input.clientId,
        clientName: input.clientName,
        invoiceId: input.invoiceId || null,
        issueDate: input.issueDate,
        reason: input.reason,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount || 0,
        total: input.total,
        status: input.status,
        notes: input.notes || null,
      }).where(idCondition);

      // Replace line items
      await db.delete(lineItems).where(
        and(eq(lineItems.documentId, input.id), eq(lineItems.documentType, 'credit_note'))
      );
      for (const item of input.items) {
        await db.insert(lineItems).values({
          id: uuidv4(),
          documentId: input.id,
          documentType: 'credit_note',
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          taxRate: item.taxRate || 0,
          taxAmount: item.taxAmount || 0,
        });
      }

      return { id: input.id };
    }),

  delete: deleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const idCondition = orgId
        ? and(eq(creditNotes.id, input.id), eq(creditNotes.organizationId, orgId))
        : eq(creditNotes.id, input.id);
      await db.delete(lineItems).where(
        and(eq(lineItems.documentId, input.id), eq(lineItems.documentType, 'credit_note'))
      );
      await db.delete(creditNotes).where(idCondition);
      return { success: true, id: input.id };
    }),

  getNextNumber: viewProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const orgId = ctx.user.organizationId;
      const where = orgId ? eq(creditNotes.organizationId, orgId) : undefined;
      const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(creditNotes).where(where);
      const num = (result?.count || 0) + 1;
      return `CN-${String(num).padStart(5, '0')}`;
    }),
});

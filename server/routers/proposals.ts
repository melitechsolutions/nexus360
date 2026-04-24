import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { proposals } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateNextDocumentNumber } from "../utils/document-numbering";

async function generateNextProposalNumber(db: any): Promise<string> {
  return generateNextDocumentNumber(db, "proposal");
}

const createProcedure = createFeatureRestrictedProcedure("proposals:create");
const readProcedure = createFeatureRestrictedProcedure("proposals:read");
const updateProcedure = createFeatureRestrictedProcedure("proposals:update");
const deleteProcedure = createFeatureRestrictedProcedure("proposals:delete");

export const proposalsRouter = router({
  list: readProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(proposals)
        .orderBy(desc(proposals.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(proposals).where(eq(proposals.id, input)).limit(1);
      return result[0] || null;
    }),

  getNextProposalNumber: readProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const nextNumber = await generateNextProposalNumber(db);
      return { proposalNumber: nextNumber };
    }),

  create: createProcedure
    .input(z.object({
      proposalNumber: z.string().optional(),
      clientId: z.string(),
      title: z.string().optional(),
      status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
      issueDate: z.string(),
      expiryDate: z.string().optional(),
      subtotal: z.number(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      total: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = uuidv4();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      let proposalNumber = input.proposalNumber;
      if (!proposalNumber) {
        proposalNumber = await generateNextProposalNumber(db);
      }

      await db.insert(proposals).values({
        id,
        proposalNumber,
        clientId: input.clientId,
        title: input.title || null,
        status: input.status || 'draft',
        issueDate: new Date(input.issueDate).toISOString().replace('T', ' ').substring(0, 19),
        expiryDate: input.expiryDate ? new Date(input.expiryDate).toISOString().replace('T', ' ').substring(0, 19) : null,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount || 0,
        discountAmount: input.discountAmount || 0,
        total: input.total,
        notes: input.notes || null,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      return { id, proposalNumber };
    }),

  update: updateProcedure
    .input(z.object({
      id: z.string(),
      clientId: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
      issueDate: z.string().optional(),
      expiryDate: z.string().optional(),
      subtotal: z.number().optional(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      total: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...data } = input;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const updateData: any = { updatedAt: now };

      if (data.clientId !== undefined) updateData.clientId = data.clientId;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate).toISOString().replace('T', ' ').substring(0, 19);
      if (data.expiryDate !== undefined) updateData.expiryDate = new Date(data.expiryDate).toISOString().replace('T', ' ').substring(0, 19);
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
      if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
      if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount;
      if (data.total !== undefined) updateData.total = data.total;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db.update(proposals).set(updateData).where(eq(proposals.id, id));
      return { id };
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(proposals).where(eq(proposals.id, input));
      return { success: true };
    }),
});

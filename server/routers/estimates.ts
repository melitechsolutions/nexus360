import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { estimates, estimateItems, activityLog } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateNextDocumentNumber } from "../utils/document-numbering";

// Use shared settings-aware document numbering
async function generateNextEstimateNumber(db: any): Promise<string> {
  return generateNextDocumentNumber(db, "estimate");
}

// Validation schema for line items
const lineItemSchema = z.object({
  id: z.string().optional(),
  itemType: z.enum(['product', 'service', 'custom']),
  itemId: z.string().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative().default(0),
  discountPercent: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
});

export const estimatesRouter = router({
  list: createFeatureRestrictedProcedure("estimates:read")
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.user.organizationId;
      const baseQuery = orgId
        ? db.select({
            id: estimates.id,
            estimateNumber: estimates.estimateNumber,
            clientId: estimates.clientId,
            title: estimates.title,
            status: estimates.status,
            issueDate: estimates.issueDate,
            expiryDate: estimates.expiryDate,
            subtotal: estimates.subtotal,
            taxAmount: estimates.taxAmount,
            discountAmount: estimates.discountAmount,
            total: estimates.total,
            notes: estimates.notes,
            terms: estimates.terms,
            createdBy: estimates.createdBy,
            createdAt: estimates.createdAt,
            updatedAt: estimates.updatedAt,
          }).from(estimates).where(eq(estimates.organizationId, orgId))
        : db.select({
            id: estimates.id,
            estimateNumber: estimates.estimateNumber,
            clientId: estimates.clientId,
            title: estimates.title,
            status: estimates.status,
            issueDate: estimates.issueDate,
            expiryDate: estimates.expiryDate,
            subtotal: estimates.subtotal,
            taxAmount: estimates.taxAmount,
            discountAmount: estimates.discountAmount,
            total: estimates.total,
            notes: estimates.notes,
            terms: estimates.terms,
            createdBy: estimates.createdBy,
            createdAt: estimates.createdAt,
            updatedAt: estimates.updatedAt,
          }).from(estimates);
      return await (baseQuery as any).limit(input?.limit || 50).offset(input?.offset || 0);
    }),

  getNextEstimateNumber: createFeatureRestrictedProcedure("estimates:read")
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const nextNumber = await generateNextEstimateNumber(db);
      return { estimateNumber: nextNumber };
    }),

  getById: createFeatureRestrictedProcedure("estimates:read")
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(estimates.id, input), eq(estimates.organizationId, orgId)) : eq(estimates.id, input);
      const result = await db
        .select({
          id: estimates.id,
          estimateNumber: estimates.estimateNumber,
          clientId: estimates.clientId,
          title: estimates.title,
          status: estimates.status,
          issueDate: estimates.issueDate,
          expiryDate: estimates.expiryDate,
          subtotal: estimates.subtotal,
          taxAmount: estimates.taxAmount,
          discountAmount: estimates.discountAmount,
          total: estimates.total,
          notes: estimates.notes,
          terms: estimates.terms,
          createdBy: estimates.createdBy,
          createdAt: estimates.createdAt,
          updatedAt: estimates.updatedAt,
        })
        .from(estimates)
        .where(where)
        .limit(1);
      return result[0] || null;
    }),

  // Get estimate with all line items
  getWithItems: createFeatureRestrictedProcedure("estimates:read")
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(estimates.id, input), eq(estimates.organizationId, orgId)) : eq(estimates.id, input);
      
      const estimate = await db
        .select({
          id: estimates.id,
          estimateNumber: estimates.estimateNumber,
          clientId: estimates.clientId,
          title: estimates.title,
          status: estimates.status,
          issueDate: estimates.issueDate,
          expiryDate: estimates.expiryDate,
          subtotal: estimates.subtotal,
          taxAmount: estimates.taxAmount,
          discountAmount: estimates.discountAmount,
          total: estimates.total,
          notes: estimates.notes,
          terms: estimates.terms,
          createdBy: estimates.createdBy,
          createdAt: estimates.createdAt,
          updatedAt: estimates.updatedAt,
        })
        .from(estimates)
        .where(where)
        .limit(1);
      if (!estimate[0]) return null;

      const items = await db.select().from(estimateItems).where(eq(estimateItems.estimateId, input));
      
      return {
        ...estimate[0],
        lineItems: items,
      };
    }),

  byClient: createFeatureRestrictedProcedure("estimates:read")
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(estimates.clientId, input.clientId), eq(estimates.organizationId, orgId)) : eq(estimates.clientId, input.clientId);
      const result = await db
        .select({
          id: estimates.id,
          estimateNumber: estimates.estimateNumber,
          clientId: estimates.clientId,
          title: estimates.title,
          status: estimates.status,
          issueDate: estimates.issueDate,
          expiryDate: estimates.expiryDate,
          subtotal: estimates.subtotal,
          taxAmount: estimates.taxAmount,
          discountAmount: estimates.discountAmount,
          total: estimates.total,
          notes: estimates.notes,
          terms: estimates.terms,
          createdBy: estimates.createdBy,
          createdAt: estimates.createdAt,
          updatedAt: estimates.updatedAt,
        })
        .from(estimates)
        .where(where);
      return result;
    }),

  create: createFeatureRestrictedProcedure("estimates:create")
    .input(z.object({
      estimateNumber: z.string().optional(),
      clientId: z.string(),
      title: z.string().optional(),
      status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
      issueDate: z.date(),
      expiryDate: z.date().optional(),
      subtotal: z.number(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      total: z.number(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Auto-generate estimate number if not provided
      let estimateNumber = input.estimateNumber;
      if (!estimateNumber) {
        estimateNumber = await generateNextEstimateNumber(db);
      }

      const id = uuidv4();
      const { lineItems, ...estimateData } = input;
      
      // Convert date fields to MySQL format (YYYY-MM-DD HH:MM:SS)
      const issueDate = estimateData.issueDate instanceof Date 
        ? estimateData.issueDate.toISOString().replace('T', ' ').substring(0, 19)
        : estimateData.issueDate;
      const expiryDate = estimateData.expiryDate instanceof Date 
        ? estimateData.expiryDate.toISOString().replace('T', ' ').substring(0, 19)
        : estimateData.expiryDate;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      await db.insert(estimates).values({
        id,
        organizationId: ctx.user.organizationId ?? null,
        estimateNumber,
        ...estimateData,
        issueDate,
        expiryDate,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      } as any);

      // Insert line items if provided
      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          const itemId = uuidv4();
          await db.insert(estimateItems).values({
            id: itemId,
            estimateId: id,
            itemType: item.itemType,
            itemId: item.itemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discountPercent: item.discountPercent,
            total: item.total,
          });
        }
      }

      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_created",
        entityType: "estimate",
        entityId: id,
        description: `Created estimate: ${estimateData.estimateNumber}`,
        createdAt: now,
      });

      return { id };
    }),

  update: createFeatureRestrictedProcedure("estimates:edit")
    .input(z.object({
      id: z.string(),
      estimateNumber: z.string().optional(),
      clientId: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
      issueDate: z.date().optional(),
      expiryDate: z.date().optional(),
      subtotal: z.number().optional(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      total: z.number().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, lineItems, ...data } = input;
      
      const updateData: any = {};
      Object.keys(data).forEach(key => {
        const value = data[key as keyof typeof data];
        if (value !== undefined) {
          // Convert date fields to MySQL format
          if ((key === 'issueDate' || key === 'expiryDate') && (value instanceof Date)) {
            updateData[key] = value.toISOString().replace('T', ' ').substring(0, 19);
          } else {
            updateData[key] = value;
          }
        }
      });
      updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      const orgId = ctx.user.organizationId;
      const updateWhere = orgId ? and(eq(estimates.id, id), eq(estimates.organizationId, orgId)) : eq(estimates.id, id);
      await db.update(estimates).set(updateData).where(updateWhere);

      // Update line items if provided
      if (lineItems !== undefined) {
        // Delete existing line items
        await db.delete(estimateItems).where(eq(estimateItems.estimateId, id));
        
        // Insert new line items
        if (lineItems.length > 0) {
          for (const item of lineItems) {
            const itemId = uuidv4();
            await db.insert(estimateItems).values({
              id: itemId,
              estimateId: id,
              itemType: item.itemType,
              itemId: item.itemId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discountPercent: item.discountPercent,
              total: item.total,
            });
          }
        }
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_updated",
        entityType: "estimate",
        entityId: id,
        description: `Updated estimate: ${input.estimateNumber}`,
        createdAt: now,
      });

      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("estimates:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Delete line items first
      await db.delete(estimateItems).where(eq(estimateItems.estimateId, input));
      
      // Delete estimate
      const orgId = ctx.user.organizationId;
      const deleteWhere = orgId ? and(eq(estimates.id, input), eq(estimates.organizationId, orgId)) : eq(estimates.id, input);
      await db.delete(estimates).where(deleteWhere);

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_deleted",
        entityType: "estimate",
        entityId: input,
        description: `Deleted estimate: ${input}`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Get line items for an estimate
  getLineItems: createFeatureRestrictedProcedure("estimates:read")
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select().from(estimateItems).where(eq(estimateItems.estimateId, input));
      return result;
    }),

  // Add line item to estimate
  addLineItem: createFeatureRestrictedProcedure("estimates:create")
    .input(z.object({
      estimateId: z.string(),
      itemType: z.enum(['product', 'service', 'custom']),
      itemId: z.string().optional(),
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      taxRate: z.number().nonnegative().default(0),
      discountPercent: z.number().nonnegative().default(0),
      total: z.number().nonnegative(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const id = uuidv4();
      const { estimateId, ...itemData } = input;
      
      await db.insert(estimateItems).values({
        id,
        estimateId,
        ...itemData,
      });

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_item_added",
        entityType: "estimateItem",
        entityId: id,
        description: `Added line item to estimate: ${estimateId}`,
        createdAt: now,
      });

      return { id };
    }),

  // Update line item
  updateLineItem: createFeatureRestrictedProcedure("estimates:edit")
    .input(z.object({
      id: z.string(),
      estimateId: z.string(),
      itemType: z.enum(['product', 'service', 'custom']).optional(),
      itemId: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().positive().optional(),
      unitPrice: z.number().nonnegative().optional(),
      taxRate: z.number().nonnegative().optional(),
      discountPercent: z.number().nonnegative().optional(),
      total: z.number().nonnegative().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, estimateId, ...data } = input;
      
      await db.update(estimateItems).set(data).where(eq(estimateItems.id, id));

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_item_updated",
        entityType: "estimateItem",
        entityId: id,
        description: `Updated line item in estimate: ${estimateId}`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Delete line item
  deleteLineItem: createFeatureRestrictedProcedure("estimates:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(estimateItems).where(eq(estimateItems.id, input));

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_item_deleted",
        entityType: "estimateItem",
        entityId: input,
        description: `Deleted line item: ${input}`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Submit estimate for approval
  submitForApproval: createFeatureRestrictedProcedure("estimates:submit_for_approval")
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the estimate
      const estimate = await db.select().from(estimates).where(eq(estimates.id, input.id)).limit(1);
      if (!estimate.length) throw new Error("Estimate not found");
      
      // Update estimate status to "sent" (submitted for approval)
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.update(estimates).set({
        status: "sent",
        updatedAt: now,
      } as any).where(eq(estimates.id, input.id));

      // Create an approval record - NOTE: approvals table will be created when approval workflow is implemented
      // const approvalId = uuidv4();
      // await db.insert(approvals).values({
      //   id: approvalId,
      //   type: "estimate",
      //   referenceId: input.id,
      //   referenceNo: estimate[0].estimateNumber,
      //   amount: estimate[0].total,
      //   requestedBy: ctx.user.id,
      //   requestedAt: now,
      //   status: "pending",
      //   priority: "medium",
      //   description: `Estimate ${estimate[0].estimateNumber} submitted for approval${input.notes ? ` - ${input.notes}` : ''}`,
      // } as any);

      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "estimate_submitted_for_approval",
        entityType: "estimate",
        entityId: input.id,
        description: `Submitted estimate for approval: ${estimate[0].estimateNumber}${input.notes ? ` (Notes: ${input.notes})` : ''}`,
        createdAt: now,
      });

      return { success: true, approvalId: uuidv4(), message: "Estimate submitted for approval" };
    }),
});

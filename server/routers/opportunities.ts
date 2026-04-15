import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { opportunities } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { triggerEventNotification } from "./emailNotifications";

export const opportunitiesRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.user.organizationId;
      const query = orgId
        ? db.select().from(opportunities).where(eq(opportunities.organizationId, orgId))
        : db.select().from(opportunities);
      const rows = await (query as any).limit(input?.limit || 50).offset(input?.offset || 0);
      return rows.map((r: any) => ({
        ...r,
        // Back-compat aliases expected by frontend
        proposalNumber: (r as any).proposalNumber || r.id,
        amount: (r as any).value ?? (r as any).total ?? 0,
        validUntil: (r as any).expectedCloseDate || (r as any).expiryDate || null,
        status: (r as any).stage || (r as any).status,
      }));
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(opportunities.id, input), eq(opportunities.organizationId, orgId)) : eq(opportunities.id, input);
      const result = await db.select().from(opportunities).where(where).limit(1);
      const row = result[0] || null;
      if (!row) return null;
      return {
        ...row,
        proposalNumber: (row as any).proposalNumber || row.id,
        amount: (row as any).value ?? (row as any).total ?? 0,
        validUntil: (row as any).expectedCloseDate || (row as any).expiryDate || null,
        status: (row as any).stage || (row as any).status,
      };
    }),

  byClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(opportunities.clientId, input.clientId), eq(opportunities.organizationId, orgId)) : eq(opportunities.clientId, input.clientId);
      const result = await db.select().from(opportunities).where(where);
      return result;
    }),

  create: createFeatureRestrictedProcedure("opportunities:create")
    .input(z.object({
      // Accept frontend-friendly fields and map them to DB columns
      proposalNumber: z.string().optional(),
      clientId: z.string().optional().default(""),
      name: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      amount: z.number().optional(),
      value: z.number().optional(),
      validUntil: z.string().optional(),
      stage: z.enum(["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
      // Accept status for frontend compatibility and map to stage
      status: z.string().optional(),
      probability: z.number().optional(),
      expectedCloseDate: z.date().optional(),
      assignedTo: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      winReason: z.string().optional(),
      lossReason: z.string().optional(),
      actualCloseDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const id = uuidv4();
      const insertData: any = {
        ...input,
        // Support both `name` and `title` fields from different callers
        title: input.title || (input as any).name || "Untitled",
        clientId: input.clientId || "",
        // Map frontend-friendly fields to DB columns
        value: input.amount ?? input.value ?? 0,
        expectedCloseDate: input.expectedCloseDate ? input.expectedCloseDate.toISOString() : (input.validUntil || undefined),
        actualCloseDate: input.actualCloseDate ? input.actualCloseDate.toISOString() : undefined,
      };
      delete (insertData as any).name;

      if (input.status) {
        insertData.stage = input.status;
        delete insertData.status;
      }

      await db.insert(opportunities).values({
        id,
        organizationId: ctx.user.organizationId ?? null,
        ...insertData,
        createdBy: ctx.user.id,
      });

      // Email notification
      try {
        if (ctx.user.email) {
          const title = insertData.title || "Untitled";
          await triggerEventNotification({
            userId: ctx.user.id,
            eventType: "opportunity_created",
            recipientEmail: ctx.user.email,
            recipientName: ctx.user.name,
            subject: `New Opportunity: ${title}`,
            htmlContent: `<h2>New Opportunity Created</h2><p>Opportunity <strong>${title}</strong> has been created.</p>${insertData.value ? `<p><strong>Value:</strong> KES ${insertData.value.toLocaleString()}</p>` : ''}<p><a href="/opportunities/${id}">View Opportunity</a></p>`,
            entityType: "opportunity",
            entityId: id,
            actionUrl: `/opportunities/${id}`,
          });
        }
      } catch (notifError) {
        console.error("[Opportunities] Failed to send email notification:", notifError);
      }

      return { id };
    }),

  update: createFeatureRestrictedProcedure("opportunities:edit")
    .input(z.object({
      id: z.string(),
      proposalNumber: z.string().optional(),
      clientId: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      // Accept frontend-friendly fields
      amount: z.number().optional(),
      value: z.number().optional(),
      validUntil: z.string().optional(),
      // Accept frontend `status` (maps to stage)
      status: z.string().optional(),
      stage: z.enum(["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
      probability: z.number().optional(),
      expectedCloseDate: z.date().optional(),
      actualCloseDate: z.date().optional(),
      assignedTo: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const existing = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
      const oldStage = existing[0]?.stage;
      const updateData: any = {
        ...data,
        // Map frontend-friendly fields
        value: (data as any).amount ?? (data as any).value,
        expectedCloseDate: (data as any).expectedCloseDate ? (data as any).expectedCloseDate.toISOString() : (data as any).validUntil || undefined,
        actualCloseDate: (data as any).actualCloseDate ? (data as any).actualCloseDate.toISOString() : undefined,
      };

      if ((data as any).status !== undefined) {
        updateData.stage = (data as any).status;
        delete updateData.status;
      }

      if ((data as any).proposalNumber !== undefined) updateData.proposalNumber = (data as any).proposalNumber;

      // Remove frontend-only keys to avoid DB errors
      delete updateData.amount;
      delete updateData.validUntil;

      const orgId = ctx.user.organizationId;
      const updateWhere = orgId ? and(eq(opportunities.id, id), eq(opportunities.organizationId, orgId)) : eq(opportunities.id, id);
      await db.update(opportunities).set(updateData).where(updateWhere);

      // If stage changed, trigger workflows
      const newStage = updateData.stage;
      if (newStage && oldStage !== newStage) {
        try {
          await (await import('../workflows/triggerEngine')).workflowTriggerEngine.trigger({
            triggerType: 'opportunity_moved',
            entityType: 'opportunity',
            entityId: id,
            data: { oldStage, newStage },
            userId: ctx.user?.id,
          });
        } catch (err) {
          console.error('Workflow trigger (opportunity_moved) failed:', err);
        }
      }

      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("opportunities:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const orgId = ctx.user.organizationId;
      const deleteWhere = orgId ? and(eq(opportunities.id, input), eq(opportunities.organizationId, orgId)) : eq(opportunities.id, input);
      await db.delete(opportunities).where(deleteWhere);
      return { success: true };
    }),

  byStage: protectedProcedure
    .input(z.object({ stage: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(opportunities.stage, input.stage as any), eq(opportunities.organizationId, orgId)) : eq(opportunities.stage, input.stage as any);
      const result = await db.select().from(opportunities).where(where);
      return result;
    }),
});


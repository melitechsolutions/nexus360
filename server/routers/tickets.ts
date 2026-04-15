import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import { tickets, ticketComments, ticketTasks } from "../../drizzle/schema-extended";
import { eq, and } from "drizzle-orm";

// Feature-based procedures
const readProcedure = createFeatureRestrictedProcedure("tickets:read");
const createProcedure = createFeatureRestrictedProcedure("tickets:create");
const updateProcedure = createFeatureRestrictedProcedure("tickets:edit");
const deleteProcedure = createFeatureRestrictedProcedure("tickets:delete");

export const ticketsRouter = router({
  list: readProcedure
    .input(z.object({ clientId: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.user.organizationId || "";
      const filters: any[] = [eq(tickets.organizationId, orgId)];
      if (input?.clientId) filters.push(eq(tickets.clientId, input.clientId));
      if (input?.status) filters.push(eq(tickets.status, input.status as any));
      const where = filters.length === 1 ? filters[0] : and(...filters);
      return await db.select().from(tickets).where(where).limit(input?.limit || 100).offset(input?.offset || 0);
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = ctx.user.organizationId || "";
      const where = and(eq(tickets.id, input), eq(tickets.organizationId, orgId));
      const rows = await db.select().from(tickets).where(where).limit(1);
      if (rows.length === 0) return null;
      const ticket = rows[0];
      const comments = await db.select().from(ticketComments).where(eq(ticketComments.ticketId, input));
      const tasks = await db.select().from(ticketTasks).where(eq(ticketTasks.ticketId, input));
      return { ...ticket, comments, tasks };
    }),

  create: createProcedure
    .input(
      z.object({
        clientId: z.string(),
        title: z.string().min(3),
        description: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        requestedDueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const id = uuidv4();
      await db.insert(tickets).values({
        id,
        clientId: input.clientId,
        title: input.title,
        description: input.description || null,
        category: input.category || null,
        priority: input.priority || "medium",
        status: "new",
        requestedDueDate: input.requestedDueDate || null,
        createdBy: ctx.user.id,
        organizationId: ctx.user.organizationId ?? null,
      } as any);
      return { id };
    }),

  update: updateProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.string().optional(),
        assignedTo: z.string().optional(),
        requestedDueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const orgId = ctx.user.organizationId;
      const ownerCheck = orgId ? and(eq(tickets.id, input.id), eq(tickets.organizationId, orgId)) : eq(tickets.id, input.id);
      const existing = await db.select().from(tickets).where(ownerCheck).limit(1);
      if (!existing.length) throw new Error("Ticket not found");
      const upd: any = { updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) };
      if (input.title !== undefined) upd.title = input.title;
      if (input.description !== undefined) upd.description = input.description;
      if (input.category !== undefined) upd.category = input.category;
      if (input.priority !== undefined) upd.priority = input.priority;
      if (input.status !== undefined) upd.status = input.status;
      if (input.assignedTo !== undefined) upd.assignedTo = input.assignedTo;
      if (input.requestedDueDate !== undefined) upd.requestedDueDate = input.requestedDueDate;
      await db.update(tickets).set(upd).where(eq(tickets.id, input.id));
      return { success: true };
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(tickets.id, input), eq(tickets.organizationId, orgId)) : eq(tickets.id, input);
      await db.delete(tickets).where(where);
      return { success: true };
    }),

  addComment: createProcedure
    .input(z.object({ ticketId: z.string(), body: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const id = uuidv4();
      await db.insert(ticketComments).values({ id, ticketId: input.ticketId, authorId: ctx.user.id, body: input.body } as any);
      return { id };
    }),

  createTask: createProcedure
    .input(
      z.object({ ticketId: z.string(), serviceType: z.string(), details: z.string().optional(), budget: z.number().optional(), dueDate: z.string().optional() })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const id = uuidv4();
      await db.insert(ticketTasks).values({
        id,
        ticketId: input.ticketId,
        serviceType: input.serviceType,
        details: input.details || null,
        budget: input.budget || null,
        dueDate: input.dueDate || null,
      } as any);
      return { id };
    }),
});

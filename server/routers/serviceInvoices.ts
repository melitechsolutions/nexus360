import { router } from "../_core/trpc";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { getDb } from "../db";
import { serviceInvoices, serviceInvoiceItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const viewProcedure = createFeatureRestrictedProcedure("accounting:service-invoices:view");
const createProcedure = createFeatureRestrictedProcedure("accounting:service-invoices:create");
const editProcedure = createFeatureRestrictedProcedure("accounting:service-invoices:edit");
const deleteProcedure = createFeatureRestrictedProcedure("accounting:service-invoices:delete");

const serviceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

const createServiceInvoiceSchema = z.object({
  serviceInvoiceNumber: z.string(),
  issueDate: z.date(),
  dueDate: z.date(),
  clientId: z.string(),
  clientName: z.string(),
  serviceDescription: z.string(),
  serviceItems: z.array(serviceItemSchema),
  total: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "paid", "cancelled"]).default("draft"),
});

export const serviceInvoicesRouter = router({
  list: viewProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const orgId = ctx.user?.organizationId;
      const records = orgId
        ? await db.select().from(serviceInvoices).where(eq(serviceInvoices.organizationId, orgId))
        : await db.select().from(serviceInvoices);
      return records || [];
    } catch (error) {
      console.error("Error listing service invoices:", error);
      throw new Error("Failed to list service invoices");
    }
  }),

  get: viewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const orgId = ctx.user?.organizationId;
        const whereClause = orgId
          ? and(eq(serviceInvoices.id, input.id), eq(serviceInvoices.organizationId, orgId))
          : eq(serviceInvoices.id, input.id);
        const records = await db.select().from(serviceInvoices).where(whereClause).limit(1);
        const record = records[0] || null;
        if (!record) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Service invoice not found" });
        }
        const items = await db.select().from(serviceInvoiceItems).where(eq(serviceInvoiceItems.serviceInvoiceId, input.id));
        return record ? { ...record, serviceItems: items } : null;
      } catch (error) {
        console.error("Error fetching service invoice:", error);
        throw new Error("Failed to fetch service invoice");
      }
    }),

  create: createProcedure
    .input(createServiceInvoiceSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const id = uuidv4();
        
        await db.insert(serviceInvoices).values({
          id,
          organizationId: ctx.user?.organizationId || null,
          serviceInvoiceNumber: input.serviceInvoiceNumber,
          issueDate: new Date(input.issueDate).toISOString().replace('T', ' ').substring(0, 19),
          dueDate: new Date(input.dueDate).toISOString().replace('T', ' ').substring(0, 19),
          clientId: input.clientId,
          clientName: input.clientName,
          serviceDescription: input.serviceDescription,
          total: Math.round(input.total * 100),
          taxAmount: input.taxAmount ? Math.round(input.taxAmount * 100) : 0,
          notes: input.notes || null,
          status: input.status,
          createdBy: ctx.user?.id || "",
        });

        // Insert service items
        if (input.serviceItems && input.serviceItems.length > 0) {
          await Promise.all(
            input.serviceItems.map((item) =>
              db.insert(serviceInvoiceItems).values({
                id: uuidv4(),
                serviceInvoiceId: id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: Math.round(item.unitPrice * 100),
                total: Math.round(item.total * 100),
              })
            )
          );
        }

        const createdRows = await db.select().from(serviceInvoices).where(eq(serviceInvoices.id, id)).limit(1);
        const created = createdRows[0] || null;

        return created || { id, ...input, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19), createdBy: ctx.user?.id };
      } catch (error) {
        console.error("Error creating service invoice:", error);
        throw new Error("Failed to create service invoice");
      }
    }),

  update: editProcedure
    .input(z.object({ id: z.string(), ...createServiceInvoiceSchema.shape }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const { id, serviceItems, ...rest } = input;
        const orgId = ctx.user?.organizationId;
        const whereClause = orgId
          ? and(eq(serviceInvoices.id, id), eq(serviceInvoices.organizationId, orgId))
          : eq(serviceInvoices.id, id);

        const existing = await db.select().from(serviceInvoices).where(whereClause).limit(1);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Service invoice not found" });
        }

        await db.update(serviceInvoices).set({
          ...rest,
          issueDate: new Date(rest.issueDate).toISOString().replace('T', ' ').substring(0, 19),
          dueDate: new Date(rest.dueDate).toISOString().replace('T', ' ').substring(0, 19),
          total: Math.round(rest.total * 100),
          taxAmount: rest.taxAmount ? Math.round(rest.taxAmount * 100) : 0,
        }).where(whereClause);

        // Delete old items and insert new ones
        await db.delete(serviceInvoiceItems).where(eq(serviceInvoiceItems.serviceInvoiceId, id));
        
        if (serviceItems && serviceItems.length > 0) {
          await Promise.all(
            serviceItems.map((item) =>
              db.insert(serviceInvoiceItems).values({
                id: uuidv4(),
                serviceInvoiceId: id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: Math.round(item.unitPrice * 100),
                total: Math.round(item.total * 100),
              })
            )
          );
        }

        const updatedRows = await db.select().from(serviceInvoices).where(eq(serviceInvoices.id, id)).limit(1);
        const updated = updatedRows[0] || null;

        return updated || { id, ...rest };
      } catch (error) {
        console.error("Error updating service invoice:", error);
        throw new Error("Failed to update service invoice");
      }
    }),

  delete: deleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const orgId = ctx.user?.organizationId;
        const whereClause = orgId
          ? and(eq(serviceInvoices.id, input.id), eq(serviceInvoices.organizationId, orgId))
          : eq(serviceInvoices.id, input.id);

        const existing = await db.select().from(serviceInvoices).where(whereClause).limit(1);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Service invoice not found" });
        }

        // Delete items first
        await db.delete(serviceInvoiceItems).where(eq(serviceInvoiceItems.serviceInvoiceId, input.id));
        
        // Delete service invoice
        await db.delete(serviceInvoices).where(whereClause);

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Error deleting service invoice:", error);
        throw new Error("Failed to delete service invoice");
      }
    }),
});

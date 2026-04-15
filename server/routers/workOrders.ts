import { router } from "../_core/trpc";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { getDb } from "../db";
import { workOrders, workOrderMaterials } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

const viewProcedure = createFeatureRestrictedProcedure("operations:work-orders:view");
const createProcedure = createFeatureRestrictedProcedure("operations:work-orders:create");
const editProcedure = createFeatureRestrictedProcedure("operations:work-orders:edit");
const deleteProcedure = createFeatureRestrictedProcedure("operations:work-orders:delete");

const materialSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

const createWorkOrderSchema = z.object({
  workOrderNumber: z.string(),
  issueDate: z.date(),
  description: z.string(),
  assignedTo: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  startDate: z.date(),
  targetEndDate: z.date(),
  materials: z.array(materialSchema).optional(),
  laborCost: z.number().nonnegative().default(0),
  serviceCost: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  status: z.enum(["draft", "open", "in-progress", "completed", "cancelled"]).default("draft"),
});

export const workOrdersRouter = router({
  list: viewProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const orgId = ctx.user.organizationId;
      const records = await db.select().from(workOrders)
        .where(orgId ? eq(workOrders.organizationId, orgId) : undefined)
        .orderBy(desc(workOrders.createdAt));
      return records || [];
    } catch (error) {
      console.error("Error listing work orders:", error);
      throw new Error("Failed to list work orders");
    }
  }),

  get: viewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const records = await db.select().from(workOrders).where(eq(workOrders.id, input.id)).limit(1);
        const record = records[0] || null;
        const materials = await db.select().from(workOrderMaterials).where(eq(workOrderMaterials.workOrderId, input.id));
        return record ? { ...record, materials } : null;
      } catch (error) {
        console.error("Error fetching work order:", error);
        throw new Error("Failed to fetch work order");
      }
    }),

  create: createProcedure
    .input(createWorkOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const id = uuidv4();
        const newRecord = await db.insert(workOrders).values({
          id,
          workOrderNumber: input.workOrderNumber,
          issueDate: new Date(input.issueDate).toISOString().replace('T', ' ').substring(0, 19),
          description: input.description,
          assignedTo: input.assignedTo,
          priority: input.priority,
          startDate: new Date(input.startDate).toISOString().replace('T', ' ').substring(0, 19),
          targetEndDate: new Date(input.targetEndDate).toISOString(),
          laborCost: Math.round(input.laborCost * 100),
          serviceCost: Math.round(input.serviceCost * 100),
          total: Math.round(input.total * 100),
          notes: input.notes || null,
          status: input.status,
          createdBy: ctx.user?.id || "",
          organizationId: ctx.user?.organizationId ?? null,
        });

        // Insert materials if provided
        if (input.materials && input.materials.length > 0) {
          await Promise.all(
            input.materials.map((material) =>
              db.insert(workOrderMaterials).values({
                id: uuidv4(),
                workOrderId: id,
                description: material.description,
                quantity: material.quantity,
                unitCost: Math.round(material.unitCost * 100),
                total: Math.round(material.total * 100),
              })
            )
          );
        }

        const createdRows = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);

        return createdRows[0] || { id, ...input, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19), createdBy: ctx.user?.id };
      } catch (error) {
        console.error("Error creating work order:", error);
        throw new Error("Failed to create work order");
      }
    }),

  update: editProcedure
    .input(z.object({ id: z.string(), ...createWorkOrderSchema.shape }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const { id, materials, ...rest } = input;

        await db.update(workOrders).set({
          ...rest,
          issueDate: new Date(rest.issueDate).toISOString().replace('T', ' ').substring(0, 19),
          startDate: new Date(rest.startDate).toISOString().replace('T', ' ').substring(0, 19),
          targetEndDate: new Date(rest.targetEndDate).toISOString().replace('T', ' ').substring(0, 19),
          laborCost: Math.round(rest.laborCost * 100),
          serviceCost: Math.round(rest.serviceCost * 100),
          total: Math.round(rest.total * 100),
        }).where(eq(workOrders.id, id));

        // Delete old materials and insert new ones
        if (materials && materials.length > 0) {
          await db.delete(workOrderMaterials).where(eq(workOrderMaterials.workOrderId, id));
          await Promise.all(
            materials.map((material) =>
              db.insert(workOrderMaterials).values({
                id: uuidv4(),
                workOrderId: id,
                description: material.description,
                quantity: material.quantity,
                unitCost: Math.round(material.unitCost * 100),
                total: Math.round(material.total * 100),
              })
            )
          );
        }

        const updatedRows = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);

        return updatedRows[0] || { id, ...rest };
      } catch (error) {
        console.error("Error updating work order:", error);
        throw new Error("Failed to update work order");
      }
    }),

  delete: deleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        // Delete materials first
        await db.delete(workOrderMaterials).where(eq(workOrderMaterials.workOrderId, input.id));
        
        // Delete work order
        await db.delete(workOrders).where(eq(workOrders.id, input.id));

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Error deleting work order:", error);
        throw new Error("Failed to delete work order");
      }
    }),

  updateStatus: editProcedure
    .input(z.object({ id: z.string(), status: z.enum(["draft", "open", "in-progress", "completed", "cancelled"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        await db.update(workOrders).set({ status: input.status }).where(eq(workOrders.id, input.id));

        return { success: true, id: input.id, status: input.status };
      } catch (error) {
        console.error("Error updating work order status:", error);
        throw new Error("Failed to update status");
      }
    }),
});

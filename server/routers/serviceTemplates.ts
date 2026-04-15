import { router, createFeatureRestrictedProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { services } from "../../drizzle/schema";
import { serviceTemplates, serviceUsageTracking } from "../../drizzle/schema-extended";
import { eq, desc, and, like, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

// Define typed procedures
const readProcedure = createFeatureRestrictedProcedure("services:read");
const createProcedure = createFeatureRestrictedProcedure("services:create");
const updateProcedure = createFeatureRestrictedProcedure("services:update");
const deleteProcedure = createFeatureRestrictedProcedure("services:delete");

export const serviceTemplatesRouter = router({
  // List all service templates
  list: readProcedure
    .input(z.object({ 
      limit: z.number().optional(), 
      offset: z.number().optional(),
      category: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];

      const orgId = ctx.user?.organizationId;
      const baseConditions = orgId
        ? [eq(serviceTemplates.isActive, true), eq(serviceTemplates.organizationId, orgId)]
        : [eq(serviceTemplates.isActive, true)];

      let query = database
        .select()
        .from(serviceTemplates)
        .where(and(...baseConditions));

      if (input?.category) {
        query = database
          .select()
          .from(serviceTemplates)
          .where(and(
            ...baseConditions,
            eq(serviceTemplates.category, input.category)
          )) as any;
      }

      if (input?.search) {
        query = database
          .select()
          .from(serviceTemplates)
          .where(and(
            ...baseConditions,
            like(serviceTemplates.name, `%${input.search}%`)
          )) as any;
      }

      return await (query as any)
        .orderBy(desc(serviceTemplates.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);
    }),

  // Get single template by ID
  getById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const result = await database
        .select()
        .from(serviceTemplates)
        .where(eq(serviceTemplates.id, input))
        .limit(1);

      return result[0] || null;
    }),

  // Get usage statistics for a template
  getUsageStats: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const usages = await database
        .select()
        .from(serviceUsageTracking)
        .where(eq(serviceUsageTracking.serviceTemplateId, input));

      const template = await database
        .select()
        .from(serviceTemplates)
        .where(eq(serviceTemplates.id, input))
        .limit(1);

      if (!template[0]) return null;

      // Calculate statistics
      const totalUsages = usages.length;
      const totalQuantity = usages.reduce((sum, u) => sum + (u.quantity || 0), 0);
      const totalDuration = usages.reduce((sum, u) => sum + (u.duration || 0), 0);
      
      // Revenue calculation (estimate)
      const hourlyRate = template[0].hourlyRate || 0;
      const fixedPrice = template[0].fixedPrice || 0;
      const estimatedRevenue = 
        (totalDuration * hourlyRate) + (totalQuantity * fixedPrice);

      const statusBreakdown = usages.reduce((acc: Record<string, number>, u) => {
        acc[u.status] = (acc[u.status] || 0) + 1;
        return acc;
      }, {});

      return {
        template: template[0],
        totalUsages,
        totalQuantity,
        totalDuration,
        estimatedRevenue,
        statusBreakdown,
        lastUsed: usages.length > 0 
          ? new Date(Math.max(...usages.map(u => new Date(u.usageDate).getTime())))
          : null,
      };
    }),

  // Create new template
  create: createProcedure
    .input(z.object({
      name: z.string().min(1, "Name required"),
      description: z.string().optional(),
      category: z.string().optional(),
      hourlyRate: z.number().optional(),
      fixedPrice: z.number().optional(),
      unit: z.string().optional(),
      taxRate: z.number().optional(),
      estimatedDuration: z.number().optional(),
      deliverables: z.array(z.string()).optional(),
      terms: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const id = uuidv4();

      try {
        await database.insert(serviceTemplates).values({
          id,
          organizationId: ctx.user?.organizationId || null,
          name: input.name,
          description: input.description,
          category: input.category,
          hourlyRate: input.hourlyRate ? Math.round(input.hourlyRate * 100) : null,
          fixedPrice: input.fixedPrice ? Math.round(input.fixedPrice * 100) : null,
          unit: input.unit || "hour",
          taxRate: input.taxRate || 0,
          estimatedDuration: input.estimatedDuration,
          deliverables: input.deliverables ? JSON.stringify(input.deliverables) : null,
          terms: input.terms,
          isActive: true,
          createdBy: ctx.user.id,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          action: "service_template_created",
          entityType: "serviceTemplate",
          entityId: id,
          description: `Created service template: ${input.name}`,
        });

        return { id };
      } catch (error) {
        console.error("Error creating service template:", error);
        throw new Error("Failed to create service template");
      }
    }),

  // Update template
  update: updateProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      hourlyRate: z.number().optional(),
      fixedPrice: z.number().optional(),
      taxRate: z.number().optional(),
      estimatedDuration: z.number().optional(),
      deliverables: z.array(z.string()).optional(),
      terms: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const updates: any = {
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.category !== undefined) updates.category = input.category;
      if (input.hourlyRate !== undefined) updates.hourlyRate = input.hourlyRate ? Math.round(input.hourlyRate * 100) : null;
      if (input.fixedPrice !== undefined) updates.fixedPrice = input.fixedPrice ? Math.round(input.fixedPrice * 100) : null;
      if (input.taxRate !== undefined) updates.taxRate = input.taxRate;
      if (input.estimatedDuration !== undefined) updates.estimatedDuration = input.estimatedDuration;
      if (input.deliverables !== undefined) updates.deliverables = JSON.stringify(input.deliverables);
      if (input.terms !== undefined) updates.terms = input.terms;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      try {
        await database
          .update(serviceTemplates)
          .set(updates)
          .where(eq(serviceTemplates.id, input.id));

        await db.logActivity({
          userId: ctx.user.id,
          action: "service_template_updated",
          entityType: "serviceTemplate",
          entityId: input.id,
          description: "Updated service template",
        });

        return { success: true };
      } catch (error) {
        console.error("Error updating service template:", error);
        throw new Error("Failed to update service template");
      }
    }),

  // Delete (soft delete)
  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      try {
        await database
          .update(serviceTemplates)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(serviceTemplates.id, input));

        await db.logActivity({
          userId: ctx.user.id,
          action: "service_template_deleted",
          entityType: "serviceTemplate",
          entityId: input,
          description: "Deleted service template",
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting service template:", error);
        throw new Error("Failed to delete service template");
      }
    }),

  // Usage tracking
  trackUsage: createProcedure
    .input(z.object({
      serviceTemplateId: z.string(),
      invoiceId: z.string().optional(),
      estimateId: z.string().optional(),
      projectId: z.string().optional(),
      clientId: z.string(),
      quantity: z.number().default(1),
      duration: z.number().optional(),
      usageDate: z.string(),
      status: z.enum(["pending", "delivered", "invoiced", "paid", "cancelled"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const id = uuidv4();

      try {
        await database.insert(serviceUsageTracking).values({
          id,
          serviceTemplateId: input.serviceTemplateId,
          invoiceId: input.invoiceId,
          estimateId: input.estimateId,
          projectId: input.projectId,
          clientId: input.clientId,
          quantity: input.quantity,
          duration: input.duration,
          usageDate: new Date(input.usageDate),
          status: input.status,
          notes: input.notes,
          createdBy: ctx.user.id,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          action: "service_usage_tracked",
          entityType: "serviceUsage",
          entityId: id,
          description: "Tracked service usage",
        });

        return { id };
      } catch (error) {
        console.error("Error tracking service usage:", error);
        throw new Error("Failed to track service usage");
      }
    }),

  // Get usage history for a template
  getUsageHistory: readProcedure
    .input(z.object({
      serviceTemplateId: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      let query = database
        .select()
        .from(serviceUsageTracking)
        .where(eq(serviceUsageTracking.serviceTemplateId, input.serviceTemplateId));

      if (input.dateFrom) {
        query = database
          .select()
          .from(serviceUsageTracking)
          .where(and(
            eq(serviceUsageTracking.serviceTemplateId, input.serviceTemplateId),
            gte(serviceUsageTracking.usageDate, new Date(input.dateFrom))
          )) as any;
      }

      if (input.dateTo) {
        query = database
          .select()
          .from(serviceUsageTracking)
          .where(and(
            eq(serviceUsageTracking.serviceTemplateId, input.serviceTemplateId),
            lte(serviceUsageTracking.usageDate, new Date(input.dateTo))
          )) as any;
      }

      return await (query as any)
        .orderBy(desc(serviceUsageTracking.usageDate))
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);
    }),

  // Get templates by category
  getByCategory: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      return await database
        .select()
        .from(serviceTemplates)
        .where(and(
          eq(serviceTemplates.category, input),
          eq(serviceTemplates.isActive, true)
        ))
        .orderBy(desc(serviceTemplates.createdAt));
    }),

  // Get all unique categories
  getCategories: readProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];

    const templates = await database
      .select({ category: serviceTemplates.category })
      .from(serviceTemplates)
      .where(eq(serviceTemplates.isActive, true));

    const catSet = new Set(templates.map(t => t.category).filter(Boolean));
    const categories: string[] = [];
    catSet.forEach(c => categories.push(c as string));
    return categories.sort();
  }),

  // Bulk operations
  bulkDelete: createFeatureRestrictedProcedure("services:delete")
    .input(z.array(z.string()))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      let successCount = 0;
      const errors: string[] = [];

      try {
        for (const id of input) {
          try {
            await database
              .update(serviceTemplates)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(serviceTemplates.id, id));
            successCount++;
          } catch (error) {
            errors.push(`Failed to delete ${id}`);
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          action: "service_templates_bulk_deleted",
          entityType: "serviceTemplate",
          entityId: "bulk",
          description: `Bulk deleted ${successCount} service templates`,
        });

        return { success: true, successCount, errors };
      } catch (error) {
        throw new Error(`Bulk delete failed: ${(error as any).message}`);
      }
    }),
});

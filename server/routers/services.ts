import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { services } from "../../drizzle/schema";
import { eq, sql, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

export const servicesRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];

      const orgId = ctx.user.organizationId;
      let query: any;

      if (orgId && input?.category) {
        query = database.select().from(services).where(and(eq(services.organizationId, orgId), eq(services.category, input.category)));
      } else if (orgId) {
        query = database.select().from(services).where(eq(services.organizationId, orgId));
      } else if (input?.category) {
        query = database.select().from(services).where(eq(services.category, input.category));
      } else {
        query = database.select().from(services);
      }

      return await query.limit(input?.limit || 100).offset(input?.offset || 0);
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(services.id, input), eq(services.organizationId, orgId)) : eq(services.id, input);
      const result = await database.select().from(services).where(where).limit(1);
      return result[0] || null;
    }),

  create: createFeatureRestrictedProcedure("services:create")
    .input(z.object({
      serviceName: z.string().min(1).max(100).optional(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      serviceType: z.string().max(100).optional(),
      category: z.string().max(100).optional(),
      rate: z.number().positive().optional(),
      // Accept `hourlyRate` (in cents) from frontend for compatibility
      hourlyRate: z.number().optional(),
      unit: z.string().max(50).optional(),
      // Accept fixedPrice (in cents) from frontend
      fixedPrice: z.number().optional(),
      // Accept taxRate (as integer/percent*100) for compatibility
      taxRate: z.number().optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }).refine((v) => !!(v.serviceName || v.name), { message: 'serviceName or name is required' }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const svcName = input.serviceName || input.name || '';
      const svcType = input.serviceType || input.category || undefined;

      // Check for duplicate service name
      const existing = await database.select().from(services).where(eq(services.name, svcName)).limit(1);
      if (existing.length > 0) {
        throw new Error(`Service '${svcName}' already exists`);
      }

      const id = uuidv4();
      // Determine hourlyRate in cents: prefer provided `hourlyRate`, otherwise convert `rate` (float)
      const rateInCents = input.hourlyRate !== undefined ? input.hourlyRate : (input.rate ? Math.round(input.rate * 100) : 0);
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      await database.insert(services).values({
        id,
        organizationId: ctx.user.organizationId ?? null,
        name: svcName,
        description: input.description || '',
        category: svcType,
        hourlyRate: rateInCents,
        fixedPrice: input.fixedPrice !== undefined ? input.fixedPrice : null,
        unit: input.unit || 'hour',
        isActive: input.status === 'inactive' ? 0 : 1,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.user.id,
      } as any);

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "service_created",
        entityType: "service",
        entityId: id,
        description: `Created service: ${svcName}`,
      });

      return { id };
    }),

  // Get units for dropdown
  getUnits: protectedProcedure
    .query(async () => {
      return ['hour', 'day', 'week', 'month', 'project', 'unit', 'item', 'service'].sort();
    }),

  update: createFeatureRestrictedProcedure("services:edit")
    .input(z.object({
      id: z.string(),
      serviceName: z.string().min(1).max(100).optional(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      serviceType: z.string().max(100).optional(),
      rate: z.number().positive().optional(),
      // Accept taxRate for updates as well (stored as integer percent*100)
      taxRate: z.number().optional(),
      hourlyRate: z.number().optional(),
      fixedPrice: z.number().optional(),
      unit: z.string().max(50).optional(),
      status: z.enum(['active', 'inactive']).optional(),
      category: z.string().max(100).optional(),
    }).refine((v) => !!(v.serviceName || v.name) || Object.keys(v).some(k => ['description','serviceType','category','rate','unit','status'].includes(k)), { message: 'Either name/serviceName or other updatable fields required' }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const service = await database.select().from(services).where(eq(services.id, input.id)).limit(1);
      if (!service.length) throw new Error("Service not found");

      // Verify org ownership
      const orgId = ctx.user.organizationId;
      if (orgId && service[0].organizationId !== orgId) throw new Error("Service not found");

      const newName = input.serviceName || input.name;
      // Check for duplicate service name if changing it
      if (newName && newName !== service[0].name) {
        const existing = await database.select().from(services).where(eq(services.name, newName)).limit(1);
        if (existing.length > 0) {
          throw new Error(`Service '${newName}' already exists`);
        }
      }

      const updateData: any = {};
      if (newName) updateData.name = newName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.serviceType) updateData.category = input.serviceType;
      if (input.hourlyRate !== undefined) updateData.hourlyRate = input.hourlyRate;
      else if (input.rate) updateData.hourlyRate = Math.round(input.rate * 100);
      if (input.fixedPrice !== undefined) updateData.fixedPrice = input.fixedPrice;
      if (input.taxRate !== undefined) updateData.taxRate = input.taxRate;
      if (input.unit) updateData.unit = input.unit;
      if (input.status) updateData.isActive = input.status === 'inactive' ? 0 : 1;

      await database.update(services).set(updateData).where(eq(services.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "service_updated",
        entityType: "service",
        entityId: input.id,
        description: `Updated service: ${service[0].name}`,
      });

      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("services:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const service = await database.select().from(services).where(eq(services.id, input)).limit(1);
      if (!service.length) throw new Error("Service not found");

      // Verify org ownership
      const orgId = ctx.user.organizationId;
      if (orgId && service[0].organizationId !== orgId) throw new Error("Service not found");

      await database.delete(services).where(eq(services.id, input));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "service_deleted",
        entityType: "service",
        entityId: input,
        description: `Deleted service: ${service[0].name}`,
      });

      return { success: true };
    }),

  getByType: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];

      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(services.category, input), eq(services.organizationId, orgId)) : eq(services.category, input);
      return await database.select().from(services).where(where);
    }),

  getActive: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];

      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(services.isActive, 1), eq(services.organizationId, orgId)) : eq(services.isActive, 1);
      return await database.select().from(services).where(where);
    }),

  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return {
        totalServices: 0,
        activeServices: 0,
        avgRate: 0,
      };

      const orgId = ctx.user.organizationId;
      const allServices = orgId
        ? await database.select().from(services).where(eq(services.organizationId, orgId))
        : await database.select().from(services);

      const activeServices = allServices.filter(s => s.isActive === 1).length;
      const avgRate = allServices.length > 0 
        ? allServices.reduce((sum, s) => sum + ((s.hourlyRate || 0) / 100), 0) / allServices.length 
        : 0;

      return {
        totalServices: allServices.length,
        activeServices,
        avgRate,
      };
    }),

  bulkDelete: createFeatureRestrictedProcedure("services:delete")
    .input(z.array(z.string()).min(1))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        deleted: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const serviceId of input) {
        try {
          const service = await database.select().from(services).where(eq(services.id, serviceId)).limit(1);
          if (!service.length) {
            results.failed++;
            results.errors.push(`Service ${serviceId} not found`);
            continue;
          }

          await database.delete(services).where(eq(services.id, serviceId));
          results.deleted++;

          // Log activity
          await db.logActivity({
            userId: ctx.user.id,
            action: "service_deleted",
            entityType: "service",
            entityId: serviceId,
            description: `Bulk deleted service: ${service[0].name}`,
          });
        } catch (error) {
          results.failed++;
          results.errors.push(`Error deleting ${serviceId}: ${error}`);
        }
      }

      return results;
    }),

  // Get categories for dropdown
  getCategories: protectedProcedure
    .query(async () => {
      try {
        const database = await getDb();
        if (!database) return [];

        // Use a more efficient query - only select distinct categories
        const result = await database.selectDistinct({ category: services.category })
          .from(services)
          .where(sql`${services.category} IS NOT NULL AND ${services.category} != ''`)
          .orderBy(services.category);
        
        return result.map(r => r.category).filter(Boolean) as string[];
      } catch (error) {
        console.error("Error fetching service categories:", error);
        return [];
      }
    }),
});
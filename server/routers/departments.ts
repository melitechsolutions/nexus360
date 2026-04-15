import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { departments } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

export const departmentsRouter = router({
  list: createFeatureRestrictedProcedure("hr:departments:view")
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];

      const orgId = ctx.user.organizationId;
      const query = orgId
        ? database.select().from(departments).where(eq(departments.organizationId, orgId))
        : database.select().from(departments);
      const rows = await (query as any).limit(input?.limit || 100).offset(input?.offset || 0);
      return rows.map((r: any) => ({
        ...r,
        isActive: (r as any).isActive !== undefined ? (r as any).isActive : ((r as any).status !== 'inactive'),
      }));
    }),

  getById: createFeatureRestrictedProcedure("hr:departments:view")
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;
      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(departments.id, input), eq(departments.organizationId, orgId)) : eq(departments.id, input);
      const result = await database.select().from(departments).where(where).limit(1);
      const row = result[0] || null;
      if (!row) return null;
      return {
        ...row,
        isActive: (row as any).isActive !== undefined ? (row as any).isActive : (row.status !== 'inactive'),
      };
    }),

  create: createFeatureRestrictedProcedure("hr:departments:create")
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      departmentName: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      headId: z.string().optional(),
      budget: z.number().nonnegative().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const deptName = (input.name || (input as any).departmentName) as string;
      if (!deptName) throw new Error('Department name is required');

      // Check for duplicate department name
      const existing = await database.select().from(departments).where(eq(departments.name, deptName)).limit(1);
      if (existing.length > 0) {
        throw new Error(`Department '${deptName}' already exists`);
      }

      const id = uuidv4();
      await database.insert(departments).values({
        id,
        organizationId: ctx.user.organizationId ?? null,
        name: deptName,
        description: input.description || '',
        headId: input.headId,
        budget: input.budget || 0,
        status: input.isActive === false ? 'inactive' : 'active',
        createdBy: ctx.user.id,
      } as any);

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "department_created",
        entityType: "department",
        entityId: id,
        description: `Created department: ${deptName}`,
      });

      return { id };
    }),

  update: createFeatureRestrictedProcedure("hr:departments:edit")
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      headId: z.string().optional(),
      budget: z.number().nonnegative().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const department = await database.select().from(departments).where(eq(departments.id, input.id)).limit(1);
      if (!department.length) throw new Error("Department not found");

      // Verify org ownership
      const orgId = ctx.user.organizationId;
      if (orgId && department[0].organizationId !== orgId) throw new Error("Department not found");

      // Check for duplicate department name if changing it
      if (input.name && input.name !== department[0].name) {
        const existing = await database.select().from(departments).where(eq(departments.name, input.name)).limit(1);
        if (existing.length > 0) {
          throw new Error(`Department '${input.name}' already exists`);
        }
      }

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.headId !== undefined) updateData.headId = input.headId;
      if (input.budget !== undefined) updateData.budget = input.budget;
      if (input.isActive !== undefined) updateData.status = input.isActive ? 'active' : 'inactive';

      await database.update(departments).set(updateData).where(eq(departments.id, input.id));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "department_updated",
        entityType: "department",
        entityId: input.id,
        description: `Updated department: ${department[0].name}`,
      });

      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("hr:departments:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const department = await database.select().from(departments).where(eq(departments.id, input)).limit(1);
      if (!department.length) throw new Error("Department not found");

      // Verify org ownership
      const orgId = ctx.user.organizationId;
      if (orgId && department[0].organizationId !== orgId) throw new Error("Department not found");

      await database.delete(departments).where(eq(departments.id, input));

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "department_deleted",
        entityType: "department",
        entityId: input,
        description: `Deleted department: ${department[0].name}`,
      });

      return { success: true };
    }),

  getActive: createFeatureRestrictedProcedure("hr:departments:view")
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];

      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(departments.status, 'active'), eq(departments.organizationId, orgId)) : eq(departments.status, 'active');
      const rows = await database.select().from(departments).where(where);
      return rows.map((r: any) => ({
        ...r,
        isActive: true,
      }));
    }),

  getSummary: createFeatureRestrictedProcedure("hr:departments:view")
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return {
        totalDepartments: 0,
        activeDepartments: 0,
        totalBudget: 0,
      };

      const orgId = ctx.user.organizationId;
      const allDepartments = orgId
        ? await database.select().from(departments).where(eq(departments.organizationId, orgId))
        : await database.select().from(departments);

      const activeDepartments = allDepartments.filter(d => d.status === 'active').length;
      const totalBudget = allDepartments.reduce((sum, d) => sum + (d.budget || 0), 0);

      return {
        totalDepartments: allDepartments.length,
        activeDepartments,
        totalBudget,
      };
    }),

  bulkDelete: createFeatureRestrictedProcedure("hr:departments:delete")
    .input(z.array(z.string()).min(1))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        deleted: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const departmentId of input) {
        try {
          const department = await database.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
          if (!department.length) {
            results.failed++;
            results.errors.push(`Department ${departmentId} not found`);
            continue;
          }

          await database.delete(departments).where(eq(departments.id, departmentId));
          results.deleted++;

          // Log activity
          await db.logActivity({
            userId: ctx.user.id,
            action: "department_deleted",
            entityType: "department",
            entityId: departmentId,
            description: `Bulk deleted department: ${department[0].name}`,
          });
        } catch (error) {
          results.failed++;
          results.errors.push(`Error deleting ${departmentId}: ${error}`);
        }
      }

      return results;
    }),
});

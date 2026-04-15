import { router, createFeatureRestrictedProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { userRoles, users, customRoles, departments } from "../../drizzle/schema";
import { eq, sql, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { FEATURE_ACCESS, ROLE_PERMISSIONS } from "../middleware/enhancedRbac";
import { enforceOrganizationIsolation, combineOrgFilters, validateOwnership } from "../middleware/organizationIsolationEnforcer";

export const rolesRouter = router({
  // List system roles (from userRoles table) + custom roles for the user's org
  list: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];

    // Get system roles from userRoles table
    const systemRoles = await db.getRoles();
    const normalizedSystem = (systemRoles || []).map((r: any) => ({
      id: r.id,
      name: r.role || r.roleName || r.name || r.displayName || '',
      displayName: r.roleName || r.displayName || r.name || r.role || '',
      description: r.description || '',
      permissions: r.permissions || [],
      isSystem: true,
      isCustom: false,
      isAdvanced: false,
      baseRole: null,
      createdAt: r.createdAt || r.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: r.updatedAt || r.updated_at || null,
    }));

    // Get custom roles scoped to the user's organization
    const orgFilter = enforceOrganizationIsolation(ctx.user, customRoles.organizationId, false);
    const whereClause = orgFilter ? and(orgFilter, eq(customRoles.isActive, 1)) : eq(customRoles.isActive, 1);
    const orgCustomRoles = await database.select().from(customRoles).where(whereClause);
    
    const normalizedCustom = orgCustomRoles.map((r: any) => {
      let perms: string[] = [];
      try { perms = r.permissions ? JSON.parse(r.permissions) : []; } catch {}
      return {
        id: r.id,
        name: r.name,
        displayName: r.displayName,
        description: r.description || '',
        permissions: perms,
        isSystem: !!r.isSystem,
        isCustom: true,
        isAdvanced: !!r.isAdvanced,
        baseRole: r.baseRole,
        createdAt: r.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: r.updatedAt || null,
      };
    });

    return [...normalizedSystem, ...normalizedCustom];
  }),

  getPermissions: protectedProcedure.query(async () => {
    return await db.getPermissions();
  }),

  // Get all available permission features from FEATURE_ACCESS for the custom role UI
  getAvailableFeatures: protectedProcedure.query(async () => {
    const features: { key: string; label: string; category: string; isAdvanced: boolean }[] = [];
    const advancedActions = ['delete', 'approve', 'reject', 'reconcile', 'refund', 'manage', 'export'];

    for (const [feature] of Object.entries(FEATURE_ACCESS)) {
      const parts = feature.split(':');
      const category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const action = parts.slice(1).join(':');
      const isAdvanced = advancedActions.some(a => action.includes(a));
      features.push({
        key: feature,
        label: `${category}: ${action.replace(/_/g, ' ').replace(/:/g, ' > ')}`,
        category,
        isAdvanced,
      });
    }
    return features;
  }),

  getUserCounts: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return {};

    // If org-scoped, only count users in this org
    const orgId = ctx.user.organizationId;
    const results = orgId
      ? await database.select({ role: users.role, count: sql<number>`count(*)` })
          .from(users).where(eq(users.organizationId, orgId)).groupBy(users.role)
      : await database.select({ role: users.role, count: sql<number>`count(*)` })
          .from(users).groupBy(users.role);
    
    const counts: Record<string, number> = {};
    results.forEach(r => { if (r.role) counts[r.role] = Number(r.count); });
    return counts;
  }),

  // Create a custom role for the user's organization
  createCustomRole: createFeatureRestrictedProcedure("settings:roles")
    .input(z.object({
      name: z.string().min(1).max(100),
      displayName: z.string().min(1).max(255),
      description: z.string().optional(),
      permissions: z.array(z.string()),
      baseRole: z.enum(['user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager']).default('staff'),
      isAdvanced: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const orgId = ctx.user.organizationId;
      if (!orgId) {
        // Global admins can create org-less custom roles (platform level)
        if (ctx.user.role !== 'super_admin') {
          throw new Error('Organization context required to create custom roles');
        }
      }

      const id = uuidv4();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      await database.insert(customRoles).values({
        id,
        organizationId: orgId || null,
        name: input.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: input.displayName,
        description: input.description || null,
        permissions: JSON.stringify(input.permissions),
        baseRole: input.baseRole,
        isAdvanced: input.isAdvanced ? 1 : 0,
        isSystem: 0,
        isActive: 1,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      } as any);

      await db.logActivity({ userId: ctx.user.id, action: 'custom_role_created', entityType: 'customRole', entityId: id, description: `Created custom role: ${input.displayName}` });
      return { id, name: input.name, displayName: input.displayName };
    }),

  // Update a custom role
  updateCustomRole: createFeatureRestrictedProcedure("settings:roles")
    .input(z.object({
      id: z.string(),
      displayName: z.string().optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
      baseRole: z.enum(['user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager']).optional(),
      isAdvanced: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      // Fetch the role and verify ownership
      const existing = await database.select().from(customRoles).where(eq(customRoles.id, input.id)).limit(1);
      if (!existing.length) throw new Error('Custom role not found');
      if (existing[0].isSystem) throw new Error('System roles cannot be modified');

      validateOwnership(ctx.user, existing[0].organizationId, input.id);

      const updateSet: any = { updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) };
      if (input.displayName !== undefined) updateSet.displayName = input.displayName;
      if (input.description !== undefined) updateSet.description = input.description;
      if (input.permissions !== undefined) updateSet.permissions = JSON.stringify(input.permissions);
      if (input.baseRole !== undefined) updateSet.baseRole = input.baseRole;
      if (input.isAdvanced !== undefined) updateSet.isAdvanced = input.isAdvanced ? 1 : 0;

      await database.update(customRoles).set(updateSet).where(eq(customRoles.id, input.id));

      await db.logActivity({ userId: ctx.user.id, action: 'custom_role_updated', entityType: 'customRole', entityId: input.id, description: `Updated custom role: ${input.id}` });
      return { success: true };
    }),

  // Delete a custom role
  deleteCustomRole: createFeatureRestrictedProcedure("settings:roles")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const existing = await database.select().from(customRoles).where(eq(customRoles.id, input)).limit(1);
      if (!existing.length) throw new Error('Custom role not found');
      if (existing[0].isSystem) throw new Error('System roles cannot be deleted');

      validateOwnership(ctx.user, existing[0].organizationId, input);

      // Soft-delete: mark as inactive
      await database.update(customRoles).set({ isActive: 0, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) } as any).where(eq(customRoles.id, input));

      // Unassign users from this custom role
      await database.update(users).set({ customRoleId: null } as any).where(eq(users.customRoleId, input));

      await db.logActivity({ userId: ctx.user.id, action: 'custom_role_deleted', entityType: 'customRole', entityId: input, description: `Deleted custom role: ${input}` });
      return { success: true };
    }),

  // Assign a custom role to a user
  assignCustomRole: createFeatureRestrictedProcedure("settings:roles")
    .input(z.object({ userId: z.string(), customRoleId: z.string().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      if (input.customRoleId) {
        // Verify role exists and belongs to the same org
        const role = await database.select().from(customRoles).where(eq(customRoles.id, input.customRoleId)).limit(1);
        if (!role.length) throw new Error('Custom role not found');
        validateOwnership(ctx.user, role[0].organizationId, input.customRoleId);
      }

      await database.update(users).set({ customRoleId: input.customRoleId } as any).where(eq(users.id, input.userId));

      await db.logActivity({ userId: ctx.user.id, action: 'custom_role_assigned', entityType: 'user', entityId: input.userId, description: `Assigned custom role ${input.customRoleId} to user ${input.userId}` });
      return { success: true };
    }),

  // Set default role for a department
  setDepartmentDefaultRole: createFeatureRestrictedProcedure("departments:edit")
    .input(z.object({ departmentId: z.string(), defaultRole: z.string().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      // Verify department belongs to user's org
      const dept = await database.select().from(departments).where(eq(departments.id, input.departmentId)).limit(1);
      if (!dept.length) throw new Error('Department not found');
      validateOwnership(ctx.user, dept[0].organizationId, input.departmentId);

      await database.update(departments).set({ defaultRole: input.defaultRole } as any).where(eq(departments.id, input.departmentId));

      return { success: true };
    }),

  // Legacy: create system role (kept for backward compatibility)
  create: createFeatureRestrictedProcedure("settings:roles")
    .input(z.object({
      name: z.string(),
      displayName: z.string().optional(),
      description: z.string().optional(),
      permissions: z.array(z.string().optional()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createRole(input.name, input.description);
      const perms: string[] = (input.permissions || []).filter((p): p is string => typeof p === 'string' && p !== '');
      if (perms.length) {
        const allPerms = await db.getPermissions();
        for (const pName of perms) {
          const perm = allPerms.find((pp: any) => pp.permissionName === pName || pp.name === pName);
          if (perm && perm.id) {
            await db.assignPermissionToRole(id, perm.id);
          }
        }
      }
      await db.logActivity({ userId: ctx.user.id, action: 'role_created', entityType: 'role', entityId: id, description: `Created role: ${input.name}` });
      return { id, name: input.name, displayName: input.displayName || input.name, description: input.description };
    }),

  update: createFeatureRestrictedProcedure("settings:roles")
    .input(z.object({ id: z.string(), displayName: z.string().optional(), description: z.string().optional(), permissions: z.array(z.string().optional()).optional() }))
    .mutation(async ({ input, ctx }) => {
      const updateSet: any = {};
      if (input.displayName !== undefined) updateSet.roleName = input.displayName;
      if (input.description !== undefined) updateSet.description = input.description;
      if (Object.keys(updateSet).length > 0) {
        const dbconn = await getDb();
        if (dbconn) await dbconn.update(userRoles).set(updateSet).where(eq(userRoles.id, input.id));
      }

      if (input.permissions) {
        const existing = await db.getRolePermissions(input.id);
        for (const rp of existing) {
          if (rp.permissionId) await db.removePermissionFromRole(input.id, rp.permissionId);
        }
        const perms: string[] = (input.permissions || []).filter((p): p is string => typeof p === 'string' && p !== '');
        const allPerms = await db.getPermissions();
        for (const pName of perms) {
          const perm = allPerms.find((pp: any) => pp.permissionName === pName || pp.name === pName);
          if (perm && perm.id) await db.assignPermissionToRole(input.id, perm.id);
        }
      }

      await db.logActivity({ userId: ctx.user.id, action: 'role_updated', entityType: 'role', entityId: input.id, description: `Updated role: ${input.id}` });
      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("settings:roles")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const dbconn = await getDb();
      if (!dbconn) throw new Error('Database not available');

      const role = await dbconn.select().from(userRoles).where(eq(userRoles.id, input)).limit(1);
      if (role.length && role[0].roleName && ['super_admin', 'admin'].includes(role[0].roleName)) {
        throw new Error('Cannot delete system role');
      }

      await dbconn.delete(userRoles).where(eq(userRoles.id, input));

      await db.logActivity({ userId: ctx.user.id, action: 'role_deleted', entityType: 'role', entityId: input, description: `Deleted role: ${input}` });
      return { success: true };
    }),
});

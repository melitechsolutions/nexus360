import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { permissionMetadata, rolePermissions, permissionAuditLog } from "../../drizzle/schema";
import { eq, and, like } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const readProcedure = createFeatureRestrictedProcedure("permissions:read");
const writeProcedure = createFeatureRestrictedProcedure("permissions:edit");

export const enhancedPermissionsRouter = router({
  /**
   * List all permissions with metadata
   */
  list: readProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const permissions = await db.select().from(permissionMetadata);
    return permissions.map((p) => ({
      id: p.permissionId,
      label: p.label,
      description: p.description,
      category: p.category,
      icon: p.icon,
      isSystem: !!p.isSystem,
    }));
  }),

  /**
   * Get permissions by category
   */
  getByCategory: readProcedure
    .input(z.string())
    .query(async ({ input: category }) => {
      const db = await getDb();
      if (!db) return [];

      const permissions = await db
        .select()
        .from(permissionMetadata)
        .where(eq(permissionMetadata.category, category));

      return permissions.map((p) => ({
        id: p.permissionId,
        label: p.label,
        description: p.description,
        category: p.category,
        icon: p.icon,
        isSystem: !!p.isSystem,
      }));
    }),

  /**
   * Get all permission categories
   */
  getCategories: readProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const permissions = await db.select().from(permissionMetadata);
    const categories = [...new Set(permissions.map((p) => p.category))];
    return categories.sort();
  }),

  /**
   * Get permission details
   */
  getDetail: readProcedure
    .input(z.string())
    .query(async ({ input: permissionId }) => {
      const db = await getDb();
      if (!db) return null;

      const permission = await db
        .select()
        .from(permissionMetadata)
        .where(eq(permissionMetadata.permissionId, permissionId));

      if (!permission || permission.length === 0) return null;

      const p = permission[0];
      return {
        id: p.permissionId,
        label: p.label,
        description: p.description,
        category: p.category,
        icon: p.icon,
        isSystem: !!p.isSystem,
      };
    }),

  /**
   * Search permissions by label or description
   */
  search: readProcedure
    .input(z.string())
    .query(async ({ input: query }) => {
      const db = await getDb();
      if (!db) return [];

      const permissions = await db
        .select()
        .from(permissionMetadata)
        .where(
          or(
            like(permissionMetadata.label, `%${query}%`),
            like(permissionMetadata.description, `%${query}%`)
          )
        );

      return permissions.map((p) => ({
        id: p.permissionId,
        label: p.label,
        description: p.description,
        category: p.category,
        icon: p.icon,
        isSystem: !!p.isSystem,
      }));
    }),

  /**
   * Get permissions for a role
   */
  getForRole: readProcedure
    .input(z.string())
    .query(async ({ input: roleId }) => {
      const db = await getDb();
      if (!db) return [];

      const rolePerms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      const permIds = rolePerms.map((rp) => rp.permissionId).filter(Boolean);

      if (permIds.length === 0) return [];

      const permissions = await db
        .select()
        .from(permissionMetadata)
        .where(
          permissionMetadata.permissionId.inList ? 
            permissionMetadata.permissionId.inList(permIds) :
            or(...permIds.map(id => eq(permissionMetadata.permissionId, id)))
        );

      return permissions.map((p) => ({
        id: p.permissionId,
        label: p.label,
        description: p.description,
        category: p.category,
        icon: p.icon,
        isSystem: !!p.isSystem,
      }));
    }),

  /**
   * Assign permission to role
   */
  assignToRole: writeProcedure
    .input(
      z.object({
        roleId: z.string(),
        permissionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if already assigned
      const existing = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, input.roleId),
            eq(rolePermissions.permissionId, input.permissionId)
          )
        );

      if (existing && existing.length > 0) {
        return { success: false, message: "Permission already assigned" };
      }

      // Get permission details for audit log
      const permDetail = await db
        .select()
        .from(permissionMetadata)
        .where(eq(permissionMetadata.permissionId, input.permissionId));

      // Assign permission
      await db.insert(rolePermissions).values({
        id: uuid(),
        roleId: input.roleId,
        permissionId: input.permissionId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      // Log audit
      const permLabel = permDetail && permDetail.length > 0 ? permDetail[0].label : input.permissionId;
      await db.insert(permissionAuditLog).values({
        id: uuid(),
        roleId: input.roleId,
        permissionId: input.permissionId,
        permissionLabel: permLabel,
        action: "assign",
        changedBy: ctx.user.id,
        newValue: "assigned",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      return { success: true, message: "Permission assigned successfully" };
    }),

  /**
   * Remove permission from role
   */
  removeFromRole: writeProcedure
    .input(
      z.object({
        roleId: z.string(),
        permissionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get permission details for audit log
      const permDetail = await db
        .select()
        .from(permissionMetadata)
        .where(eq(permissionMetadata.permissionId, input.permissionId));

      // Remove permission
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, input.roleId),
            eq(rolePermissions.permissionId, input.permissionId)
          )
        );

      // Log audit
      const permLabel = permDetail && permDetail.length > 0 ? permDetail[0].label : input.permissionId;
      await db.insert(permissionAuditLog).values({
        id: uuid(),
        roleId: input.roleId,
        permissionId: input.permissionId,
        permissionLabel: permLabel,
        action: "remove",
        changedBy: ctx.user.id,
        oldValue: "assigned",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      return { success: true, message: "Permission removed successfully" };
    }),

  /**
   * Get audit log for permissions
   */
  getAuditLog: readProcedure
    .input(
      z.object({
        roleId: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(permissionAuditLog);

      if (input.roleId) {
        query = query.where(eq(permissionAuditLog.roleId, input.roleId));
      }

      const logs = await query.limit(input.limit).offset(input.offset);
      return logs;
    }),
});

// Helper function for OR conditions
function or(...conditions: any[]) {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return conditions.reduce((acc: any, cond: any) => ({ ...acc, ...cond }));
}

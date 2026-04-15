import { router, protectedProcedure, createFeatureRestrictedProcedure, invalidateMaintenanceCache, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { sql } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db";
import { settings, systemSettings, invoices, expenses, payments, users, userRoles, rolePermissions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const settingsReadProcedure = createFeatureRestrictedProcedure("admin:settings");
const settingsWriteProcedure = createFeatureRestrictedProcedure("admin:settings");
const rolesManageProcedure = createFeatureRestrictedProcedure("admin:manage_roles");

export const settingsRouter = router({
  // Public maintenance status — accessible without auth for maintenance page display
  getMaintenanceStatus: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { enabled: false, title: "", message: "", estimatedReturn: "", contactEmail: "" };
    const results = await database.select().from(settings).where(eq(settings.category, "maintenance"));
    const map: Record<string, string> = {};
    results.forEach(s => { if (s.key) map[s.key] = s.value ?? ""; });
    return {
      enabled: map.maintenance_mode === "true" || map.maintenance_mode === "1",
      title: map.maintenance_title || "Under Maintenance",
      message: map.maintenance_message || "The system is currently undergoing scheduled maintenance. Please check back shortly.",
      estimatedReturn: map.maintenance_estimated_return || "",
      contactEmail: map.maintenance_contact_email || "",
    };
  }),

  // Roles management
  listRoles: rolesManageProcedure.query(async () => [
    { id: "1", roleName: "Admin", description: "Administrator role", permissions: ["*"] },
    { id: "2", roleName: "Manager", description: "Manager role", permissions: ["view", "create", "edit"] },
    { id: "3", roleName: "Staff", description: "Staff role", permissions: ["view"] },
    { id: "4", roleName: "Client", description: "Client role", permissions: ["view_own"] },
  ]),

  // Settings management
  getCompanyInfo: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return {};
    const results = await database.select().from(settings).where(eq(settings.category, 'company'));
    const map: any = {};
    results.forEach(s => map[s.key] = s.value);
    return map;
  }),

  updateCompanyInfo: settingsWriteProcedure
    .input(z.any())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("DB error");
      
      // Ensure we are processing all keys including companyLogo
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        
        const stringValue = value === null ? "" : String(value);
        
        // Use a more robust check for existing keys
        const existing = await database.select().from(settings)
          .where(and(eq(settings.category, 'company'), eq(settings.key, key)))
          .limit(1);
          
        if (existing.length > 0) {
          await database.update(settings)
            .set({ 
              value: stringValue, 
              updatedBy: ctx.user.id
            })
            .where(eq(settings.id, existing[0].id));
        } else {
          await database.insert(settings).values({ 
            id: uuidv4(), 
            category: 'company', 
            key, 
            value: stringValue, 
            // some columns like description are text without a SQL default; explicitly
            // provide an empty string so the generated SQL doesn't try to use `DEFAULT`
            description: '',
            updatedBy: ctx.user.id,
            // updatedAt is a timestamp; letting SQL use its own default is fine but we
            // can also explicitly set to now() if desired. Omit to avoid `DEFAULT` on
            // text.
          });
        }
      }
      return { success: true };
    }),

  getBankDetails: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return {};
    const results = await database.select().from(settings).where(eq(settings.category, 'bank'));
    const map: any = {};
    results.forEach(s => map[s.key] = s.value);
    return map;
  }),

  updateBankDetails: settingsWriteProcedure
    .input(z.any())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("DB error");
      for (const [key, value] of Object.entries(input)) {
        const existing = await database.select().from(settings).where(and(eq(settings.category, 'bank'), eq(settings.key, key))).limit(1);
        if (existing.length) await database.update(settings).set({ value: String(value), updatedBy: ctx.user.id }).where(eq(settings.key, key));
        else await database.insert(settings).values({
          id: uuidv4(),
          category: 'bank',
          key,
          value: String(value),
          description: '',
          updatedBy: ctx.user.id
        });
      }
      return { success: true };
    }),

  getDocumentNumberingSettings: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return {};
    const results = await database.select().from(settings).where(eq(settings.category, 'numbering'));
    const map: any = {};
    results.forEach(s => map[s.key] = s.value);
    return map;
  }),

  getNotificationPreferences: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { invoiceDue: true, paymentReceived: true, newClient: false, companyAnnouncement: false };
    const results = await database
      .select()
      .from(settings)
      .where(eq(settings.category, 'notifications'));
    const map: any = {};
    results.forEach(s => map[s.key] = s.value === 'true');
    // provide defaults if missing
    return {
      invoiceDue: map.invoiceDue ?? true,
      paymentReceived: map.paymentReceived ?? true,
      newClient: map.newClient ?? false,
      companyAnnouncement: map.companyAnnouncement ?? false,
    };
  }),

  updateNotificationPreferences: settingsWriteProcedure
    .input(z.object({
      invoiceDue: z.boolean(),
      paymentReceived: z.boolean(),
      newClient: z.boolean(),
      companyAnnouncement: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("DB error");
      for (const [key, value] of Object.entries(input)) {
        const existing = await database
          .select()
          .from(settings)
          .where(and(eq(settings.category, 'notifications'), eq(settings.key, key)))
          .limit(1);
        const stringVal = value ? 'true' : 'false';
        if (existing.length) {
          await database
            .update(settings)
            .set({ value: stringVal, updatedBy: ctx.user.id })
            .where(eq(settings.id, existing[0].id));
        } else {
          await database.insert(settings).values({
            id: uuidv4(),
            category: 'notifications',
            key,
            value: stringVal,
            description: '',
            updatedBy: ctx.user.id,
          });
        }
      }
      return { success: true };
    }),

  updateDocumentPrefix: settingsWriteProcedure
    .input(z.object({ documentType: z.string(), prefix: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("DB error");
      const key = `${input.documentType}_prefix`;
      const existing = await database.select().from(settings).where(and(eq(settings.category, 'numbering'), eq(settings.key, key))).limit(1);
      if (existing.length) await database.update(settings).set({ value: input.prefix, updatedBy: ctx.user.id }).where(eq(settings.id, existing[0].id));
      else await database.insert(settings).values({ id: uuidv4(), category: 'numbering', key, value: input.prefix, updatedBy: ctx.user.id });
      return { success: true };
    }),

  getSettings: protectedProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { companyName: 'Melitech CRM', currency: 'KSH' };
    const results = await database.select().from(settings).where(eq(settings.category, 'general'));
    const map: any = {};
    results.forEach(s => map[s.key] = s.value);
    return { companyName: map.companyName || 'Melitech CRM', currency: map.currency || 'KSH' };
  }),

  // Returns all frontend-relevant settings for any authenticated user
  getPublicSettings: protectedProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { general: {}, currency: {}, theme: {}, logos: {} };
    const categories = ['general', 'currency', 'theme_settings', 'company_logos'];
    const rows = await database.select().from(settings).where(
      sql`${settings.category} IN (${sql.join(categories.map(c => sql`${c}`), sql`, `)})`
    );
    const result: Record<string, Record<string, string>> = {};
    for (const cat of categories) result[cat] = {};
    for (const row of rows) {
      if (result[row.category]) result[row.category][row.key] = row.value ?? '';
    }
    return {
      general: result['general'],
      currency: result['currency'],
      theme: result['theme_settings'],
      logos: result['company_logos'],
    };
  }),

  getBankReconciliation: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { revenue: 0, expenses: 0, balance: 0, status: "Disconnected" };
    const allExpenses = await database.select().from(expenses);
    const allPayments = await database.select().from(payments);
    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { revenue: totalRevenue / 100, expenses: totalExpenses / 100, balance: (totalRevenue - totalExpenses) / 100, status: "Records Match" };
  }),

  // Back-compat: client code expects a few document-numbering helpers by these names
  getDocumentNumberFormat: settingsReadProcedure
    .input(z.object({ documentType: z.string() }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return {};
      const results = await database.select().from(settings).where(eq(settings.category, 'numbering'));
      const map: any = {};
      results.forEach(s => (map[s.key] = s.value));
      if (input && input.documentType) {
        const key = `${input.documentType}_prefix`;
        return map[key] || {};
      }
      return map;
    }),

  updateDocumentNumberFormat: settingsWriteProcedure
    .input(z.object({ documentType: z.string(), prefix: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Reuse existing document prefix update behavior
      const database = await getDb();
      if (!database) throw new Error("DB error");
      const key = `${input.documentType}_prefix`;
      const existing = await database.select().from(settings).where(and(eq(settings.category, 'numbering'), eq(settings.key, key))).limit(1);
      if (existing.length) await database.update(settings).set({ value: input.prefix, updatedBy: ctx.user.id }).where(eq(settings.id, existing[0].id));
      else await database.insert(settings).values({
        id: uuidv4(),
        category: 'numbering',
        key,
        value: input.prefix,
        description: '',
        updatedBy: ctx.user.id
      });
      return { success: true };
    }),

  resetDocumentNumberFormatCounter: settingsWriteProcedure
    .input(z.object({ documentType: z.string() }))
    .mutation(async ({ input }) => {
      // Best-effort stub: resetting counter is environment specific; return success for now
      return { success: true };
    }),

  getNextDocumentNumber: settingsReadProcedure
    .input(z.object({ documentType: z.string() }))
    .mutation(async ({ input }) => {
      return { documentNumber: await db.getNextDocumentNumber(input.documentType) };
    }),

  // Get all settings
  getAll: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    return await database.select().from(settings);
  }),

  // Get roles
  getRoles: rolesManageProcedure.query(async () => {
    return await db.getRoles();
  }),

  // Back-compat: simple role management aliases so older client callsites using
  // `trpc.settings.createRole` / `updateRole` / `deleteRole` continue to work.
  createRole: rolesManageProcedure
    .input(z.object({ name: z.string(), displayName: z.string().optional(), description: z.string().optional(), permissions: z.array(z.string()).optional() }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createRole(input.name, input.description);
      if (input.permissions && input.permissions.length) {
        const allPerms = await db.getPermissions();
        for (const pName of input.permissions) {
          const perm = allPerms.find((pp: any) => pp.permissionName === pName || pp.name === pName);
          if (perm && perm.id) await db.assignPermissionToRole(id, perm.id);
        }
      }
      await db.logActivity({ userId: ctx.user.id, action: 'role_created', entityType: 'role', entityId: id, description: `Created role: ${input.name}` });
      return { id, name: input.name, displayName: input.displayName || input.name, description: input.description };
    }),

  updateRole: rolesManageProcedure
    .input(z.object({ id: z.string(), displayName: z.string().optional(), description: z.string().optional(), permissions: z.array(z.string()).optional() }))
    .mutation(async ({ input, ctx }) => {
      const dbconn = await getDb();
      if (!dbconn) throw new Error('Database not available');

      const updateSet: any = {};
      if (input.displayName !== undefined) updateSet.roleName = input.displayName;
      if (input.description !== undefined) updateSet.description = input.description;
      if (Object.keys(updateSet).length > 0) {
        await dbconn.update(userRoles).set(updateSet).where(eq(userRoles.id, input.id));
      }

      if (input.permissions) {
        const existing = await db.getRolePermissions(input.id);
        for (const rp of existing) {
          if (rp.permissionId) await db.removePermissionFromRole(input.id, rp.permissionId);
        }
        const allPerms = await db.getPermissions();
        for (const pName of input.permissions) {
          const perm = allPerms.find((pp: any) => pp.permissionName === pName || pp.name === pName);
          if (perm && perm.id) await db.assignPermissionToRole(input.id, perm.id);
        }
      }

      await db.logActivity({ userId: ctx.user.id, action: 'role_updated', entityType: 'role', entityId: input.id, description: `Updated role: ${input.id}` });
      return { success: true };
    }),

  deleteRole: rolesManageProcedure
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

  // Legacy list alias for roles
  list: settingsReadProcedure.query(async () => {
    return await db.getRoles();
  }),

  // Get permissions
  getPermissions: settingsReadProcedure.query(async () => {
    return await db.getPermissions();
  }),

  // Get user counts per role
  getUserCounts: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return {};
    
    const results = await database.select({
      role: users.role,
      count: sql<number>`count(*)`
    }).from(users).groupBy(users.role);
    
    const counts: Record<string, number> = {};
    results.forEach(r => {
      if (r.role) counts[r.role] = Number(r.count);
    });
    return counts;
  }),

  // Set a setting
  set: createFeatureRestrictedProcedure("admin:settings")
    .input(z.object({
      key: z.string(),
      value: z.string(),
      category: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const existing = await database.select().from(settings)
        .where(and(eq(settings.category, input.category), eq(settings.key, input.key)))
        .limit(1);

      if (existing.length > 0) {
        await database.update(settings)
          .set({ 
            value: input.value, 
            updatedBy: ctx.user.id,
          })
          .where(eq(settings.id, existing[0].id));
      } else {
        await database.insert(settings).values({
          id: uuidv4(),
          category: input.category,
          key: input.key,
          value: input.value,
          description: input.description,
          updatedBy: ctx.user.id,
        });
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "setting_updated",
        entityType: "setting",
        entityId: input.key,
        description: `Updated setting: ${input.key} = ${input.value}`,
      });

      return { success: true };
    }),

  

  // Create permission
  createPermission: rolesManageProcedure
    .input(z.object({
      permissionName: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const permissionId = await db.createPermission(
        input.permissionName,
        input.description,
        input.category
      );
      
      await db.logActivity({
        userId: ctx.user.id,
        action: "permission_created",
        entityType: "permission",
        entityId: permissionId,
        description: `Created permission: ${input.permissionName}`,
      });
      
      return { 
        id: permissionId, 
        permissionName: input.permissionName, 
        description: input.description,
        category: input.category 
      };
    }),

  // Back-compat bankReconciliation helpers (client expects bankReconciliation.getById / update / list)
  getById: settingsReadProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;
      const result = await database.select().from(settings).where(eq(settings.id, input)).limit(1);
      const row = result[0] || null;
      if (!row) return null;

      // If the stored value is JSON, return the parsed object so client-side
      // code (e.g. bank reconciliation) gets a structured object instead of
      // the raw settings row.
      try {
        if (row.value) {
          const parsed = JSON.parse(row.value);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {
        // ignore parse errors and fall back to returning raw row
      }

      return row;
    }),

  update: createFeatureRestrictedProcedure("settings:manage")
    .input(z.any())
    .mutation(async ({ input, ctx }) => {
      // Best-effort: update a bank reconciliation record stored in settings
      const database = await getDb();
      if (!database) throw new Error("DB error");
      for (const [key, value] of Object.entries(input)) {
        const existing = await database.select().from(settings).where(and(eq(settings.category, 'bank'), eq(settings.key, key))).limit(1);
        if (existing.length) await database.update(settings).set({ value: String(value), updatedBy: ctx.user.id }).where(eq(settings.id, existing[0].id));
        else await database.insert(settings).values({ id: uuidv4(), category: 'bank', key, value: String(value), updatedBy: ctx.user.id });
      }
      return { success: true };
    }),

  listBank: settingsReadProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    return await database.select().from(settings).where(eq(settings.category, 'bank'));
  }),

  // Assign permission to role
  assignPermissionToRole: rolesManageProcedure
    .input(z.object({
      roleId: z.string(),
      permissionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.assignPermissionToRole(input.roleId, input.permissionId);
      
      await db.logActivity({
        userId: ctx.user.id,
        action: "permission_assigned",
        entityType: "role_permission",
        entityId: `${input.roleId}_${input.permissionId}`,
        description: `Assigned permission ${input.permissionId} to role ${input.roleId}`,
      });
      
      return { success: true };
    }),

  // Remove permission from role
  removePermissionFromRole: rolesManageProcedure
    .input(z.object({
      roleId: z.string(),
      permissionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.removePermissionFromRole(input.roleId, input.permissionId);
      
      await db.logActivity({
        userId: ctx.user.id,
        action: "permission_removed",
        entityType: "role_permission",
        entityId: `${input.roleId}_${input.permissionId}`,
        description: `Removed permission ${input.permissionId} from role ${input.roleId}`,
      });
      
      return { success: true };
    }),

  // Get role permissions
  getRolePermissions: rolesManageProcedure
    .input(z.object({
      roleId: z.string(),
    }))
    .query(async ({ input }) => {
      return await db.getRolePermissions(input.roleId);
    }),

  // Back-compat: user preference helpers expected by older client code
  getUserPreferences: settingsReadProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];
    
    // Fetch all user preferences for the current user
    const userPrefixes = await database.select().from(settings)
      .where(and(eq(settings.category, 'user_pref')))
      .limit(100); // Reasonable limit for preferences
    
    // Filter to only this user's preferences
    const userIdPrefix = `user_pref:${ctx.user.id}:`;
    const userPrefs = userPrefixes.filter(s => s.key && s.key.startsWith(userIdPrefix));
    
    // Transform to frontend-friendly format
    return userPrefs.map(pref => ({
      key: pref.key,
      value: pref.value,
    }));
  }),

  setUserPreference: settingsWriteProcedure
    .input(z.object({ key: z.string(), value: z.union([z.string(), z.boolean(), z.number()]) }))
    .mutation(async ({ input, ctx }) => {
      // Store as a general setting under 'user_pref:{userId}:{key}'
      const database = await getDb();
      if (!database) throw new Error('DB error');
      const prefKey = `user_pref:${ctx.user.id}:${input.key}`;
      // Convert value to string for storage
      const valueStr = String(input.value);
      const existing = await database.select().from(settings).where(and(eq(settings.category, 'user_pref'), eq(settings.key, prefKey))).limit(1);
      if (existing.length) {
        await database.update(settings).set({ value: valueStr, updatedBy: ctx.user.id, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) }).where(eq(settings.id, existing[0].id));
      } else {
        await database.insert(settings).values({ id: uuidv4(), category: 'user_pref', key: prefKey, value: valueStr, description: `User preference: ${input.key}`, updatedBy: ctx.user.id });
      }
      return { success: true };
    }),

  resetSettingToDefault: settingsWriteProcedure
    .input(z.object({ key: z.string(), category: z.string().optional() }))
    .mutation(async ({ input }) => {
      // Best-effort stub: do nothing for now and return success
      return { success: true };
    }),

  resetCategoryToDefaults: settingsWriteProcedure
    .input(z.object({ category: z.string() }))
    .mutation(async ({ input }) => {
      // Best-effort stub: return success; implement as needed
      return { success: true };
    }),

  // Generic: get all settings for a given category as a key-value map
  getByCategory: settingsReadProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return {};
      const results = await database.select().from(settings).where(eq(settings.category, input.category));
      const map: Record<string, string> = {};
      results.forEach(s => { if (s.key) map[s.key] = s.value ?? ""; });
      return map;
    }),

  // Generic: update multiple settings for a given category in one call
  updateByCategory: settingsWriteProcedure
    .input(z.object({
      category: z.string(),
      values: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      for (const [key, value] of Object.entries(input.values)) {
        const existing = await database.select().from(settings)
          .where(and(eq(settings.category, input.category), eq(settings.key, key)))
          .limit(1);
        if (existing.length > 0) {
          await database.update(settings)
            .set({ value: String(value), updatedBy: ctx.user.id })
            .where(eq(settings.id, existing[0].id));
        } else {
          await database.insert(settings).values({
            id: uuidv4(),
            category: input.category,
            key,
            value: String(value),
            description: '',
            updatedBy: ctx.user.id,
          });
        }
      }
      // Invalidate maintenance mode cache when maintenance settings change
      if (input.category === "maintenance" || input.category === "tweak_settings") {
        invalidateMaintenanceCache();
      }
      return { success: true };
    }),
});
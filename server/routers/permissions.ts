import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { userPermissions, permissionMetadata, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { TRPCError } from "@trpc/server";

/**
 * Permission Categories and Metadata
 * Defines all available permissions organized by module/resource
 */
export const PERMISSION_DEFINITIONS = {
  invoices: {
    category: "Invoices",
    permissions: [
      { id: "invoices_view", label: "View", description: "View invoices" },
      { id: "invoices_create", label: "Create", description: "Create new invoices" },
      { id: "invoices_edit", label: "Edit", description: "Edit existing invoices" },
      { id: "invoices_delete", label: "Delete", description: "Delete invoices" },
      { id: "invoices_download", label: "Download", description: "Download invoice documents" },
      { id: "invoices_print", label: "Print", description: "Print invoices" },
      { id: "invoices_send", label: "Send", description: "Send invoices to clients" },
      { id: "invoices_mark_paid", label: "Mark as Paid", description: "Mark invoices as paid" },
    ],
  },
  estimates: {
    category: "Estimates",
    permissions: [
      { id: "estimates_view", label: "View", description: "View estimates" },
      { id: "estimates_create", label: "Create", description: "Create new estimates" },
      { id: "estimates_edit", label: "Edit", description: "Edit existing estimates" },
      { id: "estimates_delete", label: "Delete", description: "Delete estimates" },
      { id: "estimates_download", label: "Download", description: "Download estimate documents" },
      { id: "estimates_print", label: "Print", description: "Print estimates" },
      { id: "estimates_send", label: "Send", description: "Send estimates to clients" },
      { id: "estimates_approve", label: "Approve", description: "Approve estimates" },
    ],
  },
  receipts: {
    category: "Receipts",
    permissions: [
      { id: "receipts_view", label: "View", description: "View receipts" },
      { id: "receipts_create", label: "Create", description: "Create new receipts" },
      { id: "receipts_edit", label: "Edit", description: "Edit existing receipts" },
      { id: "receipts_delete", label: "Delete", description: "Delete receipts" },
      { id: "receipts_download", label: "Download", description: "Download receipt documents" },
      { id: "receipts_print", label: "Print", description: "Print receipts" },
    ],
  },
  payments: {
    category: "Payments",
    permissions: [
      { id: "payments_view", label: "View", description: "View payments" },
      { id: "payments_create", label: "Create", description: "Record new payments" },
      { id: "payments_edit", label: "Edit", description: "Edit payment records" },
      { id: "payments_delete", label: "Delete", description: "Delete payments" },
      { id: "payments_reconcile", label: "Reconcile", description: "Reconcile payments" },
    ],
  },
  expenses: {
    category: "Expenses",
    permissions: [
      { id: "expenses_view", label: "View", description: "View expenses" },
      { id: "expenses_create", label: "Create", description: "Create new expenses" },
      { id: "expenses_edit", label: "Edit", description: "Edit expenses" },
      { id: "expenses_delete", label: "Delete", description: "Delete expenses" },
      { id: "expenses_approve", label: "Approve", description: "Approve expenses" },
    ],
  },
  clients: {
    category: "Clients",
    permissions: [
      { id: "clients_view", label: "View", description: "View clients" },
      { id: "clients_create", label: "Create", description: "Create new clients" },
      { id: "clients_edit", label: "Edit", description: "Edit client information" },
      { id: "clients_delete", label: "Delete", description: "Delete clients" },
    ],
  },
  users: {
    category: "Users",
    permissions: [
      { id: "users_view", label: "View", description: "View users" },
      { id: "users_create", label: "Create", description: "Create new users" },
      { id: "users_edit", label: "Edit", description: "Edit user information" },
      { id: "users_delete", label: "Delete", description: "Delete users" },
      { id: "users_manage_permissions", label: "Manage Permissions", description: "Manage user permissions" },
    ],
  },
  reports: {
    category: "Reports",
    permissions: [
      { id: "reports_view", label: "View", description: "View reports" },
      { id: "reports_create", label: "Create", description: "Create custom reports" },
      { id: "reports_download", label: "Download", description: "Download reports" },
      { id: "reports_schedule", label: "Schedule", description: "Schedule report delivery" },
    ],
  },
  products: {
    category: "Products",
    permissions: [
      { id: "products_view", label: "View", description: "View products" },
      { id: "products_create", label: "Create", description: "Create new products" },
      { id: "products_edit", label: "Edit", description: "Edit products" },
      { id: "products_delete", label: "Delete", description: "Delete products" },
    ],
  },
  projects: {
    category: "Projects",
    permissions: [
      { id: "projects_view", label: "View", description: "View projects" },
      { id: "projects_create", label: "Create", description: "Create new projects" },
      { id: "projects_edit", label: "Edit", description: "Edit projects" },
      { id: "projects_delete", label: "Delete", description: "Delete projects" },
      { id: "projects_manage_team", label: "Manage Team", description: "Manage project team members" },
    ],
  },
  hr: {
    category: "HR Management",
    permissions: [
      { id: "hr_view", label: "View", description: "View HR data" },
      { id: "hr_employees_manage", label: "Manage Employees", description: "Create and edit employee records" },
      { id: "hr_payroll_view", label: "View Payroll", description: "View payroll information" },
      { id: "hr_payroll_process", label: "Process Payroll", description: "Process payroll" },
      { id: "hr_attendance_manage", label: "Manage Attendance", description: "Manage attendance records" },
      { id: "hr_leave_approve", label: "Approve Leave", description: "Approve leave requests" },
    ],
  },
  suppliers: {
    category: "Procurement - Suppliers",
    permissions: [
      { id: "suppliers_view", label: "View", description: "View suppliers" },
      { id: "suppliers_create", label: "Create", description: "Create new suppliers" },
      { id: "suppliers_edit", label: "Edit", description: "Edit supplier information" },
      { id: "suppliers_delete", label: "Delete", description: "Delete suppliers" },
      { id: "suppliers_rate", label: "Rate", description: "Rate supplier performance" },
      { id: "suppliers_audit", label: "Audit", description: "Conduct supplier audits" },
    ],
  },
  departments: {
    category: "Organization - Departments",
    permissions: [
      { id: "departments_view", label: "View", description: "View departments" },
      { id: "departments_create", label: "Create", description: "Create departments" },
      { id: "departments_edit", label: "Edit", description: "Edit department information" },
      { id: "departments_delete", label: "Delete", description: "Delete departments" },
      { id: "departments_manage_staff", label: "Manage Staff", description: "Assign staff to departments" },
    ],
  },
  budgets: {
    category: "Procurement - Budgets",
    permissions: [
      { id: "budgets_view", label: "View", description: "View budgets" },
      { id: "budgets_create", label: "Create", description: "Create new budgets" },
      { id: "budgets_edit", label: "Edit", description: "Edit budget information" },
      { id: "budgets_delete", label: "Delete", description: "Delete budgets" },
      { id: "budgets_approve", label: "Approve", description: "Approve budget requests" },
      { id: "budgets_track", label: "Track Spending", description: "Track budget spending" },
    ],
  },
  settings: {
    category: "Settings",
    permissions: [
      { id: "settings_view", label: "View", description: "View system settings" },
      { id: "settings_edit", label: "Edit", description: "Edit system settings" },
      { id: "settings_manage_roles", label: "Manage Roles", description: "Manage user roles" },
    ],
  },
};

// Flatten all permissions for easy lookup
export const ALL_PERMISSIONS = Object.values(PERMISSION_DEFINITIONS)
  .flatMap((category) => category.permissions)
  .reduce((acc, perm) => ({ ...acc, [perm.id]: perm }), {} as Record<string, any>);

export const permissionsRouter = router({
  /**
   * Get all available permissions organized by category
   */
  getAll: createFeatureRestrictedProcedure("permissions:manage").query(async () => {
    return PERMISSION_DEFINITIONS;
  }),

  /**
   * Get permissions for a specific user
   */
  getUserPermissions: createFeatureRestrictedProcedure("permissions:read")
    .input(z.string())
    .query(async ({ input: userId, ctx }) => {
      // Only super_admin can view others' permissions
      if (ctx.user.id !== userId && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own permissions",
        });
      }

      const db = await getDb();
      if (!db) return {};

      const userPerms = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId));

      const result: Record<string, Record<string, boolean>> = {};

      // Initialize all permissions as false for ungranted permissions
      Object.entries(PERMISSION_DEFINITIONS).forEach(([key, category]) => {
        result[category.category] = {};
        category.permissions.forEach((perm) => {
          result[category.category][perm.id] = false;
        });
      });

      // Set granted permissions to true
      userPerms.forEach((perm) => {
        // Ensure granted is explicitly cast to boolean (database returns 0 or 1)
        const isGranted = Boolean(perm.granted);
        if (isGranted) {
          // Find the category for this permission
          const category = Object.values(PERMISSION_DEFINITIONS).find((cat) =>
            cat.permissions.some((p) => p.id === perm.resource)
          );
          if (category) {
            result[category.category][perm.resource] = true;
          }
        }
      });

      return result;
    }),

  /**
   * Update a user's permission
   */
  updateUserPermission: createFeatureRestrictedProcedure("permissions:manage")
    .input(
      z.object({
        userId: z.string(),
        permissionId: z.string(),
        granted: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only super_admin can manage permissions
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admin can manage permissions",
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user exists
      const targetUser = await db.select().from(users).where(eq(users.id, input.userId));
      if (!targetUser.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if permission record exists
      const existingPerm = await db
        .select()
        .from(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, input.userId),
            eq(userPermissions.resource, input.permissionId)
          )
        );

      if (existingPerm.length > 0) {
        // Update existing
        await db
          .update(userPermissions)
          .set({
            granted: input.granted ? 1 : 0,
            grantedBy: ctx.user.id,
          })
          .where(eq(userPermissions.id, existingPerm[0].id));
      } else {
        // Create new
        await db.insert(userPermissions).values({
          id: uuid(),
          userId: input.userId,
          resource: input.permissionId,
          action: "access",
          granted: input.granted ? 1 : 0,
          grantedBy: ctx.user.id,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      }

      return { success: true };
    }),

  /**
   * Bulk update user permissions
   */
  bulkUpdatePermissions: createFeatureRestrictedProcedure("permissions:manage")
    .input(
      z.object({
        userId: z.string(),
        permissions: z.record(z.string(), z.coerce.boolean()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admin can manage permissions",
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete existing permissions for this user
      await db.delete(userPermissions).where(eq(userPermissions.userId, input.userId));

      // Insert new permissions
      const permissionInserts = Object.entries(input.permissions)
        .filter(([_, granted]) => Boolean(granted))
        .map(([permissionId]) => ({
          id: uuid(),
          userId: input.userId,
          resource: permissionId,
          action: "access",
          granted: 1,
          grantedBy: ctx.user.id,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        }));

      if (permissionInserts.length > 0) {
        await db.insert(userPermissions).values(permissionInserts);
      }

      return { success: true };
    }),

  /**
   * Check if user has a specific permission
   */
  hasPermission: createFeatureRestrictedProcedure("permissions:read")
    .input(
      z.object({
        userId: z.string().optional(),
        permissionId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = input.userId || ctx.user.id;

      // Super admin has all permissions
      if (ctx.user.role === "super_admin") {
        return true;
      }

      const db = await getDb();
      if (!db) return false;

      const perm = await db
        .select()
        .from(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.resource, input.permissionId),
            eq(userPermissions.granted, 1)
          )
        );

      return perm.length > 0;
    }),

  /**
   * Get permission categories for frontend display
   */
  getCategories: protectedProcedure.query(async () => {
    return Object.entries(PERMISSION_DEFINITIONS).map(([key, category]) => ({
      key,
      name: category.category,
      permissionCount: category.permissions.length,
    }));
  }),
});

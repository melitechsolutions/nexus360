/**
 * User Management Database Helpers
 * Handles all user-related database operations
 */

import { eq, and, like, desc } from "drizzle-orm";
import {
  users,
  userRoles,
  rolePermissions,
  userProjectAssignments,
  projectComments,
  staffTasks,
  activityLog,
  auditLogs,
  settings,
  apiKeys,
  webhooks,
} from "../drizzle/schema";
import { organizationMembers } from "../drizzle/schema-extended";

// legacy/compat types - schema doesn't export DTO insert types in this repo
type InsertUser = any;
type User = any;
type UserRole = any;
type Permission = any;
type RolePermission = any;
type UserProjectAssignment = any;
type ProjectComment = any;
type StaffTask = any;
import { getDb } from "./db";

/**
 * Get all users with optional filtering by search, role, and organization
 */
export async function getAllUsers(searchTerm?: string, role?: string, organizationId?: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];
    
    if (searchTerm) {
      conditions.push(like(users.name, `%${searchTerm}%`));
    }
    if (role) {
      conditions.push(eq(users.role, role as any));
    }
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }

    if (conditions.length > 0) {
      return await db.select().from(users).where(and(...conditions));
    }

    return await db.select().from(users);
  } catch (error) {
    console.error("[Database] Failed to get users:", error);
    return [];
  }
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user:", error);
    return undefined;
  }
}

/**
 * Get a single user by email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by email:", error);
    return undefined;
  }
}

/**
 * Create a new user
 */
export async function createUser(userData: InsertUser): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.error("[Database] Database connection failed");
    return null;
  }

  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const newUser: InsertUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role || "user",
      department: userData.department,
      isActive: userData.isActive !== false ? 1 : 0,
      clientId: userData.clientId,
      organizationId: userData.organizationId,
      permissions: userData.permissions,
      loginMethod: userData.loginMethod,
      passwordHash: userData.passwordHash,
      requiresPasswordChange: userData.requiresPasswordChange !== undefined ? userData.requiresPasswordChange : 1,
      createdAt: userData.createdAt || now,
      lastSignedIn: userData.lastSignedIn,
    };

    console.log("[Database] Creating user with data:", {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    });

    await db.insert(users).values(newUser);
    
    // Auto-add user to organizationMembers if they belong to an org
    if (userData.organizationId) {
      try {
        const memberId = `om_${userData.id}`;
        await db.insert(organizationMembers).values({
          id: memberId,
          organizationId: userData.organizationId,
          userId: userData.id,
          role: userData.role || "user",
          status: "active",
          isActive: true,
          joinedAt: new Date(),
        }).onDuplicateKeyUpdate({ set: { status: "active", isActive: true, updatedAt: new Date() } });
        console.log("[Database] Added user to organizationMembers:", memberId);
      } catch (omErr: any) {
        console.warn("[Database] Failed to add org member (non-fatal):", omErr?.message);
      }
    }

    const result = await getUserById(userData.id);
    console.log("[Database] User created successfully:", result?.id);
    return result || null;
  } catch (error: any) {
    console.error("[Database] Failed to create user:", {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlMessage: error?.sqlMessage,
      sql: error?.sql,
    });
    return null;
  }
}

/**
 * Update an existing user
 */
export async function updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const updateData: Record<string, any> = {};

    // Core user fields
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 1 : 0;
    if (updates.clientId !== undefined) updateData.clientId = updates.clientId;
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
    if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;
    if (updates.organizationId !== undefined) updateData.organizationId = updates.organizationId;

    // Profile fields
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.photoUrl !== undefined) updateData.photoUrl = updates.photoUrl;

    if (Object.keys(updateData).length === 0) {
      const result = await getUserById(userId);
      return result || null;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
    const result = await getUserById(userId);
    return result || null;
  } catch (error) {
    console.error("[Database] Failed to update user:", error);
    return null;
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Soft delete by marking as inactive
    await db.update(users).set({ isActive: 0 }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete user:", error);
    return false;
  }
}

/**
 * Permanently hard delete a user from the database
 * This removes all user records and associated data
 * Only for inactive users (safety check must be done in router)
 */
export async function hardDeleteUser(userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Hard delete - completely remove from database
    // First, delete related records to maintain referential integrity
    
    // Delete activity logs
    await db.delete(activityLog).where(eq(activityLog.userId, userId));
    
    // Delete audit logs
    await db.delete(auditLogs).where(eq(auditLogs.userId, userId));

    // Nullify settings updatedBy references for this user
    await db.update(settings).set({ updatedBy: null }).where(eq(settings.updatedBy, userId));

    // Delete user roles
    await db.delete(userRoles).where(eq(userRoles.userId, userId));

    // Delete API keys
    try { await db.delete(apiKeys).where(eq(apiKeys.userId, userId)); } catch { /* table may not exist */ }

    // Delete webhooks
    try { await db.delete(webhooks).where(eq(webhooks.userId, userId)); } catch { /* table may not exist */ }

    // Finally, delete the user record itself
    await db.delete(users).where(eq(users.id, userId));
    
    console.log(`[Database] User ${userId} permanently deleted from system`);
    return true;
  } catch (error) {
    console.error("[Database] Failed to hard delete user:", error);
    return false;
  }
}

/**
 * Assign a user to a project
 */
export async function assignUserToProject(
  userId: string,
  projectId: string,
  role: "project_manager" | "team_lead" | "developer" | "designer" | "qa" | "other" = "developer"
): Promise<UserProjectAssignment | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const id = `upa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const assignment: any = {
      id,
      userId,
      projectId,
      role,
      isActive: 1,
    };

    await db.insert(userProjectAssignments).values(assignment);
    return assignment;
  } catch (error) {
    console.error("[Database] Failed to assign user to project:", error);
    return null;
  }
}

/**
 * Get projects assigned to a user
 */
export async function getUserProjects(userId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(userProjectAssignments)
      .where(eq(userProjectAssignments.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get user projects:", error);
    return [];
  }
}

/**
 * Get team members for a project
 */
export async function getProjectTeam(projectId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(userProjectAssignments)
      .where(eq(userProjectAssignments.projectId, projectId));
  } catch (error) {
    console.error("[Database] Failed to get project team:", error);
    return [];
  }
}

/**
 * Add a comment to a project
 */
export async function addProjectComment(
  projectId: string,
  userId: string,
  comment: string,
  commentType: "remark" | "update" | "issue" | "question" | "approval" = "remark",
  isPublic: boolean = true
): Promise<ProjectComment | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const id = `pc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newComment: any = {
      id,
      projectId,
      userId,
      comment,
      commentType,
      isPublic,
    };

    await db.insert(projectComments).values(newComment);
    return newComment;
  } catch (error) {
    console.error("[Database] Failed to add project comment:", error);
    return null;
  }
}

/**
 * Get comments for a project
 */
export async function getProjectComments(projectId: string, includePrivate: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  try {
    const whereConditions: any[] = [eq(projectComments.projectId, projectId)];
    
    if (!includePrivate) {
      // `projectComments` schema does not have `isPublic`; skip that filter.
    }

    return await db
      .select()
      .from(projectComments)
      .where(and(...whereConditions))
      .orderBy(desc(projectComments.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get project comments:", error);
    return [];
  }
}

/**
 * Create a staff task
 */
export async function createStaffTask(
  title: string,
  department: string,
  createdBy: string,
  description?: string,
  assignedTo?: string,
  priority: "low" | "medium" | "high" | "urgent" = "medium",
  dueDate?: Date
): Promise<StaffTask | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: any = {
      id,
      title,
      description,
      department,
      assignedTo,
      createdBy,
      status: "todo",
      priority,
      dueDate,
    };

    await db.insert(staffTasks).values(task);
    return task;
  } catch (error) {
    console.error("[Database] Failed to create staff task:", error);
    return null;
  }
}

/**
 * Get staff tasks for a department
 */
export async function getDepartmentTasks(department: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(staffTasks)
      .where(eq(staffTasks.departmentId, department))
      .orderBy(desc(staffTasks.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get department tasks:", error);
    return [];
  }
}

/**
 * Get tasks assigned to a user
 */
export async function getUserTasks(userId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(staffTasks)
      .where(eq(staffTasks.assignedTo, userId))
      .orderBy(desc(staffTasks.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get user tasks:", error);
    return [];
  }
}

/**
 * Update staff task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: "todo" | "in_progress" | "completed" | "blocked"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.completedDate = new Date();
    }

    await db.update(staffTasks).set(updateData).where(eq(staffTasks.id, taskId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update task status:", error);
    return false;
  }
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // NOTE: the legacy `permissions` table is no longer part of the active schema.
    // rolePermissions.permissionId currently stores the effective permission key.
    const perms = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    return perms.map((p) => ({ id: p.permissionId, permissionName: p.permissionId } as any));
  } catch (error) {
    console.error("[Database] Failed to get role permissions:", error);
    return [];
  }
}

/**
 * Check if user has a specific permission
 */
export async function userHasPermission(userId: string, permissionName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const user = await getUserById(userId);
    if (!user) return false;

    // Admins have all permissions
    if (user.role === "admin" || user.role === "super_admin") {
      return true;
    }

    // Check if user has the permission in their permissions field (JSON)
    if (user.permissions) {
      try {
        const perms = JSON.parse(user.permissions);
        return Array.isArray(perms) && perms.includes(permissionName);
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error("[Database] Failed to check user permission:", error);
    return false;
  }
}

/**
 * Get department members
 */
export async function getDepartmentMembers(department: string) {
  const db = await getDb();
  if (!db) return [];

  try {
      return await db
      .select()
      .from(users)
      .where(and(
        eq(users.department, department),
        eq(users.isActive, 1)
      ));
  } catch (error) {
    console.error("[Database] Failed to get department members:", error);
    return [];
  }
}


/**
 * Update user password
 * Verifies current password before updating
 */
export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Import bcrypt for password hashing
    const bcrypt = await import("bcryptjs");
    
    // Get user
    const user = await getUserById(userId);
    if (!user) return false;

    // Verify current password
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) return false;
    } else {
      // User doesn't have a password set (OAuth user)
      return false;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update password:", error);
    return false;
  }
}

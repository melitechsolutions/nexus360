/**
 * User Management tRPC Router
 * Handles user CRUD operations with role-based access control
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import * as dbUsers from "../db-users";
import * as db from "../db";
import { getDb } from "../db";
import { contacts } from "../../drizzle/schema";
import { v4 as uuidv4 } from "uuid";

// Feature-based procedures
const userReadProcedure = protectedProcedure;
const userWriteProcedure = createFeatureRestrictedProcedure("users:edit");
const userProfileProcedure = createFeatureRestrictedProcedure("users:profile");

// Role-based procedure wrappers
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Admin access required' 
    });
  }
  return next({ ctx });
});

export const clientProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'client' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Client access required' 
    });
  }
  return next({ ctx });
});

export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'staff' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Staff access required' 
    });
  }
  return next({ ctx });
});

export const accountantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'accountant' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Accountant access required' 
    });
  }
  return next({ ctx });
});

export const hrProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'hr' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'HR access required' 
    });
  }
  return next({ ctx });
});

export const projectManagerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'project_manager' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Project Manager access required' 
    });
  }
  return next({ ctx });
});

export const staffAssignmentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['super_admin', 'admin', 'project_manager', 'hr', 'ict_manager', 'procurement_manager'].includes(ctx.user.role)) {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Cannot assign staff. Required role: Super Admin, Admin, Project Manager, HR, ICT Manager, or Procurement Manager' 
    });
  }
  return next({ ctx });
});

function assertOrgScopedAccess(actorOrgId: string | undefined, targetOrgId: string | null | undefined) {
  if (actorOrgId && targetOrgId !== actorOrgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only access users in your organization',
    });
  }
}

export const usersRouter = router({
  /**
   * All authenticated users: Get user id+name for display lookups (org-scoped)
   */
  listNames: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) return [];
      try {
        const { users } = await import("../../drizzle/schema");
        // Global admins see all, org users see only their org
        if (ctx.user.organizationId) {
          const { eq } = await import("drizzle-orm");
          const rows = await database.select({ id: users.id, name: users.name }).from(users)
            .where(eq(users.organizationId, ctx.user.organizationId));
          return rows;
        }
        const rows = await database.select({ id: users.id, name: users.name }).from(users);
        return rows;
      } catch (error) {
        console.error("[Users listNames Error]", error);
        return [];
      }
    }),

  /**
   * Admin: Get all users (filtered by organization for non-global admins)
   */
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Global super admins (no organizationId) see all users
      // Org admins see only their org's users
      const orgId = ctx.user.organizationId || undefined;
      return await dbUsers.getAllUsers(input?.search, input?.role, orgId);
    }),

  /**
   * Admin: Get a single user
   */
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await dbUsers.getUserById(input.id);
      if (!user) return null;
      assertOrgScopedAccess(ctx.user.organizationId || undefined, (user as any).organizationId);
      return user;
    }),

  /**
   * Admin: Get a single user by ID (alias for get)
   */
  getById: adminProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const user = await dbUsers.getUserById(input);
      if (!user) return null;
      assertOrgScopedAccess(ctx.user.organizationId || undefined, (user as any).organizationId);
      return user;
    }),

  /**
   * Admin: Create a new user
   */
  create: adminProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(["user", "admin", "staff", "accountant", "client", "super_admin", "project_manager", "hr", "ict_manager", "procurement_manager", "sales_manager"]),
      department: z.string().optional(),
      clientId: z.string().optional(),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user already exists
        const existingUser = await dbUsers.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User with this email already exists',
          });
        }

        // Generate user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Hash password using bcrypt
        const bcrypt = await import("bcryptjs");
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(input.password, salt);

        const user = await dbUsers.createUser({
          id: userId,
          name: input.name,
          email: input.email,
          passwordHash: passwordHash,
          role: input.role,
          department: input.department || undefined,
          clientId: input.clientId || undefined,
          isActive: input.isActive ? 1 : 0,
          requiresPasswordChange: 1,
          // Inherit the creator's organizationId for data isolation
          organizationId: ctx.user.organizationId || undefined,
        });

        if (!user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user - check server logs for details',
          });
        }

        // Log activity (don't fail the request if logging fails)
        try {
          await db.logActivity({
            userId: ctx.user.id,
            action: 'user_created',
            entityType: 'user',
            entityId: userId,
            description: `Created user: ${input.name} (${input.email})`,
          });
        } catch (logError) {
          console.error('[UserCreate] Failed to log activity:', logError);
          // Continue anyway - activity logging failure is not critical
        }

        // Auto-create contact from user data
        try {
          const database = await getDb();
          if (database) {
            const nameParts = input.name.trim().split(/\s+/);
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
            await database.insert(contacts).values({
              id: uuidv4(),
              organizationId: ctx.user.organizationId ?? null,
              firstName,
              lastName,
              email: input.email || null,
              department: input.department || null,
              isPrimary: 0,
              notes: `User: ${input.role}`,
              createdBy: ctx.user.id,
            });
          }
        } catch (contactErr) {
          console.error('[UserCreate] Auto-create contact failed:', contactErr);
        }

        return user;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        
        // Log detailed error for debugging
        const errorDetails = {
          message: error?.message || String(error),
          code: error?.code,
          name: error?.name,
          errno: error?.errno,
          sqlMessage: error?.sqlMessage,
        };
        console.error('[UserCreate] Error details:', errorDetails);
        
        // Return more helpful error message (but don't expose sensitive DB internals)
        let userMessage = 'Failed to create user';
        if (error?.message?.includes('Duplicate')) {
          userMessage = 'Email already exists in the system';
        } else if (error?.message?.includes('FOREIGN KEY')) {
          userMessage = 'Invalid department or client reference';
        } else if (error?.message?.includes('constraint')) {
          userMessage = 'Data validation failed - check all required fields';
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: userMessage,
        });
      }
    }),

  /**
   * Admin: Update a user
   */
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      password: z.string().min(8, "Password must be at least 8 characters").optional(),
      role: z.enum(["user", "admin", "staff", "accountant", "client", "super_admin", "project_manager", "hr", "ict_manager", "procurement_manager", "sales_manager"]).optional(),
      department: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user exists
      const existingUser = await dbUsers.getUserById(input.id);
      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      assertOrgScopedAccess(ctx.user.organizationId || undefined, (existingUser as any).organizationId);

      // Check if new email is already taken by another user
      if (input.email && input.email !== existingUser.email) {
        const emailExists = await dbUsers.getUserByEmail(input.email);
        if (emailExists) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email already in use by another user',
          });
        }
      }

      const updateData: any = {
        name: input.name,
        email: input.email,
        role: input.role,
        department: input.department,
        isActive: input.isActive,
      };

      // Hash password if provided
      if (input.password) {
        const bcrypt = await import("bcryptjs");
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(input.password, salt);
        updateData.passwordHash = passwordHash;
      }

      const user = await dbUsers.updateUser(input.id, updateData);

      if (!user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
        });
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: 'user_updated',
        entityType: 'user',
        entityId: input.id,
        description: `Updated user: ${user.name} (${user.email})`,
      });

      return user;
    }),

  /**
   * Admin: Delete a user (soft delete)
   */
  delete: adminProcedure
    .input(z.string())
    .mutation(async ({ input: userId, ctx }) => {
      // Check if user exists
      const user = await dbUsers.getUserById(userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      assertOrgScopedAccess(ctx.user.organizationId || undefined, (user as any).organizationId);

      // Prevent deleting super_admin users
      if (user.role === 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete super admin users',
        });
      }

      // Prevent self-deletion
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete your own user account',
        });
      }

      const success = await dbUsers.deleteUser(userId);
      
      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user',
        });
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: 'user_deactivated',
        entityType: 'user',
        entityId: userId,
        description: `Deactivated user: ${user.name} (${user.email})`,
      });

      return { success: true };
    }),

  /**
   * Admin: Permanently delete an inactive user (hard delete)
   */
  permanentDelete: adminProcedure
    .input(z.string())
    .mutation(async ({ input: userId, ctx }) => {
      const user = await dbUsers.getUserById(userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      assertOrgScopedAccess(ctx.user.organizationId || undefined, (user as any).organizationId);

      if (user.role === 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot permanently delete super admin users',
        });
      }

      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete your own account',
        });
      }

      if (user.isActive !== 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User must be deactivated before permanent deletion',
        });
      }

      const success = await dbUsers.hardDeleteUser(userId);
      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to permanently delete user',
        });
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: 'user_permanently_deleted',
        entityType: 'user',
        entityId: userId,
        description: `Permanently deleted user: ${user.name} (${user.email})`,
      });

      return { success: true };
    }),

  /**
   * Staff: Get their assigned projects
   */
  myProjects: staffProcedure.query(async ({ ctx }) => {
    return await dbUsers.getUserProjects(ctx.user.id);
  }),

  /**
   * Staff: Get their assigned tasks
   */
  myTasks: staffProcedure.query(async ({ ctx }) => {
    return await dbUsers.getUserTasks(ctx.user.id);
  }),

  /**
   * Staff: Update task status
   */
  updateTaskStatus: staffProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(["todo", "in_progress", "completed", "blocked"]),
    }))
    .mutation(async ({ input }) => {
      const success = await dbUsers.updateTaskStatus(input.taskId, input.status);
      
      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update task status',
        });
      }

      return { success: true };
    }),

  /**
   * Staff: Get department tasks
   */
  departmentTasks: staffProcedure
    .input(z.object({ department: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify user belongs to this department
      const user = await dbUsers.getUserById(ctx.user.id);
      if (user?.department !== input.department && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access other departments',
        });
      }

      return await dbUsers.getDepartmentTasks(input.department);
    }),

  /**
   * Staff: Get department members
   */
  departmentMembers: staffProcedure
    .input(z.object({ department: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await dbUsers.getUserById(ctx.user.id);
      if (user?.department !== input.department && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access other departments',
        });
      }

      return await dbUsers.getDepartmentMembers(input.department);
    }),

  /**
   * Client: Get their profile
   */
  profile: clientProcedure.query(async ({ ctx }) => {
    return await dbUsers.getUserById(ctx.user.id);
  }),

  /**
   * Client: Get their assigned projects
   */
  clientProjects: clientProcedure.query(async ({ ctx }) => {
    return await dbUsers.getUserProjects(ctx.user.id);
  }),

  /**
   * Any authenticated user: Add comment to project
   */
  addProjectComment: userWriteProcedure
    .input(z.object({
      projectId: z.string(),
      comment: z.string(),
      commentType: z.enum(["remark", "update", "issue", "question", "approval"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const newComment = await dbUsers.addProjectComment(
        input.projectId,
        ctx.user.id,
        input.comment,
        input.commentType || "remark",
        true
      );

      if (!newComment) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add comment',
        });
      }

      return newComment;
    }),

  /**
   * Get project comments (public only for clients)
   */
  getProjectComments: userReadProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const includePrivate = ctx.user.role !== 'client';
      return await dbUsers.getProjectComments(input.projectId, includePrivate);
    }),

  /**
   * Admin: Assign user to project
   */
  assignToProject: adminProcedure
    .input(z.object({
      userId: z.string(),
      projectId: z.string(),
      role: z.enum(["project_manager", "team_lead", "developer", "designer", "qa", "other"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const assignment = await dbUsers.assignUserToProject(
        input.userId,
        input.projectId,
        input.role || "developer"
      );

      if (!assignment) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign user to project',
        });
      }

      return assignment;
    }),

  /**
   * Extended: Assign user to project (allows Project Managers, HR, Admin, Super Admin)
   */
  assignStaffToProject: staffAssignmentProcedure
    .input(z.object({
      userId: z.string(),
      projectId: z.string(),
      role: z.enum(["project_manager", "team_lead", "developer", "designer", "qa", "other"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const assignment = await dbUsers.assignUserToProject(
        input.userId,
        input.projectId,
        input.role || "developer"
      );

      if (!assignment) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign user to project',
        });
      }

      return assignment;
    }),

  /**
   * Admin: Get project team
   */
  getProjectTeam: adminProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return await dbUsers.getProjectTeam(input.projectId);
    }),

  /**
   * Admin: Create staff task
   */
  createStaffTask: adminProcedure
    .input(z.object({
      title: z.string(),
      department: z.string(),
      description: z.string().optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const task = await dbUsers.createStaffTask(
        input.title,
        input.department,
        ctx.user.id,
        input.description,
        input.assignedTo,
        input.priority || "medium",
        input.dueDate
      );

      if (!task) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create task',
        });
      }

      return task;
    }),

  /**
   * Check if user has permission
   */
  hasPermission: userReadProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ input, ctx }) => {
      return await dbUsers.userHasPermission(ctx.user.id, input.permission);
    }),

  /**
   * Any authenticated user: Get their own profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return await dbUsers.getUserById(ctx.user.id);
  }),

  /**
   * Any authenticated user: Update their own profile
   */
  updateMyProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      department: z.string().optional(),
      photoUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: any = { ...input };
        const user = await dbUsers.updateUser(ctx.user.id, updateData);
        
        if (!user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update profile',
          });
        }

        await db.logActivity({
          userId: ctx.user.id,
          action: 'profile_updated',
          entityType: 'user',
          entityId: ctx.user.id,
          description: `Updated own profile`,
        });

        return user;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
    }),

  /**
   * Any authenticated user: Update their password
   */
  updatePassword: userWriteProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await dbUsers.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const success = await dbUsers.updatePassword(ctx.user.id, input.currentPassword, input.newPassword);
      
      if (!success) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Current password is incorrect',
        });
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: 'password_changed',
        entityType: 'user',
        entityId: ctx.user.id,
        description: `Changed password`,
      });

      return { success: true };
    }),

  /**
   * Any authenticated user: Update their notification preferences
   */
  updateNotificationPreferences: userWriteProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      notificationFrequency: z.enum(['instant', 'daily', 'weekly']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const preferences = {
        emailNotifications: input.emailNotifications,
        pushNotifications: input.pushNotifications,
        smsNotifications: input.smsNotifications,
        notificationFrequency: input.notificationFrequency,
      };

      await db.setSetting(
        `${ctx.user.id}_notification_preferences`,
        JSON.stringify(preferences),
        'user_preferences',
        'Notification preferences',
        ctx.user.id
      );

      await db.logActivity({
        userId: ctx.user.id,
        action: 'notification_preferences_updated',
        entityType: 'setting',
        entityId: ctx.user.id,
        description: `Updated notification preferences`,
      });

      return { success: true };
    }),

  /**
   * Any authenticated user: Get their notification preferences
   */
  getNotificationPreferences: userReadProcedure.query(async ({ ctx }) => {
    const setting = await db.getSetting(`${ctx.user.id}_notification_preferences`);
    if (!setting) {
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notificationFrequency: 'instant',
      };
    }
    return JSON.parse(setting.value || '{}');
  }),

  /**
   * Any authenticated user: Update their privacy settings
   */
  updatePrivacySettings: userWriteProcedure
    .input(z.object({
      profileVisibility: z.enum(['public', 'private', 'contacts_only']).optional(),
      showEmail: z.boolean().optional(),
      showPhone: z.boolean().optional(),
      allowDirectMessages: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const settings = {
        profileVisibility: input.profileVisibility,
        showEmail: input.showEmail,
        showPhone: input.showPhone,
        allowDirectMessages: input.allowDirectMessages,
      };

      await db.setSetting(
        `${ctx.user.id}_privacy_settings`,
        JSON.stringify(settings),
        'user_preferences',
        'Privacy settings',
        ctx.user.id
      );

      await db.logActivity({
        userId: ctx.user.id,
        action: 'privacy_settings_updated',
        entityType: 'setting',
        entityId: ctx.user.id,
        description: `Updated privacy settings`,
      });

      return { success: true };
    }),

  /**
   * Any authenticated user: Get their privacy settings
   */
  getPrivacySettings: userReadProcedure.query(async ({ ctx }) => {
    const setting = await db.getSetting(`${ctx.user.id}_privacy_settings`);
    if (!setting) {
      return {
        profileVisibility: 'contacts_only',
        showEmail: false,
        showPhone: false,
        allowDirectMessages: true,
      };
    }
    return JSON.parse(setting.value || '{}');
  }),

  /**
   * Any authenticated user: Upload profile photo (base64)
   */
  uploadProfilePhoto: userWriteProcedure
    .input(z.object({
      photoBase64: z.string().min(1, 'Photo data required'),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate base64 string length (max 5MB when encoded)
      const maxSizeBytes = 5 * 1024 * 1024;
      const sizeInBytes = Buffer.byteLength(input.photoBase64, 'utf8');
      
      if (sizeInBytes > maxSizeBytes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Photo too large (max 5MB)',
        });
      }

      // Validate that it's actually a data URL
      if (!input.photoBase64.startsWith('data:image/')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid image format. Must be a valid image data URL.',
        });
      }

      // Store base64 encoded photo in database
      const user = await dbUsers.updateUser(ctx.user.id, {
        photoUrl: input.photoBase64,
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to store photo in database',
        });
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: 'profile_photo_uploaded',
        entityType: 'user',
        entityId: ctx.user.id,
        description: `Updated profile photo (${(sizeInBytes / 1024).toFixed(2)} KB)`,
      });

      return { success: true, photoUrl: user.photoUrl };
    }),

  /**
   * Any authenticated user: Check if password change is required
   */
  checkPasswordChangeRequired: protectedProcedure.query(async ({ ctx }) => {
    const user = await dbUsers.getUserById(ctx.user.id);
    return {
      requiresPasswordChange: user?.requiresPasswordChange === 1,
      lastPasswordChange: user?.createdAt,
    };
  }),

  /**
   * Any authenticated user: Force change password on first login
   */
  forceChangePassword: protectedProcedure
    .input(z.object({
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await dbUsers.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Hash new password
      const bcrypt = await import("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.newPassword, salt);

      // Update password and clear requiresPasswordChange flag
      const updated = await dbUsers.updateUser(ctx.user.id, {
        passwordHash,
        requiresPasswordChange: 0,
      });

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update password',
        });
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: 'forced_password_changed',
        entityType: 'user',
        entityId: ctx.user.id,
        description: `Changed password on first login`,
      });

      return { success: true };
    }),

  /**
   * Super Admin / ICT Manager: Hard delete inactive user completely
   */
  hardDelete: protectedProcedure
    .use(({ ctx, next }) => {
      if (!['super_admin', 'ict_manager'].includes(ctx.user.role)) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Only Super Admin or ICT Manager can permanently delete users' 
        });
      }
      return next({ ctx });
    })
    .input(z.object({
      userId: z.string(),
      confirmDelete: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.confirmDelete) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirmation required to delete user',
        });
      }

      // Check if user exists
      const user = await dbUsers.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Prevent deleting super_admin users
      if (user.role === 'super_admin' && ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super Admin can delete other Super Admin users',
        });
      }

      // Prevent self-deletion
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete your own user account',
        });
      }

      // Only allow deleting inactive users
      if (user.isActive === 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only inactive users can be permanently deleted. Deactivate user first.',
        });
      }

      // Perform hard delete from database
      const success = await dbUsers.hardDeleteUser(input.userId);
      
      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to permanently delete user',
        });
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: 'user_hard_deleted',
        entityType: 'user',
        entityId: input.userId,
        description: `Permanently deleted user: ${user.name} (${user.email})`,
      });

      return { success: true, message: `User ${user.email} permanently deleted` };
    }),
});

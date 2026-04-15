/**
 * Organization Users Router
 * Handles organization-specific user management with tier-aware limits
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import * as db from "../db";
import { v4 as uuidv4 } from "uuid";

// Procedures with org-scoped access control
const orgUserViewProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.organizationId && ctx.user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization access required'
    });
  }
  return next({ ctx });
});

const orgUserEditProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.organizationId && ctx.user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization admin access required'
    });
  }
  if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin role required to manage users'
    });
  }
  return next({ ctx });
});

/**
 * Get organization's current subscription and user limit
 */
async function getOrgUserLimit(organizationId: string): Promise<{ limit: number; current: number }> {
  try {
    const database = await db.getDb();
    if (!database) return { limit: 10, current: 0 };

    const { organizations, subscriptions, pricingPlans, organizationUsers } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    // Get organization
    const orgRows = await database.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    const org = orgRows[0];

    if (!org) return { limit: 10, current: 0 };

    // If plan is stored directly in org
    if (org.maxUsers && org.maxUsers > 0) {
      const userCount = await database
        .select()
        .from(organizationUsers)
        .where(eq(organizationUsers.organizationId, organizationId));
      return { limit: org.maxUsers, current: userCount.length };
    }

    // Check subscriptions for more detailed limits
    const subRows = await database.select().from(subscriptions).where(eq(subscriptions.clientId, organizationId)).limit(1);
    const subscription = subRows[0];

    if (subscription) {
      const planRows = await database.select().from(pricingPlans).where(eq(pricingPlans.id, subscription.planId)).limit(1);
      const plan = planRows[0];

      if (plan && plan.maxUsers && plan.maxUsers > 0) {
        const userCount = await database
          .select()
          .from(organizationUsers)
          .where(eq(organizationUsers.organizationId, organizationId));
        return { limit: plan.maxUsers, current: userCount.length };
      }
    }

    // Default to free tier limit
    return { limit: 10, current: 0 };
  } catch (error) {
    console.error('Error getting org user limit:', error);
    return { limit: 10, current: 0 };
  }
}

export const organizationUsersRouter = router({
  /**
   * List all users in organization with sorting, filtering, searching
   */
  list: orgUserViewProcedure
    .input(z.object({
      organizationId: z.string().optional(),
      search: z.string().optional(),
      role: z.string().optional(),
      isActive: z.boolean().optional(),
      sortBy: z.enum(['name', 'email', 'role', 'createdAt', 'lastSignedIn']).optional().default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Determine which org to scope to
        const scopedOrgId = ctx.user.role === 'super_admin'
          ? (input.organizationId ?? undefined)
          : ctx.user.organizationId ?? undefined;

        // Non super_admin can only access their own org
        if (ctx.user.role !== 'super_admin' && input.organizationId && input.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only access your organization\'s users'
          });
        }

        const database = await db.getDb();
        if (!database) return { users: [], total: 0, limit: input.limit, offset: input.offset };

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and, like, or, asc, desc } = await import("drizzle-orm");

        // Build where conditions
        const conditions: any[] = [];
        if (scopedOrgId) {
          conditions.push(eq(organizationUsers.organizationId, scopedOrgId));
        }
        if (input.search) {
          conditions.push(or(
            like(organizationUsers.name, `%${input.search}%`),
            like(organizationUsers.email, `%${input.search}%`)
          ));
        }
        if (input.role) {
          conditions.push(eq(organizationUsers.role, input.role as any));
        }
        if (input.isActive !== undefined) {
          conditions.push(eq(organizationUsers.isActive, input.isActive ? 1 : 0));
        }

        const whereClause = conditions.length === 0 ? undefined
          : conditions.length === 1 ? conditions[0]
          : and(...conditions);

        // Apply sorting
        const sortColumn = {
          name: organizationUsers.name,
          email: organizationUsers.email,
          role: organizationUsers.role,
          createdAt: organizationUsers.createdAt,
          lastSignedIn: organizationUsers.lastSignedIn,
        }[input.sortBy] || organizationUsers.createdAt;

        const sortFn = input.sortOrder === 'asc' ? asc : desc;

        let baseQuery: any = database.select().from(organizationUsers);
        if (whereClause) baseQuery = baseQuery.where(whereClause);

        const users = await baseQuery.orderBy(sortFn(sortColumn)).limit(input.limit).offset(input.offset);

        // Count total
        let countQuery: any = database.select().from(organizationUsers);
        if (whereClause) countQuery = countQuery.where(whereClause);
        const allRows = await countQuery;
        const total = allRows.length;

        return {
          users,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error: any) {
        console.error('Error listing org users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to list organization users'
        });
      }
    }),

  /**
   * Get single organization user
   */
  getById: orgUserViewProcedure
    .input(z.object({
      organizationId: z.string(),
      userId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only access your organization\'s users'
          });
        }

        const database = await db.getDb();
        if (!database) return null;

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        const results = await database.select().from(organizationUsers)
          .where(and(
            eq(organizationUsers.id, input.userId),
            eq(organizationUsers.organizationId, input.organizationId)
          ))
          .limit(1);

        return results[0] || null;
      } catch (error: any) {
        console.error('Error getting org user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organization user'
        });
      }
    }),

  /**
   * Create new organization user (invite)
   */
  create: orgUserEditProcedure
    .input(z.object({
      organizationId: z.string(),
      name: z.string().min(1).max(255),
      email: z.string().email(),
      role: z.enum(['super_admin', 'admin', 'manager', 'staff', 'viewer', 'ict_manager', 'project_manager', 'hr', 'accountant', 'procurement_manager', 'sales_manager']).default('staff'),
      position: z.string().optional(),
      department: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only manage users in your organization'
          });
        }

        // Check user limit
        const { limit, current } = await getOrgUserLimit(input.organizationId);
        if (current >= limit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `User limit reached. Your plan allows ${limit} users. Upgrade to add more.`
          });
        }

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Check if email already exists in this organization
        const existingRows = await database.select().from(organizationUsers)
          .where(and(
            eq(organizationUsers.organizationId, input.organizationId),
            eq(organizationUsers.email, input.email)
          ))
          .limit(1);
        const existing = existingRows[0];

        if (existing) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User with this email already exists in the organization'
          });
        }

        const userId = uuidv4();
        
        // Insert user
        await database.insert(organizationUsers).values({
          id: userId,
          organizationId: input.organizationId,
          name: input.name,
          email: input.email,
          role: input.role,
          position: input.position,
          department: input.department,
          phone: input.phone,
          photoUrl: undefined,
          isActive: 1,
          invitationSent: 1,
          invitationSentAt: new Date().toISOString(),
          lastSignedIn: undefined,
          loginCount: 0,
          createdBy: ctx.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);

        return { id: userId };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error creating org user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create organization user'
        });
      }
    }),

  /**
   * Update organization user
   */
  update: orgUserEditProcedure
    .input(z.object({
      organizationId: z.string(),
      userId: z.string(),
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
      role: z.enum(['super_admin', 'admin', 'manager', 'staff', 'viewer', 'ict_manager', 'project_manager', 'hr', 'accountant', 'procurement_manager', 'sales_manager']).optional(),
      position: z.string().optional(),
      department: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only manage users in your organization'
          });
        }

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Build update data
        const updateData: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.role !== undefined) updateData.role = input.role;
        if (input.position !== undefined) updateData.position = input.position;
        if (input.department !== undefined) updateData.department = input.department;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

        await database.update(organizationUsers)
          .set(updateData as any)
          .where(and(
            eq(organizationUsers.id, input.userId),
            eq(organizationUsers.organizationId, input.organizationId)
          ));

        return { success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating org user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update organization user'
        });
      }
    }),

  /**
   * Delete organization user
   */
  delete: orgUserEditProcedure
    .input(z.object({
      organizationId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only manage users in your organization'
          });
        }

        // Prevent deleting self
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete your own user account'
          });
        }

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        await database.delete(organizationUsers)
          .where(and(
            eq(organizationUsers.id, input.userId),
            eq(organizationUsers.organizationId, input.organizationId)
          ));

        return { success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error deleting org user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete organization user'
        });
      }
    }),

  /**
   * Bulk delete organization users
   */
  bulkDelete: orgUserEditProcedure
    .input(z.object({
      organizationId: z.string(),
      userIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only manage users in your organization'
          });
        }

        // Prevent deleting self
        if (input.userIds.includes(ctx.user.id)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete your own user account'
          });
        }

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");

        await database.delete(organizationUsers)
          .where(and(
            eq(organizationUsers.organizationId, input.organizationId),
            inArray(organizationUsers.id, input.userIds)
          ));

        return { success: true, deletedCount: input.userIds.length };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error bulk deleting org users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk delete organization users'
        });
      }
    }),

  /**
   * Bulk update organization users (activate/deactivate/change role)
   */
  bulkUpdate: orgUserEditProcedure
    .input(z.object({
      organizationId: z.string(),
      userIds: z.array(z.string()).min(1),
      isActive: z.boolean().optional(),
      role: z.enum(['super_admin', 'admin', 'manager', 'staff', 'viewer', 'ict_manager', 'project_manager', 'hr', 'accountant', 'procurement_manager', 'sales_manager']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only manage users in your organization'
          });
        }

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");

        const updateData: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
        if (input.role !== undefined) updateData.role = input.role;

        await database.update(organizationUsers)
          .set(updateData as any)
          .where(and(
            eq(organizationUsers.organizationId, input.organizationId),
            inArray(organizationUsers.id, input.userIds)
          ));

        return { success: true, updatedCount: input.userIds.length };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error bulk updating org users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk update organization users'
        });
      }
    }),

  /**
   * Check user limit and get current usage
   */
  getUserLimitInfo: orgUserViewProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify org access
        if (ctx.user.organizationId && ctx.user.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only access your organization\'s information'
          });
        }

        const { limit, current } = await getOrgUserLimit(input.organizationId);
        return {
          limit,
          current,
          remaining: Math.max(0, limit - current),
          isAtLimit: current >= limit,
          upgraded: limit > 10, // Assume free tier is 10 users
        };
      } catch (error: any) {
        console.error('Error getting user limit:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user limit information'
        });
      }
    }),
});

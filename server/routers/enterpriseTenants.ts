/**
 * Enterprise Tenants Management Router
 * Handles multi-tenancy admin operations, tenant management, pricing tiers
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { v4 as uuidv4 } from "uuid";

// Super admin only procedure
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super admin access required'
    });
  }
  return next({ ctx });
});

export const enterpriseTenantsRouter = router({
  /**
   * List all tenants (organizations) with search, filtering, sorting
   */
  list: superAdminProcedure
    .input(z.object({
      search: z.string().optional(),
      tier: z.string().optional(),
      isActive: z.boolean().optional(),
      sortBy: z.enum(['name', 'plan', 'createdAt', 'maxUsers']).optional().default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input }) => {
      try {
        const database = await db.getDb();
        if (!database) return { tenants: [], total: 0 };

        const { organizations, subscriptions, pricingPlans, organizationUsers } = await import("../../drizzle/schema");
        const { eq, like, or, asc, desc, count } = await import("drizzle-orm");

        let query = database.select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          plan: organizations.plan,
          maxUsers: organizations.maxUsers,
          isActive: organizations.isActive,
          domain: organizations.domain,
          contactEmail: organizations.contactEmail,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        }).from(organizations);

        // Apply filters
        if (input.search) {
          query = query.where(
            or(
              like(organizations.name, `%${input.search}%`),
              like(organizations.slug, `%${input.search}%`),
              like(organizations.domain || '', `%${input.search}%`)
            )
          );
        }

        if (input.tier) {
          query = query.where(eq(organizations.plan, input.tier));
        }

        if (input.isActive !== undefined) {
          query = query.where(eq(organizations.isActive, input.isActive ? 1 : 0));
        }

        // Apply sorting
        const sortColumn = {
          name: organizations.name,
          plan: organizations.plan,
          createdAt: organizations.createdAt,
          maxUsers: organizations.maxUsers,
        }[input.sortBy] || organizations.createdAt;

        const sortFn = input.sortOrder === 'asc' ? asc : desc;
        query = query.orderBy(sortFn(sortColumn));

        // Apply pagination
        const tenants = await query.limit(input.limit).offset(input.offset);

        // Get total count
        const totalResult = await database.select({ count: count() }).from(organizations);
        const total = totalResult[0]?.count || 0;

        // Enrich with user count
        const enrichedTenants = await Promise.all(
          tenants.map(async (tenant) => {
            const userCount = await database
              .select({ count: count() })
              .from(organizationUsers)
              .where(eq(organizationUsers.organizationId, tenant.id));
            
            return {
              ...tenant,
              userCount: userCount[0]?.count || 0,
            };
          })
        );

        return {
          tenants: enrichedTenants,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error: any) {
        console.error('Error listing tenants:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to list tenants'
        });
      }
    }),

  /**
   * Get single tenant with detailed subscription info
   */
  getById: superAdminProcedure
    .input(z.string())
    .query(async ({ input: tenantId }) => {
      try {
        const database = await db.getDb();
        if (!database) return null;

        const { organizations, subscriptions, pricingPlans, organizationUsers } = await import("../../drizzle/schema");
        const { eq, count } = await import("drizzle-orm");

        const tenantRows = await database.select().from(organizations).where(eq(organizations.id, tenantId)).limit(1);
        const tenant = tenantRows[0] || null;

        if (!tenant) return null;

        // Get subscriptions
        const tenantSubscriptions = await database.select().from(subscriptions).where(eq(subscriptions.clientId, tenantId));

        // Get active plan from latest subscription
        let activeSubscription = null;
        let activePlan = null;

        if (tenantSubscriptions.length > 0) {
          activeSubscription = tenantSubscriptions.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

          if (activeSubscription) {
            const planRows = await database.select().from(pricingPlans).where(eq(pricingPlans.id, activeSubscription.planId)).limit(1);
            activePlan = planRows[0] || null;
          }
        }

        // Get user count
        const userCountResult = await database
          .select({ count: count() })
          .from(organizationUsers)
          .where(eq(organizationUsers.organizationId, tenantId));

        const userCount = userCountResult[0]?.count || 0;

        return {
          ...tenant,
          activeSubscription,
          activePlan,
          userCount,
          subscriptions: tenantSubscriptions,
        };
      } catch (error: any) {
        console.error('Error getting tenant:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get tenant details'
        });
      }
    }),

  /**
   * Update tenant (organization) details
   */
  update: superAdminProcedure
    .input(z.object({
      tenantId: z.string(),
      name: z.string().min(1).optional(),
      slug: z.string().optional(),
      plan: z.string().optional(),
      maxUsers: z.number().min(1).optional(),
      isActive: z.boolean().optional(),
      domain: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizations } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const updateData: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.slug !== undefined) updateData.slug = input.slug;
        if (input.plan !== undefined) updateData.plan = input.plan;
        if (input.maxUsers !== undefined) updateData.maxUsers = input.maxUsers;
        if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
        if (input.domain !== undefined) updateData.domain = input.domain;
        if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
        if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone;

        await database.update(organizations)
          .set(updateData as any)
          .where(eq(organizations.id, input.tenantId));

        return { success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating tenant:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update tenant'
        });
      }
    }),

  /**
   * Update tenant's pricing tier and user limit
   */
  updatePricingTier: superAdminProcedure
    .input(z.object({
      tenantId: z.string(),
      planId: z.string(),
      maxUsers: z.number().min(1).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          });
        }

        const { organizations, subscriptions, pricingPlans } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Verify plan exists
        const planRows = await database.select().from(pricingPlans).where(eq(pricingPlans.id, input.planId)).limit(1);
        const plan = planRows[0] || null;

        if (!plan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Pricing plan not found'
          });
        }

        // Update organization
        const updateData: Record<string, any> = {
          plan: plan.planSlug,
          maxUsers: input.maxUsers || plan.maxUsers || 10,
          updatedAt: new Date().toISOString(),
        };

        await database.update(organizations)
          .set(updateData as any)
          .where(eq(organizations.id, input.tenantId));

        // Create/update subscription
        const existingSubRows = await database.select().from(subscriptions).where(eq(subscriptions.clientId, input.tenantId)).limit(1);
        const existingSubscription = existingSubRows[0] || null;

        if (existingSubscription) {
          await database.update(subscriptions)
            .set({
              planId: input.planId,
              currentPrice: plan.monthlyPrice as any,
              updatedAt: new Date().toISOString(),
            } as any)
            .where(eq(subscriptions.id, existingSubscription.id));
        } else {
          const subscriptionId = uuidv4();
          const now = new Date();
          const renewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

          await database.insert(subscriptions).values({
            id: subscriptionId,
            clientId: input.tenantId,
            planId: input.planId,
            status: 'active',
            billingCycle: 'monthly',
            startDate: now.toISOString(),
            renewalDate: renewal.toISOString(),
            currentPrice: plan.monthlyPrice as any,
            usersCount: 0,
            projectsCount: 0,
            storageUsedGB: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          } as any);
        }

        return { success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating pricing tier:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update pricing tier'
        });
      }
    }),

  /**
   * Get all available pricing plans/tiers
   */
  getPricingTiers: superAdminProcedure
    .query(async () => {
      try {
        const database = await db.getDb();
        if (!database) return [];

        const { pricingPlans } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const tiers = await database.select().from(pricingPlans)
          .where(eq(pricingPlans.isActive, 1))
          .orderBy(pricingPlans.displayOrder);

        return tiers;
      } catch (error: any) {
        console.error('Error getting pricing tiers:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get pricing tiers'
        });
      }
    }),

  /**
   * Get tenant admins list (users with admin/super_admin role)
   */
  getTenantAdmins: superAdminProcedure
    .input(z.string())
    .query(async ({ input: tenantId }) => {
      try {
        const database = await db.getDb();
        if (!database) return [];

        const { organizationUsers } = await import("../../drizzle/schema");
        const { eq, and, or } = await import("drizzle-orm");

        const admins = await database.select().from(organizationUsers)
          .where(and(
            or(
              eq(organizationUsers.role, 'admin'),
              eq(organizationUsers.role, 'super_admin')
            ),
            eq(organizationUsers.organizationId, tenantId)
          ))
          .orderBy(organizationUsers.createdAt);

        return admins;
      } catch (error: any) {
        console.error('Error getting tenant admins:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get tenant admins'
        });
      }
    }),
});

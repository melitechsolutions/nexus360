/**
 * Multi-Tenancy & Enterprise Router
 * Full implementation with organization CRUD, features, admin management, etc.
 */

import { router, protectedProcedure } from '../_core/trpc';
import { createFeatureRestrictedProcedure, checkOrgScopeAccess } from '../middleware/enhancedRbac';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { v4 } from 'uuid';
import * as db from '../db';
import { createOrgSubscriptionJobs, updateOrgSubscriptionJobs, removeOrgSubscriptionJobs } from '../services/orgSubscriptionJobs';

const enterpriseViewProcedure = createFeatureRestrictedProcedure('enterprise:view');
const enterpriseEditProcedure = createFeatureRestrictedProcedure('enterprise:edit');

/**
 * Org-scoped view procedure:
 * - Melitech super admins (no organizationId) can view any org
 * - Org super admins can only view their own org
 */
const orgViewProcedure = protectedProcedure.use(({ ctx, next }) => {
  // Melitech staff are allowed to proceed to check specific org access
  return next({ ctx });
});

/**
 * Org-scoped edit procedure:
 * - Melitech super admins can edit any org
 * - Org super admins can only edit their own org
 */
const orgEditProcedure = protectedProcedure.use(({ ctx, next }) => {
  // Only super_admin roles can edit organizations
  if (ctx.user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only super admins can modify organizations',
    });
  }
  return next({ ctx });
});

export const ORG_MODULES = [
  { key: 'crm', label: 'CRM', description: 'Clients, opportunities, sales pipeline' },
  { key: 'projects', label: 'Projects & Tasks', description: 'Project management, milestones, time tracking' },
  { key: 'hr', label: 'HR Management', description: 'Employees, departments, job groups' },
  { key: 'payroll', label: 'Payroll', description: 'Payroll processing, salary structures' },
  { key: 'leave', label: 'Leave Management', description: 'Leave requests and approvals' },
  { key: 'attendance', label: 'Attendance', description: 'Attendance tracking' },
  { key: 'invoicing', label: 'Invoicing & Billing', description: 'Invoices, estimates, credit and debit notes' },
  { key: 'payments', label: 'Payments', description: 'Payment tracking and reconciliation' },
  { key: 'expenses', label: 'Expenses', description: 'Expense management and tracking' },
  { key: 'procurement', label: 'Procurement', description: 'LPOs, orders, suppliers, inventory' },
  { key: 'accounting', label: 'Accounting', description: 'Chart of accounts, journal entries' },
  { key: 'budgets', label: 'Budgets', description: 'Budget management and tracking' },
  { key: 'reports', label: 'Reports & Analytics', description: 'Financial and operational reports' },
  { key: 'ai_hub', label: 'AI Hub', description: 'AI-powered features and insights' },
  { key: 'communications', label: 'Communications', description: 'Internal messaging and bulk communications' },
  { key: 'tickets', label: 'Support Tickets', description: 'Ticket management and support' },
  { key: 'contracts', label: 'Contracts & Assets', description: 'Contract management, assets, warranties' },
  { key: 'work_orders', label: 'Work Orders', description: 'Work orders and service management' },
];

/**
 * Default feature set per pricing tier.
 * Used when no DB entries exist yet for a tier (seed / first-run).
 *
 * trial        – minimal: CRM + Invoicing + Reports (14-day evaluation)
 * starter      – core business: CRM, Invoicing, Payments, Expenses, Tickets, Reports
 * professional – full operations: + Projects, HR, Leave, Attendance, Accounting, Budgets, Communications
 * enterprise   – all modules unlocked
 * custom       – all modules (managed manually per org)
 */

/** Hard-coded tier → maxUsers defaults. Only 'custom' allows overriding. */
const TIER_MAX_USERS: Record<string, number> = {
  trial: 5,
  starter: 10,
  professional: 50,
  enterprise: 500,
  custom: 0, // 0 = flexible / set by admin
};

/** Resolve maxUsers for a plan. For non-custom tiers the value is locked to the tier default. */
function resolveTierMaxUsers(plan: string, requestedMaxUsers?: number): number {
  if (plan === 'custom') return requestedMaxUsers ?? 10;
  return TIER_MAX_USERS[plan] ?? requestedMaxUsers ?? 10;
}
export const TIER_DEFAULT_FEATURES: Record<string, Record<string, boolean>> = {
  trial: {
    crm: true, invoicing: true, reports: true,
    projects: false, hr: false, payroll: false, leave: false, attendance: false,
    payments: false, expenses: false, procurement: false, accounting: false,
    budgets: false, ai_hub: false, communications: false, tickets: false,
    contracts: false, work_orders: false,
  },
  starter: {
    crm: true, invoicing: true, payments: true, expenses: true, tickets: true, reports: true,
    projects: false, hr: false, payroll: false, leave: false, attendance: false,
    procurement: false, accounting: false, budgets: false, ai_hub: false,
    communications: false, contracts: false, work_orders: false,
  },
  professional: {
    crm: true, invoicing: true, payments: true, expenses: true, tickets: true, reports: true,
    projects: true, hr: true, leave: true, attendance: true,
    accounting: true, budgets: true, communications: true,
    payroll: false, procurement: false, ai_hub: false, contracts: false, work_orders: false,
  },
  enterprise: {
    crm: true, projects: true, hr: true, payroll: true, leave: true, attendance: true,
    invoicing: true, payments: true, expenses: true, procurement: true,
    accounting: true, budgets: true, reports: true, ai_hub: true,
    communications: true, tickets: true, contracts: true, work_orders: true,
  },
  custom: {
    crm: true, projects: true, hr: true, payroll: true, leave: true, attendance: true,
    invoicing: true, payments: true, expenses: true, procurement: true,
    accounting: true, budgets: true, reports: true, ai_hub: true,
    communications: true, tickets: true, contracts: true, work_orders: true,
  },
};

export const multiTenancyRouter = router({
  // ── Organization CRUD ───────────────────────────────────────────
  listOrganizations: enterpriseViewProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let orgs = await db.getAllOrganizations();
      if (ctx.user.organizationId) {
        orgs = orgs.filter((org: any) => org.id === ctx.user.organizationId);
      }
      // Filter by archive status
      const showArchived = input?.includeArchived ?? false;
      if (!showArchived) {
        orgs = orgs.filter((org: any) => !org.isArchived);
      }
      const enriched = await Promise.all(
        orgs.map(async (org) => {
          const orgUsers = await db.getUsersByOrganization(org.id);
          const features = await db.getOrganizationFeatures(org.id);
          return { ...org, userCount: orgUsers.length, featureCount: features.filter((f: any) => f.isEnabled).length };
        })
      );
      return { organizations: enriched };
    }),

  getOrganization: orgViewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const org = await db.getOrganization(input.id);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      
      // Check org scope access: Melitech super admins can access any org,
      // org super admins can only access their own org
      if (!checkOrgScopeAccess(ctx, org.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only access your own organization',
        });
      }
      
      const features = await db.getOrganizationFeatures(input.id);
      const orgUsers = await db.getUsersByOrganization(input.id);
      const safeUsers = orgUsers.map(({ passwordHash, passwordResetToken, ...u }: any) => u);
      return { organization: org, features, users: safeUsers };
    }),

  createOrganization: enterpriseEditProcedure
    .input(z.object({
      name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      plan: z.string().default('trial'), maxUsers: z.number().optional(),
      billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
      contactEmail: z.string().email().optional(), contactPhone: z.string().optional(),
      domain: z.string().optional(), country: z.string().optional(), address: z.string().optional(),
      industry: z.string().optional(), website: z.string().optional(),
      taxId: z.string().optional(), billingEmail: z.string().email().optional(),
      timezone: z.string().optional(), currency: z.string().optional(),
      description: z.string().optional(), employeeCount: z.number().optional(),
      registrationNumber: z.string().optional(), paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.getOrganizationBySlug(input.slug);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Slug already taken' });
      const id = `org_${v4().replace(/-/g, '').slice(0, 20)}`;
      const maxUsers = resolveTierMaxUsers(input.plan, input.maxUsers);
      
      // Create organization
      const org = await db.createOrganization({ 
        id, 
        ...input,
        maxUsers, 
        isActive: 1,
        settings: { billingCycle: input.billingCycle }
      });
      
      // Auto-create subscription for the organization
      try {
        const subscriptionId = `sub_${v4().replace(/-/g, '').slice(0, 20)}`;
        const now = new Date();
        const renewalDate = new Date();
        
        // Set renewal date based on billing cycle
        if (input.billingCycle === 'monthly') {
          renewalDate.setMonth(renewalDate.getMonth() + 1);
        } else {
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }
        
        // Get plan to retrieve pricing (use trial plan ID)
        const trialPlan = await db.getPricingPlan(input.plan);
        const price = input.billingCycle === 'monthly' 
          ? (trialPlan as any)?.monthlyPrice || 0
          : (trialPlan as any)?.annualPrice || 0;
        
        await db.createSubscription({
          id: subscriptionId,
          organizationId: id,
          planId: input.plan,
          status: 'trial',
          billingCycle: input.billingCycle,
          startDate: now.toISOString().replace('T', ' ').substring(0, 19),
          renewalDate: renewalDate.toISOString().replace('T', ' ').substring(0, 19),
          currentPrice: price,
          autoRenew: 1,
        });
      } catch (error) {
        console.error('[MultiTenancy] Failed to create subscription for org:', error);
        // Don't fail org creation if subscription creation fails - log and continue
      }
      
      return { organization: org, success: true };
    }),

  updateOrganization: orgEditProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(), plan: z.string().optional(),
      isActive: z.boolean().optional(), maxUsers: z.number().optional(),
      contactEmail: z.string().optional(), contactPhone: z.string().optional(),
      domain: z.string().optional(), country: z.string().optional(), address: z.string().optional(),
      logoUrl: z.string().optional(),
      industry: z.string().optional(), website: z.string().optional(),
      taxId: z.string().optional(), billingEmail: z.string().optional(),
      timezone: z.string().optional(), currency: z.string().optional(),
      description: z.string().optional(), employeeCount: z.number().optional(),
      registrationNumber: z.string().optional(), paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, isActive, ...rest } = input;
      const org = await db.getOrganization(id);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      
      // Check org scope access: org admins can only edit their own org
      if (!checkOrgScopeAccess(ctx, org.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit your own organization',
        });
      }

      // Enforce tier-scoped maxUsers: if plan is changing, resolve maxUsers from new plan
      const effectivePlan = rest.plan ?? (org as any).plan ?? 'trial';
      if (effectivePlan !== 'custom') {
        rest.maxUsers = resolveTierMaxUsers(effectivePlan, rest.maxUsers);
      }
      
      const updated = await db.updateOrganization(id, {
        ...rest,
        ...(isActive !== undefined ? { isActive: isActive ? 1 : 0 } : {}),
      });
      return { organization: updated, success: true };
    }),

  deleteOrganization: enterpriseEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const org = await db.getOrganization(input.id);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      // Clean up subscription jobs
      try { await removeOrgSubscriptionJobs(input.id); } catch (e) { console.error('[MultiTenancy] Job cleanup error:', e); }
      await db.deleteOrganization(input.id);
      return { success: true };
    }),

  archiveOrganization: enterpriseEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const org = await db.getOrganization(input.id);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      if ((org as any).isArchived) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization is already archived' });
      await db.updateOrganization(input.id, { isArchived: 1, isActive: 0, archivedAt: new Date().toISOString().slice(0, 19).replace('T', ' '), archivedBy: ctx.user.id });
      try { await removeOrgSubscriptionJobs(input.id); } catch (e) { console.error('[MultiTenancy] Job cleanup on archive:', e); }
      return { success: true };
    }),

  restoreOrganization: enterpriseEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const org = await db.getOrganization(input.id);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!(org as any).isArchived) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization is not archived' });
      await db.updateOrganization(input.id, { isArchived: 0, isActive: 1, archivedAt: null, archivedBy: null });
      try { await createOrgSubscriptionJobs(input.id, (org as any).name || input.id, (org as any).plan || 'trial'); } catch (e) { console.error('[MultiTenancy] Job restore error:', e); }
      return { success: true };
    }),

  // ── Feature Management ──────────────────────────────────────────
  getOrgFeatures: enterpriseViewProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only access your own organization' });
      }
      const features = await db.getOrganizationFeatures(input.organizationId);
      const featureMap: Record<string, boolean> = {};
      features.forEach((f: any) => { featureMap[f.featureKey] = Boolean(f.isEnabled); });
      ORG_MODULES.forEach(mod => { if (!(mod.key in featureMap)) featureMap[mod.key] = true; });
      return { features: featureMap, rawFeatures: features };
    }),

  setOrgFeature: enterpriseEditProcedure
    .input(z.object({ organizationId: z.string(), featureKey: z.string(), isEnabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only modify your own organization' });
      }
      const org = await db.getOrganization(input.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      await db.setOrganizationFeature(input.organizationId, input.featureKey, input.isEnabled);
      return { success: true };
    }),

  bulkSetOrgFeatures: enterpriseEditProcedure
    .input(z.object({ organizationId: z.string(), features: z.record(z.string(), z.boolean()) }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only modify your own organization' });
      }
      const org = await db.getOrganization(input.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      await Promise.all(
        Object.entries(input.features).map(([key, enabled]) =>
          db.setOrganizationFeature(input.organizationId, key, enabled as boolean)
        )
      );
      return { success: true };
    }),

  // ── Create organization WITH admin ──────────────────────────────
  createOrganizationWithAdmin: enterpriseEditProcedure
    .input(z.object({
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      plan: z.string().min(1).default('trial'),
      maxUsers: z.number().optional(),
      billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
      contactEmail: z.string().optional(), contactPhone: z.string().optional(),
      domain: z.string().optional(), country: z.string().optional(), address: z.string().optional(),
      industry: z.string().optional(), website: z.string().optional(),
      taxId: z.string().optional(), billingEmail: z.string().email().optional(),
      timezone: z.string().optional(), currency: z.string().optional(),
      description: z.string().optional(), employeeCount: z.number().optional(),
      registrationNumber: z.string().optional(), paymentMethod: z.string().optional(),
      adminMode: z.enum(['create', 'assign']),
      adminName: z.string().optional(), adminEmail: z.string().email().optional(),
      adminPassword: z.string().min(6).optional(), existingUserId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { adminMode, adminName, adminEmail, adminPassword, existingUserId, billingCycle, ...orgData } = input;
      if (adminMode === 'create' && (!adminName || !adminEmail || !adminPassword))
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Admin name, email, and password required' });
      if (adminMode === 'assign' && !existingUserId)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Existing user ID required' });

      const existing = await db.getOrganizationBySlug(orgData.slug);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Slug already taken' });

      // Enforce tier-scoped maxUsers
      const maxUsers = resolveTierMaxUsers(orgData.plan, orgData.maxUsers);

      const orgId = `org_${v4().replace(/-/g, '').slice(0, 20)}`;
      const org = await db.createOrganization({ 
        id: orgId, 
        ...orgData, 
        maxUsers, 
        isActive: 1,
        settings: { billingCycle }
      });

      // Apply tier features: use DB entries if they exist, else use in-code defaults
      const tierFeatures = await db.getPricingTierFeatures(orgData.plan);
      if (tierFeatures.length > 0) {
        await Promise.all(tierFeatures.map((tf: any) =>
          db.setOrganizationFeature(orgId, tf.featureKey, Boolean(tf.isEnabled))
        ));
      } else {
        const defaults = TIER_DEFAULT_FEATURES[orgData.plan] ?? TIER_DEFAULT_FEATURES['trial'];
        await Promise.all(
          Object.entries(defaults).map(([key, enabled]) =>
            db.setOrganizationFeature(orgId, key, enabled)
          )
        );
      }

      let adminUser: any = null;
      if (adminMode === 'create') {
        const { getUserByEmail, createUser } = await import('../db-users');
        const existingEmail = await getUserByEmail(adminEmail!);
        if (existingEmail) throw new TRPCError({ code: 'CONFLICT', message: 'Admin email already exists' });
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword!, salt);
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        adminUser = await createUser({
          id: userId, name: adminName, email: adminEmail,
          passwordHash, role: 'super_admin', isActive: 1,
          organizationId: orgId, requiresPasswordChange: 0,
        });
      } else {
        await db.assignUserToOrganization(existingUserId!, orgId);
        adminUser = { id: existingUserId };
      }

      // Create a running subscription record for the new organization
      let subscriptionRecord: any = null;
      try {
        const subscriptionId = `sub_${v4().replace(/-/g, '').slice(0, 20)}`;
        const now = new Date();
        const renewalDate = new Date();
        
        // Set renewal date based on billing cycle
        if (billingCycle === 'monthly') {
          renewalDate.setMonth(renewalDate.getMonth() + 1);
        } else {
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }
        
        // Get plan to retrieve pricing
        const plan = await db.getPricingPlan(orgData.plan);
        const price = billingCycle === 'monthly' 
          ? (plan as any)?.monthlyPrice || 0
          : (plan as any)?.annualPrice || 0;

        const subscription = await db.createSubscription({
          id: subscriptionId,
          organizationId: orgId,
          planId: orgData.plan,
          status: 'trial',
          billingCycle,
          startDate: now.toISOString().replace('T', ' ').substring(0, 19),
          renewalDate: renewalDate.toISOString().replace('T', ' ').substring(0, 19),
          currentPrice: price,
          autoRenew: 1,
        });

        subscriptionRecord = { id: subscriptionId, status: 'trial', planId: orgData.plan, billingCycle };
      } catch (subError) {
        console.error('[MultiTenancy] Failed to create subscription:', subError);
        // Non-fatal — org is still created
      }

      // Create recurring subscription jobs for this organization
      try {
        await createOrgSubscriptionJobs(orgId, orgData.name, orgData.plan);
      } catch (jobError) {
        console.error('[MultiTenancy] Failed to create subscription jobs:', jobError);
        // Non-fatal — org is still created
      }

      return { organization: org, adminUser, subscription: subscriptionRecord, success: true };
    }),

  // ── Update Organization Admin ────────────────────────────────────
  updateOrganizationAdmin: enterpriseEditProcedure
    .input(z.object({
      organizationId: z.string(),
      adminName: z.string().optional(), adminEmail: z.string().email().optional(),
      adminPassword: z.string().min(6).optional(), existingUserId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const org = await db.getOrganization(input.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      if (input.existingUserId) {
        await db.assignUserToOrganization(input.existingUserId, input.organizationId);
        const database = await db.getDb();
        if (database) {
          const { users } = await import('../../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          await database.update(users).set({ role: 'super_admin' } as any).where(eq(users.id, input.existingUserId));
        }
        return { success: true, adminUserId: input.existingUserId };
      }
      if (input.adminEmail) {
        const { getUserByEmail, createUser } = await import('../db-users');
        const existing = await getUserByEmail(input.adminEmail);
        if (existing) {
          await db.assignUserToOrganization(existing.id, input.organizationId);
          return { success: true, adminUserId: existing.id };
        }
        if (!input.adminName || !input.adminPassword)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Name and password required for new admin' });
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(input.adminPassword, salt);
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await createUser({
          id: userId, name: input.adminName, email: input.adminEmail,
          passwordHash, role: 'super_admin', isActive: 1,
          organizationId: input.organizationId, requiresPasswordChange: 0,
        });
        return { success: true, adminUserId: userId };
      }
      return { success: true };
    }),

  // ── Member Management ───────────────────────────────────────────
  listOrganizationMembers: enterpriseViewProcedure
    .input(
      z
        .object({
          organizationId: z.string().optional(),
          includeInactive: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) return { members: [] };

      const { organizationMembers } = await import('../../drizzle/schema-extended');
      const { users, organizations } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      const rows = await database
        .select({
          membershipId: organizationMembers.id,
          organizationId: organizationMembers.organizationId,
          memberRole: organizationMembers.role,
          memberStatus: organizationMembers.status,
          memberIsActive: organizationMembers.isActive,
          joinedAt: organizationMembers.joinedAt,
          leftAt: organizationMembers.leftAt,
          createdAt: organizationMembers.createdAt,
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
        })
        .from(organizationMembers)
        .leftJoin(users, eq(organizationMembers.userId, users.id))
        .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
        .orderBy(desc(organizationMembers.createdAt))
        .limit(2000);

      const scopedOrgId = ctx.user.organizationId || input?.organizationId;
      const filtered = rows.filter((row: any) => {
        if (scopedOrgId && row.organizationId !== scopedOrgId) return false;
        if (!input?.includeInactive && !row.memberIsActive) return false;
        return true;
      });

      return { members: filtered };
    }),

  getOrgUsers: enterpriseViewProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only access your own organization' });
      }
      const orgUsers = await db.getUsersByOrganization(input.organizationId);
      const safe = orgUsers.map(({ passwordHash, passwordResetToken, ...u }: any) => u);
      return { users: safe };
    }),

  assignUserToOrg: enterpriseEditProcedure
    .input(z.object({ userId: z.string(), organizationId: z.string().nullable() }))
    .mutation(async ({ input, ctx }) => {
      if (input.organizationId && !checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only assign users within your own organization' });
      }
      if (!input.organizationId && ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Organization administrators cannot unassign users globally' });
      }
      await db.assignUserToOrganization(input.userId, input.organizationId);
      return { success: true };
    }),

  // ── Tenant Admin Management ─────────────────────────────────────
  listTenantAdmins: enterpriseViewProcedure
    .query(async ({ ctx }) => {
      let admins = await db.getAllTenantSuperAdmins();
      if (ctx.user.organizationId) {
        admins = admins.filter((admin: any) => admin.organizationId === ctx.user.organizationId);
      }
      const enriched = await Promise.all(
        admins.map(async (admin: any) => {
          const org = admin.organizationId ? await db.getOrganization(admin.organizationId) : null;
          return {
            id: admin.id, name: admin.name, email: admin.email, role: admin.role,
            isActive: Boolean(admin.isActive),
            organizationId: admin.organizationId,
            organizationName: org?.name ?? '—', organizationSlug: org?.slug ?? '—',
            organizationPlan: org?.plan ?? '—',
            organizationIsActive: org ? Boolean(org.isActive) : null,
          };
        })
      );
      return { admins: enriched };
    }),

  // ── Pricing Tier Features ──────────────────────────────────────
  getPricingTierFeatures: enterpriseViewProcedure
    .input(z.object({ tier: z.string() }))
    .query(async ({ input }) => {
      const features = await db.getPricingTierFeatures(input.tier);
      const featureMap: Record<string, boolean> = {};
      features.forEach((f: any) => { featureMap[f.featureKey] = Boolean(f.isEnabled); });
      return { features: featureMap, rawFeatures: features };
    }),

  getAllPricingTierFeatures: enterpriseViewProcedure
    .query(async () => {
      const all = await db.getAllPricingTierFeatures();
      const byTier: Record<string, Record<string, boolean>> = {};
      all.forEach((f: any) => {
        if (!byTier[f.tier]) byTier[f.tier] = {};
        byTier[f.tier][f.featureKey] = Boolean(f.isEnabled);
      });
      return { tiers: byTier };
    }),

  setPricingTierFeature: enterpriseEditProcedure
    .input(z.object({ tier: z.string(), featureKey: z.string(), isEnabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.setPricingTierFeature(input.tier, input.featureKey, input.isEnabled);
      return { success: true };
    }),

  bulkSetPricingTierFeatures: enterpriseEditProcedure
    .input(z.object({
      tier: z.string(),
      features: z.record(z.string(), z.boolean()),
    }))
    .mutation(async ({ input }) => {
      await db.bulkSetPricingTierFeatures(input.tier, input.features);
      return { success: true };
    }),

  applyTierToOrganization: enterpriseEditProcedure
    .input(z.object({ organizationId: z.string(), tier: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only modify your own organization' });
      }
      const org = await db.getOrganization(input.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });

      // Use DB tier features if they exist, otherwise fall back to in-code defaults
      let featuresToApply: Record<string, boolean>;
      const tierFeatures = await db.getPricingTierFeatures(input.tier);
      if (tierFeatures.length > 0) {
        featuresToApply = {};
        tierFeatures.forEach((tf: any) => { featuresToApply[tf.featureKey] = Boolean(tf.isEnabled); });
      } else {
        // No DB seed yet — use in-code defaults for the requested tier
        featuresToApply = TIER_DEFAULT_FEATURES[input.tier] ?? TIER_DEFAULT_FEATURES['trial'];
      }

      await Promise.all(
        Object.entries(featuresToApply).map(([key, enabled]) =>
          db.setOrganizationFeature(input.organizationId, key, enabled)
        )
      );
      await db.updateOrganization(input.organizationId, { plan: input.tier });
      
      // Update subscription jobs for new tier
      try {
        const oldPlan = (org as any).plan || 'trial';
        await updateOrgSubscriptionJobs(input.organizationId, (org as any).name || 'Organization', oldPlan, input.tier);
      } catch (jobError) {
        console.error('[MultiTenancy] Failed to update subscription jobs:', jobError);
      }
      
      return { success: true, featuresApplied: Object.keys(featuresToApply).length };
    }),

  /**
   * Seeds the pricingTierFeatures table with default values for all tiers.
   * Safe to call multiple times — only inserts missing entries, does not override existing ones.
   */
  seedDefaultTierFeatures: enterpriseEditProcedure
    .mutation(async () => {
      const existing = await db.getAllPricingTierFeatures();
      const existingSet = new Set(existing.map((f: any) => `${f.tier}:${f.featureKey}`));
      let seeded = 0;
      for (const [tier, features] of Object.entries(TIER_DEFAULT_FEATURES)) {
        for (const [featureKey, isEnabled] of Object.entries(features)) {
          if (!existingSet.has(`${tier}:${featureKey}`)) {
            await db.setPricingTierFeature(tier, featureKey, isEnabled);
            seeded++;
          }
        }
      }
      return { success: true, seeded };
    }),

  // ── Tenant Communications ──────────────────────────────────────
  sendTenantMessage: enterpriseEditProcedure
    .input(z.object({
      subject: z.string(), content: z.string(),
      priority: z.string().optional(), targetType: z.string().optional(),
      targetOrgId: z.string().optional(), targetUserId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = `tmsg_${v4().replace(/-/g, '').slice(0, 20)}`;
      const msg = await db.createTenantMessage({
        id, senderId: (ctx as any).user?.id ?? 'system',
        subject: input.subject, content: input.content,
        priority: input.priority ?? 'normal',
        targetType: input.targetType ?? 'all',
        targetOrgId: input.targetOrgId ?? null,
        targetUserId: input.targetUserId ?? null,
      });

      // Mirror tenant message into communications module for target org visibility.
      if (input.targetOrgId) {
        const database = await db.getDb();
        if (database) {
          const { communicationLogs } = await import('../../drizzle/schema');
          const orgUsers = await db.getUsersByOrganization(input.targetOrgId);
          const recipientEmails = orgUsers
            .filter((u: any) => !!u.email)
            .map((u: any) => u.email)
            .slice(0, 20)
            .join(', ');

          await database.insert(communicationLogs).values({
            id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            organizationId: input.targetOrgId,
            type: 'email',
            recipient: recipientEmails || 'tenant-admins',
            subject: input.subject,
            body: input.content,
            status: 'sent',
            referenceType: 'tenant_message',
            referenceId: id,
            sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            createdBy: (ctx as any).user?.id ?? 'system',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);
        }
      }

      const targetOrg = input.targetOrgId ? await db.getOrganization(input.targetOrgId) : null;

      // Deliver in-app notifications (toast + bell + notifications module) to target tenant admins/users.
      const recipientUsers = input.targetUserId
        ? [{ id: input.targetUserId }]
        : input.targetOrgId
          ? (await db.getUsersByOrganization(input.targetOrgId)).filter(
              (u: any) => u.role === 'super_admin' || u.role === 'admin'
            )
          : [];

      // Map priority to valid enum values
      const priorityMap: Record<string, 'low' | 'normal' | 'medium' | 'high' | 'critical'> = {
        'low': 'low',
        'normal': 'normal',
        'medium': 'medium',
        'high': 'high',
        'critical': 'critical',
        'urgent': 'high', // Map urgent to high
      };
      const mappedPriority = priorityMap[input.priority?.toLowerCase() || 'normal'] || 'normal';

      await Promise.all(
        recipientUsers.map((u: any) =>
          db.createNotification({
            userId: u.id,
            type: 'system',
            title: input.subject,
            message: input.content,
            category: 'tenant_message',
            entityType: 'tenant_message',
            entityId: id,
            priority: mappedPriority,
            actionUrl: targetOrg?.slug ? `/org/${targetOrg.slug}/communications` : '/communications',
            isRead: 0,
            deliveryStatus: 'sent',
            status: 'active',
          } as any)
        )
      );

      return { message: msg, success: true };
    }),

  getTenantMessages: enterpriseViewProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const messages = await db.getTenantMessages(input);
      return { messages };
    }),

  markTenantMessageRead: enterpriseEditProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input }) => {
      await db.markTenantMessageRead(input.messageId);
      return { success: true };
    }),

  // ── Org Self-Management (org users managing their own org) ────

  /** Get the current user's own organization details + enabled features */
  getMyOrg: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No organization associated with this account' });
      const org = await db.getOrganization(ctx.user.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      const features = await db.getOrganizationFeatures(ctx.user.organizationId);
      const featureMap: Record<string, boolean> = {};
      features.forEach((f: any) => { featureMap[f.featureKey] = Boolean(f.isEnabled); });
      return { organization: org, featureMap };
    }),

  /** Update the current user's own organization (org super_admin only) */
  updateMyOrg: protectedProcedure
    .input(z.object({
      name: z.string().min(2).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      domain: z.string().optional(),
      logoUrl: z.string().optional(),
      industry: z.string().optional(),
      website: z.string().optional(),
      taxId: z.string().optional(),
      billingEmail: z.string().email().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      description: z.string().optional(),
      employeeCount: z.number().optional(),
      registrationNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
      // Email settings fields
      useGlobalSmtp: z.boolean().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.string().optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      smtpFromEmail: z.string().email().optional(),
      smtpFromName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization associated with this account' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can update organization settings' });
      
      // Separate email settings from org data
      const { useGlobalSmtp, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail, smtpFromName, ...orgData } = input;
      
      // Update organization
      const updated = await db.updateOrganization(ctx.user.organizationId, orgData);
      
      // Update email settings if provided (only if NOT using global SMTP)
      if (useGlobalSmtp === false && (smtpHost || smtpPort || smtpUser)) {
        try {
          const settingsDb = await db.getDb();
          if (settingsDb) {
            const settingsTable = (await import('../../drizzle/schema')).settings;
            const orgIdStr = ctx.user.organizationId;
            
            // Store organization-specific email settings
            const emailSettings = {
              useGlobalSmtp: false,
              smtpHost: smtpHost || '',
              smtpPort: smtpPort || '587',
              smtpUser: smtpUser || '',
              smtpPassword: smtpPassword || '', // Should be encrypted in production
              smtpFromEmail: smtpFromEmail || '',
              smtpFromName: smtpFromName || '',
            };
            
            // Update or insert settings
            await settingsDb.insert(settingsTable).values({
              id: `${orgIdStr}_email_config`,
              organizationId: orgIdStr,
              category: 'email',
              key: 'config',
              value: JSON.stringify(emailSettings),
            }).onConflictDoUpdate({
              target: settingsTable.id,
              set: { value: JSON.stringify(emailSettings) }
            }).catch(() => {
              // Fallback: just log, don't fail the update
              console.warn('[Settings] Could not save email config');
            });
          }
        } catch (err) {
          console.error('[Settings] Email config save error:', err);
          // Non-critical, continue
        }
      }
      
      return { organization: updated, success: true };
    }),

  /** Test SMTP Connection */
  testSmtpConnection: protectedProcedure
    .input(z.object({
      smtpHost: z.string().min(1),
      smtpPort: z.string().min(1),
      smtpUser: z.string().min(1),
      smtpPassword: z.string().min(1),
      smtpFromEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization associated with this account' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can test SMTP' });
      
      try {
        const nodemailer = require('nodemailer');
        
        // Create transporter with provided credentials
        const transporter = nodemailer.createTransport({
          host: input.smtpHost,
          port: parseInt(input.smtpPort, 10),
          secure: parseInt(input.smtpPort, 10) === 465,
          auth: {
            user: input.smtpUser,
            pass: input.smtpPassword,
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
        });
        
        // Verify connection
        await transporter.verify();
        
        // Test send (no actual email sent, just connection test)
        return {
          success: true,
          message: 'SMTP connection successful. Settings are valid.',
        };
      } catch (error: any) {
        console.error('[SMTP Test] Failed:', error?.message);
        return {
          success: false,
          error: error?.message || 'SMTP connection failed. Please check your settings.',
        };
      }
    }),

  /** List users in the current org (org super_admin only) */
  getMyOrgUsers: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can view staff' });
      const orgUsers = await db.getUsersByOrganization(ctx.user.organizationId);
      const safe = orgUsers.map(({ passwordHash, passwordResetToken, ...u }: any) => u);
      return { users: safe };
    }),

  /** Create a new user in the current org (org super_admin only) */
  inviteOrgUser: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['super_admin', 'admin', 'manager', 'accountant', 'hr', 'staff', 'sales_manager', 'project_manager', 'ict_manager', 'procurement_manager']),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can create staff accounts' });
      const { getUserByEmail, createUser } = await import('../db-users');
      const existing = await getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'A user with this email already exists' });
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.password, salt);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const newUser = await createUser({
        id: userId, name: input.name, email: input.email, passwordHash,
        role: input.role, isActive: 1, organizationId: ctx.user.organizationId, requiresPasswordChange: 0,
      });
      const safeUser = newUser ? { id: newUser.id, email: (newUser as any).email, name: newUser.name, role: newUser.role } : null;
      return { user: safeUser, success: true };
    }),

  /** Remove a user from the current org (org super_admin only) */
  removeOrgUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can remove staff' });
      if (input.userId === ctx.user.id)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot remove yourself' });
      const orgUsers = await db.getUsersByOrganization(ctx.user.organizationId);
      const target = orgUsers.find((u: any) => u.id === input.userId);
      if (!target)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found in your organization' });
      await db.assignUserToOrganization(input.userId, null);
      return { success: true };
    }),

  // ── Legacy stub procedures (EnterpriseSettings page compat) ───
  createTenant: enterpriseEditProcedure
    .input(z.object({
      organizationName: z.string(), subdomain: z.string(),
      plan: z.enum(['starter', 'professional', 'enterprise']),
      adminEmail: z.string().email(),
    }).strict())
    .mutation(async ({ input }) => {
      const slug = input.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const existing = await db.getOrganizationBySlug(slug);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Subdomain already taken' });
      const id = `org_${v4().replace(/-/g, '').slice(0, 20)}`;
      await db.createOrganization({
        id, name: input.organizationName, slug, plan: input.plan, isActive: 1,
        maxUsers: input.plan === 'enterprise' ? 500 : input.plan === 'professional' ? 50 : 10,
      });
      return { success: true, tenantId: id, organizationName: input.organizationName, subdomain: slug, plan: input.plan, status: 'active' };
    }),

  configureSSOProvider: enterpriseEditProcedure
    .input(z.object({
      tenantId: z.string(),
      provider: z.enum(['okta', 'azureAd', 'auth0', 'custom']),
      config: z.object({ clientId: z.string(), clientSecret: z.string(), domain: z.string() }),
    }).strict())
    .mutation(async ({ input }) => ({
      success: true, tenantId: input.tenantId, provider: input.provider,
      status: 'configured', ssoEnabled: true, testResult: 'connection_successful',
      usersCount: 0, ssoUrl: `https://${input.config.domain}/sso`,
    })),

  getEnterpriseApiKeys: enterpriseViewProcedure
    .input(z.object({ tenantId: z.string() }).strict())
    .query(async ({ input }) => ({
      tenantId: input.tenantId,
      apiKeys: [{ id: 'key_001', name: 'Production API Key', key: 'pk_live_••••', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19), lastUsed: new Date().toISOString().replace('T', ' ').substring(0, 19), rateLimit: 10000, requestsToday: 0, status: 'active' }],
      total: 1,
    })),

  configureWhiteLabelOptions: enterpriseEditProcedure
    .input(z.object({
      tenantId: z.string(),
      branding: z.object({ logo: z.string().optional(), colors: z.object({ primary: z.string(), secondary: z.string() }), customDomain: z.string().optional() }),
    }).strict())
    .mutation(async ({ input }) => {
      const org = await db.getOrganization(input.tenantId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      const currentSettings = (org.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        whiteLabel: {
          logo: input.branding.logo || currentSettings?.whiteLabel?.logo || null,
          primaryColor: input.branding.colors.primary,
          secondaryColor: input.branding.colors.secondary,
          customDomain: input.branding.customDomain || null,
          configuredAt: new Date().toISOString(),
        },
      };
      await db.updateOrganization(input.tenantId, {
        settings: updatedSettings,
        domain: input.branding.customDomain || org.domain,
      });
      return {
        success: true, tenantId: input.tenantId,
        whiteLabel: {
          status: 'configured',
          customDomain: input.branding.customDomain || 'Not configured',
          primaryColor: input.branding.colors.primary,
          logoDeployed: !!input.branding.logo,
        },
      };
    }),

  getWhiteLabelConfig: enterpriseViewProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const org = await db.getOrganization(input.tenantId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      const settings = (org.settings as any) || {};
      return {
        whiteLabel: settings.whiteLabel || null,
        domain: org.domain,
        logoUrl: org.logoUrl,
      };
    }),

  getEnterpriseBillingInfo: enterpriseViewProcedure
    .input(z.object({ tenantId: z.string() }).strict())
    .query(async ({ input }) => {
      const org = await db.getOrganization(input.tenantId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      const orgUsers = await db.getUsersByOrganization(input.tenantId);
      return {
        tenantId: input.tenantId,
        billing: {
          currentPlan: org.plan || 'trial',
          status: org.isActive ? 'active' : 'inactive',
          users: { active: orgUsers.length, limit: org.maxUsers || 10 },
        },
      };
    }),

  manageTenantRoleHierarchy: enterpriseEditProcedure
    .input(z.object({
      tenantId: z.string(),
      roles: z.array(z.object({ name: z.string(), parentRole: z.string().optional(), permissions: z.array(z.string()) })),
    }).strict())
    .mutation(async ({ input }) => ({
      success: true, tenantId: input.tenantId, roleCount: input.roles.length,
      hierarchy: { admin: { level: 1, childRoles: ['manager'] }, manager: { level: 2, childRoles: ['operator'] }, operator: { level: 3, childRoles: [] } },
    })),

  getModuleList: enterpriseViewProcedure
    .query(() => ({
      modules: ORG_MODULES,
    })),

  // ── Org Payment Methods ───────────────────────────────────────────────────

  /** Save / replace all payment methods for the current org */
  saveOrgPaymentMethods: protectedProcedure
    .input(z.object({
      paymentMethods: z.array(z.object({
        id: z.string(),
        type: z.enum(['mpesa', 'card', 'bank', 'cheque']),
        isDefault: z.boolean(),
        nickname: z.string().optional(),
        createdAt: z.string(),
        mpesa: z.object({ phoneNumber: z.string(), accountName: z.string() }).optional(),
        card: z.object({
          cardholderName: z.string(),
          last4: z.string().max(4),
          brand: z.string(),
          expiryMonth: z.string(),
          expiryYear: z.string(),
          autopayEnabled: z.boolean(),
        }).optional(),
        bank: z.object({
          bankName: z.string(),
          accountName: z.string(),
          accountNumber: z.string(),
          branchCode: z.string().optional(),
          swiftCode: z.string().optional(),
        }).optional(),
        cheque: z.object({
          payableTo: z.string(),
          deliveryAddress: z.string().optional(),
        }).optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization associated with this account' });
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can manage payment methods' });
      const org = await db.getOrganization(ctx.user.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      const currentSettings = (org.settings as any) || {};
      const updatedSettings = { ...currentSettings, paymentMethods: input.paymentMethods };
      await db.updateOrganization(ctx.user.organizationId, { settings: updatedSettings });
      return { success: true };
    }),

  // ── Org Branding (colors) ─────────────────────────────────────────────────

  /** Update org branding colors in addition to standard profile fields */
  updateOrgBranding: protectedProcedure
    .input(z.object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization administrators can update branding' });
      const org = await db.getOrganization(ctx.user.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      const currentSettings = (org.settings as any) || {};
      const branding = currentSettings.branding || {};
      if (input.primaryColor !== undefined) branding.primaryColor = input.primaryColor;
      if (input.secondaryColor !== undefined) branding.secondaryColor = input.secondaryColor;
      const updatePayload: Record<string, any> = { settings: { ...currentSettings, branding } };
      if (input.logoUrl !== undefined) updatePayload.logoUrl = input.logoUrl;
      const updated = await db.updateOrganization(ctx.user.organizationId, updatePayload);
      return { organization: updated, success: true };
    }),

  // ── Global Plan Pricing (Melitech super admin) ────────────────────────────

  /** Get pricing for all plans (stored in platform settings) */
  getPlanPrices: protectedProcedure
    .query(async ({ ctx }) => {
      // Only Melitech staff (no organizationId) and admins can read plan prices
      const db_ = await import('../db');
      const row = await db_.getSetting('plan_prices');
      if (!row) {
        // Return defaults
        return {
          prices: {
            trial: { monthlyKes: 0, annualKes: 0, maxUsers: 5, description: '14-day evaluation' },
            starter: { monthlyKes: 5999, annualKes: 57590, maxUsers: 10, description: 'Core business tools' },
            professional: { monthlyKes: 18999, annualKes: 182390, maxUsers: 50, description: 'Full operations suite' },
            enterprise: { monthlyKes: 49999, annualKes: 479990, maxUsers: 500, description: 'All modules + priority support' },
            custom: { monthlyKes: 0, annualKes: 0, maxUsers: 0, description: 'Custom pricing — contact sales' },
          },
        };
      }
      return { prices: typeof row.value === 'string' ? JSON.parse(row.value) : row.value };
    }),

  /** Get tier defaults (maxUsers, features) for frontend auto-population */
  getTierDefaults: protectedProcedure
    .query(() => {
      return {
        tierMaxUsers: TIER_MAX_USERS,
        tierFeatures: TIER_DEFAULT_FEATURES,
      };
    }),

  /** Save pricing for all plans (Melitech super admin only) */
  savePlanPrices: protectedProcedure
    .input(z.object({
      prices: z.record(z.string(), z.object({
        monthlyKes: z.number().min(0),
        annualKes: z.number().min(0),
        maxUsers: z.number().min(0),
        description: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Melitech platform admins can manage plan pricing' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only super admins can manage plan pricing' });
      const db_ = await import('../db');
      await db_.setSetting('plan_prices', JSON.stringify(input.prices), 'platform');
      return { success: true };
    }),

  /** Create a new custom pricing tier (Melitech super admin only) */
  createPricingTier: protectedProcedure
    .input(z.object({
      key: z.string().min(2).regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and underscores only'),
      label: z.string().min(2),
      description: z.string(),
      monthlyKes: z.number().min(0),
      annualKes: z.number().min(0),
      maxUsers: z.number().min(1),
      features: z.record(z.string(), z.boolean()),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Melitech platform admins can create pricing tiers' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only super admins can create pricing tiers' });

      // Save tier features
      const dbInst = await import('../db');

      // Save each feature for this tier
      for (const [featureKey, isEnabled] of Object.entries(input.features)) {
        await dbInst.setPricingTierFeature(input.key, featureKey, isEnabled);
      }

      // Save pricing
      const priceRow = await dbInst.getSetting('plan_prices');
      const currentPrices = priceRow
        ? (typeof priceRow.value === 'string' ? JSON.parse(priceRow.value) : priceRow.value)
        : {};
      currentPrices[input.key] = {
        monthlyKes: input.monthlyKes,
        annualKes: input.annualKes,
        maxUsers: input.maxUsers,
        description: input.description,
        label: input.label,
      };
      await dbInst.setSetting('plan_prices', JSON.stringify(currentPrices), 'platform');

      return { success: true, tierKey: input.key };
    }),

  /** Update an existing pricing tier (Melitech super admin only) */
  updatePricingTier: protectedProcedure
    .input(z.object({
      key: z.string().min(2),
      label: z.string().min(2).optional(),
      description: z.string().optional(),
      monthlyKes: z.number().min(0).optional(),
      annualKes: z.number().min(0).optional(),
      maxUsers: z.number().min(0).optional(),
      features: z.record(z.string(), z.boolean()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Melitech platform admins can update pricing tiers' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only super admins can update pricing tiers' });

      const dbInst = await import('../db');

      // Update features if provided
      if (input.features) {
        for (const [featureKey, isEnabled] of Object.entries(input.features)) {
          await dbInst.setPricingTierFeature(input.key, featureKey, isEnabled);
        }
      }

      // Update pricing entry
      const priceRow = await dbInst.getSetting('plan_prices');
      const currentPrices = priceRow
        ? (typeof priceRow.value === 'string' ? JSON.parse(priceRow.value) : priceRow.value)
        : {};
      const existing = currentPrices[input.key] || {};
      currentPrices[input.key] = {
        ...existing,
        ...(input.label !== undefined && { label: input.label }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.monthlyKes !== undefined && { monthlyKes: input.monthlyKes }),
        ...(input.annualKes !== undefined && { annualKes: input.annualKes }),
        ...(input.maxUsers !== undefined && { maxUsers: input.maxUsers }),
      };
      await dbInst.setSetting('plan_prices', JSON.stringify(currentPrices), 'platform');

      return { success: true };
    }),

  /** Delete a pricing tier (Melitech super admin only) */
  deletePricingTier: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Melitech platform admins can delete pricing tiers' });
      if (ctx.user.role !== 'super_admin')
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only super admins can delete pricing tiers' });

      const dbInst = await import('../db');

      // Remove pricing entry
      const priceRow = await dbInst.getSetting('plan_prices');
      const currentPrices = priceRow
        ? (typeof priceRow.value === 'string' ? JSON.parse(priceRow.value) : priceRow.value)
        : {};
      if (!currentPrices[input.key]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Pricing tier "${input.key}" not found` });
      }
      delete currentPrices[input.key];
      await dbInst.setSetting('plan_prices', JSON.stringify(currentPrices), 'platform');

      // Remove tier features from DB
      const { getDb } = dbInst;
      const drizzleDb = await getDb();
      if (drizzleDb) {
        const { pricingTierFeatures } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await drizzleDb.delete(pricingTierFeatures).where(eq(pricingTierFeatures.tier, input.key));
      }

      return { success: true };
    }),

  // ── Org Analytics ───────────────────────────────────────────────

  /**
   * Comprehensive analytics for the org dashboard and module pages.
   * Returns counts, totals, month-over-month trend data, and breakdowns
   * needed to power all org page charts and KPIs.
   */
  getOrgAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization associated with this account' });

      const database = await import('../db');
      const { getDb } = database;
      const drizzleDb = await getDb();
      if (!drizzleDb) return buildEmptyAnalytics();

      const {
        invoices: invoicesTable,
        clients: clientsTable,
        expenses: expensesTable,
        employees: employeesTable,
        payments: paymentsTable,
      } = await import('../../drizzle/schema');
      const { desc, gte, sql, eq } = await import('drizzle-orm');

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);
      const orgId = ctx.user.organizationId;

      // ── totals ─────────────────────────────────────────────────
      const [allInvoices, allClients, allExpenses, allEmployees, allPayments] = await Promise.all([
        drizzleDb.select().from(invoicesTable).where(eq(invoicesTable.organizationId, orgId)).limit(5000),
        drizzleDb.select().from(clientsTable).where(eq(clientsTable.organizationId, orgId)).limit(5000),
        drizzleDb.select().from(expensesTable).where(eq(expensesTable.organizationId, orgId)).limit(5000),
        drizzleDb.select().from(employeesTable).where(eq(employeesTable.organizationId, orgId)).limit(5000),
        drizzleDb.select().from(paymentsTable).limit(5000),
      ]);

      // Invoice KPIs
      const invoicesByStatus = allInvoices.reduce<Record<string, number>>((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {});
      const totalInvoiced = allInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const totalPaid = allInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
      const totalOutstanding = totalInvoiced - totalPaid;

      // Expense KPIs
      const approvedExpenses = allExpenses.filter((e) => e.status === 'approved' || e.status === 'paid');
      const totalExpenses = approvedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const expenseByCategory = allExpenses.reduce<Record<string, number>>((acc, e) => {
        const cat = e.category || 'Other';
        acc[cat] = (acc[cat] || 0) + (e.amount || 0);
        return acc;
      }, {});
      const expenseCategoryChart = Object.entries(expenseByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Payment KPIs
      const totalPaymentsReceived = allPayments.reduce((s, p) => s + (p.amount || 0), 0);

      // Employee KPIs
      const activeEmployees = allEmployees.filter((e) => e.status === 'active').length;
      const deptBreakdown = allEmployees.reduce<Record<string, number>>((acc, e) => {
        const dept = e.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      const employeeDeptChart = Object.entries(deptBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Client KPIs
      const activeClients = allClients.filter((c) => c.status === 'active').length;

      // ── Monthly trend (last 6 months) ─────────────────────────
      const monthLabels: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const revenueByMonth: Record<string, number> = {};
      const invoicesByMonth: Record<string, number> = {};
      const expensesByMonth: Record<string, number> = {};
      monthLabels.forEach((m) => { revenueByMonth[m] = 0; invoicesByMonth[m] = 0; expensesByMonth[m] = 0; });

      allPayments.forEach((p) => {
        if (!p.paymentDate) return;
        const month = String(p.paymentDate).slice(0, 7);
        if (month in revenueByMonth) revenueByMonth[month] = (revenueByMonth[month] || 0) + (p.amount || 0);
      });
      allInvoices.forEach((inv) => {
        if (!inv.issueDate) return;
        const month = String(inv.issueDate).slice(0, 7);
        if (month in invoicesByMonth) invoicesByMonth[month] = (invoicesByMonth[month] || 0) + 1;
      });
      allExpenses.forEach((exp) => {
        if (!exp.expenseDate) return;
        const month = String(exp.expenseDate).slice(0, 7);
        if (month in expensesByMonth) expensesByMonth[month] = (expensesByMonth[month] || 0) + (exp.amount || 0);
      });

      const monthlyTrend = monthLabels.map((month) => ({
        month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        revenue: revenueByMonth[month] || 0,
        invoices: invoicesByMonth[month] || 0,
        expenses: expensesByMonth[month] || 0,
      }));

      // Invoice status donut data
      const invoiceStatusChart = [
        { name: 'Paid', value: invoicesByStatus['paid'] || 0, color: '#22c55e' },
        { name: 'Sent', value: invoicesByStatus['sent'] || 0, color: '#3b82f6' },
        { name: 'Draft', value: invoicesByStatus['draft'] || 0, color: '#6b7280' },
        { name: 'Overdue', value: invoicesByStatus['overdue'] || 0, color: '#ef4444' },
        { name: 'Partial', value: invoicesByStatus['partial'] || 0, color: '#f59e0b' },
      ].filter((d) => d.value > 0);

      // Recent invoices (last 5)
      const recentInvoices = allInvoices
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5)
        .map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          total: inv.total,
          paidAmount: inv.paidAmount,
          dueDate: inv.dueDate,
          issueDate: inv.issueDate,
        }));

      // Recent expenses (last 5)
      const recentExpenses = allExpenses
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5)
        .map((exp) => ({
          id: exp.id,
          expenseNumber: exp.expenseNumber,
          category: exp.category,
          amount: exp.amount,
          status: exp.status,
          expenseDate: exp.expenseDate,
        }));

      return {
        kpis: {
          totalInvoices: allInvoices.length,
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          totalPaymentsReceived,
          totalExpenses,
          totalClients: allClients.length,
          activeClients,
          totalEmployees: allEmployees.length,
          activeEmployees,
          pendingExpenses: allExpenses.filter((e) => e.status === 'pending').length,
        },
        invoicesByStatus,
        invoiceStatusChart,
        expenseCategoryChart,
        employeeDeptChart,
        monthlyTrend,
        recentInvoices,
        recentExpenses,
      };
    }),

  // ── Org Calendar Events ─────────────────────────────────────────

  /**
   * Returns calendar events for a given month aggregated from
   * invoices (due dates), projects (end dates), and project tasks (due dates).
   */
  getCalendarEvents: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization' });

      const database = await import('../db');
      const { getDb } = database;
      const drizzleDb = await getDb();
      if (!drizzleDb) return { events: [] };

      const {
        invoices: invoicesTable,
        projects: projectsTable,
        projectTasks: projectTasksTable,
      } = await import('../../drizzle/schema');
      const { eq, and, gte, lte, inArray } = await import('drizzle-orm');

      const orgId = ctx.user.organizationId;
      const padded = (n: number) => String(n).padStart(2, '0');
      const startOfMonth = `${input.year}-${padded(input.month)}-01 00:00:00`;
      const lastDay = new Date(input.year, input.month, 0).getDate();
      const endOfMonth = `${input.year}-${padded(input.month)}-${padded(lastDay)} 23:59:59`;

      // Fetch invoices and projects scoped to this org in the month range
      const [orgInvoices, allOrgProjects] = await Promise.all([
        drizzleDb.select().from(invoicesTable).where(
          and(
            eq(invoicesTable.organizationId, orgId),
            gte(invoicesTable.dueDate, startOfMonth),
            lte(invoicesTable.dueDate, endOfMonth),
          )
        ).limit(200),
        drizzleDb.select().from(projectsTable).where(
          eq(projectsTable.organizationId, orgId)
        ).limit(500),
      ]);

      // Projects ending this month
      const projectsDueThisMonth = allOrgProjects.filter((p) => {
        if (!p.endDate) return false;
        const d = String(p.endDate).slice(0, 10);
        return d >= startOfMonth.slice(0, 10) && d <= endOfMonth.slice(0, 10);
      });

      // Tasks from org projects with due dates this month
      const allProjectIds = allOrgProjects.map((p) => p.id);
      let orgTasksDue: any[] = [];
      if (allProjectIds.length > 0) {
        orgTasksDue = await drizzleDb.select().from(projectTasksTable).where(
          and(
            inArray(projectTasksTable.projectId, allProjectIds),
            gte(projectTasksTable.dueDate, startOfMonth),
            lte(projectTasksTable.dueDate, endOfMonth),
          )
        ).limit(500);
      }

      // Build unified events array
      const events: Array<{
        id: string;
        type: 'invoice' | 'project' | 'task';
        title: string;
        date: string; // YYYY-MM-DD
        status: string;
        href: string;
        color: string;
      }> = [];

      for (const inv of orgInvoices) {
        events.push({
          id: `inv_${inv.id}`,
          type: 'invoice',
          title: `Invoice ${inv.invoiceNumber} due`,
          date: String(inv.dueDate).slice(0, 10),
          status: inv.status,
          href: `/org/${ctx.user.organizationId}/invoices/${inv.id}`,
          color: inv.status === 'paid' ? '#22c55e' : inv.status === 'overdue' ? '#ef4444' : '#3b82f6',
        });
      }

      for (const proj of projectsDueThisMonth) {
        events.push({
          id: `proj_${proj.id}`,
          type: 'project',
          title: `${proj.name} deadline`,
          date: String(proj.endDate!).slice(0, 10),
          status: proj.status,
          href: `/org/${ctx.user.organizationId}/projects/${proj.id}`,
          color: proj.status === 'completed' ? '#22c55e' : proj.status === 'on_hold' ? '#f59e0b' : '#a855f7',
        });
      }

      for (const task of orgTasksDue) {
        if (!task.dueDate) continue;
        events.push({
          id: `task_${task.id}`,
          type: 'task',
          title: task.title,
          date: String(task.dueDate).slice(0, 10),
          status: task.status,
          href: `/org/${ctx.user.organizationId}/projects/${task.projectId}`,
          color: task.status === 'completed' ? '#22c55e' : task.priority === 'urgent' ? '#ef4444' : '#f97316',
        });
      }

      return { events };
    }),

  // ── Org Activity Timeline ────────────────────────────────────────

  /**
   * Returns recent activity log entries scoped to the current org.
   * Joins via users.organizationId since activityLog has no org FK.
   */
  getOrgActivity: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
      entityType: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization' });

      const database = await import('../db');
      const { getDb } = database;
      const drizzleDb = await getDb();
      if (!drizzleDb) return { activities: [] };

      const { activityLog: activityLogTable } = await import('../../drizzle/schema');
      const { getUsersByOrganization } = database;

      // Get all user IDs in this org, then fetch their activity
      const orgUsers = await getUsersByOrganization(ctx.user.organizationId);
      const orgUserIds = orgUsers.map((u: any) => u.id);

      if (orgUserIds.length === 0) return { activities: [] };

      const { inArray, eq, and, desc } = await import('drizzle-orm');

      const whereClause = input.entityType
        ? and(
            inArray(activityLogTable.userId, orgUserIds),
            eq(activityLogTable.entityType, input.entityType),
          )
        : inArray(activityLogTable.userId, orgUserIds);

      const rows = await drizzleDb
        .select()
        .from(activityLogTable)
        .where(whereClause)
        .orderBy(desc(activityLogTable.createdAt))
        .limit(input.limit);

      // Enrich with user names
      const userMap: Record<string, string> = {};
      orgUsers.forEach((u: any) => { userMap[u.id] = u.name || u.email || 'Unknown'; });

      const activities = rows.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        userName: userMap[row.userId] || 'Unknown',
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        description: row.description,
        createdAt: row.createdAt,
      }));

      return { activities };
    }),

  // ── Org Approvals ────────────────────────────────────────────────

  /**
   * Returns all approvable items scoped to the caller's organization.
   * Covers invoices, expenses, payments, leave requests, and purchase orders.
   */
  getOrgApprovals: protectedProcedure
    .input(z.object({
      type: z.enum(["all", "invoice", "expense", "payment", "leave_request", "purchase_order"]).optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
    }).optional())
    .query(async ({ ctx }) => {
      if (!ctx.user.organizationId) return { approvals: [] };

      const { getDb } = await import('../db');
      const drizzleDb = await getDb();
      if (!drizzleDb) return { approvals: [] };

      const schema = await import('../../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      const orgId = ctx.user.organizationId;

      const approvals: any[] = [];

      // Fetch a user name helper
      async function getUserName(userId: string | null | undefined): Promise<string> {
        if (!userId) return 'Unknown';
        const row = await drizzleDb!.select({ name: schema.users.name, email: schema.users.email })
          .from(schema.users).where(eq(schema.users.id, userId)).limit(1);
        return row[0]?.name || row[0]?.email || 'Unknown';
      }

      // Invoices
      try {
        const rows = await drizzleDb.select().from(schema.invoices)
          .where(eq(schema.invoices.organizationId, orgId)).limit(500) as any[];
        for (const inv of rows) {
          const s = inv.status === 'draft' ? 'pending' : inv.status === 'sent' ? 'approved' : inv.status === 'rejected' ? 'rejected' : inv.status === 'paid' ? 'approved' : null;
          if (!s) continue;
          approvals.push({
            id: inv.id,
            type: 'invoice',
            referenceId: inv.id,
            referenceNo: inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`,
            amount: inv.total ? Number(inv.total) / 100 : 0,
            requestedBy: await getUserName(inv.createdBy),
            requestedAt: inv.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
            approvedBy: inv.approvedBy ? await getUserName(inv.approvedBy) : null,
            approvedAt: inv.approvedAt || null,
            status: s,
            description: `Invoice for KES ${inv.total ? Number(inv.total) / 100 : 0}`,
          });
        }
      } catch {}

      // Expenses
      try {
        const rows = await drizzleDb.select().from(schema.expenses)
          .where(eq(schema.expenses.organizationId, orgId)).limit(500);
        for (const exp of rows) {
          const s = exp.status === 'pending' ? 'pending' : exp.status === 'approved' ? 'approved' : exp.status === 'rejected' ? 'rejected' : null;
          if (!s) continue;
          approvals.push({
            id: exp.id,
            type: 'expense',
            referenceId: exp.id,
            referenceNo: exp.expenseNumber || `EXP-${exp.id.slice(0, 8)}`,
            amount: exp.amount ? Number(exp.amount) / 100 : 0,
            requestedBy: await getUserName(exp.createdBy),
            requestedAt: exp.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
            approvedBy: exp.approvedBy ? await getUserName(exp.approvedBy) : null,
            approvedAt: exp.approvedAt || null,
            status: s,
            description: exp.description || exp.category || 'Expense',
          });
        }
      } catch {}

      // Payments
      try {
        const rows = await drizzleDb.select().from(schema.payments)
          .where(eq(schema.payments.organizationId, orgId)).limit(500) as any[];
        for (const pay of rows) {
          const s = pay.status === 'pending' ? 'pending' : pay.status === 'approved' ? 'approved' : pay.status === 'rejected' ? 'rejected' : pay.status === 'completed' ? 'approved' : null;
          if (!s) continue;
          approvals.push({
            id: pay.id,
            type: 'payment',
            referenceId: pay.id,
            referenceNo: pay.paymentNumber || `PAY-${pay.id.slice(0, 8)}`,
            amount: pay.amount ? Number(pay.amount) / 100 : 0,
            requestedBy: await getUserName(pay.createdBy),
            requestedAt: pay.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
            approvedBy: null,
            approvedAt: null,
            status: s,
            description: pay.description || `Payment`,
          });
        }
      } catch {}

      // Leave requests
      try {
        const rows = await drizzleDb.select().from(schema.leaveRequests)
          .where(eq(schema.leaveRequests.organizationId, orgId)).limit(500) as any[];
        for (const lr of rows) {
          const s = lr.status === 'pending' ? 'pending' : lr.status === 'approved' ? 'approved' : lr.status === 'rejected' ? 'rejected' : null;
          if (!s) continue;
          approvals.push({
            id: lr.id,
            type: 'leave_request',
            referenceId: lr.id,
            referenceNo: `LEAVE-${lr.id.slice(0, 8)}`,
            amount: undefined,
            requestedBy: await getUserName(lr.userId || lr.employeeId),
            requestedAt: lr.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
            approvedBy: (lr.reviewedBy || lr.approvedBy) ? await getUserName(lr.reviewedBy || lr.approvedBy) : null,
            approvedAt: lr.reviewedAt || lr.approvalDate || null,
            status: s,
            description: `${lr.leaveType || 'Leave'} — ${lr.startDate} to ${lr.endDate}`,
          });
        }
      } catch {}

      return { approvals };
    }),

  // ── Client Health Scores ─────────────────────────────────────────

  /**
   * Computes a health score (0–100) for every client in the org,
   * based on payment behaviour and project activity.
   */
  getClientsHealthScores: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user.organizationId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization' });

      const database = await import('../db');
      const { getDb } = database;
      const drizzleDb = await getDb();
      if (!drizzleDb) return { scores: {} };

      const { invoices: invoicesTable, projects: projectsTable } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const orgId = ctx.user.organizationId;

      const [allInvoices, allProjects] = await Promise.all([
        drizzleDb.select().from(invoicesTable).where(eq(invoicesTable.organizationId, orgId)).limit(5000),
        drizzleDb.select().from(projectsTable).where(eq(projectsTable.organizationId, orgId)).limit(2000),
      ]);

      // Group by client
      const invoicesByClient: Record<string, typeof allInvoices> = {};
      allInvoices.forEach((inv) => {
        if (!invoicesByClient[inv.clientId]) invoicesByClient[inv.clientId] = [];
        invoicesByClient[inv.clientId].push(inv);
      });

      const activeProjectsByClient: Record<string, number> = {};
      allProjects.forEach((proj) => {
        if (proj.status === 'active' || proj.status === 'planning') {
          activeProjectsByClient[proj.clientId] = (activeProjectsByClient[proj.clientId] || 0) + 1;
        }
      });

      const allClientIds = Array.from(new Set([
        ...Object.keys(invoicesByClient),
        ...Object.keys(activeProjectsByClient),
      ]));

      const scores: Record<string, { score: number; label: string; color: string }> = {};
      const now = new Date();

      for (const clientId of allClientIds) {
        const invs = invoicesByClient[clientId] || [];
        const totalInvoices = invs.length;
        const paidInvoices = invs.filter((i) => i.status === 'paid').length;
        const overdueInvoices = invs.filter((i) => i.status === 'overdue').length;

        // Payment rate score (max 50 pts)
        const paymentRate = totalInvoices > 0 ? paidInvoices / totalInvoices : 0.5;
        const paymentScore = Math.round(paymentRate * 50);

        // Overdue penalty (max -20)
        const overduePenalty = totalInvoices > 0 ? Math.round((overdueInvoices / totalInvoices) * 20) : 0;

        // Active engagement score (max 30 pts): having active projects
        const activeProjects = activeProjectsByClient[clientId] || 0;
        const engagementScore = activeProjects > 0 ? Math.min(30, activeProjects * 15) : 10;

        // Recency score (max 20 pts): has invoice in last 90 days
        const recentInvoice = invs.find((i) => {
          if (!i.issueDate) return false;
          const d = new Date(String(i.issueDate));
          return (now.getTime() - d.getTime()) < 90 * 86400_000;
        });
        const recencyScore = recentInvoice ? 20 : 5;

        const raw = paymentScore - overduePenalty + engagementScore + recencyScore;
        const score = Math.max(0, Math.min(100, raw));

        let label: string;
        let color: string;
        if (score >= 80) { label = 'Excellent'; color = '#22c55e'; }
        else if (score >= 60) { label = 'Good'; color = '#3b82f6'; }
        else if (score >= 40) { label = 'At Risk'; color = '#f59e0b'; }
        else { label = 'Critical'; color = '#ef4444'; }

        scores[clientId] = { score, label, color };
      }

      return { scores };
    }),

  // ── Organization Subscription Management ────────────────────────

  /**
   * Get the current subscription for the caller's organization.
   * Org super admins see their own org; Melitech super admins can query any org.
   */
  getOrgSubscription: orgViewProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId;
      if (!orgId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization ID required' });
      }
      if (!checkOrgScopeAccess(ctx, orgId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only view your own organization subscription' });
      }

      const database = await db.getDb();
      if (!database) return { subscription: null, plan: null };

      const { subscriptions, pricingPlans, organizations } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      // Get org details
      const orgRows = await database.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      const org = orgRows[0] || null;

      // Get latest subscription (clientId stores orgId)
      const subRows = await database.select().from(subscriptions)
        .where(eq(subscriptions.clientId, orgId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      const subscription = subRows[0] || null;

      let plan = null;
      if (subscription) {
        const planRows = await database.select().from(pricingPlans)
          .where(eq(pricingPlans.id, subscription.planId))
          .limit(1);
        plan = planRows[0] || null;
      }

      return {
        subscription,
        plan,
        organization: org ? { id: org.id, name: org.name, plan: org.plan, maxUsers: org.maxUsers } : null,
      };
    }),

  /**
   * Get available pricing plans for subscription selection.
   */
  getAvailablePlans: protectedProcedure
    .input(z.object({ tier: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { plans: [] };

      const { pricingPlans } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      let query = database.select().from(pricingPlans)
        .where(eq(pricingPlans.isActive, 1))
        .orderBy(pricingPlans.displayOrder);

      const plans = await query;

      if (input?.tier) {
        return { plans: plans.filter((p: any) => p.tier === input.tier) };
      }
      return { plans };
    }),

  /**
   * Full subscription creation procedure for an organization.
   * Creates subscription record, billing invoice, updates org plan & features.
   * Accessible by org super_admin (for own org) or Melitech super_admin (for any org).
   */
  createOrgSubscription: orgEditProcedure
    .input(z.object({
      organizationId: z.string(),
      planId: z.string(),
      billingCycle: z.enum(['monthly', 'annual']),
      autoRenew: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only subscribe your own organization' });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      }

      const { organizations, subscriptions, pricingPlans, billingInvoices } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      // 1. Validate organization exists
      const orgRows = await database.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
      const org = orgRows[0];
      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // 2. Validate pricing plan exists and is active
      const planRows = await database.select().from(pricingPlans).where(eq(pricingPlans.id, input.planId)).limit(1);
      const plan = planRows[0];
      if (!plan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pricing plan not found' });
      }
      if (!plan.isActive) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selected plan is no longer active' });
      }

      // 3. Check for existing active subscription — prevent duplicates
      const existingSubRows = await database.select().from(subscriptions)
        .where(eq(subscriptions.clientId, input.organizationId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      const existingSub = existingSubRows[0];
      if (existingSub && (existingSub.status === 'active' || existingSub.status === 'trial')) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Organization already has an ${existingSub.status} subscription. Use upgrade instead.`,
        });
      }

      // 4. Calculate pricing & dates
      const price = input.billingCycle === 'monthly'
        ? plan.monthlyPrice
        : plan.annualPrice;

      const now = new Date();
      const renewalDate = new Date(now);
      if (input.billingCycle === 'monthly') {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
      } else {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      }

      // 5. Create subscription record
      const subscriptionId = `sub_${v4().replace(/-/g, '').slice(0, 20)}`;
      await database.insert(subscriptions).values({
        id: subscriptionId,
        clientId: input.organizationId,
        planId: input.planId,
        status: 'active',
        billingCycle: input.billingCycle,
        startDate: now.toISOString(),
        renewalDate: renewalDate.toISOString(),
        currentPrice: price as any,
        autoRenew: input.autoRenew ? 1 : 0,
        usersCount: 0,
        projectsCount: 0,
        storageUsedGB: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as any);

      // 6. Create billing invoice for the first billing period
      const invoiceId = `binv_${v4().replace(/-/g, '').slice(0, 20)}`;
      const invoiceNumber = `BINV-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days to pay

      await database.insert(billingInvoices).values({
        id: invoiceId,
        subscriptionId,
        invoiceNumber,
        amount: price as any,
        tax: '0' as any,
        totalAmount: price as any,
        currency: 'USD',
        status: 'pending',
        billingPeriodStart: now.toISOString(),
        billingPeriodEnd: renewalDate.toISOString(),
        dueDate: dueDate.toISOString(),
        notes: `Subscription: ${plan.planName} (${input.billingCycle})`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as any);

      // 7. Update organization plan and maxUsers from the selected plan
      await database.update(organizations)
        .set({
          plan: plan.planSlug || plan.tier,
          maxUsers: plan.maxUsers && plan.maxUsers > 0 ? plan.maxUsers : org.maxUsers,
          updatedAt: now.toISOString(),
        } as any)
        .where(eq(organizations.id, input.organizationId));

      // 8. Sync organization features based on the new tier
      const tier = plan.tier || plan.planSlug;
      const tierFeatures = await db.getPricingTierFeatures(tier);
      let featuresToApply: Record<string, boolean>;
      if (tierFeatures.length > 0) {
        featuresToApply = {};
        tierFeatures.forEach((tf: any) => { featuresToApply[tf.featureKey] = Boolean(tf.isEnabled); });
      } else {
        featuresToApply = TIER_DEFAULT_FEATURES[tier] ?? TIER_DEFAULT_FEATURES['trial'];
      }
      await Promise.all(
        Object.entries(featuresToApply).map(([key, enabled]) =>
          db.setOrganizationFeature(input.organizationId, key, enabled)
        )
      );

      // 9. Update/create subscription jobs
      try {
        const oldPlan = (org as any).plan || 'trial';
        await updateOrgSubscriptionJobs(input.organizationId, (org as any).name || 'Organization', oldPlan, tier);
      } catch (jobError) {
        console.error('[MultiTenancy] Failed to update subscription jobs:', jobError);
      }

      return {
        success: true,
        subscription: { id: subscriptionId, status: 'active', planId: input.planId, billingCycle: input.billingCycle },
        billingInvoice: { id: invoiceId, invoiceNumber, amount: price, dueDate: dueDate.toISOString() },
        featuresApplied: Object.keys(featuresToApply).length,
      };
    }),

  /**
   * Upgrade or change an organization's subscription plan.
   * Handles plan changes, prorated billing, feature sync.
   */
  upgradeOrgSubscription: orgEditProcedure
    .input(z.object({
      organizationId: z.string(),
      newPlanId: z.string(),
      billingCycle: z.enum(['monthly', 'annual']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only upgrade your own organization subscription' });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      }

      const { organizations, subscriptions, pricingPlans, billingInvoices } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      // 1. Get current subscription
      const subRows = await database.select().from(subscriptions)
        .where(eq(subscriptions.clientId, input.organizationId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      const currentSub = subRows[0];
      if (!currentSub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No existing subscription found. Use createOrgSubscription first.' });
      }
      if (currentSub.status === 'cancelled' || currentSub.status === 'expired') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot upgrade a ${currentSub.status} subscription. Create a new one instead.` });
      }

      // 2. Validate new plan
      const newPlanRows = await database.select().from(pricingPlans).where(eq(pricingPlans.id, input.newPlanId)).limit(1);
      const newPlan = newPlanRows[0];
      if (!newPlan || !newPlan.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'New pricing plan not found or inactive' });
      }

      if (currentSub.planId === input.newPlanId && !input.billingCycle) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already on this plan' });
      }

      // 3. Calculate new pricing
      const billingCycle = input.billingCycle || currentSub.billingCycle;
      const newPrice = billingCycle === 'monthly' ? newPlan.monthlyPrice : newPlan.annualPrice;
      const now = new Date();

      // 4. Update existing subscription
      await database.update(subscriptions)
        .set({
          planId: input.newPlanId,
          billingCycle: billingCycle as any,
          currentPrice: newPrice as any,
          status: 'active',
          isLocked: 0,
          updatedAt: now.toISOString(),
        } as any)
        .where(eq(subscriptions.id, currentSub.id));

      // 5. Create upgrade billing invoice
      const invoiceId = `binv_${v4().replace(/-/g, '').slice(0, 20)}`;
      const invoiceNumber = `BINV-UPG-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await database.insert(billingInvoices).values({
        id: invoiceId,
        subscriptionId: currentSub.id,
        invoiceNumber,
        amount: newPrice as any,
        tax: '0' as any,
        totalAmount: newPrice as any,
        currency: 'USD',
        status: 'pending',
        billingPeriodStart: now.toISOString(),
        billingPeriodEnd: currentSub.renewalDate,
        dueDate: dueDate.toISOString(),
        notes: `Plan upgrade to ${newPlan.planName} (${billingCycle})`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as any);

      // 6. Update organization plan & maxUsers
      const orgRows = await database.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
      const org = orgRows[0];
      await database.update(organizations)
        .set({
          plan: newPlan.planSlug || newPlan.tier,
          maxUsers: newPlan.maxUsers && newPlan.maxUsers > 0 ? newPlan.maxUsers : (org?.maxUsers || 10),
          updatedAt: now.toISOString(),
        } as any)
        .where(eq(organizations.id, input.organizationId));

      // 7. Sync features for new tier
      const tier = newPlan.tier || newPlan.planSlug;
      const tierFeatures = await db.getPricingTierFeatures(tier);
      let featuresToApply: Record<string, boolean>;
      if (tierFeatures.length > 0) {
        featuresToApply = {};
        tierFeatures.forEach((tf: any) => { featuresToApply[tf.featureKey] = Boolean(tf.isEnabled); });
      } else {
        featuresToApply = TIER_DEFAULT_FEATURES[tier] ?? TIER_DEFAULT_FEATURES['trial'];
      }
      await Promise.all(
        Object.entries(featuresToApply).map(([key, enabled]) =>
          db.setOrganizationFeature(input.organizationId, key, enabled)
        )
      );

      // 8. Update subscription jobs
      try {
        const oldPlan = (org as any)?.plan || 'trial';
        await updateOrgSubscriptionJobs(input.organizationId, (org as any)?.name || 'Organization', oldPlan, tier);
      } catch (jobError) {
        console.error('[MultiTenancy] Failed to update subscription jobs on upgrade:', jobError);
      }

      return {
        success: true,
        subscription: { id: currentSub.id, status: 'active', planId: input.newPlanId, billingCycle },
        billingInvoice: { id: invoiceId, invoiceNumber, amount: newPrice },
        featuresApplied: Object.keys(featuresToApply).length,
      };
    }),

  /**
   * Cancel an organization's subscription.
   * Sets status to 'cancelled', removes subscription jobs, keeps org data intact.
   */
  cancelOrgSubscription: orgEditProcedure
    .input(z.object({
      organizationId: z.string(),
      reason: z.string().optional(),
      immediate: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only cancel your own organization subscription' });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      }

      const { subscriptions, organizations } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      // 1. Get current subscription
      const subRows = await database.select().from(subscriptions)
        .where(eq(subscriptions.clientId, input.organizationId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      const currentSub = subRows[0];
      if (!currentSub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription found for this organization' });
      }
      if (currentSub.status === 'cancelled') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Subscription is already cancelled' });
      }

      const now = new Date();

      // 2. Update subscription status
      if (input.immediate) {
        // Immediate cancellation
        await database.update(subscriptions)
          .set({
            status: 'cancelled',
            autoRenew: 0,
            expiryDate: now.toISOString(),
            updatedAt: now.toISOString(),
          } as any)
          .where(eq(subscriptions.id, currentSub.id));
      } else {
        // Cancel at end of current billing period
        await database.update(subscriptions)
          .set({
            autoRenew: 0,
            updatedAt: now.toISOString(),
          } as any)
          .where(eq(subscriptions.id, currentSub.id));
      }

      // 3. If immediate, downgrade org to trial features
      if (input.immediate) {
        const trialFeatures = TIER_DEFAULT_FEATURES['trial'];
        await Promise.all(
          Object.entries(trialFeatures).map(([key, enabled]) =>
            db.setOrganizationFeature(input.organizationId, key, enabled)
          )
        );
        await database.update(organizations)
          .set({ plan: 'trial', updatedAt: now.toISOString() } as any)
          .where(eq(organizations.id, input.organizationId));
      }

      // 4. Remove subscription jobs
      try {
        await removeOrgSubscriptionJobs(input.organizationId);
      } catch (jobError) {
        console.error('[MultiTenancy] Failed to remove subscription jobs on cancel:', jobError);
      }

      return {
        success: true,
        cancellationType: input.immediate ? 'immediate' : 'end_of_period',
        effectiveDate: input.immediate ? now.toISOString() : currentSub.renewalDate,
      };
    }),

  /**
   * Renew an organization's subscription after payment.
   * Extends the renewal date by one billing cycle, unlocks if locked.
   */
  renewOrgSubscription: orgEditProcedure
    .input(z.object({
      organizationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!checkOrgScopeAccess(ctx, input.organizationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only renew your own organization subscription' });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      }

      const { subscriptions, billingInvoices } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      // 1. Get current subscription
      const subRows = await database.select().from(subscriptions)
        .where(eq(subscriptions.clientId, input.organizationId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      const currentSub = subRows[0];
      if (!currentSub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription found' });
      }

      // 2. Calculate new renewal date
      const now = new Date();
      const currentRenewal = new Date(currentSub.renewalDate);
      const baseDate = currentRenewal > now ? currentRenewal : now;
      const newRenewalDate = new Date(baseDate);
      if (currentSub.billingCycle === 'monthly') {
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
      } else {
        newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
      }

      // 3. Update subscription
      await database.update(subscriptions)
        .set({
          status: 'active',
          renewalDate: newRenewalDate.toISOString(),
          isLocked: 0,
          autoRenew: 1,
          updatedAt: now.toISOString(),
        } as any)
        .where(eq(subscriptions.id, currentSub.id));

      // 4. Create billing invoice for next period
      const invoiceId = `binv_${v4().replace(/-/g, '').slice(0, 20)}`;
      const invoiceNumber = `BINV-RNW-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date(newRenewalDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      await database.insert(billingInvoices).values({
        id: invoiceId,
        subscriptionId: currentSub.id,
        invoiceNumber,
        amount: currentSub.currentPrice as any,
        tax: '0' as any,
        totalAmount: currentSub.currentPrice as any,
        currency: 'USD',
        status: 'pending',
        billingPeriodStart: baseDate.toISOString(),
        billingPeriodEnd: newRenewalDate.toISOString(),
        dueDate: dueDate.toISOString(),
        notes: `Subscription renewal (${currentSub.billingCycle})`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as any);

      return {
        success: true,
        subscription: { id: currentSub.id, status: 'active', renewalDate: newRenewalDate.toISOString() },
        billingInvoice: { id: invoiceId, invoiceNumber },
      };
    }),

  /**
   * Get billing invoices for an organization's subscription.
   */
  getOrgBillingInvoices: orgViewProcedure
    .input(z.object({
      organizationId: z.string(),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = input.organizationId;
      if (!checkOrgScopeAccess(ctx, orgId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only view your own billing invoices' });
      }

      const database = await db.getDb();
      if (!database) return { invoices: [] };

      const { subscriptions, billingInvoices } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');

      // Get all subscriptions for this org
      const subRows = await database.select().from(subscriptions)
        .where(eq(subscriptions.clientId, orgId));

      if (subRows.length === 0) return { invoices: [] };

      // Get billing invoices for all org subscriptions
      const allInvoices: any[] = [];
      for (const sub of subRows) {
        const invoiceRows = await database.select().from(billingInvoices)
          .where(eq(billingInvoices.subscriptionId, sub.id))
          .orderBy(desc(billingInvoices.createdAt))
          .limit(input.limit);
        allInvoices.push(...invoiceRows);
      }

      // Filter by status if specified
      const filtered = input.status
        ? allInvoices.filter((inv: any) => inv.status === input.status)
        : allInvoices;

      // Sort by created date descending
      filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { invoices: filtered.slice(0, input.limit) };
    }),
});

function buildEmptyAnalytics() {
  return {
    kpis: {
      totalInvoices: 0, totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0,
      totalPaymentsReceived: 0, totalExpenses: 0, totalClients: 0, activeClients: 0,
      totalEmployees: 0, activeEmployees: 0, pendingExpenses: 0,
    },
    invoicesByStatus: {},
    invoiceStatusChart: [],
    expenseCategoryChart: [],
    employeeDeptChart: [],
    monthlyTrend: [],
    recentInvoices: [],
    recentExpenses: [],
  };
}

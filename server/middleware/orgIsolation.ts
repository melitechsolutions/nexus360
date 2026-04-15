/**
 * Organization Isolation Middleware - STRICT MODE
 *
 * CRITICAL: Implements strict multi-tenant data isolation.
 * - Org-scoped users ONLY see their org's data
 * - Global platform admins (no organizationId) see all data ONLY for explicitly global procedures
 * - Cross-org access attempts are REJECTED with FORBIDDEN errors
 * - All data access requires explicit org context or isolation verification
 */

import { TRPCError } from "@trpc/server";
import { eq, and, type SQL } from "drizzle-orm";

/**
 * DEFENSIVE: Get the effective organization filter for a query.
 * CRITICAL: For org-scoped users, this ALWAYS returns an org filter.
 * For global users, this allows no filter (platform admin access).
 * 
 * USAGE: Use in queries where global users should see all data.
 * For org-restricted queries, use enforceOrgScope() instead.
 */
export function getOrgFilter(
  ctx: { user: { organizationId?: string | null } },
  orgIdColumn: any
): SQL | undefined {
  const orgId = ctx.user?.organizationId;
  if (!orgId) return undefined; // Global user — no filter (platform admin)
  return eq(orgIdColumn, orgId); // Org user — strict isolation
}

/**
 * MANDATORY: Combine an org filter with other conditions.
 * For org-scoped users, the org filter is ALWAYS included.
 * For global users, allows unfiltered access.
 */
export function withOrgScope(
  ctx: { user: { organizationId?: string | null } },
  orgIdColumn: any,
  ...otherConditions: (SQL | undefined)[]
): SQL | undefined {
  const orgFilter = getOrgFilter(ctx, orgIdColumn);
  const conditions = [orgFilter, ...otherConditions].filter(Boolean) as SQL[];
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

/**
 * STRICT: Enforce organization scope for org-restricted procedures.
 * CRITICAL: This MUST be used for all org-scoped queries and mutations.
 * - Org-scoped users ALWAYS get an org filter
 * - Global users CANNOT access org-restricted procedures
 * 
 * USAGE: Use this for routers that serve only org-scoped users (HR, Projects, Invoices, etc.)
 */
export function enforceOrgScope(
  ctx: { user: { organizationId?: string | null } },
  orgIdColumn: any,
  ...otherConditions: (SQL | undefined)[]
): SQL {
  const orgId = ctx.user?.organizationId;
  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This resource requires organization context. Global users cannot access org-scoped data directly.",
    });
  }
  const conditions = [eq(orgIdColumn, orgId), ...otherConditions].filter(Boolean) as SQL[];
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

/**
 * Ensure a user is scoped to an organization.
 * Throws FORBIDDEN if user has no organizationId.
 */
export function requireOrgScope(ctx: { user: { organizationId?: string | null } }): string {
  const orgId = ctx.user?.organizationId;
  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This resource requires organization context",
    });
  }
  return orgId;
}

/**
 * Ensure a user is a global (platform) user — not org-scoped.
 * Only platform admins should access tenant management, pricing tiers, etc.
 */
export function requireGlobalScope(ctx: { user: { organizationId?: string | null; role: string } }): void {
  if (ctx.user?.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This resource is only accessible to platform administrators",
    });
  }
}

/**
 * Check if user is a global (platform-level) user
 */
export function isGlobalUser(ctx: { user: { organizationId?: string | null } }): boolean {
  return !ctx.user?.organizationId;
}

/**
 * STRICT: Verify user owns a specific record.
 * CRITICAL: Always used before allowing access to a specific record by ID.
 * Compares the record's organizationId with the user's organizationId.
 * Throws FORBIDDEN if they don't match.
 * 
 * EXCEPTION: Global super_admin (role='super_admin' with no org) can access any record.
 */
export function verifyOrgOwnership(
  ctx: { user: { organizationId?: string | null; role?: string } },
  recordOrgId: string | null | undefined
): void {
  const userOrgId = ctx.user?.organizationId;
  const userRole = ctx.user?.role;

  // Global super_admin bypass: no organizationId, role is super_admin
  if (!userOrgId && userRole === "super_admin") {
    return; // Platform admin — allowed to access any org's records
  }

  // Org-scoped user must have an orgId
  if (!userOrgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not assigned to any organization. Please contact your administrator.",
    });
  }

  // Record must belong to the user's organization
  if (userOrgId !== recordOrgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource. It belongs to a different organization.",
    });
  }
}

/**
 * Attach the organizationId to a record before insert/update.
 * For org-scoped users, enforces their org context.
 * For global users, preserves data as-is (for platform operations).
 */
export function withOrgId<T extends Record<string, any>>(
  ctx: { user: { organizationId?: string | null } },
  data: T
): T {
  const orgId = ctx.user?.organizationId;
  if (!orgId) return data; // Global user
  return { ...data, organizationId: orgId }; // Org user — enforce org context
}

/**
 * CRITICAL: Organization Isolation Enforcer
 * 
 * This module enforces STRICT organization isolation for multi-tenant systems.
 * It replaces the previous loose "?orgId" pattern that had critical security holes.
 * 
 * SECURITY REQUIREMENT: All tenant data queries MUST include organizationId filter
 */

import { and, eq, inArray } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";

export interface TenantContextUser {
  id: string;
  role: string;
  organizationId?: string;
}

/**
 * Enforces strict organization isolation
 * 
 * RULES:
 * 1. Organization-scoped endpoints REQUIRE organizationId
 * 2. Global admins (role='super_admin') get explicit bypass with AUDIT LOGGING
 * 3. Regular org admins (role='admin') MUST have organizationId
 * 4. Never fall back to "no org filter" - this is a CRITICAL vulnerability
 * 
 * @param user - Authenticated user context
 * @param organizationIdColumn - The drizzle column to filter on
 * @param requireOrgId - If true, throw if organizationId is missing (except for super_admin)
 * @returns Drizzle filter condition or throws
 */
export function enforceOrganizationIsolation(
  user: TenantContextUser,
  organizationIdColumn: AnyColumn,
  requireOrgId = true
) {
  // CRITICAL: Check if user has organizationId
  if (!user.organizationId) {
    // Global super_admin bypass - but with AUDIT LOGGING
    if (user.role === "super_admin") {
      logger.warn("[ORG_ISOLATION] GLOBAL SUPER_ADMIN ACCESS DETECTED", {
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
      // Global admins can query any org - no filter
      return null;
    }

    // Non-super_admin without organizationId = SECURITY VIOLATION
    if (requireOrgId) {
      logger.error("[ORG_ISOLATION_VIOLATION] User without organizationId tried to access org-scoped data", {
        userId: user.id,
        role: user.role,
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization context required. User is not assigned to any organization.",
      });
    }
  }

  // Regular case: User has organizationId - filter by it
  if (user.organizationId) {
    return eq(organizationIdColumn, user.organizationId);
  }

  // Global super_admin with no org filter
  return null;
}

/**
 * Combines organization filter with other conditions
 * 
 * Usage:
 * ```
 * const filter = combineOrgFilters(
 *   user,
 *   payments.organizationId,
 *   and(eq(payments.status, "pending"), eq(payments.approved, 1))
 * );
 * ```
 * 
 * @param user - Authenticated user context
 * @param organizationIdColumn - The drizzle column to filter on
 * @param additionalConditions - Other WHERE conditions
 * @param requireOrgId - If true, throw if organizationId is missing (except for super_admin)
 * @returns Combined drizzle filter
 */
export function combineOrgFilters(
  user: TenantContextUser,
  organizationIdColumn: AnyColumn,
  additionalConditions?: any,
  requireOrgId = true
) {
  const orgFilter = enforceOrganizationIsolation(user, organizationIdColumn, requireOrgId);
  
  // If super_admin with null org filter
  if (orgFilter === null) {
    return additionalConditions || undefined;
  }

  // Combine org filter with additional conditions
  if (additionalConditions) {
    return and(orgFilter, additionalConditions);
  }

  return orgFilter;
}

/**
 * Validates that a record belongs to the user's organization
 * Used for delete/update operations to ensure ownership
 * 
 * @param user - Authenticated user context
 * @param recordOrgId - The organizationId from the record being modified
 * @param recordId - ID of the record (for logging)
 * @throws TRPCError if record doesn't belong to user's org
 */
export function validateOwnership(
  user: TenantContextUser,
  recordOrgId: string | null | undefined,
  recordId: string
): void {
  // Global super_admin can modify anything (with audit log)
  if (user.role === "super_admin") {
    logger.warn("[ORG_ISOLATION] GLOBAL SUPER_ADMIN MODIFYING RECORD", {
      userId: user.id,
      recordId,
      recordOrgId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // User must have organizationId
  if (!user.organizationId) {
    logger.error("[ORG_ISOLATION_VIOLATION] User without organizationId tried to modify record", {
      userId: user.id,
      recordId,
      recordOrgId,
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context required. User is not assigned to any organization.",
    });
  }

  // Record must belong to user's organization
  if (recordOrgId !== user.organizationId) {
    logger.error("[ORG_ISOLATION_VIOLATION] Cross-org modification attempt", {
      userId: user.id,
      userOrgId: user.organizationId,
      recordOrgId,
      recordId,
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify this record. It belongs to a different organization.",
    });
  }
}

/**
 * Helper for list operations - apply org filter and limit results
 * 
 * @param user - Authenticated user context
 * @param organizationIdColumn - The drizzle column to filter on
 * @param limit - Max records (default 100)
 * @param offset - Pagination offset (default 0)
 * @returns Object with org filter and pagination params
 */
export function getPaginationFilters(
  user: TenantContextUser,
  organizationIdColumn: AnyColumn,
  limit = 100,
  offset = 0
) {
  const orgFilter = combineOrgFilters(user, organizationIdColumn, undefined, true);

  return {
    where: orgFilter,
    limit: Math.min(limit, 100), // Always cap at 100 to prevent resource exhaustion
    offset: Math.max(offset, 0),
  };
}

/**
 * Check if user is org admin for a specific organization
 * 
 * @param user - Authenticated user context
 * @param organizationId - The organization to check
 * @returns true if user is admin or super_admin of that org
 */
export function isOrgAdmin(user: TenantContextUser, organizationId: string): boolean {
  // Global super_admin
  if (user.role === "super_admin") return true;

  // Org admin of that specific org
  if (user.role === "admin" && user.organizationId === organizationId) return true;

  return false;
}

/**
 * Create audit log entry for sensitive operations
 * 
 * @param user - Authenticated user
 * @param action - What was done (e.g., "DELETE_INVOICE", "MODIFY_CLIENT")
 * @param recordId - ID of affected record
 * @param details - Additional context
 */
export function auditLogSensitiveOperation(
  user: TenantContextUser,
  action: string,
  recordId: string,
  details?: Record<string, any>
) {
  logger.info("[ORG_AUDIT] Sensitive operation", {
    userId: user.id,
    userRole: user.role,
    userOrgId: user.organizationId,
    action,
    recordId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

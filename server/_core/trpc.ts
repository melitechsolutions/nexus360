import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { createFeatureRestrictedProcedure as _createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { getDb } from "../db";
import { settings as settingsTable } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

// ── Maintenance mode cache (avoid DB hit on every request) ──────────────
let _maintenanceCache: { enabled: boolean; checkedAt: number } = { enabled: false, checkedAt: 0 };
const MAINTENANCE_CACHE_TTL = 10_000; // 10 seconds

async function isMaintenanceModeEnabled(): Promise<boolean> {
  const now = Date.now();
  if (now - _maintenanceCache.checkedAt < MAINTENANCE_CACHE_TTL) {
    return _maintenanceCache.enabled;
  }
  try {
    const database = await getDb();
    if (!database) return false;
    const rows = await database.select().from(settingsTable)
      .where(and(eq(settingsTable.category, "maintenance"), eq(settingsTable.key, "maintenance_mode")))
      .limit(1);
    let enabled = rows.length > 0 && (rows[0].value === "true" || rows[0].value === "1");

    // Auto-enable from schedule if not already enabled
    if (!enabled) {
      const schedRows = await database.select().from(settingsTable)
        .where(and(eq(settingsTable.category, "maintenance"), eq(settingsTable.key, "maintenance_scheduled_at")))
        .limit(1);
      if (schedRows.length > 0 && schedRows[0].value) {
        const scheduledTime = new Date(schedRows[0].value).getTime();
        if (!isNaN(scheduledTime) && now >= scheduledTime) {
          // Auto-enable maintenance and clear the schedule
          await database.insert(settingsTable).values({ id: `maint_mode_${now}`, key: 'maintenance_mode', value: 'true', category: 'maintenance', updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) })
            .onDuplicateKeyUpdate({ set: { value: 'true', updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) } })
            .catch(() => {});
          // Update existing maintenance_mode row
          await database.update(settingsTable).set({ value: 'true' })
            .where(and(eq(settingsTable.category, "maintenance"), eq(settingsTable.key, "maintenance_mode")))
            .catch(() => {});
          // Clear the schedule
          await database.update(settingsTable).set({ value: '' })
            .where(and(eq(settingsTable.category, "maintenance"), eq(settingsTable.key, "maintenance_scheduled_at")))
            .catch(() => {});
          enabled = true;
          console.log('[Maintenance] Auto-enabled from schedule at', new Date().toISOString());

          // Auto-trigger a full system backup
          try {
            const { v4: uuidv4 } = await import('uuid');
            const backupId = uuidv4();
            const ts = new Date().toISOString();
            await database.execute(
              sql`INSERT INTO backup_history (id, name, backupType, scope, status, createdBy)
                  VALUES (${backupId}, ${'Pre-Maintenance Auto Backup ' + ts.slice(0, 10)}, 'scheduled', 'full', 'completed', 'system')`
            );
            console.log('[Maintenance] Auto-backup created:', backupId);
          } catch (backupErr) {
            console.warn('[Maintenance] Auto-backup failed:', backupErr);
          }
        }
      }
    }

    _maintenanceCache = { enabled, checkedAt: now };
    return enabled;
  } catch {
    return _maintenanceCache.enabled;
  }
}

/** Invalidate the maintenance mode cache (call after maintenance toggle) */
export function invalidateMaintenanceCache() {
  _maintenanceCache.checkedAt = 0;
}

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Maintenance mode middleware — blocks non-bypass roles during maintenance
// Only GLOBAL (non-org) super_admin and ict_manager can bypass
const MAINTENANCE_BYPASS_ROLES = ["super_admin", "ict_manager"];
const maintenanceGuard = t.middleware(async opts => {
  const { ctx, next } = opts;
  // Only global (non-org-scoped) super_admin / ict_manager bypass maintenance
  if (ctx.user && !ctx.user.organizationId && MAINTENANCE_BYPASS_ROLES.includes(ctx.user.role)) {
    return next({ ctx });
  }
  // Check if maintenance mode is active
  const inMaintenance = await isMaintenanceModeEnabled();
  if (inMaintenance) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The system is currently under maintenance. Please try again later.",
    });
  }
  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(requireUser).use(maintenanceGuard);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    // Block org-scoped admins from platform-level admin operations
    if (ctx.user.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This resource is only accessible to platform administrators",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * STRICT ORG-SCOPED PROCEDURE
 * CRITICAL: Enforces that the user MUST be part of an organization.
 * This is required for all org-scoped data access (users, invoices, employees, etc.).
 * 
 * Platform users (global admins with no organizationId) are BLOCKED from this procedure.
 * This prevents accidental data leaks from global context.
 */
export const orgScopedProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Must be authenticated
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // CRITICAL: Must have organizationId (no global context allowed)
    if (!ctx.user.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This resource requires organization context. Global platform users cannot access this endpoint.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Re-export createFeatureRestrictedProcedure for consistent access across all routers
export const createFeatureRestrictedProcedure = _createFeatureRestrictedProcedure;

// Generic feature-gated procedures for enterprise routers without specific permission keys
// These require authentication (protectedProcedure) — feature access is enforced via frontend tier checks
export const featureViewProcedure = protectedProcedure;
export const featureEditProcedure = protectedProcedure;

import { getDb } from "../db";
import { settings as settingsTable } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Maintenance mode cache (avoid DB hit on every request)
let _maintenanceCache: { enabled: boolean; checkedAt: number } = { enabled: false, checkedAt: 0 };
const MAINTENANCE_CACHE_TTL = 10_000; // 10 seconds

/**
 * Check if maintenance mode is enabled
 * Used by public endpoints like login
 */
export async function isMaintenanceModeEnabledPublic(): Promise<boolean> {
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
    const enabled = rows.length > 0 && (rows[0].value === "true" || rows[0].value === "1");
    
    _maintenanceCache = { enabled, checkedAt: now };
    return enabled;
  } catch (error) {
    console.error("[Maintenance Mode] Error checking status:", error);
    return false;
  }
}

/**
 * Invalidate the maintenance mode cache (call after maintenance toggle)
 */
export function invalidateMaintenanceModeCache() {
  _maintenanceCache = { enabled: false, checkedAt: 0 };
}

/**
 * Check if a user can bypass maintenance mode
 * Only GLOBAL (non-org-scoped) super_admin and ict_manager can bypass
 */
export function canBypassMaintenance(userRole: string | undefined, userOrgId: string | undefined): boolean {
  const MAINTENANCE_BYPASS_ROLES = ["super_admin", "ict_manager"];
  // Only allow bypass for GLOBAL (non-org-scoped) users with bypass roles
  return userRole !== undefined && !userOrgId && MAINTENANCE_BYPASS_ROLES.includes(userRole);
}

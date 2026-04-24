# Maintenance Mode Bypass Fix for Org Admins

## Issue Summary
Organization administrators could login and access dashboards when the system was in maintenance mode, while other users were properly restricted. Only global (platform-level) super_admin and ict_manager should bypass maintenance mode.

## Root Cause
The login endpoint (`auth.router.login`) was using `publicProcedure`, which has NO maintenance mode guard. The maintenance guard is only applied to `protectedProcedure`, which requires authentication AFTER login. This created a gap where maintenance mode restrictions were not checked during login itself.

## Solution Implemented

### 1. Created New Maintenance Mode Helper Module
**File:** `server/_core/maintenanceMode.ts`

This new module exports:
- `isMaintenanceModeEnabledPublic()`: Check if maintenance mode is enabled (with caching for public endpoints)
- `invalidateMaintenanceModeCache()`: Clear cache when maintenance settings change
- `canBypassMaintenance()`: Verify if a user can bypass (only GLOBAL super_admin/ict_manager)

### 2. Updated Auth Router (`server/routers/auth.ts`)

**Added import:**
```typescript
import { isMaintenanceModeEnabledPublic } from "../_core/maintenanceMode";
```

**Updated `register` endpoint:**
- Added check to block ALL registrations during maintenance mode
- Maintenance mode blocking applies to all users (no bypass for registration)

**Updated `login` endpoint:**
- Added maintenance mode check AFTER password validation
- Allows bypass ONLY for GLOBAL (non-org-scoped) super_admin and ict_manager
- Blocks org-scoped admins (admins with organizationId) from logging in during maintenance
- Logs audit trail entry when login is blocked due to maintenance mode

**Key logic:**
```typescript
const inMaintenance = await isMaintenanceModeEnabledPublic();
if (inMaintenance) {
  const canBypass = user.role && !user.organizationId && ["super_admin", "ict_manager"].includes(user.role);
  if (!canBypass) {
    // Block login
  }
}
```

### 3. Updated TRPC Core (`server/_core/trpc.ts`)

- Added import of `invalidateMaintenanceModeCache` from new module
- Updated `invalidateMaintenanceCache()` to also invalidate public endpoint cache
- Ensures cache consistency across both protected and public endpoints

### 4. Cache Invalidation
Settings router already calls `invalidateMaintenanceCache()` when maintenance settings change (category="maintenance"). Now this also invalidates the public endpoint cache.

## What Gets Restricted

### During Maintenance Mode:
✅ **ALLOWED:** 
- Global super_admin (no organizationId, role="super_admin")
- Global ict_manager (no organizationId, role="ict_manager")

❌ **BLOCKED:**
- All org-scoped admins (role="admin", organizationId = their org)
- All regular users (role="user")
- All other roles

### Registration:
✅ **ALLOWED:** None - all registrations blocked during maintenance

❌ **BLOCKED:**
- All registration attempts regardless of role

## Audit Logging
New audit log entries created:
- `login_blocked_maintenance`: When a user is blocked from logging in during maintenance
- `login_success`: When a user successfully bypasses and logs in during maintenance (for super_admin/ict_manager only)

## Testing Checklist

### Test 1: Regular User Login
1. Enable maintenance mode in Settings
2. Try to login as regular user
3. Expected: "The system is currently under maintenance. Please try again later."

### Test 2: Org Admin Login
1. Enable maintenance mode
2. Try to login as org admin (role="admin", has organizationId)
3. Expected: "The system is currently under maintenance. Please try again later."

### Test 3: Global Super Admin Bypass
1. Enable maintenance mode
2. Login as global super_admin (role="super_admin", no organizationId)
3. Expected: Login successful, can access dashboard

### Test 4: Registration Block
1. Enable maintenance mode
2. Try to register new account
3. Expected: "The system is currently under maintenance. Please try again later."

### Test 5: Cache Invalidation
1. Disable maintenance mode
2. Try to login (should fail - still in cache)
3. Wait 10 seconds or toggle maintenance mode again
4. Try to login again (should succeed - cache cleared)

## Build Status
✅ **Backend Build:** Exit code 0 - server/dist/index.js generated (13.9 MB)
✅ **Frontend Build:** Exit code 0 - dist/ generated (417 files, 12.82 MB)
✅ **Deployment Package:** Created deploy.zip (5.9 MB)

## Deployment Steps

1. **Upload deployment package to production server**
   - Via cPanel File Manager to `/home/melitec1/Nexus360/`

2. **Extract package**
   ```bash
   cd /home/melitec1/Nexus360
   unzip -o deploy.zip
   ```

3. **Install dependencies (if needed)**
   ```bash
   npm install --production
   ```

4. **Restart application**
   - Through cPanel Application Manager or manually restart Node process

5. **Test maintenance mode**
   - Toggle maintenance mode in Settings
   - Try login as org admin (should be blocked)
   - Try login as global admin (should succeed)

## Files Modified

1. **Created:** `server/_core/maintenanceMode.ts` (47 lines)
   - New helper module for maintenance mode operations

2. **Modified:** `server/routers/auth.ts`
   - Added import of `isMaintenanceModeEnabledPublic`
   - Added maintenance check to `register` endpoint
   - Added maintenance check to `login` endpoint
   - Added audit logging for blocked logins

3. **Modified:** `server/_core/trpc.ts`
   - Added import of `invalidateMaintenanceModeCache`
   - Updated `invalidateMaintenanceCache()` function

## Security Implications

✅ **Prevents unauthorized access:** Org admins can no longer bypass maintenance mode
✅ **Maintains super admin access:** Platform administrators can still manage system during maintenance
✅ **Audit trail:** All blocked login attempts are logged
✅ **Cache safety:** 10-second TTL ensures cache doesn't stale for long

## Related Previous Fixes

This fix complements previously completed work:
- ✅ Notification duplicate popup fixed (Phase 3)
- ✅ Deployment guide created with all build/deploy commands
- ✅ Template renderer redesigned with HTML support
- ⚠️ Production deployment in progress (npm install, migrations pending)

## Next Steps

1. Upload deploy.zip to production via cPanel File Manager
2. Extract and restart application
3. Test maintenance mode restrictions with org admin account
4. Complete production npm install and migration tasks
5. Test notification duplicate fix on live site

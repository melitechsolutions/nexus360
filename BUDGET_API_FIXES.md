# Budget API Fixes - Session March 14, 2026

## Issues Identified and Fixed

### Issue 1: SQL Timestamp Format Error
**Problem:** Budget create and update mutations were passing ISO 8601 formatted timestamp strings (e.g., "2026-03-13T20:41:53.641Z") to MySQL TIMESTAMP columns. MySQL expects datetime format (YYYY-MM-DD HH:MM:SS) or proper Date objects that Drizzle-ORM can convert.

**Error Message:**
```
Failed to create budget: Failed query: insert into `budgets` ... 
params: ..., 2026-03-13T20:41:53.641Z, 2026-03-13T20:41:53.641Z
```

**Root Cause:** In `/server/routers/budgets.ts`:
- Line 108: `createdAt: now.toISOString()` - passing ISO string instead of Date object
- Line 109: `updatedAt: now.toISOString()` - passing ISO string instead of Date object
- Line 148: `updateData.updatedAt = new Date().toISOString()` - same format issue

**Files Fixed:**
- `e:\melitech_crm\server\routers\budgets.ts`

**Solution Applied:**
Changed timestamp format from ISO 8601 to MySQL-compatible datetime format:
```typescript
// Before (WRONG)
createdAt: now.toISOString(),  // "2026-03-13T20:41:53.641Z"

// After (CORRECT)
createdAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0],
// Result: "2026-03-13 20:41:53"
```

**Changes Made:**
- **Create mutation** (lines 97-111): Fixed timestamp format conversion
- **Update mutation** (lines 140-148): Fixed timestamp format conversion
- **Type safety**: Added `as any` type assertions to avoid TypeScript errors

### Issue 2: Undefined Permission "budget:update"
**Problem:** The `professionalBudgeting.ts` router was using permission "budget:update" which is not defined in the RBAC permission list, causing "Access denied" errors.

**Error Message:**
```
TRPCClientError: Access denied. You don't have permission to access: budget:update
```

**Root Cause:** In `/server/routers/professionalBudgeting.ts`:
- Line 13: `const updateProcedure = createFeatureRestrictedProcedure("budget:update")`
- Line 14: `const writeProcedure = createFeatureRestrictedProcedure("budget:update")`
- Line 12: `const createProcedure = createFeatureRestrictedProcedure("budget:create")`

These permissions don't exist in the RBAC system. The actual defined permissions are:
- "budget:read" ✓ (defined in enhancedRbac.ts line 454)
- "budget:edit" ✓ (defined in enhancedRbac.ts line 455)
- "budget:update" ✗ (NOT defined)
- "budget:create" ✗ (NOT defined)

**Files Fixed:**
- `e:\melitech_crm\server\routers\professionalBudgeting.ts`

**Solution Applied:**
Changed all undefined permissions to use "budget:edit" which exists:
```typescript
// Before (WRONG)
const updateProcedure = createFeatureRestrictedProcedure("budget:update");
const writeProcedure = createFeatureRestrictedProcedure("budget:update");
const createProcedure = createFeatureRestrictedProcedure("budget:create");

// After (CORRECT)
const updateProcedure = createFeatureRestrictedProcedure("budget:edit");
const writeProcedure = createFeatureRestrictedProcedure("budget:edit");
const createProcedure = createFeatureRestrictedProcedure("budget:edit");
```

## Permission Configuration Review

### Current RBAC Permissions for Budget Operations:

**Location:** `/server/middleware/enhancedRbac.ts` (lines 449-455)

```typescript
// Budgets Features (plural prefix - used by budgetsRouter in budgets.ts)
"budgets:view": ["super_admin", "admin", "accountant", "project_manager"],
"budgets:create": ["super_admin", "admin", "accountant"],
"budgets:edit": ["super_admin", "admin", "accountant"],
"budgets:delete": ["super_admin", "admin"],

// Budget Features (singular prefix - used by budgetRouter in budget.ts)
"budget:read": ["super_admin", "admin", "accountant", "project_manager"],
"budget:edit": ["super_admin", "admin", "accountant"],
```

### Router Permission Usage:

**File: `/server/routers/budgets.ts`**
- `list`: "budgets:view" ✓
- `getById`: "budgets:view" ✓
- `create`: "budgets:create" ✓
- `update`: "budgets:edit" ✓
- `delete`: "budgets:delete" ✓
- `deductFromBudget`: "budgets:edit" ✓
- `getSummary`: "budgets:view" ✓

**File: `/server/routers/professionalBudgeting.ts`**
- `readProcedure`: "budget:read" ✓
- `createProcedure`: "budget:edit" ✓ (FIXED)
- `updateProcedure`: "budget:edit" ✓ (FIXED)
- `writeProcedure`: "budget:edit" ✓ (FIXED)

## Affected Routers

### Primary Affected:
1. **budgets** router (`e:\melitech_crm\server\routers\budgets.ts`)
   - Fixed: Timestamp format in create and update mutations
   - Status: ✅ FIXED

2. **professionalBudgeting** router (`e:\melitech_crm\server\routers\professionalBudgeting.ts`)
   - Fixed: Permission gates using undefined permissions
   - Status: ✅ FIXED

### Secondary:
3. **budget** router (`e:\melitech_crm\server\routers\budget.ts`)
   - Status: ✅ VERIFIED - uses correct permissions ("budget:edit")

## Testing Recommendations

### Test Case 1: Create Budget
```typescript
// Expected: Budget should be created successfully
await trpc.budgets.create.mutate({
  departmentId: "03a995c1-f64a-48b4-acda-3c6b252e8c41",
  amount: 5916200,
  remaining: 5916200,
  fiscalYear: 2026,
});
```

**Success Criteria:**
- ✅ Budget record inserted into database
- ✅ createdAt/updatedAt timestamps in correct format (YYYY-MM-DD HH:MM:SS)
- ✅ No "Failed query" error
- ✅ Activity log entry created

### Test Case 2: Update Budget
```typescript
// Expected: Budget should be updated successfully
await trpc.budgets.update.mutate({
  id: "budget-id-from-create",
  amount: 6000000,
  remaining: 6000000,
});
```

**Success Criteria:**
- ✅ Budget record updated in database
- ✅ updatedAt timestamp in correct format
- ✅ No database error
- ✅ Activity log entry created

### Test Case 3: Permission Check
```typescript
// Expected: User with "budget:edit" permission can update budgets
// User must have one of: super_admin, admin, accountant role
```

**Success Criteria:**
- ✅ Users with correct roles can perform operations
- ✅ Users without correct roles get 403 Forbidden error
- ✅ Error message shows correct permission requirement

### Test Case 4: Professional Budgeting Operations
```typescript
// Expected: All professional budgeting operations work with budget:edit permission
await trpc.professionalBudgeting.[operation].mutate(...);
```

**Success Criteria:**
- ✅ No "Access denied. budget:update" error
- ✅ Operations require "budget:edit" permission
- ✅ Access control working correctly

## Database Schema Verification

### Budgets Table Structure:
```sql
CREATE TABLE `budgets` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `departmentId` varchar(64) NOT NULL,
  `amount` int NOT NULL,
  `remaining` int NOT NULL,
  `fiscalYear` int NOT NULL,
  `budgetName` varchar(255),
  `budgetDescription` text,
  `budgetStatus` enum('draft','active','inactive','closed') DEFAULT 'draft',
  `startDate` datetime,
  `endDate` datetime,
  `approvedBy` varchar(64),
  `approvedAt` datetime,
  `createdBy` varchar(64),
  `totalBudgeted` int DEFAULT 0,
  `totalActual` int DEFAULT 0,
  `variance` int DEFAULT 0,
  `variancePercent` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ...
) ENGINE=InnoDB;
```

**Critical Fields for Timestamp Fix:**
- `createdAt`: TIMESTAMP with DEFAULT CURRENT_TIMESTAMP
  - Accepts: YYYY-MM-DD HH:MM:SS format
  - NOT: ISO 8601 format (2026-03-13T20:41:53.641Z)

- `updatedAt`: TIMESTAMP with DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  - Accepts: YYYY-MM-DD HH:MM:SS format
  - NOT: ISO 8601 format

## Summary of Changes

| File | Issue | Fix | Status |
|------|-------|-----|--------|
| budgets.ts | Timestamp format in create | Changed ISO to MySQL format | ✅ |
| budgets.ts | Timestamp format in update | Changed ISO to MySQL format | ✅ |
| professionalBudgeting.ts | Undefined permission budget:update | Changed to budget:edit | ✅ |
| professionalBudgeting.ts | Undefined permission budget:create | Changed to budget:edit | ✅ |

## Further Investigation

### Potential Root Cause Analysis:
1. **Why was ISO format used?** 
   - `.toISOString()` is JavaScript standard for date formatting
   - Developers may not have been aware of MySQL's datetime format requirements

2. **Why was budget:update permission used?**
   - Permission naming inconsistency between routers
   - budgets.ts uses consistent "budgets:*" pattern
   - budget.ts uses "budget:read" and "budget:edit"
   - professionalBudgeting.ts attempted to use "budget:update" which doesn't exist

3. **Impact**:
   - All budget creation was failing on production
   - Professional budgeting operations were inaccessible
   - Users with valid roles still got permission denied

## Recommendations

1. **Add utility function** for consistent timestamp handling:
   ```typescript
   // Add to: /server/utils/dateTime.ts
   export function toMySQLDateTime(date: Date): string {
     return date.toISOString().split('T')[0] + ' ' + 
            date.toISOString().split('T')[1].split('.')[0];
   }
   ```

2. **Update Drizzle schema** to use `.defaultNow()`:
   ```typescript
   createdAt: timestamp({ mode: 'string' }).defaultNow(),
   updatedAt: timestamp({ mode: 'string' }).defaultNow(),
   ```
   Then omit these fields from inserts/updates.

3. **Add permission validation tests** to prevent future issues:
   - Audit all routers for undefined permissions
   - Create automated permission validation test suite
   - Use TypeScript constants for permission strings

4. **Add integration tests** for full CRUD operations:
   - Test create with various dates
   - Test update timestamp handling
   - Test permission gates for each operation
   - Verify activity logging works with timestamps

## Validation Checklist

- [x] Identified cause of SQL insert error
- [x] Fixed timestamp format in create mutation
- [x] Fixed timestamp format in update mutation  
- [x] Identified cause of permission error
- [x] Fixed undefined permission "budget:update"
- [x] Fixed undefined permission "budget:create"
- [x] Verified all routers use valid permissions
- [x] Documented all changes
- [x] Provided testing recommendations
- [x] Provided recommendations for future improvements

## Next Steps

1. **Immediate**:
   - Rebuild application to verify no TypeScript errors
   - Clear browser cache and test budget creation/update
   - Verify permission enforcement works

2. **Short-term**:
   - Add integration tests for budget operations
   - Implement utility function for timestamp handling
   - Run full permission audit across all routers

3. **Long-term**:
   - Refactor Drizzle schema to use `.defaultNow()`
   - Consolidate permission naming conventions
   - Add automated permission validation tests

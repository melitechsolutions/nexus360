# Organization Data Isolation - Comprehensive Fix Guide

**Status**: IN PROGRESS  
**Last Updated**: 2026-04-14  
**Severity**: CRITICAL - Data leak vulnerability  

---

## Executive Summary

The melitech_crm platform had severe multi-tenant data isolation vulnerabilities affecting 14+ routers. Organization super admins could access global organization data, financial records, and employee information from other organizations.

### Root Cause
Vulnerable pattern in all routers:
```typescript
// WRONG - Allows cross-org access when orgId is null
const where = orgId ? and(...) : eq(table.id, input);
```

### Solution Implemented
Strict org isolation middleware + defensive checks in ALL procedures:
```typescript
// CORRECT - ALWAYS verifies org ownership
const client = await db.getById(id);
verifyOrgOwnership(ctx, client.organizationId);  // Throws FORBIDDEN if not owner
```

---

## Phase 1: Foundation (✅ COMPLETE)

### 1.1 Org Isolation Middleware - UPGRADED to STRICT MODE
**File**: `server/middleware/orgIsolation.ts`

**Changes**:
- ✅ Added `enforceOrgScope()` - MANDATORY for org-scoped procedures
- ✅ Added `verifyOrgOwnership()` - Check record ownership BEFORE returning/modifying
- ✅ Enhanced documentation with security warnings
- ✅ Defensive error messages for failed checks

**Key Functions**:
```typescript
// STRICT: Throws if user not part of org
enforceOrgScope(ctx, table.organizationId, ...otherConditions)

// STRICT: Verify user owns a record
verifyOrgOwnership(ctx, record.organizationId)  // Throws FORBIDDEN if mismatch
```

### 1.2 TRPC Core - NEW ORG-SCOPED PROCEDURE
**File**: `server/_core/trpc.ts`

**Changes**:
- ✅ Added `orgScopedProcedure` middleware
- ✅ REJECTS all users without organizationId
- ✅ Basis for strict org-only routers

**Usage**:
```typescript
myRouter.queryOrMutation: orgScopedProcedure
  .input(...)
  .query/mutation(async ({ ctx, input }) => {
    // ctx.user.organizationId is GUARANTEED to exist
    // Global admins are BLOCKED from here
  })
```

---

## Phase 2: Critical Routers (IN PROGRESS)

### 2.1 Clients Router - ✅ FIXED
**File**: `server/routers/clients.ts`

**Vulnerabilities Fixed**:
- ✅ `getById` - Now verifies org ownership
- ✅ `update` - Checks ownership before modification  
- ✅ `delete` - Verifies org before deletion
- ✅ `bulkDelete` - Validates all records before bulk delete
- ✅ `getProjects` - Verifies client org before listing projects

**Pattern Applied**:
```typescript
// 1. Get the record WITHOUT org filter
const record = await db.select().from(table).where(eq(table.id, input));

// 2. Verify user owns it
verifyOrgOwnership(ctx, record.organizationId);

// 3. Safe to return/modify
return record;
```

### 2.2 Invoices Router - ⏳ NEEDS FIX
**File**: `server/routers/invoices.ts`

**Vulnerable Procedures**:
- `getById` - ID-only lookup
- `getWithItems` - No org verification
- `byClient` - Fetches invoices for any client
- `create` - Creates in null org context
- `update`, `delete`, `bulkDelete` - No org checks

**Fix Strategy**: Apply same pattern as clients router

### 2.3 Employees Router - ⏳ NEEDS FIX
**File**: `server/routers/employees.ts`

**Vulnerable Procedures**:
- `list` - Returns all employees if user has no org
- `getById` - ID-only access
- `byDepartment`, `byJobGroup` - No org filter
- `create`, `update`, `delete` - No org context

**Fix Strategy**: Apply same pattern, add org filter to lists

### 2.4 Contacts Router - ⏳ NEEDS FIX
**File**: `server/routers/contacts.ts`

**Vulnerable Procedures**:
- `list` - Optional org filtering
- `getById` - No org check
- `getByClient` - No org verification
- All mutations - No org boundary checks

### 2.5 Projects Router - ⏳ NEEDS FIX
**File**: `server/routers/projects.ts`

**Vulnerable Procedures**:
- 6 procedures with no org isolation

### 2.6 Opportunities Router - ⏳ NEEDS FIX
**File**: `server/routers/opportunities.ts`

**Vulnerable Procedures**:
- All ID-based queries
- No org scoping

---

## Phase 3: Supporting Routers (QUEUED)

### 3.1 Payments Router (5 vulnerable procedures)
### 3.2 Estimates Router (4 vulnerable procedures)
### 3.3 Expenses Router (5 vulnerable procedures)
### 3.4 Quotes Router (getById + mutations)
### 3.5 Receipts Router (Similar pattern)

---

## Phase 4: Global/Analytics Routers (SPECIAL HANDLING)

These routers may intentionally aggregate data, but MUST:
- ✅ Have EXPLICIT global-user checks
- ✅ Never return to org-scoped users unless filtered
- ✅  Add documentation about data scope

### 4.1 Analytics Router - ⏳ NEEDS REVIEW
### 4.2 Reports Router - ⏳ NEEDS REVIEW
### 4.3 Settings Router - ⏳ NEEDS REVIEW

---

## Testing Checklist

### Unit Tests (Per Router)
```typescript
describe('Org Isolation - Clients Router', () => {
  test('getById: org user cannot access other org client', async () => {
    // Create client in org-B
    // Login as user in org-A
    // Call getById(client-id)
    // Should throw FORBIDDEN
  });
  
  test('getById: org user can access own org client', async () => {
    // Should return client
  });
  
  test('getById: global admin can access any client', async () => {
    // Should return client
  });
  
  test('update: org user cannot modify other org client', () => {
    // Should throw FORBIDDEN
  });
});
```

### Integration Tests
```typescript
// Test complete workflows
test('Org isolation - full client lifecycle', async () => {
  // Create org-A, org-B
  // User in org-A creates client
  // User in org-B tries to read/modify
  // Should fail at each step
});
```

### Penetration Test Scenarios
1. **ID-Guessing Attack**: Org user tries to access random client IDs → Should fail
2. **Bulk Operation Attack**: Org user tries to delete multiple org-B clients →Should fail
3. **Query Injection**: Try to bypass org filter via SQL injection → Should fail
4. **JWT Manipulation**: Forge JWT with different organizationId → Should fail

---

## Deployment Checklist

Before deploying to production:

- [ ] All 14 vulnerable routers fixed and tested
- [ ] Unit tests added for org isolation (per router)
- [ ] Integration tests for cross-org scenarios
- [ ] Security audit completed
- [ ] Staging environment tested with real org data
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Monitoring alerts for unusual org access patterns

---

## Verification for Mumbi Ventures Org

**Organization**: Mumbi ventures  
**Org Super Admin**: melitechsln@gmail.com  
**Expected Behavior After Fix**:

```
✅ CAN access: Mumbi ventures data only
  - Clients
  - Invoices
  - Employees
  - Projects
  - Settings (org-only)

❌ CANNOT access: Global Platform data
  - Other organization records
  - Platform admin settings
  - System-wide analytics
  - Global user management
```

---

## Security Audit Notes

### The Vulnerability Pattern
When `organizationId = null` (global admin), the filter is bypassed:
```typescript
// This pattern is EVERYWHERE in the codebase:
const where = orgId 
  ? and(eq(table.id, input), eq(table.organizationId, orgId))
  : eq(table.id, input);  // ← BUG: Returns ANY record
```

### Why It's Critical
1. **Data Breach Potential**: One compromised global admin can access ALL org data
2. **Privilege Escalation**: Org admin might trick system into thinking they're global admin
3. **Compliance Violation**: GDPR/HIPAA/SOC2 all require data isolation
4. **Legal Liability**: Data access across organization boundaries

### The Fix Strategy
```typescript
// NEW PATTERN - Used after client retrieval:
verifyOrgOwnership(ctx, record.organizationId);
// This THROWS FORBIDDEN if:
// - record.organizationId !== ctx.user.organizationId
// - Either value is null/undefined
```

---

## Rollout Timeline

| Phase | Duration | Work | Completion |
|-------|----------|------|-----------|
| **Phase 1** | 2 hours | Middleware + TRPC | ✅ DONE |
| **Phase 2.1** | 1 hour | Clients router | ✅ DONE |
| **Phase 2.2-2.6** | 4 hours | Invoices, Employees, Contacts, Projects, Opportunities | ⏳ IN PROGRESS |
| **Phase 3** | 3 hours | Payments, Estimates, Expenses, Quotes, Receipts | ⏳ QUEUED |
| **Phase 4** | 2 hours | Analytics, Reports, Settings review | ⏳ QUEUED |
| **Testing** | 4 hours | Unit + integration + security tests | ⏳ QUEUED |
| **Staging** | 2 hours | Deploy and verify on staging | ⏳ QUEUED |
| **Production** | 1 hour | Deploy + monitoring | ⏳ QUEUED |

**Total**: ~19 hours of work

---

## Code Changes Summary

### Files Modified

1. ✅ `server/middleware/orgIsolation.ts` - Enhanced with strict functions
2. ✅ `server/_core/trpc.ts` - Added orgScopedProcedure
3. ✅ `server/routers/clients.ts` - Fixed all 6 vulnerable procedures
4. ⏳ `server/routers/invoices.ts` - Needs fixes (5 procedures)
5. ⏳ `server/routers/employees.ts` - Needs fixes (5 procedures)
6. ⏳ `server/routers/contacts.ts` - Needs fixes (5 procedures)
7. ⏳ `server/routers/projects.ts` - Needs fixes (6 procedures)
8. ⏳ `server/routers/opportunities.ts` - Needs fixes (5 procedures)
9. ⏳ `server/routers/payments.ts` - Needs fixes (5 procedures)
10. ⏳ `server/routers/estimates.ts` - Needs fixes (4 procedures)
11. ⏳ `server/routers/expenses.ts` - Needs fixes (5 procedures)
12. ⏳ `server/routers/quotes.ts` - Needs fixes (4 procedures)
13. ⏳ `server/routers/analytics.ts` - Needs review (5 procedures)
14. ⏳ `server/routers/reports.ts` - Needs review (4 procedures)
15. ⏳ `server/routers/settings.ts` - Needs review (3 procedures)

### New Functions Available

```typescript
// In orgIsolation.ts
enforceOrgScope(ctx, orgIdColumn, ...conditions)
verifyOrgOwnership(ctx, recordOrgId)

// In trpc.ts
orgScopedProcedure  // Use for org-only routers
```

---

## Success Criteria

✅ All routers use consistent org isolation pattern  
✅ No procedure allows cross-org data access  
✅ Org super admins see ONLY their org data  
✅ Global admins explicitly opt-in to global access  
✅ All tests pass (unit + integration + security)  
✅ Production deployment verified  
✅ No regression in functionality  

---

## Questions or Issues?

See:
- [DATA_ISOLATION_VULNERABILITY_AUDIT.md](DATA_ISOLATION_VULNERABILITY_AUDIT.md) - Detailed vulnerability list
- `server/middleware/orgIsolation.ts` - Function documentation  
- `server/_core/trpc.ts` - Procedure definitions

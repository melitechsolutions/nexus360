# Legacy Table Cleanup Report

**Generated**: 2026-04-10  
**Database**: `melitech_crm` (MySQL 8)  
**Total extra tables in DB (not in `drizzle/schema.ts`)**: 36  

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| A — Drizzle internal | 1 | **KEEP** |
| B — Active (`schema-extended.ts`) | 20 | **KEEP** |
| C — Orphan with server raw SQL | 1 | **KEEP** (refactor later) |
| D — Orphan with UI but no backend | 1 | **ARCHIVE then DROP** |
| E — Orphan with seed data, no code | 1 | **ARCHIVE then DROP** |
| F — Orphan, empty, no code | 12 | **SAFE to DROP** |
| **Total** | **36** | |

---

## Category A — Drizzle Internal (KEEP)

| Table | Rows | Notes |
|-------|------|-------|
| `__drizzle_migrations` | 2 | Drizzle ORM migration journal. **Never drop.** |

---

## Category B — Active `schema-extended.ts` Tables (KEEP)

These tables have Drizzle schema definitions in `drizzle/schema-extended.ts` (re-exported via `drizzle/index.ts`) and are used by active tRPC routers.

| Table | Rows | Router / Usage |
|-------|------|----------------|
| `suppliers` | 1 | `suppliersRouter` — active procurement module |
| `supplierRatings` | 0 | Paired with suppliers |
| `supplierAudits` | 0 | Paired with suppliers |
| `lpos` | 0 | `lpoRouter` — LPO procurement |
| `imprests` | 0 | `imprestRouter` — cash advances |
| `imprestSurrenders` | 0 | `imprestSurrenderRouter` |
| `invoicePayments` | 0 | Billing module |
| `serviceTemplates` | 0 | `serviceTemplatesRouter` |
| `serviceUsageTracking` | 0 | Paired with serviceTemplates |
| `budgetAllocations` | 0 | `ExpenseForm.tsx` → `expenses.getAvailableBudgetAllocations` |
| `quotes` | 0 | `quotesRouter` |
| `quoteLogs` | 0 | Paired with quotes |
| `salaryStructures` | 0 | `payrollRouter` |
| `salaryAllowances` | 0 | Payroll module |
| `salaryDeductions` | 0 | Payroll module |
| `salaryIncrements` | 0 | Payroll module |
| `employeeBenefits` | 0 | Payroll module |
| `employeeTaxInfo` | 0 | Payroll module |
| `payrollDetails` | 0 | Payroll module |
| `payrollApprovals` | 0 | Payroll module |

**Action**: No changes needed. These are properly managed.

---

## Category C — Orphan with Server Raw SQL Reference (KEEP)

| Table | Rows | Reference |
|-------|------|-----------|
| `purchase_orders` | 0 | `server/routers/approvals.ts` lines 625, 661, 1205 use raw SQL: `UPDATE purchase_orders SET status = ?...` and `SELECT * FROM purchase_orders WHERE ...` |

**Action**: Keep for now. Should be given a Drizzle schema definition in `schema-extended.ts` in a future refactor.

---

## Category D — Orphan with UI Page but No Backend (ARCHIVE → DROP)

| Table | Rows | Notes |
|-------|------|-------|
| `customFields` | 1 | Has `client/src/pages/tools/CustomFields.tsx` UI page and Settings references, but **no server-side tRPC router**. The 1 row is stale test data (`organizationId: "default"`, `entityType: "Contact"`, `fieldName: "UOM"`, `isActive: 0`). |

**Paired empty tables** (depend on `customFields`):

| Table | Rows | Notes |
|-------|------|-------|
| `fieldValidations` | 0 | No schema, no server code |
| `fieldValues` | 0 | No schema, no server code |

**Action**: Archive the 1 data row, then drop all 3 tables. If a custom fields feature is built later, it should use a proper Drizzle schema.

---

## Category E — Orphan with Seed Data, No Code (ARCHIVE → DROP)

| Table | Rows | Notes |
|-------|------|-------|
| `pricingTierDescriptions` | 6 | Contains pricing tier seed data (Trial $0, Starter $99, Accounting Only $49, Growth $199, Professional $399, Enterprise NULL). No server code references this table. May have been used in an earlier billing iteration; current billing uses `schema_pricing.ts` tables (`pricingPlans`, `subscriptions`, etc.) which are separate. |

**Action**: Archive the 6 rows for reference, then drop.

---

## Category F — Orphan, Empty, No Code (SAFE TO DROP)

All of these tables have **0 rows**, **no Drizzle schema definition**, and **no server-side code references**.

| Table | FK Constraints | Origin |
|-------|---------------|--------|
| `budgetLines` | None | Ad-hoc creation script |
| `lpoLineItems` | None | Ad-hoc creation script |
| `receiptItems` | None | Migration 0012 |
| `expenseItems` | None | Migration 0012 |
| `employeeDocuments` | None | Ad-hoc creation script |
| `granularPermissions` | None | Ad-hoc creation script |
| `organizationKycData` | FK → `organizations.id` | Ad-hoc creation script |
| `organizationPolicies` | FK → `organizations.id` | Ad-hoc creation script |
| `organizationSubscriptions` | FK → `organizations.id` | Ad-hoc creation script |
| `paymentTriggers` | FK → `organizations.id` | Ad-hoc creation script |

**Action**: Drop directly. No data loss risk.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Dropping a table that's actually needed | Every table was cross-checked against all `.ts` server routers, Drizzle schema files, and client code |
| Data loss on `customFields` (1 row) | Row is archived in migration SQL before DROP |
| Data loss on `pricingTierDescriptions` (6 rows) | Rows are archived as INSERT statements in migration SQL before DROP |
| FK constraint errors on DROP | Migration drops FK constraints before dropping tables with `organizationId` FKs |
| `purchase_orders` raw SQL breaks | Table is explicitly kept; not part of the drop plan |

---

## Files Referenced

- `drizzle/schema.ts` — 170 table definitions (primary schema)
- `drizzle/schema-extended.ts` — 39 table definitions (extended schema, re-exported via `drizzle/index.ts`)
- `drizzle/schema_pricing.ts` — 7 table definitions (billing schema, NOT re-exported — potential separate issue)
- `drizzle/schema_extended_phase20.ts` — 15 table definitions (NOT re-exported — potential separate issue)
- `server/routers/approvals.ts` — raw SQL references to `purchase_orders`

-- ============================================================================
-- MULTI-TENANCY ISOLATION: Add organizationId to tables missing it
-- Run this BEFORE deploying the router changes
-- ============================================================================

-- 1. payments
ALTER TABLE payments ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_payments_org ON payments(organizationId);

-- 2. receipts
ALTER TABLE receipts ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_receipts_org ON receipts(organizationId);

-- 3. estimates
ALTER TABLE estimates ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_estimates_org ON estimates(organizationId);

-- 4. quotations
ALTER TABLE quotations ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_quotations_org ON quotations(organizationId);

-- 5. contacts
ALTER TABLE contacts ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_contacts_org ON contacts(organizationId);

-- 6. products
ALTER TABLE products ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_products_org ON products(organizationId);

-- 7. services
ALTER TABLE services ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_services_org ON services(organizationId);

-- 8. suppliers
ALTER TABLE suppliers ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_suppliers_org ON suppliers(organizationId);

-- 9. departments
ALTER TABLE departments ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_departments_org ON departments(organizationId);

-- 10. opportunities
ALTER TABLE opportunities ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_opportunities_org ON opportunities(organizationId);

-- 11. projectBudgets
ALTER TABLE projectBudgets ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_project_budgets_org ON projectBudgets(organizationId);

-- 12. departmentBudgets
ALTER TABLE departmentBudgets ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL;
CREATE INDEX idx_dept_budgets_org ON departmentBudgets(organizationId);

-- ============================================================================
-- BACKFILL: Populate organizationId from related tables
-- ============================================================================

-- Backfill payments from invoices (invoices already have organizationId)
UPDATE payments p
JOIN invoices i ON p.invoiceId = i.id
SET p.organizationId = i.organizationId
WHERE p.organizationId IS NULL AND i.organizationId IS NOT NULL;

-- Backfill receipts from clients
UPDATE receipts r
JOIN clients c ON r.clientId = c.id
SET r.organizationId = c.organizationId
WHERE r.organizationId IS NULL AND c.organizationId IS NOT NULL;

-- Backfill estimates from clients
UPDATE estimates e
JOIN clients c ON e.clientId = c.id
SET e.organizationId = c.organizationId
WHERE e.organizationId IS NULL AND c.organizationId IS NOT NULL;

-- Backfill contacts from clients
UPDATE contacts ct
JOIN clients c ON ct.clientId = c.id
SET ct.organizationId = c.organizationId
WHERE ct.organizationId IS NULL AND c.organizationId IS NOT NULL;

-- Backfill opportunities from clients
UPDATE opportunities o
JOIN clients c ON o.clientId = c.id
SET o.organizationId = c.organizationId
WHERE o.organizationId IS NULL AND c.organizationId IS NOT NULL;

-- Backfill projectBudgets from projects
UPDATE projectBudgets pb
JOIN projects p ON pb.projectId = p.id
SET pb.organizationId = p.organizationId
WHERE pb.organizationId IS NULL AND p.organizationId IS NOT NULL;

-- Backfill products from createdBy user
UPDATE products pr
JOIN users u ON pr.createdBy = u.id
SET pr.organizationId = u.organizationId
WHERE pr.organizationId IS NULL AND u.organizationId IS NOT NULL;

-- Backfill services from createdBy user
UPDATE services s
JOIN users u ON s.createdBy = u.id
SET s.organizationId = u.organizationId
WHERE s.organizationId IS NULL AND u.organizationId IS NOT NULL;

-- Backfill suppliers from createdBy user
UPDATE suppliers s
JOIN users u ON s.createdBy = u.id
SET s.organizationId = u.organizationId
WHERE s.organizationId IS NULL AND u.organizationId IS NOT NULL;

-- Backfill departments from createdBy user
UPDATE departments d
JOIN users u ON d.createdBy = u.id
SET d.organizationId = u.organizationId
WHERE d.organizationId IS NULL AND u.organizationId IS NOT NULL;

-- Backfill quotations from createdBy user
UPDATE quotations q
JOIN users u ON q.createdBy = u.id
SET q.organizationId = u.organizationId
WHERE q.organizationId IS NULL AND u.organizationId IS NOT NULL;

-- Backfill departmentBudgets from departments
UPDATE departmentBudgets db
JOIN departments d ON db.departmentId = d.id
SET db.organizationId = d.organizationId
WHERE db.organizationId IS NULL AND d.organizationId IS NOT NULL;

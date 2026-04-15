-- Migration: Add organizationId to all main data tables for multi-tenant isolation
-- Run this against the MySQL database

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE leaveRequests ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE workOrders ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE communicationLogs ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64) AFTER id;

-- Add indexes for performance
ALTER TABLE accounts ADD INDEX IF NOT EXISTS idx_accounts_org (organizationId);
ALTER TABLE clients ADD INDEX IF NOT EXISTS idx_clients_org (organizationId);
ALTER TABLE invoices ADD INDEX IF NOT EXISTS idx_invoices_org (organizationId);
ALTER TABLE expenses ADD INDEX IF NOT EXISTS idx_expenses_org (organizationId);
ALTER TABLE projects ADD INDEX IF NOT EXISTS idx_projects_org (organizationId);
ALTER TABLE payments ADD INDEX IF NOT EXISTS idx_payments_org (organizationId);
ALTER TABLE employees ADD INDEX IF NOT EXISTS idx_employees_org (organizationId);
ALTER TABLE leaveRequests ADD INDEX IF NOT EXISTS idx_leave_org (organizationId);
ALTER TABLE attendance ADD INDEX IF NOT EXISTS idx_attendance_org (organizationId);
ALTER TABLE contracts ADD INDEX IF NOT EXISTS idx_contracts_org (organizationId);
ALTER TABLE tickets ADD INDEX IF NOT EXISTS idx_tickets_org (organizationId);
ALTER TABLE workOrders ADD INDEX IF NOT EXISTS idx_workorders_org (organizationId);
ALTER TABLE budgets ADD INDEX IF NOT EXISTS idx_budgets_org (organizationId);
ALTER TABLE communicationLogs ADD INDEX IF NOT EXISTS idx_commlogs_org (organizationId);
ALTER TABLE procurement_requests ADD INDEX IF NOT EXISTS idx_procurement_org (organizationId);

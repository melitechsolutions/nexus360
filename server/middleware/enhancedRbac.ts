/**
 * Enhanced Role-Based Access Control (RBAC) Middleware
 * 
 * This module provides factory functions to create TRPC procedures
 * with built-in permission enforcement at the API level.
 * Supports both hardcoded system roles AND dynamic custom roles.
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { customRoles, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  ACCOUNTANT: "accountant",
  HR: "hr",
  STAFF: "staff",
  CLIENT: "client",
  PROJECT_MANAGER: "project_manager",
  PROCUREMENT_MANAGER: "procurement_manager",
  ICT_MANAGER: "ict_manager",
  SALES_MANAGER: "sales_manager",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Role-based access permissions mapping
 * Defines which roles can access which features
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    "admin:manage_users",
    "admin:manage_roles",
    "admin:settings",
    "admin:system",
    "accounting:*",
    "hr:*",
    "sales:*",
    "projects:*",
    "clients:*",
    "procurement:*",
  ],
  admin: [
    "accounting:*",
    "hr:manage_staff",
    "sales:*",
    "projects:*",
    "clients:*",
    "procurement:*",
  ],
  accountant: [
    "accounting:invoices",
    "accounting:payments",
    "accounting:expenses",
    "accounting:reports",
    "accounting:chart_of_accounts",
    "accounting:reconciliation",
  ],
  hr: [
    "hr:employees",
    "hr:payroll",
    "hr:leave",
    "hr:attendance",
    "hr:departments",
  ],
  project_manager: [
    "projects:*",
    "clients:view",
    "sales:view",
    "accounting:view_invoices",
  ],
  staff: [
    "projects:view_own",
    "clients:view",
    "hr:view_own_records",
  ],
  client: [
    "client_portal:dashboard",
    "client_portal:invoices",
    "client_portal:projects",
    "client_portal:payments",
  ],
  procurement_manager: [
    "procurement:*",
    "accounting:view",
    "accounting:expenses:view",
    "accounting:payments:view",
    "clients:view",
    "products:view",
    "suppliers:*",
  ],
  ict_manager: [
    // Views for core data - read-only access to overview data
    "accounting:invoices:view",
    "accounting:payments:view",
    "accounting:expenses:view",
    "accounting:reports:view",
    "hr:employees:view",
    "hr:departments:view",
    "projects:view",
    "clients:view",
    "procurement:lpo:view",
    "procurement:imprest:view",
    "analytics:view",
    // System & Technical Management - full control
    "admin:system",
    "admin:settings",
    "admin:maintenance",
    "communications:email_queue",
    "auth:sessions",
    "auth:manage_sessions",
    "auth:export_user_data",
    "system:health",
    "system:monitoring",
    "system:logs",
    "system:backups",
    "users:view",
    "users:deactivate",
    "audit:view",
    "audit:export",
    "settings:integrations",
    "settings:security",
    "settings:notifications",
  ],
  sales_manager: [
    "sales:*",
    "clients:*",
    "projects:view",
    "accounting:invoices:view",
    "accounting:invoices:create",
    "accounting:payments:view",
    "accounting:expenses:view",
    "accounting:reports:view",
    "estimates:*",
    "opportunities:*",
    "receipts:view",
    "analytics:view",
  ],
};

/**
 * Feature-based access mapping
 * Maps features and modules to required roles
 */
export const FEATURE_ACCESS: Record<string, UserRole[]> = {
  // Admin Features
  "admin:manage_users": ["super_admin"],
  "admin:manage_roles": ["super_admin"],
  "admin:settings": ["super_admin", "admin", "ict_manager"],
  "admin:maintenance": ["super_admin", "ict_manager"],
  "admin:system": ["super_admin", "admin", "ict_manager"],

  // Enterprise / Multi-Tenancy (global platform only)
  "enterprise:view": ["super_admin", "ict_manager"],
  "enterprise:create": ["super_admin", "ict_manager"],
  "enterprise:edit": ["super_admin", "ict_manager"],
  "enterprise:delete": ["super_admin"],
  "admin:view": ["super_admin", "admin", "ict_manager"],
  "admin:edit": ["super_admin", "admin"],

  // User Management & Permissions
  "users:edit": ["super_admin", "admin", "ict_manager"],
  "users:view": ["super_admin", "admin", "ict_manager"],
  "users:create": ["super_admin", "admin", "ict_manager"],
  "users:delete": ["super_admin", "admin"],
  "users:update": ["super_admin", "admin", "ict_manager"],
  "users:permissions": ["super_admin"],
  "users:permissions:edit": ["super_admin", "ict_manager"],
  "users:permissions:view": ["super_admin", "admin", "ict_manager"],
  "users:roles": ["super_admin"],
  "users:roles:edit": ["super_admin"],
  "users:read": ["super_admin", "admin", "ict_manager"],

  // Accounting Features
  "accounting:invoices": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "ict_manager"],
  "accounting:invoices:view": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "ict_manager"],
  "accounting:invoices:create": ["super_admin", "admin", "accountant", "sales_manager", "ict_manager"],
  "accounting:invoices:edit": ["super_admin", "admin", "accountant", "ict_manager"],
  "accounting:invoices:delete": ["super_admin", "admin"],
  "accounting:invoices:approve": ["super_admin", "admin", "accountant"],
  
  // Generic accounting permissions (used by bankReconciliation)
  "accounting:read": ["super_admin", "admin", "accountant", "project_manager", "ict_manager"],
  "accounting:create": ["super_admin", "admin", "accountant"],
  "accounting:edit": ["super_admin", "admin", "accountant"],
  "accounting:delete": ["super_admin", "admin"],

  "accounting:receipts": ["super_admin", "admin", "accountant", "project_manager", "ict_manager"],
  "accounting:receipts:view": ["super_admin", "admin", "accountant", "project_manager", "ict_manager"],
  "accounting:receipts:create": ["super_admin", "admin", "accountant"],
  "accounting:receipts:edit": ["super_admin", "admin", "accountant"],
  "accounting:receipts:delete": ["super_admin", "admin"],

  "accounting:payments": ["super_admin", "admin", "accountant"],
  "accounting:payments:view": ["super_admin", "admin", "accountant", "project_manager", "sales_manager"],
  "accounting:payments:record": ["super_admin", "admin", "accountant"],
  "accounting:payments:create": ["super_admin", "admin", "accountant"],
  "accounting:payments:edit": ["super_admin", "admin", "accountant"],
  "accounting:payments:delete": ["super_admin", "admin"],
  "accounting:payments:approve": ["super_admin", "admin", "accountant"],
  "accounting:payments:reconcile": ["super_admin", "admin", "accountant"],
  "accounting:payments:refund": ["super_admin", "admin"],

  "accounting:expenses": ["super_admin", "admin", "accountant", "project_manager"],
  "accounting:expenses:view": ["super_admin", "admin", "accountant", "project_manager"],
  "accounting:expenses:create": ["super_admin", "admin", "accountant", "staff"],
  "accounting:expenses:edit": ["super_admin", "admin", "accountant"],
  "accounting:expenses:approve": ["super_admin", "admin", "accountant"],
  "accounting:expenses:reject": ["super_admin", "admin", "accountant"],
  "accounting:expenses:delete": ["super_admin", "admin"],
  "accounting:expenses:budget": ["super_admin", "admin", "accountant"],

  "accounting:reports": ["super_admin", "admin", "accountant"],
  "accounting:reports:view": ["super_admin", "admin", "accountant"],
  "accounting:chart_of_accounts": ["super_admin", "admin", "accountant"],
  "accounting:chart_of_accounts:view": ["super_admin", "admin", "accountant"],
  "accounting:reconciliation": ["super_admin", "admin", "accountant"],
  "accounting:reconciliation:view": ["super_admin", "admin", "accountant"],

  // HR Features
  "hr:view": ["super_admin", "admin", "hr"],
  "hr:edit": ["super_admin", "admin", "hr"],
  "hr:employees": ["super_admin", "admin", "hr"],
  "hr:employees:view": ["super_admin", "admin", "hr", "project_manager"],
  "hr:employees:create": ["super_admin", "admin", "hr"],
  "hr:employees:edit": ["super_admin", "admin", "hr"],
  "hr:employees:delete": ["super_admin", "admin"],

  // Standalone employee read/write features (used by employees router directly)
  "employees:read": ["super_admin", "admin", "hr", "project_manager", "ict_manager"],
  "employees:view": ["super_admin", "admin", "hr", "project_manager"],
  "employees:edit": ["super_admin", "admin", "hr"],
  "employees:create": ["super_admin", "admin", "hr"],
  "employees:update": ["super_admin", "admin", "hr"],
  "employees:delete": ["super_admin", "admin"],

  "hr:departments": ["super_admin", "admin", "hr"],
  "hr:departments:view": ["super_admin", "admin", "hr"],
  "hr:departments:create": ["super_admin", "admin", "hr"],
  "hr:departments:edit": ["super_admin", "admin", "hr"],
  "hr:departments:delete": ["super_admin", "admin"],

  "hr:jobGroups": ["super_admin", "admin", "hr"],
  "hr:jobGroups:view": ["super_admin", "admin", "hr"],
  "hr:jobGroups:create": ["super_admin", "admin", "hr"],
  "hr:jobGroups:edit": ["super_admin", "admin", "hr"],
  "hr:jobGroups:delete": ["super_admin", "admin"],

  // Standalone job groups (used by jobGroups router)
  "jobGroups:read": ["super_admin", "admin", "hr"],
  "jobGroups:create": ["super_admin", "admin", "hr"],
  "jobGroups:edit": ["super_admin", "admin", "hr"],
  "jobGroups:delete": ["super_admin", "admin"],

  "hr:payroll": ["super_admin", "admin", "hr"],
  "hr:payroll:view": ["super_admin", "admin", "hr"],
  "hr:payroll:create": ["super_admin", "admin", "hr"],
  "hr:payroll:approve": ["super_admin", "admin", "hr"],

  // Standalone payroll features (used by payslips router)
  "payroll:view": ["super_admin", "admin", "hr", "accountant"],
  "payroll:edit": ["super_admin", "admin", "hr"],

  "hr:leave": ["super_admin", "admin", "hr"],
  "hr:leave:approve": ["super_admin", "admin", "hr"],

  "hr:attendance": ["super_admin", "admin", "hr"],

  // Generic HR attendance permissions
  "attendance:read": ["super_admin", "admin", "hr"],
  "attendance:create": ["super_admin", "admin", "hr"],
  "attendance:edit": ["super_admin", "admin", "hr"],
  "attendance:delete": ["super_admin", "admin"],

  // Standalone estimate features (used by estimates router)
  "estimates:read": ["super_admin", "admin", "project_manager", "accountant", "sales_manager"],
  "estimates:create": ["super_admin", "admin", "project_manager", "sales_manager"],
  "estimates:edit": ["super_admin", "admin", "project_manager", "sales_manager"],
  "estimates:delete": ["super_admin", "admin"],
  "estimates:approve": ["super_admin", "admin", "project_manager", "sales_manager"],
  "estimates:send": ["super_admin", "admin", "project_manager", "sales_manager"],
  "estimates:view": ["super_admin", "admin", "project_manager", "accountant", "sales_manager"],

  // Estimates to Approvals (route estimates through approval system)
  "estimates:submit_for_approval": ["super_admin", "admin", "project_manager", "sales_manager"],
  "estimates:approvals": ["super_admin", "admin", "accountant"],

  "sales:receipts": ["super_admin", "admin", "accountant", "project_manager", "sales_manager"],


  // Procurement
  "procurement:view": ["super_admin", "admin", "procurement_manager"],
  "procurement:suppliers": ["super_admin", "admin"],
  "procurement:suppliers:view": ["super_admin", "admin"],
  "procurement:suppliers:create": ["super_admin", "admin"],
  "procurement:suppliers:edit": ["super_admin", "admin"],
  "procurement:suppliers:delete": ["super_admin", "admin"],

  "procurement:lpo": ["super_admin", "admin"],
  "procurement:lpo:view": ["super_admin", "admin", "accountant", "project_manager"],
  "procurement:lpo:create": ["super_admin", "admin", "project_manager"],
  "procurement:lpo:edit": ["super_admin", "admin", "project_manager"],
  "procurement:lpo:delete": ["super_admin", "admin"],
  "procurement:lpo:approve": ["super_admin", "admin"],

  "procurement:imprest": ["super_admin", "admin"],
  "procurement:imprest:view": ["super_admin", "admin", "accountant"],
  "procurement:imprest:create": ["super_admin", "admin", "staff"],
  "procurement:imprest:edit": ["super_admin", "admin"],
  "procurement:imprest:delete": ["super_admin", "admin"],
  "procurement:imprest:approve": ["super_admin", "admin"],

  "procurement:orders": ["super_admin", "admin"],
  "procurement:orders:view": ["super_admin", "admin", "procurement_manager"],
  "procurement:orders:create": ["super_admin", "admin", "procurement_manager"],
  "procurement:orders:edit": ["super_admin", "admin", "procurement_manager"],
  "procurement:orders:delete": ["super_admin", "admin"],
  // Analytics view permission used by dashboard and reports
  "analytics:view": ["super_admin", "admin", "accountant", "project_manager", "ict_manager", "sales_manager"],

  // Communications / email queue management
  "communications:email_queue": ["super_admin", "admin", "ict_manager"],

  // Authentication utilities
  "auth:sessions": ["super_admin", "admin", "ict_manager"],
  "auth:export_user_data": ["super_admin", "admin", "ict_manager"],

  // Clients Features
  "clients:view": ["super_admin", "admin", "accountant", "project_manager", "procurement_manager", "sales_manager"],
  "clients:create": ["super_admin", "admin", "project_manager", "sales_manager"],
  "clients:edit": ["super_admin", "admin", "project_manager", "sales_manager"],
  "clients:delete": ["super_admin", "admin"],
  "clients:manage_relationships": ["super_admin", "admin", "project_manager", "sales_manager"],

  // Products & Services
  "products:view": ["super_admin", "admin", "accountant", "project_manager", "staff", "procurement_manager"],
  "products:create": ["super_admin", "admin"],
  "products:edit": ["super_admin", "admin"],
  "products:delete": ["super_admin", "admin"],
  "products:manage_inventory": ["super_admin", "admin", "procurement_manager"],

  "services:view": ["super_admin", "admin", "project_manager", "staff"],
  "services:create": ["super_admin", "admin"],
  "services:edit": ["super_admin", "admin"],
  "services:delete": ["super_admin", "admin"],

  // Projects Features
  "projects:view": ["super_admin", "admin", "project_manager", "staff"],
  "projects:create": ["super_admin", "admin", "project_manager"],
  "projects:edit": ["super_admin", "admin", "project_manager"],
  "projects:delete": ["super_admin", "admin"],
  "projects:manage_team": ["super_admin", "admin", "project_manager"],
  "projects:manage_milestones": ["super_admin", "admin", "project_manager"],
  "projects:manage_budget": ["super_admin", "admin", "accountant", "project_manager"],

  // Sales Features
  "sales:view": ["super_admin", "admin", "project_manager", "accountant", "sales_manager"],
  "sales:create": ["super_admin", "admin", "project_manager", "sales_manager"],
  "sales:edit": ["super_admin", "admin", "project_manager", "sales_manager"],
  "sales:delete": ["super_admin", "admin"],
  "sales:pipeline": ["super_admin", "admin", "project_manager", "sales_manager"],
  "sales:opportunities": ["super_admin", "admin", "project_manager", "sales_manager"],
  "sales:opportunities:create": ["super_admin", "admin", "project_manager", "sales_manager"],
  "sales:opportunities:edit": ["super_admin", "admin", "project_manager", "sales_manager"],
  "sales:opportunities:delete": ["super_admin", "admin"],

  // Dashboard Features
  "dashboard:view": ["super_admin", "admin", "accountant", "project_manager", "hr", "staff", "ict_manager", "sales_manager"],
  "dashboard:customize": ["super_admin", "admin", "project_manager", "sales_manager"],
  "dashboard:edit": ["super_admin", "admin"],

  // Departments Features
  "departments:view": ["super_admin", "admin", "hr", "project_manager"],
  "departments:create": ["super_admin", "admin", "hr"],
  "departments:edit": ["super_admin", "admin", "hr"],
  "departments:delete": ["super_admin", "admin"],
  "departments:read": ["super_admin", "admin", "hr", "project_manager"],

  // Reports Features (with department access)
  "reports:view": ["super_admin", "admin", "accountant", "project_manager", "hr", "sales_manager", "ict_manager"],
  "reports:create": ["super_admin", "admin"],
  "reports:financial": ["super_admin", "admin", "accountant"],
  "reports:sales": ["super_admin", "admin", "project_manager", "accountant", "sales_manager"],
  "reports:projects": ["super_admin", "admin", "project_manager"],
  "reports:hr": ["super_admin", "admin", "hr"],
  "reports:procurement": ["super_admin", "admin", "procurement_manager"],
  "reports:export": ["super_admin", "admin", "accountant", "project_manager", "hr"],
  "reports:departments": ["super_admin", "admin", "hr"],

  // AI Features - Chat & Assistance
  "ai:access": ["super_admin", "admin", "project_manager", "sales_manager", "accountant", "hr", "staff", "ict_manager"],
  "ai:summarize": ["super_admin", "admin", "project_manager", "sales_manager", "accountant", "hr", "staff", "ict_manager"],
  "ai:generateEmail": ["super_admin", "admin", "project_manager", "sales_manager", "accountant", "hr", "staff", "ict_manager"],
  "ai:chat": ["super_admin", "admin", "project_manager", "sales_manager", "accountant", "hr", "staff", "ict_manager"],
  "ai:financial": ["super_admin", "admin", "project_manager", "sales_manager", "accountant", "hr", "ict_manager"],
  "ai:modal": ["super_admin", "admin", "project_manager", "sales_manager", "accountant", "hr", "staff", "ict_manager"],

  // Chat/IntraChat Features
  "communications:chat": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager"],
  "communications:intrachat": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager"],
  "communications:ai_assistant": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager"],

  // Support & Communications
  "communications:view": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager"],
  "communications:manage": ["super_admin", "admin", "ict_manager", "hr", "accountant", "sales_manager", "project_manager"],

  // Notifications
  "notifications:read": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager"],
  "notifications:create": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager"],
  "communications:email": ["super_admin", "admin", "ict_manager", "hr", "accountant", "sales_manager", "project_manager"],
  "communications:notifications": ["super_admin", "admin", "ict_manager", "hr", "accountant", "sales_manager", "project_manager", "staff"],
  "communications:tickets": ["super_admin", "admin", "staff"],
  "communications:tickets:create": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager", "procurement_manager", "client"],
  "communications:tickets:resolve": ["super_admin", "admin", "ict_manager", "project_manager", "hr", "accountant", "sales_manager", "procurement_manager"],

  // System Settings
  "settings:view": ["super_admin", "admin", "ict_manager"],
  "settings:edit": ["super_admin", "admin", "ict_manager"],
  "settings:company": ["super_admin", "admin"],
  "settings:billing": ["super_admin", "admin"],
  "settings:integrations": ["super_admin", "admin", "ict_manager"],
  "settings:security": ["super_admin", "ict_manager"],
  "settings:roles": ["super_admin"],
  "settings:audit": ["super_admin", "admin", "ict_manager"],

  // Tools & Utilities
  "tools:import_export": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "procurement_manager", "ict_manager", "hr", "staff", "client"],
  "import:create": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "procurement_manager", "ict_manager", "hr", "staff", "client"],
  "import:read": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "procurement_manager", "ict_manager", "hr", "staff", "client"],
  "import:restore": ["super_admin", "admin"],
  "export:create": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "procurement_manager", "ict_manager", "hr", "staff", "client"],
  "data:import": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "procurement_manager", "ict_manager", "hr", "staff", "client"],
  "data:export": ["super_admin", "admin", "accountant", "project_manager", "sales_manager", "procurement_manager", "ict_manager", "hr", "staff", "client"],
  "tools:data_backup": ["super_admin", "admin", "ict_manager"],
  "tools:system_health": ["super_admin", "admin", "ict_manager"],
  "tools:api_management": ["super_admin", "admin", "ict_manager"],
  "tools:automation": ["super_admin", "admin", "ict_manager"],
  "tools:workflows": ["super_admin", "admin", "ict_manager"],

  // Client Portal
  "client_portal:dashboard": ["client"],
  "client_portal:invoices": ["client"],
  "client_portal:projects": ["client"],
  "client_portal:payments": ["client"],

  // Approvals Features
  "approvals:view": ["super_admin", "admin", "accountant", "hr"],
  "approvals:read": ["super_admin", "admin", "accountant", "hr"],
  "approvals:approve": ["super_admin", "admin", "accountant", "hr"],
  "approvals:reject": ["super_admin", "admin", "accountant", "hr"],
  "approvals:delete": ["super_admin", "admin"],

  // Chart of Accounts Features
  "chartOfAccounts:read": ["super_admin", "admin", "accountant"],
  "chartOfAccounts:create": ["super_admin", "admin", "accountant"],
  "chartOfAccounts:edit": ["super_admin", "admin", "accountant"],
  "chartOfAccounts:delete": ["super_admin", "admin"],

  // Budgets Features (prefix: budgets)
  "budgets:view": ["super_admin", "admin", "accountant", "project_manager"],
  "budgets:create": ["super_admin", "admin", "accountant"],
  "budgets:edit": ["super_admin", "admin", "accountant"],
  "budgets:delete": ["super_admin", "admin"],

  // Budget Features (prefix: budget - used by budget router)
  "budget:read": ["super_admin", "admin", "accountant", "project_manager"],
  "budget:edit": ["super_admin", "admin", "accountant"],

  // Invoice Features
  "invoices:view": ["super_admin", "admin", "accountant", "project_manager"],
  "invoices:create": ["super_admin", "admin", "accountant"],
  "invoices:edit": ["super_admin", "admin", "accountant"],
  "invoices:delete": ["super_admin", "admin"],
  "invoices:read": ["super_admin", "admin", "accountant", "project_manager"],

  // Expense Features
  "expenses:view": ["super_admin", "admin", "accountant", "project_manager"],
  "expenses:create": ["super_admin", "admin", "accountant", "staff"],
  "expenses:edit": ["super_admin", "admin", "accountant"],
  "expenses:delete": ["super_admin", "admin"],
  "expenses:read": ["super_admin", "admin", "accountant", "project_manager"],

  // Payment Features
  "payments:view": ["super_admin", "admin", "accountant", "project_manager"],
  "payments:create": ["super_admin", "admin", "accountant"],
  "payments:edit": ["super_admin", "admin", "accountant"],
  "payments:delete": ["super_admin", "admin"],
  "payments:read": ["super_admin", "admin", "accountant", "project_manager"],
  "payments:reconcile": ["super_admin", "admin", "accountant"],

  // Client Features (ensure all CRUD operations exist)
  "clients:read": ["super_admin", "admin", "project_manager", "accountant", "procurement_manager", "ict_manager", "sales_manager"],

  // Communications Features
  "communications:read": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager", "procurement_manager"],
  "communications:messaging": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager", "procurement_manager"],
  "communications:send": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant", "sales_manager", "ict_manager", "procurement_manager"],

  // Filters & Saved Views
  "filters:create": ["super_admin", "admin", "accountant", "project_manager", "hr", "staff", "ict_manager", "procurement_manager", "sales_manager", "client"],
  "filters:read": ["super_admin", "admin", "accountant", "project_manager", "hr", "staff", "ict_manager", "procurement_manager", "sales_manager", "client"],
  "filters:update": ["super_admin", "admin", "accountant", "project_manager", "hr", "staff", "ict_manager", "procurement_manager", "sales_manager", "client"],
  "filters:delete": ["super_admin", "admin", "accountant", "project_manager", "hr", "staff", "ict_manager", "procurement_manager", "sales_manager", "client"],

  // Phase 20 - Business Intelligence & Analytics
  "analytics:reports": ["super_admin", "admin", "accountant", "project_manager", "hr", "sales_manager"],
  "analytics:dashboards": ["super_admin", "admin", "project_manager", "accountant"],
  "analytics:export": ["super_admin", "admin", "accountant"],

  // Phase 20 - Supplier Management
  "suppliers:view": ["super_admin", "admin", "procurement_manager"],
  "suppliers:create": ["super_admin", "admin", "procurement_manager"],
  "suppliers:edit": ["super_admin", "admin", "procurement_manager"],
  "suppliers:delete": ["super_admin", "admin"],
  "suppliers:read": ["super_admin", "admin", "procurement_manager"],

  // Phase 20 - Quotations/RFQs
  "quotations:view": ["super_admin", "admin", "procurement_manager", "accountant"],
  "quotations:create": ["super_admin", "admin", "procurement_manager"],
  "quotations:edit": ["super_admin", "admin", "procurement_manager"],
  "quotations:delete": ["super_admin", "admin"],
  "quotations:approve": ["super_admin", "admin"],

  // Phase 20 - Delivery Notes  
  "delivery_notes:view": ["super_admin", "admin", "procurement_manager", "accountant", "staff"],
  "delivery_notes:create": ["super_admin", "admin", "procurement_manager", "staff"],
  "delivery_notes:edit": ["super_admin", "admin", "procurement_manager"],
  "delivery_notes:delete": ["super_admin", "admin"],

  // Phase 20 - Goods Received Notes
  "grn:view": ["super_admin", "admin", "procurement_manager", "accountant", "staff"],
  "grn:create": ["super_admin", "admin", "procurement_manager", "staff"],
  "grn:edit": ["super_admin", "admin", "procurement_manager"],
  "grn:delete": ["super_admin", "admin"],

  // Phase 20 - Warranty Management
  "warranty:view": ["super_admin", "admin", "ict_manager", "procurement_manager"],
  "warranty:create": ["super_admin", "admin", "ict_manager", "procurement_manager"],
  "warranty:edit": ["super_admin", "admin", "ict_manager", "procurement_manager"],
  "warranty:delete": ["super_admin", "admin"],

  // Phase 20 - Asset Management
  "assets:view": ["super_admin", "admin", "ict_manager", "procurement_manager"],
  "assets:create": ["super_admin", "admin", "ict_manager", "procurement_manager"],
  "assets:edit": ["super_admin", "admin", "ict_manager", "procurement_manager"],
  "assets:delete": ["super_admin", "admin"],

  // Phase 20 - Document Management
  "documents:view": ["super_admin", "admin", "staff", "project_manager"],
  "documents:create": ["super_admin", "admin", "staff", "project_manager"],
  "documents:edit": ["super_admin", "admin", "project_manager"],
  "documents:delete": ["super_admin", "admin"],
  "documents:upload": ["super_admin", "admin", "staff", "project_manager", "hr", "accountant"],

  // Phase 20 - Contract Management
  "contracts:view": ["super_admin", "admin", "procurement_manager", "accountant"],
  "contracts:create": ["super_admin", "admin", "procurement_manager"],
  "contracts:edit": ["super_admin", "admin", "procurement_manager"],
  "contracts:delete": ["super_admin", "admin"],
  "contracts:approve": ["super_admin", "admin"],

  // Remaining missing features
  "leave:read": ["super_admin", "admin", "hr"],
  "leave:approve": ["super_admin", "admin", "hr"],
  "leave:create": ["super_admin", "admin", "hr", "staff"],
  "leave:delete": ["super_admin", "admin", "hr"]
};

/**
 * Check if user has permission for a feature
 * Supports both explicit features and wildcard permissions
 * 
 * Examples:
 * - canAccessFeature("super_admin", "clients:read")
 * - With ROLE_PERMISSIONS["super_admin"] = ["clients:*"], this returns true
 */
export function canAccessFeature(userRole: UserRole, feature: string): boolean {
  // Super admin has unrestricted access to all features
  if (userRole === ROLES.SUPER_ADMIN) return true;

  // First, check if the exact feature is in FEATURE_ACCESS
  const allowedRoles = FEATURE_ACCESS[feature];
  if (allowedRoles && allowedRoles.includes(userRole)) {
    return true;
  }

  // Second, check if user has wildcard permission for this feature
  // Example: feature="clients:read", userRole has "clients:*" in ROLE_PERMISSIONS
  const userPermissions = ROLE_PERMISSIONS[userRole];
  if (!userPermissions) return false;

  // Extract the module prefix from the feature (e.g., "clients" from "clients:read")
  const modulePrefix = feature.split(":")[0];

  // Check if user has wildcard permission for this module
  return userPermissions.includes(`${modulePrefix}:*`);
}

/**
 * Check if a custom role's permissions include a specific feature
 * Supports wildcards in the custom role's permission list
 */
export function customRoleCanAccessFeature(customPermissions: string[], feature: string): boolean {
  if (!customPermissions || customPermissions.length === 0) return false;
  
  // Direct match
  if (customPermissions.includes(feature)) return true;
  
  // Wildcard match (e.g., "clients:*" matches "clients:read")
  const modulePrefix = feature.split(":")[0];
  if (customPermissions.includes(`${modulePrefix}:*`)) return true;
  
  return false;
}

/**
 * Resolve user permissions - checks custom role first, then falls back to system role
 * This is the primary permission check that should be used in procedures
 */
export async function resolveUserPermission(
  userId: string,
  userRole: UserRole,
  customRoleId: string | null | undefined,
  feature: string
): Promise<boolean> {
  // Super admin always has access
  if (userRole === ROLES.SUPER_ADMIN) return true;

  // If user has a custom role, check custom role permissions
  if (customRoleId) {
    try {
      const db = await getDb();
      if (db) {
        const roles = await db.select().from(customRoles)
          .where(and(eq(customRoles.id, customRoleId), eq(customRoles.isActive, 1)))
          .limit(1);
        
        if (roles.length > 0 && roles[0].permissions) {
          const perms: string[] = JSON.parse(roles[0].permissions as string);
          if (customRoleCanAccessFeature(perms, feature)) return true;
          
          // If custom role has a baseRole, also check baseRole permissions
          if (roles[0].baseRole) {
            return canAccessFeature(roles[0].baseRole as UserRole, feature);
          }
          return false;
        }
      }
    } catch (e) {
      // Fall through to system role check on error
    }
  }

  // Fall back to system role
  return canAccessFeature(userRole, feature);
}

/**
 * Create a role-restricted procedure
 */
export function createRoleRestrictedProcedure(allowedRoles: UserRole[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!allowedRoles.includes(ctx.user.role as UserRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}. Your role: ${ctx.user.role}`,
      });
    }
    return next({ ctx });
  });
}

/**
 * Create a feature-restricted procedure
 * Supports both system roles and custom roles with dynamic permission lookup
 */
export function createFeatureRestrictedProcedure(feature: string) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userRole = ctx.user.role as UserRole;
    const customRoleId = (ctx.user as any).customRoleId;
    
    // Use dynamic resolver that checks custom roles first
    const hasAccess = await resolveUserPermission(ctx.user.id, userRole, customRoleId, feature);
    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. You don't have permission to access: ${feature}`,
      });
    }
    // Block org-scoped users from global-only features (enterprise, admin:manage_*)
    const GLOBAL_ONLY_PREFIXES = ["enterprise:", "admin:manage_"];
    if (ctx.user.organizationId && GLOBAL_ONLY_PREFIXES.some(p => feature.startsWith(p))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This resource is only accessible to platform administrators",
      });
    }
    return next({ ctx });
  });
}

/**
 * Get all accessible features for a user role
 */
export function getAccessibleFeatures(userRole: UserRole): string[] {
  // Super admin has access to all features
  if (userRole === ROLES.SUPER_ADMIN) {
    return Object.keys(FEATURE_ACCESS);
  }

  return Object.entries(FEATURE_ACCESS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([feature]) => feature);
}

/**
 * Check if organization scopes match (for multi-org systems).
 * 
 * Only Melitech platform admins (super_admin with NO organizationId) can
 * access any org.  Org-scoped super_admins (who have an organizationId) are
 * restricted to their own organization.
 */
export function checkOrgScopeAccess(ctx: any, targetOrgId: string): boolean {
  // Melitech platform admin — has super_admin role but belongs to no org
  if (ctx.user.role === "super_admin" && !ctx.user.organizationId) return true;

  // Everyone else (including org super_admins) can only access their own org
  return ctx.user.organizationId === targetOrgId;
}

/**
 * Create an org-scoped procedure
 */
export function createOrgScopedProcedure() {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.user.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User must be part of an organization to access this resource",
      });
    }
    return next({ ctx });
  });
}

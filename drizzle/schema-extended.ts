import { 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar, 
  int, 
  boolean, 
  datetime,
  index,
  decimal
} from "drizzle-orm/mysql-core";

/**
 * Guest/Non-system clients for one-time transactions
 */
export const guestClients = mysqlTable("guestClients", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
});

/**
 * Reminder configurations
 */
export const reminders = mysqlTable("reminders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["invoice_due", "estimate_expiry", "project_milestone", "payment_overdue", "custom"]).notNull(),
  frequency: mysqlEnum("frequency", ["once", "daily", "weekly", "monthly", "custom"]).notNull(),
  customDays: int("customDays"), // Days before/after event
  timing: mysqlEnum("timing", ["before", "on", "after"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  smsEnabled: boolean("smsEnabled").default(false).notNull(),
  emailTemplate: text("emailTemplate"),
  smsTemplate: text("smsTemplate"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

/**
 * Scheduled reminder instances
 */
export const scheduledReminders = mysqlTable("scheduledReminders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  reminderId: varchar("reminderId", { length: 64 }).notNull(),
  referenceType: varchar("referenceType", { length: 50 }).notNull(), // invoice, estimate, project, etc.
  referenceId: varchar("referenceId", { length: 64 }).notNull(),
  recipientId: varchar("recipientId", { length: 64 }).notNull(), // user or client ID
  recipientType: mysqlEnum("recipientType", ["user", "client"]).notNull(),
  scheduledFor: datetime("scheduledFor").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).default("pending").notNull(),
  sentAt: datetime("sentAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  scheduledForIdx: index("scheduled_for_idx").on(table.scheduledFor),
  statusIdx: index("status_idx").on(table.status),
  referenceIdx: index("reference_idx").on(table.referenceType, table.referenceId),
}));

/**
 * Email/SMS logs
 */
export const communicationLogs = mysqlTable("communicationLogs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: mysqlEnum("type", ["email", "sms"]).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  error: text("error"),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: varchar("referenceId", { length: 64 }),
  sentAt: datetime("sentAt"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  recipientIdx: index("recipient_idx").on(table.recipient),
  statusIdx: index("status_idx").on(table.status),
  sentAtIdx: index("sent_at_idx").on(table.sentAt),
}));

/**
 * Inventory transactions
 */
export const inventoryTransactions = mysqlTable("inventoryTransactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["purchase", "sale", "adjustment", "return", "transfer"]).notNull(),
  quantity: int("quantity").notNull(), // positive for in, negative for out
  unitCost: int("unitCost"), // in cents
  referenceType: varchar("referenceType", { length: 50 }), // invoice, purchase_order, etc.
  referenceId: varchar("referenceId", { length: 64 }),
  notes: text("notes"),
  transactionDate: datetime("transactionDate").notNull(),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  productIdx: index("product_idx").on(table.productId),
  typeIdx: index("type_idx").on(table.type),
  transactionDateIdx: index("transaction_date_idx").on(table.transactionDate),
}));

/**
 * Stock alerts
 */
export const stockAlerts = mysqlTable("stockAlerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull(),
  alertType: mysqlEnum("alertType", ["low_stock", "out_of_stock", "overstock", "reorder"]).notNull(),
  currentQuantity: int("currentQuantity").notNull(),
  threshold: int("threshold").notNull(),
  status: mysqlEnum("status", ["active", "resolved", "ignored"]).default("active").notNull(),
  notifiedAt: datetime("notifiedAt"),
  resolvedAt: datetime("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  productIdx: index("product_idx").on(table.productId),
  statusIdx: index("status_idx").on(table.status),
}));

/**
 * System settings
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value"),
  dataType: mysqlEnum("dataType", ["string", "number", "boolean", "json"]).notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false).notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  categoryKeyIdx: index("category_key_idx").on(table.category, table.key),
}));

/**
 * Audit logs for super admin
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resourceType", { length: 50 }).notNull(),
  resourceId: varchar("resourceId", { length: 64 }),
  changes: text("changes"), // JSON of before/after
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  actionIdx: index("action_idx").on(table.action),
  resourceIdx: index("resource_idx").on(table.resourceType, table.resourceId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

/**
 * User permissions for fine-grained access control
 */
export const userPermissions = mysqlTable("userPermissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(), // clients, invoices, projects, etc.
  action: varchar("action", { length: 50 }).notNull(), // create, read, update, delete, approve, etc.
  granted: boolean("granted").default(true).notNull(),
  grantedBy: varchar("grantedBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userResourceIdx: index("user_resource_idx").on(table.userId, table.resource),
}));

/**
 * Salary structures for employees
 */
export const salaryStructures = mysqlTable("salaryStructures", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  effectiveDate: datetime("effectiveDate").notNull(),
  basicSalary: int("basicSalary").notNull(), // in cents
  allowances: int("allowances").default(0), // total allowances in cents
  deductions: int("deductions").default(0), // total deductions in cents
  taxRate: int("taxRate").default(0), // percentage * 100
  notes: text("notes"),
  approvedBy: varchar("approvedBy", { length: 64 }),
  approvedAt: datetime("approvedAt"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  employeeIdx: index("employee_idx").on(table.employeeId),
  effectiveDateIdx: index("effective_date_idx").on(table.effectiveDate),
}));

/**
 * Salary allowances (house, transport, meals, etc.)
 */
export const salaryAllowances = mysqlTable("salaryAllowances", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  allowanceType: varchar("allowanceType", { length: 100 }).notNull(), // house, transport, meals, phone, etc.
  amount: int("amount").notNull(), // in cents
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "annual", "one_time"]).notNull(),
  effectiveDate: datetime("effectiveDate").notNull(),
  endDate: datetime("endDate"), // null if ongoing
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  employeeIdx: index("employee_idx").on(table.employeeId),
  typeIdx: index("type_idx").on(table.allowanceType),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

/**
 * Salary deductions (loan, pension, insurance, etc.)
 */
export const salaryDeductions = mysqlTable("salaryDeductions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  deductionType: varchar("deductionType", { length: 100 }).notNull(), // loan, pension, insurance, tax, etc.
  amount: int("amount").notNull(), // in cents
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "annual", "one_time"]).notNull(),
  effectiveDate: datetime("effectiveDate").notNull(),
  endDate: datetime("endDate"), // null if ongoing
  isActive: boolean("isActive").default(true).notNull(),
  reference: varchar("reference", { length: 100 }), // loan reference number, etc.
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  employeeIdx: index("employee_idx").on(table.employeeId),
  typeIdx: index("type_idx").on(table.deductionType),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

/**
 * Employee benefits (health insurance, life insurance, etc.)
 */
export const employeeBenefits = mysqlTable("employeeBenefits", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  benefitType: varchar("benefitType", { length: 100 }).notNull(), // health_insurance, life_insurance, pension, etc.
  provider: varchar("provider", { length: 255 }), // insurance company, pension fund, etc.
  enrollDate: datetime("enrollDate").notNull(),
  endDate: datetime("endDate"), // null if ongoing
  isActive: boolean("isActive").default(true).notNull(),
  coverage: text("coverage"), // coverage details
  cost: int("cost"), // employee cost in cents
  employerCost: int("employerCost"), // employer cost in cents
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  employeeIdx: index("employee_idx").on(table.employeeId),
  typeIdx: index("type_idx").on(table.benefitType),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

/**
 * Payroll details/components breakdown
 */
export const payrollDetails = mysqlTable("payrollDetails", {
  id: varchar("id", { length: 64 }).primaryKey(),
  payrollId: varchar("payrollId", { length: 64 }).notNull(),
  componentType: varchar("componentType", { length: 100 }).notNull(), // allowance, deduction, benefit, etc.
  component: varchar("component", { length: 255 }).notNull(), // house, transport, pension, etc.
  amount: int("amount").notNull(), // in cents
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  payrollIdx: index("payroll_idx").on(table.payrollId),
  componentIdx: index("component_idx").on(table.componentType),
}));

/**
 * Payroll approvals workflow
 */
export const payrollApprovals = mysqlTable("payrollApprovals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  payrollId: varchar("payrollId", { length: 64 }).notNull(),
  approverRole: varchar("approverRole", { length: 50 }).notNull(), // hr, manager, finance, admin
  approverId: varchar("approverId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  approvalDate: datetime("approvalDate"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  payrollIdx: index("payroll_idx").on(table.payrollId),
  approverIdx: index("approver_idx").on(table.approverId),
  statusIdx: index("status_idx").on(table.status),
}));

/**
 * Employee tax information
 */
export const employeeTaxInfo = mysqlTable("employeeTaxInfo", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  taxNumber: varchar("taxNumber", { length: 50 }).notNull(),
  taxBracket: varchar("taxBracket", { length: 50 }), // e.g., "30%", "35%"
  exemptions: int("exemptions").default(0), // number of exemptions
  effectiveDate: datetime("effectiveDate").notNull(),
  endDate: datetime("endDate"),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  employeeIdx: index("employee_idx").on(table.employeeId),
  taxNumberIdx: index("tax_number_idx").on(table.taxNumber),
}));

/**
 * Salary increment history
 */
export const salaryIncrements = mysqlTable("salaryIncrements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  previousSalary: int("previousSalary").notNull(), // in cents
  newSalary: int("newSalary").notNull(), // in cents
  incrementPercent: int("incrementPercent").default(0), // percentage * 100
  reason: varchar("reason", { length: 255 }), // promotion, merit, cost_of_living, etc.
  effectiveDate: datetime("effectiveDate").notNull(),
  approvedBy: varchar("approvedBy", { length: 64 }),
  approvalDate: datetime("approvalDate"),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  employeeIdx: index("employee_idx").on(table.employeeId),
  effectiveDateIdx: index("effective_date_idx").on(table.effectiveDate),
}));

export type GuestClient = typeof guestClients.$inferSelect;
export type InsertGuestClient = typeof guestClients.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;
export type ScheduledReminder = typeof scheduledReminders.$inferSelect;
export type InsertScheduledReminder = typeof scheduledReminders.$inferInsert;
export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type InsertCommunicationLog = typeof communicationLogs.$inferInsert;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;
export type StockAlert = typeof stockAlerts.$inferSelect;
export type InsertStockAlert = typeof stockAlerts.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type InsertSalaryStructure = typeof salaryStructures.$inferInsert;
export type SalaryAllowance = typeof salaryAllowances.$inferSelect;
export type InsertSalaryAllowance = typeof salaryAllowances.$inferInsert;
export type SalaryDeduction = typeof salaryDeductions.$inferSelect;
export type InsertSalaryDeduction = typeof salaryDeductions.$inferInsert;
export type EmployeeBenefit = typeof employeeBenefits.$inferSelect;
export type InsertEmployeeBenefit = typeof employeeBenefits.$inferInsert;
export type PayrollDetail = typeof payrollDetails.$inferSelect;
export type InsertPayrollDetail = typeof payrollDetails.$inferInsert;
export type PayrollApproval = typeof payrollApprovals.$inferSelect;
export type InsertPayrollApproval = typeof payrollApprovals.$inferInsert;
export type EmployeeTaxInfo = typeof employeeTaxInfo.$inferSelect;
export type InsertEmployeeTaxInfo = typeof employeeTaxInfo.$inferInsert;
export type SalaryIncrement = typeof salaryIncrements.$inferSelect;
export type InsertSalaryIncrement = typeof salaryIncrements.$inferInsert;

/**
 * Local Purchase Orders (LPO) for large purchases
 */
export const lpos = mysqlTable("lpos", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }),
  lpoNumber: varchar("lpoNumber", { length: 50 }).notNull(),
  vendorId: varchar("vendorId", { length: 64 }).notNull(),
  description: text("description"),
  amount: int("amount").notNull(), // in cents
  status: mysqlEnum("status", ["draft","submitted","approved","rejected","received"]).default("draft").notNull(),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  vendorIdx: index("vendor_idx").on(table.vendorId),
  statusIdx: index("status_idx").on(table.status),
}));

export type LPO = typeof lpos.$inferSelect;
export type InsertLPO = typeof lpos.$inferInsert;


export const journalEntryReconciliations = mysqlTable(
  "journalEntryReconciliations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    journalEntryId: varchar("journalEntryId", { length: 64 }).notNull(),
    reconciledBy: varchar("reconciledBy", { length: 64 }),
    reconciledAt: timestamp("reconciledAt").defaultNow(),
    notes: text("notes"),
  },
  (table) => ({
    entryIdx: index("recon_entry_idx").on(table.journalEntryId),
  })
);
export type JournalEntryReconciliation = typeof journalEntryReconciliations.$inferSelect;
export type InsertJournalEntryReconciliation = typeof journalEntryReconciliations.$inferInsert;

/**
 * Short-term imprest requests for petty cash
 */
export const imprests = mysqlTable("imprests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  imprestNumber: varchar("imprestNumber", { length: 50 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  purpose: text("purpose"),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["requested","approved","rejected","settled"]).default("requested").notNull(),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
}));

export type Imprest = typeof imprests.$inferSelect;
export type InsertImprest = typeof imprests.$inferInsert;

/**
 * Records for surrendering imprest funds back to cashier
 */
export const imprestSurrenders = mysqlTable("imprestSurrenders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  imprestId: varchar("imprestId", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  notes: text("notes"),
  surrenderedBy: varchar("surrenderedBy", { length: 64 }),
  surrenderedAt: timestamp("surrenderedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  imprestIdx: index("imprest_idx").on(table.imprestId),
}));

export type ImprestSurrender = typeof imprestSurrenders.$inferSelect;
export type InsertImprestSurrender = typeof imprestSurrenders.$inferInsert;
/**
 * Project Team Members - Track employees assigned to projects
 */
export const projectTeamMembers = mysqlTable(
  "projectTeamMembers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    projectId: varchar("projectId", { length: 64 }).notNull(),
    employeeId: varchar("employeeId", { length: 64 }).notNull(),
    role: varchar("role", { length: 100 }), // e.g., "Lead Developer", "Designer", "Project Coordinator"
    hoursAllocated: int("hoursAllocated"), // Total hours allocated for the project
    startDate: datetime("startDate"),
    endDate: datetime("endDate"),
    isActive: boolean("isActive").default(true).notNull(),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_idx").on(table.projectId),
    employeeIdx: index("employee_idx").on(table.employeeId),
  })
);

/**
 * Invoice Payments Tracking - Track payments received for invoices
 */
export const invoicePayments = mysqlTable(
  "invoicePayments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    invoiceId: varchar("invoiceId", { length: 64 }).notNull(),
    paymentAmount: int("paymentAmount").notNull(), // in cents
    paymentDate: datetime("paymentDate").notNull(),
    paymentMethod: mysqlEnum("paymentMethod", [
      "cash",
      "bank_transfer",
      "check",
      "mobile_money",
      "credit_card",
      "other",
    ]).notNull(),
    reference: varchar("reference", { length: 255 }), // Check number, transfer reference, etc.
    notes: text("notes"),
    receiptId: varchar("receiptId", { length: 64 }), // Link to receipt record if created
    recordedBy: varchar("recordedBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    invoiceIdx: index("invoice_idx").on(table.invoiceId),
    paymentDateIdx: index("payment_date_idx").on(table.paymentDate),
  })
);

/**
 * Service Templates - Predefined service configurations for quick reuse
 */
export const serviceTemplates = mysqlTable(
  "serviceTemplates",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 64 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    hourlyRate: int("hourlyRate"), // in cents
    fixedPrice: int("fixedPrice"), // in cents
    unit: varchar("unit", { length: 50 }).default("hour"),
    taxRate: int("taxRate").default(0),
    estimatedDuration: int("estimatedDuration"), // in hours
    deliverables: text("deliverables"), // JSON array of deliverables
    terms: text("terms"), // Service terms and conditions
    isActive: boolean("isActive").default(true).notNull(),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    categoryIdx: index("template_category_idx").on(table.category),
    createdIdx: index("template_created_idx").on(table.createdAt),
  })
);

/**
 * Service Usage Tracking - Track when and where services are used
 */
export const serviceUsageTracking = mysqlTable(
  "serviceUsageTracking",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    serviceTemplateId: varchar("serviceTemplateId", { length: 64 }).notNull(),
    invoiceId: varchar("invoiceId", { length: 64 }),
    estimateId: varchar("estimateId", { length: 64 }),
    projectId: varchar("projectId", { length: 64 }),
    clientId: varchar("clientId", { length: 64 }),
    quantity: int("quantity").default(1).notNull(),
    duration: int("duration"), // in hours
    usageDate: datetime("usageDate").notNull(),
    status: mysqlEnum("status", ["pending", "delivered", "invoiced", "paid", "cancelled"]).notNull(),
    notes: text("notes"),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    templateIdx: index("usage_template_idx").on(table.serviceTemplateId),
    invoiceIdx: index("usage_invoice_idx").on(table.invoiceId),
    projectIdx: index("usage_project_idx").on(table.projectId),
    clientIdx: index("usage_client_idx").on(table.clientId),
    dateIdx: index("usage_date_idx").on(table.usageDate),
    statusIdx: index("usage_status_idx").on(table.status),
  })
);

/**
 * Project Budgets - Budget allocations and tracking for projects
 */
export const projectBudgets = mysqlTable(
  "projectBudgets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 64 }),
    projectId: varchar("projectId", { length: 64 }).notNull(),
    budgetedAmount: int("budgetedAmount").notNull(), // in cents
    spent: int("spent").default(0).notNull(), // in cents
    remaining: int("remaining").notNull(), // in cents (budgetedAmount - spent)
    budgetStatus: mysqlEnum("budgetStatus", ["under", "at", "over"]).notNull(),
    startDate: datetime("startDate").notNull(),
    endDate: datetime("endDate"),
    notes: text("notes"),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    projectIdx: index("budget_project_idx").on(table.projectId),
    statusIdx: index("budget_status_idx").on(table.budgetStatus),
    dateIdx: index("budget_date_idx").on(table.startDate),
  })
);

/**
 * Department Budgets - Budget allocations for departments
 */
export const departmentBudgets = mysqlTable(
  "departmentBudgets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 64 }),
    departmentId: varchar("departmentId", { length: 64 }).notNull(),
    year: int("year").notNull(), // e.g. 2024, 2025
    budgetedAmount: int("budgetedAmount").notNull(), // in cents
    spent: int("spent").default(0).notNull(), // in cents
    remaining: int("remaining").notNull(), // in cents
    budgetStatus: mysqlEnum("budgetStatus", ["under", "at", "over"]).notNull(),
    category: varchar("category", { length: 100 }), // e.g. payroll, operations, marketing
    notes: text("notes"),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    departmentIdx: index("dept_budget_department_idx").on(table.departmentId),
    yearIdx: index("dept_budget_year_idx").on(table.year),
    statusIdx: index("dept_budget_status_idx").on(table.budgetStatus),
    categoryIdx: index("dept_budget_category_idx").on(table.category),
  })
);

/**
 * General Ledger Budget - Budget allocations for accounting ledger
 */
export const ledgerBudgets = mysqlTable(
  "ledgerBudgets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("accountId", { length: 64 }).notNull(), // Reference to chart of accounts
    year: int("year").notNull(),
    month: int("month"), // 1-12; null for annual budgets
    budgetedAmount: int("budgetedAmount").notNull(), // in cents
    actual: int("actual").default(0).notNull(), // in cents
    variance: int("variance").notNull(), // budgetedAmount - actual
    variancePercentage: int("variancePercentage"), // Percentage variance
    notes: text("notes"),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    accountIdx: index("ledger_budget_account_idx").on(table.accountId),
    yearIdx: index("ledger_budget_year_idx").on(table.year),
    monthIdx: index("ledger_budget_month_idx").on(table.month),
  })
);

/**
 * Budget Allocations - Detailed allocations of amounts to categories
 */
export const budgetAllocations = mysqlTable(
  "budgetAllocations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    budgetId: varchar("budgetId", { length: 64 }).notNull(), // Can reference project, department, or ledger budgets
    categoryName: varchar("categoryName", { length: 255 }).notNull(),
    allocatedAmount: int("allocatedAmount").notNull(), // in cents
    spentAmount: int("spentAmount").default(0).notNull(), // in cents
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    budgetIdx: index("allocation_budget_idx").on(table.budgetId),
  })
);

export type ProjectTeamMember = typeof projectTeamMembers.$inferSelect;
export type InsertProjectTeamMember = typeof projectTeamMembers.$inferInsert;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = typeof invoicePayments.$inferInsert;
export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = typeof serviceTemplates.$inferInsert;
export type ServiceUsageTracking = typeof serviceUsageTracking.$inferSelect;
export type InsertServiceUsageTracking = typeof serviceUsageTracking.$inferInsert;
export type ProjectBudget = typeof projectBudgets.$inferSelect;
export type InsertProjectBudget = typeof projectBudgets.$inferInsert;
export type DepartmentBudget = typeof departmentBudgets.$inferSelect;
export type InsertDepartmentBudget = typeof departmentBudgets.$inferInsert;
export type LedgerBudget = typeof ledgerBudgets.$inferSelect;
export type InsertLedgerBudget = typeof ledgerBudgets.$inferInsert;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type InsertBudgetAllocation = typeof budgetAllocations.$inferInsert;

// Performance reviews table
export const performanceReviews = mysqlTable(
  "performanceReviews",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    employeeId: varchar("employeeId", { length: 64 }).notNull(),
    reviewerId: varchar("reviewerId", { length: 64 }).notNull(),
    rating: int("rating").notNull(), // 1-5
    comments: text("comments"),
    goals: text("goals"),
    status: mysqlEnum(["pending", "in_progress", "completed"]).default("pending").notNull(),
    reviewDate: timestamp("reviewDate").defaultNow(),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    empIdx: index("pr_employee_idx").on(table.employeeId),
    reviewerIdx: index("pr_reviewer_idx").on(table.reviewerId),
  })
);
export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = typeof performanceReviews.$inferInsert;

// ----------------- Client ticketing -----------------
export const tickets = mysqlTable(
  "tickets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 64 }),
    clientId: varchar("clientId", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    priority: mysqlEnum(["low","medium","high"]).default("medium").notNull(),
    status: mysqlEnum(["new","open","in_progress","awaiting_client","completed","closed"]).default("new").notNull(),
    requestedDueDate: datetime("requestedDueDate", { mode: "string" }),
    assignedTo: varchar("assignedTo", { length: 64 }),
    createdBy: varchar("createdBy", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    clientIdx: index("ticket_client_idx").on(table.clientId),
    statusIdx: index("ticket_status_idx").on(table.status),
  })
);
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

export const ticketComments = mysqlTable(
  "ticket_comments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    ticketId: varchar("ticketId", { length: 64 }).notNull(),
    authorId: varchar("authorId", { length: 64 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    ticketIdx: index("comment_ticket_idx").on(table.ticketId),
    authorIdx: index("comment_author_idx").on(table.authorId),
  })
);
export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = typeof ticketComments.$inferInsert;

export const ticketTasks = mysqlTable(
  "ticket_tasks",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    ticketId: varchar("ticketId", { length: 64 }).notNull(),
    serviceType: varchar("serviceType", { length: 100 }).notNull(),
    details: text("details"),
    budget: int("budget"),
    dueDate: datetime("dueDate", { mode: "string" }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    ticketIdx: index("task_ticket_idx").on(table.ticketId),
  })
);
export type TicketTask = typeof ticketTasks.$inferSelect;
export type InsertTicketTask = typeof ticketTasks.$inferInsert;

// --------- Procurement: Suppliers Module ---------
/**
 * Pre-qualified suppliers for procurement
 */
export const suppliers = mysqlTable(
  "suppliers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 64 }),
    supplierNumber: varchar("supplierNumber", { length: 50 }).notNull().unique(),
    companyName: varchar("companyName", { length: 255 }).notNull(),
    registrationNumber: varchar("registrationNumber", { length: 100 }).unique(),
    taxId: varchar("taxId", { length: 100 }).unique(),
    contactPerson: varchar("contactPerson", { length: 255 }),
    contactTitle: varchar("contactTitle", { length: 100 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 50 }),
    alternatePhone: varchar("alternatePhone", { length: 50 }),
    website: varchar("website", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    postalCode: varchar("postalCode", { length: 20 }),
    bankName: varchar("bankName", { length: 255 }),
    bankBranch: varchar("bankBranch", { length: 255 }),
    accountNumber: varchar("accountNumber", { length: 100 }),
    accountName: varchar("accountName", { length: 255 }),
    paymentTerms: varchar("paymentTerms", { length: 100 }), // e.g., "Net 30", "COD"
    paymentMethods: varchar("paymentMethods", { length: 255 }), // JSON: ["bank_transfer", "check", "credit"]
    categories: varchar("categories", { length: 500 }), // JSON: categories supplier provides
    qualificationStatus: mysqlEnum("qualificationStatus", ["pending", "pre_qualified", "qualified", "rejected", "inactive"]).default("pending").notNull(),
    qualificationDate: datetime("qualificationDate", { mode: "string" }),
    certifications: varchar("certifications", { length: 500 }), // JSON: ["ISO9001", "ISO14001"]
    qualityRating: int("qualityRating").default(0), // 0-100 rating
    deliveryRating: int("deliveryRating").default(0), // 0-100 rating
    priceCompetitiveness: int("priceCompetitiveness").default(0), // 0-100 rating
    averageRating: int("averageRating").default(0), // Calculated average of above
    totalOrders: int("totalOrders").default(0),
    totalSpent: int("totalSpent").default(0), // In cents
    lastOrderDate: datetime("lastOrderDate", { mode: "string" }),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    companyNameIdx: index("supplier_company_idx").on(table.companyName),
    statusIdx: index("supplier_status_idx").on(table.qualificationStatus),
    ratingIdx: index("supplier_rating_idx").on(table.averageRating),
    activeIdx: index("supplier_active_idx").on(table.isActive),
  })
);
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Supplier performance ratings and reviews
 */
export const supplierRatings = mysqlTable(
  "supplierRatings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    supplierId: varchar("supplierId", { length: 64 }).notNull(),
    orderId: varchar("orderId", { length: 64 }), // Reference to procurement order
    qualityScore: int("qualityScore").notNull(), // 1-5 stars
    deliveryScore: int("deliveryScore").notNull(), // 1-5 stars
    priceScore: int("priceScore").notNull(), // 1-5 stars
    serviceScore: int("serviceScore").notNull(), // 1-5 stars
    comments: text("comments"),
    ratedBy: varchar("ratedBy", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    supplierIdx: index("rating_supplier_idx").on(table.supplierId),
    orderIdx: index("rating_order_idx").on(table.orderId),
  })
);
export type SupplierRating = typeof supplierRatings.$inferSelect;
export type InsertSupplierRating = typeof supplierRatings.$inferInsert;

/**
 * Supplier audit logs for compliance tracking
 */
export const supplierAudits = mysqlTable(
  "supplierAudits",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    supplierId: varchar("supplierId", { length: 64 }).notNull(),
    auditType: mysqlEnum("auditType", ["qualification", "compliance", "performance", "certification", "manual"]).notNull(),
    auditDate: datetime("auditDate", { mode: "string" }).notNull(),
    findings: text("findings"),
    status: mysqlEnum("status", ["passed", "failed", "conditional"]).notNull(),
    actionItems: text("actionItems"), // JSON array of required actions
    auditedBy: varchar("auditedBy", { length: 64 }),
    nextAuditDate: datetime("nextAuditDate", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    supplierIdx: index("audit_supplier_idx").on(table.supplierId),
    dateIdx: index("audit_date_idx").on(table.auditDate),
  })
);
export type SupplierAudit = typeof supplierAudits.$inferSelect;
export type InsertSupplierAudit = typeof supplierAudits.$inferInsert;

/**
 * Quotes / Quotations
 */
export const quotes = mysqlTable(
  "quotes",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    quoteNumber: varchar("quoteNumber", { length: 50 }).notNull(),
    clientId: varchar("clientId", { length: 64 }).notNull(),
    subject: varchar("subject", { length: 255 }),
    description: text("description"),
    status: mysqlEnum("status", [
      "draft",
      "sent",
      "accepted",
      "expired",
      "declined",
      "converted",
    ])
      .default("draft")
      .notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0"),
    taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).default("0"),
    notes: text("notes"),
    expirationDate: datetime("expirationDate"),
    sentDate: timestamp("sentDate"),
    acceptedDate: timestamp("acceptedDate"),
    declinedDate: timestamp("declinedDate"),
    convertedInvoiceId: varchar("convertedInvoiceId", { length: 64 }),
    template: int("template").default(0),
    createdBy: varchar("createdBy", { length: 64 }),
    organizationId: varchar("organizationId", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    clientIdx: index("quote_client_idx").on(table.clientId),
    statusIdx: index("quote_status_idx").on(table.status),
    orgIdx: index("quote_org_idx").on(table.organizationId),
  })
);
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/**
 * Quote line items
 */
export const lineItems = mysqlTable(
  "lineItems",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    quoteId: varchar("quoteId", { length: 64 }).notNull(),
    description: text("description"),
    quantity: int("quantity").default(1),
    unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).default("0"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    quoteIdx: index("li_quote_idx").on(table.quoteId),
  })
);
export type LineItem = typeof lineItems.$inferSelect;
export type InsertLineItem = typeof lineItems.$inferInsert;

/**
 * Quote activity / audit logs
 */
export const quoteLogs = mysqlTable(
  "quoteLogs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    quoteId: varchar("quoteId", { length: 64 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    description: text("description"),
    userId: varchar("userId", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    quoteIdx: index("ql_quote_idx").on(table.quoteId),
  })
);
export type QuoteLog = typeof quoteLogs.$inferSelect;
export type InsertQuoteLog = typeof quoteLogs.$inferInsert;

/**
 * User table preferences — persists column visibility, column order, and page size per user per table
 */
export const userTablePreferences = mysqlTable(
  "userTablePreferences",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull(),
    organizationId: varchar("organizationId", { length: 64 }),
    tableName: varchar("tableName", { length: 100 }).notNull(),
    visibleColumns: text("visibleColumns"), // JSON array of visible column keys
    columnOrder: text("columnOrder"), // JSON array of column keys in order
    pageSize: int("pageSize").default(25),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    userTableIdx: index("utp_user_table_idx").on(table.userId, table.tableName),
    orgIdx: index("utp_org_idx").on(table.organizationId),
  })
);
export type UserTablePreference = typeof userTablePreferences.$inferSelect;
export type InsertUserTablePreference = typeof userTablePreferences.$inferInsert;

/**
 * Dedicated organization membership table.
 * Tracks user-to-organization membership lifecycle separately from users.organizationId.
 */
export const organizationMembers = mysqlTable(
  "organizationMembers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 64 }).notNull(),
    role: varchar("role", { length: 50 }),
    status: mysqlEnum("status", ["active", "inactive", "invited", "removed"]).default("active").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    invitedBy: varchar("invitedBy", { length: 64 }),
    joinedAt: datetime("joinedAt"),
    leftAt: datetime("leftAt"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    orgIdx: index("org_members_org_idx").on(table.organizationId),
    userIdx: index("org_members_user_idx").on(table.userId),
    orgUserIdx: index("org_members_org_user_idx").on(table.organizationId, table.userId),
    statusIdx: index("org_members_status_idx").on(table.status),
  })
);
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;
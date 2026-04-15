import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, varchar, mysqlEnum, int, text, longtext, timestamp, datetime, tinyint, json, decimal, bigint, boolean } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const accounts = mysqlTable("accounts", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    accountCode: varchar({ length: 50 }).notNull(),
    accountName: varchar({ length: 255 }).notNull(),
    accountType: mysqlEnum(['asset','liability','equity','revenue','expense','cost of goods sold','operating expense','capital expenditure','other income','other expense']).notNull(),
    parentAccountId: varchar({ length: 64 }),
    balance: int().default(0),
    isActive: tinyint().default(1).notNull(),
    description: text(),
    createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
},
(table) => [
    index("account_code_idx").on(table.accountCode),
    index("account_type_idx").on(table.accountType),
]);

export const activityLog = mysqlTable("activityLog", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    action: varchar({ length: 100 }).notNull(),
    entityType: varchar({ length: 100 }),
    entityId: varchar({ length: 64 }),
    description: text(),
    metadata: text(),
    ipAddress: varchar({ length: 45 }),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("user_idx").on(table.userId),
    index("entity_idx").on(table.entityType, table.entityId),
    index("created_at_idx").on(table.createdAt),
]);

export const auditLogs = mysqlTable("auditLogs", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    action: varchar({ length: 100 }).notNull(),
    resourceType: varchar({ length: 50 }).notNull(),
    resourceId: varchar({ length: 64 }),
    changes: text(),
    ipAddress: varchar({ length: 50 }),
    userAgent: text(),
    createdAt: timestamp({ mode: 'string' }),
});

export const bankAccounts = mysqlTable("bankAccounts", {
    id: varchar({ length: 64 }).primaryKey(),
    accountName: varchar({ length: 255 }).notNull(),
    bankName: varchar({ length: 255 }).notNull(),
    accountNumber: varchar({ length: 100 }).notNull(),
    currency: varchar({ length: 10 }).default('KES').notNull(),
    balance: int().default(0),
    isActive: tinyint().default(1).notNull(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const bankTransactions = mysqlTable("bankTransactions", {
    id: varchar({ length: 64 }).primaryKey(),
    bankAccountId: varchar({ length: 64 }).notNull(),
    transactionDate: datetime({ mode: 'string'}).notNull(),
    description: text(),
    referenceNumber: varchar({ length: 100 }),
    debit: int().default(0),
    credit: int().default(0),
    balance: int().notNull(),
    isReconciled: tinyint().default(0).notNull(),
    reconciledDate: datetime({ mode: 'string'}),
    reconciledBy: varchar({ length: 64 }),
    matchedTransactionId: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("bank_account_idx").on(table.bankAccountId),
    index("transaction_date_idx").on(table.transactionDate),
    index("reconciled_idx").on(table.isReconciled),
]);

export const clients = mysqlTable("clients", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    companyName: varchar({ length: 255 }).notNull(),
    contactPerson: varchar({ length: 255 }),
    email: varchar({ length: 320 }),
    phone: varchar({ length: 50 }),
    secondaryPhone: varchar({ length: 50 }),
    address: text(),
    city: varchar({ length: 100 }),
    country: varchar({ length: 100 }),
    postalCode: varchar({ length: 20 }),
    taxId: varchar({ length: 100 }),
    website: varchar({ length: 255 }),
    industry: varchar({ length: 100 }),
    status: mysqlEnum(['active','inactive','prospect','archived']).default('active').notNull(),
    assignedTo: varchar({ length: 64 }),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
    businessType: varchar({ length: 100 }),
    registrationNumber: varchar({ length: 100 }),
    bankName: varchar({ length: 255 }),
    bankCode: varchar({ length: 50 }),
    branch: varchar({ length: 100 }),
    bankAccountNumber: varchar({ length: 100 }),
    creditLimit: int(),
    paymentTerms: varchar({ length: 100 }),
    numberOfEmployees: int(),
    yearEstablished: int(),
    businessLicense: varchar({ length: 255 }),
    leadSource: varchar({ length: 100 }),
    currency: varchar({ length: 10 }),
},
(table) => [
    index("email_idx").on(table.email),
    index("status_idx").on(table.status),
]);

export const communicationLogs = mysqlTable("communicationLogs", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    type: mysqlEnum(['email','sms']).notNull(),
    recipient: varchar({ length: 320 }).notNull(),
    subject: varchar({ length: 500 }),
    body: text(),
    status: mysqlEnum(['pending','sent','failed']).default('pending').notNull(),
    error: text(),
    referenceType: varchar({ length: 50 }),
    referenceId: varchar({ length: 64 }),
    sentAt: datetime({ mode: 'string'}),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
});

export const jobGroups = mysqlTable("jobGroups", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 100 }).notNull(),
    minimumGrossSalary: int().notNull(),
    maximumGrossSalary: int().notNull(),
    description: text(),
    isActive: tinyint().default(1).notNull(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("job_group_name_idx").on(table.name),
    index("is_active_idx").on(table.isActive),
]);

export const employees = mysqlTable("employees", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    userId: varchar({ length: 64 }),
    employeeNumber: varchar({ length: 50 }).notNull(),
    firstName: varchar({ length: 100 }).notNull(),
    lastName: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 320 }),
    phone: varchar({ length: 50 }),
    gender: mysqlEnum(['male','female','other']),
    maritalStatus: mysqlEnum(['single','married','divorced','widowed']),
    dateOfBirth: datetime({ mode: 'string'}),
    hireDate: datetime({ mode: 'string'}).notNull(),
    probationEndDate: datetime({ mode: 'string'}),
    contractEndDate: datetime({ mode: 'string'}),
    department: varchar({ length: 100 }),
    position: varchar({ length: 100 }),
    jobGroupId: varchar({ length: 64 }).notNull(),
    salary: int(),
    employmentType: mysqlEnum(['full_time','part_time','contract','intern','contractual','hourly','wage','temporary','seasonal']).default('full_time').notNull(),
    status: mysqlEnum(['active','on_leave','terminated','suspended']).default('active').notNull(),
    address: text(),
    emergencyContactName: varchar({ length: 255 }),
    emergencyContactRelationship: varchar({ length: 100 }),
    emergencyContactPhone: varchar({ length: 50 }),
    emergencyContact: text(),
    bankName: varchar({ length: 255 }),
    bankBranch: varchar({ length: 255 }),
    bankAccountNumber: varchar({ length: 100 }),
    nhifNumber: varchar({ length: 50 }),
    nssfNumber: varchar({ length: 50 }),
    taxId: varchar({ length: 100 }),
    nationalId: varchar({ length: 100 }),
    photoUrl: varchar({ length: 500 }),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("employee_number_idx").on(table.employeeNumber),
    index("department_idx").on(table.department),
    index("job_group_idx").on(table.jobGroupId),
    index("status_idx").on(table.status),
]);

export const estimateItems = mysqlTable("estimateItems", {
    id: varchar({ length: 64 }).primaryKey(),
    estimateId: varchar({ length: 64 }).notNull(),
    itemType: mysqlEnum(['product','service','custom']).notNull(),
    itemId: varchar({ length: 64 }),
    description: text().notNull(),
    quantity: int().notNull(),
    unitPrice: int().notNull(),
    taxRate: int().default(0),
    discountPercent: int().default(0),
    total: int().notNull(),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("estimate_idx").on(table.estimateId),
]);

export const estimates = mysqlTable("estimates", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    estimateNumber: varchar({ length: 100 }).notNull(),
    clientId: varchar({ length: 64 }).notNull(),
    title: varchar({ length: 255 }),
    status: mysqlEnum(['draft','sent','accepted','rejected','expired']).default('draft').notNull(),
    issueDate: datetime({ mode: 'string'}).notNull(),
    expiryDate: datetime({ mode: 'string'}),
    subtotal: int().notNull(),
    taxAmount: int().default(0),
    discountAmount: int().default(0),
    total: int().notNull(),
    notes: text(),
    terms: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("estimate_number_idx").on(table.estimateNumber),
    index("client_idx").on(table.clientId),
    index("status_idx").on(table.status),
]);

export const proposals = mysqlTable("proposals", {
    id: varchar({ length: 64 }).primaryKey(),
    proposalNumber: varchar({ length: 100 }).notNull(),
    clientId: varchar({ length: 64 }).notNull(),
    title: varchar({ length: 255 }),
    status: mysqlEnum(['draft','sent','accepted','rejected']).default('draft').notNull(),
    issueDate: datetime({ mode: 'string'}).notNull(),
    expiryDate: datetime({ mode: 'string'}),
    subtotal: int().notNull(),
    taxAmount: int().default(0),
    discountAmount: int().default(0),
    total: int().notNull(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("proposal_number_idx").on(table.proposalNumber),
    index("client_idx").on(table.clientId),
    index("status_idx").on(table.status),
]);

export const expenses = mysqlTable("expenses", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    expenseNumber: varchar({ length: 100 }),
    category: varchar({ length: 100 }).notNull(),
    vendor: varchar({ length: 255 }),
    amount: int().notNull(),
    expenseDate: datetime({ mode: 'string'}).notNull(),
    paymentMethod: mysqlEnum(['cash','bank_transfer','cheque','card','other']),
    receiptUrl: longtext(),
    description: text(),
    accountId: varchar({ length: 64 }),
    budgetAllocationId: varchar({ length: 64 }), // Link to budget allocation line
    status: mysqlEnum(['pending','approved','rejected','paid']).default('pending').notNull(),
    createdBy: varchar({ length: 64 }),
    approvedBy: varchar({ length: 64 }),
    approvedAt: datetime({ mode: 'string' }),
    chartOfAccountId: int(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("expense_date_idx").on(table.expenseDate),
    index("category_idx").on(table.category),
    index("status_idx").on(table.status),
    index("chart_of_account_idx").on(table.chartOfAccountId),
]);

export const recurringExpenses = mysqlTable("recurringExpenses", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    category: varchar({ length: 100 }).notNull(),
    vendor: varchar({ length: 255 }),
    amount: int().notNull(),
    description: text(),
    paymentMethod: mysqlEnum(['cash','bank_transfer','cheque','card','other']),
    frequency: mysqlEnum(['weekly','biweekly','monthly','quarterly','annually']).notNull(),
    startDate: datetime({ mode: 'string'}).notNull(),
    endDate: datetime({ mode: 'string'}),
    nextDueDate: datetime({ mode: 'string'}).notNull(),
    dayOfMonth: int().default(1),
    reminderDaysBefore: int().default(3),
    lastGeneratedDate: datetime({ mode: 'string'}),
    isActive: tinyint().default(1).notNull(),
    chartOfAccountId: int(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("re_org_idx").on(table.organizationId),
    index("re_next_due_idx").on(table.nextDueDate),
    index("re_active_idx").on(table.isActive),
]);

export const guestClients = mysqlTable("guestClients", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 320 }),
    phone: varchar({ length: 50 }),
    address: text(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
});

export const inventoryTransactions = mysqlTable("inventoryTransactions", {
    id: varchar({ length: 64 }).primaryKey(),
    productId: varchar({ length: 64 }).notNull(),
    type: mysqlEnum(['purchase','sale','adjustment','return','transfer']).notNull(),
    quantity: int().notNull(),
    unitCost: int(),
    referenceType: varchar({ length: 50 }),
    referenceId: varchar({ length: 64 }),
    notes: text(),
    transactionDate: datetime({ mode: 'string'}).notNull(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
});

export const invoiceItems = mysqlTable("invoiceItems", {
    id: varchar({ length: 64 }).primaryKey(),
    invoiceId: varchar({ length: 64 }).notNull(),
    itemType: mysqlEnum(['product','service','custom']).notNull(),
    itemId: varchar({ length: 64 }),
    description: text().notNull(),
    quantity: int().notNull(),
    unitPrice: int().notNull(),
    taxRate: int().default(0),
    discountPercent: int().default(0),
    total: int().notNull(),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("invoice_idx").on(table.invoiceId),
]);

export const invoices = mysqlTable("invoices", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    invoiceNumber: varchar({ length: 100 }).notNull(),
    clientId: varchar({ length: 64 }).notNull(),
    estimateId: varchar({ length: 64 }),
    title: varchar({ length: 255 }),
    status: mysqlEnum(['draft','sent','paid','partial','overdue','cancelled']).default('draft').notNull(),
    issueDate: datetime({ mode: 'string'}).notNull(),
    dueDate: datetime({ mode: 'string'}).notNull(),
    subtotal: int().notNull(),
    taxAmount: int().default(0),
    discountAmount: int().default(0),
    total: int().notNull(),
    paidAmount: int().default(0),
    notes: text(),
    terms: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
    paymentPlanId: varchar({ length: 64 }),
    isAutoRecurring: tinyint().default(0),
    recurringInvoiceId: varchar({ length: 64 }),
    clientSubscriptionId: varchar({ length: 64 }),
},
(table) => [
    index("invoice_number_idx").on(table.invoiceNumber),
    index("client_idx").on(table.clientId),
    index("status_idx").on(table.status),
    index("due_date_idx").on(table.dueDate),
]);

export const recurringInvoices = mysqlTable("recurringInvoices", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    clientId: varchar({ length: 64 }).notNull(),
    templateInvoiceId: varchar({ length: 64 }).notNull(),
    clientSubscriptionId: varchar({ length: 64 }),
    frequency: mysqlEnum(['weekly','biweekly','monthly','quarterly','annually']).notNull(),
    startDate: datetime({ mode: 'string'}).notNull(),
    endDate: datetime({ mode: 'string'}),
    nextDueDate: datetime({ mode: 'string'}).notNull(),
    lastGeneratedDate: datetime({ mode: 'string'}),
    isActive: tinyint().default(1).notNull(),
    description: text(),
    noteToInvoice: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("client_idx").on(table.clientId),
    index("is_active_idx").on(table.isActive),
    index("next_due_date_idx").on(table.nextDueDate),
]);

export const journalEntries = mysqlTable("journalEntries", {
    id: varchar({ length: 64 }).primaryKey(),
    entryNumber: varchar({ length: 100 }).notNull(),
    entryDate: datetime({ mode: 'string'}).notNull(),
    description: text(),
    referenceType: varchar({ length: 50 }),
    referenceId: varchar({ length: 64 }),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("entry_date_idx").on(table.entryDate),
    index("entry_number_idx").on(table.entryNumber),
]);

export const journalEntryLines = mysqlTable("journalEntryLines", {
    id: varchar({ length: 64 }).primaryKey(),
    journalEntryId: varchar({ length: 64 }).notNull(),
    accountId: varchar({ length: 64 }).notNull(),
    debit: int().default(0),
    credit: int().default(0),
    description: text(),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("journal_entry_idx").on(table.journalEntryId),
    index("account_idx").on(table.accountId),
]);

export const leaveRequests = mysqlTable("leaveRequests", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    employeeId: varchar({ length: 64 }).notNull(),
    leaveType: mysqlEnum(['annual','sick','maternity','paternity','unpaid','other']).notNull(),
    startDate: datetime({ mode: 'string'}).notNull(),
    endDate: datetime({ mode: 'string'}).notNull(),
    days: int().notNull(),
    reason: text(),
    status: mysqlEnum(['pending','approved','rejected','cancelled']).default('pending').notNull(),
    approvedBy: varchar({ length: 64 }),
    approvalDate: datetime({ mode: 'string'}),
    notes: text(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("employee_idx").on(table.employeeId),
    index("status_idx").on(table.status),
    index("start_date_idx").on(table.startDate),
]);

export const opportunities = mysqlTable("opportunities", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    clientId: varchar({ length: 64 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    value: int().notNull(),
    stage: mysqlEnum(['lead','qualified','proposal','negotiation','closed_won','closed_lost']).default('lead').notNull(),
    probability: int().default(0),
    expectedCloseDate: datetime({ mode: 'string'}),
    actualCloseDate: datetime({ mode: 'string'}),
    assignedTo: varchar({ length: 64 }),
    source: varchar({ length: 100 }),
    winReason: text(),
    lossReason: text(),
    notes: text(),
    stageMovedAt: datetime({ mode: 'string'}),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("client_idx").on(table.clientId),
    index("stage_idx").on(table.stage),
    index("assigned_to_idx").on(table.assignedTo),
]);

// Payments table moved to billing section below for SaaS model
// Original accounting payments preserved as paymentRecords for internal use

export const paymentPlans = mysqlTable("paymentPlans", {
    id: varchar({ length: 64 }).primaryKey(),
    invoiceId: varchar({ length: 64 }).notNull(),
    clientId: varchar({ length: 64 }).notNull(),
    numInstallments: int().notNull(),
    installmentAmount: int().notNull(),
    frequencyDays: int().notNull(),
    startDate: datetime({ mode: 'string'}).notNull(),
    nextInstallmentDue: datetime({ mode: 'string'}).notNull(),
    lastInstallmentDate: datetime({ mode: 'string' }),
    completedInstallments: int().default(0).notNull(),
    totalPaid: int().default(0).notNull(),
    status: mysqlEnum(['active','paused','completed','cancelled']).default('active').notNull(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("invoice_idx").on(table.invoiceId),
    index("client_idx").on(table.clientId),
    index("status_idx").on(table.status),
    index("next_installment_idx").on(table.nextInstallmentDue),
]);

export const paymentPlanInstallments = mysqlTable("paymentPlanInstallments", {
    id: varchar({ length: 64 }).primaryKey(),
    paymentPlanId: varchar({ length: 64 }).notNull(),
    installmentNumber: int().notNull(),
    dueDate: datetime({ mode: 'string'}).notNull(),
    amount: int().notNull(),
    status: mysqlEnum(['pending','paid','overdue','skipped']).default('pending').notNull(),
    paidDate: datetime({ mode: 'string'}),
    paidAmount: int(),
    paymentId: varchar({ length: 64 }),
    notes: text(),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("payment_plan_idx").on(table.paymentPlanId),
    index("due_date_idx").on(table.dueDate),
    index("status_idx").on(table.status),
]);

export const payroll = mysqlTable("payroll", {
    id: varchar({ length: 64 }).primaryKey(),
    employeeId: varchar({ length: 64 }).notNull(),
    payPeriodStart: datetime({ mode: 'string'}).notNull(),
    payPeriodEnd: datetime({ mode: 'string'}).notNull(),
    basicSalary: int().notNull(),
    allowances: int().default(0),
    deductions: int().default(0),
    tax: int().default(0),
    netSalary: int().notNull(),
    status: mysqlEnum(['draft','processed','paid']).default('draft').notNull(),
    paymentDate: datetime({ mode: 'string'}),
    paymentMethod: varchar({ length: 50 }),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("employee_idx").on(table.employeeId),
    index("pay_period_idx").on(table.payPeriodStart, table.payPeriodEnd),
    index("status_idx").on(table.status),
]);

export const products = mysqlTable("products", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    sku: varchar({ length: 100 }),
    category: varchar({ length: 100 }),
    unitPrice: int().notNull(),
    costPrice: int(),
    stockQuantity: int().default(0),
    minStockLevel: int().default(0),
    unit: varchar({ length: 50 }).default('pcs'),
    taxRate: int().default(0),
    isActive: tinyint().default(1).notNull(),
    imageUrl: varchar({ length: 500 }),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
    supplier: varchar({ length: 255 }),
    reorderLevel: int(),
    reorderQuantity: int(),
    lastRestockDate: timestamp({ mode: 'string' }),
    maxStockLevel: int(),
    location: varchar({ length: 255 }),
},
(table) => [
    index("sku_idx").on(table.sku),
    index("category_idx").on(table.category),
]);

export const projectTasks = mysqlTable("projectTasks", {
    id: varchar({ length: 64 }).primaryKey(),
    projectId: varchar({ length: 64 }),
    clientId: varchar({ length: 64 }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    status: mysqlEnum(['todo','in_progress','review','completed','blocked']).default('todo').notNull(),
    priority: mysqlEnum(['low','medium','high','urgent']).default('medium').notNull(),
    assignedTo: varchar({ length: 64 }),
    dueDate: datetime({ mode: 'string'}),
    completedDate: datetime({ mode: 'string'}),
    estimatedHours: int(),
    actualHours: int(),
    approvalStatus: mysqlEnum(['pending','approved','rejected','revision_requested']).default('pending').notNull(),
    adminRemarks: longtext(),
    approvedBy: varchar({ length: 64 }),
    approvedAt: timestamp({ mode: 'string' }),
    rejectionReason: longtext(),
    parentTaskId: varchar({ length: 64 }),
    order: int().default(0),
    tags: text(),
    targetDate: datetime({ mode: 'string'}),
    billable: tinyint().default(1),
    visibleToClient: tinyint().default(1),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("project_idx").on(table.projectId),
    index("status_idx").on(table.status),
    index("assigned_to_idx").on(table.assignedTo),
    index("approval_status_idx").on(table.approvalStatus),
    index("approved_by_idx").on(table.approvedBy),
]);

export const projects = mysqlTable("projects", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    projectNumber: varchar({ length: 100 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    clientId: varchar({ length: 64 }).notNull(),
    status: mysqlEnum(['planning','active','on_hold','completed','cancelled']).default('planning').notNull(),
    priority: mysqlEnum(['low','medium','high','urgent']).default('medium').notNull(),
    startDate: datetime({ mode: 'string'}),
    endDate: datetime({ mode: 'string'}),
    actualStartDate: datetime({ mode: 'string'}),
    actualEndDate: datetime({ mode: 'string'}),
    budget: int(),
    actualCost: int().default(0),
    progress: int().default(0),
    assignedTo: varchar({ length: 64 }),
    projectManager: varchar({ length: 64 }),
    tags: text(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("project_number_idx").on(table.projectNumber),
    index("client_idx").on(table.clientId),
    index("status_idx").on(table.status),
    index("assigned_to_idx").on(table.assignedTo),
]);

export const projectMilestones = mysqlTable("projectMilestones", {
    id: varchar({ length: 64 }).primaryKey(),
    projectId: varchar({ length: 64 }).notNull(),
    phaseName: varchar({ length: 255 }).notNull(),
    description: text(),
    deliverables: text(),
    status: mysqlEnum(['planning','in_progress','on_hold','completed','cancelled']).default('planning').notNull(),
    startDate: datetime({ mode: 'string'}),
    dueDate: datetime({ mode: 'string'}).notNull(),
    completionDate: datetime({ mode: 'string'}),
    completionPercentage: int().default(0).notNull(),
    assignedTo: varchar({ length: 64 }),
    budget: int(),
    actualCost: int().default(0),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("project_idx").on(table.projectId),
    index("due_date_idx").on(table.dueDate),
    index("status_idx").on(table.status),
]);

export const timeEntries = mysqlTable("timeEntries", {
    id: varchar({ length: 64 }).primaryKey(),
    projectId: varchar({ length: 64 }).notNull(),
    projectTaskId: varchar({ length: 64 }),
    userId: varchar({ length: 64 }).notNull(),
    entryDate: datetime({ mode: 'string'}).notNull(),
    durationMinutes: int().notNull(),
    description: varchar({ length: 500 }).notNull(),
    billable: tinyint().default(1).notNull(),
    hourlyRate: int(),
    amount: int().default(0),
    status: mysqlEnum(['draft','submitted','approved','invoiced','rejected']).default('draft').notNull(),
    approvedBy: varchar({ length: 64 }),
    approvedAt: datetime({ mode: 'string'}),
    invoiceId: varchar({ length: 64 }),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("project_idx").on(table.projectId),
    index("task_idx").on(table.projectTaskId),
    index("user_idx").on(table.userId),
    index("entry_date_idx").on(table.entryDate),
    index("status_idx").on(table.status),
    index("billable_idx").on(table.billable),
]);

export const reminders = mysqlTable("reminders", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    type: mysqlEnum(['invoice_due','estimate_expiry','project_milestone','payment_overdue','custom']).notNull(),
    frequency: mysqlEnum(['once','daily','weekly','monthly','custom']).notNull(),
    customDays: int(),
    timing: mysqlEnum(['before','on','after']).notNull(),
    isActive: tinyint().default(1).notNull(),
    emailEnabled: tinyint().default(1).notNull(),
    smsEnabled: tinyint().default(0).notNull(),
    emailTemplate: text(),
    smsTemplate: text(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const scheduledReminders = mysqlTable("scheduledReminders", {
    id: varchar({ length: 64 }).primaryKey(),
    reminderId: varchar({ length: 64 }).notNull(),
    referenceType: varchar({ length: 50 }).notNull(),
    referenceId: varchar({ length: 64 }).notNull(),
    recipientId: varchar({ length: 64 }).notNull(),
    recipientType: mysqlEnum(['user','client']).notNull(),
    scheduledFor: datetime({ mode: 'string'}).notNull(),
    status: mysqlEnum(['pending','sent','failed','cancelled']).default('pending').notNull(),
    sentAt: datetime({ mode: 'string'}),
    error: text(),
    createdAt: timestamp({ mode: 'string' }),
});

export const services = mysqlTable("services", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    category: varchar({ length: 100 }),
    hourlyRate: int(),
    fixedPrice: int(),
    unit: varchar({ length: 50 }).default('hour'),
    taxRate: int().default(0),
    isActive: tinyint().default(1).notNull(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const settings = mysqlTable("settings", {
    id: varchar({ length: 64 }).primaryKey(),
    key: varchar({ length: 100 }).notNull(),
    // previously we accidentally named this column "longtext" by passing
    // a string argument to `text()`; the first parameter is treated as the
    // column name.  Use the dedicated `longtext()` helper so the column
    // remains "value" while still having the desired MySQL type.
    value: longtext(),
    category: varchar({ length: 100 }),
    description: text(),
    updatedBy: varchar({ length: 64 }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("key_idx").on(table.key),
    index("category_idx").on(table.category),
]);

export const stockAlerts = mysqlTable("stockAlerts", {
    id: varchar({ length: 64 }).primaryKey(),
    productId: varchar({ length: 64 }).notNull(),
    alertType: mysqlEnum(['low_stock','out_of_stock','overstock','reorder']).notNull(),
    currentQuantity: int().notNull(),
    threshold: int().notNull(),
    status: mysqlEnum(['active','resolved','ignored']).default('active').notNull(),
    notifiedAt: datetime({ mode: 'string'}),
    resolvedAt: datetime({ mode: 'string'}),
    createdAt: timestamp({ mode: 'string' }),
});

export const systemSettings = mysqlTable("systemSettings", {
    id: varchar({ length: 64 }).primaryKey(),
    category: varchar({ length: 100 }).notNull(),
    key: varchar({ length: 100 }).notNull(),
    value: text(),
    dataType: mysqlEnum(['string','number','boolean','json']).notNull(),
    description: text(),
    isPublic: tinyint().default(0).notNull(),
    updatedBy: varchar({ length: 64 }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const templates = mysqlTable("templates", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    type: mysqlEnum(['invoice','estimate','receipt','proposal','report']).notNull(),
    content: text().notNull(),
    isDefault: tinyint().default(0).notNull(),
    isActive: tinyint().default(1).notNull(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("type_idx").on(table.type),
]);

export const documentNumberFormats = mysqlTable("documentNumberFormats", {
    id: varchar({ length: 64 }).primaryKey(),
    documentType: mysqlEnum(['invoice','estimate','receipt','proposal','expense','payment','contract','quotation','purchase_order','project','credit_note','debit_note']).notNull(),
    prefix: varchar({ length: 50 }).default('').notNull(),
    padding: int().default(6).notNull(),
    separator: varchar({ length: 5 }).default('-').notNull(),
    currentNumber: int().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const defaultSettings = mysqlTable("defaultSettings", {
    id: varchar({ length: 64 }).primaryKey(),
    category: varchar({ length: 100 }).notNull(),
    key: varchar({ length: 100 }).notNull(),
    value: text().notNull(),
    description: text(),
    createdAt: timestamp({ mode: 'string' }),
});

// Permissions table for granular permission management
export const permissions = mysqlTable("permissions", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 100 }),
    permissionName: varchar({ length: 100 }),
    description: text(),
    category: varchar({ length: 100 }),
    resource: varchar({ length: 100 }),
    action: varchar({ length: 50 }),
    isAdvanced: tinyint().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("idx_permissions_category").on(table.category),
    index("idx_permissions_resource").on(table.resource),
]);

// Custom roles for org-specific roles with granular permissions
export const customRoles = mysqlTable("customRoles", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    name: varchar({ length: 100 }).notNull(),
    displayName: varchar({ length: 255 }).notNull(),
    description: text(),
    permissions: text(), // JSON array of permission feature strings
    baseRole: mysqlEnum(['user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager']).default('staff'),
    isAdvanced: tinyint().default(0).notNull(),
    isSystem: tinyint().default(0).notNull(),
    isActive: tinyint().default(1).notNull(),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("idx_customRoles_orgId").on(table.organizationId),
    index("idx_customRoles_name").on(table.name),
    index("idx_customRoles_active").on(table.isActive),
]);

export const userRoles = mysqlTable("userRoles", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }),
    role: varchar({ length: 50 }),
    roleName: varchar({ length: 100 }),
    description: text(),
    isActive: tinyint().default(1),
    assignedBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
});

export const rolePermissions = mysqlTable("rolePermissions", {
    id: varchar({ length: 64 }).primaryKey(),
    roleId: varchar({ length: 64 }).notNull(),
    permissionId: varchar({ length: 64 }).notNull(),
    createdAt: timestamp({ mode: 'string' }),
});

export const receipts = mysqlTable("receipts", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    receiptNumber: varchar({ length: 100 }).notNull(),
    clientId: varchar({ length: 64 }).notNull(),
    paymentId: varchar({ length: 64 }),
    amount: int().notNull(),
    paymentMethod: mysqlEnum(['cash','bank_transfer','cheque','mpesa','card','other']).notNull(),
    receiptDate: datetime().notNull(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    approvedBy: varchar({ length: 64 }),
    approvedAt: datetime(),
    createdAt: timestamp({ mode: 'string' }),
});

export const creditNotes = mysqlTable("creditNotes", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    creditNoteNumber: varchar({ length: 100 }).notNull(),
    clientId: varchar({ length: 64 }).notNull(),
    clientName: varchar({ length: 255 }),
    invoiceId: varchar({ length: 64 }),
    issueDate: datetime({ mode: 'string' }).notNull(),
    reason: mysqlEnum(['goods-returned','service-cancelled','discount','quality-issue','error','other']).notNull().default('other'),
    subtotal: int().notNull().default(0),
    taxAmount: int().notNull().default(0),
    total: int().notNull().default(0),
    status: mysqlEnum(['draft','approved','applied','void']).default('draft').notNull(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    approvedBy: varchar({ length: 64 }),
    approvedAt: datetime({ mode: 'string' }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("credit_note_number_idx").on(table.creditNoteNumber),
    index("client_idx").on(table.clientId),
    index("status_idx").on(table.status),
    index("invoice_idx").on(table.invoiceId),
]);

export const debitNotes = mysqlTable("debitNotes", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    debitNoteNumber: varchar({ length: 100 }).notNull(),
    supplierId: varchar({ length: 64 }).notNull(),
    supplierName: varchar({ length: 255 }),
    purchaseOrderId: varchar({ length: 64 }),
    issueDate: datetime({ mode: 'string' }).notNull(),
    reason: mysqlEnum(['quality-shortage','price-adjustment','damaged','underdelivery','penalty']).notNull().default('quality-shortage'),
    subtotal: int().notNull().default(0),
    taxAmount: int().notNull().default(0),
    total: int().notNull().default(0),
    status: mysqlEnum(['draft','approved','settled','void']).default('draft').notNull(),
    notes: text(),
    createdBy: varchar({ length: 64 }),
    approvedBy: varchar({ length: 64 }),
    approvedAt: datetime({ mode: 'string' }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("debit_note_number_idx").on(table.debitNoteNumber),
    index("supplier_idx").on(table.supplierId),
    index("debit_status_idx").on(table.status),
]);

export const departments = mysqlTable("departments", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    headId: varchar({ length: 64 }),
    budget: int(),
    status: mysqlEnum(['active','inactive']).default('active'),
    defaultRole: varchar({ length: 100 }),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const budgets = mysqlTable("budgets", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    departmentId: varchar({ length: 64 }).notNull(),
    amount: int().notNull(),
    remaining: int().notNull(),
    fiscalYear: int().notNull(),
    budgetName: varchar({ length: 255 }),
    budgetDescription: text(),
    budgetStatus: mysqlEnum(['draft','active','inactive','closed']).default('draft'),
    startDate: datetime({ mode: 'string' }),
    endDate: datetime({ mode: 'string' }),
    approvedBy: varchar({ length: 64 }),
    approvedAt: datetime({ mode: 'string' }),
    createdBy: varchar({ length: 64 }),
    totalBudgeted: int().default(0),
    totalActual: int().default(0),
    variance: int().default(0),
    variancePercent: int().default(0), // Stored as percentage * 100 (e.g., 15.5% = 1550)
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const attendance = mysqlTable("attendance", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }),
    employeeId: varchar({ length: 64 }).notNull(),
    date: datetime().notNull(),
    status: mysqlEnum(['present','absent','late','leave']).default('present'),
    checkInTime: datetime(),
    checkOutTime: datetime(),
    notes: text(),
    createdAt: timestamp({ mode: 'string' }),
});

export const userProjectAssignments = mysqlTable("userProjectAssignments", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    projectId: varchar({ length: 64 }).notNull(),
    role: varchar({ length: 50 }),
    assignedDate: datetime().notNull(),
    createdAt: timestamp({ mode: 'string' }),
});

export const projectComments = mysqlTable("projectComments", {
    id: varchar({ length: 64 }).primaryKey(),
    projectId: varchar({ length: 64 }).notNull(),
    userId: varchar({ length: 64 }).notNull(),
    comment: text().notNull(),
    createdAt: timestamp({ mode: 'string' }),
});

export const staffTasks = mysqlTable("staffTasks", {
    id: varchar({ length: 64 }).primaryKey(),
    departmentId: varchar({ length: 64 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    assignedTo: varchar({ length: 64 }),
    dueDate: datetime(),
    status: mysqlEnum(['pending','in_progress','completed']).default('pending'),
    createdAt: timestamp({ mode: 'string' }),
});

export const userPermissions = mysqlTable("userPermissions", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    resource: varchar({ length: 100 }).notNull(),
    action: varchar({ length: 50 }).notNull(),
    granted: tinyint().default(1).notNull(),
    grantedBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
});

export const users = mysqlTable("users", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 320 }).notNull(),
    emailVerified: timestamp({ mode: 'string' }),
    loginMethod: varchar({ length: 50 }).default('local').notNull(),
    passwordHash: varchar({ length: 255 }),
    role: mysqlEnum(['user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager']).default('user').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
    lastSignedIn: timestamp({ mode: 'string' }),
    department: varchar({ length: 100 }),
    isActive: tinyint().default(1).notNull(),
    clientId: varchar({ length: 64 }),
    permissions: text(),
    passwordResetToken: varchar({ length: 255 }),
    passwordResetExpiresAt: timestamp({ mode: 'string' }),
    phone: varchar({ length: 20 }),
    company: varchar({ length: 255 }),
    position: varchar({ length: 100 }),
    address: text(),
    city: varchar({ length: 100 }),
    country: varchar({ length: 100 }),
    photoUrl: longtext(),
    organizationId: varchar({ length: 64 }),
    customRoleId: varchar({ length: 64 }),
});

export const savedFilters = mysqlTable("savedFilters", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    moduleName: varchar({ length: 100 }).notNull(),
    filterName: varchar({ length: 255 }).notNull(),
    description: text(),
    filterConfig: text().notNull(),
    isDefault: tinyint().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("user_module_idx").on(table.userId, table.moduleName),
    index("module_idx").on(table.moduleName),
]);

// ============================================
// AI & NOTIFICATIONS (Phase 1)
// ============================================

export const notifications = mysqlTable("notifications", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    type: mysqlEnum(['info','success','warning','error','reminder','payment','project','client','financial','system']).notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: text().notNull(),
    category: varchar({ length: 50 }),
    entityType: varchar({ length: 50 }), // e.g., 'invoice', 'project', 'budget'
    entityId: varchar({ length: 64 }),
    priority: mysqlEnum(['low','normal','medium','high','critical']).default('normal').notNull(),
    actionUrl: varchar({ length: 500 }), // Link to view the relevant entity
    isRead: tinyint().default(0).notNull(),
    readAt: timestamp({ mode: 'string' }),
    deliveryStatus: mysqlEnum(['pending','sent','failed']).default('pending').notNull(),
    deliveryDate: timestamp({ mode: 'string' }),
    status: mysqlEnum(['active','archived']).default('active').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("user_id_idx").on(table.userId),
    index("type_idx").on(table.type),
    index("is_read_idx").on(table.isRead),
    index("created_at_idx").on(table.createdAt),
]);

export const notificationSettings = mysqlTable("notificationSettings", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    channelType: mysqlEnum(['in_app','email','sms','slack']).notNull(),
    isEnabled: tinyint().default(1).notNull(),
    notificationType: mysqlEnum(['payment','project','client','financial','system']).notNull(),
    frequency: mysqlEnum(['immediate','daily_digest','weekly_digest','never']).default('immediate').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("user_channel_idx").on(table.userId, table.channelType),
]);

export const notificationPreferences = mysqlTable("notificationPreferences", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    slackWebhookUrl: varchar({ length: 500 }),
    phoneNumber: varchar({ length: 20 }),
    quietHoursStart: varchar({ length: 5 }), // HH:MM format
    quietHoursEnd: varchar({ length: 5 }),
    timeZone: varchar({ length: 50 }).default('UTC'),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
});

export const smsQueue = mysqlTable("smsQueue", {
    id: varchar({ length: 64 }).primaryKey(),
    phoneNumber: varchar({ length: 20 }).notNull(),
    message: text().notNull(),
    status: mysqlEnum(['pending','sending','delivered','failed']).default('pending').notNull(),
    retryCount: int().default(0),
    provider: varchar({ length: 50 }),
    externalId: varchar({ length: 128 }),
    error: text(),
    failureReason: text(),
    relatedEntityType: varchar({ length: 50 }),
    relatedEntityId: varchar({ length: 64 }),
    sentAt: timestamp({ mode: 'string' }),
    nextRetryAt: timestamp({ mode: 'string' }),
    organizationId: varchar({ length: 64 }),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("sms_status_idx").on(table.status),
    index("sms_created_idx").on(table.createdAt),
]);

export const smsCustomerPreferences = mysqlTable("smsCustomerPreferences", {
    id: varchar({ length: 64 }).primaryKey(),
    phoneNumber: varchar({ length: 20 }).notNull(),
    optedIn: boolean().default(true).notNull(),
    marketingOptedIn: boolean().default(false).notNull(),
    transactionalOptedIn: boolean().default(true).notNull(),
    reminderPreferences: json(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("sms_pref_phone_idx").on(table.phoneNumber),
]);

export const userFavorites = mysqlTable("userFavorites", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    entityType: varchar({ length: 50 }).notNull(),
    entityId: varchar({ length: 64 }).notNull(),
    entityName: varchar({ length: 255 }),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("fav_user_idx").on(table.userId),
    index("fav_entity_idx").on(table.entityType, table.entityId),
]);

export const aiDocuments = mysqlTable("aiDocuments", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    documentType: mysqlEnum(['contract','invoice','proposal','brief','report','email']).notNull(),
    originalContent: longtext().notNull(),
    summary: text(),
    keyPoints: json(), // Array of key points extracted
    actionItems: json(), // Array of action items with owners
    financialSummary: json(), // For financial documents
    generatedAt: timestamp({ mode: 'string' }).defaultNow(),
    status: mysqlEnum(['processed','failed','pending']).default('pending').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("user_id_idx").on(table.userId),
    index("document_type_idx").on(table.documentType),
]);

export const emailGenerationHistory = mysqlTable("emailGenerationHistory", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    templateType: mysqlEnum(['invoice_followup','proposal','project_update','general','payment_reminder']).notNull(),
    tone: mysqlEnum(['professional','friendly','formal','casual']).default('professional').notNull(),
    generatedContent: text().notNull(),
    originalContext: text(), // Context used for generation
    recipientId: varchar({ length: 64 }), // Client/user receiving email
    wasSent: tinyint().default(0).notNull(),
    sentAt: timestamp({ mode: 'string' }),
    feedback: varchar({ length: 20 }), // thumbs up/down
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("user_id_idx").on(table.userId),
    index("template_type_idx").on(table.templateType),
]);

export const financialAnalytics = mysqlTable("financialAnalytics", {
    id: varchar({ length: 64 }).primaryKey(),
    organizationId: varchar({ length: 64 }).notNull(),
    month: datetime({ mode: 'string' }).notNull(),
    totalRevenue: int().default(0),
    totalExpenses: int().default(0),
    netProfit: int().default(0),
    expenseTrends: json(), // Category-wise expense breakdown
    revenueTrends: json(), // Revenue by client/project
    costReductionOpportunities: json(), // AI-identified savings
    cashFlowForecast: json(), // Next 3/6/12 month forecast
    analysisNotes: text(),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const aiChatSessions = mysqlTable("aiChatSessions", {
    id: varchar({ length: 64 }).primaryKey(),
    userId: varchar({ length: 64 }).notNull(),
    title: varchar({ length: 255 }),
    messageCount: int().default(0),
    lastMessageAt: timestamp({ mode: 'string' }),
    status: mysqlEnum(['active','archived']).default('active').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("user_id_idx").on(table.userId),
    index("created_at_idx").on(table.createdAt),
]);

export const aiChatMessages = mysqlTable("aiChatMessages", {
    id: varchar({ length: 64 }).primaryKey(),
    sessionId: varchar({ length: 64 }).notNull(),
    userId: varchar({ length: 64 }).notNull(),
    role: mysqlEnum(['user','assistant']).notNull(),
    content: text().notNull(),
    tokens: int().default(0), // Token count for billing/tracking
    createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
    index("session_id_idx").on(table.sessionId),
    index("user_id_idx").on(table.userId),
]);

// Note: roles table exists in the database but is not actively managed by Drizzle migrations
// It's defined here for reference only - keeping it out of migrations to avoid conflicts
// export const roles = mysqlTable("roles", {
//     id: varchar({ length: 64 }).notNull(),
//     name: varchar({ length: 50 }).notNull(),
//     displayName: varchar({ length: 100 }).notNull(),
//     description: text(),
//     permissions: text().notNull(),
//     isSystem: tinyint().default(0).notNull(),
//     createdAt: timestamp({ mode: 'string' }),
//     updatedAt: timestamp({ mode: 'string' }),
// },
// (table) => [
//     index("role_name_idx").on(table.name),
// ]);

export const lineItems = mysqlTable("lineItems", {
    id: varchar({ length: 64 }).primaryKey(),
    documentId: varchar({ length: 64 }).notNull(),
    documentType: mysqlEnum(['invoice','estimate','receipt','expense','credit_note','lpo']).notNull(),
    description: text().notNull(),
    quantity: int().notNull(),
    rate: int().notNull(),
    amount: int().notNull(),
    productId: varchar({ length: 64 }),
    serviceId: varchar({ length: 64 }),
    taxRate: int().default(0),
    taxAmount: int().default(0),
    lineNumber: int().default(1),
    createdBy: varchar({ length: 64 }),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
    index("document_idx").on(table.documentId, table.documentType),
]);

export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = typeof savedFilters.$inferInsert;

// export type Role = typeof roles.$inferSelect;
// export type InsertRole = typeof roles.$inferInsert;
// ============================================
// WORKFLOW AUTOMATION TABLES
// ============================================

export const workflows = mysqlTable("workflows", {
    id: varchar({ length: 64 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    status: mysqlEnum(['active', 'inactive', 'draft']).default('draft').notNull(),
    triggerType: mysqlEnum(['invoice_created', 'invoice_paid', 'invoice_overdue', 'payment_received', 'opportunity_moved', 'task_completed', 'project_milestone_reached', 'reminder_time']).notNull(),
    triggerCondition: text(), // JSON stringified condition
    actionTypes: text().notNull(), // JSON array of action types
    isRecurring: tinyint().default(0),
    createdBy: varchar({ length: 64 }).notNull(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
}, (table) => [
    index("status_idx").on(table.status),
    index("trigger_type_idx").on(table.triggerType),
    index("created_by_idx").on(table.createdBy),
]);

export const workflowTriggers = mysqlTable("workflowTriggers", {
    id: varchar({ length: 64 }).primaryKey(),
    workflowId: varchar({ length: 64 }).notNull(),
    triggerType: varchar({ length: 100 }).notNull(),
    triggerField: varchar({ length: 100 }),
    operator: mysqlEnum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'starts_with', 'ends_with']).default('equals'),
    triggerValue: text(),
    isActive: tinyint().default(1).notNull(),
    createdAt: timestamp({ mode: 'string' }),
}, (table) => [
    index("workflow_idx").on(table.workflowId),
    index("trigger_type_idx").on(table.triggerType),
]);

export const workflowActions = mysqlTable("workflowActions", {
    id: varchar({ length: 64 }).primaryKey(),
    workflowId: varchar({ length: 64 }).notNull(),
    actionType: mysqlEnum(['send_email', 'create_task', 'update_status', 'send_notification', 'create_follow_up', 'add_invoice', 'update_field', 'create_reminder']).notNull(),
    actionName: varchar({ length: 255 }).notNull(),
    actionTarget: varchar({ length: 100 }),
    actionData: text().notNull(), // JSON stringified action parameters
    delayMinutes: int().default(0), // Delay before executing action
    sequence: int().default(1), // Order of execution
    isActive: tinyint().default(1).notNull(),
    createdAt: timestamp({ mode: 'string' }),
    updatedAt: timestamp({ mode: 'string' }),
}, (table) => [
    index("workflow_idx").on(table.workflowId),
    index("action_type_idx").on(table.actionType),
]);

export const workflowExecutions = mysqlTable("workflowExecutions", {
    id: varchar({ length: 64 }).primaryKey(),
    workflowId: varchar({ length: 64 }).notNull(),
    entityType: varchar({ length: 100 }).notNull(),
    entityId: varchar({ length: 64 }).notNull(),
    status: mysqlEnum(['pending', 'running', 'completed', 'failed', 'skipped']).default('pending').notNull(),
    triggerData: text(), // JSON stringified trigger event data
    executionLog: text(), // JSON array of execution steps
    errorMessage: text(),
    executedAt: timestamp({ mode: 'string' }),
    completedAt: timestamp({ mode: 'string' }),
    createdAt: timestamp({ mode: 'string' }),
}, (table) => [
    index("workflow_idx").on(table.workflowId),
    index("entity_idx").on(table.entityType, table.entityId),
    index("status_idx").on(table.status),
    index("executed_at_idx").on(table.executedAt),
]);

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;
export type InsertWorkflowTrigger = typeof workflowTriggers.$inferInsert;

export type WorkflowAction = typeof workflowActions.$inferSelect;
export type InsertWorkflowAction = typeof workflowActions.$inferInsert;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

// ============================================================================
// ENHANCED PERMISSIONS SYSTEM
// ============================================================================

export const permissionMetadata = mysqlTable("permission_metadata", {
  id: varchar({ length: 64 }).primaryKey(),
  permissionId: varchar({ length: 100 }).notNull().unique(),
  label: varchar({ length: 255 }).notNull(),
  description: text(),
  category: varchar({ length: 100 }).notNull(),
  icon: varchar({ length: 100 }),
  isSystem: tinyint().default(1),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export type PermissionMetadata = typeof permissionMetadata.$inferSelect;
export type InsertPermissionMetadata = typeof permissionMetadata.$inferInsert;

// ============================================================================
// DASHBOARD CUSTOMIZATION SYSTEM
// ============================================================================

export const dashboardLayouts = mysqlTable("dashboardLayouts", {
  id: varchar({ length: 64 }).primaryKey(),
  userId: varchar({ length: 64 }).notNull(),
  name: varchar({ length: 255 }).notNull().default("My Dashboard"),
  description: text(),
  gridColumns: int().default(6),
  isDefault: tinyint().default(0),
  layoutData: json(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  { uniqueIndex: "idx_user_default", on: [table.userId, table.isDefault] },
  { index: "idx_user_id", on: [table.userId] },
]);

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type InsertDashboardLayout = typeof dashboardLayouts.$inferInsert;

export const dashboardWidgets = mysqlTable("dashboardWidgets", {
  id: varchar({ length: 64 }).primaryKey(),
  layoutId: varchar({ length: 64 }).notNull(),
  widgetType: varchar({ length: 100 }).notNull(),
  widgetTitle: varchar({ length: 255 }),
  widgetSize: varchar({ length: 10 }).default("medium"),
  rowIndex: int().default(0),
  colIndex: int().default(0),
  refreshInterval: int().default(300),
  config: json(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  { index: "idx_layout_id", on: [table.layoutId] },
  { index: "idx_widget_type", on: [table.widgetType] },
]);

export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type InsertDashboardWidget = typeof dashboardWidgets.$inferInsert;

export const dashboardWidgetData = mysqlTable("dashboardWidgetData", {
  id: varchar({ length: 64 }).primaryKey(),
  widgetId: varchar({ length: 64 }).notNull(),
  dataKey: varchar({ length: 255 }),
  dataValue: json(),
  cachedAt: timestamp({ mode: 'string' }).defaultNow(),
  expiresAt: timestamp({ mode: 'string' }),
}, (table) => [
  { index: "idx_widget_id", on: [table.widgetId] },
  { index: "idx_expires_at", on: [table.expiresAt] },
]);

export type DashboardWidgetDataRecord = typeof dashboardWidgetData.$inferSelect;
export type InsertDashboardWidgetData = typeof dashboardWidgetData.$inferInsert;

// ============================================================================
// AUDIT LOGGING FOR PERMISSION CHANGES
// ============================================================================

export const permissionAuditLog = mysqlTable("permissionAuditLog", {
  id: varchar({ length: 64 }).primaryKey(),
  roleId: varchar({ length: 64 }),
  userId: varchar({ length: 64 }),
  permissionId: varchar({ length: 100 }),
  permissionLabel: varchar({ length: 255 }),
  action: varchar({ length: 50 }).notNull(),
  changedBy: varchar({ length: 64 }),
  oldValue: text(),
  newValue: text(),
  reason: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  { index: "idx_role_id", on: [table.roleId] },
  { index: "idx_user_id", on: [table.userId] },
  { index: "idx_changed_by", on: [table.changedBy] },
  { index: "idx_action", on: [table.action] },
  { index: "idx_created_at", on: [table.createdAt] },
]);

export type PermissionAuditLog = typeof permissionAuditLog.$inferSelect;
export type InsertPermissionAuditLog = typeof permissionAuditLog.$inferInsert;

// ============================================================================
// PHASE 20: PROJECT ANALYTICS
// ============================================================================

export const projectMetrics = mysqlTable("projectMetrics", {
  id: varchar({ length: 64 }).primaryKey(),
  projectId: varchar({ length: 64 }).notNull(),
  revenue: int().default(0),
  costs: int().default(0),
  profit: int().default(0),
  profitMargin: int().default(0),
  hoursEstimated: int().default(0),
  hoursActual: int().default(0),
  teamMembersCount: int().default(0),
  completionPercentage: int().default(0),
  statusKey: varchar({ length: 50 }).default('on-time'),
  riskLevel: mysqlEnum(['low', 'medium', 'high']).default('low'),
  calculatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_project_id").on(table.projectId),
  index("idx_risk_level").on(table.riskLevel),
]);

export type ProjectMetrics = typeof projectMetrics.$inferSelect;
export type InsertProjectMetrics = typeof projectMetrics.$inferInsert;

// ============================================================================
// PHASE 20: CLIENT HEALTH SCORING
// ============================================================================

export const clientHealthScores = mysqlTable("clientHealthScores", {
  id: varchar({ length: 64 }).primaryKey(),
  clientId: varchar({ length: 64 }).notNull(),
  healthScore: int().default(50),
  riskLevel: mysqlEnum(['green', 'yellow', 'red']).default('yellow'),
  paymentTimeliness: int().default(50),
  invoiceFrequency: int().default(50),
  totalRevenue: int().default(0),
  overdueAmount: int().default(0),
  projectSuccessRate: int().default(50),
  churnRisk: int().default(0),
  lifetimeValue: int().default(0),
  lastActivityDate: timestamp({ mode: 'string' }),
  calculatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_client_id").on(table.clientId),
  index("idx_health_score").on(table.healthScore),
  index("idx_risk_level").on(table.riskLevel),
]);

export type ClientHealthScore = typeof clientHealthScores.$inferSelect;
export type InsertClientHealthScore = typeof clientHealthScores.$inferInsert;

// ============================================================================
// PHASE 20: TEAM PERFORMANCE REVIEWS
// ============================================================================

export const performanceReviews = mysqlTable("performanceReviews", {
  id: varchar({ length: 64 }).primaryKey(),
  employeeId: varchar({ length: 64 }).notNull(),
  reviewerId: varchar({ length: 64 }).notNull(),
  reviewDate: timestamp({ mode: 'string' }).defaultNow(),
  period: varchar({ length: 50 }).notNull(),
  overallRating: int().default(0),
  performanceScore: int().default(0),
  productivity: int().default(0),
  collaboration: int().default(0),
  communication: int().default(0),
  technicalSkills: int().default(0),
  leadership: int().default(0),
  comments: text(),
  goals: text(),
  developmentPlan: text(),
  status: mysqlEnum(['draft', 'completed', 'archived']).default('draft'),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_employee_id").on(table.employeeId),
  index("idx_reviewer_id").on(table.reviewerId),
  index("idx_period").on(table.period),
  index("idx_review_date").on(table.reviewDate),
]);

export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = typeof performanceReviews.$inferInsert;

export const skillsMatrix = mysqlTable("skillsMatrix", {
  id: varchar({ length: 64 }).primaryKey(),
  employeeId: varchar({ length: 64 }).notNull(),
  skillName: varchar({ length: 255 }).notNull(),
  proficiencyLevel: mysqlEnum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  yearsOfExperience: int().default(0),
  lastAssessmentDate: timestamp({ mode: 'string' }),
  certifications: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_employee_id").on(table.employeeId),
  index("idx_skill_name").on(table.skillName),
]);

export type SkillsMatrixRecord = typeof skillsMatrix.$inferSelect;
export type InsertSkillsMatrix = typeof skillsMatrix.$inferInsert;

// ============================================================================
// PHASE 20: ADVANCED SCHEDULING
// ============================================================================

export const schedules = mysqlTable("schedules", {
  id: varchar({ length: 64 }).primaryKey(),
  employeeId: varchar({ length: 64 }).notNull(),
  taskTitle: varchar({ length: 255 }).notNull(),
  description: text(),
  startDate: timestamp({ mode: 'string' }).notNull(),
  endDate: timestamp({ mode: 'string' }).notNull(),
  duration: int().default(0),
  priority: mysqlEnum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: mysqlEnum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  assignedTo: varchar({ length: 64 }),
  projectId: varchar({ length: 64 }),
  recurrencePattern: varchar({ length: 100 }),
  createdBy: varchar({ length: 64 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_employee_id").on(table.employeeId),
  index("idx_start_date").on(table.startDate),
  index("idx_status").on(table.status),
]);

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

export const vacationRequests = mysqlTable("vacationRequests", {
  id: varchar({ length: 64 }).primaryKey(),
  employeeId: varchar({ length: 64 }).notNull(),
  startDate: timestamp({ mode: 'string' }).notNull(),
  endDate: timestamp({ mode: 'string' }).notNull(),
  daysRequested: int().default(0),
  vacationType: mysqlEnum(['vacation', 'sick_leave', 'personal', 'sabbatical']).default('vacation'),
  reason: text(),
  status: mysqlEnum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  approvedBy: varchar({ length: 64 }),
  approvalDate: timestamp({ mode: 'string' }),
  notes: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_employee_id").on(table.employeeId),
  index("idx_start_date").on(table.startDate),
  index("idx_status").on(table.status),
]);

export type VacationRequest = typeof vacationRequests.$inferSelect;
export type InsertVacationRequest = typeof vacationRequests.$inferInsert;

// ============================================================================
// PHASE 20: DOCUMENT MANAGEMENT
// ============================================================================

export const documents = mysqlTable("documents", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  documentName: varchar({ length: 255 }).notNull(),
  documentType: mysqlEnum(['contract', 'agreement', 'proposal', 'template', 'invoice', 'receipt', 'other']).default('other'),
  fileUrl: varchar({ length: 500 }).notNull(),
  fileSize: int().default(0),
  mimeType: varchar({ length: 100 }),
  linkedEntityType: varchar({ length: 100 }),
  linkedEntityId: varchar({ length: 64 }),
  linkedClientId: varchar({ length: 64 }),
  linkedProjectId: varchar({ length: 64 }),
  linkedInvoiceId: varchar({ length: 64 }),
  uploadedBy: varchar({ length: 64 }).notNull(),
  currentVersion: int().default(1),
  status: mysqlEnum(['active', 'archived', 'deleted']).default('active'),
  expiryDate: timestamp({ mode: 'string' }),
  requiresSignature: tinyint().default(0),
  isSigned: tinyint().default(0),
  signedDate: timestamp({ mode: 'string' }),
  signedBy: varchar({ length: 64 }),
  tags: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_document_type").on(table.documentType),
  index("idx_entity").on(table.linkedEntityType, table.linkedEntityId),
  index("idx_client_id").on(table.linkedClientId),
  index("idx_project_id").on(table.linkedProjectId),
  index("idx_uploaded_by").on(table.uploadedBy),
]);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const documentVersions = mysqlTable("documentVersions", {
  id: varchar({ length: 64 }).primaryKey(),
  documentId: varchar({ length: 64 }).notNull(),
  versionNumber: int().default(1),
  fileUrl: varchar({ length: 500 }).notNull(),
  fileSize: int().default(0),
  uploadedBy: varchar({ length: 64 }).notNull(),
  changeNotes: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_document_id").on(table.documentId),
  index("idx_version").on(table.versionNumber),
]);

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

export const documentAccess = mysqlTable("documentAccess", {
  id: varchar({ length: 64 }).primaryKey(),
  documentId: varchar({ length: 64 }).notNull(),
  userId: varchar({ length: 64 }),
  roleId: varchar({ length: 64 }),
  accessLevel: mysqlEnum(['view', 'download', 'edit', 'share']).default('view'),
  grantedBy: varchar({ length: 64 }),
  grantedAt: timestamp({ mode: 'string' }).defaultNow(),
  expiresAt: timestamp({ mode: 'string' }),
}, (table) => [
  index("idx_document_id").on(table.documentId),
  index("idx_user_id").on(table.userId),
]);

export type DocumentAccess = typeof documentAccess.$inferSelect;
export type InsertDocumentAccess = typeof documentAccess.$inferInsert;

// ============================================================================
// PHASE 20: REAL-TIME NOTIFICATIONS & RULES
// ============================================================================

export const notificationRules = mysqlTable("notificationRules", {
  id: varchar({ length: 64 }).primaryKey(),
  userId: varchar({ length: 64 }).notNull(),
  eventType: varchar({ length: 100 }).notNull(),
  channelType: mysqlEnum(['email', 'in_app', 'push', 'sms']).default('in_app'),
  doNotDisturbStart: varchar({ length: 5 }),
  doNotDisturbEnd: varchar({ length: 5 }),
  frequency: mysqlEnum(['instant', 'daily', 'weekly', 'never']).default('instant'),
  enabled: tinyint().default(1),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_event_type").on(table.eventType),
]);

export type NotificationRule = typeof notificationRules.$inferSelect;
export type InsertNotificationRule = typeof notificationRules.$inferInsert;

// ============================================================================
// PHASE 20: EXPENSE MANAGEMENT
// ============================================================================

export const usageMetrics = mysqlTable("usageMetrics", {
  id: varchar({ length: 64 }).primaryKey(),
  subscriptionId: varchar({ length: 64 }).notNull(),
  metricName: varchar({ length: 255 }).notNull(),
  metricValue: int().default(0),
  billingAmount: int().default(0),
  usagePeriod: varchar({ length: 50 }).notNull(),
  recordedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_subscription_id").on(table.subscriptionId),
  index("idx_usage_period").on(table.usagePeriod),
]);

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

// ============================================================================
// PHASE 20: EXPENSE MANAGEMENT
// ============================================================================

export const expenseCategories = mysqlTable("expenseCategories", {
  id: varchar({ length: 64 }).primaryKey(),
  categoryName: varchar({ length: 255 }).notNull(),
  description: text(),
  taxDeductible: tinyint().default(1),
  accountCode: varchar({ length: 50 }),
  isActive: tinyint().default(1),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_category_name").on(table.categoryName),
  index("idx_tax_deductible").on(table.taxDeductible),
]);

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

export const expenseReports = mysqlTable("expenseReports", {
  id: varchar({ length: 64 }).primaryKey(),
  submittedBy: varchar({ length: 64 }).notNull(),
  reportDate: timestamp({ mode: 'string' }).notNull(),
  totalAmount: int().default(0),
  currency: varchar({ length: 10 }).default('KES'),
  status: mysqlEnum(['draft', 'submitted', 'approved', 'rejected', 'reimbursed']).default('draft'),
  approvedBy: varchar({ length: 64 }),
  approvalDate: timestamp({ mode: 'string' }),
  reimbursementDate: timestamp({ mode: 'string' }),
  notes: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_submitted_by").on(table.submittedBy),
  index("idx_status").on(table.status),
  index("idx_report_date").on(table.reportDate),
]);

export type ExpenseReport = typeof expenseReports.$inferSelect;
export type InsertExpenseReport = typeof expenseReports.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

export const reimbursements = mysqlTable("reimbursements", {
  id: varchar({ length: 64 }).primaryKey(),
  expenseReportId: varchar({ length: 64 }).notNull(),
  employeeId: varchar({ length: 64 }).notNull(),
  totalAmount: int().default(0),
  currency: varchar({ length: 10 }).default('KES'),
  paymentMethod: varchar({ length: 50 }).notNull(),
  paymentDate: timestamp({ mode: 'string' }),
  referenceNumber: varchar({ length: 100 }),
  status: mysqlEnum(['pending', 'approved', 'processed', 'failed']).default('pending'),
  notes: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_report_id").on(table.expenseReportId),
  index("idx_employee_id").on(table.employeeId),
  index("idx_status").on(table.status),
]);

export type Reimbursement = typeof reimbursements.$inferSelect;
export type InsertReimbursement = typeof reimbursements.$inferInsert;

// ============================================================================
// PHASE 20: MULTI-CURRENCY SUPPORT
// ============================================================================

export const currencies = mysqlTable("currencies", {
  id: varchar({ length: 64 }).primaryKey(),
  code: varchar({ length: 3 }).notNull().unique(),
  name: varchar({ length: 100 }).notNull(),
  symbol: varchar({ length: 10 }),
  decimalPlaces: int().default(2),
  isActive: tinyint().default(1),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_code").on(table.code),
  index("idx_active").on(table.isActive),
]);

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = typeof currencies.$inferInsert;

export const exchangeRates = mysqlTable("exchangeRates", {
  id: varchar({ length: 64 }).primaryKey(),
  fromCurrency: varchar({ length: 3 }).notNull(),
  toCurrency: varchar({ length: 3 }).notNull(),
  rate: int().default(0),
  rateDate: timestamp({ mode: 'string' }).notNull(),
  source: varchar({ length: 100 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_currency_pair").on(table.fromCurrency, table.toCurrency),
  index("idx_rate_date").on(table.rateDate),
]);

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

export const taxRates = mysqlTable("taxRates", {
  id: varchar({ length: 64 }).primaryKey(),
  country: varchar({ length: 100 }).notNull(),
  taxType: mysqlEnum(['vat', 'gst', 'sales_tax', 'income_tax']).default('vat'),
  rate: int().default(0),
  effectiveDate: timestamp({ mode: 'string' }).notNull(),
  expiryDate: timestamp({ mode: 'string' }),
  description: text(),
  isActive: tinyint().default(1),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_country").on(table.country),
  index("idx_tax_type").on(table.taxType),
  index("idx_effective_date").on(table.effectiveDate),
]);

export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = typeof taxRates.$inferInsert;

// ============================================================================
// PHASE 20: FORECASTING & PREDICTIVE ANALYTICS
// ============================================================================

export const forecastModels = mysqlTable("forecastModels", {
  id: varchar({ length: 64 }).primaryKey(),
  modelName: varchar({ length: 255 }).notNull(),
  modelType: mysqlEnum(['revenue', 'expense', 'headcount', 'client_churn']).default('revenue'),
  algorithm: varchar({ length: 100 }),
  accuracy: int().default(0),
  trainingDataPoints: int().default(0),
  lastTrainedAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_model_type").on(table.modelType),
  index("idx_last_trained").on(table.lastTrainedAt),
]);

export type ForecastModel = typeof forecastModels.$inferSelect;
export type InsertForecastModel = typeof forecastModels.$inferInsert;

export const forecastResults = mysqlTable("forecastResults", {
  id: varchar({ length: 64 }).primaryKey(),
  modelId: varchar({ length: 64 }).notNull(),
  forecastPeriod: varchar({ length: 50 }).notNull(),
  forecastDate: timestamp({ mode: 'string' }).notNull(),
  predictedValue: int().default(0),
  confidenceInterval: int().default(0),
  confidenceLower: int().default(0),
  confidenceUpper: int().default(0),
  actualValue: int(),
  variance: int(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_model_id").on(table.modelId),
  index("idx_forecast_period").on(table.forecastPeriod),
  index("idx_forecast_date").on(table.forecastDate),
]);

export type ForecastResult = typeof forecastResults.$inferSelect;
export type InsertForecastResult = typeof forecastResults.$inferInsert;

// ============================================================================
// PHASE 20: INTEGRATION PLATFORM & API
// ============================================================================

export const apiKeys = mysqlTable("apiKeys", {
  id: varchar({ length: 64 }).primaryKey(),
  userId: varchar({ length: 64 }).notNull(),
  keyName: varchar({ length: 255 }).notNull(),
  keyValue: varchar({ length: 255 }).notNull(),
  lastUsedAt: timestamp({ mode: 'string' }),
  expiresAt: timestamp({ mode: 'string' }),
  isActive: tinyint().default(1),
  rateLimit: int().default(1000),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_key_value").on(table.keyValue),
  index("idx_active").on(table.isActive),
]);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

export const webhooks = mysqlTable("webhooks", {
  id: varchar({ length: 64 }).primaryKey(),
  userId: varchar({ length: 64 }).notNull(),
  webhookUrl: varchar({ length: 500 }).notNull(),
  eventType: varchar({ length: 100 }).notNull(),
  secret: varchar({ length: 255 }),
  isActive: tinyint().default(1),
  retryCount: int().default(0),
  lastTriggeredAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_event_type").on(table.eventType),
  index("idx_active").on(table.isActive),
]);

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

export const integrationLogs = mysqlTable("integrationLogs", {
  id: varchar({ length: 64 }).primaryKey(),
  webhookId: varchar({ length: 64 }),
  eventType: varchar({ length: 100 }).notNull(),
  payload: text(),
  responseStatus: int(),
  errorMessage: text(),
  attemptNumber: int().default(1),
  success: tinyint().default(0),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_webhook_id").on(table.webhookId),
  index("idx_event_type").on(table.eventType),
  index("idx_success").on(table.success),
]);

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = typeof integrationLogs.$inferInsert;

// ============================================================================

// EMAIL QUEUE & DELIVERY TRACKING
// ============================================================================

export const emailQueue = mysqlTable("emailQueue", {
  id: varchar({ length: 64 }).primaryKey(),
  recipientEmail: varchar({ length: 320 }).notNull(),
  recipientName: varchar({ length: 255 }),
  subject: varchar({ length: 500 }).notNull(),
  htmlContent: text().notNull(),
  textContent: text(),
  eventType: varchar({ length: 100 }).notNull(),
  entityType: varchar({ length: 100 }),
  entityId: varchar({ length: 64 }),
  userId: varchar({ length: 64 }),
  status: mysqlEnum(['pending', 'sent', 'failed', 'retrying']).default('pending').notNull(),
  attempts: int().default(0).notNull(),
  maxAttempts: int().default(3).notNull(),
  lastAttemptAt: timestamp({ mode: 'string' }),
  nextRetryAt: timestamp({ mode: 'string' }),
  errorMessage: text(),
  metadata: text(),
  sentAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_status").on(table.status),
  index("idx_recipient").on(table.recipientEmail),
  index("idx_next_retry").on(table.nextRetryAt),
  index("idx_event_type").on(table.eventType),
  index("idx_created_at").on(table.createdAt),
]);

export type EmailQueueRecord = typeof emailQueue.$inferSelect;
export type InsertEmailQueue = typeof emailQueue.$inferInsert;

export const emailLog = mysqlTable("emailLog", {
  id: varchar({ length: 64 }).primaryKey(),
  queueId: varchar({ length: 64 }),
  recipientEmail: varchar({ length: 320 }).notNull(),
  subject: varchar({ length: 500 }).notNull(),
  eventType: varchar({ length: 100 }).notNull(),
  status: mysqlEnum(['sent', 'failed']).notNull(),
  messageId: varchar({ length: 255 }),
  errorMessage: text(),
  sentAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_status").on(table.status),
  index("idx_recipient").on(table.recipientEmail),
  index("idx_sent_at").on(table.sentAt),
  index("idx_event_type").on(table.eventType),
]);

export type EmailLogRecord = typeof emailLog.$inferSelect;
export type InsertEmailLog = typeof emailLog.$inferInsert;

export const invoiceReminders = mysqlTable("invoiceReminders", {
  id: varchar({ length: 64 }).primaryKey(),
  invoiceId: varchar({ length: 64 }).notNull(),
  reminderType: mysqlEnum(['overdue_1day', 'overdue_3days', 'overdue_7days', 'overdue_14days', 'overdue_30days']).notNull(),
  clientEmail: varchar({ length: 320 }).notNull(),
  sentAt: timestamp({ mode: 'string' }).defaultNow(),
  sentBy: varchar({ length: 64 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_invoice_id").on(table.invoiceId),
  index("idx_reminder_type").on(table.reminderType),
  index("idx_sent_at").on(table.sentAt),
]);

export type InvoiceReminderRecord = typeof invoiceReminders.$inferSelect;
export type InsertInvoiceReminder = typeof invoiceReminders.$inferInsert;
// ============================================================================
// PHASE 20: PRICING & BILLING SYSTEM
// ============================================================================

export const pricingPlans = mysqlTable("pricingPlans", {
  id: varchar({ length: 64 }).primaryKey(),
  planName: varchar({ length: 255 }).notNull(),
  planSlug: varchar({ length: 100 }).notNull().unique(),
  description: longtext(),
  tier: mysqlEnum(['free', 'starter', 'professional', 'enterprise', 'custom']).notNull(),
  monthlyPrice: decimal({ precision: 10, scale: 2 }).default('0'),
  annualPrice: decimal({ precision: 10, scale: 2 }).default('0'),
  monthlyAnnualDiscount: decimal({ precision: 5, scale: 2 }).default('0'),
  maxUsers: int().default(-1),
  maxProjects: int().default(-1),
  maxStorageGB: int().default(-1),
  features: json(),
  supportLevel: mysqlEnum(['email', 'priority', '24/7_phone', 'dedicated_manager']).default('email'),
  isActive: tinyint().default(1).notNull(),
  displayOrder: int().default(0),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_tier").on(table.tier),
  index("idx_slug").on(table.planSlug),
  index("idx_active").on(table.isActive),
]);

export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertPricingPlan = typeof pricingPlans.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: varchar({ length: 64 }).primaryKey(),
  clientId: varchar({ length: 64 }),
  organizationId: varchar({ length: 64 }),
  planId: varchar({ length: 64 }).notNull(),
  status: mysqlEnum(['trial', 'active', 'suspended', 'cancelled', 'expired']).default('trial').notNull(),
  billingCycle: mysqlEnum(['monthly', 'annual']).default('monthly').notNull(),
  startDate: timestamp({ mode: 'string' }).notNull(),
  renewalDate: timestamp({ mode: 'string' }).notNull(),
  expiryDate: timestamp({ mode: 'string' }),
  gracePeriodEnd: timestamp({ mode: 'string' }),
  isLocked: tinyint().default(0),
  autoRenew: tinyint().default(1),
  currentPrice: decimal({ precision: 10, scale: 2 }).default('0'),
  usersCount: int().default(0),
  projectsCount: int().default(0),
  storageUsedGB: int().default(0),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_client_id").on(table.clientId),
  index("idx_org_id").on(table.organizationId),
  index("idx_status").on(table.status),
  index("idx_renewal_date").on(table.renewalDate),
  index("idx_expiry_date").on(table.expiryDate),
]);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const billingInvoices = mysqlTable("billingInvoices", {
  id: varchar({ length: 64 }).primaryKey(),
  subscriptionId: varchar({ length: 64 }).notNull(),
  invoiceNumber: varchar({ length: 50 }).notNull().unique(),
  amount: decimal({ precision: 10, scale: 2 }).notNull(),
  tax: decimal({ precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).default('USD'),
  status: mysqlEnum(['pending', 'sent', 'viewed', 'paid', 'failed', 'cancelled', 'refunded']).default('pending').notNull(),
  billingPeriodStart: timestamp({ mode: 'string' }).notNull(),
  billingPeriodEnd: timestamp({ mode: 'string' }).notNull(),
  dueDate: timestamp({ mode: 'string' }).notNull(),
  sentAt: timestamp({ mode: 'string' }),
  paidAt: timestamp({ mode: 'string' }),
  paymentMethod: varchar({ length: 50 }),
  paymentReference: varchar({ length: 255 }),
  notes: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_subscription_id").on(table.subscriptionId),
  index("idx_status").on(table.status),
  index("idx_due_date").on(table.dueDate),
  index("idx_paid_at").on(table.paidAt),
]);

export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type InsertBillingInvoice = typeof billingInvoices.$inferInsert;

export const payments = mysqlTable("payments", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  invoiceId: varchar({ length: 64 }).notNull(),
  clientId: varchar({ length: 64 }).notNull(),
  accountId: varchar({ length: 64 }),
  amount: int().notNull(),
  paymentDate: timestamp({ mode: 'string' }).notNull(),
  paymentMethod: mysqlEnum(['cash', 'bank_transfer', 'cheque', 'mpesa', 'card', 'other']).notNull(),
  referenceNumber: varchar({ length: 100 }),
  chartOfAccountType: mysqlEnum(['debit', 'credit']).default('debit'),
  notes: text(),
  status: mysqlEnum(['pending', 'completed', 'failed', 'cancelled']).default('pending').notNull(),
  approvedBy: varchar({ length: 64 }),
  approvedAt: timestamp({ mode: 'string' }),
  createdBy: varchar({ length: 64 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_invoice_id").on(table.invoiceId),
  index("idx_client_id").on(table.clientId),
  index("idx_status").on(table.status),
  index("idx_payment_date").on(table.paymentDate),
]);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export const paymentMethods = mysqlTable("paymentMethods", {
  id: varchar({ length: 64 }).primaryKey(),
  clientId: varchar({ length: 64 }).notNull(),
  type: mysqlEnum(['credit_card', 'debit_card', 'bank_account', 'paypal', 'mpesa']).notNull(),
  provider: varchar({ length: 50 }),
  lastFourDigits: varchar({ length: 4 }),
  expiryMonth: int(),
  expiryYear: int(),
  holderName: varchar({ length: 255 }),
  bankName: varchar({ length: 255 }),
  accountNumber: varchar({ length: 50 }),
  isDefault: tinyint().default(0),
  isActive: tinyint().default(1),
  providerMethodId: varchar({ length: 255 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_client_id").on(table.clientId),
  index("idx_is_default").on(table.isDefault),
  index("idx_type").on(table.type),
]);

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

export const billingUsageMetrics = mysqlTable("billingUsageMetrics", {
  id: varchar({ length: 64 }).primaryKey(),
  subscriptionId: varchar({ length: 64 }).notNull(),
  metricDate: datetime({ mode: 'string' }).notNull(),
  usersCount: int().default(0),
  projectsCount: int().default(0),
  tasksCount: int().default(0),
  documentsCount: int().default(0),
  storageUsedMB: int().default(0),
  apiCallsCount: int().default(0),
  emailsSent: int().default(0),
  recordedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_subscription_id").on(table.subscriptionId),
  index("idx_metric_date").on(table.metricDate),
]);

export type BillingUsageMetric = typeof billingUsageMetrics.$inferSelect;
export type InsertBillingUsageMetric = typeof billingUsageMetrics.$inferInsert;

export const billingNotifications = mysqlTable("billingNotifications", {
  id: varchar({ length: 64 }).primaryKey(),
  subscriptionId: varchar({ length: 64 }).notNull(),
  notificationType: mysqlEnum([
    'payment_due_7days',
    'payment_due_today',
    'payment_overdue_1day',
    'payment_overdue_3days',
    'subscription_expiring_7days',
    'subscription_expiring_today',
    'subscription_expired',
    'system_locked',
    'payment_failed',
    'usage_limit_warning',
    'renewal_successful',
  ]).notNull(),
  message: text(),
  sentTo: varchar({ length: 320 }),
  channel: mysqlEnum(['email', 'in_app', 'sms']).default('email'),
  isSent: tinyint().default(0),
  sentAt: timestamp({ mode: 'string' }),
  isRead: tinyint().default(0),
  readAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_subscription_id").on(table.subscriptionId),
  index("idx_notification_type").on(table.notificationType),
  index("idx_is_sent").on(table.isSent),
]);

export type BillingNotification = typeof billingNotifications.$inferSelect;
export type InsertBillingNotification = typeof billingNotifications.$inferInsert;
// ============================================================================
// PHASE 20+ EXTENDED: NOTIFICATIONS, MESSAGING, TICKETS, USER MANAGEMENT
// ============================================================================

import { mysqlTable, index, varchar, mysqlEnum, int, text, longtext, timestamp, tinyint, json, datetime } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

// ============================================================================
// USER MANAGEMENT: Soft Delete & Audit
// ============================================================================

export const userDeletions = mysqlTable("userDeletions", {
  id: varchar({ length: 64 }).primaryKey(),
  userId: varchar({ length: 64 }).notNull(),
  userName: varchar({ length: 255 }).notNull(),
  userEmail: varchar({ length: 320 }).notNull(),
  deletedReason: text(),
  deletedBy: varchar({ length: 64 }).notNull(),
  deletedAt: timestamp({ mode: 'string' }).defaultNow(),
  restoredAt: timestamp({ mode: 'string' }),
  restoredBy: varchar({ length: 64 }),
  archived: tinyint().default(1).notNull(), // 1 = soft deleted, 0 = active
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_deleted_by").on(table.deletedBy),
  index("idx_deleted_at").on(table.deletedAt),
  index("idx_archived").on(table.archived),
]);

export type UserDeletion = typeof userDeletions.$inferSelect;
export type InsertUserDeletion = typeof userDeletions.$inferInsert;

// ============================================================================
// NOTIFICATIONS SYSTEM: Broadcast & In-App
// ============================================================================

export const notificationTemplates = mysqlTable("notificationTemplates", {
  id: varchar({ length: 64 }).primaryKey(),
  templateKey: varchar({ length: 100 }).notNull().unique(),
  templateName: varchar({ length: 255 }).notNull(),
  category: mysqlEnum(['billing', 'system', 'user', 'document', 'communication', 'security']).notNull(),
  subject: varchar({ length: 500 }),
  bodyTemplate: longtext().notNull(),
  channels: json(), // ['email', 'in_app', 'sms']
  variables: json(), // List of template variables
  isActive: tinyint().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_template_key").on(table.templateKey),
  index("idx_category").on(table.category),
]);

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;

// ============================================
// NOTIFICATION BROADCASTS (Legacy - kept for migration)
// NOTE: Primary notifications table is now defined in Phase 1 section above
// ============================================

export const notificationBroadcasts = mysqlTable("notificationBroadcasts", {
  id: varchar({ length: 64 }).primaryKey(),
  title: varchar({ length: 500 }).notNull(),
  content: longtext().notNull(),
  target: mysqlEnum(['all_users', 'specific_role', 'specific_department', 'specific_plan', 'custom']).notNull(),
  targetValue: varchar({ length: 255 }), // role name, department id, plan id, or custom filter
  priority: mysqlEnum(['low', 'normal', 'high', 'critical']).default('normal').notNull(),
  channels: json(), // ['email', 'in_app', 'sms']
  status: mysqlEnum(['draft', 'scheduled', 'sending', 'sent', 'cancelled']).default('draft').notNull(),
  scheduledFor: timestamp({ mode: 'string' }),
  startedAt: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  recipientCount: int().default(0),
  sentCount: int().default(0),
  failedCount: int().default(0),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_status").on(table.status),
  index("idx_target").on(table.target),
  index("idx_scheduled_for").on(table.scheduledFor),
]);

export type NotificationBroadcast = typeof notificationBroadcasts.$inferSelect;
export type InsertNotificationBroadcast = typeof notificationBroadcasts.$inferInsert;

// ============================================================================
// MESSAGING & INTRACHAT: Internal Communication
// ============================================================================

export const messages = mysqlTable("messages", {
  id: varchar({ length: 64 }).primaryKey(),
  conversationId: varchar({ length: 64 }).notNull(),
  senderId: varchar({ length: 64 }).notNull(),
  messageType: mysqlEnum(['text', 'image', 'file', 'system']).default('text').notNull(),
  content: longtext().notNull(),
  fileUrl: varchar({ length: 500 }),
  fileName: varchar({ length: 255 }),
  fileSize: int(),
  mimeType: varchar({ length: 100 }),
  isEdited: tinyint().default(0),
  editedAt: timestamp({ mode: 'string' }),
  isDeleted: tinyint().default(0),
  deletedAt: timestamp({ mode: 'string' }),
  reactions: json(), // { emoji: count }
  encryptionIv: varchar({ length: 255 }), // For message encryption
  encryptionTag: varchar({ length: 255 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_conversation_id").on(table.conversationId),
  index("idx_sender_id").on(table.senderId),
  index("idx_created_at").on(table.createdAt),
]);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const conversations = mysqlTable("conversations", {
  id: varchar({ length: 64 }).primaryKey(),
  type: mysqlEnum(['direct', 'group', 'channel']).default('direct').notNull(),
  name: varchar({ length: 255 }),
  description: text(),
  conversationIcon: varchar({ length: 500 }),
  createdBy: varchar({ length: 64 }).notNull(),
  isArchived: tinyint().default(0),
  archivedAt: timestamp({ mode: 'string' }),
  isEncrypted: tinyint().default(1).notNull(), // 1 = encrypted, 0 = plain
  encryptionKey: varchar({ length: 255 }), // Stored encrypted
  lastMessageAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_type").on(table.type),
  index("idx_created_by").on(table.createdBy),
  index("idx_archived").on(table.isArchived),
]);

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ── Organization / Multi-Tenancy Tables ─────────────────────────────────────

export const organizations = mysqlTable("organizations", {
  id: varchar({ length: 64 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 100 }).notNull(),
  plan: varchar({ length: 50 }).notNull().default('trial'),
  isActive: tinyint().default(1).notNull(),
  isArchived: tinyint().default(0).notNull(),
  archivedAt: timestamp({ mode: 'string' }),
  archivedBy: varchar({ length: 64 }),
  maxUsers: int().default(10),
  settings: json(),
  logoUrl: longtext(),
  domain: varchar({ length: 255 }),
  contactEmail: varchar({ length: 320 }),
  contactPhone: varchar({ length: 50 }),
  address: text(),
  country: varchar({ length: 100 }),
  industry: varchar({ length: 100 }),
  website: varchar({ length: 255 }),
  taxId: varchar({ length: 100 }),
  billingEmail: varchar({ length: 320 }),
  timezone: varchar({ length: 100 }).default('Africa/Nairobi'),
  currency: varchar({ length: 10 }).default('KES'),
  description: text(),
  employeeCount: int(),
  registrationNumber: varchar({ length: 100 }),
  paymentMethod: varchar({ length: 50 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_org_slug").on(table.slug),
  index("idx_org_active").on(table.isActive),
  index("idx_org_archived").on(table.isArchived),
  index("idx_org_industry").on(table.industry),
]);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export const organizationFeatures = mysqlTable("organizationFeatures", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }).notNull(),
  featureKey: varchar({ length: 100 }).notNull(),
  isEnabled: tinyint().default(1).notNull(),
  config: json(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_orgfeat_org").on(table.organizationId),
  index("idx_orgfeat_key").on(table.featureKey),
]);

export type OrganizationFeature = typeof organizationFeatures.$inferSelect;
export type InsertOrganizationFeature = typeof organizationFeatures.$inferInsert;

// ============================================================================
// ORGANIZATION USERS: Enterprise/Multitenancy User Management
// ============================================================================

export const organizationUsers = mysqlTable("organizationUsers", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 320 }).notNull(),
  role: mysqlEnum(['super_admin', 'admin', 'manager', 'staff', 'viewer', 'ict_manager', 'project_manager', 'hr', 'accountant', 'procurement_manager', 'sales_manager']).default('staff').notNull(),
  position: varchar({ length: 100 }),
  department: varchar({ length: 100 }),
  phone: varchar({ length: 20 }),
  photoUrl: longtext(),
  isActive: tinyint().default(1).notNull(),
  invitationSent: tinyint().default(0).notNull(),
  invitationSentAt: timestamp({ mode: 'string' }),
  invitationAcceptedAt: timestamp({ mode: 'string' }),
  lastSignedIn: timestamp({ mode: 'string' }),
  loginCount: int().default(0),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_orgusers_org").on(table.organizationId),
  index("idx_orgusers_email").on(table.email),
  index("idx_orgusers_role").on(table.role),
  index("idx_orgusers_active").on(table.isActive),
  index("idx_orgusers_created_by").on(table.createdBy),
]);

export type OrganizationUser = typeof organizationUsers.$inferSelect;
export type InsertOrganizationUser = typeof organizationUsers.$inferInsert;

export const tenantMessages = mysqlTable("tenantMessages", {
  id: varchar({ length: 64 }).primaryKey(),
  senderId: varchar({ length: 64 }).notNull(),
  subject: varchar({ length: 500 }).notNull(),
  content: longtext().notNull(),
  priority: varchar({ length: 20 }).default('normal'),
  targetType: varchar({ length: 20 }).default('all'),
  targetOrgId: varchar({ length: 64 }),
  targetUserId: varchar({ length: 64 }),
  isRead: tinyint().default(0),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_tmsg_sender").on(table.senderId),
]);

export const pricingTierFeatures = mysqlTable("pricingTierFeatures", {
  id: varchar({ length: 64 }).primaryKey(),
  tier: varchar({ length: 50 }).notNull(),
  featureKey: varchar({ length: 100 }).notNull(),
  isEnabled: tinyint().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_ptf_tier").on(table.tier),
]);

export const conversationMembers = mysqlTable("conversationMembers", {
  id: varchar({ length: 64 }).primaryKey(),
  conversationId: varchar({ length: 64 }).notNull(),
  userId: varchar({ length: 64 }).notNull(),
  role: mysqlEnum(['member', 'moderator', 'admin']).default('member').notNull(),
  joinedAt: timestamp({ mode: 'string' }).defaultNow(),
  leftAt: timestamp({ mode: 'string' }),
  lastReadAt: timestamp({ mode: 'string' }),
  unreadCount: int().default(0),
  isMuted: tinyint().default(0),
  isActive: tinyint().default(1).notNull(),
}, (table) => [
  index("idx_conversation_id").on(table.conversationId),
  index("idx_user_id").on(table.userId),
]);

export type ConversationMember = typeof conversationMembers.$inferSelect;
export type InsertConversationMember = typeof conversationMembers.$inferInsert;

export const messageReadReceipts = mysqlTable("messageReadReceipts", {
  id: varchar({ length: 64 }).primaryKey(),
  messageId: varchar({ length: 64 }).notNull(),
  userId: varchar({ length: 64 }).notNull(),
  readAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_message_id").on(table.messageId),
  index("idx_user_id").on(table.userId),
]);

export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect;
export type InsertMessageReadReceipt = typeof messageReadReceipts.$inferInsert;

// ============================================================================
// TICKETS & SUPPORT: Issue Tracking
// ============================================================================

export const tickets = mysqlTable("tickets", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  ticketNumber: varchar({ length: 50 }).notNull().unique(),
  title: varchar({ length: 500 }).notNull(),
  description: longtext().notNull(),
  category: mysqlEnum(['support', 'billing', 'feature_request', 'bug', 'security', 'general']).notNull(),
  priority: mysqlEnum(['low', 'normal', 'high', 'urgent']).default('normal').notNull(),
  status: mysqlEnum(['open', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened']).default('open').notNull(),
  createdBy: varchar({ length: 64 }).notNull(),
  assignedTo: varchar({ length: 64 }),
  department: varchar({ length: 100 }),
  resolution: text(),
  solutionUrl: varchar({ length: 500 }),
  attachments: json(), // Array of file URLs
  relatedTickets: json(), // Array of ticket IDs
  firstResponseAt: timestamp({ mode: 'string' }),
  resolvedAt: timestamp({ mode: 'string' }),
  closedAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ticket_number").on(table.ticketNumber),
  index("idx_status").on(table.status),
  index("idx_created_by").on(table.createdBy),
  index("idx_assigned_to").on(table.assignedTo),
  index("idx_priority").on(table.priority),
]);

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

export const ticketResponses = mysqlTable("ticketResponses", {
  id: varchar({ length: 64 }).primaryKey(),
  ticketId: varchar({ length: 64 }).notNull(),
  responderId: varchar({ length: 64 }).notNull(),
  responseType: mysqlEnum(['comment', 'resolution', 'escalation']).default('comment').notNull(),
  content: longtext().notNull(),
  attachments: json(), // Array of file URLs
  isInternal: tinyint().default(0), // 1 = only visible to staff
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ticket_id").on(table.ticketId),
  index("idx_responder_id").on(table.responderId),
]);

export type TicketResponse = typeof ticketResponses.$inferSelect;
export type InsertTicketResponse = typeof ticketResponses.$inferInsert;

// ============================================================================
// RECURRING INVOICES: Automation
// ============================================================================

export const recurringInvoiceTemplates = mysqlTable("recurringInvoiceTemplates", {
  id: varchar({ length: 64 }).primaryKey(),
  clientId: varchar({ length: 64 }).notNull(),
  invoiceName: varchar({ length: 255 }).notNull(),
  description: text(),
  frequency: mysqlEnum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual']).notNull(),
  startDate: datetime({ mode: 'string' }).notNull(),
  endDate: datetime({ mode: 'string' }),
  nextInvoiceDate: datetime({ mode: 'string' }).notNull(),
  items: json(), // Array of line items with description, quantity, rate
  taxRate: decimal({ precision: 5, scale: 2 }).default('0'),
  discount: decimal({ precision: 5, scale: 2 }).default('0'),
  discountType: mysqlEnum(['percentage', 'fixed']).default('percentage'),
  notes: text(),
  paymentTerms: int(), // days to payment due
  autoSend: tinyint().default(1).notNull(),
  autoCreateReceipt: tinyint().default(1).notNull(),
  isActive: tinyint().default(1).notNull(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_client_id").on(table.clientId),
  index("idx_next_invoice_date").on(table.nextInvoiceDate),
  index("idx_is_active").on(table.isActive),
]);

export type RecurringInvoiceTemplate = typeof recurringInvoiceTemplates.$inferSelect;
export type InsertRecurringInvoiceTemplate = typeof recurringInvoiceTemplates.$inferInsert;

export const automatedReceipts = mysqlTable("automatedReceipts", {
  id: varchar({ length: 64 }).primaryKey(),
  invoiceId: varchar({ length: 64 }).notNull(),
  receiptNumber: varchar({ length: 50 }).notNull().unique(),
  amountReceived: decimal({ precision: 10, scale: 2 }).notNull(),
  amountOutstanding: decimal({ precision: 10, scale: 2 }).default('0'),
  paymentStatus: mysqlEnum(['partial', 'full']).notNull(),
  paymentMethod: varchar({ length: 50 }),
  paymentReference: varchar({ length: 255 }),
  autoGenerated: tinyint().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_invoice_id").on(table.invoiceId),
  index("idx_receipt_number").on(table.receiptNumber),
]);

export type AutomatedReceipt = typeof automatedReceipts.$inferSelect;
export type InsertAutomatedReceipt = typeof automatedReceipts.$inferInsert;

// ============================================================================
// EMAIL CAMPAIGN & COMMUNICATION TRACKING
// ============================================================================

export const emailCampaigns = mysqlTable("emailCampaigns", {
  id: varchar({ length: 64 }).primaryKey(),
  campaignName: varchar({ length: 255 }).notNull(),
  subject: varchar({ length: 500 }).notNull(),
  bodyHtml: longtext().notNull(),
  bodyText: longtext(),
  fromEmail: varchar({ length: 320 }).notNull(),
  fromName: varchar({ length: 255 }),
  recipientCount: int().default(0),
  sentCount: int().default(0),
  openCount: int().default(0),
  clickCount: int().default(0),
  failureCount: int().default(0),
  status: mysqlEnum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'paused']).default('draft').notNull(),
  scheduledFor: timestamp({ mode: 'string' }),
  startedAt: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_status").on(table.status),
  index("idx_created_by").on(table.createdBy),
]);

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;

export const emailLogs = mysqlTable("emailLogs", {
  id: varchar({ length: 64 }).primaryKey(),
  campaignId: varchar({ length: 64 }),
  recipientEmail: varchar({ length: 320 }).notNull(),
  userId: varchar({ length: 64 }),
  subject: varchar({ length: 500 }).notNull(),
  status: mysqlEnum(['pending', 'sent', 'bounced', 'failed', 'opened', 'clicked']).default('pending').notNull(),
  provider: varchar({ length: 50 }), // smtp, sendgrid, mailgun, ses, etc.
  providerMessageId: varchar({ length: 255 }),
  sentAt: timestamp({ mode: 'string' }),
  failureReason: text(),
  openedAt: timestamp({ mode: 'string' }),
  clickedAt: timestamp({ mode: 'string' }),
  metadata: json(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_campaign_id").on(table.campaignId),
  index("idx_recipient_email").on(table.recipientEmail),
  index("idx_status").on(table.status),
]);

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

// ─── Work Orders ──────────────────────────────────────────────
export const workOrders = mysqlTable("workOrders", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  workOrderNumber: varchar({ length: 50 }).notNull(),
  issueDate: varchar({ length: 30 }).notNull(),
  description: text().notNull(),
  assignedTo: varchar({ length: 200 }).notNull(),
  priority: mysqlEnum(["low", "medium", "high", "critical"]).default("medium").notNull(),
  startDate: varchar({ length: 30 }).notNull(),
  targetEndDate: varchar({ length: 30 }).notNull(),
  laborCost: int().default(0).notNull(),
  serviceCost: int().default(0).notNull(),
  total: int().default(0).notNull(),
  notes: text(),
  status: mysqlEnum(["draft", "open", "in-progress", "completed", "cancelled"]).default("draft").notNull(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

export const workOrderMaterials = mysqlTable("workOrderMaterials", {
  id: varchar({ length: 64 }).primaryKey(),
  workOrderId: varchar({ length: 64 }).notNull(),
  description: text().notNull(),
  quantity: int().default(1).notNull(),
  unitCost: int().default(0).notNull(),
  total: int().default(0).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_wom_workorder").on(table.workOrderId),
]);

export type WorkOrderMaterial = typeof workOrderMaterials.$inferSelect;
export type InsertWorkOrderMaterial = typeof workOrderMaterials.$inferInsert;

// ─── Service Invoices ─────────────────────────────────────────
export const serviceInvoices = mysqlTable("serviceInvoices", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  serviceInvoiceNumber: varchar({ length: 50 }).notNull(),
  issueDate: varchar({ length: 30 }).notNull(),
  dueDate: varchar({ length: 30 }).notNull(),
  clientId: varchar({ length: 64 }).notNull(),
  clientName: varchar({ length: 200 }).notNull(),
  serviceDescription: text().notNull(),
  total: int().default(0).notNull(),
  taxAmount: int().default(0).notNull(),
  notes: text(),
  status: mysqlEnum(["draft", "sent", "accepted", "paid", "cancelled"]).default("draft").notNull(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_si_client").on(table.clientId),
  index("idx_si_status").on(table.status),
]);

export type ServiceInvoice = typeof serviceInvoices.$inferSelect;
export type InsertServiceInvoice = typeof serviceInvoices.$inferInsert;

export const serviceInvoiceItems = mysqlTable("serviceInvoiceItems", {
  id: varchar({ length: 64 }).primaryKey(),
  serviceInvoiceId: varchar({ length: 64 }).notNull(),
  description: text().notNull(),
  quantity: int().default(1).notNull(),
  unitPrice: int().default(0).notNull(),
  total: int().default(0).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_sii_invoice").on(table.serviceInvoiceId),
]);

export type ServiceInvoiceItem = typeof serviceInvoiceItems.$inferSelect;
export type InsertServiceInvoiceItem = typeof serviceInvoiceItems.$inferInsert;

// ─── Contacts ─────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  clientId: varchar({ length: 64 }),
  salutation: varchar({ length: 20 }),
  firstName: varchar({ length: 100 }).notNull(),
  lastName: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 320 }),
  phone: varchar({ length: 50 }),
  mobile: varchar({ length: 50 }),
  jobTitle: varchar({ length: 200 }),
  department: varchar({ length: 200 }),
  isPrimary: tinyint().default(0),
  notes: text(),
  address: text(),
  city: varchar({ length: 100 }),
  country: varchar({ length: 100 }),
  postalCode: varchar({ length: 20 }),
  linkedIn: varchar({ length: 500 }),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_contacts_client").on(table.clientId),
  index("idx_contacts_email").on(table.email),
]);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Quotations (Procurement) ─────────────────────────────────
export const quotations = mysqlTable("quotations", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  rfqNo: varchar({ length: 50 }).notNull(),
  supplier: varchar({ length: 200 }).notNull(),
  description: text(),
  amount: int().default(0).notNull(),
  dueDate: varchar({ length: 30 }),
  status: mysqlEnum(["draft", "submitted", "under_review", "approved", "rejected"]).default("draft").notNull(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_quot_status").on(table.status),
  index("idx_quot_rfq").on(table.rfqNo),
]);

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

// ─── Goods Received Notes (GRN) ──────────────────────────────
export const grnRecords = mysqlTable("grnRecords", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  grnNo: varchar({ length: 50 }).notNull(),
  supplier: varchar({ length: 200 }).notNull(),
  invNo: varchar({ length: 50 }),
  receivedDate: varchar({ length: 30 }).notNull(),
  items: int().default(0).notNull(),
  value: int().default(0).notNull(),
  status: mysqlEnum(["accepted", "partial", "rejected", "pending"]).default("pending").notNull(),
  notes: text(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_grn_status").on(table.status),
  index("idx_grn_supplier").on(table.supplier),
]);

export type GrnRecord = typeof grnRecords.$inferSelect;
export type InsertGrnRecord = typeof grnRecords.$inferInsert;

// ─── Delivery Notes ───────────────────────────────────────────
export const deliveryNotes = mysqlTable("deliveryNotes", {
  id: varchar({ length: 64 }).primaryKey(),
  dnNo: varchar({ length: 50 }).notNull(),
  supplier: varchar({ length: 200 }).notNull(),
  orderId: varchar({ length: 64 }),
  deliveryDate: varchar({ length: 30 }).notNull(),
  items: int().default(0).notNull(),
  status: mysqlEnum(["pending", "partial", "delivered", "cancelled"]).default("pending").notNull(),
  notes: text(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_dn_status").on(table.status),
  index("idx_dn_order").on(table.orderId),
]);

export type DeliveryNote = typeof deliveryNotes.$inferSelect;
export type InsertDeliveryNote = typeof deliveryNotes.$inferInsert;

// ==================== ASSETS ====================
export const assets = mysqlTable("assets", {
  id: varchar({ length: 64 }).primaryKey(),
  name: varchar({ length: 200 }).notNull(),
  category: varchar({ length: 100 }).notNull(),
  location: varchar({ length: 200 }).notNull(),
  value: int().default(0).notNull(),
  assignedTo: varchar({ length: 200 }),
  serialNumber: varchar({ length: 100 }),
  purchaseDate: varchar({ length: 30 }),
  status: mysqlEnum(["active", "inactive", "maintenance", "disposed"]).default("active").notNull(),
  notes: text(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_assets_status").on(table.status),
  index("idx_assets_category").on(table.category),
]);

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ==================== CONTRACTS ====================
export const contracts = mysqlTable("contracts", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  contractNumber: varchar({ length: 50 }),
  name: varchar({ length: 200 }).notNull(),
  vendor: varchar({ length: 200 }).notNull(),
  startDate: varchar({ length: 30 }).notNull(),
  endDate: varchar({ length: 30 }).notNull(),
  value: int().default(0).notNull(),
  status: mysqlEnum(["draft", "active", "expired", "terminated"]).default("draft").notNull(),
  contractType: varchar({ length: 100 }),
  description: text(),
  notes: text(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_contracts_status").on(table.status),
  index("idx_contracts_vendor").on(table.vendor),
]);

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ==================== WARRANTIES ====================
export const warranties = mysqlTable("warranties", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  product: varchar({ length: 200 }).notNull(),
  vendor: varchar({ length: 200 }).notNull(),
  expiryDate: varchar({ length: 30 }).notNull(),
  coverage: varchar({ length: 500 }).notNull(),
  status: mysqlEnum(["active", "expiring_soon", "expired"]).default("active").notNull(),
  serialNumber: varchar({ length: 100 }),
  claimTerms: text(),
  notes: text(),
  createdBy: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_warranties_status").on(table.status),
  index("idx_warranties_vendor").on(table.vendor),
]);

export type Warranty = typeof warranties.$inferSelect;
export type InsertWarranty = typeof warranties.$inferInsert;

// ============ Notes ============
export const notes = mysqlTable("notes", {
  id: varchar({ length: 64 }).primaryKey(),
  title: varchar({ length: 300 }).notNull(),
  content: text(),
  category: varchar({ length: 100 }).default("General").notNull(),
  pinned: tinyint().default(0).notNull(),
  favorite: tinyint().default(0).notNull(),
  createdBy: varchar({ length: 64 }).notNull(),
  organizationId: varchar({ length: 64 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_notes_created_by").on(table.createdBy),
  index("idx_notes_category").on(table.category),
]);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ============ Custom Reports ============
export const customReports = mysqlTable("custom_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  dataSources: text("dataSources"),
  layout: text("layout"),
  format: mysqlEnum("format", ["PDF", "Excel", "CSV", "HTML"]).notNull().default("PDF"),
  isTemplate: tinyint("isTemplate").notNull().default(0),
  status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
  owner: varchar("owner", { length: 200 }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_custom_reports_category").on(table.category),
  index("idx_custom_reports_status").on(table.status),
]);

export type CustomReport = typeof customReports.$inferSelect;
export type InsertCustomReport = typeof customReports.$inferInsert;

// ============ Smart Workflows (Advanced Automation) ============
export const smartWorkflows = mysqlTable("smart_workflows", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  triggerType: varchar("triggerType", { length: 50 }).notNull().default("event"),
  triggerConfig: text("triggerConfig"),
  actions: text("actions"),
  conditions: text("conditions"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  executionCount: int("executionCount").notNull().default(0),
  lastExecuted: timestamp("lastExecuted", { mode: "string" }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_sw_status").on(table.status),
]);
export type SmartWorkflow = typeof smartWorkflows.$inferSelect;
export type InsertSmartWorkflow = typeof smartWorkflows.$inferInsert;

// ============ Export Jobs (Advanced Export) ============
export const exportJobs = mysqlTable("export_jobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }),
  dataType: varchar("dataType", { length: 100 }).notNull(),
  format: varchar("format", { length: 50 }).notNull().default("csv"),
  filters: text("filters"),
  status: varchar("status", { length: 50 }).notNull().default("processing"),
  fileUrl: varchar("fileUrl", { length: 500 }),
  fileSize: bigint("fileSize", { mode: "number" }),
  rowsExported: int("rowsExported").default(0),
  schedule: varchar("schedule", { length: 50 }),
  recipients: text("recipients"),
  expiresAt: timestamp("expiresAt", { mode: "string" }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ej_status").on(table.status),
]);
export type ExportJob = typeof exportJobs.$inferSelect;
export type InsertExportJob = typeof exportJobs.$inferInsert;

// ============ Security Events (Advanced Security) ============
export const securityEvents = mysqlTable("security_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  action: varchar("action", { length: 200 }),
  severity: varchar("severity", { length: 50 }).notNull().default("MEDIUM"),
  resourceId: varchar("resourceId", { length: 200 }),
  userId: varchar("userId", { length: 64 }),
  details: text("details"),
  status: varchar("status", { length: 50 }).notNull().default("LOGGED"),
  ipAddress: varchar("ipAddress", { length: 100 }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
}, (table) => [
  index("idx_se_type").on(table.eventType),
  index("idx_se_severity").on(table.severity),
]);
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

// ============ AI Configurations (AI Agents + AIML) ============
export const aiConfigurations = mysqlTable("ai_configurations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  configType: varchar("configType", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  model: varchar("model", { length: 100 }),
  capabilities: text("capabilities"),
  parameters: text("parameters"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  metrics: text("metrics"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ac_type").on(table.configType),
  index("idx_ac_status").on(table.status),
]);
export type AiConfiguration = typeof aiConfigurations.$inferSelect;
export type InsertAiConfiguration = typeof aiConfigurations.$inferInsert;

// ============ API Pricing Configs (API Monetization) ============
export const apiPricingConfigs = mysqlTable("api_pricing_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  apiId: varchar("apiId", { length: 100 }),
  name: varchar("name", { length: 200 }).notNull(),
  pricingModel: varchar("pricingModel", { length: 50 }).notNull().default("FIXED"),
  basePrice: decimal("basePrice", { precision: 12, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  rateLimit: int("rateLimit").default(10000),
  config: text("config"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_apc_status").on(table.status),
]);
export type ApiPricingConfig = typeof apiPricingConfigs.$inferSelect;
export type InsertApiPricingConfig = typeof apiPricingConfigs.$inferInsert;

// ============ ETL Jobs (Business Intelligence) ============
export const etlJobs = mysqlTable("etl_jobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  jobName: varchar("jobName", { length: 200 }).notNull(),
  sourceSystem: varchar("sourceSystem", { length: 200 }),
  targetTable: varchar("targetTable", { length: 200 }),
  schedule: varchar("schedule", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  progress: int("progress").default(0),
  recordsProcessed: int("recordsProcessed").default(0),
  config: text("config"),
  lastRun: timestamp("lastRun", { mode: "string" }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_etl_status").on(table.status),
]);
export type EtlJob = typeof etlJobs.$inferSelect;
export type InsertEtlJob = typeof etlJobs.$inferInsert;

// ============ Container Deployments (Cloud Infrastructure) ============
export const containerDeployments = mysqlTable("container_deployments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  orchestrator: varchar("orchestrator", { length: 50 }),
  serviceName: varchar("serviceName", { length: 200 }),
  image: varchar("image", { length: 500 }),
  replicas: int("replicas").default(1),
  port: int("port"),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  config: text("config"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_cd_status").on(table.status),
]);
export type ContainerDeployment = typeof containerDeployments.$inferSelect;
export type InsertContainerDeployment = typeof containerDeployments.$inferInsert;

// ============ Custom Dashboards (Dashboard Builder) ============
export const customDashboards = mysqlTable("custom_dashboards", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  layout: varchar("layout", { length: 50 }).notNull().default("grid"),
  widgets: text("widgets"),
  isPublic: tinyint("isPublic").notNull().default(0),
  sharedWith: text("sharedWith"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_cdash_public").on(table.isPublic),
]);
export type CustomDashboard = typeof customDashboards.$inferSelect;
export type InsertCustomDashboard = typeof customDashboards.$inferInsert;

// ============ Webhook Configs (Developer Tools) ============
export const webhookConfigs = mysqlTable("webhook_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }),
  eventType: varchar("eventType", { length: 200 }).notNull(),
  targetUrl: varchar("targetUrl", { length: 500 }).notNull(),
  secret: varchar("secret", { length: 200 }),
  isActive: tinyint("isActive").notNull().default(1),
  retryCount: int("retryCount").default(0),
  lastTriggered: timestamp("lastTriggered", { mode: "string" }),
  config: text("config"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_wc_active").on(table.isActive),
]);
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

// ============ Email Calendar Sync ============
export const emailCalendarSync = mysqlTable("email_calendar_sync", {
  id: varchar("id", { length: 64 }).primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull(),
  email: varchar("email", { length: 200 }),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  startTime: varchar("startTime", { length: 100 }),
  endTime: varchar("endTime", { length: 100 }),
  attendees: text("attendees"),
  location: varchar("location", { length: 500 }),
  syncStatus: varchar("syncStatus", { length: 50 }).notNull().default("pending"),
  config: text("config"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ecs_provider").on(table.provider),
]);
export type EmailCalendarSyncRecord = typeof emailCalendarSync.$inferSelect;
export type InsertEmailCalendarSyncRecord = typeof emailCalendarSync.$inferInsert;

// ============ Security Incidents (Enterprise Security) ============
export const securityIncidents = mysqlTable("security_incidents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  threatType: varchar("threatType", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull().default("MEDIUM"),
  source: varchar("source", { length: 200 }),
  targetAsset: varchar("targetAsset", { length: 200 }),
  status: varchar("status", { length: 50 }).notNull().default("DETECTED"),
  details: text("details"),
  scanConfig: text("scanConfig"),
  resolvedAt: timestamp("resolvedAt", { mode: "string" }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
}, (table) => [
  index("idx_si_severity").on(table.severity),
  index("idx_si_status").on(table.status),
]);
export type SecurityIncident = typeof securityIncidents.$inferSelect;
export type InsertSecurityIncident = typeof securityIncidents.$inferInsert;

// ============ Global Configs (Global Features) ============
export const globalConfigs = mysqlTable("global_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  configType: varchar("configType", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  region: varchar("region", { length: 100 }),
  config: text("config"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_gc_type").on(table.configType),
]);
export type GlobalConfig = typeof globalConfigs.$inferSelect;
export type InsertGlobalConfig = typeof globalConfigs.$inferInsert;

// ============ Registered Devices (Mobile Responsive) ============
export const registeredDevices = mysqlTable("registered_devices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  deviceId: varchar("deviceId", { length: 200 }).notNull(),
  deviceType: varchar("deviceType", { length: 50 }).notNull(),
  pushToken: varchar("pushToken", { length: 500 }),
  platform: varchar("platform", { length: 50 }),
  appVersion: varchar("appVersion", { length: 50 }),
  lastSync: timestamp("lastSync", { mode: "string" }),
  syncConfig: text("syncConfig"),
  userId: varchar("userId", { length: 64 }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_rd_device").on(table.deviceId),
  index("idx_rd_user").on(table.userId),
]);
export type RegisteredDevice = typeof registeredDevices.$inferSelect;
export type InsertRegisteredDevice = typeof registeredDevices.$inferInsert;

// ============ Mobile App Configs (Native Mobile Apps) ============
export const mobileAppConfigs = mysqlTable("mobile_app_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  appVersion: varchar("appVersion", { length: 50 }),
  bundleId: varchar("bundleId", { length: 200 }),
  packageName: varchar("packageName", { length: 200 }),
  config: text("config"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_mac_platform").on(table.platform),
]);
export type MobileAppConfig = typeof mobileAppConfigs.$inferSelect;
export type InsertMobileAppConfig = typeof mobileAppConfigs.$inferInsert;

// ============ Partner Deals (Partner Channel) ============
export const partnerDeals = mysqlTable("partner_deals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  partnerId: varchar("partnerId", { length: 64 }),
  partnerName: varchar("partnerName", { length: 200 }),
  dealName: varchar("dealName", { length: 200 }).notNull(),
  customerId: varchar("customerId", { length: 64 }),
  dealValue: decimal("dealValue", { precision: 15, scale: 2 }).default("0"),
  tier: varchar("tier", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("REGISTERED"),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0"),
  closureDate: varchar("closureDate", { length: 100 }),
  config: text("config"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_pd_status").on(table.status),
  index("idx_pd_partner").on(table.partnerId),
]);
export type PartnerDeal = typeof partnerDeals.$inferSelect;
export type InsertPartnerDeal = typeof partnerDeals.$inferInsert;

// ============ Performance Configs (Performance Optimization + Scaling) ============
export const perfConfigs = mysqlTable("perf_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  configType: varchar("configType", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }),
  strategy: varchar("strategy", { length: 100 }),
  config: text("config"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_pc_type").on(table.configType),
]);
export type PerfConfig = typeof perfConfigs.$inferSelect;
export type InsertPerfConfig = typeof perfConfigs.$inferInsert;

// ============ Backup Schedules (Sys Admin) ============
export const backupSchedules = mysqlTable("backup_schedules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }),
  backupType: varchar("backupType", { length: 50 }).notNull().default("FULL"),
  schedule: varchar("schedule", { length: 100 }),
  retentionDays: int("retentionDays").default(30),
  status: varchar("status", { length: 50 }).notNull().default("SCHEDULED"),
  lastRun: timestamp("lastRun", { mode: "string" }),
  nextRun: timestamp("nextRun", { mode: "string" }),
  config: text("config"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_bs_status").on(table.status),
]);
export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = typeof backupSchedules.$inferInsert;

// ============ Backup History (completed backup records) ============
export const backupHistory = mysqlTable("backup_history", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  backupType: varchar("backupType", { length: 50 }).notNull().default("full"),
  scope: varchar("scope", { length: 50 }).notNull().default("full"),
  scopeEntityId: varchar("scopeEntityId", { length: 64 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  tablesList: text("tablesList"),
  recordCount: int("recordCount").default(0),
  sizeBytes: int("sizeBytes").default(0),
  fileName: varchar("fileName", { length: 500 }),
  errorMessage: text("errorMessage"),
  completedAt: timestamp("completedAt", { mode: "string" }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
}, (table) => [
  index("idx_bh_status").on(table.status),
  index("idx_bh_scope").on(table.scope),
  index("idx_bh_created").on(table.createdAt),
]);
export type BackupHistoryRecord = typeof backupHistory.$inferSelect;
export type InsertBackupHistory = typeof backupHistory.$inferInsert;

// ============ Integration Configs (Third-Party Integration) ============
export const integrationConfigs = mysqlTable("integration_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  provider: varchar("provider", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }),
  service: varchar("service", { length: 100 }),
  integrationType: varchar("integrationType", { length: 50 }),
  config: text("config"),
  status: varchar("status", { length: 20 }).default("inactive"),
  isActive: tinyint("isActive").notNull().default(1),
  lastSync: timestamp("lastSync", { mode: "string" }),
  lastSyncAt: timestamp("lastSyncAt", { mode: "string" }),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ic_provider").on(table.provider),
  index("idx_ic_active").on(table.isActive),
  index("idx_ic_status").on(table.status),
]);
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = typeof integrationConfigs.$inferInsert;

// ============ Design Configs (UI/UX Excellence) ============
export const designConfigs = mysqlTable("design_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  configType: varchar("configType", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }),
  theme: varchar("theme", { length: 50 }),
  config: text("config"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_dc_type").on(table.configType),
]);
export type DesignConfig = typeof designConfigs.$inferSelect;
export type InsertDesignConfig = typeof designConfigs.$inferInsert;

// ============ AI Insights ============
export const aiInsights = mysqlTable("ai_insights", {
  id: varchar("id", { length: 64 }).primaryKey(),
  insightType: varchar("insightType", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }),
  description: text("description"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).default("0"),
  impact: varchar("impact", { length: 50 }).default("MEDIUM"),
  trend: varchar("trend", { length: 50 }).default("neutral"),
  recommendation: text("recommendation"),
  entityType: varchar("entityType", { length: 100 }),
  entityId: varchar("entityId", { length: 64 }),
  period: varchar("period", { length: 50 }),
  dataPayload: text("dataPayload"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ai_type").on(table.insightType),
  index("idx_ai_period").on(table.period),
]);
export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = typeof aiInsights.$inferInsert;

// ============ Analytics Metrics ============
export const analyticsMetrics = mysqlTable("analytics_metrics", {
  id: varchar("id", { length: 64 }).primaryKey(),
  metricName: varchar("metricName", { length: 200 }).notNull(),
  metricType: varchar("metricType", { length: 100 }).notNull(),
  value: decimal("value", { precision: 15, scale: 4 }).default("0"),
  unit: varchar("unit", { length: 50 }),
  period: varchar("period", { length: 50 }),
  dimensions: text("dimensions"),
  changePercent: decimal("changePercent", { precision: 10, scale: 2 }).default("0"),
  benchmark: decimal("benchmark", { precision: 15, scale: 4 }),
  dataPayload: text("dataPayload"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_am_name").on(table.metricName),
  index("idx_am_type").on(table.metricType),
]);
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = typeof analyticsMetrics.$inferInsert;

// ============ Cohort Analyses ============
export const cohortAnalyses = mysqlTable("cohort_analyses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  analysisType: varchar("analysisType", { length: 100 }).notNull(),
  cohortType: varchar("cohortType", { length: 50 }),
  name: varchar("name", { length: 200 }),
  period: varchar("period", { length: 50 }),
  dataPayload: text("dataPayload"),
  retentionData: text("retentionData"),
  funnelData: text("funnelData"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_ca_type").on(table.analysisType),
  index("idx_ca_cohort").on(table.cohortType),
]);
export type CohortAnalysis = typeof cohortAnalyses.$inferSelect;
export type InsertCohortAnalysis = typeof cohortAnalyses.$inferInsert;

// ============ Executive Reports ============
export const executiveReports = mysqlTable("executive_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  reportType: varchar("reportType", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }),
  period: varchar("period", { length: 50 }),
  horizon: varchar("horizon", { length: 50 }),
  dataPayload: text("dataPayload"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  recipients: int("recipients").default(0),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_er_type").on(table.reportType),
  index("idx_er_period").on(table.period),
]);
export type ExecutiveReport = typeof executiveReports.$inferSelect;
export type InsertExecutiveReport = typeof executiveReports.$inferInsert;

// ============ Collaboration Sessions ============
export const collaborationSessions = mysqlTable("collaboration_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionType: varchar("sessionType", { length: 100 }).notNull(),
  documentId: varchar("documentId", { length: 64 }),
  channelId: varchar("channelId", { length: 64 }),
  userId: varchar("userId", { length: 64 }),
  message: text("message"),
  dataPayload: text("dataPayload"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_cs_type").on(table.sessionType),
  index("idx_cs_doc").on(table.documentId),
]);
export type CollaborationSession = typeof collaborationSessions.$inferSelect;
export type InsertCollaborationSession = typeof collaborationSessions.$inferInsert;

// ============ Compliance Records ============
export const complianceRecords = mysqlTable("compliance_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  recordType: varchar("recordType", { length: 100 }).notNull(),
  standard: varchar("standard", { length: 100 }),
  score: int("score").default(0),
  status: varchar("status", { length: 50 }).notNull().default("COMPLIANT"),
  findings: text("findings"),
  dataPayload: text("dataPayload"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_cr_type").on(table.recordType),
  index("idx_cr_standard").on(table.standard),
]);
export type ComplianceRecord = typeof complianceRecords.$inferSelect;
export type InsertComplianceRecord = typeof complianceRecords.$inferInsert;

// ============================================================================
// STAFF CHAT (Persistent Messages)
// ============================================================================

export const staffChatChannels = mysqlTable("staffChatChannels", {
  id: varchar({ length: 64 }).primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  type: varchar({ length: 20 }).notNull().default("team"), // general, team, private
  description: varchar({ length: 255 }),
  members: json().$type<string[]>().default([]),
  createdBy: varchar({ length: 64 }).notNull(),
  isActive: tinyint().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_scc_type").on(table.type),
  index("idx_scc_created_by").on(table.createdBy),
]);

export type StaffChatChannel = typeof staffChatChannels.$inferSelect;
export type InsertStaffChatChannel = typeof staffChatChannels.$inferInsert;

export const staffChatMessages = mysqlTable("staffChatMessages", {
  id: varchar({ length: 64 }).primaryKey(),
  channelId: varchar({ length: 64 }).default("general"),
  userId: varchar({ length: 64 }).notNull(),
  userName: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  emoji: varchar({ length: 10 }),
  replyToId: varchar({ length: 64 }),
  replyToUser: varchar({ length: 255 }),
  fileUrl: varchar({ length: 500 }),
  fileName: varchar({ length: 255 }),
  fileType: varchar({ length: 50 }),
  isEdited: tinyint().default(0).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_scm_user_id").on(table.userId),
  index("idx_scm_created_at").on(table.createdAt),
  index("idx_scm_channel_id").on(table.channelId),
]);

export type StaffChatMessage = typeof staffChatMessages.$inferSelect;
export type InsertStaffChatMessage = typeof staffChatMessages.$inferInsert;

// ============ Canned Responses (Support) ============
export const cannedResponses = mysqlTable("canned_responses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }),
  category: varchar("category", { length: 100 }).notNull().default("General"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  shortCode: varchar("shortCode", { length: 50 }),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_cr_category").on(table.category),
  index("idx_cr_org").on(table.organizationId),
]);

export type CannedResponse = typeof cannedResponses.$inferSelect;
export type InsertCannedResponse = typeof cannedResponses.$inferInsert;

// ============ Knowledge Base ============
export const kbCategories = mysqlTable("kb_categories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("BookOpen"),
  color: varchar("color", { length: 30 }).default("bg-blue-500"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_kbc_org").on(table.organizationId),
  index("idx_kbc_slug").on(table.slug),
]);

export type KbCategory = typeof kbCategories.$inferSelect;
export type InsertKbCategory = typeof kbCategories.$inferInsert;

export const kbArticles = mysqlTable("kb_articles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }),
  categoryId: varchar("categoryId", { length: 64 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  status: varchar("status", { length: 20 }).default("published"),
  featured: tinyint("featured").default(0),
  readTime: int("readTime").default(3),
  views: int("views").default(0),
  tags: text("tags"),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_kba_org").on(table.organizationId),
  index("idx_kba_cat").on(table.categoryId),
  index("idx_kba_status").on(table.status),
]);

export type KbArticle = typeof kbArticles.$inferSelect;
export type InsertKbArticle = typeof kbArticles.$inferInsert;

// ============ Warehouses & Stock Movements ============
export const warehouses = mysqlTable("warehouses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }),
  address: text("address"),
  contactPerson: varchar("contactPerson", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_wh_org").on(table.organizationId),
]);

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

export const stockMovements = mysqlTable("stock_movements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }),
  productId: varchar("productId", { length: 64 }).notNull(),
  warehouseId: varchar("warehouseId", { length: 64 }),
  type: varchar("type", { length: 30 }).notNull(),
  quantity: int("quantity").notNull(),
  referenceNo: varchar("referenceNo", { length: 100 }),
  reason: text("reason"),
  fromWarehouse: varchar("fromWarehouse", { length: 64 }),
  toWarehouse: varchar("toWarehouse", { length: 64 }),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
}, (table) => [
  index("idx_sm_org").on(table.organizationId),
  index("idx_sm_product").on(table.productId),
  index("idx_sm_type").on(table.type),
]);

// ============ Client Subscriptions (Auto-Recurring Invoices) ============
export const clientSubscriptions = mysqlTable("clientSubscriptions", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  clientId: varchar({ length: 64 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  status: mysqlEnum(['active', 'paused', 'cancelled', 'expired']).default('active').notNull(),
  frequency: mysqlEnum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']).notNull(),
  amount: int().notNull(),
  currency: varchar({ length: 10 }).default('KES'),
  startDate: datetime({ mode: 'string' }).notNull(),
  endDate: datetime({ mode: 'string' }),
  nextBillingDate: datetime({ mode: 'string' }).notNull(),
  lastBilledDate: datetime({ mode: 'string' }),
  templateInvoiceId: varchar({ length: 64 }),
  recurringInvoiceId: varchar({ length: 64 }),
  autoSendInvoice: tinyint().default(1).notNull(),
  totalBilled: int().default(0),
  invoiceCount: int().default(0),
  createdBy: varchar({ length: 64 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_cs_org").on(table.organizationId),
  index("idx_cs_client").on(table.clientId),
  index("idx_cs_status").on(table.status),
  index("idx_cs_next_billing").on(table.nextBillingDate),
]);

export type ClientSubscription = typeof clientSubscriptions.$inferSelect;
export type InsertClientSubscription = typeof clientSubscriptions.$inferInsert;

// ============================================================================
// PHASE 21: ICT MANAGEMENT SYSTEM - System Health, Logs, Sessions
// ============================================================================

export const systemHealth = mysqlTable("systemHealth", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  cpuUsage: int().default(0),
  cpuModel: varchar({ length: 255 }),
  cpuCores: int().default(1),
  cpuSpeed: varchar({ length: 50 }),
  cpuTemperature: int().default(0),
  memoryUsage: int().default(0),
  memoryTotal: int().default(0),
  memoryAvailable: int().default(0),
  diskUsage: int().default(0),
  diskTotal: int().default(0),
  diskUsagePercent: int().default(0),
  status: mysqlEnum(['healthy', 'warning', 'critical']).default('healthy').notNull(),
  systemPlatform: varchar({ length: 100 }),
  systemDistro: varchar({ length: 100 }),
  systemRelease: varchar({ length: 50 }),
  systemArch: varchar({ length: 50 }),
  systemManufacturer: varchar({ length: 255 }),
  systemUptime: int().default(0), // hours
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_sh_org").on(table.organizationId),
  index("idx_sh_status").on(table.status),
  index("idx_sh_created_at").on(table.createdAt),
]);

export type SystemHealth = typeof systemHealth.$inferSelect;
export type InsertSystemHealth = typeof systemHealth.$inferInsert;

export const systemLogs = mysqlTable("systemLogs", {
  id: varchar({ length: 64 }).primaryKey(),
  organizationId: varchar({ length: 64 }),
  userId: varchar({ length: 64 }),
  severity: mysqlEnum(['debug', 'info', 'warning', 'error', 'critical']).default('info').notNull(),
  message: text().notNull(),
  context: text(), // JSON object for additional context
  service: varchar({ length: 100 }), // service name: api, worker, auth, db, etc
  action: varchar({ length: 100 }), // what action was performed
  stackTrace: text(), // for errors
  ipAddress: varchar({ length: 100 }),
  userAgent: varchar({ length: 500 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_sl_org").on(table.organizationId),
  index("idx_sl_user").on(table.userId),
  index("idx_sl_severity").on(table.severity),
  index("idx_sl_service").on(table.service),
  index("idx_sl_created_at").on(table.createdAt),
]);

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = typeof systemLogs.$inferInsert;

export const activeSessions = mysqlTable("activeSessions", {
  id: varchar({ length: 64 }).primaryKey(),
  userId: varchar({ length: 64 }).notNull(),
  userEmail: varchar({ length: 320 }).notNull(),
  organizationId: varchar({ length: 64 }),
  ipAddress: varchar({ length: 100 }).notNull(),
  userAgent: varchar({ length: 500 }).notNull(),
  deviceType: varchar({ length: 50 }), // desktop, mobile, tablet
  browser: varchar({ length: 100 }),
  browserVersion: varchar({ length: 50 }),
  operatingSystem: varchar({ length: 100 }),
  osVersion: varchar({ length: 50 }),
  tokenHash: varchar({ length: 255 }), // hash of session token
  lastActivity: timestamp({ mode: 'string' }),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_as_user").on(table.userId),
  index("idx_as_org").on(table.organizationId),
  index("idx_as_expires_at").on(table.expiresAt),
  index("idx_as_created_at").on(table.createdAt),
]);

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

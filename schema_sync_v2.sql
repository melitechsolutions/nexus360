-- Schema Sync V2: Add missing columns + Create missing tables
-- Generated from Drizzle schema comparison

-- ============================================================
-- PART 1: Missing columns on existing tables
-- ============================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS jobGroupId VARCHAR(64) NOT NULL DEFAULT '' AFTER position;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bankName VARCHAR(255) NULL AFTER emergencyContact;

-- ============================================================
-- PART 2: Create missing tables referenced by active routers
-- ============================================================

-- jobGroups (referenced by employees.jobGroupId)
CREATE TABLE IF NOT EXISTS jobGroups (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  minimumGrossSalary INT NOT NULL DEFAULT 0,
  maximumGrossSalary INT NOT NULL DEFAULT 0,
  description TEXT,
  isActive TINYINT DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX job_group_name_idx (name),
  INDEX is_active_idx (isActive)
);

-- customRoles (referenced by users.customRoleId, enhancedRbac middleware)
CREATE TABLE IF NOT EXISTS customRoles (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(100) NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  description TEXT,
  permissions TEXT,
  baseRole ENUM('user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager') DEFAULT 'staff',
  isAdvanced TINYINT DEFAULT 0 NOT NULL,
  isSystem TINYINT DEFAULT 0 NOT NULL,
  isActive TINYINT DEFAULT 1 NOT NULL,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX custom_roles_org_idx (organizationId)
);

-- reminders (referenced by reminders router, loaded on every page)
CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('invoice_due','estimate_expiry','project_milestone','payment_overdue','custom') NOT NULL,
  frequency ENUM('once','daily','weekly','monthly','custom') NOT NULL,
  customDays INT,
  timing ENUM('before','on','after') NOT NULL,
  isActive TINYINT DEFAULT 1 NOT NULL,
  emailEnabled TINYINT DEFAULT 1 NOT NULL,
  smsEnabled TINYINT DEFAULT 0 NOT NULL,
  emailTemplate TEXT,
  smsTemplate TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- scheduledReminders
CREATE TABLE IF NOT EXISTS scheduledReminders (
  id VARCHAR(64) PRIMARY KEY,
  reminderId VARCHAR(64) NOT NULL,
  referenceType VARCHAR(50) NOT NULL,
  referenceId VARCHAR(64) NOT NULL,
  recipientId VARCHAR(64) NOT NULL,
  recipientType ENUM('user','client') NOT NULL,
  scheduledFor DATETIME NOT NULL,
  status ENUM('pending','sent','failed','cancelled') DEFAULT 'pending' NOT NULL,
  sentAt DATETIME,
  error TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- receipts (referenced by receipts router)
CREATE TABLE IF NOT EXISTS receipts (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  receiptNumber VARCHAR(100) NOT NULL,
  clientId VARCHAR(64) NOT NULL,
  paymentId VARCHAR(64),
  amount INT NOT NULL,
  paymentMethod ENUM('cash','bank_transfer','cheque','mpesa','card','other') NOT NULL,
  receiptDate DATETIME NOT NULL,
  notes TEXT,
  createdBy VARCHAR(64),
  approvedBy VARCHAR(64),
  approvedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX receipts_org_idx (organizationId),
  INDEX receipts_client_idx (clientId)
);

-- lineItems (referenced by lineItems router)
CREATE TABLE IF NOT EXISTS lineItems (
  id VARCHAR(64) PRIMARY KEY,
  documentId VARCHAR(64) NOT NULL,
  documentType ENUM('invoice','estimate','receipt','expense','credit_note','lpo') NOT NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL,
  rate INT NOT NULL,
  amount INT NOT NULL,
  productId VARCHAR(64),
  serviceId VARCHAR(64),
  taxRate INT DEFAULT 0,
  taxAmount INT DEFAULT 0,
  lineNumber INT DEFAULT 1,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX line_items_doc_idx (documentId, documentType)
);

-- payroll (referenced by payroll router)
CREATE TABLE IF NOT EXISTS payroll (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  payPeriodStart DATETIME NOT NULL,
  payPeriodEnd DATETIME NOT NULL,
  basicSalary INT NOT NULL,
  allowances INT DEFAULT 0,
  deductions INT DEFAULT 0,
  tax INT DEFAULT 0,
  netSalary INT NOT NULL,
  status ENUM('draft','processed','paid') DEFAULT 'draft' NOT NULL,
  paymentDate DATETIME,
  paymentMethod VARCHAR(50),
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX payroll_employee_idx (employeeId)
);

-- creditNotes (referenced by creditNotes router)
CREATE TABLE IF NOT EXISTS creditNotes (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  creditNoteNumber VARCHAR(100) NOT NULL,
  clientId VARCHAR(64) NOT NULL,
  clientName VARCHAR(255),
  invoiceId VARCHAR(64),
  issueDate DATETIME NOT NULL,
  reason ENUM('goods-returned','service-cancelled','discount','quality-issue','error','other') NOT NULL DEFAULT 'other',
  subtotal INT NOT NULL DEFAULT 0,
  taxAmount INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  status ENUM('draft','approved','applied','void') DEFAULT 'draft' NOT NULL,
  notes TEXT,
  createdBy VARCHAR(64),
  approvedBy VARCHAR(64),
  approvedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX credit_notes_org_idx (organizationId),
  INDEX credit_notes_client_idx (clientId)
);

-- debitNotes (referenced by debitNotes router)
CREATE TABLE IF NOT EXISTS debitNotes (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  debitNoteNumber VARCHAR(100) NOT NULL,
  supplierId VARCHAR(64) NOT NULL,
  supplierName VARCHAR(255),
  purchaseOrderId VARCHAR(64),
  issueDate DATETIME NOT NULL,
  reason ENUM('quality-shortage','price-adjustment','damaged','underdelivery','penalty') NOT NULL DEFAULT 'quality-shortage',
  subtotal INT NOT NULL DEFAULT 0,
  taxAmount INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  status ENUM('draft','approved','settled','void') DEFAULT 'draft' NOT NULL,
  notes TEXT,
  createdBy VARCHAR(64),
  approvedBy VARCHAR(64),
  approvedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX debit_notes_org_idx (organizationId)
);

-- lpos (referenced by approvals router)
CREATE TABLE IF NOT EXISTS lpos (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  lpoNumber VARCHAR(50) NOT NULL,
  vendorId VARCHAR(64) NOT NULL,
  description TEXT,
  amount INT NOT NULL DEFAULT 0,
  status ENUM('draft','submitted','approved','rejected','received') DEFAULT 'draft' NOT NULL,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX lpos_org_idx (organizationId)
);

-- quotations (referenced by quotations router)
CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  rfqNo VARCHAR(50) NOT NULL,
  supplier VARCHAR(200) NOT NULL,
  description TEXT,
  amount INT DEFAULT 0 NOT NULL,
  dueDate VARCHAR(30),
  status ENUM('draft','submitted','under_review','approved','rejected') DEFAULT 'draft' NOT NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX quotations_org_idx (organizationId)
);

-- grnRecords (referenced by procurement)
CREATE TABLE IF NOT EXISTS grnRecords (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  grnNo VARCHAR(50) NOT NULL,
  supplier VARCHAR(200) NOT NULL,
  invNo VARCHAR(50),
  receivedDate VARCHAR(30) NOT NULL,
  items INT DEFAULT 0 NOT NULL,
  value INT DEFAULT 0 NOT NULL,
  status ENUM('accepted','partial','rejected','pending') DEFAULT 'pending' NOT NULL,
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX grn_org_idx (organizationId)
);

-- deliveryNotes (referenced by procurement)
CREATE TABLE IF NOT EXISTS deliveryNotes (
  id VARCHAR(64) PRIMARY KEY,
  dnNo VARCHAR(50) NOT NULL,
  supplier VARCHAR(200) NOT NULL,
  orderId VARCHAR(64),
  deliveryDate VARCHAR(30) NOT NULL,
  items INT DEFAULT 0 NOT NULL,
  status ENUM('pending','partial','delivered','cancelled') DEFAULT 'pending' NOT NULL,
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- communicationLogs
CREATE TABLE IF NOT EXISTS communicationLogs (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  type ENUM('email','sms') NOT NULL,
  recipient VARCHAR(320) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status ENUM('pending','sent','failed') DEFAULT 'pending' NOT NULL,
  error TEXT,
  referenceType VARCHAR(50),
  referenceId VARCHAR(64),
  sentAt DATETIME,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- recurringExpenses
CREATE TABLE IF NOT EXISTS recurringExpenses (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  category VARCHAR(100) NOT NULL,
  vendor VARCHAR(255),
  amount INT NOT NULL,
  description TEXT,
  paymentMethod ENUM('cash','bank_transfer','cheque','card','other'),
  frequency ENUM('weekly','biweekly','monthly','quarterly','annually') NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  nextDueDate DATETIME NOT NULL,
  dayOfMonth INT DEFAULT 1,
  reminderDaysBefore INT DEFAULT 3,
  lastGeneratedDate DATETIME,
  isActive TINYINT DEFAULT 1 NOT NULL,
  chartOfAccountId INT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX recurring_exp_org_idx (organizationId)
);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  documentName VARCHAR(255) NOT NULL,
  documentType ENUM('contract','agreement','proposal','template','invoice','receipt','other') DEFAULT 'other',
  fileUrl VARCHAR(500) NOT NULL,
  fileSize INT DEFAULT 0,
  mimeType VARCHAR(100),
  linkedEntityType VARCHAR(100),
  linkedEntityId VARCHAR(64),
  linkedClientId VARCHAR(64),
  linkedProjectId VARCHAR(64),
  linkedInvoiceId VARCHAR(64),
  uploadedBy VARCHAR(64) NOT NULL,
  currentVersion INT DEFAULT 1,
  status ENUM('active','archived','deleted') DEFAULT 'active',
  expiryDate TIMESTAMP NULL,
  requiresSignature TINYINT DEFAULT 0,
  isSigned TINYINT DEFAULT 0,
  signedDate TIMESTAMP NULL,
  signedBy VARCHAR(64),
  tags TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX docs_org_idx (organizationId)
);

-- proposals
CREATE TABLE IF NOT EXISTS proposals (
  id VARCHAR(64) PRIMARY KEY,
  proposalNumber VARCHAR(100) NOT NULL,
  clientId VARCHAR(64) NOT NULL,
  title VARCHAR(255),
  status ENUM('draft','sent','accepted','rejected') DEFAULT 'draft' NOT NULL,
  issueDate DATETIME NOT NULL,
  expiryDate DATETIME,
  subtotal INT NOT NULL,
  taxAmount INT DEFAULT 0,
  discountAmount INT DEFAULT 0,
  total INT NOT NULL,
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- budgetAllocations
CREATE TABLE IF NOT EXISTS budgetAllocations (
  id VARCHAR(64) PRIMARY KEY,
  budgetId VARCHAR(64) NOT NULL,
  categoryName VARCHAR(255) NOT NULL,
  allocatedAmount INT NOT NULL,
  spentAmount INT DEFAULT 0 NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX budget_alloc_idx (budgetId)
);

-- userPermissions
CREATE TABLE IF NOT EXISTS userPermissions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  granted TINYINT DEFAULT 1 NOT NULL,
  grantedBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX user_perm_user_idx (userId)
);

-- inventoryTransactions
CREATE TABLE IF NOT EXISTS inventoryTransactions (
  id VARCHAR(64) PRIMARY KEY,
  productId VARCHAR(64) NOT NULL,
  type ENUM('purchase','sale','adjustment','return','transfer') NOT NULL,
  quantity INT NOT NULL,
  unitCost INT,
  referenceType VARCHAR(50),
  referenceId VARCHAR(64),
  notes TEXT,
  transactionDate DATETIME NOT NULL,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX inv_tx_product_idx (productId)
);

-- stockAlerts
CREATE TABLE IF NOT EXISTS stockAlerts (
  id VARCHAR(64) PRIMARY KEY,
  productId VARCHAR(64) NOT NULL,
  alertType ENUM('low_stock','out_of_stock','overstock','reorder') NOT NULL,
  currentQuantity INT NOT NULL,
  threshold INT NOT NULL,
  status ENUM('active','resolved','ignored') DEFAULT 'active' NOT NULL,
  notifiedAt DATETIME,
  resolvedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- guestClients
CREATE TABLE IF NOT EXISTS guestClients (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- paymentPlanInstallments
CREATE TABLE IF NOT EXISTS paymentPlanInstallments (
  id VARCHAR(64) PRIMARY KEY,
  paymentPlanId VARCHAR(64) NOT NULL,
  installmentNumber INT NOT NULL,
  dueDate DATETIME NOT NULL,
  amount INT NOT NULL,
  status ENUM('pending','paid','overdue','skipped') DEFAULT 'pending' NOT NULL,
  paidDate DATETIME,
  paidAmount INT,
  paymentId VARCHAR(64),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX plan_install_idx (paymentPlanId)
);

-- warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  contactPerson VARCHAR(200),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  productId VARCHAR(64) NOT NULL,
  warehouseId VARCHAR(64),
  type VARCHAR(30) NOT NULL,
  quantity INT NOT NULL,
  referenceNo VARCHAR(100),
  reason TEXT,
  fromWarehouse VARCHAR(64),
  toWarehouse VARCHAR(64),
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- workOrderMaterials
CREATE TABLE IF NOT EXISTS workOrderMaterials (
  id VARCHAR(64) PRIMARY KEY,
  workOrderId VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  quantity INT DEFAULT 1 NOT NULL,
  unitCost INT DEFAULT 0 NOT NULL,
  total INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- auditLogs
CREATE TABLE IF NOT EXISTS auditLogs (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resourceType VARCHAR(50) NOT NULL,
  resourceId VARCHAR(64),
  changes TEXT,
  ipAddress VARCHAR(50),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_user_idx (userId)
);

-- permissionAuditLog
CREATE TABLE IF NOT EXISTS permissionAuditLog (
  id VARCHAR(64) PRIMARY KEY,
  roleId VARCHAR(64),
  userId VARCHAR(64),
  permissionId VARCHAR(100),
  permissionLabel VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  changedBy VARCHAR(64),
  oldValue TEXT,
  newValue TEXT,
  reason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- emailQueue
CREATE TABLE IF NOT EXISTS emailQueue (
  id VARCHAR(64) PRIMARY KEY,
  recipientEmail VARCHAR(320) NOT NULL,
  recipientName VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  htmlContent TEXT NOT NULL,
  textContent TEXT,
  eventType VARCHAR(100) NOT NULL,
  entityType VARCHAR(100),
  entityId VARCHAR(64),
  userId VARCHAR(64),
  status ENUM('pending','sent','failed','retrying') DEFAULT 'pending' NOT NULL,
  attempts INT DEFAULT 0 NOT NULL,
  maxAttempts INT DEFAULT 3 NOT NULL,
  lastAttemptAt TIMESTAMP NULL,
  nextRetryAt TIMESTAMP NULL,
  errorMessage TEXT,
  metadata TEXT,
  sentAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- emailLog
CREATE TABLE IF NOT EXISTS emailLog (
  id VARCHAR(64) PRIMARY KEY,
  queueId VARCHAR(64),
  recipientEmail VARCHAR(320) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  eventType VARCHAR(100) NOT NULL,
  status ENUM('sent','failed') NOT NULL,
  messageId VARCHAR(255),
  errorMessage TEXT,
  sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- dashboardWidgetData
CREATE TABLE IF NOT EXISTS dashboardWidgetData (
  id VARCHAR(64) PRIMARY KEY,
  widgetId VARCHAR(64) NOT NULL,
  dataKey VARCHAR(255),
  dataValue JSON,
  cachedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NULL
);

-- projectTeamMembers
CREATE TABLE IF NOT EXISTS projectTeamMembers (
  id VARCHAR(64) PRIMARY KEY,
  projectId VARCHAR(64) NOT NULL,
  employeeId VARCHAR(64) NOT NULL,
  role VARCHAR(100),
  hoursAllocated INT,
  startDate DATETIME,
  endDate DATETIME,
  isActive TINYINT DEFAULT 1 NOT NULL,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX pt_project_idx (projectId)
);

-- projectBudgets
CREATE TABLE IF NOT EXISTS projectBudgets (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  projectId VARCHAR(64) NOT NULL,
  budgetedAmount INT NOT NULL,
  spent INT DEFAULT 0 NOT NULL,
  remaining INT NOT NULL,
  budgetStatus ENUM('under','at','over') NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- departmentBudgets
CREATE TABLE IF NOT EXISTS departmentBudgets (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  departmentId VARCHAR(64) NOT NULL,
  year INT NOT NULL,
  budgetedAmount INT NOT NULL,
  spent INT DEFAULT 0 NOT NULL,
  remaining INT NOT NULL,
  budgetStatus ENUM('under','at','over') NOT NULL,
  category VARCHAR(100),
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ledgerBudgets
CREATE TABLE IF NOT EXISTS ledgerBudgets (
  id VARCHAR(64) PRIMARY KEY,
  accountId VARCHAR(64) NOT NULL,
  year INT NOT NULL,
  month INT,
  budgetedAmount INT NOT NULL,
  actual INT DEFAULT 0 NOT NULL,
  variance INT NOT NULL DEFAULT 0,
  variancePercentage INT,
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- contacts
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  clientId VARCHAR(64),
  salutation VARCHAR(20),
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(320),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  jobTitle VARCHAR(200),
  department VARCHAR(200),
  isPrimary TINYINT DEFAULT 0,
  notes TEXT,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  postalCode VARCHAR(20),
  linkedIn VARCHAR(500),
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX contacts_org_idx (organizationId),
  INDEX contacts_client_idx (clientId)
);

-- organizationMembers
CREATE TABLE IF NOT EXISTS organizationMembers (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64) NOT NULL,
  userId VARCHAR(64) NOT NULL,
  role VARCHAR(50),
  status ENUM('active','inactive','invited','removed') DEFAULT 'active' NOT NULL,
  isActive TINYINT DEFAULT 1 NOT NULL,
  invitedBy VARCHAR(64),
  joinedAt DATETIME,
  leftAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX org_members_org_idx (organizationId),
  INDEX org_members_user_idx (userId)
);

-- serviceTemplates
CREATE TABLE IF NOT EXISTS serviceTemplates (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  hourlyRate INT,
  fixedPrice INT,
  unit VARCHAR(50) DEFAULT 'hour',
  taxRate INT DEFAULT 0,
  estimatedDuration INT,
  deliverables TEXT,
  terms TEXT,
  isActive TINYINT DEFAULT 1 NOT NULL,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- quotes
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(64) PRIMARY KEY,
  quoteNumber VARCHAR(50) NOT NULL,
  clientId VARCHAR(64) NOT NULL,
  subject VARCHAR(255),
  description TEXT,
  status ENUM('draft','sent','accepted','expired','declined','converted') DEFAULT 'draft' NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  taxAmount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  expirationDate DATETIME,
  sentDate TIMESTAMP NULL,
  acceptedDate TIMESTAMP NULL,
  declinedDate TIMESTAMP NULL,
  convertedInvoiceId VARCHAR(64),
  template INT DEFAULT 0,
  createdBy VARCHAR(64),
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- quoteLogs
CREATE TABLE IF NOT EXISTS quoteLogs (
  id VARCHAR(64) PRIMARY KEY,
  quoteId VARCHAR(64) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  userId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tenantMessages
CREATE TABLE IF NOT EXISTS tenantMessages (
  id VARCHAR(64) PRIMARY KEY,
  senderId VARCHAR(64) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content LONGTEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  targetType VARCHAR(20) DEFAULT 'all',
  targetOrgId VARCHAR(64),
  targetUserId VARCHAR(64),
  isRead TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- pricingTierFeatures
CREATE TABLE IF NOT EXISTS pricingTierFeatures (
  id VARCHAR(64) PRIMARY KEY,
  tier VARCHAR(50) NOT NULL,
  featureKey VARCHAR(100) NOT NULL,
  isEnabled TINYINT DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- journalEntryReconciliations
CREATE TABLE IF NOT EXISTS journalEntryReconciliations (
  id VARCHAR(64) PRIMARY KEY,
  journalEntryId VARCHAR(64) NOT NULL,
  reconciledBy VARCHAR(64),
  reconciledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

SELECT 'SCHEMA_SYNC_V2_OK' AS result;

-- ============================================================================
-- COMPREHENSIVE PRODUCTION MIGRATION SCRIPT
-- Target: MariaDB 10.11.16 | Generated from Drizzle schema.ts + SQL migrations
-- Safe to run multiple times (all IF NOT EXISTS / IF EXISTS patterns)
-- ============================================================================

-- ============================================================================
-- SECTION 1: ALTER COLUMNS ON EXISTING CORE TABLES
-- ============================================================================

-- organizations: extended details + archiving
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS taxId VARCHAR(100) DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billingEmail VARCHAR(320) DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Africa/Nairobi';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employeeCount INT DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registrationNumber VARCHAR(100) DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS paymentMethod VARCHAR(50) DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS isArchived TINYINT NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archivedAt TIMESTAMP NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archivedBy VARCHAR(64) NULL;

-- users: customRoleId for RBAC
ALTER TABLE users ADD COLUMN IF NOT EXISTS customRoleId VARCHAR(64) NULL;

-- departments: defaultRole
ALTER TABLE departments ADD COLUMN IF NOT EXISTS defaultRole VARCHAR(100) NULL;

-- services: deliverables
ALTER TABLE services ADD COLUMN IF NOT EXISTS deliverables TEXT DEFAULT NULL;

-- staffChatMessages: channels + file support
ALTER TABLE staffChatMessages ADD COLUMN IF NOT EXISTS channelId VARCHAR(64) DEFAULT 'general';
ALTER TABLE staffChatMessages ADD COLUMN IF NOT EXISTS fileUrl VARCHAR(500) NULL;
ALTER TABLE staffChatMessages ADD COLUMN IF NOT EXISTS fileName VARCHAR(255) NULL;
ALTER TABLE staffChatMessages ADD COLUMN IF NOT EXISTS fileType VARCHAR(50) NULL;

-- organizationId on core tables
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE leaveRequests ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE services ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS organizationId VARCHAR(64);

-- ============================================================================
-- SECTION 2: CONFIRMED MISSING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS communicationLogs (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  type ENUM('email','sms') NOT NULL,
  recipient VARCHAR(320) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  error TEXT,
  referenceType VARCHAR(50),
  referenceId VARCHAR(64),
  sentAt DATETIME,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  status ENUM('draft','approved','applied','void') NOT NULL DEFAULT 'draft',
  notes TEXT,
  createdBy VARCHAR(64),
  approvedBy VARCHAR(64),
  approvedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
  status ENUM('draft','approved','settled','void') NOT NULL DEFAULT 'draft',
  notes TEXT,
  createdBy VARCHAR(64),
  approvedBy VARCHAR(64),
  approvedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  rfqNo VARCHAR(50) NOT NULL,
  supplier VARCHAR(200) NOT NULL,
  description TEXT,
  amount INT NOT NULL DEFAULT 0,
  dueDate VARCHAR(30),
  status ENUM('draft','submitted','under_review','approved','rejected') NOT NULL DEFAULT 'draft',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grnRecords (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  grnNo VARCHAR(50) NOT NULL,
  supplier VARCHAR(200) NOT NULL,
  invNo VARCHAR(50),
  receivedDate VARCHAR(30) NOT NULL,
  items INT NOT NULL DEFAULT 0,
  value INT NOT NULL DEFAULT 0,
  status ENUM('accepted','partial','rejected','pending') NOT NULL DEFAULT 'pending',
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS serviceInvoices (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  serviceInvoiceNumber VARCHAR(50) NOT NULL,
  issueDate VARCHAR(30) NOT NULL,
  dueDate VARCHAR(30) NOT NULL,
  clientId VARCHAR(64) NOT NULL,
  clientName VARCHAR(200) NOT NULL,
  serviceDescription TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  taxAmount INT NOT NULL DEFAULT 0,
  notes TEXT,
  status ENUM('draft','sent','accepted','paid','cancelled') NOT NULL DEFAULT 'draft',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS serviceInvoiceItems (
  id VARCHAR(64) PRIMARY KEY,
  serviceInvoiceId VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unitPrice INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  contractNumber VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  vendor VARCHAR(200) NOT NULL,
  startDate VARCHAR(30) NOT NULL,
  endDate VARCHAR(30) NOT NULL,
  value INT NOT NULL DEFAULT 0,
  status ENUM('draft','active','expired','terminated') NOT NULL DEFAULT 'draft',
  contractType VARCHAR(100),
  description TEXT,
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warranties (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  product VARCHAR(200) NOT NULL,
  vendor VARCHAR(200) NOT NULL,
  expiryDate VARCHAR(30) NOT NULL,
  coverage VARCHAR(500) NOT NULL,
  status ENUM('active','expiring_soon','expired') NOT NULL DEFAULT 'active',
  serialNumber VARCHAR(100),
  claimTerms TEXT,
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveryNotes (
  id VARCHAR(64) PRIMARY KEY,
  dnNo VARCHAR(50) NOT NULL,
  supplier VARCHAR(200) NOT NULL,
  orderId VARCHAR(64),
  deliveryDate VARCHAR(30) NOT NULL,
  items INT NOT NULL DEFAULT 0,
  status ENUM('pending','partial','delivered','cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  location VARCHAR(200) NOT NULL,
  value INT NOT NULL DEFAULT 0,
  assignedTo VARCHAR(200),
  serialNumber VARCHAR(100),
  purchaseDate VARCHAR(30),
  status ENUM('active','inactive','maintenance','disposed') NOT NULL DEFAULT 'active',
  notes TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  content TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  pinned TINYINT NOT NULL DEFAULT 0,
  favorite TINYINT NOT NULL DEFAULT 0,
  createdBy VARCHAR(64) NOT NULL,
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 3: MIGRATION-CREATED TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS customRoles (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(64) NULL,
  name VARCHAR(100) NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  description TEXT NULL,
  permissions JSON NULL,
  baseRole ENUM('user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager') DEFAULT 'staff',
  isAdvanced TINYINT(1) NOT NULL DEFAULT 0,
  isSystem TINYINT(1) NOT NULL DEFAULT 0,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdBy VARCHAR(64) NULL,
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NULL,
  permissionName VARCHAR(100) NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  resource VARCHAR(100) NULL,
  action VARCHAR(50) NULL,
  isAdvanced TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staffChatChannels (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'team',
  description VARCHAR(255),
  members JSON DEFAULT ('[]'),
  createdBy VARCHAR(64) NOT NULL,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurringExpenses (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  category VARCHAR(100) NOT NULL,
  vendor VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  paymentMethod VARCHAR(50),
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  startDate DATE NOT NULL,
  endDate DATE,
  nextDueDate DATE,
  dayOfMonth INT DEFAULT 1,
  reminderDaysBefore INT DEFAULT 3,
  lastGeneratedDate DATE,
  isActive TINYINT NOT NULL DEFAULT 1,
  chartOfAccountId VARCHAR(64),
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_read_status (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  channel_id VARCHAR(100) NOT NULL DEFAULT 'general',
  last_read_message_id VARCHAR(100) DEFAULT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_channel (user_id, channel_id)
);

-- ============================================================================
-- SECTION 4: HR ADVANCED MODULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS employeeContracts (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  contractType ENUM('permanent','fixed_term','probation','casual','internship') NOT NULL DEFAULT 'permanent',
  title VARCHAR(200),
  startDate DATE NOT NULL,
  endDate DATE,
  salary DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'KES',
  terms TEXT,
  renewalDate DATE,
  noticePeriod INT DEFAULT 30,
  status ENUM('active','expired','terminated','renewed','pending') NOT NULL DEFAULT 'active',
  documentUrl VARCHAR(500),
  signedByEmployee TINYINT(1) DEFAULT 0,
  signedByEmployer TINYINT(1) DEFAULT 0,
  createdBy VARCHAR(64),
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaveBalances (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  leaveType ENUM('annual','sick','maternity','paternity','compassionate','unpaid','study') NOT NULL,
  year INT NOT NULL,
  entitlement DECIMAL(5,1) NOT NULL DEFAULT 21.0,
  used DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  pending DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  carriedOver DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  remaining DECIMAL(5,1) GENERATED ALWAYS AS (entitlement + carriedOver - used - pending) STORED,
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_lb_emp_type_year (employeeId, leaveType, year)
);

CREATE TABLE IF NOT EXISTS disciplinaryRecords (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  type ENUM('verbal_warning','written_warning','final_warning','suspension','termination','counseling') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  description TEXT,
  incidentDate DATE NOT NULL,
  actionTaken TEXT,
  followUpDate DATE,
  outcome VARCHAR(200),
  issuedBy VARCHAR(64),
  witnessName VARCHAR(200),
  employeeAcknowledged TINYINT(1) DEFAULT 0,
  acknowledgedDate DATE,
  documentUrl VARCHAR(500),
  status ENUM('open','acknowledged','resolved','escalated','appealed') NOT NULL DEFAULT 'open',
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobPostings (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  departmentId VARCHAR(64),
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  qualifications TEXT,
  experienceLevel ENUM('entry','mid','senior','lead','executive') DEFAULT 'mid',
  employmentType ENUM('full_time','part_time','contract','internship','temporary') DEFAULT 'full_time',
  salaryMin DECIMAL(15,2),
  salaryMax DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'KES',
  location VARCHAR(200),
  isRemote TINYINT(1) DEFAULT 0,
  openings INT DEFAULT 1,
  applicationDeadline DATE,
  status ENUM('draft','open','closed','on_hold','filled') NOT NULL DEFAULT 'draft',
  postedBy VARCHAR(64),
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobApplicants (
  id VARCHAR(64) PRIMARY KEY,
  jobPostingId VARCHAR(64) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  resumeUrl VARCHAR(500),
  coverLetterUrl VARCHAR(500),
  linkedinUrl VARCHAR(300),
  currentEmployer VARCHAR(200),
  currentTitle VARCHAR(200),
  experienceYears INT,
  expectedSalary DECIMAL(15,2),
  noticePeriod INT,
  source ENUM('website','referral','linkedin','agency','job_board','other') DEFAULT 'website',
  referredBy VARCHAR(200),
  stage ENUM('applied','screening','shortlisted','interview','assessment','offer','hired','rejected','withdrawn') NOT NULL DEFAULT 'applied',
  rating INT DEFAULT 0,
  notes TEXT,
  interviewDate DATETIME,
  interviewNotes TEXT,
  offerAmount DECIMAL(15,2),
  offerDate DATE,
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboardingTemplates (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
  isActive TINYINT DEFAULT 1,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboardingChecklists (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  employeeId VARCHAR(64) NOT NULL,
  templateId VARCHAR(64),
  type ENUM('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
  status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  startDate DATETIME,
  completedDate DATETIME,
  assignedTo VARCHAR(64),
  notes TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboardingTasks (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  checklistId VARCHAR(64) NOT NULL,
  templateId VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('documentation','equipment','access','training','introduction','other') DEFAULT 'other',
  assignedTo VARCHAR(64),
  dueDate DATETIME,
  status ENUM('pending','in_progress','completed','skipped') DEFAULT 'pending',
  completedAt DATETIME,
  completedBy VARCHAR(64),
  sortOrder INT DEFAULT 0,
  isRequired TINYINT DEFAULT 1,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publicHolidays (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  year INT NOT NULL,
  isRecurring TINYINT DEFAULT 0,
  country VARCHAR(100) DEFAULT 'Kenya',
  type ENUM('public','company','optional') DEFAULT 'public',
  description TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payslips (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  employeeId VARCHAR(64) NOT NULL,
  payrollId VARCHAR(64),
  payPeriod VARCHAR(20) NOT NULL,
  payDate DATE NOT NULL,
  basicSalary INT NOT NULL DEFAULT 0,
  grossPay INT NOT NULL DEFAULT 0,
  totalAllowances INT DEFAULT 0,
  totalDeductions INT DEFAULT 0,
  netPay INT NOT NULL DEFAULT 0,
  paye INT DEFAULT 0,
  nhif INT DEFAULT 0,
  nssf INT DEFAULT 0,
  housingLevy INT DEFAULT 0,
  allowancesBreakdown JSON,
  deductionsBreakdown JSON,
  status ENUM('draft','generated','sent','viewed') DEFAULT 'draft',
  sentAt DATETIME,
  viewedAt DATETIME,
  pdfUrl VARCHAR(500),
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainingPrograms (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('technical','soft_skills','compliance','leadership','safety','other') DEFAULT 'other',
  provider VARCHAR(255),
  duration VARCHAR(100),
  cost INT DEFAULT 0,
  maxParticipants INT,
  location VARCHAR(255),
  isOnline TINYINT DEFAULT 0,
  status ENUM('planned','active','completed','cancelled') DEFAULT 'planned',
  startDate DATETIME,
  endDate DATETIME,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainingEnrollments (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  programId VARCHAR(64) NOT NULL,
  employeeId VARCHAR(64) NOT NULL,
  status ENUM('enrolled','in_progress','completed','withdrawn','failed') DEFAULT 'enrolled',
  enrolledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,
  score INT,
  certificateUrl VARCHAR(500),
  feedback TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- performanceReviews column additions (safe: IF NOT EXISTS)
ALTER TABLE performanceReviews ADD COLUMN IF NOT EXISTS strengths TEXT;
ALTER TABLE performanceReviews ADD COLUMN IF NOT EXISTS improvements TEXT;
ALTER TABLE performanceReviews ADD COLUMN IF NOT EXISTS kpiScore DECIMAL(5,2);

-- ============================================================================
-- SECTION 5: PHASE 20+ TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS aiDocuments (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  documentType ENUM('contract','invoice','proposal','brief','report','email') NOT NULL,
  originalContent LONGTEXT NOT NULL,
  summary TEXT,
  keyPoints JSON,
  actionItems JSON,
  financialSummary JSON,
  generatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('processed','failed','pending') NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emailGenerationHistory (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  templateType ENUM('invoice_followup','proposal','project_update','general','payment_reminder') NOT NULL,
  tone ENUM('professional','friendly','formal','casual') NOT NULL DEFAULT 'professional',
  generatedContent TEXT NOT NULL,
  originalContext TEXT,
  recipientId VARCHAR(64),
  wasSent TINYINT NOT NULL DEFAULT 0,
  sentAt TIMESTAMP NULL,
  feedback VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financialAnalytics (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64) NOT NULL,
  month DATETIME NOT NULL,
  totalRevenue INT DEFAULT 0,
  totalExpenses INT DEFAULT 0,
  netProfit INT DEFAULT 0,
  expenseTrends JSON,
  revenueTrends JSON,
  costReductionOpportunities JSON,
  cashFlowForecast JSON,
  analysisNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aiChatSessions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  title VARCHAR(255),
  messageCount INT DEFAULT 0,
  lastMessageAt TIMESTAMP NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aiChatMessages (
  id VARCHAR(64) PRIMARY KEY,
  sessionId VARCHAR(64) NOT NULL,
  userId VARCHAR(64) NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  tokens INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('active','inactive','draft') NOT NULL DEFAULT 'draft',
  triggerType ENUM('invoice_created','invoice_paid','invoice_overdue','payment_received','opportunity_moved','task_completed','project_milestone_reached','reminder_time') NOT NULL,
  triggerCondition TEXT,
  actionTypes TEXT NOT NULL,
  isRecurring TINYINT DEFAULT 0,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflowTriggers (
  id VARCHAR(64) PRIMARY KEY,
  workflowId VARCHAR(64) NOT NULL,
  triggerType VARCHAR(100) NOT NULL,
  triggerField VARCHAR(100),
  operator ENUM('equals','not_equals','greater_than','less_than','contains','starts_with','ends_with') DEFAULT 'equals',
  triggerValue TEXT,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflowActions (
  id VARCHAR(64) PRIMARY KEY,
  workflowId VARCHAR(64) NOT NULL,
  actionType ENUM('send_email','create_task','update_status','send_notification','create_follow_up','add_invoice','update_field','create_reminder') NOT NULL,
  actionName VARCHAR(255) NOT NULL,
  actionTarget VARCHAR(100),
  actionData TEXT NOT NULL,
  delayMinutes INT DEFAULT 0,
  sequence INT DEFAULT 1,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflowExecutions (
  id VARCHAR(64) PRIMARY KEY,
  workflowId VARCHAR(64) NOT NULL,
  entityType VARCHAR(100) NOT NULL,
  entityId VARCHAR(64) NOT NULL,
  status ENUM('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
  triggerData TEXT,
  executionLog TEXT,
  errorMessage TEXT,
  executedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permission_metadata (
  id VARCHAR(64) PRIMARY KEY,
  permissionId VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(100),
  isSystem TINYINT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboardLayouts (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'My Dashboard',
  description TEXT,
  gridColumns INT DEFAULT 6,
  isDefault TINYINT DEFAULT 0,
  layoutData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboardWidgets (
  id VARCHAR(64) PRIMARY KEY,
  layoutId VARCHAR(64) NOT NULL,
  widgetType VARCHAR(100) NOT NULL,
  widgetTitle VARCHAR(255),
  widgetSize VARCHAR(10) DEFAULT 'medium',
  rowIndex INT DEFAULT 0,
  colIndex INT DEFAULT 0,
  refreshInterval INT DEFAULT 300,
  config JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboardWidgetData (
  id VARCHAR(64) PRIMARY KEY,
  widgetId VARCHAR(64) NOT NULL,
  dataKey VARCHAR(255),
  dataValue JSON,
  cachedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NULL
);

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

CREATE TABLE IF NOT EXISTS projectMetrics (
  id VARCHAR(64) PRIMARY KEY,
  projectId VARCHAR(64) NOT NULL,
  revenue INT DEFAULT 0,
  costs INT DEFAULT 0,
  profit INT DEFAULT 0,
  profitMargin INT DEFAULT 0,
  hoursEstimated INT DEFAULT 0,
  hoursActual INT DEFAULT 0,
  teamMembersCount INT DEFAULT 0,
  completionPercentage INT DEFAULT 0,
  statusKey VARCHAR(50) DEFAULT 'on-time',
  riskLevel ENUM('low','medium','high') DEFAULT 'low',
  calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientHealthScores (
  id VARCHAR(64) PRIMARY KEY,
  clientId VARCHAR(64) NOT NULL,
  healthScore INT DEFAULT 50,
  riskLevel ENUM('green','yellow','red') DEFAULT 'yellow',
  paymentTimeliness INT DEFAULT 50,
  invoiceFrequency INT DEFAULT 50,
  totalRevenue INT DEFAULT 0,
  overdueAmount INT DEFAULT 0,
  projectSuccessRate INT DEFAULT 50,
  churnRisk INT DEFAULT 0,
  lifetimeValue INT DEFAULT 0,
  lastActivityDate TIMESTAMP NULL,
  calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performanceReviews (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  reviewerId VARCHAR(64) NOT NULL,
  reviewDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period VARCHAR(50) NOT NULL,
  overallRating INT DEFAULT 0,
  performanceScore INT DEFAULT 0,
  productivity INT DEFAULT 0,
  collaboration INT DEFAULT 0,
  communication INT DEFAULT 0,
  technicalSkills INT DEFAULT 0,
  leadership INT DEFAULT 0,
  comments TEXT,
  goals TEXT,
  developmentPlan TEXT,
  strengths TEXT,
  improvements TEXT,
  kpiScore DECIMAL(5,2),
  status ENUM('draft','completed','archived') DEFAULT 'draft',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skillsMatrix (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  skillName VARCHAR(255) NOT NULL,
  proficiencyLevel ENUM('beginner','intermediate','advanced','expert') DEFAULT 'beginner',
  yearsOfExperience INT DEFAULT 0,
  lastAssessmentDate TIMESTAMP NULL,
  certifications TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  taskTitle VARCHAR(255) NOT NULL,
  description TEXT,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  duration INT DEFAULT 0,
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  status ENUM('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
  assignedTo VARCHAR(64),
  projectId VARCHAR(64),
  recurrencePattern VARCHAR(100),
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vacationRequests (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  daysRequested INT DEFAULT 0,
  vacationType ENUM('vacation','sick_leave','personal','sabbatical') DEFAULT 'vacation',
  reason TEXT,
  status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  approvedBy VARCHAR(64),
  approvalDate TIMESTAMP NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentVersions (
  id VARCHAR(64) PRIMARY KEY,
  documentId VARCHAR(64) NOT NULL,
  versionNumber INT DEFAULT 1,
  fileUrl VARCHAR(500) NOT NULL,
  fileSize INT DEFAULT 0,
  uploadedBy VARCHAR(64) NOT NULL,
  changeNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentAccess (
  id VARCHAR(64) PRIMARY KEY,
  documentId VARCHAR(64) NOT NULL,
  userId VARCHAR(64),
  roleId VARCHAR(64),
  accessLevel ENUM('view','download','edit','share') DEFAULT 'view',
  grantedBy VARCHAR(64),
  grantedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS notificationRules (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  eventType VARCHAR(100) NOT NULL,
  channelType ENUM('email','in_app','push','sms') DEFAULT 'in_app',
  doNotDisturbStart VARCHAR(5),
  doNotDisturbEnd VARCHAR(5),
  frequency ENUM('instant','daily','weekly','never') DEFAULT 'instant',
  enabled TINYINT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usageMetrics (
  id VARCHAR(64) PRIMARY KEY,
  subscriptionId VARCHAR(64) NOT NULL,
  metricName VARCHAR(255) NOT NULL,
  metricValue INT DEFAULT 0,
  billingAmount INT DEFAULT 0,
  usagePeriod VARCHAR(50) NOT NULL,
  recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenseCategories (
  id VARCHAR(64) PRIMARY KEY,
  categoryName VARCHAR(255) NOT NULL,
  description TEXT,
  taxDeductible TINYINT DEFAULT 1,
  accountCode VARCHAR(50),
  isActive TINYINT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenseReports (
  id VARCHAR(64) PRIMARY KEY,
  submittedBy VARCHAR(64) NOT NULL,
  reportDate TIMESTAMP NOT NULL,
  totalAmount INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'KES',
  status ENUM('draft','submitted','approved','rejected','reimbursed') DEFAULT 'draft',
  approvedBy VARCHAR(64),
  approvalDate TIMESTAMP NULL,
  reimbursementDate TIMESTAMP NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reimbursements (
  id VARCHAR(64) PRIMARY KEY,
  expenseReportId VARCHAR(64) NOT NULL,
  employeeId VARCHAR(64) NOT NULL,
  totalAmount INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'KES',
  paymentMethod VARCHAR(50) NOT NULL,
  paymentDate TIMESTAMP NULL,
  referenceNumber VARCHAR(100),
  status ENUM('pending','approved','processed','failed') DEFAULT 'pending',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currencies (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimalPlaces INT DEFAULT 2,
  isActive TINYINT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exchangeRates (
  id VARCHAR(64) PRIMARY KEY,
  fromCurrency VARCHAR(3) NOT NULL,
  toCurrency VARCHAR(3) NOT NULL,
  rate INT DEFAULT 0,
  rateDate TIMESTAMP NOT NULL,
  source VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS taxRates (
  id VARCHAR(64) PRIMARY KEY,
  country VARCHAR(100) NOT NULL,
  taxType ENUM('vat','gst','sales_tax','income_tax') DEFAULT 'vat',
  rate INT DEFAULT 0,
  effectiveDate TIMESTAMP NOT NULL,
  expiryDate TIMESTAMP NULL,
  description TEXT,
  isActive TINYINT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forecastModels (
  id VARCHAR(64) PRIMARY KEY,
  modelName VARCHAR(255) NOT NULL,
  modelType ENUM('revenue','expense','headcount','client_churn') DEFAULT 'revenue',
  algorithm VARCHAR(100),
  accuracy INT DEFAULT 0,
  trainingDataPoints INT DEFAULT 0,
  lastTrainedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forecastResults (
  id VARCHAR(64) PRIMARY KEY,
  modelId VARCHAR(64) NOT NULL,
  forecastPeriod VARCHAR(50) NOT NULL,
  forecastDate TIMESTAMP NOT NULL,
  predictedValue INT DEFAULT 0,
  confidenceInterval INT DEFAULT 0,
  confidenceLower INT DEFAULT 0,
  confidenceUpper INT DEFAULT 0,
  actualValue INT,
  variance INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apiKeys (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  keyName VARCHAR(255) NOT NULL,
  keyValue VARCHAR(255) NOT NULL,
  lastUsedAt TIMESTAMP NULL,
  expiresAt TIMESTAMP NULL,
  isActive TINYINT DEFAULT 1,
  rateLimit INT DEFAULT 1000,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  webhookUrl VARCHAR(500) NOT NULL,
  eventType VARCHAR(100) NOT NULL,
  secret VARCHAR(255),
  isActive TINYINT DEFAULT 1,
  retryCount INT DEFAULT 0,
  lastTriggeredAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integrationLogs (
  id VARCHAR(64) PRIMARY KEY,
  webhookId VARCHAR(64),
  eventType VARCHAR(100) NOT NULL,
  payload TEXT,
  responseStatus INT,
  errorMessage TEXT,
  attemptNumber INT DEFAULT 1,
  success TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  status ENUM('pending','sent','failed','retrying') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  maxAttempts INT NOT NULL DEFAULT 3,
  lastAttemptAt TIMESTAMP NULL,
  nextRetryAt TIMESTAMP NULL,
  errorMessage TEXT,
  metadata TEXT,
  sentAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS invoiceReminders (
  id VARCHAR(64) PRIMARY KEY,
  invoiceId VARCHAR(64) NOT NULL,
  reminderType ENUM('overdue_1day','overdue_3days','overdue_7days','overdue_14days','overdue_30days') NOT NULL,
  clientEmail VARCHAR(320) NOT NULL,
  sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sentBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pricingPlans (
  id VARCHAR(64) PRIMARY KEY,
  planName VARCHAR(255) NOT NULL,
  planSlug VARCHAR(100) NOT NULL UNIQUE,
  description LONGTEXT,
  tier ENUM('free','starter','professional','enterprise','custom') NOT NULL,
  monthlyPrice DECIMAL(10,2) DEFAULT 0,
  annualPrice DECIMAL(10,2) DEFAULT 0,
  monthlyAnnualDiscount DECIMAL(5,2) DEFAULT 0,
  maxUsers INT DEFAULT -1,
  maxProjects INT DEFAULT -1,
  maxStorageGB INT DEFAULT -1,
  features JSON,
  supportLevel ENUM('email','priority','24/7_phone','dedicated_manager') DEFAULT 'email',
  isActive TINYINT NOT NULL DEFAULT 1,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  clientId VARCHAR(64),
  organizationId VARCHAR(64),
  planId VARCHAR(64) NOT NULL,
  status ENUM('trial','active','suspended','cancelled','expired') NOT NULL DEFAULT 'trial',
  billingCycle ENUM('monthly','annual') NOT NULL DEFAULT 'monthly',
  startDate TIMESTAMP NOT NULL,
  renewalDate TIMESTAMP NOT NULL,
  expiryDate TIMESTAMP NULL,
  gracePeriodEnd TIMESTAMP NULL,
  isLocked TINYINT DEFAULT 0,
  autoRenew TINYINT DEFAULT 1,
  currentPrice DECIMAL(10,2) DEFAULT 0,
  usersCount INT DEFAULT 0,
  projectsCount INT DEFAULT 0,
  storageUsedGB INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billingInvoices (
  id VARCHAR(64) PRIMARY KEY,
  subscriptionId VARCHAR(64) NOT NULL,
  invoiceNumber VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  totalAmount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending','sent','viewed','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  billingPeriodStart TIMESTAMP NOT NULL,
  billingPeriodEnd TIMESTAMP NOT NULL,
  dueDate TIMESTAMP NOT NULL,
  sentAt TIMESTAMP NULL,
  paidAt TIMESTAMP NULL,
  paymentMethod VARCHAR(50),
  paymentReference VARCHAR(255),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paymentMethods (
  id VARCHAR(64) PRIMARY KEY,
  clientId VARCHAR(64) NOT NULL,
  type ENUM('credit_card','debit_card','bank_account','paypal','mpesa') NOT NULL,
  provider VARCHAR(50),
  lastFourDigits VARCHAR(4),
  expiryMonth INT,
  expiryYear INT,
  holderName VARCHAR(255),
  bankName VARCHAR(255),
  accountNumber VARCHAR(50),
  isDefault TINYINT DEFAULT 0,
  isActive TINYINT DEFAULT 1,
  providerMethodId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billingUsageMetrics (
  id VARCHAR(64) PRIMARY KEY,
  subscriptionId VARCHAR(64) NOT NULL,
  metricDate DATETIME NOT NULL,
  usersCount INT DEFAULT 0,
  projectsCount INT DEFAULT 0,
  tasksCount INT DEFAULT 0,
  documentsCount INT DEFAULT 0,
  storageUsedMB INT DEFAULT 0,
  apiCallsCount INT DEFAULT 0,
  emailsSent INT DEFAULT 0,
  recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billingNotifications (
  id VARCHAR(64) PRIMARY KEY,
  subscriptionId VARCHAR(64) NOT NULL,
  notificationType ENUM('payment_due_7days','payment_due_today','payment_overdue_1day','payment_overdue_3days','subscription_expiring_7days','subscription_expiring_today','subscription_expired','system_locked','payment_failed','usage_limit_warning','renewal_successful') NOT NULL,
  message TEXT,
  sentTo VARCHAR(320),
  channel ENUM('email','in_app','sms') DEFAULT 'email',
  isSent TINYINT DEFAULT 0,
  sentAt TIMESTAMP NULL,
  isRead TINYINT DEFAULT 0,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS userDeletions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  userEmail VARCHAR(320) NOT NULL,
  deletedReason TEXT,
  deletedBy VARCHAR(64) NOT NULL,
  deletedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  restoredAt TIMESTAMP NULL,
  restoredBy VARCHAR(64),
  archived TINYINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notificationTemplates (
  id VARCHAR(64) PRIMARY KEY,
  templateKey VARCHAR(100) NOT NULL UNIQUE,
  templateName VARCHAR(255) NOT NULL,
  category ENUM('billing','system','user','document','communication','security') NOT NULL,
  subject VARCHAR(500),
  bodyTemplate LONGTEXT NOT NULL,
  channels JSON,
  variables JSON,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificationBroadcasts (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content LONGTEXT NOT NULL,
  target ENUM('all_users','specific_role','specific_department','specific_plan','custom') NOT NULL,
  targetValue VARCHAR(255),
  priority ENUM('low','normal','high','critical') NOT NULL DEFAULT 'normal',
  channels JSON,
  status ENUM('draft','scheduled','sending','sent','cancelled') NOT NULL DEFAULT 'draft',
  scheduledFor TIMESTAMP NULL,
  startedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  recipientCount INT DEFAULT 0,
  sentCount INT DEFAULT 0,
  failedCount INT DEFAULT 0,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversationId VARCHAR(64) NOT NULL,
  senderId VARCHAR(64) NOT NULL,
  messageType ENUM('text','image','file','system') NOT NULL DEFAULT 'text',
  content LONGTEXT NOT NULL,
  fileUrl VARCHAR(500),
  fileName VARCHAR(255),
  fileSize INT,
  mimeType VARCHAR(100),
  isEdited TINYINT DEFAULT 0,
  editedAt TIMESTAMP NULL,
  isDeleted TINYINT DEFAULT 0,
  deletedAt TIMESTAMP NULL,
  reactions JSON,
  encryptionIv VARCHAR(255),
  encryptionTag VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  type ENUM('direct','group','channel') NOT NULL DEFAULT 'direct',
  name VARCHAR(255),
  description TEXT,
  conversationIcon VARCHAR(500),
  createdBy VARCHAR(64) NOT NULL,
  isArchived TINYINT DEFAULT 0,
  archivedAt TIMESTAMP NULL,
  isEncrypted TINYINT NOT NULL DEFAULT 1,
  encryptionKey VARCHAR(255),
  lastMessageAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizationFeatures (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64) NOT NULL,
  featureKey VARCHAR(100) NOT NULL,
  isEnabled TINYINT NOT NULL DEFAULT 1,
  config JSON,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizationUsers (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  role ENUM('super_admin','admin','manager','staff','viewer','ict_manager','project_manager','hr','accountant','procurement_manager','sales_manager') NOT NULL DEFAULT 'staff',
  position VARCHAR(100),
  department VARCHAR(100),
  phone VARCHAR(20),
  photoUrl LONGTEXT,
  isActive TINYINT NOT NULL DEFAULT 1,
  invitationSent TINYINT NOT NULL DEFAULT 0,
  invitationSentAt TIMESTAMP NULL,
  invitationAcceptedAt TIMESTAMP NULL,
  lastSignedIn TIMESTAMP NULL,
  loginCount INT DEFAULT 0,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS pricingTierFeatures (
  id VARCHAR(64) PRIMARY KEY,
  tier VARCHAR(50) NOT NULL,
  featureKey VARCHAR(100) NOT NULL,
  isEnabled TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversationMembers (
  id VARCHAR(64) PRIMARY KEY,
  conversationId VARCHAR(64) NOT NULL,
  userId VARCHAR(64) NOT NULL,
  role ENUM('member','moderator','admin') NOT NULL DEFAULT 'member',
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leftAt TIMESTAMP NULL,
  lastReadAt TIMESTAMP NULL,
  unreadCount INT DEFAULT 0,
  isMuted TINYINT DEFAULT 0,
  isActive TINYINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS messageReadReceipts (
  id VARCHAR(64) PRIMARY KEY,
  messageId VARCHAR(64) NOT NULL,
  userId VARCHAR(64) NOT NULL,
  readAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  ticketNumber VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description LONGTEXT NOT NULL,
  category ENUM('support','billing','feature_request','bug','security','general') NOT NULL,
  priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  status ENUM('open','in_progress','on_hold','resolved','closed','reopened') NOT NULL DEFAULT 'open',
  createdBy VARCHAR(64) NOT NULL,
  assignedTo VARCHAR(64),
  department VARCHAR(100),
  resolution TEXT,
  solutionUrl VARCHAR(500),
  attachments JSON,
  relatedTickets JSON,
  firstResponseAt TIMESTAMP NULL,
  resolvedAt TIMESTAMP NULL,
  closedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticketResponses (
  id VARCHAR(64) PRIMARY KEY,
  ticketId VARCHAR(64) NOT NULL,
  responderId VARCHAR(64) NOT NULL,
  responseType ENUM('comment','resolution','escalation') NOT NULL DEFAULT 'comment',
  content LONGTEXT NOT NULL,
  attachments JSON,
  isInternal TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurringInvoiceTemplates (
  id VARCHAR(64) PRIMARY KEY,
  clientId VARCHAR(64) NOT NULL,
  invoiceName VARCHAR(255) NOT NULL,
  description TEXT,
  frequency ENUM('daily','weekly','biweekly','monthly','quarterly','semi_annual','annual') NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  nextInvoiceDate DATETIME NOT NULL,
  items JSON,
  taxRate DECIMAL(5,2) DEFAULT 0,
  discount DECIMAL(5,2) DEFAULT 0,
  discountType ENUM('percentage','fixed') DEFAULT 'percentage',
  notes TEXT,
  paymentTerms INT,
  autoSend TINYINT NOT NULL DEFAULT 1,
  autoCreateReceipt TINYINT NOT NULL DEFAULT 1,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automatedReceipts (
  id VARCHAR(64) PRIMARY KEY,
  invoiceId VARCHAR(64) NOT NULL,
  receiptNumber VARCHAR(50) NOT NULL UNIQUE,
  amountReceived DECIMAL(10,2) NOT NULL,
  amountOutstanding DECIMAL(10,2) DEFAULT 0,
  paymentStatus ENUM('partial','full') NOT NULL,
  paymentMethod VARCHAR(50),
  paymentReference VARCHAR(255),
  autoGenerated TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emailCampaigns (
  id VARCHAR(64) PRIMARY KEY,
  campaignName VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  bodyHtml LONGTEXT NOT NULL,
  bodyText LONGTEXT,
  fromEmail VARCHAR(320) NOT NULL,
  fromName VARCHAR(255),
  recipientCount INT DEFAULT 0,
  sentCount INT DEFAULT 0,
  openCount INT DEFAULT 0,
  clickCount INT DEFAULT 0,
  failureCount INT DEFAULT 0,
  status ENUM('draft','scheduled','sending','sent','failed','paused') NOT NULL DEFAULT 'draft',
  scheduledFor TIMESTAMP NULL,
  startedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emailLogs (
  id VARCHAR(64) PRIMARY KEY,
  campaignId VARCHAR(64),
  recipientEmail VARCHAR(320) NOT NULL,
  userId VARCHAR(64),
  subject VARCHAR(500) NOT NULL,
  status ENUM('pending','sent','bounced','failed','opened','clicked') NOT NULL DEFAULT 'pending',
  provider VARCHAR(50),
  providerMessageId VARCHAR(255),
  sentAt TIMESTAMP NULL,
  failureReason TEXT,
  openedAt TIMESTAMP NULL,
  clickedAt TIMESTAMP NULL,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workOrders (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  workOrderNumber VARCHAR(50) NOT NULL,
  issueDate VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  assignedTo VARCHAR(200) NOT NULL,
  priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  startDate VARCHAR(30) NOT NULL,
  targetEndDate VARCHAR(30) NOT NULL,
  laborCost INT NOT NULL DEFAULT 0,
  serviceCost INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  notes TEXT,
  status ENUM('draft','open','in-progress','completed','cancelled') NOT NULL DEFAULT 'draft',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workOrderMaterials (
  id VARCHAR(64) PRIMARY KEY,
  workOrderId VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unitCost INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 6: ADMIN STUB TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_reports (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  dataSources TEXT,
  layout TEXT,
  format ENUM('PDF','Excel','CSV','HTML') NOT NULL DEFAULT 'PDF',
  isTemplate TINYINT NOT NULL DEFAULT 0,
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  owner VARCHAR(200),
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS smart_workflows (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  triggerType VARCHAR(50) NOT NULL DEFAULT 'event',
  triggerConfig TEXT,
  actions TEXT,
  conditions TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  executionCount INT NOT NULL DEFAULT 0,
  lastExecuted TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200),
  dataType VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL DEFAULT 'csv',
  filters TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  fileUrl VARCHAR(500),
  fileSize BIGINT,
  rowsExported INT DEFAULT 0,
  schedule VARCHAR(50),
  recipients TEXT,
  expiresAt TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
  id VARCHAR(64) PRIMARY KEY,
  eventType VARCHAR(100) NOT NULL,
  action VARCHAR(200),
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  resourceId VARCHAR(200),
  userId VARCHAR(64),
  details TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'LOGGED',
  ipAddress VARCHAR(100),
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_configurations (
  id VARCHAR(64) PRIMARY KEY,
  configType VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  model VARCHAR(100),
  capabilities TEXT,
  parameters TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  metrics TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_pricing_configs (
  id VARCHAR(64) PRIMARY KEY,
  apiId VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  pricingModel VARCHAR(50) NOT NULL DEFAULT 'FIXED',
  basePrice DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  rateLimit INT DEFAULT 10000,
  config TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etl_jobs (
  id VARCHAR(64) PRIMARY KEY,
  jobName VARCHAR(200) NOT NULL,
  sourceSystem VARCHAR(200),
  targetTable VARCHAR(200),
  schedule VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  progress INT DEFAULT 0,
  recordsProcessed INT DEFAULT 0,
  config TEXT,
  lastRun TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS container_deployments (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  orchestrator VARCHAR(50),
  serviceName VARCHAR(200),
  image VARCHAR(500),
  replicas INT DEFAULT 1,
  port INT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  config TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_dashboards (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  layout VARCHAR(50) NOT NULL DEFAULT 'grid',
  widgets TEXT,
  isPublic TINYINT NOT NULL DEFAULT 0,
  sharedWith TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_configs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200),
  eventType VARCHAR(200) NOT NULL,
  targetUrl VARCHAR(500) NOT NULL,
  secret VARCHAR(200),
  isActive TINYINT NOT NULL DEFAULT 1,
  retryCount INT DEFAULT 0,
  lastTriggered TIMESTAMP NULL,
  config TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_calendar_sync (
  id VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  email VARCHAR(200),
  title VARCHAR(200),
  description TEXT,
  startTime VARCHAR(100),
  endTime VARCHAR(100),
  attendees TEXT,
  location VARCHAR(500),
  syncStatus VARCHAR(50) NOT NULL DEFAULT 'pending',
  config TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_incidents (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  threatType VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  source VARCHAR(200),
  targetAsset VARCHAR(200),
  status VARCHAR(50) NOT NULL DEFAULT 'DETECTED',
  details TEXT,
  scanConfig TEXT,
  resolvedAt TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_configs (
  id VARCHAR(64) PRIMARY KEY,
  configType VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  region VARCHAR(100),
  config TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registered_devices (
  id VARCHAR(64) PRIMARY KEY,
  deviceId VARCHAR(200) NOT NULL,
  deviceType VARCHAR(50) NOT NULL,
  pushToken VARCHAR(500),
  platform VARCHAR(50),
  appVersion VARCHAR(50),
  lastSync TIMESTAMP NULL,
  syncConfig TEXT,
  userId VARCHAR(64),
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mobile_app_configs (
  id VARCHAR(64) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  appVersion VARCHAR(50),
  bundleId VARCHAR(200),
  packageName VARCHAR(200),
  config TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_deals (
  id VARCHAR(64) PRIMARY KEY,
  partnerId VARCHAR(64),
  partnerName VARCHAR(200),
  dealName VARCHAR(200) NOT NULL,
  customerId VARCHAR(64),
  dealValue DECIMAL(15,2) DEFAULT 0,
  tier VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
  commissionRate DECIMAL(5,2) DEFAULT 0,
  closureDate VARCHAR(100),
  config TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS perf_configs (
  id VARCHAR(64) PRIMARY KEY,
  configType VARCHAR(100) NOT NULL,
  name VARCHAR(200),
  strategy VARCHAR(100),
  config TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_schedules (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200),
  backupType VARCHAR(50) NOT NULL DEFAULT 'FULL',
  schedule VARCHAR(100),
  retentionDays INT DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  lastRun TIMESTAMP NULL,
  nextRun TIMESTAMP NULL,
  config TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_history (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  backupType VARCHAR(50) NOT NULL DEFAULT 'full',
  scope VARCHAR(50) NOT NULL DEFAULT 'full',
  scopeEntityId VARCHAR(64),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  tablesList TEXT,
  recordCount INT DEFAULT 0,
  sizeBytes INT DEFAULT 0,
  fileName VARCHAR(500),
  errorMessage TEXT,
  completedAt TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_configs (
  id VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(100) NOT NULL,
  name VARCHAR(200),
  service VARCHAR(100),
  integrationType VARCHAR(50),
  config TEXT,
  status VARCHAR(20) DEFAULT 'inactive',
  isActive TINYINT NOT NULL DEFAULT 1,
  lastSync TIMESTAMP NULL,
  lastSyncAt TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS design_configs (
  id VARCHAR(64) PRIMARY KEY,
  configType VARCHAR(100) NOT NULL,
  name VARCHAR(200),
  theme VARCHAR(50),
  config TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id VARCHAR(64) PRIMARY KEY,
  insightType VARCHAR(100) NOT NULL,
  title VARCHAR(300),
  description TEXT,
  confidence DECIMAL(5,4) DEFAULT 0,
  impact VARCHAR(50) DEFAULT 'MEDIUM',
  trend VARCHAR(50) DEFAULT 'neutral',
  recommendation TEXT,
  entityType VARCHAR(100),
  entityId VARCHAR(64),
  period VARCHAR(50),
  dataPayload TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id VARCHAR(64) PRIMARY KEY,
  metricName VARCHAR(200) NOT NULL,
  metricType VARCHAR(100) NOT NULL,
  value DECIMAL(15,4) DEFAULT 0,
  unit VARCHAR(50),
  period VARCHAR(50),
  dimensions TEXT,
  changePercent DECIMAL(10,2) DEFAULT 0,
  benchmark DECIMAL(15,4),
  dataPayload TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cohort_analyses (
  id VARCHAR(64) PRIMARY KEY,
  analysisType VARCHAR(100) NOT NULL,
  cohortType VARCHAR(50),
  name VARCHAR(200),
  period VARCHAR(50),
  dataPayload TEXT,
  retentionData TEXT,
  funnelData TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS executive_reports (
  id VARCHAR(64) PRIMARY KEY,
  reportType VARCHAR(100) NOT NULL,
  title VARCHAR(300),
  period VARCHAR(50),
  horizon VARCHAR(50),
  dataPayload TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  recipients INT DEFAULT 0,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id VARCHAR(64) PRIMARY KEY,
  sessionType VARCHAR(100) NOT NULL,
  documentId VARCHAR(64),
  channelId VARCHAR(64),
  userId VARCHAR(64),
  message TEXT,
  dataPayload TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_records (
  id VARCHAR(64) PRIMARY KEY,
  recordType VARCHAR(100) NOT NULL,
  standard VARCHAR(100),
  score INT DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLIANT',
  findings TEXT,
  dataPayload TEXT,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canned_responses (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  shortCode VARCHAR(50),
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_categories (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'BookOpen',
  color VARCHAR(30) DEFAULT 'bg-blue-500',
  sortOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_articles (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  categoryId VARCHAR(64) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  excerpt TEXT,
  status VARCHAR(20) DEFAULT 'published',
  featured TINYINT DEFAULT 0,
  readTime INT DEFAULT 3,
  views INT DEFAULT 0,
  tags TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS clientSubscriptions (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  clientId VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('active','paused','cancelled','expired') NOT NULL DEFAULT 'active',
  frequency ENUM('weekly','biweekly','monthly','quarterly','annually') NOT NULL,
  amount INT NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  nextBillingDate DATETIME NOT NULL,
  lastBilledDate DATETIME,
  templateInvoiceId VARCHAR(64),
  recurringInvoiceId VARCHAR(64),
  autoSendInvoice TINYINT NOT NULL DEFAULT 1,
  totalBilled INT DEFAULT 0,
  invoiceCount INT DEFAULT 0,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS systemHealth (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  cpuUsage INT DEFAULT 0,
  cpuModel VARCHAR(255),
  cpuCores INT DEFAULT 1,
  cpuSpeed VARCHAR(50),
  cpuTemperature INT DEFAULT 0,
  memoryUsage INT DEFAULT 0,
  memoryTotal INT DEFAULT 0,
  memoryAvailable INT DEFAULT 0,
  diskUsage INT DEFAULT 0,
  diskTotal INT DEFAULT 0,
  diskUsagePercent INT DEFAULT 0,
  status ENUM('healthy','warning','critical') NOT NULL DEFAULT 'healthy',
  systemPlatform VARCHAR(100),
  systemDistro VARCHAR(100),
  systemRelease VARCHAR(50),
  systemArch VARCHAR(50),
  systemManufacturer VARCHAR(255),
  systemUptime INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS systemLogs (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  userId VARCHAR(64),
  severity ENUM('debug','info','warning','error','critical') NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  context TEXT,
  service VARCHAR(100),
  action VARCHAR(100),
  stackTrace TEXT,
  ipAddress VARCHAR(100),
  userAgent VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activeSessions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  userEmail VARCHAR(320) NOT NULL,
  organizationId VARCHAR(64),
  ipAddress VARCHAR(100) NOT NULL,
  userAgent VARCHAR(500) NOT NULL,
  deviceType VARCHAR(50),
  browser VARCHAR(100),
  browserVersion VARCHAR(50),
  operatingSystem VARCHAR(100),
  osVersion VARCHAR(50),
  tokenHash VARCHAR(255),
  lastActivity TIMESTAMP NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- All statements use IF NOT EXISTS — safe to run multiple times
-- ============================================================================

-- HR Automation Tables
-- Onboarding/Offboarding Checklists
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee (employeeId),
  INDEX idx_status (status),
  INDEX idx_type (type)
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_checklist (checklistId),
  INDEX idx_status (status)
);

-- Public Holidays Calendar
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_year (year)
);

-- Payslips
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee (employeeId),
  INDEX idx_period (payPeriod),
  INDEX idx_status (status)
);

-- Training Management
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_category (category)
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_program (programId),
  INDEX idx_employee (employeeId),
  INDEX idx_status (status)
);

-- Insert default Kenyan public holidays
INSERT IGNORE INTO publicHolidays (id, name, date, year, isRecurring, country, type) VALUES
  (UUID(), 'New Year''s Day', '2026-01-01', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Good Friday', '2026-04-03', 2026, 0, 'Kenya', 'public'),
  (UUID(), 'Easter Monday', '2026-04-06', 2026, 0, 'Kenya', 'public'),
  (UUID(), 'Labour Day', '2026-05-01', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Madaraka Day', '2026-06-01', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Mazingira Day', '2026-10-10', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Mashujaa Day', '2026-10-20', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Jamhuri Day', '2026-12-12', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Christmas Day', '2026-12-25', 2026, 1, 'Kenya', 'public'),
  (UUID(), 'Boxing Day', '2026-12-26', 2026, 1, 'Kenya', 'public');

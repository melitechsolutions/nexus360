-- =====================================================
-- HR Advanced Modules Migration
-- Adds: Contracts, Leave Balances, Disciplinary Records, Recruitment
-- Also adds new columns to performanceReviews
-- =====================================================

-- 1. Employee Contracts
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
  noticePeriod INT DEFAULT 30 COMMENT 'Notice period in days',
  status ENUM('active','expired','terminated','renewed','pending') NOT NULL DEFAULT 'active',
  documentUrl VARCHAR(500),
  signedByEmployee TINYINT(1) DEFAULT 0,
  signedByEmployer TINYINT(1) DEFAULT 0,
  createdBy VARCHAR(64),
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ec_employee (employeeId),
  INDEX idx_ec_status (status),
  INDEX idx_ec_enddate (endDate),
  INDEX idx_ec_org (organizationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Leave Balances (per employee, per year, per leave type)
CREATE TABLE IF NOT EXISTS leaveBalances (
  id VARCHAR(64) PRIMARY KEY,
  employeeId VARCHAR(64) NOT NULL,
  leaveType ENUM('annual','sick','maternity','paternity','compassionate','unpaid','study') NOT NULL,
  year INT NOT NULL,
  entitlement DECIMAL(5,1) NOT NULL DEFAULT 21.0 COMMENT 'Total days entitled',
  used DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  pending DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  carriedOver DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  remaining DECIMAL(5,1) GENERATED ALWAYS AS (entitlement + carriedOver - used - pending) STORED,
  organizationId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_lb_emp_type_year (employeeId, leaveType, year),
  INDEX idx_lb_employee (employeeId),
  INDEX idx_lb_org (organizationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Disciplinary Records
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dr_employee (employeeId),
  INDEX idx_dr_type (type),
  INDEX idx_dr_status (status),
  INDEX idx_dr_org (organizationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Job Postings (Recruitment)
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jp_status (status),
  INDEX idx_jp_dept (departmentId),
  INDEX idx_jp_org (organizationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Job Applicants
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
  noticePeriod INT COMMENT 'In days',
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ja_job (jobPostingId),
  INDEX idx_ja_stage (stage),
  INDEX idx_ja_email (email),
  INDEX idx_ja_org (organizationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Add new columns to performanceReviews if they don't exist
-- Check and add strengths column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'performanceReviews' AND COLUMN_NAME = 'strengths' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@col_exists = 0, 'ALTER TABLE performanceReviews ADD COLUMN strengths TEXT AFTER goals', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check and add improvements column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'performanceReviews' AND COLUMN_NAME = 'improvements' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@col_exists = 0, 'ALTER TABLE performanceReviews ADD COLUMN improvements TEXT AFTER strengths', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check and add kpiScore column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'performanceReviews' AND COLUMN_NAME = 'kpiScore' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@col_exists = 0, 'ALTER TABLE performanceReviews ADD COLUMN kpiScore DECIMAL(5,2) AFTER improvements', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Seed default leave entitlements for existing employees (current year)
INSERT IGNORE INTO leaveBalances (id, employeeId, leaveType, year, entitlement)
SELECT 
  UUID(), e.id, lt.leaveType, YEAR(CURDATE()), lt.defaultDays
FROM employees e
CROSS JOIN (
  SELECT 'annual' as leaveType, 21.0 as defaultDays
  UNION ALL SELECT 'sick', 14.0
  UNION ALL SELECT 'maternity', 90.0
  UNION ALL SELECT 'paternity', 14.0
  UNION ALL SELECT 'compassionate', 7.0
) lt
WHERE e.status = 'active';

SELECT 'HR Advanced Modules migration completed successfully' as result;

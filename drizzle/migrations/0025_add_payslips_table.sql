-- Migration: Add payslips table for HR payroll system
-- This table stores individual employee payslips generated and dispatched monthly

CREATE TABLE IF NOT EXISTS `payslips` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `payrollId` varchar(64) NOT NULL,
  `employeeId` varchar(64) NOT NULL,
  `organizationId` varchar(64),
  `payPeriod` varchar(20) NOT NULL COMMENT 'YYYY-MM format',
  `payPeriodStart` datetime NOT NULL,
  `payPeriodEnd` datetime NOT NULL,
  `basicSalary` int NOT NULL COMMENT 'in cents',
  `allowances` int DEFAULT 0 COMMENT 'in cents',
  `grossSalary` int NOT NULL COMMENT 'basic + allowances, in cents',
  `paye` int DEFAULT 0 COMMENT 'PAYE tax in cents',
  `nssf` int DEFAULT 0 COMMENT 'NSSF contribution in cents',
  `shif` int DEFAULT 0 COMMENT 'SHIF contribution in cents',
  `housingLevy` int DEFAULT 0 COMMENT 'Housing levy in cents',
  `totalDeductions` int DEFAULT 0 COMMENT 'total deductions in cents',
  `netSalary` int NOT NULL COMMENT 'in cents',
  `htmlContent` longtext COMMENT 'Rendered payslip HTML',
  `pdfUrl` varchar(500) COMMENT 'URL to stored PDF',
  `sentTo` varchar(320) COMMENT 'Employee email address',
  `sentAt` datetime COMMENT 'When payslip was sent',
  `status` enum('draft','generated','sent','viewed') DEFAULT 'draft' NOT NULL,
  `employeeNotes` text COMMENT 'Employee can add notes',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY `payroll_idx` (`payrollId`),
  KEY `employee_idx` (`employeeId`),
  KEY `pay_period_idx` (`payPeriod`),
  KEY `status_idx` (`status`),
  KEY `sent_at_idx` (`sentAt`),
  KEY `org_idx` (`organizationId`),
  
  CONSTRAINT `fk_payslip_payroll` FOREIGN KEY (`payrollId`) REFERENCES `payroll` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payslip_employee` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

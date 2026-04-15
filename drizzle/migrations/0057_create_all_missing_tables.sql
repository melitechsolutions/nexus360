-- ============================================================
-- Migration 0057: Create all tables present in schema.ts
-- but missing from MySQL. All statements use IF NOT EXISTS
-- so this is safe to run multiple times.
-- ============================================================

-- 1. guestClients
CREATE TABLE IF NOT EXISTS `guestClients` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NULL,
  `phone` varchar(50) NULL,
  `address` text NULL,
  `notes` text NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL,
  PRIMARY KEY (`id`)
);

-- 2. inventoryTransactions
CREATE TABLE IF NOT EXISTS `inventoryTransactions` (
  `id` varchar(64) NOT NULL,
  `productId` varchar(64) NOT NULL,
  `type` enum('purchase','sale','adjustment','return','transfer') NOT NULL,
  `quantity` int NOT NULL,
  `unitCost` int NULL,
  `referenceType` varchar(50) NULL,
  `referenceId` varchar(64) NULL,
  `notes` text NULL,
  `transactionDate` datetime NOT NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `inv_product_idx` (`productId`)
);

-- 3. stockAlerts
CREATE TABLE IF NOT EXISTS `stockAlerts` (
  `id` varchar(64) NOT NULL,
  `productId` varchar(64) NOT NULL,
  `alertType` enum('low_stock','out_of_stock','overstock','reorder') NOT NULL,
  `currentQuantity` int NOT NULL,
  `threshold` int NOT NULL,
  `status` enum('active','resolved','ignored') NOT NULL DEFAULT 'active',
  `notifiedAt` datetime NULL,
  `resolvedAt` datetime NULL,
  `createdAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `sa_product_idx` (`productId`)
);

-- 4. templates
CREATE TABLE IF NOT EXISTS `templates` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('invoice','estimate','receipt','proposal','report') NOT NULL,
  `content` text NOT NULL,
  `isDefault` tinyint NOT NULL DEFAULT 0,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL,
  `updatedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `type_idx` (`type`)
);

-- 5. timeEntries
CREATE TABLE IF NOT EXISTS `timeEntries` (
  `id` varchar(64) NOT NULL,
  `projectId` varchar(64) NOT NULL,
  `projectTaskId` varchar(64) NULL,
  `userId` varchar(64) NOT NULL,
  `entryDate` datetime NOT NULL,
  `durationMinutes` int NOT NULL,
  `description` varchar(500) NOT NULL,
  `billable` tinyint NOT NULL DEFAULT 1,
  `hourlyRate` int NULL,
  `amount` int NULL DEFAULT 0,
  `status` enum('draft','submitted','approved','invoiced','rejected') NOT NULL DEFAULT 'draft',
  `approvedBy` varchar(64) NULL,
  `approvedAt` datetime NULL,
  `invoiceId` varchar(64) NULL,
  `notes` text NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL,
  `updatedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `project_idx` (`projectId`),
  KEY `task_idx` (`projectTaskId`),
  KEY `user_idx` (`userId`),
  KEY `entry_date_idx` (`entryDate`),
  KEY `status_idx` (`status`),
  KEY `billable_idx` (`billable`)
);

-- 6. userProjectAssignments
CREATE TABLE IF NOT EXISTS `userProjectAssignments` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `projectId` varchar(64) NOT NULL,
  `role` varchar(50) NULL,
  `assignedDate` datetime NOT NULL,
  `createdAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `upa_user_idx` (`userId`),
  KEY `upa_project_idx` (`projectId`)
);

-- 7. projectComments
CREATE TABLE IF NOT EXISTS `projectComments` (
  `id` varchar(64) NOT NULL,
  `projectId` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `comment` text NOT NULL,
  `createdAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `pc_project_idx` (`projectId`)
);

-- 8. staffTasks
CREATE TABLE IF NOT EXISTS `staffTasks` (
  `id` varchar(64) NOT NULL,
  `departmentId` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `assignedTo` varchar(64) NULL,
  `dueDate` datetime NULL,
  `status` enum('pending','in_progress','completed') NULL DEFAULT 'pending',
  `createdAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `st_dept_idx` (`departmentId`)
);

-- 9. savedFilters
CREATE TABLE IF NOT EXISTS `savedFilters` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `moduleName` varchar(100) NOT NULL,
  `filterName` varchar(255) NOT NULL,
  `description` text NULL,
  `filterConfig` text NOT NULL,
  `isDefault` tinyint NOT NULL DEFAULT 0,
  `createdAt` timestamp NULL,
  `updatedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `user_module_idx` (`userId`, `moduleName`),
  KEY `module_idx` (`moduleName`)
);

-- 10. notificationSettings
CREATE TABLE IF NOT EXISTS `notificationSettings` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `channelType` enum('in_app','email','sms','slack') NOT NULL,
  `isEnabled` tinyint NOT NULL DEFAULT 1,
  `notificationType` enum('payment','project','client','financial','system') NOT NULL,
  `frequency` enum('immediate','daily_digest','weekly_digest','never') NOT NULL DEFAULT 'immediate',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_channel_idx` (`userId`, `channelType`)
);

-- 11. notificationPreferences
CREATE TABLE IF NOT EXISTS `notificationPreferences` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `slackWebhookUrl` varchar(500) NULL,
  `phoneNumber` varchar(20) NULL,
  `quietHoursStart` varchar(5) NULL,
  `quietHoursEnd` varchar(5) NULL,
  `timeZone` varchar(50) NULL DEFAULT 'UTC',
  `createdAt` timestamp NULL,
  `updatedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `np_user_idx` (`userId`)
);

-- 12. smsQueue
CREATE TABLE IF NOT EXISTS `smsQueue` (
  `id` varchar(64) NOT NULL,
  `phoneNumber` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','sending','delivered','failed') NOT NULL DEFAULT 'pending',
  `retryCount` int NULL DEFAULT 0,
  `provider` varchar(50) NULL,
  `externalId` varchar(128) NULL,
  `error` text NULL,
  `failureReason` text NULL,
  `relatedEntityType` varchar(50) NULL,
  `relatedEntityId` varchar(64) NULL,
  `sentAt` timestamp NULL,
  `nextRetryAt` timestamp NULL,
  `organizationId` varchar(64) NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sms_status_idx` (`status`),
  KEY `sms_created_idx` (`createdAt`)
);

-- 13. smsCustomerPreferences
CREATE TABLE IF NOT EXISTS `smsCustomerPreferences` (
  `id` varchar(64) NOT NULL,
  `phoneNumber` varchar(20) NOT NULL,
  `optedIn` tinyint(1) NOT NULL DEFAULT 1,
  `marketingOptedIn` tinyint(1) NOT NULL DEFAULT 0,
  `transactionalOptedIn` tinyint(1) NOT NULL DEFAULT 1,
  `reminderPreferences` json NULL,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sms_pref_phone_idx` (`phoneNumber`)
);

-- 14. aiDocuments
CREATE TABLE IF NOT EXISTS `aiDocuments` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `documentType` enum('contract','invoice','proposal','brief','report','email') NOT NULL,
  `originalContent` longtext NOT NULL,
  `summary` text NULL,
  `keyPoints` json NULL,
  `actionItems` json NULL,
  `financialSummary` json NULL,
  `generatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('processed','failed','pending') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aid_user_idx` (`userId`),
  KEY `aid_doc_type_idx` (`documentType`)
);

-- 15. emailGenerationHistory
CREATE TABLE IF NOT EXISTS `emailGenerationHistory` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `templateType` enum('invoice_followup','proposal','project_update','general','payment_reminder') NOT NULL,
  `tone` enum('professional','friendly','formal','casual') NOT NULL DEFAULT 'professional',
  `generatedContent` text NOT NULL,
  `originalContext` text NULL,
  `recipientId` varchar(64) NULL,
  `wasSent` tinyint NOT NULL DEFAULT 0,
  `sentAt` timestamp NULL,
  `feedback` varchar(20) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `egh_user_idx` (`userId`),
  KEY `egh_tmpl_idx` (`templateType`)
);

-- 16. financialAnalytics
CREATE TABLE IF NOT EXISTS `financialAnalytics` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(64) NOT NULL,
  `month` datetime NOT NULL,
  `totalRevenue` int NULL DEFAULT 0,
  `totalExpenses` int NULL DEFAULT 0,
  `netProfit` int NULL DEFAULT 0,
  `expenseTrends` json NULL,
  `revenueTrends` json NULL,
  `costReductionOpportunities` json NULL,
  `cashFlowForecast` json NULL,
  `analysisNotes` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fa_org_idx` (`organizationId`)
);

-- 17. aiChatSessions
CREATE TABLE IF NOT EXISTS `aiChatSessions` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `title` varchar(255) NULL,
  `messageCount` int NULL DEFAULT 0,
  `lastMessageAt` timestamp NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `acs_user_idx` (`userId`),
  KEY `acs_created_idx` (`createdAt`)
);

-- 18. projectMetrics
CREATE TABLE IF NOT EXISTS `projectMetrics` (
  `id` varchar(64) NOT NULL,
  `projectId` varchar(64) NOT NULL,
  `revenue` int NULL DEFAULT 0,
  `costs` int NULL DEFAULT 0,
  `profit` int NULL DEFAULT 0,
  `profitMargin` int NULL DEFAULT 0,
  `hoursEstimated` int NULL DEFAULT 0,
  `hoursActual` int NULL DEFAULT 0,
  `teamMembersCount` int NULL DEFAULT 0,
  `completionPercentage` int NULL DEFAULT 0,
  `statusKey` varchar(50) NULL DEFAULT 'on-time',
  `riskLevel` enum('low','medium','high') NULL DEFAULT 'low',
  `calculatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pm_project_idx` (`projectId`),
  KEY `pm_risk_idx` (`riskLevel`)
);

-- 19. clientHealthScores
CREATE TABLE IF NOT EXISTS `clientHealthScores` (
  `id` varchar(64) NOT NULL,
  `clientId` varchar(64) NOT NULL,
  `healthScore` int NULL DEFAULT 50,
  `riskLevel` enum('green','yellow','red') NULL DEFAULT 'yellow',
  `paymentTimeliness` int NULL DEFAULT 50,
  `invoiceFrequency` int NULL DEFAULT 50,
  `totalRevenue` int NULL DEFAULT 0,
  `overdueAmount` int NULL DEFAULT 0,
  `projectSuccessRate` int NULL DEFAULT 50,
  `churnRisk` int NULL DEFAULT 0,
  `lifetimeValue` int NULL DEFAULT 0,
  `lastActivityDate` timestamp NULL,
  `calculatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `chs_client_idx` (`clientId`),
  KEY `chs_score_idx` (`healthScore`),
  KEY `chs_risk_idx` (`riskLevel`)
);

-- 20. performanceReviews
CREATE TABLE IF NOT EXISTS `performanceReviews` (
  `id` varchar(64) NOT NULL,
  `employeeId` varchar(64) NOT NULL,
  `reviewerId` varchar(64) NOT NULL,
  `reviewDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `period` varchar(50) NOT NULL,
  `overallRating` int NULL DEFAULT 0,
  `performanceScore` int NULL DEFAULT 0,
  `productivity` int NULL DEFAULT 0,
  `collaboration` int NULL DEFAULT 0,
  `communication` int NULL DEFAULT 0,
  `technicalSkills` int NULL DEFAULT 0,
  `leadership` int NULL DEFAULT 0,
  `comments` text NULL,
  `goals` text NULL,
  `developmentPlan` text NULL,
  `status` enum('draft','completed','archived') NULL DEFAULT 'draft',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pr_employee_idx` (`employeeId`),
  KEY `pr_reviewer_idx` (`reviewerId`),
  KEY `pr_period_idx` (`period`),
  KEY `pr_date_idx` (`reviewDate`)
);

-- 21. skillsMatrix
CREATE TABLE IF NOT EXISTS `skillsMatrix` (
  `id` varchar(64) NOT NULL,
  `employeeId` varchar(64) NOT NULL,
  `skillName` varchar(255) NOT NULL,
  `proficiencyLevel` enum('beginner','intermediate','advanced','expert') NULL DEFAULT 'beginner',
  `yearsOfExperience` int NULL DEFAULT 0,
  `lastAssessmentDate` timestamp NULL,
  `certifications` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sm_employee_idx` (`employeeId`),
  KEY `sm_skill_idx` (`skillName`)
);

-- 22. schedules
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` varchar(64) NOT NULL,
  `employeeId` varchar(64) NOT NULL,
  `taskTitle` varchar(255) NOT NULL,
  `description` text NULL,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `duration` int NULL DEFAULT 0,
  `priority` enum('low','medium','high','urgent') NULL DEFAULT 'medium',
  `status` enum('scheduled','in_progress','completed','cancelled') NULL DEFAULT 'scheduled',
  `assignedTo` varchar(64) NULL,
  `projectId` varchar(64) NULL,
  `recurrencePattern` varchar(100) NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sched_emp_idx` (`employeeId`),
  KEY `sched_start_idx` (`startDate`),
  KEY `sched_status_idx` (`status`)
);

-- 23. vacationRequests
CREATE TABLE IF NOT EXISTS `vacationRequests` (
  `id` varchar(64) NOT NULL,
  `employeeId` varchar(64) NOT NULL,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `daysRequested` int NULL DEFAULT 0,
  `vacationType` enum('vacation','sick_leave','personal','sabbatical') NULL DEFAULT 'vacation',
  `reason` text NULL,
  `status` enum('pending','approved','rejected','cancelled') NULL DEFAULT 'pending',
  `approvedBy` varchar(64) NULL,
  `approvalDate` timestamp NULL,
  `notes` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vr_emp_idx` (`employeeId`),
  KEY `vr_start_idx` (`startDate`),
  KEY `vr_status_idx` (`status`)
);

-- 24. documentVersions
CREATE TABLE IF NOT EXISTS `documentVersions` (
  `id` varchar(64) NOT NULL,
  `documentId` varchar(64) NOT NULL,
  `versionNumber` int NULL DEFAULT 1,
  `fileUrl` varchar(500) NOT NULL,
  `fileSize` int NULL DEFAULT 0,
  `uploadedBy` varchar(64) NOT NULL,
  `changeNotes` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `dv_doc_idx` (`documentId`),
  KEY `dv_version_idx` (`versionNumber`)
);

-- 25. documentAccess
CREATE TABLE IF NOT EXISTS `documentAccess` (
  `id` varchar(64) NOT NULL,
  `documentId` varchar(64) NOT NULL,
  `userId` varchar(64) NULL,
  `roleId` varchar(64) NULL,
  `accessLevel` enum('view','download','edit','share') NULL DEFAULT 'view',
  `grantedBy` varchar(64) NULL,
  `grantedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `da_doc_idx` (`documentId`),
  KEY `da_user_idx` (`userId`)
);

-- 26. notificationRules
CREATE TABLE IF NOT EXISTS `notificationRules` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `channelType` enum('email','in_app','push','sms') NULL DEFAULT 'in_app',
  `doNotDisturbStart` varchar(5) NULL,
  `doNotDisturbEnd` varchar(5) NULL,
  `frequency` enum('instant','daily','weekly','never') NULL DEFAULT 'instant',
  `enabled` tinyint NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `nr_user_idx` (`userId`),
  KEY `nr_event_idx` (`eventType`)
);

-- 27. usageMetrics
CREATE TABLE IF NOT EXISTS `usageMetrics` (
  `id` varchar(64) NOT NULL,
  `subscriptionId` varchar(64) NOT NULL,
  `metricName` varchar(255) NOT NULL,
  `metricValue` int NULL DEFAULT 0,
  `billingAmount` int NULL DEFAULT 0,
  `usagePeriod` varchar(50) NOT NULL,
  `recordedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `um_sub_idx` (`subscriptionId`),
  KEY `um_period_idx` (`usagePeriod`)
);

-- 28. expenseCategories
CREATE TABLE IF NOT EXISTS `expenseCategories` (
  `id` varchar(64) NOT NULL,
  `categoryName` varchar(255) NOT NULL,
  `description` text NULL,
  `taxDeductible` tinyint NULL DEFAULT 1,
  `accountCode` varchar(50) NULL,
  `isActive` tinyint NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ec_name_idx` (`categoryName`),
  KEY `ec_tax_idx` (`taxDeductible`)
);

-- 29. expenseReports
CREATE TABLE IF NOT EXISTS `expenseReports` (
  `id` varchar(64) NOT NULL,
  `submittedBy` varchar(64) NOT NULL,
  `reportDate` timestamp NOT NULL,
  `totalAmount` int NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT 'KES',
  `status` enum('draft','submitted','approved','rejected','reimbursed') NULL DEFAULT 'draft',
  `approvedBy` varchar(64) NULL,
  `approvalDate` timestamp NULL,
  `reimbursementDate` timestamp NULL,
  `notes` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `er_submitter_idx` (`submittedBy`),
  KEY `er_status_idx` (`status`),
  KEY `er_date_idx` (`reportDate`)
);

-- 30. reimbursements
CREATE TABLE IF NOT EXISTS `reimbursements` (
  `id` varchar(64) NOT NULL,
  `expenseReportId` varchar(64) NOT NULL,
  `employeeId` varchar(64) NOT NULL,
  `totalAmount` int NULL DEFAULT 0,
  `currency` varchar(10) NULL DEFAULT 'KES',
  `paymentMethod` varchar(50) NOT NULL,
  `paymentDate` timestamp NULL,
  `referenceNumber` varchar(100) NULL,
  `status` enum('pending','approved','processed','failed') NULL DEFAULT 'pending',
  `notes` text NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reimb_report_idx` (`expenseReportId`),
  KEY `reimb_emp_idx` (`employeeId`),
  KEY `reimb_status_idx` (`status`)
);

-- 31. currencies
CREATE TABLE IF NOT EXISTS `currencies` (
  `id` varchar(64) NOT NULL,
  `code` varchar(3) NOT NULL,
  `name` varchar(100) NOT NULL,
  `symbol` varchar(10) NULL,
  `decimalPlaces` int NULL DEFAULT 2,
  `isActive` tinyint NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `currencies_code_unique` (`code`),
  KEY `curr_code_idx` (`code`),
  KEY `curr_active_idx` (`isActive`)
);

-- 32. exchangeRates
CREATE TABLE IF NOT EXISTS `exchangeRates` (
  `id` varchar(64) NOT NULL,
  `fromCurrency` varchar(3) NOT NULL,
  `toCurrency` varchar(3) NOT NULL,
  `rate` int NULL DEFAULT 0,
  `rateDate` timestamp NOT NULL,
  `source` varchar(100) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `er_pair_idx` (`fromCurrency`, `toCurrency`),
  KEY `er_date_idx` (`rateDate`)
);

-- 33. taxRates
CREATE TABLE IF NOT EXISTS `taxRates` (
  `id` varchar(64) NOT NULL,
  `country` varchar(100) NOT NULL,
  `taxType` enum('vat','gst','sales_tax','income_tax') NULL DEFAULT 'vat',
  `rate` int NULL DEFAULT 0,
  `effectiveDate` timestamp NOT NULL,
  `expiryDate` timestamp NULL,
  `description` text NULL,
  `isActive` tinyint NULL DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tr_country_idx` (`country`),
  KEY `tr_type_idx` (`taxType`),
  KEY `tr_eff_date_idx` (`effectiveDate`)
);

-- 34. forecastModels
CREATE TABLE IF NOT EXISTS `forecastModels` (
  `id` varchar(64) NOT NULL,
  `modelName` varchar(255) NOT NULL,
  `modelType` enum('revenue','expense','headcount','client_churn') NULL DEFAULT 'revenue',
  `algorithm` varchar(100) NULL,
  `accuracy` int NULL DEFAULT 0,
  `trainingDataPoints` int NULL DEFAULT 0,
  `lastTrainedAt` timestamp NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fm_type_idx` (`modelType`),
  KEY `fm_trained_idx` (`lastTrainedAt`)
);

-- 35. forecastResults
CREATE TABLE IF NOT EXISTS `forecastResults` (
  `id` varchar(64) NOT NULL,
  `modelId` varchar(64) NOT NULL,
  `forecastPeriod` varchar(50) NOT NULL,
  `forecastDate` timestamp NOT NULL,
  `predictedValue` int NULL DEFAULT 0,
  `confidenceInterval` int NULL DEFAULT 0,
  `confidenceLower` int NULL DEFAULT 0,
  `confidenceUpper` int NULL DEFAULT 0,
  `actualValue` int NULL,
  `variance` int NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fr_model_idx` (`modelId`),
  KEY `fr_period_idx` (`forecastPeriod`),
  KEY `fr_date_idx` (`forecastDate`)
);

-- 36. apiKeys
CREATE TABLE IF NOT EXISTS `apiKeys` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `keyName` varchar(255) NOT NULL,
  `keyValue` varchar(255) NOT NULL,
  `lastUsedAt` timestamp NULL,
  `expiresAt` timestamp NULL,
  `isActive` tinyint NULL DEFAULT 1,
  `rateLimit` int NULL DEFAULT 1000,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ak_user_idx` (`userId`),
  KEY `ak_key_idx` (`keyValue`),
  KEY `ak_active_idx` (`isActive`)
);

-- 37. webhooks
CREATE TABLE IF NOT EXISTS `webhooks` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `webhookUrl` varchar(500) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `secret` varchar(255) NULL,
  `isActive` tinyint NULL DEFAULT 1,
  `retryCount` int NULL DEFAULT 0,
  `lastTriggeredAt` timestamp NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wh_user_idx` (`userId`),
  KEY `wh_event_idx` (`eventType`),
  KEY `wh_active_idx` (`isActive`)
);

-- 38. integrationLogs
CREATE TABLE IF NOT EXISTS `integrationLogs` (
  `id` varchar(64) NOT NULL,
  `webhookId` varchar(64) NULL,
  `eventType` varchar(100) NOT NULL,
  `payload` text NULL,
  `responseStatus` int NULL,
  `errorMessage` text NULL,
  `attemptNumber` int NULL DEFAULT 1,
  `success` tinyint NULL DEFAULT 0,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `il_webhook_idx` (`webhookId`),
  KEY `il_event_idx` (`eventType`),
  KEY `il_success_idx` (`success`)
);

-- 39. invoiceReminders
CREATE TABLE IF NOT EXISTS `invoiceReminders` (
  `id` varchar(64) NOT NULL,
  `invoiceId` varchar(64) NOT NULL,
  `reminderType` enum('overdue_1day','overdue_3days','overdue_7days','overdue_14days','overdue_30days') NOT NULL,
  `clientEmail` varchar(320) NOT NULL,
  `sentAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `sentBy` varchar(64) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ir_invoice_idx` (`invoiceId`),
  KEY `ir_type_idx` (`reminderType`),
  KEY `ir_sent_idx` (`sentAt`)
);

-- 40. workOrders
CREATE TABLE IF NOT EXISTS `workOrders` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(64) NULL,
  `workOrderNumber` varchar(50) NOT NULL,
  `issueDate` varchar(30) NOT NULL,
  `description` text NOT NULL,
  `assignedTo` varchar(200) NOT NULL,
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `startDate` varchar(30) NOT NULL,
  `targetEndDate` varchar(30) NOT NULL,
  `laborCost` int NOT NULL DEFAULT 0,
  `serviceCost` int NOT NULL DEFAULT 0,
  `total` int NOT NULL DEFAULT 0,
  `notes` text NULL,
  `status` enum('draft','open','in-progress','completed','cancelled') NOT NULL DEFAULT 'draft',
  `createdBy` varchar(64) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wo_org_idx` (`organizationId`),
  KEY `wo_status_idx` (`status`)
);

-- 41. canned_responses
CREATE TABLE IF NOT EXISTS `canned_responses` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(64) NULL,
  `category` varchar(100) NOT NULL DEFAULT 'General',
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `shortCode` varchar(50) NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cr_category` (`category`),
  KEY `idx_cr_org` (`organizationId`)
);

-- ────────────────────────────────────────────────
-- departments: backfill missing columns (safe, conditional)
-- ────────────────────────────────────────────────
SET @d1 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='organizationId');
SET @s1 := IF(@d1=0,'ALTER TABLE `departments` ADD COLUMN `organizationId` varchar(64) NULL AFTER `id`','SELECT 1');
PREPARE p1 FROM @s1; EXECUTE p1; DEALLOCATE PREPARE p1;

SET @d2 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='description');
SET @s2 := IF(@d2=0,'ALTER TABLE `departments` ADD COLUMN `description` text NULL','SELECT 1');
PREPARE p2 FROM @s2; EXECUTE p2; DEALLOCATE PREPARE p2;

SET @d3 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='headId');
SET @s3 := IF(@d3=0,'ALTER TABLE `departments` ADD COLUMN `headId` varchar(64) NULL','SELECT 1');
PREPARE p3 FROM @s3; EXECUTE p3; DEALLOCATE PREPARE p3;

SET @d4 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='budget');
SET @s4 := IF(@d4=0,'ALTER TABLE `departments` ADD COLUMN `budget` int NULL','SELECT 1');
PREPARE p4 FROM @s4; EXECUTE p4; DEALLOCATE PREPARE p4;

SET @d5 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='status');
SET @s5 := IF(@d5=0,"ALTER TABLE `departments` ADD COLUMN `status` enum('active','inactive') NULL DEFAULT 'active'",'SELECT 1');
PREPARE p5 FROM @s5; EXECUTE p5; DEALLOCATE PREPARE p5;

SET @d6 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='createdBy');
SET @s6 := IF(@d6=0,'ALTER TABLE `departments` ADD COLUMN `createdBy` varchar(64) NULL','SELECT 1');
PREPARE p6 FROM @s6; EXECUTE p6; DEALLOCATE PREPARE p6;

SET @d7 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='createdAt');
SET @s7 := IF(@d7=0,'ALTER TABLE `departments` ADD COLUMN `createdAt` timestamp NULL','SELECT 1');
PREPARE p7 FROM @s7; EXECUTE p7; DEALLOCATE PREPARE p7;

SET @d8 := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='departments' AND column_name='updatedAt');
SET @s8 := IF(@d8=0,'ALTER TABLE `departments` ADD COLUMN `updatedAt` timestamp NULL','SELECT 1');
PREPARE p8 FROM @s8; EXECUTE p8; DEALLOCATE PREPARE p8;

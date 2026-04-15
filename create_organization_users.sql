-- Migration: Create organizationUsers table
-- Run this inside the Docker environment: docker exec -i <db_container> mysql -u<user> -p<pass> melitech_crm < create_organization_users.sql

CREATE TABLE IF NOT EXISTS `organizationUsers` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `role` enum('super_admin','admin','manager','staff','viewer') NOT NULL DEFAULT 'staff',
  `position` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `photoUrl` longtext DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `invitationSent` tinyint NOT NULL DEFAULT 0,
  `invitationSentAt` timestamp NULL DEFAULT NULL,
  `invitationAcceptedAt` timestamp NULL DEFAULT NULL,
  `lastSignedIn` timestamp NULL DEFAULT NULL,
  `loginCount` int DEFAULT 0,
  `createdBy` varchar(64) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orgusers_org` (`organizationId`),
  KEY `idx_orgusers_email` (`email`),
  KEY `idx_orgusers_role` (`role`),
  KEY `idx_orgusers_active` (`isActive`),
  KEY `idx_orgusers_created_by` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

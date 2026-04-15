-- ============================================================================
-- Migration 0034: Clean up permissions table reference
-- ============================================================================

-- The permissions table is not actively used in the current schema
-- RBAC permissions are managed via rolePermissions and userPermissions tables
-- This migration ensures schema consistency

-- Drop the orphaned permissions table if it exists
DROP TABLE IF EXISTS `permissions`;

-- ============================================================================
-- End Migration 0034
-- ============================================================================

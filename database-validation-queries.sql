/**
 * Melitech CRM - Database Validation SQL Queries
 * Run these queries directly in MySQL to validate data consistency
 * 
 * Copy each section and run in: mysql -u melitech_user -p melitech_crm
 */

-- ============================================================================
-- 1. TABLE EXISTENCE CHECK
-- ============================================================================
-- Shows all tables in the database with row counts and size
SELECT 
    table_name,
    table_rows,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
    table_type,
    engine
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
ORDER BY table_rows DESC;

-- ============================================================================
-- 2. SCHEMA VALIDATION - Column Count by Table
-- ============================================================================
-- Verifies each table has minimum required columns
SELECT 
    table_name,
    COUNT(*) as column_count,
    GROUP_CONCAT(column_name ORDER BY ordinal_position) as columns
FROM information_schema.COLUMNS
WHERE table_schema = DATABASE()
GROUP BY table_name
ORDER BY column_count DESC;

-- ============================================================================
-- 3. DATA INTEGRITY CHECKS
-- ============================================================================

-- A. Check for orphaned invoice items (items without invoices)
SELECT 
    'Invoice Items Integrity' as check_name,
    COUNT(*) as orphan_count,
    'FAIL' as status
FROM invoiceItems 
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoiceItems.invoiceId)
UNION ALL
SELECT 
    'Invoice Items Integrity',
    0,
    'PASS'
FROM (SELECT 1) t
WHERE NOT EXISTS (
    SELECT 1 FROM invoiceItems 
    WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoiceItems.invoiceId)
);

-- B. Check for orphaned payment records
SELECT 
    'Orphaned Payments' as check_name,
    COUNT(*) as orphan_count,
    'FAIL' as status
FROM payments 
WHERE invoiceId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoiceId)
UNION ALL
SELECT 
    'Orphaned Payments',
    0,
    'PASS'
FROM (SELECT 1) t
WHERE NOT EXISTS (
    SELECT 1 FROM payments 
    WHERE invoiceId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoiceId)
);

-- C. Check NULL values in critical fields
SELECT 
    'Users - NULL Emails' as issue_type,
    COUNT(*) as null_count
FROM users
WHERE email IS NULL
UNION ALL
SELECT 
    'Invoices - NULL Client' as issue_type,
    COUNT(*) as null_count
FROM invoices
WHERE clientId IS NULL
UNION ALL
SELECT 
    'Products - NULL SKU' as issue_type,
    COUNT(*) as null_count
FROM products
WHERE sku IS NULL OR sku = '';

-- D. Invoice calculation validation (subtotal - discount + tax = total)
SELECT 
    COUNT(*) as calculation_errors,
    'FAIL' as status
FROM invoices
WHERE (subtotal - discountAmount + taxAmount) <> total
UNION ALL
SELECT 
    0 as calculation_errors,
    'PASS' as status
FROM (SELECT 1) t
WHERE NOT EXISTS (
    SELECT 1 FROM invoices
    WHERE (subtotal - discountAmount + taxAmount) <> total
);

-- E. Payment tracking validation
SELECT 
    invoiceId,
    total,
    SUM(amount) as total_paid,
    (total - SUM(amount)) as balance_due,
    status
FROM (
    SELECT 
        i.id as invoiceId,
        i.total,
        p.amount,
        i.status
    FROM invoices i
    LEFT JOIN payments p ON i.id = p.invoiceId AND p.status = 'successful'
) temp
GROUP BY invoiceId, total, status
HAVING balance_due > 0
ORDER BY balance_due DESC
LIMIT 20;

-- ============================================================================
-- 4. RELATIONSHIP VALIDATION
-- ============================================================================

-- A. Employee-Department relationships
SELECT 
    d.id,
    d.departmentName,
    COUNT(e.id) as employee_count
FROM departments d
LEFT JOIN employees e ON d.id = e.department
GROUP BY d.id, d.departmentName
ORDER BY employee_count DESC;

-- B. Client-Invoice relationships
SELECT 
    c.id,
    c.companyName,
    COUNT(i.id) as invoice_count,
    SUM(i.total) as total_invoiced
FROM clients c
LEFT JOIN invoices i ON c.id = i.clientId
GROUP BY c.id, c.companyName
ORDER BY total_invoiced DESC
LIMIT 20;

-- C. Project-Task relationships
SELECT 
    p.id,
    p.projectName,
    COUNT(pt.id) as task_count,
    COUNT(DISTINCT pt.assignedTo) as assigned_members
FROM projects p
LEFT JOIN projectTasks pt ON p.id = pt.projectId
GROUP BY p.id, p.projectName
ORDER BY task_count DESC;

-- ============================================================================
-- 5. DATA CONSISTENCY CHECKS
-- ============================================================================

-- A. Budget spending analysis (Expenses vs Budget)
SELECT 
    b.id,
    b.name,
    b.budgetAmount,
    COALESCE(SUM(e.amount), 0) as total_spent,
    b.status,
    ROUND((COALESCE(SUM(e.amount), 0) / b.budgetAmount * 100), 2) as percent_spent
FROM budgets b
LEFT JOIN expenses e ON b.id = e.budgetId AND e.status = 'approved'
GROUP BY b.id, b.name, b.budgetAmount, b.status
ORDER BY percent_spent DESC;

-- B. Leave request status distribution
SELECT 
    status,
    COUNT(*) as request_count,
    ROUND(COUNT(*) / (SELECT COUNT(*) FROM leaveRequests) * 100, 2) as percent
FROM leaveRequests
GROUP BY status;

-- C. Attendance rate by department
SELECT 
    d.departmentName,
    COUNT(DISTINCT a.employeeId) as total_employees,
    COUNT(a.id) as attendance_records,
    ROUND(COUNT(a.id) / COUNT(DISTINCT a.employeeId), 2) as avg_records_per_employee
FROM departments d
LEFT JOIN employees e ON d.id = e.department
LEFT JOIN attendance a ON e.id = a.employeeId
GROUP BY d.departmentName
ORDER BY avg_records_per_employee DESC;

-- ============================================================================
-- 6. DUPLICATE & CONSTRAINT CHECKS
-- ============================================================================

-- A. Check for duplicate product SKUs
SELECT 
    sku,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(id) as product_ids
FROM products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY sku
HAVING COUNT(*) > 1;

-- B. Check for duplicate user emails
SELECT 
    email,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(id) as user_ids
FROM users
WHERE email IS NOT NULL AND email != ''
GROUP BY email
HAVING COUNT(*) > 1;

-- C. Check for duplicate invoice numbers
SELECT 
    invoiceNumber,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(id) as invoice_ids
FROM invoices
WHERE invoiceNumber IS NOT NULL AND invoiceNumber != ''
GROUP BY invoiceNumber
HAVING COUNT(*) > 1;

-- ============================================================================
-- 7. PERFORMANCE & INDEX ANALYSIS
-- ============================================================================

-- A. Show all indexes (excluding PRIMARY)
SELECT 
    table_name,
    index_name,
    column_name,
    seq_in_index as position,
    non_unique,
    cardinality
FROM information_schema.STATISTICS
WHERE table_schema = DATABASE() 
    AND index_name != 'PRIMARY'
ORDER BY table_name, index_name, seq_in_index;

-- B. Show tables without indexes (excluding primary key)
SELECT 
    t.table_name,
    'NO INDEXES' as warning
FROM information_schema.TABLES t
LEFT JOIN information_schema.STATISTICS s ON t.table_schema = s.table_schema 
    AND t.table_name = s.table_name 
    AND s.index_name != 'PRIMARY'
WHERE t.table_schema = DATABASE() 
    AND s.index_name IS NULL
ORDER BY t.table_name;

-- ============================================================================
-- 8. DATA FRESHNESS CHECK
-- ============================================================================

-- A. Recently created records (last 24 hours)
SELECT 
    'Users' as entity,
    COUNT(*) as recent_count
FROM users
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
UNION ALL
SELECT 
    'Invoices',
    COUNT(*)
FROM invoices
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
UNION ALL
SELECT 
    'Payments',
    COUNT(*)
FROM payments
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
UNION ALL
SELECT 
    'Expenses',
    COUNT(*)
FROM expenses
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- B. Overall data freshness
SELECT 
    table_name,
    MAX(createdAt) as last_insert_time,
    NOW() as current_time,
    TIMESTAMPDIFF(DAY, MAX(createdAt), NOW()) as days_since_insert
FROM (
    SELECT 'users' as table_name, createdAt FROM users
    UNION ALL SELECT 'invoices', createdAt FROM invoices
    UNION ALL SELECT 'payments', createdAt FROM payments
    UNION ALL SELECT 'expenses', createdAt FROM expenses
    UNION ALL SELECT 'products', createdAt FROM products
    UNION ALL SELECT 'employees', createdAt FROM employees
) data
WHERE createdAt IS NOT NULL
GROUP BY table_name
ORDER BY last_insert_time DESC;

-- ============================================================================
-- 9. ENTITY-SPECIFIC VALIDATIONS
-- ============================================================================

-- A. Payroll data validation (check allowances/deductions structure)
SELECT 
    p.id,
    e.firstName,
    e.lastName,
    p.basicSalary,
    p.allowances,
    p.deductions,
    p.tax,
    p.netSalary,
    p.status
FROM payroll p
LEFT JOIN employees e ON p.employeeId = e.id
ORDER BY p.createdAt DESC
LIMIT 20;

-- B. Service template utilization
SELECT 
    COUNT(*) as total_templates,
    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_templates,
    COUNT(DISTINCT createdBy) as created_by_count
FROM serviceTemplates;

-- C. Product stock levels
SELECT 
    name,
    sku,
    stockQuantity,
    minStockLevel,
    CASE 
        WHEN stockQuantity <= minStockLevel THEN 'LOW STOCK'
        WHEN stockQuantity <= (minStockLevel * 1.5) THEN 'MONITOR'
        ELSE 'OK'
    END as stock_status,
    costPrice,
    unitPrice,
    ROUND(((unitPrice - costPrice) / costPrice * 100), 2) as profit_margin_percent
FROM products
ORDER BY stockQuantity ASC;

-- ============================================================================
-- 10. SYSTEM HEALTH SUMMARY
-- ============================================================================

-- Overall database health check
SELECT 
    'ENTITY COUNTS' as category,
    JSON_OBJECT(
        'users', (SELECT COUNT(*) FROM users),
        'clients', (SELECT COUNT(*) FROM clients),
        'employees', (SELECT COUNT(*) FROM employees),
        'invoices', (SELECT COUNT(*) FROM invoices),
        'payments', (SELECT COUNT(*) FROM payments),
        'products', (SELECT COUNT(*) FROM products),
        'expenses', (SELECT COUNT(*) FROM expenses),
        'projects', (SELECT COUNT(*) FROM projects)
    ) as data;

-- Database metrics summary
SELECT 
    'DATABASE METRICS' as metric,
    CONCAT(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), ' MB') as total_size,
    SUM(table_rows) as total_records
FROM information_schema.TABLES
WHERE table_schema = DATABASE();

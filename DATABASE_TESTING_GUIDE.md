# Melitech CRM - Database Testing & Validation Guide

## Overview

This guide provides comprehensive instructions for testing the Melitech CRM database infrastructure. The platform uses MySQL 8.0 with 29 business entities across financial, HR, operations, sales, and procurement domains.

## Database Architecture

### Connection Details
- **Database Name:** `melitech_crm`
- **Database User:** `melitech_user`
- **Port:** 3306 (Docker) or 3307 (Local if exposed)
- **Engine:** MySQL 8.0
- **Total Entities:** 29 tables
- **ORM:** Drizzle ORM

### Entity Categories

**Financial (7 entities:**
- invoices, invoiceItems, payments, estimates, estimateItems, expenses, budgets
- accounts, journalEntries, journalEntryLines
- bankAccounts, bankTransactions

**HR & Payroll (5 entities)**
- employees, departments, jobGroups
- leaveRequests, attendance
- payroll

**Operations & Projects (7 entities)**
- projects, projectTasks, projectMilestones
- workOrders, workOrderMaterials
- timeEntries, serviceTemplates
- serviceInvoices, tickets

**Sales & CRM (3 entities)**
- clients, opportunities, products

**System & Administrative (5 entities)**
- users, roles, userRoles, rolePermissions
- userPermissions, subscriptions
- activityLog, notifications

---

## Method 1: Docker-Based Testing (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ available RAM
- Ports 3307 (MySQL) and 3000 (App) available

### Step 1: Start the Database Container

```bash
# Navigate to project root
cd e:\melitech_crm

# Start MySQL container (via Docker Compose)
docker-compose up -d db

# Verify MySQL is running (wait 10-15 seconds for startup)
docker ps | grep melitech_crm_db

# Check logs for startup completion
docker logs melitech_crm_db --tail 20
```

### Step 2: Run Automated Database Tests

```bash
# Set the Docker database connection
$env:DATABASE_URL="mysql://melitech_user:tjwzT9pW;NGYq1QxSq0B@db:3306/melitech_crm"

# Run comprehensive test suite (tests all 29 entities)
npm run test:db

# This will generate: database-test-report.json
```

### Step 3: View Test Results

```bash
# View test report in JSON format
type database-test-report.json | ConvertFrom-Json | ConvertTo-Json -Depth 3

# Or open in your text editor
code database-test-report.json
```

### Step 4: Run SQL Validation Queries (Optional)

Connect to the database and run validation queries:

```bash
# Connect to MySQL in Docker container
docker exec -it melitech_crm_db mysql -u melitech_user -p melitech_crm

# Password: tjwzT9pW;NGYq1QxSq0B

# Then run queries from database-validation-queries.sql
```

---

## Method 2: Manual SQL Testing

If you have MySQL client installed locally and can access the database:

### Prerequisites
- MySQL 8.0+ client installed
- Access to the database (via Docker or local MySQL instance)

### Step 1: Connect to Database

```bash
# If using Docker with port forwarding (3307:3306)
mysql -h localhost -P 3307 -u melitech_user -p melitech_crm

# If using direct Docker container access
docker exec -it melitech_crm_db mysql -u melitech_user -p melitech_crm

# Password: tjwzT9pW;NGYq1QxSq0B
```

### Step 2: Run Validation Queries

All validation queries are in `database-validation-queries.sql`. Copy and paste sections:

**A. Table Existence Check** (Section 1)
```sql
SELECT 
    table_name,
    table_rows,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
    table_type,
    engine
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
ORDER BY table_rows DESC;
```

**B. Data Integrity Checks** (Section 3)
```sql
-- Check for orphaned invoice items
SELECT COUNT(*) as orphan_count
FROM invoiceItems 
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoiceItems.invoiceId);

-- Check for NULL values in critical fields
SELECT 
    'Users - NULL Emails' as issue_type,
    COUNT(*) as null_count
FROM users
WHERE email IS NULL;

-- Invoice calculation validation
SELECT COUNT(*) as calculation_errors
FROM invoices
WHERE (subtotal - discountAmount + taxAmount) <> total;
```

**C. Relationship Validation** (Section 4)
```sql
-- Employee-Department relationships
SELECT 
    d.departmentName,
    COUNT(e.id) as employee_count
FROM departments d
LEFT JOIN employees e ON d.id = e.department
GROUP BY d.departmentName;

-- Client-Invoice relationships
SELECT 
    c.companyName,
    COUNT(i.id) as invoice_count,
    SUM(i.total) as total_invoiced
FROM clients c
LEFT JOIN invoices i ON c.id = i.clientId
GROUP BY c.companyName
ORDER BY total_invoiced DESC;
```

**D. System Health Summary** (Section 10)
```sql
-- Overall entity counts
SELECT 
    'users' as entity, COUNT(*) as count FROM users
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'employees', COUNT(*) FROM employees;
```

---

## Method 3: Database Health Check Script

### Run Quick Health Check

```bash
# Update script to use proper syntax
npm run db:health

# Or run comprehensive test
npm run db:diagnose
```

---

## Test Coverage - All 29 Entities

The automated test suite validates:

### ✅ Table Existence & Structure
- Verifies all 29 tables exist in database
- Checks minimum column requirements for each table
- Validates data types match schema definitions

### ✅ Data Integrity
- Orphaned record detection (e.g., invoice items without invoices)
- NULL value validation in critical fields
- Amount calculation consistency (invoices: subtotal - discount + tax = total)
- Duplicate detection (SKUs, emails, invoice numbers)

### ✅ Relationships
- Foreign key constraint validation
- Employee-Department associations
- Client-Invoice relationships
- Project-Task hierarchies

### ✅ CRUD Operations
- Create: Insert test records successfully
- Read: Retrieve data from database
- Update: Modify records
- Delete: Remove records cleanly

### ✅ Performance Metrics
- Database size calculation
- Row count per table (top 20)
- Index availability and optimization
- Foreign key and unique constraint counts

### ✅ Constraints & Indexes
- Foreign key constraint count
- Unique constraint validation
- Index optimization analysis

---

## Expected Test Results

### PASS Status Requirements

**All 37+ test categories should PASS for healthy database:**

1. ✅ Database Connection - Can establish MySQL connection
2. ✅ Table Structure (29 tables) - All tables exist with proper columns
3. ✅ Data Integrity - No orphaned records, NULL values only in nullable fields
4. ✅ Relationship Validation - Proper foreign key relationships
5. ✅ CRUD Operations - All basic operations functional
6. ✅ Database Metrics - Size, row counts calculated
7. ✅ Constraints - Foreign keys and unique constraints defined
8. ✅ Invoice Calculations - Math formulas consistent
9. ✅ Payment Tracking - All payments properly linked to invoices
10. ✅ Employee Records - All critical HR fields populated

### Common Issues to Troubleshoot

| Issue | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Database not running | Start Docker container: `docker-compose up -d db` |
| `Access denied for user` | Wrong password | Check DATABASE_URL in .env.local-auth |
| `Table doesn't exist` | Migrations not run | Run: `npm run db:push` |
| `Orphaned records found` | Data integrity issue | Review and clean up broken relationships |
| `NULL in critical fields` | Incomplete data entry | Validate form submissions |
| `Duplicate SKU/Email` | Constraint violation | Identify and merge duplicates |

---

## Database Validation Checklist

### Pre-Production Validation

- [ ] All 29 tables exist with correct structure
- [ ] No orphaned records in any relationship
- [ ] No unexpected NULL values in critical fields
- [ ] Invoice calculations are consistent
- [ ] Payment records linked to correct invoices
- [ ] Employee records have valid department assignments
- [ ] Product SKUs are unique
- [ ] User emails are unique
- [ ] No duplicate invoices
- [ ] All indexes optimized for performance
- [ ] Foreign key constraints enforced
- [ ] Database size is reasonable (< 500MB for normal operations)
- [ ] CRUD operations all successful
- [ ] Data freshness check passed (recent records present)

---

## Running Specific Test Scenarios

### Scenario 1: Quick Health Check (2 minutes)

```bash
npm run db:health
```

Tests: Connection only
Result: Confirms database is reachable

### Scenario 2: Full Validation (5 minutes)

```bash
npm run test:db
```

Tests: Everything (connection, structure, integrity, CRUD, metrics, constraints)
Result: Comprehensive report in `database-test-report.json`

### Scenario 3: Data Integrity Focus (3 minutes)

Run these SQL queries from `database-validation-queries.sql` Section 3:
- Orphaned records check
- NULL value validation
- Calculation consistency
- Duplicate detection

### Scenario 4: Performance Analysis (2 minutes)

Run SQL queries from Section 7 & 10:
- Index analysis
- Database metrics
- Row count distribution

---

## Integration with CI/CD

### GitHub Actions

```yaml
# Add to .github/workflows/ci-cd.yml
- name: Test Database
  env:
    DATABASE_URL: mysql://melitech_user:password@localhost:3306/melitech_crm
  run: npm run test:db
  
- name: Archive Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: database-test-report
    path: database-test-report.json
```

### Local Pre-commit Hook

```bash
# Create .husky/pre-commit
#!/bin/sh
npm run test:db
exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "Database test failed"
  exit 1
fi
```

---

## Monitoring & Ongoing Validation

### Weekly Health Check

```bash
# Run every Monday to ensure database integrity
npm run db:diagnose > db-weekly-check.log
```

### Monthly Full Validation

```bash
# Full test suite with detailed metrics
npm run test:db
# Store result: cp database-test-report.json reports/$(date +%Y-%m-%d)-report.json
```

### Real-time Monitoring

Check database logs for errors:

```bash
# View MySQL error log
docker exec melitech_crm_db tail -f /var/log/mysql/error.log

# Check slow query log
docker exec melitech_crm_db mysql -u melitech_user -pTHOMPSON \
  -e "SELECT * FROM mysql.slow_log LIMIT 10;"
```

---

## Performance Optimization

After testing confirms database health, optimize with:

### Add Missing Indexes

```sql
-- If test report shows missing indexes
CREATE INDEX idx_invoices_clientId ON invoices(clientId);
CREATE INDEX idx_payments_invoiceId ON payments(invoiceId);
CREATE INDEX idx_expenses_budgetId ON expenses(budgetId);
```

### Analyze Table Statistics

```sql
ANALYZE TABLE invoices;
ANALYZE TABLE payments;
ANALYZE TABLE products;
ANALYZE TABLE employees;
```

### Monitor Slow Queries

```bash
# Enable slow query log (10 second threshold)
mysql -u melitech_user -p melitech_crm \
  -e "SET GLOBAL long_query_time=10; SET GLOBAL log_queries_not_using_indexes=ON;"
```

---

## Troubleshooting Guide

### Problem: "Database connection refused"

```bash
# Check if container is running
docker ps | grep melitech_crm_db

# Start if not running
docker-compose up -d db

# Wait 15 seconds and retry
sleep 15
npm run test:db
```

### Problem: "Each database connection is limited to 1 prepared statement"

```bash
# Update database connection string to include preparationTimeout
DATABASE_URL="mysql://user:pass@host/db?preparationTimeout=60000"
```

### Problem: "Table doesn't exist" during test

```bash
# Run migrations
npm run db:push

# Verify migrations ran
npm run db:health
```

### Problem: "Duplicate entry" errors

```bash
# Identify duplicates
mysql> SELECT sku, COUNT(*) as count
       FROM products
       GROUP BY sku
       HAVING count > 1;

# Remove duplicates
mysql> DELETE FROM products WHERE id NOT IN (
         SELECT MAX(id) FROM products GROUP BY sku
       );
```

---

## Test Report Interpretation

### Sample Report Structure

```json
{
  "timestamp": "2024-03-15T10:30:00Z",
  "summary": {
    "totalTests": 37,
    "passed": 35,
    "failed": 2,
    "warned": 0,
    "status": "FAIL"
  },
  "results": [
    {
      "name": "Database Connection",
      "status": "PASS",
      "message": "Successfully connected to MySQL database"
    },
    {
      "name": "Table: invoices",
      "status": "PASS",
      "message": "Found with 19 columns (expected min: 19)"
    },
    {
      "name": "Orphaned Records (Invoices)",
      "status": "WARN",
      "message": "2 orphaned items found"
    }
  ]
}
```

### Status Meanings

- **PASS** - Test successful, no issues
- **WARN** - Test passed but with minor issues to review
- **FAIL** - Test failed, requires investigation

---

## Automation Tips

### Run Full Suite Daily

```bash
# Create batch file: run-db-tests.bat

@echo off
echo === Melitech CRM Database Tests ===
npm run test:db > "reports/db-test-%date:~10,4%%date:~4,2%%date:~7,2%.log"
echo Tests completed. Results saved to reports folder.
```

### Export Results to Analytics

```bash
# After test completion
node -e "
const report = require('./database-test-report.json');
console.log('Database Health Score: ' + 
  Math.round((report.summary.passed / report.summary.totalTests) * 100) + '%'
);
"
```

---

## Key Metrics to Track

Monitor these metrics over time:

1. **Database Size ** - Should grow predictably with data volume
2. **Row Counts** - By entity, should increase with business activity
3. **Test Pass Rate** - Should remain at 100%
4. **CRUD Operation Time** - Should be < 500ms for each operation
5. **Query Performance** - Monitor slow queries in logs

---

## Support & Additional Resources

For more information:

- **Drizzle ORM Docs:** https://orm.drizzle.team/
- **MySQL 8.0 Docs:** https://dev.mysql.com/doc/
- **Docker Compose Reference:** https://docs.docker.com/compose/
- **Platform Audit:** See `COMPLETE_PLATFORM_AUDIT_SUMMARY.md`

---

**Last Updated:** March 15, 2024
**Test Suite Version:** 1.0
**Entities Tested:** 29/29

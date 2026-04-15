# Melitech CRM Database Testing - Quick Reference Card

## 🚀 Quick Start (2 minutes)

### Option A: PowerShell (Easiest)
```powershell
cd e:\melitech_crm
./test-database.ps1 -Mode full
```

### Option B: Direct NPM
```bash
cd e:\melitech_crm
$env:DATABASE_URL="mysql://melitech_user:tjwzT9pW;NGYq1QxSq0B@db:3306/melitech_crm"
npm run test:db
```

### Option C: Docker + Manual
```bash
# Start database
docker-compose up -d db

# Wait 15 seconds

# Run test
npm run test:db
```

---

## 📊 Test Modes Available

| Mode | Time | What It Tests | Command |
|------|------|---------------|---------|
| **health** | 2 min | Connection only | `./test-database.ps1 -Mode health` |
| **full** | 5 min | Everything (DEFAULT) | `./test-database.ps1 -Mode full` or `npm run test:db` |
| **integrity** | 3 min | Data consistency | `./test-database.ps1 -Mode integrity` |
| **performance** | 2 min | Size, indexes, metrics | `./test-database.ps1 -Mode performance` |

---

## 📋 What Gets Tested (29 Entities)

### ✅ Test Categories
1. **Database Connection** - Can connect to MySQL
2. **Table Structure** - All 29 tables exist with correct columns
3. **Data Integrity** - No orphaned records, correct calculations
4. **CRUD Operations** - Insert, Select, Update, Delete works
5. **Database Metrics** - Size, row counts, freshness
6. **Constraints** - Foreign keys and unique indexes

### 🗂️ Entities Covered
- **Financial:** invoices, payments, estimates, expenses, budgets (12 tables)
- **HR/Payroll:** employees, departments, leaveRequests, attendance, payroll (6 tables)
- **Operations:** projects, workorders, serviceInvoices, timeEntries (9 tables)
- **Sales:** clients, opportunities, products (2 tables)
- **System:** users, roles, tickets, subscriptions (5 tables)

---

## 📈 Reading Test Results

### Success ✅
```
✅ All 37 tests PASSED
Status: PASS
Action: None - database is healthy
```

### Warning ⚠️
```
⚠️ 2 tests WARNED (non-critical issues)
Found 2 orphaned invoice items
Action: Review and clean up manually
```

### Failure ❌
```
❌ 3 tests FAILED (critical issues)
Table 'invoices' does not exist
Action: Fix immediately - run migrations
```

---

## 🔍 View Results

### Full Report (JSON)
```bash
type database-test-report.json
```

### Key Metrics
```bash
# Count passes in report
(Get-Content database-test-report.json | ConvertFrom-Json).summary
```

### Sample Output
```json
{
  "totalTests": 37,
  "passed": 35,
  "failed": 0,
  "warned": 2,
  "status": "PASS"
}
```

---

## 🛠️ Troubleshooting

### Error: ECONNREFUSED
```bash
# Database not running, start it
docker-compose up -d db

# Wait 15 seconds
sleep 15

# Try again
npm run test:db
```

### Error: Table doesn't exist
```bash
# Migrations haven't run, apply them
npm run db:push

# Then run test
npm run test:db
```

### Error: Access denied
```bash
# Wrong password/user in DATABASE_URL
# Check .env.local-auth for correct credentials
# Try with explicit URL:
$env:DATABASE_URL="mysql://melitech_user:PASSWORD@host:port/melitech_crm"
npm run test:db
```

### Error: Docker not running
```bash
# Start Docker Desktop, then:
docker-compose up -d db
npm run test:db
```

---

## 📚 Detailed Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| **DATABASE_TESTING_GUIDE.md** | Complete how-to guide with all methods | `/DATABASE_TESTING_GUIDE.md` |
| **DATABASE_TEST_SUMMARY.md** | This implementation summary | `/DATABASE_TEST_SUMMARY.md` |
| **database-validation-queries.sql** | 100+ copy-paste SQL queries | `/database-validation-queries.sql` |
| **test-database.ts** | Automated test code | `/test-database.ts` |
| **test-database.ps1** | PowerShell launcher | `/test-database.ps1` |

---

## 🎯 Common Tasks

### Run Health Check Only
```bash
npm run db:health
```

### Run Full Validation
```bash
npm run test:db
```

### Stop Database Container
```bash
docker-compose down
```

### View Database Logs
```bash
docker logs melitech_crm_db -f
```

### Connect to Database Directly
```bash
# Via Docker
docker exec -it melitech_crm_db mysql -u melitech_user -p melitech_crm

# Via local client (if port 3307 exposed)
mysql -h localhost -P 3307 -u melitech_user -p melitech_crm
```

### Run Specific SQL Query
```bash
mysql -h localhost -P 3307 -u melitech_user -p melitech_crm \
  -e "SELECT COUNT(*) FROM invoices;"
```

---

## 📊 Health Score Interpretation

```
Score | Status | Action
------|--------|--------
95-100% | ✅ Excellent | Ready for production
85-94% | ⚠️ Good | Review warnings
< 85% | ❌ Poor | Fix failures before deploy
```

### Calculate Your Score
```
Passed Tests / Total Tests × 100
Example: 35 / 37 × 100 = 94.6% (Good)
```

---

## ⏱️ Expected Execution Times

| Operation | Time | Notes |
|-----------|------|-------|
| Start Docker | 30s | First time only, ~5s after |
| Run health check | 2 min | Connection test only |
| Run full suite | 5 min | Tests all 29 entities |
| Run integrity tests | 3 min | Data consistency focus |
| SQL queries (manual) | 30s | Per query execution |
| Generate report | 1 min | Automatic with test suite |

---

## 🔐 Database Credentials

**Development Credentials** (from .env.local-auth)
```
User: melitech_user
Password: twMH*4dFIQRoT35D@@Xg
Database: melitech_crm
Host: db (Docker) or localhost (local)
Port: 3306 (Docker) or 3307 (exposed)
```

**⚠️ IMPORTANT:** Change all credentials in production!

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] Run full test suite: `npm run test:db`
- [ ] Confirm status: **PASS** (≥95% health score)
- [ ] Review any WARN items
- [ ] No FAIL items present
- [ ] All 29 tables verified
- [ ] All CRUD operations work
- [ ] Data integrity confirmed
- [ ] Database size reasonable (< 500MB)

---

## 🆘 Getting Help

| Issue | Solution | Link |
|-------|----------|------|
| How do I run tests? | See DATABASE_TESTING_GUIDE.md Method 1-3 | `/DATABASE_TESTING_GUIDE.md` |
| What do results mean? | See the "Test Report Interpretation" section | `/DATABASE_TESTING_GUIDE.md#test-report-interpretation` |
| Database won't connect | See troubleshooting guide | `/DATABASE_TESTING_GUIDE.md#troubleshooting-guide` |
| Need more details? | Full implementation summary | `/DATABASE_TEST_SUMMARY.md` |
| Need SQL queries? | Copy from validation file | `/database-validation-queries.sql` |

---

## 🎓 What You Need to Know

1. **Tests validate backend data storage** - Database has all required tables and data integrity
2. **29 entities tested** - All business objects from financial to HR to operations
3. **Automated & manual options** - Use test suite OR run SQL queries yourself
4. **Reports are JSON** - Parse programmatically or read as text
5. **Docker recommended** - Easiest way to test locally
6. **Pre-production required** - Must pass before deployment

---

## 📞 Quick Command Reference

```bash
# Start everything
docker-compose up -d db && npm run test:db

# Just health check
npm run db:health

# Full test
npm run test:db

# Stop database
docker-compose down

# View results
type database-test-report.json

# Get help
./test-database.ps1 -Help
```

---

**Last Updated:** March 15, 2024  
**Platform:** Melitech CRM  
**Entities Tested:** 29/29  
**Status:** ✅ Ready to Use

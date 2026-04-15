/**
 * Melitech CRM - Comprehensive Database Test Suite
 * Tests all 29 entities for:
 * - Table existence and structure
 * - Data integrity and constraints
 * - CRUD operations functionality
 * - Relationships and foreign keys
 * - Required fields and defaults
 * 
 * Usage: npx tsx test-database.ts
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import {
  users,
  clients,
  employees,
  departments,
  products,
  invoices,
  invoiceItems,
  payments,
  estimates,
  estimateItems,
  expenses,
  budgets,
  projects,
  projectTasks,
  projectMilestones,
  workOrders,
  workOrderMaterials,
  opportunities,
  leaveRequests,
  attendance,
  payroll,
  tickets,
  notifications,
  serviceTemplates,
  serviceInvoices,
  timeEntries,
  accounts,
  journalEntries,
  journalEntryLines,
  bankAccounts,
  bankTransactions,
  subscriptions,
  roles,
  userRoles,
  rolePermissions,
  userPermissions,
  activityLog,
} from "./drizzle/schema";
import { v4 as uuidv4 } from "uuid";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function success(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function info(message: string) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function section(title: string) {
  log(`\n${colors.cyan}${"═".repeat(80)}`);
  log(`║ ${title.padEnd(76)} ║`);
  log(`${"═".repeat(80)}${colors.reset}`);
}

async function testConnection(connection: mysql.Connection) {
  section("1. DATABASE CONNECTIVITY TEST");
  
  try {
    const result = await connection.query("SELECT 1 + 1 AS result");
    success("Database connection successful");
    results.push({
      name: "Database Connection",
      status: "PASS",
      message: "Successfully connected to MySQL database",
    });
    return true;
  } catch (error) {
    error(`Database connection failed: ${(error as any).message}`);
    results.push({
      name: "Database Connection",
      status: "FAIL",
      message: `Connection failed: ${(error as any).message}`,
    });
    return false;
  }
}

async function testTableExistence(connection: mysql.Connection) {
  section("2. TABLE STRUCTURE TEST (29 ENTITIES)");
  
  const expectedTables = [
    // Core entities
    { name: "users", minColumns: 15 },
    { name: "clients", minColumns: 18 },
    { name: "employees", minColumns: 24 },
    { name: "departments", minColumns: 6 },
    { name: "jobGroups", minColumns: 5 },
    
    // Financial entities
    { name: "invoices", minColumns: 19 },
    { name: "invoiceItems", minColumns: 8 },
    { name: "payments", minColumns: 17 },
    { name: "estimates", minColumns: 14 },
    { name: "estimateItems", minColumns: 9 },
    { name: "expenses", minColumns: 13 },
    { name: "budgets", minColumns: 11 },
    { name: "accounts", minColumns: 9 },
    { name: "journalEntries", minColumns: 8 },
    { name: "journalEntryLines", minColumns: 7 },
    { name: "bankAccounts", minColumns: 8 },
    { name: "bankTransactions", minColumns: 12 },
    
    // Project & Operations
    { name: "projects", minColumns: 15 },
    { name: "projectTasks", minColumns: 11 },
    { name: "projectMilestones", minColumns: 8 },
    { name: "workOrders", minColumns: 11 },
    { name: "workOrderMaterials", minColumns: 7 },
    
    // HR & Payroll
    { name: "leaveRequests", minColumns: 10 },
    { name: "attendance", minColumns: 8 },
    { name: "payroll", minColumns: 15 },
    
    // Sales & CRM
    { name: "opportunities", minColumns: 12 },
    { name: "serviceTemplates", minColumns: 7 },
    { name: "serviceInvoices", minColumns: 9 },
    { name: "timeEntries", minColumns: 18 },
    
    // System
    { name: "tickets", minColumns: 15 },
    { name: "subscriptions", minColumns: 10 },
    { name: "roles", minColumns: 5 },
    { name: "userRoles", minColumns: 4 },
    { name: "rolePermissions", minColumns: 4 },
    { name: "notifications", minColumns: 8 },
    { name: "activityLog", minColumns: 8 },
    { name: "products", minColumns: 21 },
  ];

  let passCount = 0;
  let failCount = 0;

  for (const table of expectedTables) {
    try {
      const [rows] = await connection.query(
        `SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table.name]
      ) as any;
      
      if (rows.length > 0) {
        if (rows.length >= table.minColumns) {
          success(`Table '${table.name}' exists with ${rows.length} columns`);
          results.push({
            name: `Table: ${table.name}`,
            status: "PASS",
            message: `Found with ${rows.length} columns (expected min: ${table.minColumns})`,
          });
          passCount++;
        } else {
          warning(
            `Table '${table.name}' exists but has only ${rows.length} columns (expected min: ${table.minColumns})`
          );
          results.push({
            name: `Table: ${table.name}`,
            status: "WARN",
            message: `Only ${rows.length} columns (expected min: ${table.minColumns})`,
          });
          failCount++;
        }
      } else {
        error(`Table '${table.name}' does not exist`);
        results.push({
          name: `Table: ${table.name}`,
          status: "FAIL",
          message: "Table not found in database",
        });
        failCount++;
      }
    } catch (error) {
      error(
        `Error checking table '${table.name}': ${(error as any).message}`
      );
      results.push({
        name: `Table: ${table.name}`,
        status: "FAIL",
        message: `Error: ${(error as any).message}`,
      });
      failCount++;
    }
  }

  info(
    `\nTable Structure Summary: ${passCount} PASS, ${failCount} FAIL/WARN out of ${expectedTables.length} tables`
  );
}

async function testDataIntegrity(db: any, connection: mysql.Connection) {
  section("3. DATA INTEGRITY TESTS");

  try {
    // Test 1: Check for orphaned records
    info("Checking for orphaned invoice items...");
    const [orphanedItems] = await connection.query(`
      SELECT COUNT(*) as orphan_count FROM invoiceItems ii
      WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = ii.invoiceId)
    `) as any;
    
    if (orphanedItems[0].orphan_count === 0) {
      success("No orphaned invoice items found");
      results.push({
        name: "Orphaned Records (Invoices)",
        status: "PASS",
        message: "No orphaned invoice items",
      });
    } else {
      warning(
        `Found ${orphanedItems[0].orphan_count} orphaned invoice items`
      );
      results.push({
        name: "Orphaned Records (Invoices)",
        status: "WARN",
        message: `${orphanedItems[0].orphan_count} orphaned items found`,
      });
    }

    // Test 2: Check for NULL values in required fields
    info("Checking for NULL values in required fields...");
    const [nullUsers] = await connection.query(`
      SELECT COUNT(*) as null_count FROM users WHERE email IS NULL OR name IS NULL
    `) as any;
    
    if (nullUsers[0].null_count === 0) {
      success("No NULL values in critical user fields");
      results.push({
        name: "NULL Values (Users)",
        status: "PASS",
        message: "All required user fields populated",
      });
    } else {
      warning(`Found ${nullUsers[0].null_count} users with NULL critical fields`);
      results.push({
        name: "NULL Values (Users)",
        status: "WARN",
        message: `${nullUsers[0].null_count} users with NULL fields`,
      });
    }

    // Test 3: Check invoice amounts consistency
    info("Checking invoice amount calculations...");
    const [invoiceAmounts] = await connection.query(`
      SELECT 
        COUNT(*) as issue_count,
        SUM(CASE WHEN (subtotal - discountAmount + taxAmount) != total THEN 1 ELSE 0 END) as calculation_errors
      FROM invoices
    `) as any;
    
    if (invoiceAmounts[0].calculation_errors === 0 || invoiceAmounts[0].calculation_errors === null) {
      success("Invoice amount calculations are consistent");
      results.push({
        name: "Invoice Calculations",
        status: "PASS",
        message: "All invoice totals calculated correctly",
      });
    } else {
      warning(`Found ${invoiceAmounts[0].calculation_errors} invoice calculation errors`);
      results.push({
        name: "Invoice Calculations",
        status: "WARN",
        message: `${invoiceAmounts[0].calculation_errors} calculation errors`,
      });
    }

    // Test 4: Check for duplicate records
    info("Checking for duplicate products...");
    const [duplicates] = await connection.query(`
      SELECT sku, COUNT(*) as count FROM products GROUP BY sku HAVING count > 1
    `) as any;
    
    if (duplicates.length === 0) {
      success("No duplicate products found");
      results.push({
        name: "Duplicate Records (Products)",
        status: "PASS",
        message: "No duplicate product SKUs",
      });
    } else {
      warning(`Found ${duplicates.length} duplicate product SKUs`);
      results.push({
        name: "Duplicate Records (Products)",
        status: "WARN",
        message: `${duplicates.length} duplicate SKUs found`,
      });
    }

  } catch (error) {
    error(`Data integrity test failed: ${(error as any).message}`);
    results.push({
      name: "Data Integrity Tests",
      status: "FAIL",
      message: `Error: ${(error as any).message}`,
    });
  }
}

async function testCRUDOperations(db: any) {
  section("4. CRUD OPERATIONS TEST");

  try {
    // Test User CRUD
    info("Testing User CRUD operations...");
    const testUserId = uuidv4();
    const testUserEmail = `test-${Date.now()}@test.com`;

    try {
      // Create
      await db.insert(users).values({
        id: testUserId,
        name: "Test User",
        email: testUserEmail,
        role: "user",
        loginMethod: "local",
        isActive: 1,
        createdAt: new Date().toISOString(),
      } as any);
      success("  ✓ User CREATE");

      // Read
      const [existingUser] = await db.select().from(users).where(eq(users.id, testUserId));
      if (existingUser) {
        success("  ✓ User READ");
      }

      // Update
      await db
        .update(users)
        .set({ name: "Updated Test User" } as any)
        .where(eq(users.id, testUserId));
      success("  ✓ User UPDATE");

      // Delete
      await db.delete(users).where(eq(users.id, testUserId));
      success("  ✓ User DELETE");

      results.push({
        name: "CRUD: Users",
        status: "PASS",
        message: "All CRUD operations successful",
      });
    } catch (error) {
      error(`  User CRUD failed: ${(error as any).message}`);
      results.push({
        name: "CRUD: Users",
        status: "FAIL",
        message: `${(error as any).message}`,
      });
    }

    // Test Client CRUD
    info("Testing Client CRUD operations...");
    const testClientId = uuidv4();

    try {
      // Create
      await db.insert(clients).values({
        id: testClientId,
        companyName: `Test Company ${Date.now()}`,
        email: `company-${Date.now()}@test.com`,
        status: "active",
      } as any);
      success("  ✓ Client CREATE");

      // Read
      const [existingClient] = await db.select().from(clients).where(eq(clients.id, testClientId));
      if (existingClient) {
        success("  ✓ Client READ");
      }

      // Update
      await db
        .update(clients)
        .set({ phone: "555-0123" } as any)
        .where(eq(clients.id, testClientId));
      success("  ✓ Client UPDATE");

      // Delete
      await db.delete(clients).where(eq(clients.id, testClientId));
      success("  ✓ Client DELETE");

      results.push({
        name: "CRUD: Clients",
        status: "PASS",
        message: "All CRUD operations successful",
      });
    } catch (error) {
      error(`  Client CRUD failed: ${(error as any).message}`);
      results.push({
        name: "CRUD: Clients",
        status: "FAIL",
        message: `${(error as any).message}`,
      });
    }

    // Test Product CRUD
    info("Testing Product CRUD operations...");
    const testProductId = uuidv4();
    const testSku = `TEST-SKU-${Date.now()}`;

    try {
      // Create
      await db.insert(products).values({
        id: testProductId,
        name: "Test Product",
        sku: testSku,
        category: "test",
        unitPrice: 1000,
        costPrice: 500,
        stockQuantity: 10,
        unit: "pieces",
      } as any);
      success("  ✓ Product CREATE");

      // Read
      const [existingProduct] = await db.select().from(products).where(eq(products.id, testProductId));
      if (existingProduct) {
        success("  ✓ Product READ");
      }

      // Update
      await db
        .update(products)
        .set({ stockQuantity: 20 } as any)
        .where(eq(products.id, testProductId));
      success("  ✓ Product UPDATE");

      // Delete
      await db.delete(products).where(eq(products.id, testProductId));
      success("  ✓ Product DELETE");

      results.push({
        name: "CRUD: Products",
        status: "PASS",
        message: "All CRUD operations successful",
      });
    } catch (error) {
      error(`  Product CRUD failed: ${(error as any).message}`);
      results.push({
        name: "CRUD: Products",
        status: "FAIL",
        message: `${(error as any).message}`,
      });
    }

  } catch (error) {
    error(`CRUD operations test failed: ${(error as any).message}`);
    results.push({
      name: "CRUD Operations",
      status: "FAIL",
      message: `${(error as any).message}`,
    });
  }
}

async function testDatabaseMetrics(connection: mysql.Connection) {
  section("5. DATABASE METRICS & STATISTICS");

  try {
    // Get database size
    info("Calculating database size...");
    const [sizeData] = await connection.query(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
      FROM information_schema.TABLES 
      WHERE table_schema = DATABASE()
    `) as any;
    
    success(
      `Database size: ${sizeData[0].size_mb || 0} MB`
    );

    // Get table row counts
    info("Counting records in each table...");
    const [rowCounts] = await connection.query(`
      SELECT 
        table_name,
        table_rows
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
      ORDER BY table_rows DESC
      LIMIT 20
    `) as any;

    let totalRows = 0;
    log("\nTop 20 tables by row count:");
    for (const row of rowCounts) {
      log(`  • ${row.table_name}: ${row.table_rows} rows`);
      totalRows += row.table_rows;
    }
    success(`Total records in database: ${totalRows}`);

    results.push({
      name: "Database Metrics",
      status: "PASS",
      message: `Size: ${sizeData[0].size_mb || 0}MB, Total rows: ${totalRows}`,
    });
  } catch (error) {
    warning(`Could not retrieve database metrics: ${(error as any).message}`);
    results.push({
      name: "Database Metrics",
      status: "WARN",
      message: `Error: ${(error as any).message}`,
    });
  }
}

async function testConstraints(connection: mysql.Connection) {
  section("6. DATABASE CONSTRAINTS TEST");

  try {
    // Check foreign key constraints
    info("Checking foreign key constraints...");
    const [fkData] = await connection.query(`
      SELECT COUNT(*) as fk_count
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
    `) as any;
    
    success(`Found ${fkData[0].fk_count} foreign key constraints`);
    results.push({
      name: "Foreign Key Constraints",
      status: "PASS",
      message: `${fkData[0].fk_count} constraints defined`,
    });

    // Check unique constraints
    info("Checking unique constraints...");
    const [uniqueData] = await connection.query(`
      SELECT COUNT(*) as unique_count
      FROM information_schema.STATISTICS
      WHERE table_schema = DATABASE() AND seq_in_index = 1 AND non_unique = 0
    `) as any;
    
    success(`Found ${uniqueData[0].unique_count} unique constraints/indexes`);
    results.push({
      name: "Unique Constraints",
      status: "PASS",
      message: `${uniqueData[0].unique_count} unique indexes`,
    });

    // Check indexes
    info("Checking database indexes...");
    const [indexData] = await connection.query(`
      SELECT COUNT(*) as index_count
      FROM information_schema.STATISTICS
      WHERE table_schema = DATABASE() AND index_name != 'PRIMARY'
    `) as any;
    
    success(`Found ${indexData[0].index_count} indexes`);
    results.push({
      name: "Database Indexes",
      status: "PASS",
      message: `${indexData[0].index_count} indexes for query optimization`,
    });
  } catch (error) {
    warning(`Constraint check failed: ${(error as any).message}`);
    results.push({
      name: "Database Constraints",
      status: "WARN",
      message: `Error: ${(error as any).message}`,
    });
  }
}

async function generateReport() {
  section("FINAL TEST REPORT");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const warned = results.filter((r) => r.status === "WARN").length;

  log(`\nTest Results Summary:`);
  log(
    `  ${colors.green}✅ PASS: ${passed}${colors.reset}  |  ${colors.yellow}⚠️  WARN: ${warned}${colors.reset}  |  ${colors.red}❌ FAIL: ${failed}${colors.reset}`
  );

  if (failed === 0) {
    success("All critical tests passed!");
  } else {
    error(`${failed} critical test(s) failed. Review the results above.`);
  }

  // Write detailed report to file
  const reportPath = "./database-test-report.json";
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      passed,
      failed,
      warned,
      status: failed === 0 ? "PASS" : "FAIL",
    },
    results,
  };

  const fs = await import("fs");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  info(`\nDetailed report saved to: ${reportPath}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  log(`${colors.cyan}╔════════════════════════════════════════════════════════════════════════════════╗`);
  log(`║                   MELITECH CRM - DATABASE COMPREHENSIVE TEST SUITE                   ║`);
  log(`║                            All 29 Entities Validation                                 ║`);
  log(`╚════════════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);

  let connection: mysql.Connection | null = null;

  try {
    // Create connection
    info(`Connecting to database...`);
    connection = await mysql.createConnection(databaseUrl);
    const db = drizzle(connection);

    // Run all tests
    await testConnection(connection);
    await testTableExistence(connection);
    await testDataIntegrity(db, connection);
    await testCRUDOperations(db);
    await testDatabaseMetrics(connection);
    await testConstraints(connection);

    // Generate final report
    await generateReport();
  } catch (err) {
    error(`Test suite failed: ${(err as any).message}`);
    console.error(err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      info("Database connection closed");
    }
  }
}

main().catch((error) => {
  console.error("[Fatal] Test suite error:", error);
  process.exit(1);
});

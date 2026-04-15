/**
 * Quick migration script to add missing organizationId columns
 * Run with: npx tsx _add_missing_columns.ts
 */
import * as mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://melitech_user:tjwzT9pW;NGYq1QxSq0B@localhost:3307/melitech_crm";

async function main() {
  const conn = await mysql.createConnection({
    host: "localhost",
    port: 3307,
    user: "melitech_user",
    password: "tjwzT9pW;NGYq1QxSq0B",
    database: "melitech_crm",
    multipleStatements: true,
  });

  console.log("Connected to database");

  // Check which tables need organizationId
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME='organizationId' AND TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME`
  );
  const tablesWithOrgId = new Set((rows as any[]).map((r: any) => r.TABLE_NAME));
  console.log("Tables already with organizationId:", [...tablesWithOrgId].join(", "));

  // Tables that need organizationId based on schema
  const tablesToAdd = [
    "payments", "receipts", "estimates", "quotations", "contacts",
    "products", "services", "suppliers", "departments", "opportunities",
    "creditNotes", "warranties", "lpos", "deliveryNotes", "grnRecords",
    "leaveRequests", "attendance", "budgets", "assets", "workOrders",
    "tickets", "contracts", "proposals", "subscriptions",
  ];

  for (const table of tablesToAdd) {
    // First check if table exists
    const [tableExists] = await conn.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`, [table]
    );
    if ((tableExists as any[])[0].cnt === 0) {
      console.log(`  SKIP ${table} - table doesn't exist`);
      continue;
    }

    if (tablesWithOrgId.has(table)) {
      console.log(`  OK   ${table} - already has organizationId`);
      continue;
    }

    try {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN organizationId VARCHAR(64) DEFAULT NULL`);
      await conn.query(`CREATE INDEX idx_${table}_org ON \`${table}\`(organizationId)`);
      console.log(`  ADD  ${table} - organizationId column added`);
    } catch (e: any) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  OK   ${table} - column already exists`);
      } else {
        console.log(`  ERR  ${table} - ${e.message}`);
      }
    }
  }

  console.log("\nDone!");
  await conn.end();
}

main().catch(console.error);

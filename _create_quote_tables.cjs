const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'melitech_user',
    password: 'tjwzT9pW;NGYq1QxSq0B',
    database: 'melitech_crm',
  });

  // Check existing tables
  const [q1] = await conn.query("SHOW TABLES LIKE 'quotes'");
  const [q2] = await conn.query("SHOW TABLES LIKE 'lineItems'");
  const [q3] = await conn.query("SHOW TABLES LIKE 'quoteLogs'");
  console.log('quotes exists:', q1.length > 0);
  console.log('lineItems exists:', q2.length > 0);
  console.log('quoteLogs exists:', q3.length > 0);

  // Create quotes table
  if (q1.length === 0) {
    await conn.query(`
      CREATE TABLE quotes (
        id VARCHAR(64) PRIMARY KEY,
        quoteNumber VARCHAR(50) NOT NULL,
        clientId VARCHAR(64) NOT NULL,
        subject VARCHAR(255),
        description TEXT,
        status ENUM('draft','sent','accepted','expired','declined','converted') NOT NULL DEFAULT 'draft',
        subtotal DECIMAL(12,2) DEFAULT 0,
        taxAmount DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        expirationDate DATETIME,
        sentDate TIMESTAMP NULL,
        acceptedDate TIMESTAMP NULL,
        declinedDate TIMESTAMP NULL,
        convertedInvoiceId VARCHAR(64),
        template INT DEFAULT 0,
        createdBy VARCHAR(64),
        organizationId VARCHAR(64),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX quote_client_idx (clientId),
        INDEX quote_status_idx (status),
        INDEX quote_org_idx (organizationId)
      )
    `);
    console.log('Created quotes table');
  }

  // Create lineItems table
  if (q2.length === 0) {
    await conn.query(`
      CREATE TABLE lineItems (
        id VARCHAR(64) PRIMARY KEY,
        quoteId VARCHAR(64) NOT NULL,
        description TEXT,
        quantity INT DEFAULT 1,
        unitPrice DECIMAL(12,2) DEFAULT 0,
        taxRate DECIMAL(5,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX li_quote_idx (quoteId)
      )
    `);
    console.log('Created lineItems table');
  }

  // Create quoteLogs table
  if (q3.length === 0) {
    await conn.query(`
      CREATE TABLE quoteLogs (
        id VARCHAR(64) PRIMARY KEY,
        quoteId VARCHAR(64) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        userId VARCHAR(64),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX ql_quote_idx (quoteId)
      )
    `);
    console.log('Created quoteLogs table');
  }

  console.log('Done!');
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });

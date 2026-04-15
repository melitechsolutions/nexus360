const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'melitech_user',
    password: 'tjwzT9pW;NGYq1QxSq0B',
    database: 'melitech_crm'
  });
  await conn.execute(`CREATE TABLE IF NOT EXISTS debitNotes (
    id VARCHAR(64) PRIMARY KEY,
    organizationId VARCHAR(64),
    debitNoteNumber VARCHAR(100) NOT NULL,
    supplierId VARCHAR(64) NOT NULL,
    supplierName VARCHAR(255),
    purchaseOrderId VARCHAR(64),
    issueDate DATETIME NOT NULL,
    reason ENUM('quality-shortage','price-adjustment','damaged','underdelivery','penalty') NOT NULL DEFAULT 'quality-shortage',
    subtotal INT NOT NULL DEFAULT 0,
    taxAmount INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    status ENUM('draft','approved','settled','void') NOT NULL DEFAULT 'draft',
    notes TEXT,
    createdBy VARCHAR(64),
    approvedBy VARCHAR(64),
    approvedAt DATETIME,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX debit_note_number_idx (debitNoteNumber),
    INDEX supplier_idx (supplierId),
    INDEX debit_status_idx (status)
  )`);
  console.log('debitNotes table created successfully');
  await conn.end();
}
run().catch(e => { console.error(e); process.exit(1); });

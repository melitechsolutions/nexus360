const fs = require('fs');
const schemaTables = JSON.parse(fs.readFileSync('schema_columns.json', 'utf8'));

// Parse db_columns.txt (tab-separated TABLE_NAME COLUMN_NAME)
const dbRaw = fs.readFileSync('db_columns.txt', 'utf8').trim().split('\n');
const dbTableCols = {};
for (const line of dbRaw) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) continue;
  const [table, col] = parts;
  if (!dbTableCols[table]) dbTableCols[table] = [];
  dbTableCols[table].push(col);
}

const mismatches = [];
for (const [schemaTable, schemaCols] of Object.entries(schemaTables)) {
  if (!dbTableCols[schemaTable]) {
    mismatches.push({ table: schemaTable, type: 'MISSING_TABLE', cols: schemaCols });
    continue;
  }
  const dbCols = dbTableCols[schemaTable];
  const missing = schemaCols.filter(c => !dbCols.includes(c));
  if (missing.length > 0) {
    mismatches.push({ table: schemaTable, type: 'MISSING_COLS', missing, dbCols, schemaCols });
  }
}

if (mismatches.length === 0) {
  console.log('No mismatches found!');
} else {
  console.log('Found', mismatches.length, 'tables with issues:\n');
  for (const m of mismatches) {
    if (m.type === 'MISSING_TABLE') {
      console.log('  MISSING TABLE:', m.table, '(' + m.cols.length + ' cols)');
    } else if (m.type === 'MISSING_COLS') {
      console.log('  MISSING COLS in ' + m.table + ':', m.missing.join(', '));
    } else {
      console.log('  ERROR:', m.table, m.error);
    }
  }
}

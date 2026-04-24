#!/usr/bin/env node

/**
 * Nexus360 Production Migration Runner
 * Runs all SQL migrations in order against the production database.
 * Tracks which migrations have been applied via a `_migrations` table.
 * 
 * Usage: node scripts/migrate.mjs
 * 
 * This script:
 * 1. Creates a _migrations tracking table if it doesn't exist
 * 2. Reads all .sql files from the drizzle/ directory
 * 3. Executes only new (unapplied) migrations in order
 * 4. Records each successful migration
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envFile) });
// Also load .env as fallback
config({ path: resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[Migration] ERROR: DATABASE_URL is not set');
  process.exit(1);
}

// Parse DATABASE_URL
function parseDatabaseUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):(.+)@([^:\/]+):?(\d+)?\/(.+?)(\?.*)?$/);
  if (!match) {
    console.error('[Migration] ERROR: Invalid DATABASE_URL format');
    process.exit(1);
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4] || '3306'),
    database: match[5],
  };
}

async function runMigrations() {
  const dbConfig = parseDatabaseUrl(DATABASE_URL);
  console.log(`[Migration] Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);

  let connection;
  try {
    connection = await createConnection({
      ...dbConfig,
      multipleStatements: true,
      connectTimeout: 30000,
    });
    console.log('[Migration] Connected successfully');
  } catch (err) {
    console.error('[Migration] Connection failed:', err.message);
    process.exit(1);
  }

  try {
    // Create migrations tracking table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`_migrations\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`name\` varchar(255) NOT NULL UNIQUE,
        \`applied_at\` timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already-applied migrations
    const [applied] = await connection.execute('SELECT name FROM `_migrations` ORDER BY name');
    const appliedSet = new Set(applied.map(r => r.name));
    console.log(`[Migration] ${appliedSet.size} migrations already applied`);

    // Read migration files
    const migrationsDir = resolve(process.cwd(), 'drizzle');
    let files;
    try {
      files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch (err) {
      console.error('[Migration] Cannot read drizzle/ directory:', err.message);
      process.exit(1);
    }

    console.log(`[Migration] Found ${files.length} migration files`);

    let applied_count = 0;
    let skipped_count = 0;
    let failed_count = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped_count++;
        continue;
      }

      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8').trim();

      if (!sql) {
        console.log(`[Migration] Skipping empty file: ${file}`);
        skipped_count++;
        continue;
      }

      console.log(`[Migration] Applying: ${file}...`);

      try {
        // Split by semicolons but handle edge cases
        // Execute the whole file as multipleStatements is enabled
        await connection.query(sql);

        // Record successful migration
        await connection.execute(
          'INSERT INTO `_migrations` (name) VALUES (?)',
          [file]
        );

        applied_count++;
        console.log(`[Migration] ✅ Applied: ${file}`);
      } catch (err) {
        // Handle "already exists" errors gracefully (table/column already exists)
        if (
          err.code === 'ER_TABLE_EXISTS_ERROR' ||
          err.code === 'ER_DUP_FIELDNAME' ||
          err.code === 'ER_DUP_KEYNAME' ||
          err.message.includes('already exists') ||
          err.message.includes('Duplicate column') ||
          err.message.includes('Duplicate key name')
        ) {
          console.log(`[Migration] ⚠️  ${file}: Already applied (objects exist), marking as done`);
          await connection.execute(
            'INSERT IGNORE INTO `_migrations` (name) VALUES (?)',
            [file]
          );
          applied_count++;
        } else {
          console.error(`[Migration] ❌ Failed: ${file}`);
          console.error(`[Migration]    Error: ${err.message}`);
          failed_count++;
          // Continue with next migration instead of aborting
        }
      }
    }

    console.log('\n[Migration] ════════════════════════════════════');
    console.log(`[Migration] Results: ${applied_count} applied, ${skipped_count} skipped, ${failed_count} failed`);
    console.log('[Migration] ════════════════════════════════════\n');

    if (failed_count > 0) {
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

runMigrations().catch(err => {
  console.error('[Migration] Unexpected error:', err);
  process.exit(1);
});

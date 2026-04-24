#!/usr/bin/env node
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const url = new URL(DB_URL);
const conn = await mysql.createConnection({
  host: url.hostname, port: Number(url.port) || 3306,
  user: url.username, password: decodeURIComponent(url.password),
  database: url.pathname.slice(1), multipleStatements: true
});

console.log('[Migrate] Connected to DB');

await conn.execute(CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  + \id\ INT AUTO_INCREMENT PRIMARY KEY,
  + \hash\ VARCHAR(256) NOT NULL UNIQUE,
  + \created_at\ BIGINT
  + ) CHARACTER SET utf8mb4;);

const [applied] = await conn.query('SELECT hash FROM __drizzle_migrations');
const appliedSet = new Set(applied.map(r => r.hash));
console.log('[Migrate] Already applied:', appliedSet.size);

const migsDir = join(__dirname, 'drizzle/migrations');
const files = readdirSync(migsDir).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  const hash = file.replace('.sql','');
  if (appliedSet.has(hash)) { console.log('[Migrate] Skip:', file); continue; }
  console.log('[Migrate] Applying:', file);
  const sql = readFileSync(join(migsDir, file), 'utf8');
  try {
    await conn.query(sql);
    await conn.execute('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, Date.now()]);
    console.log('[Migrate] Done:', file);
  } catch(e) { console.error('[Migrate] Error on', file, ':', e.message); }
}

await conn.end();
console.log('[Migrate] All done!');

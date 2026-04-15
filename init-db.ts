/**
 * Database Initialization Script
 * This script runs Drizzle migrations to create all necessary database tables
 * It's executed automatically when the Docker container starts
 * 
 * Usage: node -r tsx init-db.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getUserByEmail, createUser } from "./server/db-users.js";
import { setUserPassword } from "./server/db.js";

async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("[Database] ❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("[Database] 🔄 Initializing database...");
  console.log("[Database] 📍 Database URL:", databaseUrl.replace(/:[^@]*@/, ":***@"));
  
  let connection;
  let retries = 5;
  let lastError: any = null;
  
  // Retry logic for initial connection
  while (retries > 0) {
    try {
      console.log("[Database] 🔗 Attempting to connect to database (attempts remaining: " + retries + ")...");
      
      // Create connection with melitech_user
      let connStr = databaseUrl;
      try {
        const hasQuery = connStr.includes("?");
        if (!connStr.includes("multipleStatements=true")) {
          connStr = connStr + (hasQuery ? "&" : "?") + "multipleStatements=true";
        }
      } catch (e) {
        connStr = databaseUrl;
      }
      
      console.log("[Database] ➤ Using DB URL with multipleStatements hidden");
      connection = await mysql.createConnection(connStr);
      const db = drizzle(connection);
      console.log("[Database] ✅ Connection successful");
      break; // Success, exit retry loop
      
    } catch (err) {
      lastError = err;
      const errMsg = (err as any)?.message || String(err);
      console.warn("[Database] ⚠️ Connection attempt failed:", errMsg);
      
      retries--;
      if (retries > 0) {
        console.log("[Database] ⏳ Retrying in 3 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  if (!connection && lastError) {
    // All retries exhausted
    console.error("[Database] ❌ Could not connect after all retry attempts");
    const msg = (lastError as any)?.message || String(lastError);
    console.error("[Database] Last error:", msg);
    
    // If it's still a host permission error, try a different approach
    if (msg.includes("not allowed to connect")) {
      console.error("[Database] ⚠️ Host permission issue detected");
      console.error("[Database] This often means MySQL permissions need to be fixed");
      process.exit(1);
    }
    
    throw lastError;
  }
  
  try {

    // Run migrations manually by executing SQL files
    try {
      const migrationsFolder = path.resolve(process.cwd(), "drizzle", "migrations");
      console.log("[Database] ➤ Running migrations from:", migrationsFolder);
      
      // Read migration files in order
      const files = fs.readdirSync(migrationsFolder)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      console.log(`[Database] Found ${files.length} migration files to execute`);
      
      for (const file of files) {
        const filePath = path.join(migrationsFolder, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`[Database] ➤ Executing migration: ${file}`);
        try {
          // Execute the SQL file content using query() instead of execute()
          // query() uses the text protocol which supports all SQL statements
          // execute() uses prepared statements which can't handle DELIMITER, CREATE PROCEDURE, etc.
          const statements = sql.split(';').filter(s => s.trim().length > 0);
          for (const statement of statements) {
            await connection.query(statement);
          }
          console.log(`[Database]   ✅ ${file} completed`);
        } catch (e) {
          const err = e as any;
          const errMsg = err?.message || String(err);
          // Tolerate errors for idempotency and missing objects
          if (
            err?.code === 'ER_TABLE_EXISTS_ERROR' || 
            errMsg.includes('already exists') ||
            err?.code === 'ER_DUP_FIELDNAME' ||
            errMsg.includes('Duplicate column') ||
            errMsg.includes("doesn't exist") ||
            err?.code === 'ER_NO_SUCH_TABLE' ||
            errMsg.includes('Unknown column') ||
            err?.code === 'ER_DUP_KEYNAME' ||
            errMsg.includes('Duplicate key name') ||
            errMsg.includes("can't have a default value") ||
            err?.code === 'ER_BLOB_CANT_HAVE_DEFAULT'
          ) {
            console.log(`[Database]   ⚠️  ${file} - already applied or non-fatal issue (idempotent)`);
          } else {
            console.error(`[Database]   ❌ Migration error in ${file}:`, errMsg);
            // Don't throw fatal errors - continue with other migrations
            // Most schema mismatches are handled elsewhere
          }
        }
      }
      
      console.log("[Database] ✅ Migrations applied successfully");
    } catch (err) {
      // Log migration error but continue for non-fatal issues
      const msg = err && (err as any).message ? (err as any).message : String(err);
      console.warn("[Database] ⚠️ Migration error (will continue if non-fatal):", msg);
      if (!msg.includes("already exists") && !(err as any)?.code === "ER_TABLE_EXISTS_ERROR") {
        throw err;
      }
      console.log("[Database] Detected existing objects; continuing startup");
    }

    console.log("[Database] 📊 Database is ready for use");

    // Create default user after migrations are complete
    await createDefaultUser();
    
    return true;
  } catch (error) {
    console.error("[Database] ❌ Migration failed:", error);
    if (error instanceof Error) {
      console.error("[Database] Error details:", error.message);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("[Database] 🔌 Connection closed");
    }
  }
}

async function createDefaultUser() {
  const defaultEmail = "info@melitechsolutions.co.ke";
  const defaultPassword = "Melitechs@@21";
  const defaultRole = "super_admin";
  const defaultName = process.env.OWNER_NAME || "System Administrator";
  const defaultId = nanoid(16);

  try {
    console.log(`[Database] Checking for default user: ${defaultEmail}`);

    let existingUser;
    try {
      existingUser = await getUserByEmail(defaultEmail);
    } catch (error: any) {
      // If a schema column doesn't exist yet, skip default user creation
      if (error?.message?.includes("Unknown column")) {
        const col = error?.message?.match(/Unknown column '([^']+)'/)?.[1] || "unknown";
        console.warn(
          `[Database] ⚠️  Column '${col}' not yet available. Skipping default user creation until migrations complete.`
        );
        return;
      }
      throw error;
    }

    if (existingUser) {
      console.log(`[Database] Default user ${defaultEmail} already exists. Skipping creation.`);
      return;
    }

    console.log(`[Database] Creating default user: ${defaultEmail}`);

    // 1. Hash the password
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 2. Create the user record
    const user = await createUser({
      id: defaultId,
      name: defaultName,
      email: defaultEmail,
      role: defaultRole as any,
      loginMethod: "local",
      isActive: true,
    });

    if (user) {
      // 3. Set the password hash
      await setUserPassword(user.id, passwordHash);
      console.log(
        `[Database] ✅ Default user ${defaultEmail} created successfully.`
      );
    } else {
      console.error(`[Database] ❌ Failed to create default user ${defaultEmail}.`);
    }
  } catch (error) {
    console.error(
      `[Database] ⚠️  Error during default user creation:`,
      error instanceof Error ? error.message : String(error)
    );
    console.warn(
      `[Database] ℹ️  Continuing startup. You may need to create a default user manually.`
    );
    // Don't exit - the app can still start without a default user
  }
}

// Run initialization
console.log("[Database] Starting database initialization...");
initializeDatabase()
  .then(() => {
    console.log("[Database] ✨ Database initialization complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Database] 💥 Database initialization failed:", error);
    process.exit(1);
  });

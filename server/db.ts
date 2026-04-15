import { eq, desc, and, gte, lte, sql, or, like, inArray, isNotNull } from "drizzle-orm";
import { drizzle as drizzleMySql } from "drizzle-orm/mysql2";
import { migrate as drizzleMigrate } from "drizzle-orm/mysql2/migrator";
import * as mysql from "mysql2/promise";

// sqlite support for tests will be dynamically imported below when needed
import {
  users,
  clients,
  products,
  services,
  estimates,
  estimateItems,
  invoices,
  invoiceItems,
  receipts,
  payments,
  paymentMethods,
  billingNotifications,
  expenses,
  accounts,
  journalEntries,
  journalEntryLines,
  bankAccounts,
  bankTransactions,
  employees,
  leaveRequests,
  payroll,
  opportunities,
  templates,
  activityLog,
  settings,
  projects,
  projectTasks,
  notifications,
  documentNumberFormats,
  defaultSettings,
  rolePermissions,
  userRoles,
  userPermissions,
  permissionMetadata,
  departments,
  budgets,
  subscriptions,
  pricingPlans,
  organizations,
  organizationFeatures,
  tenantMessages,
  pricingTierFeatures,
} from "../drizzle/schema";
import { organizationMembers } from "../drizzle/schema-extended";
import { v4 } from "uuid";

// Insert/DTO types are not exported from generated schema in this repo.
// Provide local aliases to `any` to allow iterative type fixing.
type InsertUser = any;
type InsertClient = any;
type InsertProduct = any;
type InsertService = any;
type InsertEstimate = any;
type InsertEstimateItem = any;
type InsertInvoice = any;
type InsertInvoiceItem = any;
type InsertPayment = any;
type InsertExpense = any;
type InsertAccount = any;
type InsertJournalEntry = any;
type InsertJournalEntryLine = any;
type InsertBankAccount = any;
type InsertBankTransaction = any;
type InsertEmployee = any;
type InsertLeaveRequest = any;
type InsertPayroll = any;
type InsertOpportunity = any;
type InsertTemplate = any;
type InsertActivityLog = any;
type InsertSetting = any;
type InsertProject = any;
type InsertProjectTask = any;
type InsertNotification = any;
type InsertDocumentNumberFormat = any;
type InsertDefaultSetting = any;
type InsertRolePermission = any;
type InsertPermission = any;
type InsertUserRole = any;
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzleMySql> | null = null;
let _pool: mysql.Pool | null = null;
let _migrationsRun = false;

// helpers used in unit tests to override or reset database instance
export function __setDbForTests(dbInstance: any) {
  _db = dbInstance;
}

export function __resetDbForTests() {
  _db = null;
}

/** Expose the underlying mysql2 pool for raw SQL queries */
export function getPool() {
  return _pool;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  // primary path: MySQL via DATABASE_URL
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log("[Database] Attempting to create drizzle connection...");
      if (!_pool) {
        _pool = await mysql.createPool({
          uri: process.env.DATABASE_URL,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      }
      _db = drizzleMySql(_pool);
      console.log("[Database] ✅ Drizzle connection created successfully");

      // In production, migrations are executed before app start by init scripts.
      const shouldRunRuntimeMigrations =
        process.env.NODE_ENV !== 'production' || process.env.RUN_DRIZZLE_MIGRATIONS === 'true';

      // Run migrations automatically on first connection (unless explicitly skipped)
      if (!_migrationsRun && _db && process.env.NODE_ENV !== 'test') {
        if (shouldRunRuntimeMigrations) {
          try {
            console.log("[Database] Running migrations...");
            await drizzleMigrate(_db, { migrationsFolder: "./drizzle/migrations" });
            _migrationsRun = true;
            console.log("[Database] ✅ Migrations completed successfully");
          } catch (migrationError) {
            console.error("[Database] ⚠️  Migration error (continuing anyway):",
              migrationError instanceof Error ? migrationError.message : migrationError);
            // Don't fail startup if migrations have issues - tables might already exist
            _migrationsRun = true;
          }
        } else {
          _migrationsRun = true;
          console.log("[Database] Skipping runtime drizzle migrations in production");
        }
      }
    } catch (error) {
      console.error("[Database] ❌ Failed to connect:", error instanceof Error ? error.message : error);
      _db = null;
      _pool = null;
    }
  }

  // fallback for tests: use sqlite in-memory when DATABASE_URL missing
  if (!_db && process.env.NODE_ENV === "test") {
    try {
      console.log("[Database] Creating sqlite in-memory DB for tests...");
      // dynamic import to avoid requiring sqlite3 in production
      // use a variable string so that bundlers cannot statically
      // resolve the subpath and complain about package exports.
      const sqlitePkg = "drizzle-orm/sqlite3";
      const [{ drizzle: drizzleSqlite }, sqlite3] = await Promise.all([
        import(sqlitePkg),
        import("sqlite3"),
      ] as any);
      const conn = new sqlite3.Database(":memory:");
      _db = drizzleSqlite(conn as any);
      // Note: migrations should be applied externally if needed; tests skip if tables absent.
    } catch (err) {
      console.warn("[Database] sqlite memory init failed", err);
      _db = null;
    }
  }

  if (!_db && !process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set");
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    // Ensure required non-null DB columns have values to avoid INSERT errors
    // Some deployed DB schemas mark `email` and `name` as NOT NULL.
    // Only set placeholders for NEW inserts, NOT for updates (to preserve existing data)
    if (values.email === undefined || values.email === null || values.email === "") {
      // use a unique placeholder email to avoid UNIQUE constraint collisions
      const placeholder = `${user.id}@no-email.local`;
      values.email = placeholder;
      // DO NOT update existing user emails - preserve their current email
      // updateSet.email = placeholder;
    }
    if (values.name === undefined || values.name === null) {
      values.name = "";
      // DO NOT update existing user names - preserve their current name
      // updateSet.name = "";
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: string) {
  return getUser(id);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUser(id: string, data: Partial<InsertUser> & { isActive?: boolean | number; department?: string | null; passwordHash?: string | null }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  try {
    const updateSet: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateSet.name = data.name;
    if (data.email !== undefined) updateSet.email = data.email;
    if (data.loginMethod !== undefined) updateSet.loginMethod = data.loginMethod;
    if (data.role !== undefined) updateSet.role = data.role;
    if (data.lastSignedIn !== undefined) updateSet.lastSignedIn = data.lastSignedIn;
    if (data.department !== undefined) updateSet.department = data.department;
    if (data.isActive !== undefined) updateSet.isActive = typeof data.isActive === 'boolean' ? (data.isActive ? 1 : 0) : data.isActive;
    if (data.passwordHash !== undefined) updateSet.passwordHash = data.passwordHash;
    if (data.phone !== undefined) updateSet.phone = data.phone;
    if (data.company !== undefined) updateSet.company = data.company;
    if (data.position !== undefined) updateSet.position = data.position;
    if (data.photoUrl !== undefined) updateSet.photoUrl = data.photoUrl;
    
    if (Object.keys(updateSet).length === 0) {
      return getUser(id); // Nothing to update, return current user
    }
    
    await db.update(users).set(updateSet).where(eq(users.id, id));
    const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return updated[0] ?? null;
  } catch (error) {
    console.error("[Database] Failed to update user:", error);
    throw error;
  }
}

// ============= USER PASSWORD MANAGEMENT =============

export async function setUserPassword(userId: string, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function getUserPassword(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0].passwordHash : null;
}

// ============= NOTIFICATIONS =============

export async function createNotification(notification: Omit<InsertNotification, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const notificationData = { ...(notification as any), id } as any;
  
  await db.insert(notifications).values(notificationData);

  // Backward-compatible websocket broadcast (no-op if websocket server is not wired).
  try {
    const { broadcastNotification } = await import("../server/websocket/notificationBroadcaster");
    await broadcastNotification(notification.userId, notificationData as any);
  } catch (error) {
    console.warn("Could not broadcast notification, websocket may not be available:", error);
  }

  // Primary real-time channel: SSE broadcast to org/user stream.
  try {
    const { notifyOrg, notifyUser } = await import("./sse");
    const [targetUser] = await db
      .select({ id: users.id, organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, notification.userId))
      .limit(1);

    const event = {
      id,
      type: "info" as const,
      title: (notification as any).title || "Notification",
      body: (notification as any).message || "You have a new update",
      href: (notification as any).actionUrl || undefined,
      timestamp: new Date().toISOString(),
    };

    if (targetUser?.organizationId) {
      notifyOrg(targetUser.organizationId, event);
    } else {
      notifyUser(notification.userId, event);
    }
  } catch (error) {
    console.warn("Could not broadcast notification over SSE:", error);
  }
  
  return id;
}

export async function getUserNotifications(userId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotifications(userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, 0)
    ))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(notificationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(notifications)
    .set({ readAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
    .where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(notifications)
    .set({ readAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
    .where(and(
      eq(notifications.recipientId, userId),
      isNull(notifications.readAt)
    ));
}

export async function deleteNotification(notificationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(notifications).where(eq(notifications.id, notificationId));
}

// ============= PROJECTS =============

export async function createProject(project: Omit<InsertProject, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(projects).values({ ...(project as any), id } as any);
  return id;
}

export async function getProject(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectsByClient(clientId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(projects)
    .where(eq(projects.status, status as any))
    .orderBy(desc(projects.createdAt));
}

export async function updateProject(id: string, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
  .update(projects)
  .set({ ...data, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
  .where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(projects).where(eq(projects.id, id));
}

// ============= PROJECT TASKS =============

export async function createProjectTask(task: Omit<InsertProjectTask, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(projectTasks).values({ ...(task as any), id } as any);
  return id;
}

export async function getProjectTasks(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.projectId, projectId))
    .orderBy(projectTasks.order, desc(projectTasks.createdAt));
}

export async function updateProjectTask(id: string, data: Partial<InsertProjectTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
  .update(projectTasks)
  .set({ ...data, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
  .where(eq(projectTasks.id, id));
}

export async function deleteProjectTask(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(projectTasks).where(eq(projectTasks.id, id));
}

// ============= CLIENTS =============

export async function createClient(client: Omit<InsertClient, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(clients).values({ ...(client as any), id } as any);
  return id;
}

export async function getClient(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getClientById(id: string) {
  return getClient(id);
}

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function updateClient(id: string, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(clients)
    .set({ ...data, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
    .where(eq(clients.id, id));
}

export async function deleteClient(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(clients).where(eq(clients.id, id));
}

// ============= INVOICES =============

export async function createInvoice(invoice: Omit<InsertInvoice, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(invoices).values({ ...(invoice as any), id } as any);
  return id;
}

export async function getInvoice(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllInvoices() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function getInvoicesByClient(clientId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));
}

export async function getClientInvoices(clientId: string, status?: string) {
  const list = await getInvoicesByClient(clientId);
  if (!status) return list;
  return list.filter((invoice: any) => invoice?.status === status);
}

export async function getInvoiceById(id: string) {
  return getInvoice(id);
}

export async function updateInvoice(id: string, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(invoices)
    .set({ ...data, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
    .where(eq(invoices.id, id));
}

// ============= ESTIMATES =============

export async function createEstimate(estimate: Omit<InsertEstimate, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(estimates).values({ ...(estimate as any), id } as any);
  return id;
}

export async function getEstimate(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllEstimates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(estimates).orderBy(desc(estimates.createdAt));
}

export async function getEstimatesByClient(clientId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(estimates)
    .where(eq(estimates.clientId, clientId))
    .orderBy(desc(estimates.createdAt));
}

export async function updateEstimate(id: string, data: Partial<InsertEstimate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(estimates)
    .set({ ...data, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
    .where(eq(estimates.id, id));
}

// ============= PAYMENTS =============

export async function createPayment(payment: Omit<InsertPayment, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(payments).values({ ...(payment as any), id } as any);
  return id;
}

export async function getPaymentsByInvoice(invoiceId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.paymentDate));
}

export async function getPaymentMethods(clientId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.clientId, clientId), eq(paymentMethods.isActive, 1)))
    .orderBy(desc(paymentMethods.createdAt));
}

export async function createPaymentMethod(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(paymentMethods).values(data);
  const result = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, data.id))
    .limit(1);

  return result.length > 0 ? result[0] : data;
}

export async function createReceiptFromInvoice(invoiceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invoice = await getInvoice(invoiceId);
  if (!invoice) return null;

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const receiptId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const receiptNumber = `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

  const payload: any = {
    id: receiptId,
    organizationId: (invoice as any).organizationId ?? null,
    receiptNumber,
    clientId: (invoice as any).clientId,
    paymentId: null,
    amount: Number((invoice as any).paidAmount ?? (invoice as any).total ?? 0),
    paymentMethod: 'other',
    receiptDate: now,
    notes: `Auto-generated from invoice ${(invoice as any).invoiceNumber ?? invoiceId}`,
    createdBy: (invoice as any).createdBy ?? null,
    createdAt: now,
  };

  await db.insert(receipts).values(payload);
  return payload;
}

// ============= ACTIVITY LOG =============

export async function logActivity(activity: Omit<InsertActivityLog, 'id'>) {
  const db = await getDb();
  if (!db) return;
  
  const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Convert to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
  const mysqlDateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  // Ensure all fields have safe defaults to avoid NOT NULL errors
  const logEntry = {
    id,
    userId: activity.userId,
    action: activity.action,
    entityType: activity.entityType || null,
    entityId: activity.entityId || null,
    description: activity.description || null,
    metadata: activity.metadata || null,
    ipAddress: activity.ipAddress || null,
    createdAt: mysqlDateTime,
  };
  
  try {
    await db.insert(activityLog).values(logEntry as any);
  } catch (error: any) {
    // Log detailed error but do not re-throw to prevent failing the calling operation
    console.error('Failed to insert activityLog entry:', {
      error: error?.message || error,
      code: error?.code,
      entry: logEntry,
    });
    // Graceful fallback: skip logging to DB when it fails
    return;
  }
}



// ============= SETTINGS =============

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getSettingsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(settings)
    .where(eq(settings.category, category))
    .orderBy(settings.key);
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(settings)
    .orderBy(settings.category, settings.key);
}

export async function setSetting(
  key: string,
  value: string,
  category?: string,
  description?: string,
  updatedBy?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Try to update first
  const existing = await getSetting(key);
  
  if (existing) {
    await db
      .update(settings)
      .set({
        value,
        category: category || existing.category,
        description: description || existing.description,
        updatedBy,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      })
      .where(eq(settings.key, key));
    
    return existing.id;
  } else {
    // Insert new setting
    await db.insert(settings).values({
      id,
      key,
      value,
      category,
      description,
      updatedBy,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    } as any);
    
    return id;
  }
}

export async function deleteSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(settings).where(eq(settings.key, key));
}

// ============= DOCUMENT NUMBER AUTO-INCREMENT =============

/**
 * Get the next document number for a given document type
 * Supports: invoice, estimate, receipt, proposal, expense
 */
export async function getNextDocumentNumber(documentType: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Use the new formatted numbering system
  return getNextDocumentNumberWithFormat(documentType);
}

function getDefaultPrefix(documentType: string): string {
  const prefixes: Record<string, string> = {
    invoice: 'INV-',
    estimate: 'EST-',
    receipt: 'REC-',
    proposal: 'PROP-',
    expense: 'EXP-',
    payment: 'PAY-',
    project: 'PROJ-',
    contract: 'CON-',
    quotation: 'QUO-',
    purchase_order: 'LPO-',
    credit_note: 'CN-',
    debit_note: 'DN-',
  };
  
  return prefixes[documentType] || 'DOC-';
}

/**
 * Reset document number counter for a given document type
 */
export async function resetDocumentNumberCounter(documentType: string, startNumber: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const nextKey = `${documentType}_next`;
  await setSetting(nextKey, String(startNumber), 'document_numbering');
}

/**
 * Get all document numbering settings
 */
export async function getDocumentNumberingSettings() {
  const db = await getDb();
  if (!db) return {};
  
  const settings_list = await getSettingsByCategory('document_numbering');
  const result: Record<string, string> = {};
  
  settings_list.forEach(setting => {
    result[setting.key] = setting.value || '';
  });
  
  return result;
}



// ============= DOCUMENT NUMBER FORMATTING =============

export async function getDocumentNumberFormat(documentType: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db
      .select()
      .from(documentNumberFormats)
      .where(eq(documentNumberFormats.documentType, documentType as any))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error: any) {
    // If table doesn't exist, return null (graceful fallback)
    const code = error?.code || error?.errno || '';
    const msg = error?.message || '';
    if (code === 'ER_NO_SUCH_TABLE' || code === '42S02' || msg.includes("doesn't exist")) {
      console.warn('[Database] documentNumberFormats table missing - returning null');
      return null;
    }
    throw error;
  }
}

export async function updateDocumentNumberFormat(
  documentType: string,
  format: {
    prefix?: string;
    padding?: number;
    separator?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const existing = await getDocumentNumberFormat(documentType);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    if (existing) {
      await db
        .update(documentNumberFormats)
        .set({
          prefix: format.prefix !== undefined ? format.prefix : existing.prefix,
          padding: format.padding !== undefined ? format.padding : existing.padding,
          separator: format.separator !== undefined ? format.separator : existing.separator,
          updatedAt: now,
        })
        .where(eq(documentNumberFormats.documentType, documentType as any));
      
      return existing.id;
    } else {
      const id = `dnf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(documentNumberFormats).values({
        id,
        documentType: documentType as any,
        prefix: format.prefix || '',
        padding: format.padding || 6,
        separator: format.separator || '-',
        currentNumber: 1,
        createdAt: now,
        updatedAt: now,
      } as any);
      return id;
    }
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[Database] documentNumberFormats table not available');
      return `dnf_${Date.now()}`;
    }
    throw error;
  }
}

export async function getNextDocumentNumberWithFormat(documentType: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let format = await getDocumentNumberFormat(documentType);
  
  // if we found a format, sanitize it by removing any trailing four-digit year
  if (format && format.prefix) {
    const yearMatch = format.prefix.match(/(.+)-\d{4}$/);
    if (yearMatch) {
      const newPrefix = yearMatch[1];
      format.prefix = newPrefix;
      // persist sanitized prefix so future generations don't contain the year
      try {
        await db.update(documentNumberFormats)
          .set({ prefix: newPrefix, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
          .where(eq(documentNumberFormats.documentType, documentType as any));
        console.log(`[DB] removed year from prefix for ${documentType}, new prefix='${newPrefix}'`);
      } catch (err) {
        console.warn(`[DB] failed to sanitize prefix for ${documentType}`, err);
      }
    }
  }

  // If format doesn't exist, create it with default settings
  if (!format) {
    const id = v4();
    const prefix = getDefaultPrefix(documentType).replace('-', ''); // INV, EST, REC, etc.
    
    try {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.insert(documentNumberFormats).values({
        id,
        documentType: documentType as any,
        prefix,
        padding: 6,
        separator: '-',
        currentNumber: 1,
        createdAt: now,
        updatedAt: now,
      }).onDuplicateKeyUpdate({
        set: {
          currentNumber: 1,
          updatedAt: now,
        },
      });
    } catch (error: any) {
      const code = error?.code || error?.errno || '';
      const msg = error?.message || '';
      if (code === 'ER_NO_SUCH_TABLE' || code === '42S02' || msg.includes("doesn't exist")) {
        console.warn('[Database] documentNumberFormats table still missing during insert, attempting to create.');
        // attempt to create table manually
        await db.execute(`
          CREATE TABLE IF NOT EXISTS documentNumberFormats (
            id VARCHAR(64) PRIMARY KEY,
            documentType ENUM('invoice','estimate','receipt','proposal','expense','payment','contract','quotation','purchase_order','project','credit_note','debit_note') NOT NULL,
            prefix VARCHAR(50) NOT NULL DEFAULT '',
            padding INT NOT NULL DEFAULT 6,
            separator VARCHAR(5) DEFAULT '-',
            currentNumber INT NOT NULL DEFAULT 1,
            createdAt TIMESTAMP,
            updatedAt TIMESTAMP
          )
        `);
        // retry insert once more
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.insert(documentNumberFormats).values({
          id,
          documentType: documentType as any,
          prefix,
          padding: 6,
          separator: '-',
          currentNumber: 1,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        throw error;
      }
    }
    
    format = await getDocumentNumberFormat(documentType);
    if (!format) throw new Error("Failed to create document format");
  }
  
  const prefix = format.prefix || '';
  const padding = format.padding || 6;
  const separator = format.separator || '-';
  const nextNum = format.currentNumber || 1;
  
  // Generate the document number (e.g., INV-000001)
  const paddedNumber = String(nextNum).padStart(padding, '0');
  const documentNumber = prefix ? `${prefix}${separator}${paddedNumber}` : paddedNumber;
  
  // Increment and save the next number
  await db
    .update(documentNumberFormats)
    .set({
      currentNumber: nextNum + 1,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(documentNumberFormats.documentType, documentType as any));
  
  return documentNumber;
}

function generateFormatExample(prefix: string, padding: number, separator: string, exampleNumber: number = 1): string {
  const paddedNumber = String(exampleNumber).padStart(padding, '0');
  return prefix ? `${prefix}${separator}${paddedNumber}` : paddedNumber;
}

export async function resetDocumentNumberFormatCounter(documentType: string, startNumber: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(documentNumberFormats)
    .set({
      currentNumber: startNumber,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(documentNumberFormats.documentType, documentType as any));
}

// ============= DEFAULT SETTINGS =============

export async function getDefaultSetting(category: string, key: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(defaultSettings)
    .where(and(
      eq(defaultSettings.category, category),
      eq(defaultSettings.key, key)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getDefaultSettingsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(defaultSettings)
    .where(eq(defaultSettings.category, category))
    .orderBy(defaultSettings.key);
}

export async function setDefaultSetting(
  category: string,
  key: string,
  defaultValue: string,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `dset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const existing = await getDefaultSetting(category, key);

  if (existing) {
    await db
      .update(defaultSettings)
      .set({
        value: defaultValue,
        description: description || existing.description,
      })
      .where(and(
        eq(defaultSettings.category, category),
        eq(defaultSettings.key, key)
      ));

    return existing.id;
  } else {
    await db.insert(defaultSettings).values({
      id,
      category,
      key,
      value: defaultValue,
      description,
    });
    return id;
  }
}

export async function resetSettingToDefault(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find the default value
  const allDefaults = await db.select().from(defaultSettings);
  const defaultSetting = allDefaults.find(d => d.key === key);
  
  if (defaultSetting) {
    // Reset the setting to its default value
    await setSetting(key, defaultSetting.value, defaultSetting.category);
  }
}

export async function resetCategoryToDefaults(category: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const defaults = await getDefaultSettingsByCategory(category);
  
  for (const defaultSetting of defaults) {
    if (defaultSetting.value) {
      await setSetting(defaultSetting.key, defaultSetting.value, category);
    }
  }
}

// ============= ROLES & PERMISSIONS =============

export async function getRoles() {
  try {
    const db = await getDb();
    if (!db) return [];
    
    return await db
      .select()
      .from(userRoles)
      .orderBy(userRoles.roleName);
  } catch (error) {
    console.error("Error fetching roles:", error);
    // Return default roles if query fails
    return [
      { id: "1", userId: null, role: 'admin', roleName: "Admin", description: "Administrator role", isActive: 1, assignedBy: null, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "2", userId: null, role: 'staff', roleName: "Staff", description: "Staff role", isActive: 1, assignedBy: null, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "3", userId: null, role: 'client', roleName: "Client", description: "Client role", isActive: 1, assignedBy: null, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
    ];
  }
}

export async function getPermissions() {
  try {
    const db = await getDb();
    if (!db) return [];
    
    // Note: permissions table doesn't exist in current DB schema
    // Permissions are managed via RBAC middleware instead
    // Return default permissions on request
    return [
      { id: "1", name: "View", permissionName: "view", description: "View records", category: "general", resource: "*", action: "view", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "2", name: "Create", permissionName: "create", description: "Create records", category: "general", resource: "*", action: "create", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "3", name: "Edit", permissionName: "edit", description: "Edit records", category: "general", resource: "*", action: "edit", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "4", name: "Delete", permissionName: "delete", description: "Delete records", category: "general", resource: "*", action: "delete", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
    ];
  } catch (error) {
    console.error("Error fetching permissions:", error);
    // Return default permissions if query fails
    return [
      { id: "1", name: "View", permissionName: "view", description: "View records", category: "general", resource: "*", action: "view", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "2", name: "Create", permissionName: "create", description: "Create records", category: "general", resource: "*", action: "create", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "3", name: "Edit", permissionName: "edit", description: "Edit records", category: "general", resource: "*", action: "edit", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
      { id: "4", name: "Delete", permissionName: "delete", description: "Delete records", category: "general", resource: "*", action: "delete", createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) },
    ];
  }
}

export async function getRolePermissions(roleId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      permissionId: rolePermissions.permissionId,
      permissionName: permissions.permissionName,
      description: permissions.description,
      category: permissions.category,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))
    .orderBy(permissions.category, permissions.permissionName);
}

export async function assignPermissionToRole(roleId: string, permissionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already assigned
  const existing = await db
    .select()
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const id = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(rolePermissions).values({
    id,
    roleId,
    permissionId,
  });
  
  return id;
}

export async function removePermissionFromRole(roleId: string, permissionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      )
    );
}

export async function createRole(roleName: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  await db.insert(userRoles).values({
    id,
    userId: null,
    role: roleName,
    roleName,
    description: description || null,
    isActive: 1,
    assignedBy: null,
    createdAt: now,
  } as any);
  
  return id;
}

export async function createPermission(permissionName: string, description?: string, category?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(permissions).values({
    id,
    permissionName,
    description,
    category,
  });
  
  return id;
}


/**
 * Set password reset token for a user
 */
export async function setPasswordResetToken(userId: string, token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Set token with 1 hour expiration
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    await db.update(users)
      .set({ 
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt.toISOString().replace('T', ' ').substring(0, 19)
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to set password reset token:", error);
    throw error;
  }
}

/**
 * Get password reset token for a user
 */
export async function getPasswordResetToken(userId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const user = result[0];
    
    // Check if token is expired
    if (user.passwordResetExpiresAt) {
      const expiresAt = new Date(user.passwordResetExpiresAt);
      if (expiresAt < new Date()) {
        // Token expired, clear it
        await clearPasswordResetToken(userId);
        return null;
      }
    }
    
    return user.passwordResetToken || null;
  } catch (error) {
    console.error("[Database] Failed to get password reset token:", error);
    throw error;
  }
}

/**
 * Clear password reset token for a user
 */
export async function clearPasswordResetToken(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.update(users)
      .set({ 
        passwordResetToken: null,
        passwordResetExpiresAt: null
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to clear password reset token:", error);
    throw error;
  }
}

// ============= SUBSCRIPTION UTILITIES =============

export async function getAvailablePlans(tier?: string) {
  const db = await getDb();
  if (!db) return [];

  const baseRows = await db
    .select()
    .from(pricingPlans)
    .where(eq(pricingPlans.isActive, 1))
    .orderBy(pricingPlans.displayOrder, pricingPlans.planName);

  if (!tier) return baseRows;
  return baseRows.filter((plan: any) => plan?.tier === tier);
}

export async function getPricingPlan(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(pricingPlans)
    .where(eq(pricingPlans.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createSubscription(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(subscriptions).values(data);
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, data.id))
    .limit(1);

  return result.length > 0 ? result[0] : data;
}

/**
 * Get client created by a specific user
 * Used for subscription status checks during login
 */
export async function getClientByCreatedBy(userId: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db
      .select()
      .from(clients)
      .where(eq(clients.createdBy, userId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get client by created by:", error);
    return null;
  }
}

/**
 * Get active subscription for a client
 * Used to check subscription status during login and operations
 */
export async function getClientSubscription(clientId: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.clientId, clientId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get client subscription:", error);
    return null;
  }
}

export async function getSubscriptionById(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateSubscription(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(subscriptions)
    .set({ ...(data as any), updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
    .where(eq(subscriptions.id, id));

  return getSubscriptionById(id);
}

export async function getAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(subscriptions)
    .orderBy(desc(subscriptions.createdAt));
}

export async function getOrganizationSubscription(organizationId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createBillingNotification(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(billingNotifications).values(data);
  return data;
}

// ============= ORGANIZATION / MULTI-TENANCY HELPERS =============

export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).limit(500);
}

export async function getOrganization(id: string) {
  const db = await getDb();
  if (!db) return null;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return org ?? null;
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return org ?? null;
}

export async function createOrganization(data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(organizations).values(data);
  return data;
}

export async function updateOrganization(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(organizations).set(data).where(eq(organizations.id, id));
  const [updated] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return updated;
}

export async function deleteOrganization(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(organizationFeatures).where(eq(organizationFeatures.organizationId, id));
  await db.delete(organizations).where(eq(organizations.id, id));
}

export async function getOrganizationFeatures(orgId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationFeatures).where(eq(organizationFeatures.organizationId, orgId));
}

export async function setOrganizationFeature(organizationId: string, featureKey: string, isEnabled: boolean, config?: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select().from(organizationFeatures)
    .where(and(eq(organizationFeatures.organizationId, organizationId), eq(organizationFeatures.featureKey, featureKey)))
    .limit(1);
  if (existing.length > 0) {
    const updateSet: any = { isEnabled: isEnabled ? 1 : 0 };
    if (config !== undefined && config !== null) updateSet.config = config;
    await db.update(organizationFeatures).set(updateSet)
      .where(and(eq(organizationFeatures.organizationId, organizationId), eq(organizationFeatures.featureKey, featureKey)));
  } else {
    const insertValues: any = {
      id: `orgfeat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      featureKey,
      isEnabled: isEnabled ? 1 : 0,
    };
    if (config !== undefined && config !== null) insertValues.config = config;
    await db.insert(organizationFeatures).values(insertValues);
  }
}

export async function getUsersByOrganization(orgId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.organizationId, orgId)).limit(500);
}

export async function assignUserToOrganization(userId: string, orgId: string | null) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users).set({ organizationId: orgId } as any).where(eq(users.id, userId));

  // Keep dedicated org-members table in sync for admin management.
  if (orgId) {
    const [u] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    await db.insert(organizationMembers).values({
      id: `om_${userId}`,
      organizationId: orgId,
      userId,
      role: u?.role || "user",
      status: "active",
      isActive: true,
      joinedAt: new Date(),
    } as any).onDuplicateKeyUpdate({
      set: {
        organizationId: orgId,
        role: u?.role || "user",
        status: "active",
        isActive: true,
        leftAt: null,
        updatedAt: new Date(),
      },
    });
  } else {
    await db
      .update(organizationMembers)
      .set({ status: "removed", isActive: false, leftAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(organizationMembers.userId, userId));
  }
}

export async function getAllTenantSuperAdmins() {
  const db = await getDb();
  if (!db) return [];
  // Only return org-scoped super_admins — exclude Melitech platform admins (no organizationId)
  return db.select().from(users)
    .where(and(eq(users.role, 'super_admin'), isNotNull(users.organizationId)))
    .limit(100);
}

export async function getPricingTierFeatures(tier: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricingTierFeatures).where(eq(pricingTierFeatures.tier, tier));
}

export async function getAllPricingTierFeatures() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricingTierFeatures).limit(1000);
}

export async function setPricingTierFeature(tier: string, featureKey: string, isEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select().from(pricingTierFeatures)
    .where(and(eq(pricingTierFeatures.tier, tier), eq(pricingTierFeatures.featureKey, featureKey)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(pricingTierFeatures).set({ isEnabled: isEnabled ? 1 : 0 })
      .where(and(eq(pricingTierFeatures.tier, tier), eq(pricingTierFeatures.featureKey, featureKey)));
  } else {
    await db.insert(pricingTierFeatures).values({
      id: `ptf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tier, featureKey, isEnabled: isEnabled ? 1 : 0,
    });
  }
}

export async function bulkSetPricingTierFeatures(tier: string, features: Record<string, boolean>) {
  await Promise.all(Object.entries(features).map(([key, enabled]) => setPricingTierFeature(tier, key, enabled)));
}

export async function createTenantMessage(data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(tenantMessages).values(data);
  return data;
}

export async function getTenantMessages(filters?: any) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenantMessages).orderBy(desc(tenantMessages.createdAt)).limit(filters?.limit ?? 100);
}

export async function markTenantMessageRead(messageId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(tenantMessages).set({ isRead: 1 }).where(eq(tenantMessages.id, messageId));
}



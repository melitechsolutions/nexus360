import { v4 as uuidv4 } from "uuid";
import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import * as db from "../db";
import { queueEmail } from "./emailService";

type BillingCycle = "monthly" | "annual";

type LifecycleOptions = {
  graceDays?: number;
  invoiceLeadDays?: number;
  sendInvoiceEmails?: boolean;
  generateInvoices?: boolean;
};

function toSqlDateTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function addBillingCycle(base: Date, cycle: BillingCycle): Date {
  const next = new Date(base);
  if (cycle === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function normalizePlanKey(plan: string | null | undefined): string {
  return (plan || "trial").toLowerCase();
}

function isFreeLikePlan(planKey: string): boolean {
  const key = normalizePlanKey(planKey);
  return key === "trial" || key === "free";
}

async function resolvePlanForOrg(planKey: string) {
  const database = await db.getDb();
  if (!database) return null;
  const { pricingPlans } = await import("../../drizzle/schema");

  const candidates = await database
    .select()
    .from(pricingPlans)
    .where(eq(pricingPlans.isActive, 1));

  const normalized = normalizePlanKey(planKey);
  return (
    candidates.find((p: any) => p.id === normalized) ||
    candidates.find((p: any) => (p.planSlug || "").toLowerCase() === normalized) ||
    candidates.find((p: any) => (p.tier || "").toLowerCase() === normalized) ||
    candidates[0] ||
    null
  );
}

async function resolvePlanCatalog(): Promise<Record<string, any>> {
  const catalog: Record<string, any> = {};
  const setting = await db.getSetting("plan_prices");
  if (setting?.value) {
    try {
      const parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
      if (parsed && typeof parsed === "object") {
        for (const [key, value] of Object.entries(parsed)) {
          catalog[normalizePlanKey(key)] = value;
        }
      }
    } catch {
      // Ignore malformed settings and continue with DB pricingPlans.
    }
  }
  return catalog;
}

async function resolvePlanPrice(planKey: string, cycle: BillingCycle): Promise<string> {
  const plan = await resolvePlanForOrg(planKey);
  if (plan) {
    return String(cycle === "annual" ? (plan as any).annualPrice || "0" : (plan as any).monthlyPrice || "0");
  }

  const catalog = await resolvePlanCatalog();
  const entry = catalog[normalizePlanKey(planKey)];
  if (entry) {
    return String(cycle === "annual" ? entry.annualKes ?? 0 : entry.monthlyKes ?? 0);
  }

  return "0";
}

export async function ensureSubscriptionForOrganization(org: any): Promise<boolean> {
  const database = await db.getDb();
  if (!database) return false;

  const { subscriptions } = await import("../../drizzle/schema");
  const existing = await database
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(or(eq(subscriptions.organizationId, org.id), eq(subscriptions.clientId, org.id)))
    .limit(1);

  if (existing.length > 0) return false;

  const billingCycle: BillingCycle = "monthly";
  const now = new Date();
  const renewalDate = addBillingCycle(now, billingCycle);
  const planKey = normalizePlanKey(org.plan);
  const isOpenPlan = isFreeLikePlan(planKey);
  const currentPrice = await resolvePlanPrice(planKey, billingCycle);

  await database.insert(subscriptions).values({
    id: `sub_${uuidv4().replace(/-/g, "").slice(0, 20)}`,
    organizationId: org.id,
    clientId: null,
    planId: planKey,
    status: isOpenPlan ? "trial" : "suspended",
    billingCycle,
    startDate: toSqlDateTime(now),
    renewalDate: toSqlDateTime(renewalDate),
    currentPrice,
    autoRenew: 1,
    isLocked: isOpenPlan ? 0 : 1,
    createdAt: toSqlDateTime(now),
    updatedAt: toSqlDateTime(now),
  } as any);

  // Ensure org active-state reflects subscription state.
  await database.update((await import("../../drizzle/schema")).organizations)
    .set({ isActive: isOpenPlan ? 1 : 0, updatedAt: toSqlDateTime(now) } as any)
    .where(eq((await import("../../drizzle/schema")).organizations.id, org.id));

  return true;
}

export async function ensureSubscriptionsForAllOrganizations(): Promise<{ checked: number; created: number; errors: number }> {
  const database = await db.getDb();
  if (!database) return { checked: 0, created: 0, errors: 1 };

  const { organizations } = await import("../../drizzle/schema");
  const rows = await database.select().from(organizations);

  let checked = 0;
  let created = 0;
  let errors = 0;

  for (const org of rows as any[]) {
    checked += 1;
    try {
      const made = await ensureSubscriptionForOrganization(org);
      if (made) created += 1;
    } catch (error) {
      errors += 1;
      console.error("[SubscriptionLifecycle] ensure subscription failed", { orgId: org.id, error });
    }
  }

  return { checked, created, errors };
}

async function createRenewalInvoice(subscription: any, org: any, leadDays: number, sendEmail: boolean): Promise<boolean> {
  const database = await db.getDb();
  if (!database) return false;

  const { billingInvoices } = await import("../../drizzle/schema");
  const now = new Date();
  const renewalDate = new Date(subscription.renewalDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysToRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / msPerDay);

  if (daysToRenewal > leadDays) return false;
  if (!subscription.autoRenew) return false;
  if (subscription.status === "cancelled" || subscription.status === "expired") return false;

  const openInvoice = await database
    .select({ id: billingInvoices.id })
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.subscriptionId, subscription.id),
        or(
          eq(billingInvoices.status, "pending"),
          eq(billingInvoices.status, "sent"),
          eq(billingInvoices.status, "viewed")
        ),
        lte(billingInvoices.billingPeriodStart, toSqlDateTime(renewalDate)),
        gte(billingInvoices.billingPeriodEnd, toSqlDateTime(renewalDate))
      )
    )
    .limit(1);

  if (openInvoice.length > 0) return false;

  const invoiceId = `binv_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
  const orgSuffix = (org.id || "ORG").slice(-6).toUpperCase();
  const invoiceNumber = `SUB-${orgSuffix}-${Date.now().toString(36).toUpperCase()}`;
  const nextPeriodEnd = addBillingCycle(renewalDate, subscription.billingCycle as BillingCycle);
  const dueDate = new Date(renewalDate);

  await database.insert(billingInvoices).values({
    id: invoiceId,
    subscriptionId: subscription.id,
    invoiceNumber,
    amount: subscription.currentPrice || "0",
    tax: "0",
    totalAmount: subscription.currentPrice || "0",
    currency: org.currency || "KES",
    status: "pending",
    billingPeriodStart: toSqlDateTime(renewalDate),
    billingPeriodEnd: toSqlDateTime(nextPeriodEnd),
    dueDate: toSqlDateTime(dueDate),
    notes: `Auto-generated subscription renewal invoice for ${org.name || org.id}`,
    createdAt: toSqlDateTime(now),
    updatedAt: toSqlDateTime(now),
  } as any);

  if (sendEmail) {
    const recipient = org.billingEmail || org.contactEmail;
    if (recipient) {
      await queueEmail({
        toEmail: recipient,
        subject: `Subscription Invoice ${invoiceNumber}`,
        htmlContent: `<p>Hello ${org.name || "there"},</p><p>Your subscription invoice <strong>${invoiceNumber}</strong> has been generated.</p><p>Amount: <strong>${subscription.currentPrice || "0"} ${org.currency || "KES"}</strong><br/>Due date: <strong>${dueDate.toDateString()}</strong></p><p>Please complete payment to keep your service active.</p>`,
        relatedEntityType: "billing_invoice",
        relatedEntityId: invoiceId,
      });

      await database.update(billingInvoices)
        .set({ status: "sent", sentAt: toSqlDateTime(new Date()) } as any)
        .where(eq(billingInvoices.id, invoiceId));
    }
  }

  return true;
}

export async function reconcileOrganizationSubscriptionState(options: LifecycleOptions = {}) {
  const {
    graceDays = 3,
    invoiceLeadDays = 7,
    sendInvoiceEmails = true,
    generateInvoices = true,
  } = options;

  const database = await db.getDb();
  if (!database) {
    return { checked: 0, suspended: 0, reactivated: 0, invoicesGenerated: 0, errors: 1 };
  }

  const { subscriptions, organizations, billingInvoices } = await import("../../drizzle/schema");
  const subs = await database.select().from(subscriptions).orderBy(desc(subscriptions.updatedAt));

  const now = new Date();
  let suspended = 0;
  let reactivated = 0;
  let invoicesGenerated = 0;
  let errors = 0;

  for (const sub of subs as any[]) {
    try {
      const orgId = sub.organizationId || sub.clientId;
      if (!orgId) continue;

      const orgRows = await database.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      const org = orgRows[0];
      if (!org) continue;

      const renewalDate = new Date(sub.renewalDate);
      const graceEnd = new Date(renewalDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

      const latestPaid = await database
        .select()
        .from(billingInvoices)
        .where(and(eq(billingInvoices.subscriptionId, sub.id), eq(billingInvoices.status, "paid")))
        .orderBy(desc(billingInvoices.paidAt), desc(billingInvoices.updatedAt))
        .limit(1);

      const overdueUnpaid = await database
        .select({ id: billingInvoices.id })
        .from(billingInvoices)
        .where(
          and(
            eq(billingInvoices.subscriptionId, sub.id),
            or(eq(billingInvoices.status, "pending"), eq(billingInvoices.status, "sent"), eq(billingInvoices.status, "viewed")),
            lte(billingInvoices.dueDate, toSqlDateTime(now))
          )
        )
        .orderBy(desc(billingInvoices.dueDate))
        .limit(1);

      const paidInvoice = latestPaid[0];
      const hasRecentPayment = Boolean(
        paidInvoice &&
        paidInvoice.paidAt &&
        new Date(paidInvoice.paidAt).getTime() >= renewalDate.getTime()
      );

      if (hasRecentPayment) {
        const nextRenewalBase = renewalDate > now ? renewalDate : now;
        const nextRenewal = addBillingCycle(nextRenewalBase, sub.billingCycle as BillingCycle);

        await database.update(subscriptions)
          .set({
            status: "active",
            isLocked: 0,
            renewalDate: toSqlDateTime(nextRenewal),
            updatedAt: toSqlDateTime(now),
          } as any)
          .where(eq(subscriptions.id, sub.id));

        await database.update(organizations)
          .set({ isActive: 1, updatedAt: toSqlDateTime(now) } as any)
          .where(eq(organizations.id, orgId));

        reactivated += 1;
      } else if (overdueUnpaid.length > 0 && now > graceEnd) {
        await database.update(subscriptions)
          .set({
            status: "suspended",
            isLocked: 1,
            updatedAt: toSqlDateTime(now),
          } as any)
          .where(eq(subscriptions.id, sub.id));

        await database.update(organizations)
          .set({ isActive: 0, updatedAt: toSqlDateTime(now) } as any)
          .where(eq(organizations.id, orgId));

        suspended += 1;
      }

      if (generateInvoices) {
        const generated = await createRenewalInvoice(sub, org, invoiceLeadDays, sendInvoiceEmails);
        if (generated) invoicesGenerated += 1;
      }
    } catch (error) {
      errors += 1;
      console.error("[SubscriptionLifecycle] reconcile failed", { subscriptionId: (sub as any)?.id, error });
    }
  }

  return { checked: subs.length, suspended, reactivated, invoicesGenerated, errors };
}

async function createBillingNotification(subscriptionId: string, notificationType: string, message: string, recipientEmail: string): Promise<boolean> {
  const database = await db.getDb();
  if (!database) return false;

  const { billingNotifications } = await import("../../drizzle/schema");
  const now = new Date();
  
  try {
    const notificationId = `bn_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
    await database.insert(billingNotifications).values({
      id: notificationId,
      subscriptionId,
      notificationType: notificationType as any,
      message,
      sentTo: recipientEmail,
      isSent: 0,
      createdAt: toSqlDateTime(now),
    } as any);
    return true;
  } catch (error) {
    console.error("[SubscriptionLifecycle] Failed to create billing notification", error);
    return false;
  }
}

export async function sendPendingBillingNotifications() {
  const database = await db.getDb();
  if (!database) return { sent: 0, failed: 0 };

  const { billingNotifications, subscriptions, organizations } = await import("../../drizzle/schema");
  const pending = await database.select()
    .from(billingNotifications)
    .where(eq(billingNotifications.isSent, 0))
    .orderBy(desc(billingNotifications.createdAt))
    .limit(200);

  let sent = 0;
  let failed = 0;

  for (const note of pending as any[]) {
    try {
      const subRows = await database.select()
        .from(subscriptions)
        .where(eq(subscriptions.id, note.subscriptionId))
        .limit(1);
      const sub = subRows[0];
      if (!sub) continue;

      const orgId = sub.organizationId || sub.clientId;
      if (!orgId) continue;

      const orgRows = await database.select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      const org = orgRows[0];
      if (!org) continue;

      const recipient = note.sentTo || org.billingEmail || org.contactEmail;
      if (!recipient) continue;

      await queueEmail({
        toEmail: recipient,
        subject: `Subscription notice: ${String(note.notificationType).replace(/_/g, " ")}`,
        htmlContent: `<p>Hello ${org.name || "there"},</p><p>${note.message || "Please review your subscription billing status."}</p>`,
        relatedEntityType: "subscription",
        relatedEntityId: sub.id,
      });

      await database.update(billingNotifications)
        .set({
          isSent: 1,
          sentAt: toSqlDateTime(new Date()),
        } as any)
        .where(eq(billingNotifications.id, note.id));

      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("[SubscriptionLifecycle] Failed to send billing notification", { id: (note as any)?.id, error });
    }
  }

  return { sent, failed };
}

export async function runSubscriptionAutomationCycle(options: LifecycleOptions = {}) {
  const ensured = await ensureSubscriptionsForAllOrganizations();
  const reconciled = await reconcileOrganizationSubscriptionState(options);
  const notifications = await sendPendingBillingNotifications();
  return { ensured, reconciled, notifications };
}

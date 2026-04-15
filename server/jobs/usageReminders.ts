import { getDb } from '../db';
import { users, clients, invoices, settings } from '../../drizzle/schema';
import { eq, sql, and, gte, isNull } from 'drizzle-orm';
import { sendEmail } from '../_core/mail';
import { notificationEmail } from '../_core/emailTemplates';

/**
 * Usage Reminder Email Scheduler
 * Sends periodic reminder emails to app users encouraging them to:
 * - Create their first client (if none exist)
 * - Create invoices (if none in the last 30 days)
 * - Complete company profile settings
 *
 * Runs weekly (called from scheduler.ts). Respects a per-user
 * "last_usage_reminder" setting to avoid spamming.
 */

const REMINDER_COOLDOWN_DAYS = 7; // Don't re-send within this window

interface ReminderResult {
  sent: number;
  skipped: number;
  errors: number;
}

export async function sendUsageReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0 };

  try {
    const db = await getDb();
    if (!db) return { ...result, errors: 1 };

    // Check if usage reminders are enabled in settings
    const reminderRows = await db.select().from(settings)
      .where(and(eq(settings.category, 'notifications'), eq(settings.key, 'usageReminders')))
      .limit(1);
    if (reminderRows[0]?.value === 'false') {
      return result; // Disabled
    }

    // Fetch company info for email branding
    const companyRows = await db.select().from(settings).where(eq(settings.category, 'company'));
    const company: Record<string, string> = {};
    companyRows.forEach(s => { if (s.key) company[s.key] = s.value ?? ''; });
    const appName = company.name || 'CRM';

    // Get all active staff/admin users (not client role)
    const activeUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      organizationId: users.organizationId,
    }).from(users)
      .where(and(
        eq(users.isActive, 1),
        sql`${users.role} NOT IN ('client')`,
      ));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REMINDER_COOLDOWN_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 19).replace('T', ' ');

    for (const user of activeUsers) {
      try {
        if (!user.email) { result.skipped++; continue; }

        // Check cooldown – look for a setting key "usage_reminder_<userId>"
        const lastSentRows = await db.select().from(settings)
          .where(and(
            eq(settings.category, 'usage_reminders'),
            eq(settings.key, user.id),
          )).limit(1);

        if (lastSentRows[0]?.value && lastSentRows[0].value > cutoffStr) {
          result.skipped++;
          continue;
        }

        // Gather user-specific stats
        const orgFilter = user.organizationId
          ? eq(clients.organizationId, user.organizationId)
          : sql`1=1`;

        const [clientCount] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(clients)
          .where(orgFilter);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

        const [invoiceCount] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(invoices)
          .where(and(
            gte(invoices.createdAt, thirtyDaysStr),
            user.organizationId ? eq(invoices.organizationId, user.organizationId) : sql`1=1`,
          ));

        // Build reminder items
        const tips: string[] = [];
        if (Number(clientCount?.count ?? 0) === 0) {
          tips.push('Add your first client to start managing contacts and sending invoices.');
        }
        if (Number(invoiceCount?.count ?? 0) === 0) {
          tips.push('Create an invoice to get paid faster – you haven\'t sent one in the last 30 days.');
        }
        if (!company.name) {
          tips.push('Complete your company profile in Settings so your documents look professional.');
        }

        // Only send if there are actionable tips
        if (tips.length === 0) {
          result.skipped++;
          continue;
        }

        const tipsHtml = `<ul style="margin: 16px 0; padding-left: 0; list-style: none;">${tips.map(t =>
          `<li style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px; font-family: Arial, sans-serif;">
            <span style="color: #4F46E5; font-weight: bold; margin-right: 8px;">→</span>${t}
          </li>`
        ).join('')}</ul>`;

        const emailPayload = notificationEmail({
          title: 'Boost your productivity this week',
          recipientName: user.name || 'there',
          message: `<p style="margin: 0 0 16px; color: #374151; font-size: 15px;">Here are some quick actions to help you get the most out of <strong>${appName}</strong>:</p>${tipsHtml}<p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">You can disable these reminders in <strong>Settings → Notifications</strong>.</p>`,
          branding: { companyName: appName },
        });

        await sendEmail({
          to: user.email,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text,
        });

        // Record sent timestamp
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        if (lastSentRows[0]) {
          await db.update(settings)
            .set({ value: now })
            .where(and(eq(settings.category, 'usage_reminders'), eq(settings.key, user.id)));
        } else {
          await db.insert(settings).values({
            id: crypto.randomUUID(),
            category: 'usage_reminders',
            key: user.id,
            value: now,
          });
        }

        result.sent++;
      } catch (err) {
        console.error(`[USAGE_REMINDERS] Error processing user ${user.id}:`, err);
        result.errors++;
      }
    }
  } catch (err) {
    console.error('[USAGE_REMINDERS] Fatal error:', err);
    result.errors++;
  }

  return result;
}

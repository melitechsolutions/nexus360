/**
 * Organization Subscription Jobs
 * Creates and manages recurring subscription-related jobs when organizations are created.
 * Handles trial expiration, billing cycles, renewal reminders, and usage monitoring.
 */

import { getPool } from '../db';
import { v4 as uuidv4 } from 'uuid';

// Tier configurations for subscription jobs
const TIER_JOB_CONFIG: Record<string, {
  trialDays: number;
  billingCycleDays: number;
  reminderBeforeDays: number[];
  usageCheckInterval: string;  // cron expression
  maxUsers: number;
}> = {
  trial: { trialDays: 14, billingCycleDays: 0, reminderBeforeDays: [3, 1], usageCheckInterval: '0 8 * * *', maxUsers: 10 },
  starter: { trialDays: 0, billingCycleDays: 30, reminderBeforeDays: [7, 3, 1], usageCheckInterval: '0 6 * * *', maxUsers: 50 },
  professional: { trialDays: 0, billingCycleDays: 30, reminderBeforeDays: [7, 3, 1], usageCheckInterval: '0 6 * * *', maxUsers: 200 },
  enterprise: { trialDays: 0, billingCycleDays: 30, reminderBeforeDays: [14, 7, 3, 1], usageCheckInterval: '0 0 * * *', maxUsers: 99999 },
  custom: { trialDays: 0, billingCycleDays: 30, reminderBeforeDays: [7, 3, 1], usageCheckInterval: '0 6 * * *', maxUsers: 99999 },
};

/**
 * Create all subscription-related scheduled jobs when a new organization is created.
 * Jobs are tied to the organization and run from the date of creation.
 */
export async function createOrgSubscriptionJobs(orgId: string, orgName: string, plan: string): Promise<{ jobsCreated: string[] }> {
  const pool = getPool();
  const config = TIER_JOB_CONFIG[plan] || TIER_JOB_CONFIG['trial'];
  const jobsCreated: string[] = [];
  const now = new Date();

  // 1. Trial Expiration Monitor (for trial plans only)
  if (plan === 'trial') {
    const trialEndDate = new Date(now.getTime() + config.trialDays * 24 * 60 * 60 * 1000);
    const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, nextScheduledRun, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'custom', '0 8 * * *', ?, 1, 0, ?, 'Africa/Nairobi', ?, ?)`,
      [
        jobId,
        `org_trial_expiry_${orgId}`,
        `Trial expiration monitor for ${orgName}`,
        `orgTrialExpiry:${orgId}`,
        trialEndDate.toISOString().slice(0, 19).replace('T', ' '),
        orgId,
        orgId,
      ]
    );
    jobsCreated.push('trial_expiration');
  }

  // 2. Subscription Renewal Job (for paid plans)
  if (plan !== 'trial') {
    const nextRenewal = new Date(now.getTime() + config.billingCycleDays * 24 * 60 * 60 * 1000);
    const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, nextScheduledRun, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'subscription_renewal', '0 2 * * *', ?, 1, 0, ?, 'Africa/Nairobi', ?, ?)`,
      [
        jobId,
        `org_renewal_${orgId}`,
        `Subscription renewal for ${orgName} (${plan})`,
        `orgRenewal:${orgId}`,
        nextRenewal.toISOString().slice(0, 19).replace('T', ' '),
        orgId,
        orgId,
      ]
    );
    jobsCreated.push('subscription_renewal');
  }

  // 3. Payment Reminder Job (for all orgs — reminds before billing/trial end)
  {
    const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'payment_reminder', '0 9 * * *', ?, 1, 0, 'Africa/Nairobi', ?, ?)`,
      [
        jobId,
        `org_payment_reminder_${orgId}`,
        `Payment/billing reminders for ${orgName}`,
        `orgPaymentReminder:${orgId}`,
        orgId,
        orgId,
      ]
    );
    jobsCreated.push('payment_reminder');
  }

  // 4. Usage Monitor Job (checks user count, storage, feature usage)
  {
    const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'custom', ?, ?, 1, 0, 'Africa/Nairobi', ?, ?)`,
      [
        jobId,
        `org_usage_monitor_${orgId}`,
        `Usage monitoring for ${orgName} (max ${config.maxUsers} users)`,
        `orgUsageMonitor:${orgId}`,
        config.usageCheckInterval,
        orgId,
        orgId,
      ]
    );
    jobsCreated.push('usage_monitor');
  }

  // 5. Billing Invoice Generation Job (generates monthly invoices for paid plans)
  if (plan !== 'trial') {
    const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'recurring_invoice', '0 1 1 * *', ?, 1, 0, 'Africa/Nairobi', ?, ?)`,
      [
        jobId,
        `org_billing_invoice_${orgId}`,
        `Monthly billing invoice generation for ${orgName}`,
        `orgBillingInvoice:${orgId}`,
        orgId,
        orgId,
      ]
    );
    jobsCreated.push('billing_invoice');
  }

  console.log(`[OrgSubscription] Created ${jobsCreated.length} jobs for org ${orgName} (${plan}):`, jobsCreated);
  return { jobsCreated };
}

/**
 * Update subscription jobs when an organization's tier/plan changes.
 * Removes old trial job if upgrading from trial, adjusts renewal schedules, etc.
 */
export async function updateOrgSubscriptionJobs(orgId: string, orgName: string, oldPlan: string, newPlan: string): Promise<{ updated: string[], created: string[], removed: string[] }> {
  const pool = getPool();
  const newConfig = TIER_JOB_CONFIG[newPlan] || TIER_JOB_CONFIG['trial'];
  const updated: string[] = [];
  const created: string[] = [];
  const removed: string[] = [];

  // If upgrading FROM trial, remove trial expiry job and add paid jobs
  if (oldPlan === 'trial' && newPlan !== 'trial') {
    // Remove trial expiry job
    await pool.query(`DELETE FROM scheduledJobs WHERE jobName = ?`, [`org_trial_expiry_${orgId}`]);
    removed.push('trial_expiration');

    // Create subscription renewal job
    const now = new Date();
    const nextRenewal = new Date(now.getTime() + newConfig.billingCycleDays * 24 * 60 * 60 * 1000);
    const renewalJobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, nextScheduledRun, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'subscription_renewal', '0 2 * * *', ?, 1, 0, ?, 'Africa/Nairobi', ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), isActive = 1`,
      [
        renewalJobId,
        `org_renewal_${orgId}`,
        `Subscription renewal for ${orgName} (${newPlan})`,
        `orgRenewal:${orgId}`,
        nextRenewal.toISOString().slice(0, 19).replace('T', ' '),
        orgId,
        orgId,
      ]
    );
    created.push('subscription_renewal');

    // Create billing invoice job
    const invoiceJobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'recurring_invoice', '0 1 1 * *', ?, 1, 0, 'Africa/Nairobi', ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), isActive = 1`,
      [
        invoiceJobId,
        `org_billing_invoice_${orgId}`,
        `Monthly billing invoice generation for ${orgName}`,
        `orgBillingInvoice:${orgId}`,
        orgId,
        orgId,
      ]
    );
    created.push('billing_invoice');
  }

  // If downgrading TO trial from paid, remove paid jobs and add trial expiry
  if (oldPlan !== 'trial' && newPlan === 'trial') {
    await pool.query(`DELETE FROM scheduledJobs WHERE jobName = ?`, [`org_renewal_${orgId}`]);
    await pool.query(`DELETE FROM scheduledJobs WHERE jobName = ?`, [`org_billing_invoice_${orgId}`]);
    removed.push('subscription_renewal', 'billing_invoice');

    const now = new Date();
    const trialEndDate = new Date(now.getTime() + newConfig.trialDays * 24 * 60 * 60 * 1000);
    const trialJobId = `job_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    await pool.query(
      `INSERT INTO scheduledJobs (id, jobName, description, jobType, cronExpression, handler, isActive, isManualOnly, nextScheduledRun, timezone, createdBy, organizationId)
       VALUES (?, ?, ?, 'custom', '0 8 * * *', ?, 1, 0, ?, 'Africa/Nairobi', ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), isActive = 1`,
      [
        trialJobId,
        `org_trial_expiry_${orgId}`,
        `Trial expiration monitor for ${orgName}`,
        `orgTrialExpiry:${orgId}`,
        trialEndDate.toISOString().slice(0, 19).replace('T', ' '),
        orgId,
        orgId,
      ]
    );
    created.push('trial_expiration');
  }

  // Update usage monitor cron schedule for new tier
  await pool.query(
    `UPDATE scheduledJobs SET cronExpression = ?, description = ? WHERE jobName = ?`,
    [
      newConfig.usageCheckInterval,
      `Usage monitoring for ${orgName} (max ${newConfig.maxUsers} users)`,
      `org_usage_monitor_${orgId}`,
    ]
  );
  updated.push('usage_monitor');

  // Update renewal job description if both old and new are paid
  if (oldPlan !== 'trial' && newPlan !== 'trial') {
    await pool.query(
      `UPDATE scheduledJobs SET description = ? WHERE jobName = ?`,
      [`Subscription renewal for ${orgName} (${newPlan})`, `org_renewal_${orgId}`]
    );
    updated.push('subscription_renewal');
  }

  // Update payment reminder description
  await pool.query(
    `UPDATE scheduledJobs SET description = ? WHERE jobName = ?`,
    [`Payment/billing reminders for ${orgName} (${newPlan})`, `org_payment_reminder_${orgId}`]
  );
  updated.push('payment_reminder');

  console.log(`[OrgSubscription] Tier change ${oldPlan} → ${newPlan} for ${orgName}: updated=${updated}, created=${created}, removed=${removed}`);
  return { updated, created, removed };
}

/**
 * Remove all subscription jobs for an organization (e.g. on org deletion)
 */
export async function removeOrgSubscriptionJobs(orgId: string): Promise<number> {
  const pool = getPool();
  const patterns = [
    `org_trial_expiry_${orgId}`,
    `org_renewal_${orgId}`,
    `org_payment_reminder_${orgId}`,
    `org_usage_monitor_${orgId}`,
    `org_billing_invoice_${orgId}`,
  ];
  let removed = 0;
  for (const jobName of patterns) {
    const [result]: any = await pool.query(`DELETE FROM scheduledJobs WHERE jobName = ?`, [jobName]);
    removed += result.affectedRows || 0;
  }
  console.log(`[OrgSubscription] Removed ${removed} jobs for org ${orgId}`);
  return removed;
}

import { router, protectedProcedure, publicProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../_core/mail";
import { emailQueue, emailLog } from "../../drizzle/schema";
import { eq, and, lte, or, sql, desc } from "drizzle-orm";

/**
 * Queue an email for sending (with retry logic)
 */
export async function queueEmail(input: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for email queue");
    return { success: false, error: "Database not available" };
  }

  try {
    const queueId = uuidv4();
    await db.insert(emailQueue).values({
      id: queueId,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    console.log(`[EMAIL QUEUE] Queued email ${queueId} to ${input.recipientEmail}`);
    return { success: true, queueId };
  } catch (error) {
    console.error("[EMAIL QUEUE] Error queueing email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Process pending emails from queue
 * Run via cron job or manual trigger
 */
export async function processEmailQueue() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for email processing");
    return { success: false, processed: 0, failed: 0 };
  }

  try {
    // Get pending emails ready to send (pending or retrying with nextRetryAt <= now)
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const pendingEmails = await db
      .select()
      .from(emailQueue)
      .where(
        or(
          eq(emailQueue.status, "pending"),
          and(eq(emailQueue.status, "retrying"), lte(emailQueue.nextRetryAt, now))
        )
      )
      .limit(50);
    let processed = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        // Attempt to send the email
        const result = await sendEmail({
          to: email.recipientEmail,
          subject: email.subject,
          html: email.htmlContent,
          text: email.textContent || undefined,
        });

        if (result.success) {
          // Mark as sent
          await db.update(emailQueue).set({ status: "sent", sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19) }).where(eq(emailQueue.id, email.id));

          // Log successful send
          await db.insert(emailLog).values({
            id: uuidv4(),
            queueId: email.id,
            recipientEmail: email.recipientEmail,
            subject: email.subject,
            eventType: email.eventType,
            status: "sent",
            messageId: (result as any).messageId || "",
            sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });

          console.log(`[EMAIL QUEUE] Processed email ${email.id} to ${email.recipientEmail} - SUCCESS`);
          processed++;
        } else {
          // Handle retry
          const attempts = (email.attempts || 0) + 1;
          if (attempts < (email.maxAttempts || 3)) {
            // Schedule next retry (exponential backoff: 5min, 30min, 24hrs)
            const backoffMs = Math.pow(5, attempts) * 60000;
            const nextRetry = new Date(Date.now() + backoffMs).toISOString().replace('T', ' ').substring(0, 19);

            await db.update(emailQueue).set({
              status: "retrying",
              attempts,
              lastAttemptAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              nextRetryAt: nextRetry,
              errorMessage: (result as any).error || "Send failed",
            }).where(eq(emailQueue.id, email.id));
            console.log(`[EMAIL QUEUE] Email ${email.id} will retry at ${nextRetry}`);
          } else {
            // Max retries exceeded
            await db.update(emailQueue).set({ status: "failed", errorMessage: (result as any).error || "Max retries exceeded" }).where(eq(emailQueue.id, email.id));

            await db.insert(emailLog).values({
              id: uuidv4(),
              queueId: email.id,
              recipientEmail: email.recipientEmail,
              subject: email.subject,
              eventType: email.eventType,
              status: "failed",
              errorMessage: (result as any).error,
              sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            });

            console.log(`[EMAIL QUEUE] Email ${email.id} to ${email.recipientEmail} - FAILED after ${attempts} attempts`);
            failed++;
          }
        }
      } catch (error) {
        console.error(`[EMAIL QUEUE] Error processing email ${email.id}:`, error);
        failed++;
      }
    }

    return { success: true, processed, failed, total: pendingEmails.length };
  } catch (error) {
    console.error("[EMAIL QUEUE] Error processing queue:", error);
    return { success: false, error: String(error), processed: 0, failed: 0 };
  }
}

export const emailQueueRouter = router({
  /**
   * Get queue status and stats
   */
  getStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { pending: 0, failed: 0, sent: 0, retrying: 0 };
    }

    try {
      const rows = await db
        .select({ status: emailQueue.status, count: sql<number>`count(*)` })
        .from(emailQueue)
        .groupBy(emailQueue.status);
      const stats: Record<string, number> = { pending: 0, failed: 0, sent: 0, retrying: 0 };
      for (const r of rows) stats[r.status] = Number(r.count);
      return stats;
    } catch (error) {
      console.error("[EMAIL QUEUE] Error getting status:", error);
      return { pending: 0, failed: 0, sent: 0, retrying: 0 };
    }
  }),

  /**
   * Get queue entries (admin view)
   */
  getQueue: createFeatureRestrictedProcedure("communications:email_queue")
    .input(
      z.object({
        status: z.enum(["pending", "sent", "failed", "retrying"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { entries: [], total: 0 };
      }

      try {
        const conditions: any[] = [];
        if (input.status) conditions.push(eq(emailQueue.status, input.status));
        const entries = await db
          .select()
          .from(emailQueue)
          .where(conditions.length === 1 ? conditions[0] : undefined)
          .orderBy(desc(emailQueue.createdAt))
          .limit(input.limit)
          .offset(input.offset);
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(emailQueue)
          .where(conditions.length === 1 ? conditions[0] : undefined);
        const total = Number(countResult[0]?.count ?? 0);
        return { entries, total };
      } catch (error) {
        console.error("[EMAIL QUEUE] Error getting queue entries:", error);
        return { entries: [], total: 0 };
      }
    }),

  /**
   * Manually process queue (admin trigger)
   */
  processQueue: createFeatureRestrictedProcedure("communications:email_queue").mutation(async ({ ctx }) => {
    // Check admin/system role
    if (ctx.user?.role !== "admin" && ctx.user?.role !== "super_admin" && ctx.user?.role !== "system") {
      throw new Error("Unauthorized - admin only");
    }

    const result = await processEmailQueue();
    return result;
  }),

  /**
   * Retry a specific failed email
   */
  retryEmail: createFeatureRestrictedProcedure("communications:email_queue")
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "super_admin") {
        throw new Error("Unauthorized - admin only");
      }

      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Reset to pending for retry
        await db.update(emailQueue)
          .set({ status: "pending", attempts: 0, errorMessage: null, nextRetryAt: null })
          .where(eq(emailQueue.id, input.emailId));
        console.log(`[EMAIL QUEUE] Email ${input.emailId} marked for retry`);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Get email logs for auditing
   */
  getLogs: createFeatureRestrictedProcedure("communications:email_queue")
    .input(
      z.object({
        status: z.enum(["sent", "failed"]).optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { logs: [], total: 0 };
      }

      try {
        const conditions: any[] = [];
        if (input.status) conditions.push(eq(emailLog.status, input.status as any));
        const logs = await db
          .select()
          .from(emailLog)
          .where(conditions.length === 1 ? conditions[0] : undefined)
          .orderBy(desc(emailLog.sentAt))
          .limit(input.limit)
          .offset(input.offset);
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(emailLog)
          .where(conditions.length === 1 ? conditions[0] : undefined);
        const total = Number(countResult[0]?.count ?? 0);
        return { logs, total };
      } catch (error) {
        console.error("[EMAIL QUEUE] Error getting logs:", error);
        return { logs: [], total: 0 };
      }
    }),
});

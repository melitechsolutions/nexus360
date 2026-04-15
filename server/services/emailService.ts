/**
 * Email Service with Queue Management
 * Handles email queuing, retry logic, template rendering, and delivery tracking
 * 
 * SMTP configuration is resolved from environment variables first,
 * then falls back to database settings (Settings → Email).
 */

import { TRPCError } from '@trpc/server';
import { sendEmail } from '../_core/mail';
import * as db from '../db';
import { v4 as uuidv4 } from 'uuid';

interface QueueEmailInput {
  toEmail: string;
  subject: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  htmlContent?: string;
  plainTextContent?: string;
  attachments?: any[];
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  variables?: string[];
}

class EmailService {
  private emailFrom: string;

  constructor() {
    this.emailFrom = process.env.EMAIL_FROM || 'noreply@crm.local';
  }

  /**
   * Queue an email for sending
   */
  async queueEmail(input: QueueEmailInput): Promise<{ queueId: string }> {
    try {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;
      const queueId = uuidv4();

      await database.insert(emailQueue).values({
        id: queueId,
        toEmail: input.toEmail,
        subject: input.subject,
        templateId: input.templateId,
        templateVariables: input.templateVariables as any,
        htmlContent: input.htmlContent,
        plainTextContent: input.plainTextContent,
        attachments: input.attachments as any,
        status: 'pending',
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      });

      return { queueId };
    } catch (error) {
      console.error('[Email] Queue error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to queue email',
      });
    }
  }

  /**
   * Send email immediately (bypasses queue)
   */
  async sendEmailImmediately(input: QueueEmailInput): Promise<{ success: boolean; messageId?: string }> {
    try {
      const result = await sendEmail({
        to: input.toEmail,
        subject: input.subject,
        html: input.htmlContent,
        text: input.plainTextContent,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[Email] Send error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send email',
      });
    }
  }

  /**
   * Process email queue (background job)
   */
  async processEmailQueue(batchSize: number = 10): Promise<{ sent: number; failed: number }> {
    try {
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database connection lost');
      }

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;
      const { eq, and, lt, or } = await import('drizzle-orm');

      // Get pending emails that are ready to retry
      const now = new Date();
      const pendingEmails = await database.select()
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.status, 'pending' as any),
            or(
              eq(emailQueue.nextRetryAt, null),
              lt(emailQueue.nextRetryAt, now)
            )
          )
        )
        .limit(batchSize);

      let sent = 0;
      let failed = 0;

      for (const email of pendingEmails) {
        try {
          // Update status to sending
          await database.update(emailQueue)
            .set({ status: 'sending' as any })
            .where(eq(emailQueue.id, email.id));

          // Send email via shared mail module (reads SMTP from env + DB settings)
          const result = await sendEmail({
            to: email.toEmail,
            subject: email.subject,
            html: email.htmlContent,
            text: email.plainTextContent,
          });

          if (!result.success) {
            throw new Error(result.error || 'Send failed');
          }

          // Mark as sent
          await database.update(emailQueue)
            .set({
              status: 'sent' as any,
              sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            })
            .where(eq(emailQueue.id, email.id));

          sent++;
        } catch (error) {
          failed++;
          const attemptCount = (email.attemptCount || 0) + 1;
          const maxAttempts = email.maxAttempts || 3;

          if (attemptCount < maxAttempts) {
            // Schedule retry (exponential backoff: 5min, 15min, 60min)
            const delayMinutes = [5, 15, 60][attemptCount - 1] || 60;
            const nextRetry = new Date(now.getTime() + delayMinutes * 60 * 1000);

            await database.update(emailQueue)
              .set({
                status: 'pending' as any,
                attemptCount,
                nextRetryAt: nextRetry,
                failureReason: error instanceof Error ? error.message : String(error),
              })
              .where(eq(emailQueue.id, email.id));
          } else {
            // Max retries exhausted
            await database.update(emailQueue)
              .set({
                status: 'failed' as any,
                attemptCount,
                failureReason: `Failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
              })
              .where(eq(emailQueue.id, email.id));
          }
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('[Email] Queue processing error:', error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Get email queue status
   */
  async getQueueStatus() {
    try {
      const database = await db.getDb();
      if (!database) throw new Error('Database connection lost');

      const emailQueue = (await import('../../drizzle/schema')).emailQueue;

      const counts = await database.select()
        .from(emailQueue);

      const statuses = {
        pending: counts.filter((e) => e.status === 'pending').length,
        sending: counts.filter((e) => e.status === 'sending').length,
        sent: counts.filter((e) => e.status === 'sent').length,
        failed: counts.filter((e) => e.status === 'failed').length,
        bounced: counts.filter((e) => e.status === 'bounced').length,
      };

      return statuses;
    } catch (error) {
      console.error('[Email] Queue status error:', error);
      return { pending: 0, sending: 0, sent: 0, failed: 0, bounced: 0 };
    }
  }

  /**
   * Get configured status
   */
  getStatus() {
    return {
      isConfigured: true, // Config is resolved lazily from env + DB settings
      emailFrom: this.emailFrom,
    };
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
export const queueEmail = (input: QueueEmailInput) => emailService.queueEmail(input);
export const sendEmailImmediately = (input: QueueEmailInput) => emailService.sendEmailImmediately(input);
export const processEmailQueue = (batchSize?: number) => emailService.processEmailQueue(batchSize);
export const getEmailQueueStatus = () => emailService.getQueueStatus();
export const getEmailStatus = () => emailService.getStatus();

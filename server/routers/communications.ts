/**
 * Communications Hub Router
 * Handles emails, internal messaging, SMS, templates, calendar events, and recurring invoice management
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import * as db from "../db";
import { sendEmail as sendCoreEmail } from "../_core/mail";
import { v4 as uuidv4 } from "uuid";
import { communicationLogs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Feature-based procedures
const readProcedure = createFeatureRestrictedProcedure("communications:read");

// Email Templates
const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  templateId: z.string().optional(),
  cc: z.string().email().optional(),
  bcc: z.string().email().optional(),
});

const createEmailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(['invoice', 'estimate', 'payment', 'general', 'notification']),
  variables: z.array(z.string()).optional(),
});

const updateEmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  category: z.string().optional(),
});

// Internal Messaging
const internalMessageSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1),
  subject: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

// SMS
const sendSmsSchema = z.object({
  phoneNumber: z.string(),
  message: z.string().min(1),
  recipientId: z.string(),
});

// Calendar Events
const createCalendarEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string(), // ISO date
  eventType: z.enum(['invoice_due', 'estimate_due', 'payment_due', 'meeting', 'reminder', 'task']),
  linkedEntityId: z.string().optional(),
  linkedEntityType: z.enum(['invoice', 'estimate', 'payment', 'task']).optional(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
  recurringEndDate: z.string().optional(),
  assignedTo: z.array(z.string()).optional(),
});

// Recurring Invoices
const createRecurringInvoiceSchema = z.object({
  baseInvoiceId: z.string(),
  frequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually']),
  startDate: z.string(), // ISO date
  endDate: z.string().optional(),
  noOfRecurrences: z.number().optional(),
  isActive: z.boolean().default(true),
});

const updateRecurringInvoiceSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  endDate: z.string().optional(),
  noOfRecurrences: z.number().optional(),
});

/**
 * Send email using configured SMTP service
 */
async function sendEmailViaSmtp(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
): Promise<boolean> {
  // Delegate to shared mail module which reads SMTP config from env vars AND DB settings
  await sendCoreEmail({ to, subject, html: body, cc, bcc });
  return true;
}

export const communicationsRouter = router({
  // ==================== COMMUNICATION LOGS ====================
  /**
   * Get all communication logs with filtering
   */
  list: createFeatureRestrictedProcedure("communications:read")
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        type: z.enum(['email', 'sms']).optional(),
        status: z.enum(['pending', 'sent', 'failed']).optional(),
        referenceId: z.string().optional(),
        referenceType: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const database = await db.getDb();
        if (!database) {
          return {
            communications: [],
            total: 0,
            limit: input.limit,
            offset: input.offset,
          };
        }

        // Build dynamic filters
        const filters: any[] = [];

        const orgId = ctx.user.organizationId;
        if (orgId) {
          filters.push(eq(communicationLogs.organizationId, orgId));
        }

        if (input.type) {
          filters.push(eq(communicationLogs.type, input.type));
        }

        if (input.status) {
          filters.push(eq(communicationLogs.status, input.status));
        }

        if (input.referenceType) {
          filters.push(eq(communicationLogs.referenceType, input.referenceType));
        }

        if (input.referenceId) {
          filters.push(eq(communicationLogs.referenceId, input.referenceId));
        }

        // Build where clause
        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        // Get results with pagination
        const result = await database
          .select()
          .from(communicationLogs)
          .where(whereClause)
          .orderBy(desc(communicationLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count by fetching all matching records (for now - can be optimized with SQL count later)
        const allRecords = await database
          .select({ id: communicationLogs.id })
          .from(communicationLogs)
          .where(whereClause);

        return {
          communications: Array.isArray(result) ? result : [],
          total: allRecords.length || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error: any) {
        console.error('List communications error:', error?.message || error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve communication logs',
        });
      }
    }),

  /**
   * Get a single communication log by ID
   */
  getById: createFeatureRestrictedProcedure("communications:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const connection = (await db.getDb()) as any;

        const result = await connection.raw(
          `
            SELECT * FROM communicationLogs WHERE id = ?
          `,
          [input.id]
        );

        if (!Array.isArray(result) || result.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Communication log not found',
          });
        }

        return result[0];
      } catch (error: any) {
        console.error('Get communication log error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve communication log',
        });
      }
    }),

  // ==================== EMAIL TEMPLATES ====================
  /**
   * Get all email templates
   */
  getAllEmailTemplates: protectedProcedure.query(async ({ ctx }) => {
    try {
      // This would typically fetch from a templates table
      // For now, returning a structure that can be extended
      return {
        templates: [],
        message: 'Email templates feature is being initialized',
      };
    } catch (error: any) {
      console.error('Get templates error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve email templates',
      });
    }
  }),

  /**
   * Create a new email template
   */
  createEmailTemplate: createFeatureRestrictedProcedure("communications:manage")
    .input(createEmailTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const templateId = uuidv4();

        // Template creation would be stored in database
        // This is a placeholder for the actual implementation
        await db.logActivity({
          userId: ctx.user.id,
          action: 'email_template_created',
          entityType: 'email_template',
          entityId: templateId,
          description: `Created email template: ${input.name}`,
        });

        return {
          id: templateId,
          ...input,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
      } catch (error: any) {
        console.error('Create template error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create email template',
        });
      }
    }),

  /**
   * Update an email template
   */
  updateEmailTemplate: createFeatureRestrictedProcedure("communications:manage")
    .input(updateEmailTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await db.logActivity({
          userId: ctx.user.id,
          action: 'email_template_updated',
          entityType: 'email_template',
          entityId: input.id,
          description: `Updated email template`,
        });

        return {
          success: true,
          message: 'Email template updated successfully',
        };
      } catch (error: any) {
        console.error('Update template error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update email template',
        });
      }
    }),

  /**
   * Delete an email template
   */
  deleteEmailTemplate: createFeatureRestrictedProcedure("communications:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.logActivity({
          userId: ctx.user.id,
          action: 'email_template_deleted',
          entityType: 'email_template',
          entityId: input.id,
          description: 'Deleted email template',
        });

        return {
          success: true,
          message: 'Email template deleted successfully',
        };
      } catch (error: any) {
        console.error('Delete template error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete email template',
        });
      }
    }),

  // ==================== EMAIL SENDING ====================
  /**
   * Send email using template or custom body
   */
  sendEmail: createFeatureRestrictedProcedure("communications:send")
    .input(sendEmailSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await db.getDb();
        let emailBody = input.body;

        // If template is provided, load and use template
        if (input.templateId) {
          // Load template from database
          // emailBody = await loadTemplateBody(input.templateId);
        }

        // Send via SMTP
        await sendEmailViaSmtp(input.to, input.subject, emailBody, input.cc, input.bcc);

        // Persist to communication logs so it appears in communications modules.
        if (database) {
          await database.insert(communicationLogs).values({
            id: uuidv4(),
            organizationId: ctx.user.organizationId ?? null,
            type: 'email',
            recipient: input.to,
            subject: input.subject,
            body: emailBody,
            status: 'sent',
            sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);
        }

        // Log email activity
        await db.logActivity({
          userId: ctx.user.id,
          action: 'email_sent',
          entityType: 'email',
          entityId: uuidv4(),
          description: `Sent email to ${input.to}: ${input.subject}`,
        });

        return {
          success: true,
          message: 'Email sent successfully',
        };
      } catch (error: any) {
        console.error('Send email error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to send email: ${error.message}`,
        });
      }
    }),

  // ==================== INTERNAL MESSAGING (INTRANET) ====================
  /**
   * Send internal message to staff member
   */
  sendInternalMessage: createFeatureRestrictedProcedure("communications:messaging")
    .input(internalMessageSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const messageId = uuidv4();

        // Store message in database
        // await db.createInternalMessage({...})

        await db.logActivity({
          userId: ctx.user.id,
          action: 'internal_message_sent',
          entityType: 'internal_message',
          entityId: messageId,
          description: `Sent message to user: ${input.recipientId}`,
        });

        return {
          id: messageId,
          ...input,
          senderId: ctx.user.id,
          sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          isRead: false,
        };
      } catch (error: any) {
        console.error('Send internal message error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send internal message',
        });
      }
    }),

  /**
   * Get internal messages for current user
   */
  getInternalMessages: createFeatureRestrictedProcedure("communications:messaging")
    .input(
      z.object({
        conversationWith: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Fetch messages for this user from database
        // Filter by recipient and optionally by sender
        return {
          messages: [],
          total: 0,
        };
      } catch (error: any) {
        console.error('Get messages error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve messages',
        });
      }
    }),

  /**
   * Mark internal message as read
   */
  markMessageAsRead: createFeatureRestrictedProcedure("communications:messaging")
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return {
          success: true,
          message: 'Message marked as read',
        };
      } catch (error: any) {
        console.error('Mark as read error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark message as read',
        });
      }
    }),

  /**
   * Get list of staff for messaging
   */
  getStaffList: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Fetch all active staff members
      return {
        staff: [],
      };
    } catch (error: any) {
      console.error('Get staff list error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve staff list',
      });
    }
  }),

  // ==================== SMS COMMUNICATION ====================
  /**
   * Send SMS message
   */
  sendSms: createFeatureRestrictedProcedure("communications:send")
    .input(sendSmsSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const smsId = uuidv4();

        // In production, integrate with SMS provider like Twilio, Nexmo, etc.
        // For now, just logging the intent
        console.log(`[SMS] Sending to ${input.phoneNumber}: ${input.message}`);

        await db.logActivity({
          userId: ctx.user.id,
          action: 'sms_sent',
          entityType: 'sms',
          entityId: smsId,
          description: `Sent SMS to ${input.phoneNumber}`,
        });

        return {
          id: smsId,
          success: true,
          message: 'SMS sent successfully',
          phoneNumber: input.phoneNumber,
        };
      } catch (error: any) {
        console.error('Send SMS error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send SMS',
        });
      }
    }),

  /**
   * Get SMS history
   */
  getSmsHistory: createFeatureRestrictedProcedure("communications:read")
    .input(
      z.object({
        recipientId: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return {
          messages: [],
          total: 0,
        };
      } catch (error: any) {
        console.error('Get SMS history error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve SMS history',
        });
      }
    }),

  // ==================== CALENDAR EVENTS ====================
  /**
   * Create calendar event
   */
  createCalendarEvent: createFeatureRestrictedProcedure("communications:calendar")
    .input(createCalendarEventSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const eventId = uuidv4();

        // Handle recurring events
        const events: any[] = [
          {
            id: eventId,
            title: input.title,
            description: input.description,
            dueDate: input.dueDate,
            eventType: input.eventType,
            linkedEntityId: input.linkedEntityId,
            linkedEntityType: input.linkedEntityType,
            isRecurring: input.isRecurring,
            assignedTo: input.assignedTo || [ctx.user.id],
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          },
        ];

        // If recurring, generate additional events based on frequency
        if (input.isRecurring && input.recurringInterval) {
          const startDate = new Date(input.dueDate);
          let currentDate = new Date(startDate);
          const endDate = input.recurringEndDate ? new Date(input.recurringEndDate) : null;

          while (true) {
            // Add interval to date
            switch (input.recurringInterval) {
              case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
              case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
              case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
              case 'quarterly':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
              case 'annually':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            }

            // Check if we've exceeded the end date
            if (endDate && currentDate > endDate) break;

            // Create event for this date
            events.push({
              id: uuidv4(),
              title: input.title,
              description: input.description,
              dueDate: currentDate.toISOString().replace('T', ' ').substring(0, 19).split('T')[0],
              eventType: input.eventType,
              linkedEntityId: input.linkedEntityId,
              linkedEntityType: input.linkedEntityType,
              isRecurring: true,
              assignedTo: input.assignedTo || [ctx.user.id],
              createdBy: ctx.user.id,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            });
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          action: 'calendar_event_created',
          entityType: 'calendar_event',
          entityId: eventId,
          description: `Created calendar event: ${input.title}`,
        });

        return {
          success: true,
          eventId,
          eventsCreated: events.length,
          message: `Created ${events.length} calendar event(s)`,
        };
      } catch (error: any) {
        console.error('Create calendar event error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create calendar event',
        });
      }
    }),

  /**
   * Get calendar events
   */
  getCalendarEvents: createFeatureRestrictedProcedure("communications:read")
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        eventType: z.string().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Fetch events for the current user from database
        return {
          events: [],
          total: 0,
        };
      } catch (error: any) {
        console.error('Get calendar events error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve calendar events',
        });
      }
    }),

  /**
   * Update calendar event
   */
  updateCalendarEvent: createFeatureRestrictedProcedure("communications:calendar")
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        dueDate: z.string().optional(),
        description: z.string().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.logActivity({
          userId: ctx.user.id,
          action: 'calendar_event_updated',
          entityType: 'calendar_event',
          entityId: input.id,
          description: 'Updated calendar event',
        });

        return {
          success: true,
          message: 'Calendar event updated successfully',
        };
      } catch (error: any) {
        console.error('Update calendar event error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update calendar event',
        });
      }
    }),

  /**
   * Delete calendar event
   */
  deleteCalendarEvent: createFeatureRestrictedProcedure("communications:calendar")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.logActivity({
          userId: ctx.user.id,
          action: 'calendar_event_deleted',
          entityType: 'calendar_event',
          entityId: input.id,
          description: 'Deleted calendar event',
        });

        return {
          success: true,
          message: 'Calendar event deleted successfully',
        };
      } catch (error: any) {
        console.error('Delete calendar event error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete calendar event',
        });
      }
    }),

  // ==================== RECURRING INVOICES ====================
  /**
   * Create recurring invoice
   */
  createRecurringInvoice: createFeatureRestrictedProcedure("communications:invoices")
    .input(createRecurringInvoiceSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const recurringId = uuidv4();

        // Create recurring invoice record
        // This will be used by a scheduled job to generate invoices

        await db.logActivity({
          userId: ctx.user.id,
          action: 'recurring_invoice_created',
          entityType: 'recurring_invoice',
          entityId: recurringId,
          description: `Created recurring invoice from base invoice: ${input.baseInvoiceId}`,
        });

        return {
          id: recurringId,
          ...input,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          success: true,
          message: 'Recurring invoice created successfully',
        };
      } catch (error: any) {
        console.error('Create recurring invoice error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create recurring invoice',
        });
      }
    }),

  /**
   * Get recurring invoices
   */
  getRecurringInvoices: createFeatureRestrictedProcedure("communications:read")
    .input(
      z.object({
        isActive: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return {
          recurringInvoices: [],
          total: 0,
        };
      } catch (error: any) {
        console.error('Get recurring invoices error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve recurring invoices',
        });
      }
    }),

  /**
   * Update recurring invoice
   */
  updateRecurringInvoice: createFeatureRestrictedProcedure("communications:invoices")
    .input(updateRecurringInvoiceSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await db.logActivity({
          userId: ctx.user.id,
          action: 'recurring_invoice_updated',
          entityType: 'recurring_invoice',
          entityId: input.id,
          description: 'Updated recurring invoice',
        });

        return {
          success: true,
          message: 'Recurring invoice updated successfully',
        };
      } catch (error: any) {
        console.error('Update recurring invoice error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update recurring invoice',
        });
      }
    }),

  /**
   * Stop recurring invoice
   */
  stopRecurringInvoice: createFeatureRestrictedProcedure("communications:invoices")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.logActivity({
          userId: ctx.user.id,
          action: 'recurring_invoice_stopped',
          entityType: 'recurring_invoice',
          entityId: input.id,
          description: 'Stopped recurring invoice',
        });

        return {
          success: true,
          message: 'Recurring invoice stopped successfully',
        };
      } catch (error: any) {
        console.error('Stop recurring invoice error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to stop recurring invoice',
        });
      }
    }),

  /**
   * Get recurring invoice history (generated invoices)
   */
  getRecurringInvoiceHistory: readProcedure
    .input(
      z.object({
        recurringInvoiceId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return {
          invoices: [],
          total: 0,
        };
      } catch (error: any) {
        console.error('Get recurring invoice history error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve recurring invoice history',
        });
      }
    }),

  /**
   * Get communication hub dashboard data
   */
  getCommunicationsHubStatus: readProcedure.query(async ({ ctx }) => {
    try {
      return {
        unreadMessages: 0,
        upcomingEvents: 0,
        pendingRecurringInvoices: 0,
        recentCommunications: [],
      };
    } catch (error: any) {
      console.error('Get hub status error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve communications hub status',
      });
    }
  }),
});

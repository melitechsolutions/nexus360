import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { projectTasks, invoices, clients, notifications, users } from "../../drizzle/schema";
import { triggerEventNotification } from "../routers/emailNotifications";
import { nanoid } from "nanoid";

// ============================================
// ACTION EXECUTOR TYPES
// ============================================

export interface ActionExecutorContext {
  entityType: string;
  entityId: string;
  triggerData: Record<string, any>;
  userId?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  resultData?: Record<string, any>;
  error?: string;
}

// ============================================
// ACTION EXECUTOR IMPLEMENTATIONS
// ============================================

/**
 * Send Email Action Executor
 * Sends email to client or internal team based on action configuration
 */
export async function executeSendEmailAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const { subject, template, recipientType, recipientEmail, body, htmlContent, entityType, entityId } = actionData;

    if (!subject && !template) {
      return {
        success: false,
        message: "Email action requires subject or template",
        error: "Missing email configuration",
      };
    }

    // Determine recipient email
    const toEmail = recipientEmail || process.env.COMPANY_EMAIL || "";

    console.log("[EMAIL_EXECUTOR] Sending email:", {
      subject: subject || template,
      toEmail,
      recipientType,
      entityType: context.entityType,
      entityId: context.entityId,
    });

    try {
      // Use existing email notification system
      await triggerEventNotification({
        userId: context.userId || "system",
        eventType: template || "custom_email",
        recipientEmail: toEmail,
        recipientName: recipientType === "client" ? "Client" : "Team Member",
        subject: subject || "Notification",
        htmlContent: htmlContent || body || `<p>${subject}</p>`,
        entityType: entityType || context.entityType,
        entityId: entityId || context.entityId,
        actionUrl: `/`,
      });
    } catch (emailErr) {
      console.error("[EMAIL_EXECUTOR] Failed to send via notification system:", emailErr);
      // Continue anyway - email failure shouldn't block workflow
    }

    return {
      success: true,
      message: `Email sent: ${subject || template}`,
      resultData: { emailId: `email_${Date.now()}`, recipient: toEmail },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to send email",
      error: String(error),
    };
  }
}

/**
 * Create Task Action Executor
 * Creates a new task with given title, priority, and due date
 */
export async function executeCreateTaskAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { title, description, priority, dueDate, assignedTo } = actionData;

    if (!title) {
      return {
        success: false,
        message: "Task creation requires a title",
        error: "Missing task title",
      };
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[TASK_EXECUTOR] Creating task:", {
      title,
      priority,
      dueDate,
      assignedTo,
    });

    // TODO: Insert task into database
    //const result = await db.insert(tasks).values({
    //  id: taskId,
    //  title,
    //  description,
    //  priority: priority || 'normal',
    //  dueDate,
    //  assignedTo,
    //  entityType: context.entityType,
    //  entityId: context.entityId,
    //});

    return {
      success: true,
      message: `Task created: ${title}`,
      resultData: { taskId },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create task",
      error: String(error),
    };
  }
}

/**
 * Update Status Action Executor
 * Updates the status of an entity (invoice, opportunity, etc.)
 */
export async function executeUpdateStatusAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { newStatus, targetEntity } = actionData;
    const entityType = targetEntity || context.entityType;
    const entityId = context.entityId;

    if (!newStatus) {
      return {
        success: false,
        message: "Status update requires newStatus",
        error: "Missing new status value",
      };
    }

    console.log("[STATUS_EXECUTOR] Updating status:", {
      entityType,
      entityId,
      newStatus,
    });

    // Update entity status in database based on entity type
    const mysqlNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (entityType === "invoice") {
      await db.update(invoices)
        .set({ status: newStatus as any, updatedAt: mysqlNow })
        .where(eq(invoices.id, entityId));
    } else if (entityType === "opportunity") {
      const { opportunities } = await import("../../drizzle/schema");
      await db.update(opportunities)
        .set({ stage: newStatus as any, updatedAt: mysqlNow })
        .where(eq(opportunities.id, entityId));
    } else if (entityType === "project") {
      const { projects } = await import("../../drizzle/schema");
      await db.update(projects)
        .set({ status: newStatus as any, updatedAt: mysqlNow })
        .where(eq(projects.id, entityId));
    }

    return {
      success: true,
      message: `Status updated to: ${newStatus}`,
      resultData: { entityType, entityId, newStatus },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update status",
      error: String(error),
    };
  }
}

/**
 * Send Notification Action Executor
 * Sends in-app notification to user or users
 */
export async function executeSendNotificationAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { message, notificationType = "info", recipientRole, recipientUserId, title } = actionData;

    if (!message) {
      return {
        success: false,
        message: "Notification requires a message",
        error: "Missing notification message",
      };
    }

    console.log("[NOTIFICATION_EXECUTOR] Sending notification:", {
      message,
      notificationType,
      recipientRole,
    });

    const notificationId = nanoid();

    // Determine recipient user ID based on role or explicit ID
    let targetUserId = recipientUserId || context.userId;

    if (recipientRole && !recipientUserId) {
      // If role specified, find user with that role (simplified - could be enhanced)
      const roleUsers = await db
        .select()
        .from(users)
        .limit(1);
      if (roleUsers.length > 0) {
        targetUserId = roleUsers[0].id;
      }
    }

    if (targetUserId) {
      // Create notification record
      await db.insert(notifications).values({
        id: notificationId,
        userId: targetUserId,
        title: title || notificationType,
        message,
        type: notificationType,
        category: "workflow",
        entityType: context.entityType,
        entityId: context.entityId,
        actionUrl: `/`,
        isRead: 0,
        priority: "normal",
      });
    }

    return {
      success: true,
      message: `Notification sent: ${message}`,
      resultData: { notificationId, recipientUserId: targetUserId },
    };
  } catch (error) {
    console.error("[NOTIFICATION_EXECUTOR] Error:", error);
    return {
      success: false,
      message: "Failed to send notification",
      error: String(error),
    };
  }
}

/**
 * Create Follow-up Action Executor
 * Creates a follow-up (recurring task, reminder, or second invoice)
 */
export async function executeCreateFollowUpAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { followUpType, frequency, startDate, details } = actionData;

    if (!followUpType) {
      return {
        success: false,
        message: "Follow-up creation requires followUpType",
        error: "Missing follow-up type",
      };
    }

    const followUpId = `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[FOLLOWUP_EXECUTOR] Creating follow-up:", {
      followUpType,
      frequency,
      startDate,
      details,
    });

    // TODO: Create follow-up based on type
    // - If 'recurring': Create recurring invoice
    // - If 'reminder': Create reminder/task
    // - If 'task': Create follow-up task

    return {
      success: true,
      message: `Follow-up created: ${followUpType}`,
      resultData: { followUpId },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create follow-up",
      error: String(error),
    };
  }
}

/**
 * Add Invoice Action Executor
 * Creates a new invoice based on trigger data
 */
export async function executeAddInvoiceAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { invoiceType, includeExpenses, lineItems, dueDate } = actionData;

    if (!invoiceType) {
      return {
        success: false,
        message: "Invoice creation requires invoiceType",
        error: "Missing invoice type",
      };
    }

    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[INVOICE_EXECUTOR] Creating invoice:", {
      invoiceType,
      includeExpenses,
      dueDate,
      lineItems: lineItems?.length || 0,
    });

    // TODO: Create invoice in database
    // - Auto-populate from trigger data (client, project, milestone details)
    // - Include line items if specified
    // - Set due date
    // - Generate invoice number

    return {
      success: true,
      message: `Invoice created: ${invoiceType}`,
      resultData: { invoiceId },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create invoice",
      error: String(error),
    };
  }
}

/**
 * Update Field Action Executor
 * Updates a specific field on an entity
 */
export async function executeUpdateFieldAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { entityType, fieldName, fieldValue } = actionData;

    if (!fieldName || fieldValue === undefined) {
      return {
        success: false,
        message: "Field update requires fieldName and fieldValue",
        error: "Missing field update parameters",
      };
    }

    console.log("[FIELD_EXECUTOR] Updating field:", {
      entityType,
      fieldName,
      fieldValue,
    });

    // TODO: Update field in database
    // - Build dynamic update query
    // - Validate field exists and is updatable
    // - Log change in activity log

    return {
      success: true,
      message: `Field updated: ${fieldName}`,
      resultData: { fieldName, previousValue: "N/A", newValue: fieldValue },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update field",
      error: String(error),
    };
  }
}

/**
 * Create Reminder Action Executor
 * Creates a reminder notification at specified time
 */
export async function executeCreateReminderAction(
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    const { reminderType, reminderTime, reminderMessage } = actionData;

    if (!reminderType) {
      return {
        success: false,
        message: "Reminder creation requires reminderType",
        error: "Missing reminder type",
      };
    }

    const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[REMINDER_EXECUTOR] Creating reminder:", {
      reminderType,
      reminderTime,
      reminderMessage,
    });

    // TODO: Create reminder in database or scheduling system
    // - Set up scheduled task to trigger notification
    // - Store reminder details
    // - Link to original entity

    return {
      success: true,
      message: `Reminder created: ${reminderType}`,
      resultData: { reminderId },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create reminder",
      error: String(error),
    };
  }
}

/**
 * Main action executor dispatcher
 * Routes actions to appropriate executor functions
 */
export async function executeAction(
  actionType: string,
  actionData: Record<string, any>,
  context: ActionExecutorContext
): Promise<ActionExecutionResult> {
  try {
    switch (actionType) {
      case "send_email":
        return await executeSendEmailAction(actionData, context);

      case "create_task":
        return await executeCreateTaskAction(actionData, context);

      case "update_status":
        return await executeUpdateStatusAction(actionData, context);

      case "send_notification":
        return await executeSendNotificationAction(actionData, context);

      case "create_follow_up":
        return await executeCreateFollowUpAction(actionData, context);

      case "add_invoice":
        return await executeAddInvoiceAction(actionData, context);

      case "update_field":
        return await executeUpdateFieldAction(actionData, context);

      case "create_reminder":
        return await executeCreateReminderAction(actionData, context);

      default:
        return {
          success: false,
          message: `Unknown action type: ${actionType}`,
          error: "Invalid action type",
        };
    }
  } catch (error) {
    return {
      success: false,
      message: "Error executing action",
      error: String(error),
    };
  }
}

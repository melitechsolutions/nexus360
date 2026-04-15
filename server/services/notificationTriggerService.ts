import { getDb } from "../db";
import { notifications, users } from "../../drizzle/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { 
  broadcastNotification, 
  broadcastUnreadCountChanged 
} from "../websocket/notificationBroadcaster";

export type NotificationType = "info" | "success" | "warning" | "error" | "reminder";
export type NotificationPriority = "low" | "normal" | "high";

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Server-side notification trigger service
 * Used by other routers to create notifications without exposing client code
 */
export class NotificationTriggerService {
  /**
   * Create and send a notification to a user
   */
  static async notify(payload: CreateNotificationPayload) {
    try {
      const db = await getDb();
      if (!db) {
        console.error("Database not available for notification");
        return null;
      }

      const id = uuidv4();
      const now = new Date();

      const notificationData = {
        id,
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: (payload.type || "info") as NotificationType,
        priority: (payload.priority || "normal") as NotificationPriority,
        category: payload.category,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actionUrl: payload.actionUrl,
        expiresAt: payload.expiresAt?.toISOString().replace('T', ' ').substring(0, 19),
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        isRead: 0,
        createdAt: now.toISOString().replace('T', ' ').substring(0, 19),
        readAt: null,
      };

      await db.insert(notifications).values(notificationData as any);

      // Broadcast notification to subscribed clients
      broadcastNotification(payload.userId, notificationData as any);
      broadcastUnreadCountChanged(payload.userId, 1);

      return id;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Create invoice-related notification
   */
  static async notifyInvoiceEvent(
    userId: string,
    action: "created" | "updated" | "sent" | "paid" | "overdue",
    invoiceId: string,
    metadata?: { clientName?: string; amount?: number; dueDate?: string }
  ) {
    const titleMap = {
      created: "Invoice Created",
      updated: "Invoice Updated",
      sent: "Invoice Sent",
      paid: "Invoice Paid",
      overdue: "Invoice Overdue",
    };

    const messageMap = {
      created: metadata?.clientName
        ? `Invoice created for ${metadata.clientName}`
        : "New invoice has been created",
      updated: "Invoice has been updated",
      sent: metadata?.clientName
        ? `Invoice sent to ${metadata.clientName}`
        : "Invoice has been sent",
      paid: metadata?.amount
        ? `Payment of ${metadata.amount} received`
        : "Invoice has been paid",
      overdue: "Invoice payment is overdue",
    };

    return this.notify({
      userId,
      title: titleMap[action],
      message: messageMap[action],
      type: action === "overdue" ? "error" : "success",
      priority: action === "overdue" ? "high" : "normal",
      category: "invoice",
      entityType: "invoice",
      entityId: invoiceId,
      actionUrl: `/invoices/${invoiceId}`,
      metadata,
    });
  }

  /**
   * Create payment-related notification
   */
  static async notifyPaymentEvent(
    userId: string,
    action: "created" | "pending_approval" | "approved" | "rejected" | "failed",
    paymentId: string,
    metadata?: { amount?: number; reason?: string }
  ) {
    const titleMap = {
      created: "Payment Recorded",
      pending_approval: "Payment Awaiting Approval",
      approved: "Payment Approved",
      rejected: "Payment Rejected",
      failed: "Payment Failed",
    };

    const messageMap = {
      created: metadata?.amount
        ? `Payment of ${metadata.amount} has been recorded`
        : "Payment has been recorded successfully",
      pending_approval: "Your payment is pending manager approval",
      approved: "Payment has been approved",
      rejected: metadata?.reason
        ? `Rejected: ${metadata.reason}`
        : "Payment has been rejected",
      failed: "Payment processing failed",
    };

    const typeMap = {
      created: "success",
      pending_approval: "info",
      approved: "success",
      rejected: "error",
      failed: "error",
    } as Record<string, NotificationType>;

    return this.notify({
      userId,
      title: titleMap[action],
      message: messageMap[action],
      type: typeMap[action],
      priority: ["rejected", "failed"].includes(action) ? "high" : "normal",
      category: "payment",
      entityType: "payment",
      entityId: paymentId,
      actionUrl: `/payments/${paymentId}`,
      metadata,
    });
  }

  /**
   * Create approval-related notification
   */
  static async notifyApprovalEvent(
    userId: string,
    action: "pending" | "approved" | "rejected",
    entityType: string,
    entityId: string,
    metadata?: { approvalType?: string; reason?: string }
  ) {
    const titleMap = {
      pending: "Approval Required",
      approved: "Request Approved",
      rejected: "Request Rejected",
    };

    const messageMap = {
      pending: metadata?.approvalType
        ? `A ${metadata.approvalType} requires your approval`
        : `A ${entityType} requires your approval`,
      approved: `Your ${entityType} has been approved`,
      rejected: metadata?.reason
        ? `Rejected: ${metadata.reason}`
        : `Your ${entityType} has been rejected`,
    };

    const typeMap = {
      pending: "reminder",
      approved: "success",
      rejected: "error",
    } as Record<string, NotificationType>;

    return this.notify({
      userId,
      title: titleMap[action],
      message: messageMap[action],
      type: typeMap[action],
      priority: "high",
      category: "approval",
      entityType,
      entityId,
      actionUrl: `/approvals/${entityId}`,
      metadata,
    });
  }

  /**
   * Create order-related notification
   */
  static async notifyOrderEvent(
    userId: string,
    action: "created" | "confirmed" | "shipped" | "delivered" | "cancelled",
    orderId: string,
    metadata?: { orderNumber?: string; trackingNumber?: string }
  ) {
    const titleMap = {
      created: "Order Created",
      confirmed: "Order Confirmed",
      shipped: "Order Shipped",
      delivered: "Order Delivered",
      cancelled: "Order Cancelled",
    };

    const messageMap = {
      created: metadata?.orderNumber
        ? `Order #${metadata.orderNumber} has been created`
        : "New order has been created",
      confirmed: metadata?.orderNumber
        ? `Order #${metadata.orderNumber} confirmed`
        : "Order has been confirmed",
      shipped: metadata?.trackingNumber
        ? `Order shipped - Tracking: ${metadata.trackingNumber}`
        : "Order is on the way",
      delivered: "Order has been delivered",
      cancelled: "Order has been cancelled",
    };

    const typeMap = {
      created: "success",
      confirmed: "success",
      shipped: "info",
      delivered: "success",
      cancelled: "warning",
    } as Record<string, NotificationType>;

    return this.notify({
      userId,
      title: titleMap[action],
      message: messageMap[action],
      type: typeMap[action],
      priority: action === "cancelled" ? "high" : "normal",
      category: "order",
      entityType: "order",
      entityId: orderId,
      actionUrl: `/orders/${orderId}`,
      metadata,
    });
  }

  /**
   * Create employee/team notification
   */
  static async notifyTeamEvent(
    userId: string,
    action: "added" | "updated" | "removed" | "joined" | "left",
    employeeId: string,
    employeeName: string,
    metadata?: Record<string, any>
  ) {
    const titleMap = {
      added: "Team Member Added",
      updated: "Team Member Updated",
      removed: "Team Member Removed",
      joined: "Team Member Joined",
      left: "Team Member Left",
    };

    const messageMap = {
      added: `${employeeName} has been added to the team`,
      updated: `${employeeName}'s information has been updated`,
      removed: `${employeeName} has been removed from the team`,
      joined: `${employeeName} has joined the team`,
      left: `${employeeName} has left the team`,
    };

    return this.notify({
      userId,
      title: titleMap[action],
      message: messageMap[action],
      type: "info",
      category: "team",
      entityType: "employee",
      entityId: employeeId,
      actionUrl: `/employees/${employeeId}`,
      metadata,
    });
  }

  /**
   * Create inventory/stock notification
   */
  static async notifyInventoryEvent(
    userId: string,
    action: "low_stock" | "out_of_stock" | "restocked" | "expiring",
    productId: string,
    productName: string,
    metadata?: { currentStock?: number; threshold?: number }
  ) {
    const titleMap = {
      low_stock: "Low Stock Alert",
      out_of_stock: "Out of Stock",
      restocked: "Product Restocked",
      expiring: "Product Expiring Soon",
    };

    const messageMap = {
      low_stock: metadata?.currentStock
        ? `${productName} (${metadata.currentStock} units) is running low`
        : `${productName} is running low`,
      out_of_stock: `${productName} is out of stock`,
      restocked: `${productName} has been restocked`,
      expiring: `${productName} is expiring soon`,
    };

    const typeMap = {
      low_stock: "warning",
      out_of_stock: "error",
      restocked: "success",
      expiring: "warning",
    } as Record<string, NotificationType>;

    const priorityMap = {
      low_stock: "normal",
      out_of_stock: "high",
      restocked: "normal",
      expiring: "high",
    } as Record<string, NotificationPriority>;

    return this.notify({
      userId,
      title: titleMap[action],
      message: messageMap[action],
      type: typeMap[action],
      priority: priorityMap[action],
      category: "inventory",
      entityType: "product",
      entityId: productId,
      actionUrl: `/products/${productId}`,
      metadata,
    });
  }

  /**
   * Notify multiple users
   */
  static async notifyMultiple(
    userIds: string[],
    payload: Omit<CreateNotificationPayload, "userId">
  ) {
    const results = await Promise.all(
      userIds.map((userId) =>
        this.notify({ ...payload, userId })
      )
    );
    return results.filter((id) => id !== null);
  }

  /**
   * Send system-wide notification to all users with a specific role
   */
  static async notifyByRole(
    role: string,
    payload: Omit<CreateNotificationPayload, "userId">
  ) {
    try {
      const db = await getDb();
      if (!db) return [];

      const usersWithRole = await db
        .select()
        .from(users)
        .where(eq(users.role, role));

      const userIds = usersWithRole.map((u: any) => u.id);
      return this.notifyMultiple(userIds, payload);
    } catch (error) {
      console.error("Error notifying by role:", error);
      return [];
    }
  }
}

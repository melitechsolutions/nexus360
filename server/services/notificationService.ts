/**
 * Unified Notification Service
 * Handles multi-channel notifications: in-app, email, SMS, and Slack
 * 
 * Usage:
 * - Send in-app notification: notificationService.sendInApp(...)
 * - Send email: notificationService.sendEmail(...)
 * - Send SMS: notificationService.sendSms(...)
 * - Send to Slack: notificationService.sendSlack(...)
 * - Send multi-channel: notificationService.send(...) with channels array
 */

import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { and, eq } from "drizzle-orm";
import {
  notifications,
  notificationSettings,
  notificationPreferences,
  emailGenerationHistory,
} from "../../drizzle/schema";
import { broadcastNotification, broadcastUnreadCountChanged } from "../websocket/notificationBroadcaster";

// Email provider types
type EmailProvider = "resend" | "sendgrid" | "aws-ses" | "custom-smtp";
type SMSProvider = "twilio" | "africastalking" | "custom";

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  category: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority: "low" | "normal" | "high";
  channels?: ("in-app" | "email" | "sms" | "slack")[];
  emailData?: {
    to: string;
    subject: string;
    htmlContent: string;
    templateId?: string;
  };
  smsData?: {
    phoneNumber: string;
    message: string;
  };
  slackData?: {
    channel: string;
    username?: string;
    message: string;
  };
  expiresAt?: Date;
}

interface EmailConfig {
  provider: EmailProvider;
  apiKey?: string;
  domain?: string;
  fromEmail?: string;
  fromName?: string;
}

interface SMSConfig {
  provider: SMSProvider;
  apiKey?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

interface SlackConfig {
  webhookUrl: string;
  botName?: string;
  channel?: string;
}

interface NotificationResult {
  notificationId?: string;
  inApp?: { success: boolean; error?: string };
  email?: { success: boolean; messageId?: string; error?: string };
  sms?: { success: boolean; messageId?: string; error?: string };
  slack?: { success: boolean; error?: string };
}

class NotificationService {
  private emailConfig: EmailConfig | null = null;
  private smsConfig: SMSConfig | null = null;
  private slackConfig: SlackConfig | null = null;

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize notification providers from environment variables
   */
  private initializeProviders() {
    // Email Provider
    const emailProvider = process.env.NOTIFICATION_EMAIL_PROVIDER as EmailProvider;
    if (emailProvider) {
      this.emailConfig = {
        provider: emailProvider,
        apiKey: process.env.NOTIFICATION_EMAIL_API_KEY,
        domain: process.env.NOTIFICATION_EMAIL_DOMAIN,
        fromEmail: process.env.NOTIFICATION_EMAIL_FROM || process.env.SMTP_FROM_EMAIL || "noreply@crm.app",
        fromName: process.env.NOTIFICATION_EMAIL_FROM_NAME || process.env.COMPANY_NAME || "CRM Platform",
      };
    }

    // SMS Provider
    const smsProvider = process.env.NOTIFICATION_SMS_PROVIDER as SMSProvider;
    if (smsProvider) {
      this.smsConfig = {
        provider: smsProvider,
        apiKey: process.env.NOTIFICATION_SMS_API_KEY,
        accountSid: process.env.NOTIFICATION_SMS_ACCOUNT_SID,
        authToken: process.env.NOTIFICATION_SMS_AUTH_TOKEN,
        fromNumber: process.env.NOTIFICATION_SMS_FROM_NUMBER,
      };
    }

    // Slack Webhook
    if (process.env.NOTIFICATION_SLACK_WEBHOOK) {
      this.slackConfig = {
        webhookUrl: process.env.NOTIFICATION_SLACK_WEBHOOK,
        botName: process.env.NOTIFICATION_SLACK_BOT_NAME || process.env.COMPANY_NAME || "CRM Bot",
        channel: process.env.NOTIFICATION_SLACK_CHANNEL,
      };
    }
  }

  /**
   * Send in-app notification
   */
  async sendInApp(payload: NotificationPayload): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const id = uuidv4();
    const notificationData = {
      id,
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      category: payload.category,
      entityType: payload.entityType,
      entityId: payload.entityId,
      actionUrl: payload.actionUrl,
      priority: payload.priority,
      expiresAt: payload.expiresAt?.toISOString().replace('T', ' ').substring(0, 19),
      isRead: 0,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      readAt: null,
    };

    await db.insert(notifications).values(notificationData as any);

    // Broadcast real-time update
    broadcastNotification(payload.userId, notificationData as any);
    broadcastUnreadCountChanged(payload.userId, 1);

    return id;
  }

  /**
   * Send email notification via Resend
   */
  private async sendViaResend(recipientEmail: string, subject: string, htmlContent: string): Promise<string> {
    if (!this.emailConfig?.apiKey) {
      throw new Error("Resend API key not configured");
    }

    try {
      // Dynamic import to avoid dependency issues
      const { Resend } = await import("resend");
      const resend = new Resend(this.emailConfig.apiKey);

      const result = await resend.emails.send({
        from: `${this.emailConfig.fromName} <${this.emailConfig.fromEmail}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
      });

      if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`);
      }

      return result.data?.id || "unknown";
    } catch (error: any) {
      console.error("Resend email error:", error);
      throw error;
    }
  }

  /**
   * Send email notification via SendGrid
   */
  private async sendViaSendGrid(recipientEmail: string, subject: string, htmlContent: string): Promise<string> {
    if (!this.emailConfig?.apiKey) {
      throw new Error("SendGrid API key not configured");
    }

    try {
      // Dynamic import to avoid dependency issues
      const sgMail = await import("@sendgrid/mail");
      sgMail.default.setApiKey(this.emailConfig.apiKey);

      const msg = {
        to: recipientEmail,
        from: this.emailConfig.fromEmail || "noreply@crm.local",
        subject,
        html: htmlContent,
      };

      const result = await sgMail.default.send(msg);
      return result[0].headers["x-message-id"] || "unknown";
    } catch (error: any) {
      console.error("SendGrid email error:", error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    userId?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.emailConfig) {
        return { success: false, error: "Email provider not configured" };
      }

      let messageId: string;

      if (this.emailConfig.provider === "resend") {
        messageId = await this.sendViaResend(recipientEmail, subject, htmlContent);
      } else if (this.emailConfig.provider === "sendgrid") {
        messageId = await this.sendViaSendGrid(recipientEmail, subject, htmlContent);
      } else {
        return { success: false, error: `Email provider '${this.emailConfig.provider}' not implemented` };
      }

      // Log email in database
      if (userId) {
        const db = await getDb();
        if (db) {
          await db.insert(emailGenerationHistory).values({
            id: uuidv4(),
            userId,
            recipientEmail,
            subject,
            messageId,
            provider: this.emailConfig.provider,
            status: "sent",
            sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);
        }
      }

      return { success: true, messageId };
    } catch (error: any) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendViaTwilio(phoneNumber: string, message: string): Promise<string> {
    if (!this.smsConfig?.accountSid || !this.smsConfig?.authToken) {
      throw new Error("Twilio credentials not configured");
    }

    try {
      // Dynamic import to avoid dependency issues
      const twilio = await import("twilio");
      const client = twilio.default(this.smsConfig.accountSid, this.smsConfig.authToken);

      const result = await client.messages.create({
        body: message,
        from: this.smsConfig.fromNumber,
        to: phoneNumber,
      });

      return result.sid;
    } catch (error: any) {
      console.error("Twilio SMS error:", error);
      throw error;
    }
  }

  /**
   * Send SMS notification via Africa's Talking
   */
  private async sendViaAfricasTalking(phoneNumber: string, message: string): Promise<string> {
    if (!this.smsConfig?.apiKey) {
      throw new Error("Africa's Talking API key not configured");
    }

    try {
      // Make HTTP request to Africa's Talking API
      const response = await fetch("https://api.sandbox.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          apikey: this.smsConfig.apiKey,
        },
        body: new URLSearchParams({
          username: "sandbox",
          message,
          recipients: phoneNumber,
        }).toString(),
      });

      const data = await response.json();
      if (data.SMSMessageData?.Recipients && data.SMSMessageData.Recipients.length > 0) {
        return data.SMSMessageData.Recipients[0].messageId;
      }
      throw new Error("No SMS recipients returned");
    } catch (error: any) {
      console.error("Africa's Talking SMS error:", error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSms(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.smsConfig) {
        return { success: false, error: "SMS provider not configured" };
      }

      let messageId: string;

      if (this.smsConfig.provider === "twilio") {
        messageId = await this.sendViaTwilio(phoneNumber, message);
      } else if (this.smsConfig.provider === "africastalking") {
        messageId = await this.sendViaAfricasTalking(phoneNumber, message);
      } else {
        return { success: false, error: `SMS provider '${this.smsConfig.provider}' not implemented` };
      }

      return { success: true, messageId };
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to Slack
   */
  async sendSlack(
    message: string,
    channel?: string,
    additionalFields?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.slackConfig?.webhookUrl) {
        return { success: false, error: "Slack webhook not configured" };
      }

      const payload = {
        text: message,
        channel: channel || this.slackConfig.channel,
        username: this.slackConfig.botName || "CRM Bot",
        attachments: additionalFields
          ? [
              {
                color: additionalFields.color || "good",
                fields: Object.entries(additionalFields).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                })),
              },
            ]
          : undefined,
      };

      const response = await fetch(this.slackConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error sending Slack notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send multi-channel notification
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const result: NotificationResult = {};
    const channels = payload.channels || ["in-app"];

    // In-app notification
    if (channels.includes("in-app")) {
      try {
        result.notificationId = await this.sendInApp(payload);
        result.inApp = { success: true };
      } catch (error: any) {
        result.inApp = { success: false, error: error.message };
      }
    }

    // Email notification
    if (channels.includes("email") && payload.emailData) {
      try {
        const emailResult = await this.sendEmail(
          payload.emailData.to,
          payload.emailData.subject,
          payload.emailData.htmlContent,
          payload.userId,
        );
        result.email = emailResult;
      } catch (error: any) {
        result.email = { success: false, error: error.message };
      }
    }

    // SMS notification
    if (channels.includes("sms") && payload.smsData) {
      try {
        const smsResult = await this.sendSms(payload.smsData.phoneNumber, payload.smsData.message);
        result.sms = smsResult;
      } catch (error: any) {
        result.sms = { success: false, error: error.message };
      }
    }

    // Slack notification
    if (channels.includes("slack") && payload.slackData) {
      try {
        const slackResult = await this.sendSlack(payload.slackData.message, payload.slackData.channel);
        result.slack = slackResult;
      } catch (error: any) {
        result.slack = { success: false, error: error.message };
      }
    }

    return result;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string) {
    const db = await getDb();
    if (!db) return null;

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    return prefs[0] || null;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<any>) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({
        ...preferences,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      })
      .where(eq(notificationPreferences.userId, userId));
  }
}

export const notificationService = new NotificationService();

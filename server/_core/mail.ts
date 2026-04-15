import nodemailer from 'nodemailer';
import { getDb } from '../db';
import { settings } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyInfo } from '../utils/company-info';
import { htmlToPlainText } from './emailTemplates';

export type MailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string;
  bcc?: string;
};

/** Read a single setting value from the DB (category=email, key=...) */
async function getEmailSetting(key: string): Promise<string | undefined> {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const rows = await db.select().from(settings)
      .where(and(eq(settings.category, 'email'), eq(settings.key, key)))
      .limit(1);
    return rows[0]?.value ?? undefined;
  } catch {
    return undefined;
  }
}

const getSmtpConfig = async () => {
  // Env vars take priority; fall back to settings table
  const host = process.env.SMTP_HOST || await getEmailSetting('smtpHost');
  const portStr = process.env.SMTP_PORT || await getEmailSetting('smtpPort');
  const port = portStr ? parseInt(portStr, 10) : undefined;
  const user = process.env.SMTP_USER || await getEmailSetting('smtpUser');
  const pass = process.env.SMTP_PASSWORD || await getEmailSetting('smtpPass');
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  if (!host || !port) {
    throw new Error('SMTP_HOST and SMTP_PORT must be configured to send email (set via env vars or Settings → Email)');
  }

  return { host, port, secure, user, pass };
};

export async function sendEmail(opts: MailOptions) {
  try {
    const smtpConfig = await getSmtpConfig();
    const { host, port, secure, user, pass } = smtpConfig;

    const createTransporter = (targetPort: number, targetSecure: boolean) => {
      return nodemailer.createTransport({
        host,
        port: targetPort,
        secure: targetSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        auth: user && pass ? { user, pass } : undefined,
      });
    };

    const fromEmail = process.env.SMTP_FROM_EMAIL || await getEmailSetting('fromEmail') || user || `no-reply@melitech.local`;
    const companyInfo = await getCompanyInfo();
    const fromName = process.env.SMTP_FROM_NAME || await getEmailSetting('fromName') || companyInfo.name;
    const from = opts.from || `"${fromName}" <${fromEmail}>`;

    const sendWith = async (targetPort: number, targetSecure: boolean) => {
      const transporter = createTransporter(targetPort, targetSecure);
      // Auto-generate plain text from HTML if not provided (improves deliverability)
      const textFallback = opts.text || (opts.html ? htmlToPlainText(opts.html) : undefined);
      return transporter.sendMail({
        from,
        to: opts.to,
        cc: opts.cc || undefined,
        bcc: opts.bcc || undefined,
        subject: opts.subject,
        html: opts.html,
        text: textFallback,
      });
    };

    let info;
    try {
      info = await sendWith(port, secure);
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' && port === 465) {
        console.warn('[MAIL] SMTP 465 refused, retrying with STARTTLS on 587');
        info = await sendWith(587, false);
      } else {
        throw error;
      }
    }

    console.log('[MAIL] Sent', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[MAIL] Send failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

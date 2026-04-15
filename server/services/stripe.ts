/**
 * Stripe Payment Service
 * Handles all Stripe payment processing, webhook verification, and reconciliation
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Stripe secret API key
 * - STRIPE_PUBLISHABLE_KEY: Stripe publishable key (for frontend)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret
 */

import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import { getDb } from '../db';
import { settings } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper: read a Stripe setting from DB (category "payment_stripe")
async function getStripeSetting(key: string): Promise<string | undefined> {
  try {
    const database = getDb();
    const rows = await database.select().from(settings)
      .where(and(eq(settings.category, "payment_stripe"), eq(settings.key, key)))
      .limit(1);
    return (rows[0]?.value as string) || undefined;
  } catch { return undefined; }
}

let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
let stripe: Stripe | null = null;
let stripeInitialized = false;

async function getStripe(): Promise<Stripe | null> {
  if (stripeInitialized) return stripe;
  // If env var not set, try settings table
  if (!stripeSecretKey) {
    stripeSecretKey = await getStripeSetting("secretKey");
  }
  if (!stripeWebhookSecret) {
    stripeWebhookSecret = await getStripeSetting("webhookSecret");
  }
  if (!stripeSecretKey) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured - Stripe payments will be disabled');
    stripeInitialized = true;
    return null;
  }
  stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  stripeInitialized = true;
  return stripe;
}

interface CreatePaymentIntentInput {
  invoiceId: string;
  clientId: string;
  amount: number;
  currency?: string;
  receiptEmail?: string;
  description?: string;
}

interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  amount: number;
  databaseId: string;
}

/**
 * Create a new payment intent for an invoice
 */
export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe integration is not configured',
    });
  }

  try {
    const { invoiceId, clientId, amount, currency = 'KES', receiptEmail, description } = input;

    // Check if payment intent already exists for this invoice
    const database = await db.getDb();
    if (!database) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection failed',
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      receipt_email: receiptEmail,
      description: description || `Invoice ${invoiceId}`,
      metadata: {
        invoiceId,
        clientId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store intent in database for tracking
    const databaseId = uuidv4();
    const stripePaymentIntents = (await import('../../drizzle/schema')).stripePaymentIntents;
    const { eq } = await import('drizzle-orm');
    
    // Check and delete existing if needed
    const existing = await database.select()
      .from(stripePaymentIntents)
      .where(eq(stripePaymentIntents.invoiceId, invoiceId));
    
    if (existing.length > 0) {
      await database.delete(stripePaymentIntents)
        .where(eq(stripePaymentIntents.invoiceId, invoiceId));
    }

    await database.insert(stripePaymentIntents).values({
      id: databaseId,
      invoiceId,
      stripeIntentId: paymentIntent.id,
      clientId,
      amount: Math.round(amount * 100),
      currency: currency.toUpperCase(),
      status: paymentIntent.status as any,
      receiptEmail,
      metadata: { description } as any,
    });

    return {
      clientSecret: paymentIntent.client_secret || '',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      databaseId,
    };
  } catch (error) {
    console.error('[Stripe] Error creating payment intent:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to create payment intent',
    });
  }
}

/**
 * Get payment intent status
 */
export async function getPaymentIntentStatus(paymentIntentId: string) {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe integration is not configured',
    });
  }

  try {
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      receiptEmail: paymentIntent.receipt_email,
      chargeId: paymentIntent.charges.data[0]?.id || null,
    };
  } catch (error) {
    console.error('[Stripe] Error retrieving payment intent:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve payment intent status',
    });
  }
}

/**
 * Process refund for a payment
 */
export async function processRefund(chargeId: string, amount?: number) {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe integration is not configured',
    });
  }

  try {
    const refund = await stripeClient.refunds.create({
      charge: chargeId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      charge: refund.charge,
    };
  } catch (error) {
    console.error('[Stripe] Error processing refund:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process refund',
    });
  }
}

/**
 * Get payment methods for a customer
 */
export async function getPaymentMethods(stripeCustomerId: string) {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe integration is not configured',
    });
  }

  try {
    const paymentMethods = await stripeClient.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: (pm.card as any)?.brand || '',
      lastFourDigits: (pm.card as any)?.last4 || '',
      expMonth: (pm.card as any)?.exp_month || 0,
      expYear: (pm.card as any)?.exp_year || 0,
    }));
  } catch (error) {
    console.error('[Stripe] Error fetching payment methods:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch payment methods',
    });
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  body: Buffer,
  signature: string
): Promise<{ processed: boolean; eventType?: string; invoiceId?: string }> {
  const stripeClient = await getStripe();
  if (!stripeClient || !stripeWebhookSecret) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe webhook is not configured',
    });
  }

  try {
    const event = stripeClient.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    const database = await db.getDb();
    if (!database) {
      throw new Error('Database connection lost');
    }

    const stripeWebhookEvents = (await import('../../drizzle/schema')).stripeWebhookEvents;
    const stripePaymentIntents = (await import('../../drizzle/schema')).stripePaymentIntents;
    const payments = (await import('../../drizzle/schema')).payments;
    const { eq } = await import('drizzle-orm');

    // Store event
    await database.insert(stripeWebhookEvents).values({
      id: uuidv4(),
      stripeEventId: event.id,
      type: event.type,
      data: event.data as any,
      processed: 0,
    });

    let invoiceId: string | undefined;

    // Handle specific event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Find related payment intent in our DB
        const dbIntent = await database.select()
          .from(stripePaymentIntents)
          .where(eq(stripePaymentIntents.stripeIntentId, paymentIntent.id))
          .limit(1);

        if (dbIntent.length > 0) {
          invoiceId = dbIntent[0].invoiceId;
          
          // Update payment status to completed
          const existingPayments = await database.select()
            .from(payments)
            .where(eq(payments.invoiceId, invoiceId))
            .limit(1);

          if (existingPayments.length > 0) {
            await database.update(payments)
              .set({
                status: 'completed',
                paymentDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
              })
              .where(eq(payments.id, existingPayments[0].id));
          }

          // Update stripe intent status
          await database.update(stripePaymentIntents)
            .set({ status: 'succeeded' as any })
            .where(eq(stripePaymentIntents.id, dbIntent[0].id));
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const dbIntent = await database.select()
          .from(stripePaymentIntents)
          .where(eq(stripePaymentIntents.stripeIntentId, paymentIntent.id))
          .limit(1);

        if (dbIntent.length > 0) {
          invoiceId = dbIntent[0].invoiceId;
          await database.update(stripePaymentIntents)
            .set({ status: 'canceled' as any })
            .where(eq(stripePaymentIntents.id, dbIntent[0].id));
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        // Find payment by charge ID and mark as refunded
        // Implementation depends on your payment tracking
        console.log('[Stripe] Charge refunded:', charge.id);
        break;
      }
    }

    // Mark event as processed
    await database.update(stripeWebhookEvents)
      .set({ processed: 1, processedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) })
      .where(eq(stripeWebhookEvents.stripeEventId, event.id));

    return { processed: true, eventType: event.type, invoiceId };
  } catch (error) {
    console.error('[Stripe] Webhook processing error:', error);
    throw error;
  }
}

/**
 * Get Stripe API status
 */
export async function getStripeStatus() {
  const stripeClient = await getStripe();
  return {
    isConfigured: !!stripeClient,
    hasWebhookSecret: !!stripeWebhookSecret,
    environment: stripeSecretKey?.startsWith('sk_test_') ? 'test' : 'production',
  };
}

export default {
  createPaymentIntent,
  getPaymentIntentStatus,
  processRefund,
  getPaymentMethods,
  handleWebhookEvent,
  getStripeStatus,
};

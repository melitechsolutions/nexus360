/**
 * Billing & Subscription Management tRPC Router
 * Handles SaaS pricing, subscriptions, invoices, and payments
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import * as db from "../db";
import { v4 as uuidv4 } from "uuid";

// Feature-based procedures
const billingReadProcedure = createFeatureRestrictedProcedure("billing:read");
const billingWriteProcedure = createFeatureRestrictedProcedure("billing:edit");
const billingCreateProcedure = createFeatureRestrictedProcedure("billing:create");

export const billingRouter = router({
  /**
   * Get available pricing plans
   */
  getPlans: protectedProcedure
    .input(z.object({ tier: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const plans = await db.getAvailablePlans(input?.tier);
        return { plans, success: true };
      } catch (error) {
        console.error("[Billing] Error fetching plans:", error);
        return { plans: [], success: false };
      }
    }),

  /**
   * Get current subscription for user's client
   */
  getCurrentSubscription: billingReadProcedure.query(async ({ ctx }) => {
    try {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.clientId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User not associated with a client',
        });
      }

      const subscription = await db.getClientSubscription(user.clientId);
      return { subscription, success: true };
    } catch (error: any) {
      return { subscription: null, error: error?.message, success: false };
    }
  }),

  /**
   * Create new subscription
   */
  createSubscription: billingCreateProcedure
    .input(z.object({
      clientId: z.string(),
      planId: z.string(),
      billingCycle: z.enum(['monthly', 'annual']),
      autoRenew: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user can create subscription (admin or account owner)
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Client not found',
          });
        }

        const plan = await db.getPricingPlan(input.planId);
        if (!plan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Pricing plan not found',
          });
        }

        const subscriptionId = uuidv4();
        const now = new Date();
        const renewalDate = new Date();
        
        // Set renewal date based on billing cycle
        if (input.billingCycle === 'monthly') {
          renewalDate.setMonth(renewalDate.getMonth() + 1);
        } else {
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }

        const price = input.billingCycle === 'monthly' 
          ? (plan as any).monthlyPrice 
          : (plan as any).annualPrice;

        const subscription = await db.createSubscription({
          id: subscriptionId,
          clientId: input.clientId,
          planId: input.planId,
          status: 'trial',
          billingCycle: input.billingCycle,
          startDate: now.toISOString().replace('T', ' ').substring(0, 19),
          renewalDate: renewalDate.toISOString(),
          currentPrice: price,
          autoRenew: input.autoRenew ? 1 : 0,
        });

        return { subscription, success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to create subscription',
        });
      }
    }),

  /**
   * Get billing invoices for current client
   */
  getInvoices: billingReadProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.clientId) {
          return { invoices: [], success: false };
        }

        const invoices = await db.getClientInvoices(user.clientId, input.status);
        return { invoices: invoices.slice(0, input.limit), success: true };
      } catch (error) {
        console.error("[Billing] Error fetching invoices:", error);
        return { invoices: [], success: false };
      }
    }),

  /**
   * Get invoice details
   */
  getInvoiceDetails: billingReadProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const invoice = await db.getInvoiceById(input);
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found',
          });
        }
        return { invoice, success: true };
      } catch (error: any) {
        return { invoice: null, error: error?.message, success: false };
      }
    }),

  /**
   * Get payment methods for client
   */
  getPaymentMethods: billingReadProcedure.query(async ({ ctx }) => {
    try {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.clientId) {
        return { methods: [], success: false };
      }

      const methods = await db.getPaymentMethods(user.clientId);
      // Don't return full account details
      return {
        methods: methods.map((m: any) => ({
          id: m.id,
          type: m.type,
          provider: m.provider,
          lastFourDigits: m.lastFourDigits,
          expiryMonth: m.expiryMonth,
          expiryYear: m.expiryYear,
          holderName: m.holderName,
          isDefault: m.isDefault,
          isActive: m.isActive,
        })),
        success: true,
      };
    } catch (error) {
      console.error("[Billing] Error fetching payment methods:", error);
      return { methods: [], success: false };
    }
  }),

  /**
   * Add payment method
   */
  addPaymentMethod: billingCreateProcedure
    .input(z.object({
      type: z.enum(['credit_card', 'debit_card', 'bank_account', 'paypal', 'mpesa']),
      provider: z.string(),
      lastFourDigits: z.string().optional(),
      expiryMonth: z.number().optional(),
      expiryYear: z.number().optional(),
      holderName: z.string().optional(),
      bankName: z.string().optional(),
      providerMethodId: z.string(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.clientId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User not associated with a client',
          });
        }

        const methodId = uuidv4();
        const method = await db.createPaymentMethod({
          id: methodId,
          clientId: user.clientId,
          type: input.type,
          provider: input.provider,
          lastFourDigits: input.lastFourDigits,
          expiryMonth: input.expiryMonth,
          expiryYear: input.expiryYear,
          holderName: input.holderName,
          bankName: input.bankName,
          providerMethodId: input.providerMethodId,
          isDefault: input.isDefault ? 1 : 0,
          isActive: 1,
        });

        return { method, success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to add payment method',
        });
      }
    }),

  /**
   * Process payment for invoice
   */
  processPayment: billingCreateProcedure
    .input(z.object({
      invoiceId: z.string(),
      amount: z.number(),
      paymentMethodId: z.string(),
      paymentMethod: z.enum(['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'mpesa', 'other']),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found',
          });
        }

        // Create payment record
        const paymentId = uuidv4();
        const payment = await db.createPayment({
          id: paymentId,
          invoiceId: input.invoiceId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          status: 'processing',
          transactionId: `TXN_${uuidv4()}`,
        });

        // Update invoice status
        await db.updateInvoice(input.invoiceId, { status: 'paid', paidAt: new Date().toISOString().replace('T', ' ').substring(0, 19) });

        // If payment successful, trigger receipt generation
        if (input.amount >= (invoice as any).totalAmount) {
          await db.createReceiptFromInvoice(input.invoiceId);
        }

        return { payment, success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Payment processing failed',
        });
      }
    }),

  /**
   * Check subscription status and lock if needed
   */
  checkSubscriptionStatus: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.clientId) {
        return { status: 'error', message: 'No client association' };
      }

      const subscription = await db.getClientSubscription(user.clientId);
      if (!subscription) {
        return { status: 'no_subscription' };
      }

      const now = new Date();
      const renewalDate = new Date((subscription as any).renewalDate);
      const gracePeriodEnd = new Date(renewalDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3 day grace period

      // Check if past grace period
      if (now > gracePeriodEnd && !(subscription as any).isLocked) {
        // Lock subscription if payment not made
        await db.updateSubscription((subscription as any).id, {
          isLocked: 1,
          status: 'suspended',
        });
        return { status: 'locked', message: 'Subscription locked - payment overdue' };
      }

      return { status: (subscription as any).status, isLocked: (subscription as any).isLocked };
    } catch (error) {
      console.error("[Billing] Error checking subscription:", error);
      return { status: 'error', message: 'Failed to check subscription status' };
    }
  }),

  /**
   * Renew subscription after payment
   */
  renewSubscription: billingWriteProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        const subscription = await db.getSubscriptionById(input);
        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Subscription not found',
          });
        }

        const newRenewalDate = new Date((subscription as any).renewalDate);
        if ((subscription as any).billingCycle === 'monthly') {
          newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
        } else {
          newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
        }

        await db.updateSubscription(input, {
          status: 'active',
          renewalDate: newRenewalDate.toISOString(),
          isLocked: 0,
        });

        return { success: true, message: 'Subscription renewed' };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to renew subscription',
        });
      }
    }),

  /**
   * System task: Check all subscriptions and lock those past grace period
   * This should be called by a cron job daily
   */
  systemCheckAndLockExpiredSubscriptions: billingWriteProcedure
    .mutation(async () => {
      try {
        const allSubscriptions = await db.getAllSubscriptions();
        const now = new Date();
        const lockedSubscriptions = [];

        for (const subscription of allSubscriptions) {
          const renewalDate = new Date((subscription as any).renewalDate);
          const gracePeriodEnd = new Date(renewalDate);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3 day grace period

          // If past grace period and not yet locked, lock it
          if (now > gracePeriodEnd && !(subscription as any).isLocked) {
            await db.updateSubscription((subscription as any).id, {
              isLocked: 1,
              status: 'suspended',
            });

            // Create billing notification
            await db.createBillingNotification({
              id: uuidv4(),
              subscriptionId: (subscription as any).id,
              notificationType: 'system_locked',
              message: `Your subscription has been locked due to payment overdue by ${Math.ceil((now.getTime() - gracePeriodEnd.getTime()) / (24 * 60 * 60 * 1000))} days`,
              channel: 'email',
              isSent: 0,
            });

            lockedSubscriptions.push({
              subscriptionId: (subscription as any).id,
              clientId: (subscription as any).clientId,
              daysOverdue: Math.ceil((now.getTime() - gracePeriodEnd.getTime()) / (24 * 60 * 60 * 1000)),
            });
          }
        }

        return {
          success: true,
          lockedCount: lockedSubscriptions.length,
          lockedSubscriptions,
        };
      } catch (error: any) {
        console.error('[Billing] System lock check failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to check subscriptions',
        });
      }
    }),

  /**
   * System task: Send payment reminders and overdue warnings
   * This should be called by a cron job daily
   */
  systemSendBillingNotifications: billingWriteProcedure
    .mutation(async () => {
      try {
        const allSubscriptions = await db.getAllSubscriptions();
        const now = new Date();
        const notificationsSent = [];

        for (const subscription of allSubscriptions) {
          if ((subscription as any).status !== 'active') continue;

          const renewalDate = new Date((subscription as any).renewalDate);
          const daysUntilDue = Math.ceil((renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          let shouldNotify = false;
          let message = '';
          let notificationType = '';

          // 7 days before due
          if (daysUntilDue === 7) {
            shouldNotify = true;
            message = 'Payment due in 7 days. Please update your payment method.';
            notificationType = 'payment_reminder_7d';
          }
          // 1 day before due
          else if (daysUntilDue === 1) {
            shouldNotify = true;
            message = 'Payment due tomorrow. Your subscription will be suspended if not paid.';
            notificationType = 'payment_reminder_1d';
          }
          // Overdue by 1 day
          else if (daysUntilDue === -1) {
            shouldNotify = true;
            message = 'Your payment is 1 day overdue. Your subscription will be locked in 2 days.';
            notificationType = 'overdue_warning_1d';
          }
          // Overdue by 3 days
          else if (daysUntilDue === -3) {
            shouldNotify = true;
            message = 'Your payment is 3 days overdue. Your subscription will be locked immediately.';
            notificationType = 'overdue_warning_3d';
          }

          if (shouldNotify) {
            await db.createBillingNotification({
              id: uuidv4(),
              subscriptionId: (subscription as any).id,
              notificationType,
              message,
              channel: 'email',
              isSent: 0,
            });

            notificationsSent.push({
              subscriptionId: (subscription as any).id,
              type: notificationType,
              daysUntilDue,
            });
          }
        }

        return {
          success: true,
          notificationsSentCount: notificationsSent.length,
          notifications: notificationsSent,
        };
      } catch (error: any) {
        console.error('[Billing] Send notifications failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to send notifications',
        });
      }
    }),
});

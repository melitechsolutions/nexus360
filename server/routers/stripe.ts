/**
 * Stripe Payment Router
 * tRPC endpoints for Stripe payment processing
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as stripeService from "../services/stripe";
import { settings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";

// Feature-based access control
const stripePaymentsProcedure = createFeatureRestrictedProcedure("accounting:payments:create");
const stripeViewProcedure = createFeatureRestrictedProcedure("accounting:payments:view");

export const stripeRouter = router({
  /**
   * Get Stripe configuration status (public info)
   */
  getStatus: protectedProcedure.query(async () => {
    return stripeService.getStripeStatus();
  }),

  /**
   * Create a payment intent for an invoice
   * Returns client secret needed for frontend Stripe.js library
   */
  createPaymentIntent: stripePaymentsProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
      amount: z.number().positive(),
      currency: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user?.clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not associated with a client",
          });
        }

        // Read default currency from settings if not provided
        let currency = input.currency;
        if (!currency) {
          const database = getDb();
          const row = await database.select().from(settings)
            .where(and(eq(settings.category, "currency"), eq(settings.key, "defaultCurrency")))
            .limit(1);
          currency = (row[0]?.value as string) || "KES";
        }

        return await stripeService.createPaymentIntent({
          invoiceId: input.invoiceId,
          clientId: ctx.user.clientId,
          amount: input.amount,
          currency,
          description: input.description,
          receiptEmail: ctx.user.email,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment intent",
        });
      }
    }),

  /**
   * Get payment intent status
   */
  getPaymentStatus: stripeViewProcedure
    .input(z.object({
      paymentIntentId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        return await stripeService.getPaymentIntentStatus(input.paymentIntentId);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get payment status",
        });
      }
    }),

  /**
   * Get payment methods saved for customer
   */
  getPaymentMethods: stripeViewProcedure
    .input(z.object({
      stripeCustomerId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify ownership
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const stripeCustomers = (await import('../../drizzle/schema')).stripeCustomers;
        const { eq } = await import('drizzle-orm');

        const customer = await database.select()
          .from(stripeCustomers)
          .where(eq(stripeCustomers.stripeCustomerId, input.stripeCustomerId))
          .limit(1);

        if (!customer.length || customer[0].clientId !== ctx.user?.clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Access denied",
          });
        }

        return await stripeService.getPaymentMethods(input.stripeCustomerId);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get payment methods",
        });
      }
    }),

  /**
   * Process a refund for a charge
   */
  refundPayment: stripePaymentsProcedure
    .input(z.object({
      chargeId: z.string(),
      amount: z.number().positive().optional(),
      reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await stripeService.processRefund(input.chargeId, input.amount);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process refund",
        });
      }
    }),

  /**
   * Get recent payment transactions
   */
  getRecentTransactions: stripeViewProcedure
    .input(z.object({
      limit: z.number().max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const stripePaymentIntents = (await import('../../drizzle/schema')).stripePaymentIntents;
        const { eq, desc } = await import('drizzle-orm');

        const transactions = await database.select()
          .from(stripePaymentIntents)
          .where(eq(stripePaymentIntents.clientId, ctx.user?.clientId || ""))
          .orderBy(desc(stripePaymentIntents.createdAt))
          .limit(input.limit);

        return transactions.map((t) => ({
          id: t.id,
          stripeIntentId: t.stripeIntentId,
          invoiceId: t.invoiceId,
          amount: t.amount / 100, // Convert from cents
          currency: t.currency,
          status: t.status,
          createdAt: t.createdAt,
        }));
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch transactions",
        });
      }
    }),

  /**
   * Confirm payment after SCA/3D Secure verification
   * Called by frontend after Stripe confirms payment
   */
  confirmPayment: stripePaymentsProcedure
    .input(z.object({
      paymentIntentId: z.string(),
      invoiceId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const stripePaymentIntents = (await import('../../drizzle/schema')).stripePaymentIntents;
        const payments = (await import('../../drizzle/schema')).payments;
        const invoices = (await import('../../drizzle/schema')).invoices;
        const { eq } = await import('drizzle-orm');
        const { v4: uuidv4 } = await import('uuid');

        // Verify payment intent exists and belongs to user
        const intent = await database.select()
          .from(stripePaymentIntents)
          .where(eq(stripePaymentIntents.stripeIntentId, paymentIntentId))
          .limit(1);

        if (!intent.length || intent[0].clientId !== ctx.user?.clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Payment not found or access denied",
          });
        }

        // Check if payment was successful
        if (intent[0].status !== 'succeeded') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment status is ${intent[0].status}, cannot confirm`,
          });
        }

        // Create payment record if not already created
        const existingPayment = await database.select()
          .from(payments)
          .where(eq(payments.invoiceId, input.invoiceId))
          .limit(1);

        if (!existingPayment.length) {
          // Get invoice to determine amount
          const invoice = await database.select()
            .from(invoices)
            .where(eq(invoices.id, input.invoiceId))
            .limit(1);

          if (!invoice.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found",
            });
          }

          await database.insert(payments).values({
            id: uuidv4(),
            invoiceId: input.invoiceId,
            clientId: ctx.user.clientId,
            amount: invoice[0].total || 0,
            paymentDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            paymentMethod: 'card',
            status: 'completed',
            referenceNumber: `STRIPE-${paymentIntentId.slice(0, 20)}`,
            createdBy: ctx.user.id,
          });
        }

        return { success: true, message: "Payment confirmed" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to confirm payment",
        });
      }
    }),
});

export default stripeRouter;

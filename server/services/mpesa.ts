/**
 * M-Pesa Payment Service (MPesa Daraja API)
 * Handles STK Push, payment confirmation, and transaction tracking
 * 
 * Environment Variables Required:
 * - MPESA_CONSUMER_KEY: Daraja API consumer key
 * - MPESA_CONSUMER_SECRET: Daraja API consumer secret
 * - MPESA_BUSINESS_SHORT_CODE: Your business short code
 * - MPESA_PASSKEY: LNM passkey for STK push
 * - MPESA_ENVIRONMENT: 'sandbox' or 'production'
 * - MPESA_CALLBACK_URL: Webhook URL for payment callbacks
 */

import axios, { AxiosInstance } from 'axios';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import * as db from '../db';
import { getDb } from '../db';
import { settings } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper: read mpesa setting from DB (category "payment_mpesa")
async function getMpesaSetting(key: string): Promise<string | undefined> {
  try {
    const database = getDb();
    const rows = await database.select().from(settings)
      .where(and(eq(settings.category, "payment_mpesa"), eq(settings.key, key)))
      .limit(1);
    return (rows[0]?.value as string) || undefined;
  } catch { return undefined; }
}

interface StkPushRequest {
  invoiceId: string;
  clientId: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  description?: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface TransactionStatus {
  transactionId: string;
  phoneNumber: string;
  status: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  transactionDate?: string;
  resultDescription?: string;
}

class MPesaService {
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private environment: 'sandbox' | 'production';
  private consumerKey: string;
  private consumerSecret: string;
  private businessShortCode: string;
  private passkey: string;
  private callbackUrl: string;

  constructor() {
    this.environment = (process.env.MPESA_ENVIRONMENT as any) || 'sandbox';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || '';
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || '';

    const baseURL = this.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    this.apiClient = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  /**
   * Load missing config from settings table if env vars not set
   */
  private async ensureConfig(): Promise<void> {
    if (!this.consumerKey) this.consumerKey = (await getMpesaSetting("consumerKey")) || '';
    if (!this.consumerSecret) this.consumerSecret = (await getMpesaSetting("consumerSecret")) || '';
    if (!this.businessShortCode) this.businessShortCode = (await getMpesaSetting("shortCode")) || '';
    if (!this.passkey) this.passkey = (await getMpesaSetting("passkey")) || '';
    if (!this.callbackUrl) this.callbackUrl = (await getMpesaSetting("callbackUrl")) || '';
  }

  /**
   * Get access token from Daraja API
   */
  private async getAccessToken(): Promise<string> {
    await this.ensureConfig();
    try {
      const now = Date.now();
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry > now) {
        return this.accessToken;
      }

      const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await this.apiClient.get('/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + (response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('[M-Pesa] Token generation error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to authenticate with M-Pesa',
      });
    }
  }

  /**
   * Initiate STK Push for payment collection
   */
  async initiateSTKPush(input: StkPushRequest) {
    try {
      if (!this.businessShortCode || !this.passkey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'M-Pesa is not properly configured',
        });
      }

      // Validate phone number (Kenya format)
      if (!this.validateKenyanPhoneNumber(input.phoneNumber)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Kenyan phone number',
        });
      }

      const token = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[:-]/g, '').slice(0, 14);
      const password = Buffer.from(
        `${this.businessShortCode}${this.passkey}${timestamp}`
      ).toString('base64');

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.floor(input.amount),
        PartyA: this.formatPhoneNumber(input.phoneNumber),
        PartyB: this.businessShortCode,
        PhoneNumber: this.formatPhoneNumber(input.phoneNumber),
        CallBackURL: this.callbackUrl,
        AccountReference: input.accountReference,
        TransactionDesc: input.description || `Invoice ${input.invoiceId}`,
      };

      const response = await this.apiClient.post<StkPushResponse>(
        '/mpesa/stkpush/v1/processrequest',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store transaction in database
      const database = await db.getDb();
      if (database) {
        const mpesaTransactions = (await import('../../drizzle/schema')).mpesaTransactions;
        await database.insert(mpesaTransactions).values({
          id: uuidv4(),
          checkoutRequestId: response.data.CheckoutRequestID,
          invoiceId: input.invoiceId,
          clientId: input.clientId,
          phoneNumber: input.phoneNumber,
          amount: Math.floor(input.amount),
          businessShortCode: this.businessShortCode,
          status: 'pending',
        });
      }

      return {
        success: response.data.ResponseCode === '0',
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        customerMessage: response.data.CustomerMessage,
        responseDescription: response.data.ResponseDescription,
      };
    } catch (error: any) {
      console.error('[M-Pesa] STK Push error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error?.response?.data?.errorMessage || 'STK Push failed',
      });
    }
  }

  /**
   * Query transaction status
   */
  async queryTransactionStatus(checkoutRequestId: string): Promise<TransactionStatus> {
    try {
      const token = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[:-]/g, '').slice(0, 14);
      const password = Buffer.from(
        `${this.businessShortCode}${this.passkey}${timestamp}`
      ).toString('base64');

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await this.apiClient.post(
        '/mpesa/stkpushquery/v1/query',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const status = response.data.ResponseCode === '0' ? 'completed' : 'pending';

      return {
        transactionId: checkoutRequestId,
        phoneNumber: response.data.PhoneNumber || '',
        status,
        mpesaReceiptNumber: response.data.MpesaReceiptNumber,
        amount: response.data.ResultDesc?.includes('completed')
          ? parseFloat(response.data.CheckoutRequestID) || undefined
          : undefined,
        transactionDate: response.data.TransactionDate,
        resultDescription: response.data.ResultDesc,
      };
    } catch (error) {
      console.error('[M-Pesa] Query status error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to query transaction status',
      });
    }
  }

  /**
   * Handle callback from M-Pesa
   */
  async handleCallback(body: any) {
    try {
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database connection lost');
      }

      const mpesaTransactions = (await import('../../drizzle/schema')).mpesaTransactions;
      const { eq } = await import('drizzle-orm');

      const result = body.Body?.stkCallback || body;
      const checkoutRequestId = result.CheckoutRequestID;
      const resultCode = result.ResultCode;
      const resultDescription = result.ResultDesc || '';

      // Update transaction in database
      const transaction = await database.select()
        .from(mpesaTransactions)
        .where(eq(mpesaTransactions.checkoutRequestId, checkoutRequestId))
        .limit(1);

      if (transaction.length > 0) {
        const newStatus = resultCode === 0 ? 'completed' : 'failed';
        
        await database.update(mpesaTransactions)
          .set({
            status: newStatus as any,
            resultCode,
            resultDescription,
            mpesaReceiptNumber: result.CallbackMetadata?.Item?.find(
              (item: any) => item.Name === 'MpesaReceiptNumber'
            )?.Value,
            transactionDate: result.CallbackMetadata?.Item?.find(
              (item: any) => item.Name === 'TransactionDate'
            )?.Value,
            completedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(mpesaTransactions.id, transaction[0].id));
      }

      return { processed: true, checkoutRequestId, status: resultCode === 0 ? 'success' : 'failed' };
    } catch (error) {
      console.error('[M-Pesa] Callback processing error:', error);
      throw error;
    }
  }

  /**
   * Validate Kenyan phone number
   */
  private validateKenyanPhoneNumber(phoneNumber: string): boolean {
    const pattern = /^(?:\+254|0)[1-9]\d{8}$/;
    return pattern.test(phoneNumber);
  }

  /**
   * Format phone number to M-Pesa standard (254...)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.slice(1);
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    return formatted;
  }

  /**
   * Get M-Pesa service status
   */
  getStatus() {
    return {
      isConfigured: !!(this.consumerKey && this.consumerSecret && this.businessShortCode),
      environment: this.environment,
      hasCallbackUrl: !!this.callbackUrl,
    };
  }
}

// Singleton instance
const mpesaService = new MPesaService();

export default mpesaService;
export const initiateSTKPush = (input: StkPushRequest) => mpesaService.initiateSTKPush(input);
export const queryTransactionStatus = (checkoutRequestId: string) =>
  mpesaService.queryTransactionStatus(checkoutRequestId);
export const handleCallback = (body: any) => mpesaService.handleCallback(body);
export const getMPesaStatus = () => mpesaService.getStatus();

import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { journalEntryReconciliations } from "../../drizzle/schema-extended";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Simple finance utilities: account mapping and reconciliation.
 * Mappings are stored as settings using keys:
 *   vendor_{vendorId}_expenseAccount
 *   vendor_{vendorId}_payableAccount
 * Falling back to general settings defaultExpenseAccount and accountsPayableAccount.
 */
export const financeRouter = router({
  setVendorAccounts: createFeatureRestrictedProcedure("finance:manage")
    .input(z.object({ vendorId: z.string(), expenseAccountId: z.string(), payableAccountId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.setSetting(`vendor_${input.vendorId}_expenseAccount`, input.expenseAccountId, 'accounting');
      await db.setSetting(`vendor_${input.vendorId}_payableAccount`, input.payableAccountId, 'accounting');
      return { success: true };
    }),

  getVendorAccounts: createFeatureRestrictedProcedure("finance:read")
    .input(z.string()) // vendorId
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { expense: null, payable: null };
      const exp = await db.getSetting(`vendor_${input}_expenseAccount`);
      const pay = await db.getSetting(`vendor_${input}_payableAccount`);
      return { expense: exp?.value || null, payable: pay?.value || null };
    }),

  reconcileEntry: createFeatureRestrictedProcedure("finance:reconcile")
    .input(z.object({ journalEntryId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const id = uuidv4();
      await db.insert(journalEntryReconciliations).values({
        id,
        journalEntryId: input.journalEntryId,
        reconciledBy: ctx.user.id,
        notes: input.notes || null,
      } as any);
      await db.logActivity({ userId: ctx.user.id, action: 'entry_reconciled', entityType: 'journalEntry', entityId: input.journalEntryId, description: input.notes || '' });
      return { id };
    }),

  listReconciliations: createFeatureRestrictedProcedure("finance:read")
    .input(z.object({ journalEntryId: z.string().optional(), notesSearch: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let q: any = db.select().from(journalEntryReconciliations);
      if (input?.journalEntryId) q = q.where(eq(journalEntryReconciliations.journalEntryId, input.journalEntryId));
      if (input?.notesSearch) q = q.where(journalEntryReconciliations.notes.like(`%${input.notesSearch}%`));
      return await q;
    }),

  exportReconciliations: createFeatureRestrictedProcedure("finance:export")
    .input(z.object({ journalEntryId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let q: any = db.select().from(journalEntryReconciliations);
      if (input?.journalEntryId) q = q.where(eq(journalEntryReconciliations.journalEntryId, input.journalEntryId));
      const rows = await q;
      // convert to CSV-like array of objects
      return rows.map((r: any) => ({
        id: r.id,
        journalEntryId: r.journalEntryId,
        reconciledBy: r.reconciledBy,
        reconciledAt: r.reconciledAt,
        notes: r.notes,
      }));
    }),

  updateReconciliation: createFeatureRestrictedProcedure("finance:reconcile")
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(journalEntryReconciliations)
        .set({ notes: input.notes || null })
        .where(eq(journalEntryReconciliations.id, input.id));
      await db.logActivity({ userId: ctx.user.id, action: 'entry_reconciliation_updated', entityType: 'journalEntry', entityId: input.id, description: input.notes || '' });
      return { success: true };
    }),

  undoReconciliation: createFeatureRestrictedProcedure("finance:reconcile")
    .input(z.string()) // reconciliation id
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(journalEntryReconciliations).where(eq(journalEntryReconciliations.id, input));
      await db.logActivity({ userId: ctx.user.id, action: 'entry_reconciliation_undone', entityType: 'journalEntry', entityId: input, description: '' });
      return { success: true };
    }),

  // placeholder export function for accounting software integration
  exportVendorAccounts: createFeatureRestrictedProcedure("finance:export")
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      const settings = await db.getSettingsByCategory('accounting');
      return settings.filter((s: any) => s.key.startsWith('vendor_'));
    }),

  autoPostFromModule: createFeatureRestrictedProcedure("finance:manage")
    .input(z.object({ module: z.string(), recordId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // placeholder: when another module wants to create a journal entry automatically
      const db = await getDb();
      if (!db) throw new Error('DB not ready');
      // real implementation would look at module and recordId and generate appropriate entry
      await db.logActivity({ userId: ctx.user.id, action: 'auto_post', entityType: input.module, entityId: input.recordId, description: '' });
      return { success: true };
    }),

  // retrieve default account IDs stored in settings
  getDefaults: createFeatureRestrictedProcedure("finance:read")
    .query(async () => {
      const db = await getDb();
      if (!db) return { expense: null, payable: null };
      const exp = await db.getDefaultSetting('accounting', 'defaultExpenseAccount');
      const pay = await db.getDefaultSetting('accounting', 'accountsPayableAccount');
      return { expense: exp?.value || null, payable: pay?.value || null };
    }),

  // list all vendor-specific account mappings in the accounting category
  listVendorAccounts: createFeatureRestrictedProcedure("finance:read")
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      // use settings by category helper if available
      const settings = await db.getSettingsByCategory('accounting');
      const result: Array<{ vendorId: string; expense: string | null; payable: string | null }> = [];
      const map: Record<string, { expense?: string; payable?: string }> = {};
      settings.forEach((s: any) => {
        if (s.key.startsWith('vendor_')) {
          const m = s.key.match(/^vendor_(.+?)_(expense|payable)Account$/);
          if (m) {
            const vid = m[1];
            const type = m[2];
            map[vid] = map[vid] || {};
            map[vid][type === 'expense' ? 'expense' : 'payable'] = s.value;
          }
        }
      });
      Object.entries(map).forEach(([vid, v]) => {
        result.push({ vendorId: vid, expense: v.expense || null, payable: v.payable || null });
      });
      return result;
    }),

  /**
   * AUTO-GENERATE RECEIPT: Called when invoice is marked as PAID
   * Creates receipt immediately and notifies customer
   */
  generateReceiptFromInvoice: createFeatureRestrictedProcedure("finance:manage")
    .input(z.string()) // invoiceId
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("DB not available");

        // Get invoice
        const invoice = await db.getInvoice(input);
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        // Check if receipt already exists
        const existingReceipt = await db.getReceiptByInvoiceId(input);
        if (existingReceipt) {
          return {
            success: true,
            receipt: existingReceipt,
            message: "Receipt already generated for this invoice",
          };
        }

        // Generate receipt
        const receiptId = uuidv4();
        const receiptNumber = `RCP-${Date.now()}-${receiptId.substring(0, 8)}`;

        const receipt = await db.createReceipt({
          id: receiptId,
          invoiceId: input,
          receiptNumber,
          issuedDate: new Date().toISOString(),
          totalAmount: (invoice as any).totalAmount,
          paymentStatus: "fully_paid",
          notes: `Receipt auto-generated from Invoice #${(invoice as any).invoiceNumber} on payment`,
        });

        // Log activity
        await db.logActivity({
          userId: "system",
          action: "receipt_auto_generated",
          entityType: "receipt",
          entityId: receiptId,
          description: `Receipt #${receiptNumber} automatically generated for Invoice #${(invoice as any).invoiceNumber}`,
        });

        // Queue email notification (async)
        try {
          await db.createCommunication({
            id: uuidv4(),
            type: "email",
            recipientEmail: (invoice as any).clientEmail || process.env.COMPANY_EMAIL || "",
            subject: `Receipt #${receiptNumber} - Payment Confirmation`,
            body: `Your payment has been received successfully. Please find attached your receipt #${receiptNumber} for amount ${(invoice as any).totalAmount}`,
            status: "pending",
            reference: receiptId,
          });
        } catch (emailError) {
          console.warn("[Finance] Email queue warning:", emailError);
        }

        return {
          success: true,
          receipt,
          message: "Receipt generated and customer notified",
        };
      } catch (error: any) {
        console.error("[Finance] Generate receipt error:", error);
        throw new Error(error?.message || "Failed to generate receipt");
      }
    }),

  /**
   * Get all receipts for a client
   */
  getClientReceipts: createFeatureRestrictedProcedure("finance:read")
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { receipts: [], total: 0, success: true };

        const user = await db.getUserById(ctx.user.id);
        if (!user?.clientId) {
          return { receipts: [], total: 0, success: true };
        }

        const receipts = await db.getClientReceipts(user.clientId, input.limit, input.offset);
        const total = await db.getClientReceiptCount(user.clientId);

        return {
          success: true,
          receipts,
          total,
          page: Math.ceil(input.offset / input.limit) + 1,
          pageSize: input.limit,
        };
      } catch (error: any) {
        console.error("[Finance] Get receipts error:", error);
        return {
          success: false,
          receipts: [],
          total: 0,
          error: error?.message,
        };
      }
    }),

  /**
   * Download receipt as PDF
   */
  downloadReceiptPDF: createFeatureRestrictedProcedure("finance:read")
    .input(z.string()) // receiptId
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("DB not available");

        const receipt = await db.getReceiptById(input);
        if (!receipt) {
          throw new Error("Receipt not found");
        }

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "receipt_downloaded",
          entityType: "receipt",
          entityId: input,
          description: `Receipt #${(receipt as any).receiptNumber} downloaded as PDF`,
        });

        return {
          success: true,
          receipt,
          downloadUrl: `/api/receipts/${input}/pdf`,
        };
      } catch (error: any) {
        console.error("[Finance] Download receipt error:", error);
        throw new Error(error?.message || "Failed to download receipt");
      }
    }),
});
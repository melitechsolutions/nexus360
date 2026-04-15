import { router } from "../_core/trpc";
import { z } from "zod";
import { getDb, logActivity, createNotification } from "../db";
import { invoices, invoiceItems, activityLog, clients, receipts, clientSubscriptions } from "../../drizzle/schema";
import { invoicePayments } from "../../drizzle/schema-extended";
import { eq, desc, lt, ne, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateInvoicePDF } from "../utils/pdf-generator";
import { triggerEventNotification } from "./emailNotifications";
import { workflowTriggerEngine } from "../workflows/triggerEngine";
import { notifyOrg } from "../sse";
import { createFeatureRestrictedProcedure, createRoleRestrictedProcedure } from "../middleware/enhancedRbac";
import { generateNextDocumentNumber } from "../utils/document-numbering";
import { getCompanyInfo } from "../utils/company-info";
import { verifyOrgOwnership } from "../middleware/orgIsolation";
import { TRPCError } from "@trpc/server";

// Permission-restricted procedure instances
const viewProcedure = createFeatureRestrictedProcedure("accounting:invoices:view");
const createProcedure = createFeatureRestrictedProcedure("accounting:invoices:create");
const approveProcedure = createFeatureRestrictedProcedure("accounting:invoices:approve");
const deleteProcedure = createRoleRestrictedProcedure(["super_admin", "admin"]);

// Use shared settings-aware document numbering
async function generateNextInvoiceNumber(db: any): Promise<string> {
  return generateNextDocumentNumber(db, "invoice");
}

// Validation schema for line items
const lineItemSchema = z.object({
  id: z.string().optional(),
  itemType: z.enum(['product', 'service', 'custom']),
  itemId: z.string().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative().default(0),
  discountPercent: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
});

// Helper function to send invoice notifications
async function sendInvoiceNotification(
  db: any,
  userId: string,
  action: "created" | "updated" | "approved" | "sent" | "paid",
  invoiceNumber: string,
  invoiceId: string
) {
  try {
    const messages = {
      created: `Invoice ${invoiceNumber} has been created successfully`,
      updated: `Invoice ${invoiceNumber} has been updated`,
      approved: `Invoice ${invoiceNumber} has been approved`,
      sent: `Invoice ${invoiceNumber} has been sent to client`,
      paid: `Invoice ${invoiceNumber} has been marked as paid`,
    };

    const titles = {
      created: "Invoice Created",
      updated: "Invoice Updated",
      approved: "Invoice Approved",
      sent: "Invoice Sent",
      paid: "Payment Received",
    };

    await createNotification({
      userId,
      title: titles[action],
      message: messages[action],
      type: action === "paid" || action === "approved" ? "success" : "info",
      category: "invoice",
      entityType: "invoice",
      entityId: invoiceId,
      actionUrl: `/invoices/${invoiceId}`,
      priority: "normal",
    });
  } catch (err) {
    console.warn("Failed to create invoice notification:", err);
  }
}

export const invoicesRouter = router({
  list: viewProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          console.error("[Invoices] Database connection not available");
          return [];
        }
        const orgId = ctx.user.organizationId;
        const result = orgId
          ? await db.select().from(invoices).where(eq(invoices.organizationId, orgId)).limit(input?.limit || 50).offset(input?.offset || 0)
          : await db.select().from(invoices).limit(input?.limit || 50).offset(input?.offset || 0);
        return result;
      } catch (error) {
        console.error("[Invoices] Error fetching invoices:", error);
        throw error; // Re-throw so TRPC can handle it as a proper error response
      }
    }),

  getNextInvoiceNumber: viewProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const nextNumber = await generateNextInvoiceNumber(db);
      return { invoiceNumber: nextNumber };
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      
      // STRICT: Get invoice without org filter
      const result = await db.select().from(invoices).where(eq(invoices.id, input)).limit(1);
      if (!result[0]) return null;
      
      // STRICT: Verify user owns this invoice
      verifyOrgOwnership(ctx, result[0].organizationId);
      
      return result[0] || null;
    }),

  // Get invoice with all line items
  getWithItems: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      
      // STRICT: Get invoice without org filter
      const invoice = await db.select().from(invoices).where(eq(invoices.id, input)).limit(1);
      if (!invoice[0]) return null;

      // STRICT: Verify user owns this invoice
      verifyOrgOwnership(ctx, invoice[0].organizationId);
      
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, input));
      
      return {
        ...invoice[0],
        lineItems: items,
      };
    }),

  byClient: viewProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      
      // STRICT: First verify the client belongs to user's org
      const clientResult = await db.select({ organizationId: clients.organizationId }).from(clients).where(eq(clients.id, input.clientId)).limit(1);
      if (!clientResult[0]) return [];
      
      verifyOrgOwnership(ctx, clientResult[0].organizationId);
      
      // Now safe to return invoices for this client
      const result = await db.select().from(invoices).where(eq(invoices.clientId, input.clientId));
      return result;
    }),

  create: createProcedure
    .input(z.object({
      invoiceNumber: z.string().optional(),
      clientId: z.string(),
      title: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "partial", "overdue", "cancelled"]).optional(),
      issueDate: z.date(),
      dueDate: z.date(),
      subtotal: z.number(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      total: z.number(),
      paidAmount: z.number().default(0),
      notes: z.string().optional(),
      terms: z.string().optional(),
      estimateId: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const id = uuidv4();
      const { lineItems, ...invoiceData } = input;

      // Generate invoice number if not provided
      let invoiceNumber = invoiceData.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = await generateNextInvoiceNumber(db);
      }

      // Convert dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      // MySQL doesn't accept ISO 8601 format for DATETIME/TIMESTAMP fields
      const convertToMySQLDateTime = (date?: Date | string | null): string => {
        if (!date) return new Date().toISOString().replace('T', ' ').substring(0, 19);
        if (typeof date === 'string') return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
        if (date instanceof Date) return date.toISOString().replace('T', ' ').substring(0, 19);
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
      };

      const issueDate = convertToMySQLDateTime(invoiceData.issueDate);
      const dueDate = convertToMySQLDateTime(invoiceData.dueDate);
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Use these values in notifications after try/catch block
      const clientId = invoiceData.clientId;
      const total = invoiceData.total;

      try {
        // Build insert object with all fields properly handled
        const insertValues: any = {
          id,
          invoiceNumber,
          invoiceSequence: parseInt(invoiceNumber.match(/-(\d+)$/)?.[1] || '0') || 0,
          clientId,
          estimateId: invoiceData.estimateId || null,
          title: invoiceData.title || null,
          status: invoiceData.status ?? "draft",
          issueDate,
          dueDate,
          subtotal: invoiceData.subtotal,
          taxAmount: invoiceData.taxAmount ?? 0,
          discountAmount: invoiceData.discountAmount ?? 0,
          total,
          paidAmount: invoiceData.paidAmount ?? 0,
          notes: invoiceData.notes || null,
          terms: invoiceData.terms || null,
          organizationId: ctx.user.organizationId ?? null,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
          paymentPlanId: null,
        };

        await db.insert(invoices).values(insertValues);

        // Create activity log (inside try block so insertValues is in scope)
        await db.insert(activityLog).values({
          id: uuidv4(),
          userId: ctx.user.id,
          action: "invoice_created",
          entityType: "invoice",
          entityId: id,
          description: `Created invoice: ${invoiceNumber}`,
          createdAt: now,
        });
      } catch (err: any) {
        console.error('Failed to insert invoice', { invoiceData, err });
        throw new Error('Failed to create invoice: ' + (err?.message || String(err)));
      }

      // Insert line items if provided
      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          const itemId = uuidv4();
          await db.insert(invoiceItems).values({
            id: itemId,
            invoiceId: id,
            itemType: item.itemType,
            itemId: item.itemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discountPercent: item.discountPercent,
            total: item.total,
          });
        }
      }

      // Send notification
      await sendInvoiceNotification(db, ctx.user.id, "created", invoiceNumber, id);

      // SSE: broadcast to org
      if (ctx.user.organizationId) {
        notifyOrg(ctx.user.organizationId, {
          id: `invoice-created-${id}`,
          type: "invoice_created",
          title: "Invoice Created",
          body: `Invoice ${invoiceNumber} has been created`,
          href: `/org/${ctx.user.organizationSlug || ''}/invoices`,
          timestamp: new Date().toISOString(),
        });
      }

      // Trigger email notification to accountant
      try {
        const dateObj = new Date();
        const dueDateFormatted = dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set';
        
        await triggerEventNotification({
          userId: ctx.user.id,
          eventType: "invoice_created",
          recipientEmail: ctx.user.email || "accountant@company.com",
          recipientName: "Accountant",
          subject: `Invoice ${invoiceNumber} Created`,
          htmlContent: `
            <h2>New Invoice Created</h2>
            <p>Invoice <strong>${invoiceNumber}</strong> has been created.</p>
            <ul>
              <li><strong>Client ID:</strong> ${clientId}</li>
              <li><strong>Amount:</strong> Ksh ${(total / 100).toLocaleString("en-KE")}</li>
              <li><strong>Issue Date:</strong> ${new Date(issueDate).toLocaleDateString()}</li>
              <li><strong>Due Date:</strong> ${dueDateFormatted}</li>
            </ul>
            <p><a href="/invoices/${id}">View Invoice</a></p>
          `,
          entityType: "invoice",
          entityId: id,
          actionUrl: `/invoices/${id}`,
        });
      } catch (err) {
        console.error("Failed to send invoice creation email:", err);
      }

      // Trigger workflows for invoice_created
      try {
        await workflowTriggerEngine.trigger({
          triggerType: "invoice_created",
          entityType: "invoice",
          entityId: id,
          data: {
            id,
            invoiceNumber,
            clientId,
            total,
            issueDate,
            dueDate,
          },
          userId: ctx.user.id,
        });
      } catch (err) {
        console.error("Workflow trigger (invoice_created) failed:", err);
      }

      return { id };
    }),

  update: createProcedure
    .input(z.object({
      id: z.string(),
      invoiceNumber: z.string().optional(),
      clientId: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "partial", "overdue", "cancelled"]).optional(),
      issueDate: z.date().optional(),
      dueDate: z.date().optional(),
      subtotal: z.number().optional(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      total: z.number().optional(),
      paidAmount: z.number().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, lineItems, ...data } = input;

      // STRICT: Get current invoice and verify org ownership
      const currentInvoice = await db.select({ organizationId: invoices.organizationId, status: invoices.status }).from(invoices).where(eq(invoices.id, id)).limit(1);
      if (!currentInvoice.length) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      
      verifyOrgOwnership(ctx, currentInvoice[0].organizationId);
      
      const oldStatus = currentInvoice[0]?.status;
      const newStatus = (data as any).status;

      // Convert Date fields to MySQL format (YYYY-MM-DD HH:MM:SS)
      const convertToMySQLDateTime = (date?: Date | string | null): string | undefined => {
        if (!date) return undefined;
        if (typeof date === 'string') return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
        if (date instanceof Date) return date.toISOString().replace('T', ' ').substring(0, 19);
        return undefined;
      };

      const updateData: any = {
        ...data,
        issueDate: convertToMySQLDateTime((data as any).issueDate),
        dueDate: convertToMySQLDateTime((data as any).dueDate),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      await db.update(invoices).set(updateData).where(eq(invoices.id, id));

      // Update line items if provided
      if (lineItems !== undefined) {
        // Delete existing line items
        await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        
        // Insert new line items
        if (lineItems.length > 0) {
          for (const item of lineItems) {
            const itemId = uuidv4();
            await db.insert(invoiceItems).values({
              id: itemId,
              invoiceId: id,
              itemType: item.itemType,
              itemId: item.itemId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discountPercent: item.discountPercent,
              total: item.total,
            });
          }
        }
      }

      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "invoice_updated",
        entityType: "invoice",
        entityId: id,
        description: `Updated invoice: ${data.invoiceNumber || id}`,
      });

      // Send notifications for status changes
      if (newStatus && oldStatus !== newStatus) {
        const invoiceNumber = currentInvoice[0]?.invoiceNumber || id;
        if (newStatus === "paid") {
          await sendInvoiceNotification(db, ctx.user.id, "paid", invoiceNumber, id);
          // SSE: broadcast payment received
          if (ctx.user.organizationId) {
            notifyOrg(ctx.user.organizationId, {
              id: `invoice-paid-${id}-${Date.now()}`,
              type: "invoice_paid",
              title: "Payment Received",
              body: `Invoice ${invoiceNumber} has been marked as paid`,
              href: `/org/${ctx.user.organizationSlug || ''}/invoices`,
              timestamp: new Date().toISOString(),
            });
          }
          // Trigger workflows for invoice_paid
          try {
            await workflowTriggerEngine.trigger({
              triggerType: "invoice_paid",
              entityType: "invoice",
              entityId: id,
              data: { invoiceId: id, invoiceNumber },
              userId: ctx.user.id,
            });
          } catch (err) {
            console.error("Workflow trigger (invoice_paid) failed:", err);
          }
        } else if (newStatus === "sent") {
          await sendInvoiceNotification(db, ctx.user.id, "sent", invoiceNumber, id);
          
          // Send email notification when invoice is marked as sent
          try {
            const dueDate = currentInvoice[0]?.dueDate ? new Date(currentInvoice[0].dueDate).toLocaleDateString() : 'Not set';
            await triggerEventNotification({
              userId: ctx.user.id,
              eventType: "invoice_sent",
              recipientEmail: "client@example.com",
              recipientName: "Client",
              subject: `Invoice ${invoiceNumber} from ${(await getCompanyInfo()).name}`,
              htmlContent: `
                <h2>Invoice Sent</h2>
                <p>Invoice <strong>${invoiceNumber}</strong> has been sent.</p>
                <ul>
                  <li><strong>Amount:</strong> Ksh ${(currentInvoice[0]?.total / 100).toLocaleString("en-KE") || "N/A"}</li>
                  <li><strong>Due Date:</strong> ${dueDate}</li>
                </ul>
                <p><a href="/invoices/${id}">View Invoice</a></p>
              `,
              entityType: "invoice",
              entityId: id,
              actionUrl: `/invoices/${id}`,
            });
          } catch (err) {
            console.error("Failed to send invoice sent email:", err);
          }
        } else if (newStatus === "approved") {
          await sendInvoiceNotification(db, ctx.user.id, "approved", invoiceNumber, id);
        }
      } else if (!oldStatus) {
        // Regular update notification
        await sendInvoiceNotification(db, ctx.user.id, "updated", currentInvoice[0]?.invoiceNumber || id, id);
      }

      return { success: true };
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // STRICT: Get invoice and verify org ownership
      const invoice = await db.select({ organizationId: invoices.organizationId }).from(invoices).where(eq(invoices.id, input)).limit(1);
      if (!invoice.length) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      
      verifyOrgOwnership(ctx, invoice[0].organizationId);
      
      // Delete line items first
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, input));
      
      // Delete invoice
      await db.delete(invoices).where(eq(invoices.id, input));

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "invoice_deleted",
        entityType: "invoice",
        entityId: input,
        description: `Deleted invoice: ${input}`,
        createdAt: now,
      });

      return { success: true };
    }),

  bulkDelete: deleteProcedure
    .input(z.array(z.string()).min(1))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // STRICT: Verify all invoices belong to user's org
      const invoiceRecords = await db.select({ id: invoices.id, organizationId: invoices.organizationId }).from(invoices).where(inArray(invoices.id, input));
      
      for (const invoice of invoiceRecords) {
        verifyOrgOwnership(ctx, invoice.organizationId);
      }
      
      const verifiedIds = invoiceRecords.map(i => i.id);
      
      // Delete line items for all selected invoices first
      await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, verifiedIds));
      await db.delete(invoices).where(inArray(invoices.id, verifiedIds));
      return { success: true, count: verifiedIds.length };
    }),

  byStatus: viewProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select().from(invoices).where(eq(invoices.status, input.status as any));
      return result;
    }),

  // Client-facing alias used by legacy client code
  getClientInvoices: viewProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const clientId = input?.clientId || (ctx.user as any)?.clientId || ctx.user.id;
      const result = await db.select().from(invoices).where(eq(invoices.clientId, clientId));
      return result;
    }),

  // Get line items for an invoice
  getLineItems: viewProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, input));
      return result;
    }),

  // Add line item to invoice
  addLineItem: createProcedure
    .input(z.object({
      invoiceId: z.string(),
      itemType: z.enum(['product', 'service', 'custom']),
      itemId: z.string().optional(),
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      taxRate: z.number().nonnegative().default(0),
      discountPercent: z.number().nonnegative().default(0),
      total: z.number().nonnegative(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const id = uuidv4();
      const { invoiceId, ...itemData } = input;
      
      await db.insert(invoiceItems).values({
        id,
        invoiceId,
        ...itemData,
      });

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "invoice_item_added",
        entityType: "invoiceItem",
        entityId: id,
        description: `Added line item to invoice: ${invoiceId}`,
        createdAt: now,
      });

      return { id };
    }),

  // Update line item
  updateLineItem: createProcedure
    .input(z.object({
      id: z.string(),
      invoiceId: z.string(),
      itemType: z.enum(['product', 'service', 'custom']).optional(),
      itemId: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().positive().optional(),
      unitPrice: z.number().nonnegative().optional(),
      taxRate: z.number().nonnegative().optional(),
      discountPercent: z.number().nonnegative().optional(),
      total: z.number().nonnegative().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, invoiceId, ...data } = input;
      
      await db.update(invoiceItems).set(data).where(eq(invoiceItems.id, id));

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "invoice_item_updated",
        entityType: "invoiceItem",
        entityId: id,
        description: `Updated line item: ${JSON.stringify(data)}`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Delete line item
  deleteLineItem: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(invoiceItems).where(eq(invoiceItems.id, input));

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ctx.user.id,
        action: "invoice_item_deleted",
        entityType: "invoiceItem",
        entityId: input,
        description: `Deleted line item: ${input}`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Download invoice as PDF
  downloadPDF: viewProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const pdfBuffer = await generateInvoicePDF(input);
        
        // Log the download activity
        const db = await getDb();
        if (db) {
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: ctx.user.id,
            action: "invoice_downloaded",
            entityType: "invoice",
            entityId: input,
            description: `Downloaded invoice PDF`,
            createdAt: now,
          });
        }

        // Return base64 encoded PDF for download
        return {
          success: true,
          data: pdfBuffer.toString('base64'),
          fileName: `invoice-${input}.pdf`,
        };
      } catch (error) {
        throw new Error(`Failed to generate invoice PDF: ${error}`);
      }
    }),

  // Payment Management
  payments: router({
    // List all payments for an invoice
    list: viewProcedure
      .input(z.object({ invoiceId: z.string() }))
      .query(async ({ input }) => {
        try {
          const db = await getDb();
          if (!db) return [];

          const payments = await db
            .select()
            .from(invoicePayments)
            .where(eq(invoicePayments.invoiceId, input.invoiceId))
            .orderBy(desc(invoicePayments.paymentDate));

          return payments;
        } catch (error) {
          console.error("Error fetching invoice payments:", error);
          return [];
        }
      }),

    // Record a payment for an invoice
    create: createProcedure
      .input(z.object({
        invoiceId: z.string(),
        paymentAmount: z.number().positive(), // in cents
        paymentDate: z.string().or(z.date()),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'check', 'mobile_money', 'credit_card', 'other']),
        reference: z.string().optional(),
        notes: z.string().optional(),
        receiptId: z.string().optional(),
        accountId: z.string().optional(), // Chart of Accounts ID
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();

        // Convert date to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        const convertToMySQLDateTime = (date: string | Date): string => {
          let d: Date;
          if (typeof date === 'string') {
            d = new Date(date);
          } else if (date instanceof Date) {
            d = date;
          } else {
            d = new Date();
          }
          return d.toISOString().replace('T', ' ').substring(0, 19);
        };

        try {
          // Insert payment record
          const paymentData: any = {
            id,
            invoiceId: input.invoiceId,
            paymentAmount: input.paymentAmount,
            paymentDate: typeof input.paymentDate === 'string' ? new Date(input.paymentDate) : input.paymentDate,
            paymentMethod: input.paymentMethod,
            recordedBy: ctx.user.id,
          };

          // Only include optional fields if they are provided
          if (input.reference) paymentData.reference = input.reference;
          if (input.notes) paymentData.notes = input.notes;
          if (input.receiptId) paymentData.receiptId = input.receiptId;

          await db.insert(invoicePayments).values(paymentData);
        } catch (err) {
          console.error("Error recording invoice payment:", err);
          throw new Error(`Failed to record payment: ${err instanceof Error ? err.message : "Unknown error"}`);
        }

        // Log activity
        const invoice = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
        if (invoice.length > 0) {
          await logActivity({
            userId: ctx.user.id,
            action: "invoice_payment_recorded",
            entityType: "invoice",
            entityId: input.invoiceId,
            description: `Recorded payment of ${input.paymentAmount / 100} for invoice ${invoice[0].invoiceNumber}`,
          });

          // Check if invoice is fully paid
          const totalPaid = await calculateInvoicePaidAmount(db, input.invoiceId);
          const invoiceTotal = invoice[0].total || 0;
          
          if (totalPaid >= invoiceTotal && invoice[0].status !== 'paid') {
            // Update invoice status to paid
            await db.update(invoices)
              .set({ 
                status: 'paid',
                updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              })
              .where(eq(invoices.id, input.invoiceId));

            // Send notification
            await sendInvoiceNotification(db, ctx.user.id, 'paid', invoice[0].invoiceNumber, input.invoiceId);
          }

          // Send payment received email notification to client
          try {
            const client = await db.select().from(clients).where(eq(clients.id, invoice[0].clientId)).limit(1);
            if (client.length > 0 && client[0].email) {
              const remainingBalance = Math.max(0, invoiceTotal - totalPaid);
              await triggerEventNotification({
                userId: ctx.user.id,
                eventType: "payment_received",
                recipientEmail: client[0].email,
                recipientName: client[0].name || "Client",
                subject: `Payment Receipt - Invoice ${invoice[0].invoiceNumber}`,
                htmlContent: `
                  <h2>Payment Receipt - Invoice ${invoice[0].invoiceNumber}</h2>
                  <p>Dear ${client[0].name},</p>
                  <p>We have received your payment. Here are the details:</p>
                  <ul>
                    <li><strong>Invoice Number:</strong> ${invoice[0].invoiceNumber}</li>
                    <li><strong>Payment Amount:</strong> Ksh ${(input.paymentAmount / 100).toLocaleString("en-KE")}</li>
                    <li><strong>Payment Method:</strong> ${input.paymentMethod}</li>
                    <li><strong>Invoice Total:</strong> Ksh ${(invoiceTotal / 100).toLocaleString("en-KE")}</li>
                    <li><strong>Remaining Balance:</strong> Ksh ${(remainingBalance / 100).toLocaleString("en-KE")}</li>
                  </ul>
                  ${remainingBalance === 0 
                    ? "<p style='color: green; font-weight: bold;'>Thank you! Your invoice has been settled in full.</p>" 
                    : `<p>We look forward to receiving the remaining balance of Ksh ${(remainingBalance / 100).toLocaleString("en-KE")}.</p>`}
                `,
                entityType: "invoice",
                entityId: input.invoiceId,
                actionUrl: `/invoices/${input.invoiceId}`,
              });
            }
          } catch (err) {
            console.warn("Failed to send payment notification:", err);
          }
        }

        return { success: true, id };
      }),

    // Update a payment record
    update: createProcedure
      .input(z.object({
        id: z.string(),
        paymentAmount: z.number().optional(),
        paymentDate: z.string().or(z.date()).optional(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'check', 'mobile_money', 'credit_card', 'other']).optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
        accountId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Helper to convert date to MySQL DATETIME format
        const convertToMySQLDateTime = (date: string | Date): string => {
          let d: Date;
          if (typeof date === 'string') {
            d = new Date(date);
          } else if (date instanceof Date) {
            d = date;
          } else {
            d = new Date();
          }
          return d.toISOString().replace('T', ' ').substring(0, 19);
        };

        const updates: any = {};

        if (input.paymentAmount !== undefined) updates.paymentAmount = input.paymentAmount;
        if (input.paymentDate !== undefined) updates.paymentDate = typeof input.paymentDate === 'string' ? new Date(input.paymentDate) : input.paymentDate;
        if (input.paymentMethod !== undefined) updates.paymentMethod = input.paymentMethod;
        if (input.reference !== undefined) updates.reference = input.reference;
        if (input.notes !== undefined) updates.notes = input.notes;

        await db.update(invoicePayments)
          .set(updates)
          .where(eq(invoicePayments.id, input.id));

        // Log activity
        await logActivity({
          userId: ctx.user.id,
          action: "invoice_payment_updated",
          entityType: "invoicePayment",
          entityId: input.id,
          description: "Updated payment record",
        });

        return { success: true };
      }),

    // Delete a payment record
    delete: deleteProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get payment info for logging
        const payment = await db.select()
          .from(invoicePayments)
          .where(eq(invoicePayments.id, input.id))
          .limit(1);

        if (payment.length > 0) {
          await db.delete(invoicePayments)
            .where(eq(invoicePayments.id, input.id));

          // Log activity
          await logActivity({
            userId: ctx.user.id,
            action: "invoice_payment_deleted",
            entityType: "invoice",
            entityId: payment[0].invoiceId,
            description: "Deleted payment record",
          });

          // Reset invoice status if needed
          const totalPaid = await calculateInvoicePaidAmount(db, payment[0].invoiceId);
          const invoice = await db.select().from(invoices)
            .where(eq(invoices.id, payment[0].invoiceId))
            .limit(1);

          if (invoice.length > 0 && totalPaid < (invoice[0].total || 0)) {
            const newStatus = totalPaid > 0 ? 'partial' : 'sent';
            await db.update(invoices)
              .set({ 
                status: newStatus as any,
                updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              })
              .where(eq(invoices.id, payment[0].invoiceId));
          }
        }

        return { success: true };
      }),

    // Get payment summary for an invoice
    getSummary: viewProcedure
      .input(z.object({ invoiceId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { totalPaid: 0, invoiceTotal: 0, remainingBalance: 0, paymentStatus: 'pending' };

        const invoice = await db.select().from(invoices)
          .where(eq(invoices.id, input.invoiceId))
          .limit(1);

        if (invoice.length === 0) {
          return { totalPaid: 0, invoiceTotal: 0, remainingBalance: 0, paymentStatus: 'unknown' };
        }

        const totalPaid = await calculateInvoicePaidAmount(db, input.invoiceId);
        const invoiceTotal = invoice[0].total || 0;
        const remainingBalance = Math.max(0, invoiceTotal - totalPaid);

        let paymentStatus = 'pending';
        if (totalPaid >= invoiceTotal) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        }

        return {
          totalPaid,
          invoiceTotal,
          remainingBalance,
          paymentStatus,
        };
      }),

    // Get payment report for date range
    report: viewProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'check', 'mobile_money', 'credit_card', 'other']).optional(),
        clientId: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { payments: [], summary: {} };

        try {
          const start = new Date(input.startDate).toISOString().replace('T', ' ').substring(0, 19);
          const end = new Date(input.endDate).toISOString().replace('T', ' ').substring(0, 19);

          // Get all payments in date range
          let paymentsQuery = db
            .select({
              paymentId: invoicePayments.id,
              invoiceId: invoicePayments.invoiceId,
              paymentAmount: invoicePayments.paymentAmount,
              paymentDate: invoicePayments.paymentDate,
              paymentMethod: invoicePayments.paymentMethod,
              reference: invoicePayments.reference,
              receiptId: invoicePayments.receiptId,
            })
            .from(invoicePayments);

          // Add date filter
          const { gte, lte } = require("drizzle-orm");
          paymentsQuery = paymentsQuery.where(
            require("drizzle-orm").and(
              gte(invoicePayments.paymentDate, start),
              lte(invoicePayments.paymentDate, end)
            )
          );

          const payments = await paymentsQuery;

          // Filter by payment method if provided
          let filteredPayments = payments;
          if (input.paymentMethod) {
            filteredPayments = payments.filter((p: any) => p.paymentMethod === input.paymentMethod);
          }

          // Enrich with invoice and client details
          const enriched = [];
          for (const payment of filteredPayments) {
            const invoice = await db.select().from(invoices)
              .where(eq(invoices.id, payment.invoiceId))
              .limit(1);
            
            if (invoice.length > 0) {
              if (!input.clientId || invoice[0].clientId === input.clientId) {
                enriched.push({
                  ...payment,
                  invoiceNumber: invoice[0].invoiceNumber,
                  clientId: invoice[0].clientId,
                  invoiceTotal: invoice[0].total,
                });
              }
            }
          }

          // Calculate summary
          const totalPayments = enriched.length;
          const totalAmount = enriched.reduce((sum: number, p: any) => sum + (p.paymentAmount || 0), 0);
          
          const byMethod: Record<string, any> = {};
          enriched.forEach((p: any) => {
            if (!byMethod[p.paymentMethod]) {
              byMethod[p.paymentMethod] = { count: 0, amount: 0 };
            }
            byMethod[p.paymentMethod].count++;
            byMethod[p.paymentMethod].amount += p.paymentAmount || 0;
          });

          return {
            payments: enriched,
            summary: {
              dateRange: { start: input.startDate, end: input.endDate },
              totalPayments,
              totalAmount,
              averagePayment: totalPayments > 0 ? Math.round(totalAmount / totalPayments) : 0,
              byMethod: Object.entries(byMethod).map(([method, data]) => ({
                method,
                count: data.count,
                amount: data.amount,
              })),
            },
          };
        } catch (error) {
          console.error("Error generating payment report:", error);
          return { payments: [], summary: {} };
        }
      }),

    // List unlinked receipts for an invoice (by client)
    availableReceipts: viewProcedure
      .input(z.object({ invoiceId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        try {
          const invoice = await db.select().from(invoices)
            .where(eq(invoices.id, input.invoiceId))
            .limit(1);

          if (invoice.length === 0) return [];

          // Get all receipts for this client that are not linked to a payment
          const receiptsTable = require("../../drizzle/schema").receipts;
          const allReceipts = await db.select().from(receiptsTable)
            .where(eq(receiptsTable.clientId, invoice[0].clientId));

          // Get linked receipt IDs
          const linkedReceipts = await db.select({
            receiptId: invoicePayments.receiptId,
          }).from(invoicePayments)
            .where(require("drizzle-orm").ne(invoicePayments.receiptId, null));

          const linkedIds = new Set(linkedReceipts.map((r: any) => r.receiptId));

          // Return unlinked receipts
          return allReceipts.filter((r: any) => !linkedIds.has(r.id));
        } catch (error) {
          console.error("Error fetching available receipts:", error);
          return [];
        }
      }),

    // Get overdue invoices with payment status
    getOverdue: viewProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];

        try {
          const now = new Date();

          // Get all invoices past their due date that are not fully paid
          const overdueInvoices = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            clientId: invoices.clientId,
            dueDate: invoices.dueDate,
            total: invoices.total,
            paidAmount: invoices.paidAmount,
            status: invoices.status,
            client: clients,
          })
            .from(invoices)
            .innerJoin(clients, eq(invoices.clientId, clients.id))
            .where(and(
              lt(invoices.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
              ne(invoices.status, 'paid'),
              ne(invoices.status, 'cancelled')
            ));

          // Calculate remaining amount for each invoice
          const result = overdueInvoices.map((inv: any) => {
            const paid = inv.paidAmount || 0;
            const remaining = (inv.total || 0) - paid;
            const daysOverdue = Math.floor(
              (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              ...inv,
              paidAmount: paid,
              remainingAmount: remaining,
              daysOverdue,
            };
          });

          return result.filter((inv: any) => inv.remainingAmount > 0)
            .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
        } catch (error) {
          console.error("Error fetching overdue invoices:", error);
          return [];
        }
      }),

    // Send payment reminder to client
    sendReminder: createProcedure
      .input(z.object({
        invoiceId: z.string(),
        reminderType: z.enum(['first', 'second', 'final']).default('first'),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const invoice = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            total: invoices.total,
            dueDate: invoices.dueDate,
            clientId: invoices.clientId,
            client: clients,
          })
            .from(invoices)
            .innerJoin(clients, eq(invoices.clientId, clients.id))
            .where(eq(invoices.id, input.invoiceId))
            .limit(1);

          if (!invoice || invoice.length === 0) {
            throw new Error("Invoice not found");
          }

          const inv = invoice[0];
          const paid = await calculateInvoicePaidAmount(db, inv.id);
          const remaining = (inv.total || 0) - paid;

          // Log reminder activity
          await logActivity({
            userId: ctx.user.id,
            action: 'payment_reminder_sent',
            entityType: 'invoice',
            entityId: inv.id,
            details: {
              reminderType: input.reminderType,
              invoiceNumber: inv.invoiceNumber,
              remainingAmount: remaining,
            },
          });

          // Trigger email notification
          await triggerEventNotification(db, {
            event: 'payment_reminder_sent',
            clientId: inv.clientId,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            reminderType: input.reminderType,
            remainingAmount: remaining,
            dueDate: inv.dueDate,
          });

          return {
            success: true,
            message: `${input.reminderType.charAt(0).toUpperCase() + input.reminderType.slice(1)} reminder sent to ${inv.client?.name || 'client'}`,
          };
        } catch (error) {
          console.error("Error sending payment reminder:", error);
          throw error;
        }
      }),

    // Get invoices that need a reminder
    getRemindersNeeded: viewProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];

        try {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          // Get activity logs to find last reminder sent
          const { sql, ne } = require("drizzle-orm");

          // Get overdue invoices
          const overdueInvoices = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            dueDate: invoices.dueDate,
            total: invoices.total,
            clientId: invoices.clientId,
          })
            .from(invoices)
            .where(
              require("drizzle-orm").and(
                require("drizzle-orm").lt(invoices.dueDate, now.toISOString().replace('T', ' ').substring(0, 19)),
                ne(invoices.status, 'paid')
              )
            );

          const remindersNeeded: any[] = [];

          for (const inv of overdueInvoices) {
            const paid = await calculateInvoicePaidAmount(db, inv.id);
            if (paid >= (inv.total || 0)) continue; // Skip fully paid

            const daysOverdue = Math.floor(
              (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Check if first reminder should be sent (7+ days overdue)
            if (daysOverdue >= 7) {
              remindersNeeded.push({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                daysOverdue,
                reminderType: daysOverdue >= 30 ? 'final' : (daysOverdue >= 14 ? 'second' : 'first'),
              });
            }
          }

          return remindersNeeded;
        } catch (error) {
          console.error("Error getting reminders needed:", error);
          return [];
        }
      }),

    // Create recurring invoice + subscription
    createRecurring: createProcedure
      .input(z.object({
        clientId: z.string(),
        templateInvoiceId: z.string().optional(),
        frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "annually"]),
        startDate: z.string(), // ISO date
        endDate: z.string().optional(),
        description: z.string().optional(),
        noteToInvoice: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const { recurringInvoices, invoices, clientSubscriptions } = await import("../../drizzle/schema");
          const recurringId = uuidv4();
          const subscriptionId = uuidv4();
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const orgId = ctx.user.organizationId || null;
          
          // Calculate next due date based on frequency
          const startDate = new Date(input.startDate);
          let nextDueDate = new Date(startDate);
          
          const frequencyDays: Record<string, number> = {
            weekly: 7,
            biweekly: 14,
            monthly: 30,
            quarterly: 90,
            annually: 365,
          };
          
          nextDueDate.setDate(nextDueDate.getDate() + frequencyDays[input.frequency]);

          // Get invoice details for subscription name/amount
          let invoiceTotal = 0;
          let invoiceTitle = "Auto-Recurring Invoice";
          if (input.templateInvoiceId) {
            const [inv] = await db.select({ total: invoices.total, title: invoices.title })
              .from(invoices)
              .where(eq(invoices.id, input.templateInvoiceId))
              .limit(1);
            if (inv) {
              invoiceTotal = inv.total || 0;
              invoiceTitle = inv.title || invoiceTitle;
            }
          }

          // 1. Create the recurring invoice entry
          const recurringValues: any = {
            id: recurringId,
            organizationId: orgId,
            clientId: input.clientId,
            templateInvoiceId: input.templateInvoiceId || null,
            clientSubscriptionId: subscriptionId,
            frequency: input.frequency,
            startDate: startDate.toISOString().replace('T', ' ').substring(0, 19),
            endDate: input.endDate ? new Date(input.endDate).toISOString().replace('T', ' ').substring(0, 19) : null,
            nextDueDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
            lastGeneratedDate: null,
            isActive: 1,
            description: input.description || null,
            noteToInvoice: input.noteToInvoice || null,
            createdBy: ctx.user.id,
            createdAt: now,
            updatedAt: now,
          };

          await db.insert(recurringInvoices).values(recurringValues);

          // 2. Create a client subscription
          await db.insert(clientSubscriptions).values({
            id: subscriptionId,
            organizationId: orgId,
            clientId: input.clientId,
            name: invoiceTitle,
            description: input.description || `Auto-recurring subscription for ${invoiceTitle}`,
            status: 'active',
            frequency: input.frequency,
            amount: invoiceTotal,
            startDate: startDate.toISOString().replace('T', ' ').substring(0, 19),
            endDate: input.endDate ? new Date(input.endDate).toISOString().replace('T', ' ').substring(0, 19) : null,
            nextBillingDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
            templateInvoiceId: input.templateInvoiceId || null,
            recurringInvoiceId: recurringId,
            autoSendInvoice: 1,
            totalBilled: 0,
            invoiceCount: 0,
            createdBy: ctx.user.id,
            createdAt: now,
            updatedAt: now,
          });

          // 3. Mark the template invoice as auto-recurring
          if (input.templateInvoiceId) {
            await db.update(invoices)
              .set({
                isAutoRecurring: 1,
                recurringInvoiceId: recurringId,
                clientSubscriptionId: subscriptionId,
              })
              .where(eq(invoices.id, input.templateInvoiceId));
          }

          // Log activity
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: ctx.user.id,
            action: "recurring_invoice_created",
            entityType: "recurring_invoice",
            entityId: recurringId,
            description: `Created recurring invoice with frequency: ${input.frequency} and subscription ${subscriptionId}`,
          });

          return { 
            id: recurringId,
            subscriptionId,
            success: true, 
            message: "Recurring invoice and subscription created successfully" 
          };
        } catch (error) {
          console.error("Error creating recurring invoice:", error);
          throw new Error("Failed to create recurring invoice");
        }
      }),

    // Get recurring invoices
    getRecurring: viewProcedure
      .input(z.object({
        clientId: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        try {
          const { recurringInvoices } = await import("../../drizzle/schema");
          const { eq } = require("drizzle-orm");
          
          let query = db.select().from(recurringInvoices);
          
          if (input?.clientId) {
            query = query.where(eq(recurringInvoices.clientId, input.clientId));
          }
          
          if (input?.isActive !== undefined) {
            query = query.where(eq(recurringInvoices.isActive, input.isActive ? 1 : 0));
          }

          return await query.orderBy(recurringInvoices.createdAt);
        } catch (error) {
          console.error("Error fetching recurring invoices:", error);
          return [];
        }
      }),

    // Update recurring invoice
    updateRecurring: createProcedure
      .input(z.object({
        id: z.string(),
        frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "annually"]).optional(),
        endDate: z.string().optional(),
        isActive: z.boolean().optional(),
        description: z.string().optional(),
        noteToInvoice: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const { recurringInvoices } = await import("../../drizzle/schema");
          const { eq } = require("drizzle-orm");
          
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const updates: any = { updatedAt: now };
          
          if (input.frequency) updates.frequency = input.frequency;
          if (input.endDate !== undefined) updates.endDate = input.endDate ? new Date(input.endDate).toISOString().replace('T', ' ').substring(0, 19) : null;
          if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
          if (input.description !== undefined) updates.description = input.description;
          if (input.noteToInvoice !== undefined) updates.noteToInvoice = input.noteToInvoice;

          await db.update(recurringInvoices).set(updates).where(eq(recurringInvoices.id, input.id));

          // Log activity
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: ctx.user.id,
            action: "recurring_invoice_updated",
            entityType: "recurring_invoice",
            entityId: input.id,
            description: `Updated recurring invoice`,
          });

          return { success: true, message: "Recurring invoice updated successfully" };
        } catch (error) {
          console.error("Error updating recurring invoice:", error);
          throw new Error("Failed to update recurring invoice");
        }
      }),

    // Delete recurring invoice
    deleteRecurring: deleteProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const { recurringInvoices } = await import("../../drizzle/schema");
          const { eq } = require("drizzle-orm");
          
          await db.delete(recurringInvoices).where(eq(recurringInvoices.id, input.id));

          // Log activity
          await db.insert(activityLog).values({
            id: uuidv4(),
            userId: ctx.user.id,
            action: "recurring_invoice_deleted",
            entityType: "recurring_invoice",
            entityId: input.id,
            description: `Deleted recurring invoice`,
          });

          return { success: true, message: "Recurring invoice deleted successfully" };
        } catch (error) {
          console.error("Error deleting recurring invoice:", error);
          throw new Error("Failed to delete recurring invoice");
        }
      }),

    // Generate invoices for due recurring patterns
    generateDueRecurring: createProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const { recurringInvoices } = await import("../../drizzle/schema");
          const { eq, lte, isNull, and } = require("drizzle-orm");
          
          const now = new Date();
          const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);

          // Get all active recurring invoices with nextDueDate <= now
          const dueRecurring = await db.select()
            .from(recurringInvoices)
            .where(
              and(
                eq(recurringInvoices.isActive, 1),
                lte(recurringInvoices.nextDueDate, nowStr),
                isNull(recurringInvoices.endDate) // Ongoing
              )
            );

          const generatedInvoices: string[] = [];

          for (const recurring of dueRecurring) {
            try {
              // Get template invoice if it exists
              let templateData: any = null;
              if (recurring.templateInvoiceId) {
                const template = await db.select().from(invoices).where(eq(invoices.id, recurring.templateInvoiceId)).limit(1);
                if (template.length > 0) {
                  templateData = template[0];
                }
              }

              // Create new invoice from template
              const newInvoiceId = uuidv4();
              const newInvoiceNumber = await generateNextInvoiceNumber(db);
              
              const issueDate = now.toISOString().replace('T', ' ').substring(0, 19);
              
              // Calculate due date (30 days from issue date for now)
              const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
              const dueDateStr = dueDate.toISOString().replace('T', ' ').substring(0, 19);

              const newInvoiceValues: any = {
                id: newInvoiceId,
                invoiceNumber: newInvoiceNumber,
                invoiceSequence: parseInt(newInvoiceNumber.match(/-(\d+)$/ )[1] || '0') || 0,
                clientId: recurring.clientId,
                title: templateData?.title || `Invoice for ${recurring.clientId}`,
                status: "draft",
                issueDate,
                dueDate: dueDateStr,
                subtotal: templateData?.subtotal || 0,
                taxAmount: templateData?.taxAmount || 0,
                discountAmount: templateData?.discountAmount || 0,
                total: templateData?.total || 0,
                paidAmount: 0,
                notes: recurring.noteToInvoice || templateData?.notes || null,
                terms: templateData?.terms || null,
                createdBy: ctx.user.id,
                createdAt: nowStr,
                updatedAt: nowStr,
              };

              await db.insert(invoices).values(newInvoiceValues);

              // Copy line items if template exists
              if (recurring.templateInvoiceId && templateData) {
                const { invoiceItems } = await import("../../drizzle/schema");
                const templateItems = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, recurring.templateInvoiceId));
                
                for (const item of templateItems) {
                  await db.insert(invoiceItems).values({
                    id: uuidv4(),
                    invoiceId: newInvoiceId,
                    itemType: item.itemType,
                    itemId: item.itemId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total,
                    taxRate: item.taxRate,
                    discountPercent: item.discountPercent,
                    createdAt: nowStr,
                  });
                }
              }

              generatedInvoices.push(newInvoiceId);

              // Update next due date
              const nextDueDate = new Date(new Date(recurring.nextDueDate).getTime());
              const frequencyDays = {
                weekly: 7,
                biweekly: 14,
                monthly: 30,
                quarterly: 90,
                annually: 365,
              };
              nextDueDate.setDate(nextDueDate.getDate() + frequencyDays[recurring.frequency]);

              await db.update(recurringInvoices)
                .set({
                  nextDueDate: nextDueDate.toISOString().replace('T', ' ').substring(0, 19),
                  lastGeneratedDate: nowStr,
                  updatedAt: nowStr,
                })
                .where(eq(recurringInvoices.id, recurring.id));

              // Log activity
              await db.insert(activityLog).values({
                id: uuidv4(),
                userId: ctx.user.id,
                action: "recurring_invoice_generated",
                entityType: "invoice",
                entityId: newInvoiceId,
                description: `Auto-generated invoice from recurring pattern: ${newInvoiceNumber}`,
              });

            } catch (error) {
              console.error(`Error generating invoice for recurring pattern ${recurring.id}:`, error);
              continue;
            }
          }

          return {
            success: true,
            message: `Generated ${generatedInvoices.length} invoice(s)`,
            invoiceIds: generatedInvoices,
          };
        } catch (error) {
          console.error("Error in generateDueRecurring:", error);
          throw new Error("Failed to generate due recurring invoices");
        }
      }),
  }),
});

// Helper function to calculate total paid amount for an invoice
async function calculateInvoicePaidAmount(db: any, invoiceId: string): Promise<number> {
  try {
    const payments = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId));

    return payments.reduce((total: number, payment: any) => total + (payment.paymentAmount || 0), 0);
  } catch (error: any) {
    console.error("Error calculating invoice paid amount:", error.message);
    // Return 0 if table doesn't exist or query fails
    return 0;
  }
}

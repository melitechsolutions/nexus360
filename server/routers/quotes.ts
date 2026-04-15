import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { quotes, lineItems, quoteLogs } from "../../drizzle/schema-extended";
import { eq, and, or, desc, like } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate next quote number (QT-XXXX-MM)
 */
async function getNextQuoteNumber(database: any): Promise<string> {
  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    
    const lastQuote = await database
      .select()
      .from(quotes)
      .where(like(quotes.quoteNumber, `QT-%${month}%`))
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    if (!lastQuote.length) {
      return `QT-0001-${month}${year}`;
    }

    const lastNumber = lastQuote[0].quoteNumber;
    const match = lastNumber?.match(/QT-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `QT-${String(num).padStart(4, "0")}-${month}${year}`;
    }
    return `QT-0001-${month}${year}`;
  } catch {
    return `QT-0001`;
  }
}

export const quotesRouter = router({
  // Get all quotes with filters
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        status: z.enum(["draft", "sent", "accepted", "expired", "declined", "converted"]).optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const limit = input?.limit || 50;
        const offset = input?.offset || 0;

        let query = database.select().from(quotes);

        const conditions = [];
        
        // Organization isolation
        const orgId = ctx.user?.organizationId;
        if (orgId) {
          conditions.push(eq(quotes.organizationId, orgId));
        }

        if (input?.clientId) {
          conditions.push(eq(quotes.clientId, input.clientId));
        }

        if (input?.status) {
          conditions.push(eq(quotes.status, input.status));
        }

        if (input?.search) {
          conditions.push(
            or(
              like(quotes.quoteNumber, `%${input.search}%`),
              like(quotes.subject, `%${input.search}%`)
            )
          );
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const results = await query
          .orderBy(desc(quotes.createdAt))
          .limit(limit)
          .offset(offset);

        return results;
      } catch (error) {
        console.error("[Quotes List Error]", error);
        return [];
      }
    }),

  // Get single quote with line items
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) return null;

        const result = await database
          .select()
          .from(quotes)
          .where(eq(quotes.id, input))
          .limit(1);

        if (!result.length) return null;

        const quote = result[0];

        // Get line items
        const items = await database
          .select()
          .from(lineItems)
          .where(eq(lineItems.quoteId, input));

        // Get activity log
        const logs = await database
          .select()
          .from(quoteLogs)
          .where(eq(quoteLogs.quoteId, input))
          .orderBy(desc(quoteLogs.createdAt));

        return {
          ...quote,
          items: items || [],
          logs: logs || [],
        };
      } catch (error) {
        console.error("[Quotes GetById Error]", error);
        return null;
      }
    }),

  // Create new quote
  create: createFeatureRestrictedProcedure("quotes:create")
    .input(
      z.object({
        clientId: z.string(),
        subject: z.string(),
        description: z.string().optional(),
        items: z.array(
          z.object({
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            taxRate: z.number().optional(),
          })
        ).min(1),
        notes: z.string().optional(),
        expirationDays: z.number().default(30),
        template: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const quoteId = uuidv4();
        const quoteNumber = await getNextQuoteNumber(database);
        
        // Calculate totals
        let subtotal = 0;
        let taxAmount = 0;
        
        input.items.forEach((item) => {
          const itemTotal = item.quantity * item.unitPrice;
          subtotal += itemTotal;
          if (item.taxRate) {
            taxAmount += itemTotal * (item.taxRate / 100);
          }
        });

        const total = subtotal + taxAmount;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + input.expirationDays);

        // Insert quote
        await database.insert(quotes).values({
          id: quoteId,
          quoteNumber,
          clientId: input.clientId,
          subject: input.subject,
          description: input.description || null,
          status: "draft",
          subtotal,
          taxAmount,
          total,
          notes: input.notes || null,
          expirationDate,
          template: input.template ? 1 : 0,
          createdBy: ctx.user?.id || "system",
          organizationId: ctx.user?.organizationId ?? null,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        // Insert line items
        for (const item of input.items) {
          await database.insert(lineItems).values({
            id: uuidv4(),
            quoteId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 0,
            total: item.quantity * item.unitPrice,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
        }

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId,
          action: "created",
          description: "Quote created",
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return {
          id: quoteId,
          quoteNumber,
          status: "draft",
          total,
        };
      } catch (error) {
        console.error("[Quotes Create Error]", error);
        throw new Error("Failed to create quote");
      }
    }),

  // Update quote
  update: createFeatureRestrictedProcedure("quotes:update")
    .input(
      z.object({
        id: z.string(),
        subject: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        expirationDays: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const updateData: any = {
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        if (input.subject) updateData.subject = input.subject;
        if (input.description) updateData.description = input.description;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.expirationDays) {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + input.expirationDays);
          updateData.expirationDate = expirationDate;
        }

        await database
          .update(quotes)
          .set(updateData)
          .where(eq(quotes.id, input.id));

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: input.id,
          action: "updated",
          description: "Quote updated",
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return { success: true };
      } catch (error) {
        console.error("[Quotes Update Error]", error);
        throw new Error("Failed to update quote");
      }
    }),

  // Send quote to client
  send: createFeatureRestrictedProcedure("quotes:send")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        await database
          .update(quotes)
          .set({
            status: "sent",
            sentDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(quotes.id, input));

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: input,
          action: "sent",
          description: "Quote sent to client",
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return { success: true };
      } catch (error) {
        console.error("[Quotes Send Error]", error);
        throw new Error("Failed to send quote");
      }
    }),

  // Client accepts quote
  accept: createFeatureRestrictedProcedure("quotes:accept")
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        await database
          .update(quotes)
          .set({
            status: "accepted",
            acceptedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(quotes.id, input.id));

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: input.id,
          action: "accepted",
          description: `Quote accepted${input.notes ? `: ${input.notes}` : ""}`,
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return { success: true };
      } catch (error) {
        console.error("[Quotes Accept Error]", error);
        throw new Error("Failed to accept quote");
      }
    }),

  // Client declines quote
  decline: createFeatureRestrictedProcedure("quotes:decline")
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        await database
          .update(quotes)
          .set({
            status: "declined",
            declinedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(quotes.id, input.id));

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: input.id,
          action: "declined",
          description: `Quote declined${input.reason ? `: ${input.reason}` : ""}`,
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return { success: true };
      } catch (error) {
        console.error("[Quotes Decline Error]", error);
        throw new Error("Failed to decline quote");
      }
    }),

  // Convert accepted quote to invoice
  convertToInvoice: createFeatureRestrictedProcedure("quotes:convert")
    .input(
      z.object({
        id: z.string(),
        invoiceNote: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        // Get quote
        const quoteResult = await database
          .select()
          .from(quotes)
          .where(eq(quotes.id, input.id))
          .limit(1);

        if (!quoteResult.length) throw new Error("Quote not found");

        const quote = quoteResult[0];

        if (quote.status !== "accepted") {
          throw new Error("Only accepted quotes can be converted to invoices");
        }

        // Create invoice (simplified - in real system would create full invoice)
        const invoiceId = uuidv4();

        // Update quote status
        await database
          .update(quotes)
          .set({
            status: "converted",
            convertedInvoiceId: invoiceId,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(quotes.id, input.id));

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: input.id,
          action: "converted",
          description: `Converted to invoice ${invoiceId}`,
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return {
          success: true,
          invoiceId,
        };
      } catch (error) {
        console.error("[Quotes Convert Error]", error);
        throw new Error("Failed to convert quote to invoice");
      }
    }),

  // Expire quote
  expire: createFeatureRestrictedProcedure("quotes:update")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        await database
          .update(quotes)
          .set({
            status: "expired",
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(quotes.id, input));

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: input,
          action: "expired",
          description: "Quote expired",
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return { success: true };
      } catch (error) {
        console.error("[Quotes Expire Error]", error);
        throw new Error("Failed to expire quote");
      }
    }),

  // Duplicate quote
  duplicate: createFeatureRestrictedProcedure("quotes:create")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        // Get original quote with items
        const originalResult = await database
          .select()
          .from(quotes)
          .where(eq(quotes.id, input))
          .limit(1);

        if (!originalResult.length) throw new Error("Quote not found");

        const original = originalResult[0];
        const newQuoteId = uuidv4();
        const newQuoteNumber = await getNextQuoteNumber(database);

        // Create new quote
        await database.insert(quotes).values({
          id: newQuoteId,
          quoteNumber: newQuoteNumber,
          clientId: original.clientId,
          subject: `${original.subject} (Copy)`,
          description: original.description,
          status: "draft",
          subtotal: original.subtotal,
          taxAmount: original.taxAmount,
          total: original.total,
          notes: original.notes,
          expirationDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          template: original.template,
          createdBy: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        // Get original items and duplicate them
        const originalItems = await database
          .select()
          .from(lineItems)
          .where(eq(lineItems.quoteId, input));

        for (const item of originalItems) {
          await database.insert(lineItems).values({
            id: uuidv4(),
            quoteId: newQuoteId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
        }

        // Log activity
        await database.insert(quoteLogs).values({
          id: uuidv4(),
          quoteId: newQuoteId,
          action: "created",
          description: `Duplicated from quote ${original.quoteNumber}`,
          userId: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        return {
          id: newQuoteId,
          quoteNumber: newQuoteNumber,
          status: "draft",
        };
      } catch (error) {
        console.error("[Quotes Duplicate Error]", error);
        throw new Error("Failed to duplicate quote");
      }
    }),

  // Delete quote
  delete: createFeatureRestrictedProcedure("quotes:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        // Check if quote is converted
        const quoteResult = await database
          .select()
          .from(quotes)
          .where(eq(quotes.id, input))
          .limit(1);

        if (quoteResult.length && quoteResult[0].status === "converted") {
          throw new Error("Cannot delete converted quotes");
        }

        // Delete line items
        await database
          .delete(lineItems)
          .where(eq(lineItems.quoteId, input));

        // Delete logs
        await database
          .delete(quoteLogs)
          .where(eq(quoteLogs.quoteId, input));

        // Delete quote
        await database
          .delete(quotes)
          .where(eq(quotes.id, input));

        return { success: true };
      } catch (error) {
        console.error("[Quotes Delete Error]", error);
        throw new Error("Failed to delete quote");
      }
    }),
});

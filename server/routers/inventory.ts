import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { products } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import * as db from "../db";

/**
 * Inventory Management Router
 * Handles inventory tracking, stock adjustments, and reorder management
 * Uses Drizzle ORM with proper database access via getDb()
 */

const inventoryCreateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  unitCost: z.number().int().nonnegative(),
  warehouseLocation: z.string().optional(),
  notes: z.string().optional(),
});

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  quantityChange: z.number().int(),
  reason: z.enum(["adjustment", "damage", "loss", "recount", "return"]),
  notes: z.string().optional(),
});

export const inventoryRouter = router({
  /**
   * List all inventory items with product details
   */
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      // Get all products with their inventory data
      const inventories = await database
        .select()
        .from(products)
        .catch(() => []);

      return (inventories || []).map((item: any) => ({
        id: item.id,
        sku: item.sku,
        productName: item.name,
        category: item.category,
        quantity: item.stockQuantity || 0,
        reorderLevel: item.reorderPoint || 0,
        unitCost: item.unitPrice || 0,
        costPrice: item.costPrice || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    } catch (error) {
      console.error("Error fetching inventory:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch inventory",
      });
    }
  }),

  /**
   * Get single inventory item
   */
  getById: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        }

        const product: any = await database
          .select()
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1)
          .then((result) => result[0] || null)
          .catch(() => null);

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        return {
          id: product.id,
          sku: product.sku,
          productName: product.name,
          category: product.category,
          quantity: product.stockQuantity || 0,
          reorderLevel: product.reorderPoint || 0,
          unitCost: product.unitPrice || 0,
        };
      } catch (error) {
        console.error("Error fetching inventory:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch inventory",
        });
      }
    }),

  /**
   * Create or update inventory record
   */
  create: publicProcedure
    .input(inventoryCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const database = await getDb();
        if (!database) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        }

        // Update product with inventory data
        await database
          .update(products)
          .set({
            stockQuantity: input.quantity,
            reorderPoint: input.reorderLevel,
            unitPrice: input.unitCost,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19).split('T')[0],
          })
          .where(eq(products.id, input.productId));

        // Get updated product
        const updated: any = await database
          .select()
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1)
          .then((result) => result[0] || null)
          .catch(() => null);

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        // Log activity
        await db.logActivity({
          userId: ctx.user?.id || "system",
          action: "inventory_updated",
          description: `Updated inventory for product: ${updated.name}`,
          entityType: "product",
          entityId: input.productId,
        });

        return {
          success: true,
          productId: updated.id,
          message: "Inventory updated successfully",
        };
      } catch (error) {
        console.error("Error creating inventory:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create inventory",
        });
      }
    }),

  /**
   * Adjust stock quantity (increase or decrease)
   */
  adjustStock: publicProcedure
    .input(stockAdjustmentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const database = await getDb();
        if (!database) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        }

        // Get current product
        const product: any = await database
          .select()
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1)
          .then((result) => result[0] || null)
          .catch(() => null);

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        const newQuantity = Math.max(0, (product.stockQuantity || 0) + input.quantityChange);

        // Update product quantity
        await database
          .update(products)
          .set({
            stockQuantity: newQuantity,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19).split('T')[0],
          })
          .where(eq(products.id, input.productId));

        // Log stock movement
        await db.logActivity({
          userId: ctx.user?.id || "system",
          action: "stock_adjusted",
          description: `Stock adjusted by ${input.quantityChange} units (${input.reason})`,
          entityType: "product",
          entityId: input.productId,
        });

        return {
          success: true,
          productId: product.id,
          productName: product.name,
          oldQuantity: product.stockQuantity || 0,
          newQuantity,
          quantityChange: input.quantityChange,
          reason: input.reason,
          message: `Stock adjusted by ${input.quantityChange} units`,
        };
      } catch (error) {
        console.error("Error adjusting stock:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to adjust stock",
        });
      }
    }),

  /**
   * Get low stock items (below reorder level)
   */
  getLowStockItems: publicProcedure.query(async ({ ctx }) => {
    try {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const lowStockItems: any[] = await database
        .select()
        .from(products)
        .catch(() => []);

      return (lowStockItems || [])
        .filter((item: any) => (item.stockQuantity || 0) <= (item.reorderPoint || 0))
        .map((item: any) => ({
          id: item.id,
          sku: item.sku,
          productName: item.name,
          category: item.category,
          quantity: item.stockQuantity || 0,
          reorderLevel: item.reorderPoint || 0,
          toOrder: Math.max(0, (item.reorderPoint || 0) - (item.stockQuantity || 0)),
          unitCost: item.unitPrice || 0,
        }))
        .sort((a: any, b: any) => a.quantity - b.quantity);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      return [];
    }
  }),

  /**
   * Get inventory value report
   */
  getInventoryValue: publicProcedure.query(async ({ ctx }) => {
    try {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const productsData: any[] = await database
        .select()
        .from(products)
        .catch(() => []);

      const items = (productsData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.stockQuantity || 0,
        unitPrice: item.unitPrice || 0,
        totalValue: ((item.stockQuantity || 0) * (item.unitPrice || 0)) / 100,
        category: item.category,
      }));

      const totalValue = items.reduce((sum: number, item: any) => sum + item.totalValue, 0);
      const byCategory = items.reduce(
        (acc: any, item: any) => {
          acc[item.category] = (acc[item.category] || 0) + item.totalValue;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalValue,
        totalItems: items.length,
        byCategory,
        items,
      };
    } catch (error) {
      console.error("Error calculating inventory value:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate inventory value",
      });
    }
  }),

  /**
   * Bulk adjust stock from CSV import
   */
  bulkAdjust: publicProcedure
    .input(
      z.object({
        adjustments: z.array(
          z.object({
            productId: z.string(),
            quantityChange: z.number().int(),
            reason: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const database = await getDb();
        if (!database) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        }

        const results = [];

        for (const adjustment of input.adjustments) {
          try {
            const product: any = await database
              .select()
              .from(products)
              .where(eq(products.id, adjustment.productId))
              .limit(1)
              .then((result) => result[0] || null)
              .catch(() => null);

            if (!product) {
              results.push({
                productId: adjustment.productId,
                success: false,
                error: "Product not found",
              });
              continue;
            }

            const newQuantity = Math.max(0, (product.stockQuantity || 0) + adjustment.quantityChange);

            await database
              .update(products)
              .set({
                stockQuantity: newQuantity,
                updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19).split('T')[0],
              })
              .where(eq(products.id, adjustment.productId));

            results.push({
              productId: adjustment.productId,
              productName: product.name,
              success: true,
              oldQuantity: product.stockQuantity || 0,
              newQuantity,
            });
          } catch (error) {
            results.push({
              productId: adjustment.productId,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Log bulk activity
        await db.logActivity({
          userId: ctx.user?.id || "system",
          action: "inventory_bulk_adjusted",
          description: `Bulk adjusted ${results.filter((r) => r.success).length}/${input.adjustments.length} items`,
          entityType: "inventory",
          entityId: "bulk",
        });

        return {
          success: true,
          totalAdjustments: input.adjustments.length,
          successCount: results.filter((r) => r.success).length,
          results,
        };
      } catch (error) {
        console.error("Error bulk adjusting stock:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk adjust stock",
        });
      }
    }),
});

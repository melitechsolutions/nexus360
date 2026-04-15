import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { products } from "../../drizzle/schema";
import { eq, sql, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

// Feature-based procedures
const readProcedure = protectedProcedure;
const createProcedure = createFeatureRestrictedProcedure("products:create");
const updateProcedure = createFeatureRestrictedProcedure("products:edit");
const deleteProcedure = createFeatureRestrictedProcedure("products:delete");

export const productsRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const orgId = ctx.user.organizationId;
        let query: any;

        if (orgId && input?.category) {
          query = database.select().from(products).where(and(eq(products.organizationId, orgId), eq(products.category, input.category)));
        } else if (orgId) {
          query = database.select().from(products).where(eq(products.organizationId, orgId));
        } else if (input?.category) {
          query = database.select().from(products).where(eq(products.category, input.category));
        } else {
          query = database.select().from(products);
        }

        return await query.limit(input?.limit || 100).offset(input?.offset || 0);
      } catch (error) {
        console.error("Error fetching products list:", error);
        return [];
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;
      const orgId = ctx.user.organizationId;
      const conditions = orgId
        ? and(eq(products.id, input), eq(products.organizationId, orgId))
        : eq(products.id, input);
      const result = await database.select().from(products).where(conditions).limit(1);
      return result[0] || null;
    }),

  create: createProcedure
    .input(z.object({
      productName: z.string().min(1).max(255),
      description: z.string().optional(),
      sku: z.string().max(100).optional(),
      unitPrice: z.number().nonnegative(),
      costPrice: z.number().nonnegative().optional(),
      quantity: z.number().nonnegative().optional(),
      minStockLevel: z.number().nonnegative().optional(),
      maxStockLevel: z.number().nonnegative().optional(),
      reorderLevel: z.number().nonnegative().optional(),
      reorderQuantity: z.number().nonnegative().optional(),
      category: z.string().max(100).optional(),
      unit: z.string().max(50).optional(),
      taxRate: z.number().nonnegative().optional(),
      supplier: z.string().max(255).optional(),
      location: z.string().max(255).optional(),
      imageUrl: z.string().url().optional().or(z.literal("")),
      status: z.enum(['active', 'inactive']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Check for duplicate SKU if provided
      if (input.sku) {
        const existing = await database.select().from(products).where(eq(products.sku, input.sku)).limit(1);
        if (existing.length > 0) {
          throw new Error(`Product with SKU '${input.sku}' already exists`);
        }
      }

      const id = uuidv4();
      const unitPriceInCents = Math.round((input.unitPrice || 0) * 100);
      const costPriceInCents = input.costPrice ? Math.round(input.costPrice * 100) : null;
      
      await database.insert(products).values({
        id,
        organizationId: ctx.user.organizationId ?? null,
        name: input.productName,
        description: input.description || '',
        sku: input.sku,
        unitPrice: unitPriceInCents,
        costPrice: costPriceInCents ?? undefined,
        stockQuantity: input.quantity || 0,
        minStockLevel: input.minStockLevel || 0,
        maxStockLevel: input.maxStockLevel || undefined,
        reorderLevel: input.reorderLevel || undefined,
        reorderQuantity: input.reorderQuantity || undefined,
        category: input.category,
        unit: input.unit || 'pcs',
        taxRate: input.taxRate ? Math.round(input.taxRate * 100) : 0,
        supplier: input.supplier,
        location: input.location,
        imageUrl: input.imageUrl || undefined,
        isActive: input.status === 'inactive' ? 0 : 1,
        createdBy: ctx.user.id,
      } as any);

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "product_created",
        entityType: "product",
        entityId: id,
        description: `Created product: ${input.productName}`,
      });

      return { id };
    }),

  update: updateProcedure
    .input(z.object({
      id: z.string(),
      productName: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      sku: z.string().max(50).optional(),
      unitPrice: z.number().positive().optional(),
      quantity: z.number().nonnegative().optional(),
      category: z.string().max(100).optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const orgId = ctx.user.organizationId;
      const idCondition = orgId
        ? and(eq(products.id, input.id), eq(products.organizationId, orgId))
        : eq(products.id, input.id);
      const product = await database.select().from(products).where(idCondition).limit(1);
      if (!product.length) throw new Error("Product not found");

      // Check for duplicate SKU if changing it
      if (input.sku && input.sku !== product[0].sku) {
        const existing = await database.select().from(products).where(eq(products.sku, input.sku)).limit(1);
        if (existing.length > 0) {
          throw new Error(`Product with SKU '${input.sku}' already exists`);
        }
      }

      const updateData: any = {};
      if (input.productName) updateData.name = input.productName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.sku) updateData.sku = input.sku;
      if (input.unitPrice) updateData.unitPrice = Math.round(input.unitPrice * 100);
      if (input.quantity !== undefined) updateData.stockQuantity = input.quantity;
      if (input.category) updateData.category = input.category;
      if (input.status) updateData.isActive = input.status === 'inactive' ? 0 : 1;

      await database.update(products).set(updateData).where(idCondition);

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "product_updated",
        entityType: "product",
        entityId: input.id,
        description: `Updated product: ${product[0].name}`,
      });

      return { success: true };
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const orgId = ctx.user.organizationId;
      const idCondition = orgId
        ? and(eq(products.id, input), eq(products.organizationId, orgId))
        : eq(products.id, input);
      const product = await database.select().from(products).where(idCondition).limit(1);
      if (!product.length) throw new Error("Product not found");

      await database.delete(products).where(idCondition);

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "product_deleted",
        entityType: "product",
        entityId: input,
        description: `Deleted product: ${product[0].name}`,
      });

      return { success: true };
    }),

  getByCategory: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];
      const orgId = ctx.user.organizationId;
      const conditions = orgId
        ? and(eq(products.category, input), eq(products.organizationId, orgId))
        : eq(products.category, input);
      return await database.select().from(products).where(conditions);
    }),

  getActive: readProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];
      const orgId = ctx.user.organizationId;
      const conditions = orgId
        ? and(eq(products.isActive, 1), eq(products.organizationId, orgId))
        : eq(products.isActive, 1);
      return await database.select().from(products).where(conditions);
    }),

  getSummary: readProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) return {
        totalProducts: 0,
        activeProducts: 0,
        totalValue: 0,
        lowStockCount: 0,
      };

      const allProducts = await database.select().from(products);

      const totalValue = allProducts.reduce((sum, p) => sum + ((p.unitPrice || 0) * (p.stockQuantity || 0)), 0);
      const activeProducts = allProducts.filter(p => p.isActive === 1).length;
      const lowStockCount = allProducts.filter(p => (p.stockQuantity || 0) < 10).length;

      return {
        totalProducts: allProducts.length,
        activeProducts,
        totalValue,
        lowStockCount,
      };
    }),

  bulkDelete: deleteProcedure
    .input(z.array(z.string()).min(1))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        deleted: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const productId of input) {
        try {
          const product = await database.select().from(products).where(eq(products.id, productId)).limit(1);
          if (!product.length) {
            results.failed++;
            results.errors.push(`Product ${productId} not found`);
            continue;
          }

          await database.delete(products).where(eq(products.id, productId));
          results.deleted++;

          // Log activity
          await db.logActivity({
            userId: ctx.user.id,
            action: "product_deleted",
            entityType: "product",
            entityId: productId,
            description: `Bulk deleted product: ${product[0].name}`,
          });
        } catch (error) {
          results.failed++;
          results.errors.push(`Error deleting ${productId}: ${error}`);
        }
      }

      return results;
    }),

  // Get categories for dropdown
  getCategories: readProcedure
    .query(async () => {
      try {
        const database = await getDb();
        if (!database) return [];

        // Use a more efficient query - only select distinct categories
        // instead of loading all products into memory
        const result = await database.selectDistinct({ category: products.category })
          .from(products)
          .where(sql`${products.category} IS NOT NULL AND ${products.category} != ''`)
          .orderBy(products.category);
        
        return result.map(r => r.category).filter(Boolean) as string[];
      } catch (error) {
        console.error("Error fetching product categories:", error);
        return [];
      }
    }),
});
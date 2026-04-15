import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getPool } from "../db";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";

/** Execute raw SQL via mysql2 pool. Returns the rows array. */
async function rawQuery(query: string, params?: any[]): Promise<any[]> {
  const pool = getPool();
  if (!pool) throw new Error("Database pool not available");
  const [rows] = await pool.execute(query, params ?? []);
  return rows as any[];
}

// Feature-based procedures
const readProcedure = createFeatureRestrictedProcedure("procurement:read");
const writeProcedure = createFeatureRestrictedProcedure("procurement:write");

/**
 * Comprehensive Procurement Router
 * Handles LPOs, Purchase Orders, Imprests, and related operations
 * with full CRUD, status management, and approval workflows
 */

// ============================================================================
// SCHEMAS
// ============================================================================

const lpoCreateSchema = z.object({
  vendorName: z.string().min(1),
  vendorId: z.string().optional(),
  lpoNumber: z.string().optional(),
  description: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    amount: z.number().positive(),
  })),
  totalAmount: z.number().positive(),
  budgetLine: z.string().optional(),
  expectedDelivery: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
});

const orderCreateSchema = z.object({
  orderNumber: z.string().optional(),
  supplierId: z.string(),
  supplierName: z.string(),
  description: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    amount: z.number().positive(),
  })),
  totalAmount: z.number().positive(),
  deliveryAddress: z.string(),
  expectedDelivery: z.string().optional(),
  paymentTerms: z.string().optional(),
  status: z.enum(['draft', 'sent', 'confirmed', 'delivered', 'invoiced']).default('draft'),
});

const imprestCreateSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  purpose: z.string(),
  amount: z.number().positive(),
  justification: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  status: z.enum(['requested', 'approved', 'rejected', 'issued', 'surrendered']).default('requested'),
});

const budgetUpdateSchema = z.object({
  budgetName: z.string(),
  amount: z.number().positive(),
  departmentId: z.string(),
  fiscalYear: z.number(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'closed']).optional(),
});

// ============================================================================
// UTILITIES
// ============================================================================

async function generateLPONumber(): Promise<string> {
  try {
    const result = await rawQuery(
      `SELECT lpoNumber FROM lpos ORDER BY createdAt DESC LIMIT 1`
    );
    let seq = 0;
    if (result && result[0] && result[0].lpoNumber) {
      const match = result[0].lpoNumber.match(/(\d+)$/);
      if (match) seq = parseInt(match[1]);
    }
    return `LPO-${String(++seq).padStart(6, '0')}`;
  } catch (e) {
    return `LPO-${String(Date.now()).slice(-6)}`;
  }
}

async function generateOrderNumber(): Promise<string> {
  try {
    const result = await rawQuery(
      `SELECT orderNumber FROM purchase_orders ORDER BY createdAt DESC LIMIT 1`
    );
    let seq = 0;
    if (result && result[0] && result[0].orderNumber) {
      const match = result[0].orderNumber.match(/(\d+)$/);
      if (match) seq = parseInt(match[1]);
    }
    return `PO-${String(++seq).padStart(6, '0')}`;
  } catch (e) {
    return `PO-${String(Date.now()).slice(-6)}`;
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export const procurementRouter = router({
  // ====== LPO OPERATIONS ======

  lpoList: readProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      vendorId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input = {} }) => {
      try {
        let query = `SELECT * FROM lpos WHERE 1=1`;
        const params: any[] = [];
        
        if (input.search) {
          query += ` AND (lpoNumber LIKE ? OR vendorName LIKE ? OR description LIKE ?)`;
          const search = `%${input.search}%`;
          params.push(search, search, search);
        }
        if (input.status) {
          query += ` AND status = ?`;
          params.push(input.status);
        }
        if (input.vendorId) {
          query += ` AND vendorId = ?`;
          params.push(input.vendorId);
        }
        
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(input.limit, input.offset);
        
        return await rawQuery(query, params) || [];
      } catch (error) {
        console.error("LPO list error:", error);
        return [];
      }
    }),

  lpoGetById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const result = await rawQuery(
          `SELECT * FROM lpos WHERE id = ? LIMIT 1`,
          [input]
        );
        return result?.[0] || null;
      } catch (error) {
        console.error("LPO getById error:", error);
        return null;
      }
    }),

  lpoCreate: writeProcedure
    .input(lpoCreateSchema)
    .mutation(async ({ input, ctx }) => {
      
      try {
        const id = uuidv4();
        const lpoNumber = input.lpoNumber || await generateLPONumber();
        const now = new Date().toISOString();

        await rawQuery(
          `INSERT INTO lpos (id, lpoNumber, vendorName, vendorId, description, items, totalAmount, budgetLine, expectedDelivery, terms, status, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, lpoNumber, input.vendorName, input.vendorId || null, input.description,
            JSON.stringify(input.items), input.totalAmount, input.budgetLine || null,
            input.expectedDelivery || null, input.terms || null, input.status,
            ctx.user?.id || 'system', now, now
          ]
        );

        // Log activity
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'CREATE_LPO', 'LPO', id, `Created LPO ${lpoNumber}`, now]
        );

        return { id, lpoNumber, success: true };
      } catch (error) {
        console.error("LPO create error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create LPO" });
      }
    }),

  lpoUpdate: writeProcedure
    .input(z.object({
      id: z.string(),
      vendorName: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        amount: z.number().positive(),
      })).optional(),
      totalAmount: z.number().positive().optional(),
      status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
      expectedDelivery: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      
      try {
        const now = new Date().toISOString();
        const updates: any[] = [];
        const values: any[] = [];

        if (input.vendorName) { updates.push('vendorName = ?'); values.push(input.vendorName); }
        if (input.description) { updates.push('description = ?'); values.push(input.description); }
        if (input.items) { updates.push('items = ?'); values.push(JSON.stringify(input.items)); }
        if (input.totalAmount) { updates.push('totalAmount = ?'); values.push(input.totalAmount); }
        if (input.status) { updates.push('status = ?'); values.push(input.status); }
        if (input.expectedDelivery) { updates.push('expectedDelivery = ?'); values.push(input.expectedDelivery); }

        updates.push('updatedAt = ?');
        values.push(now);
        values.push(input.id);

        await rawQuery(
          `UPDATE lpos SET ${updates.join(', ')} WHERE id = ?`,
          values
        );

        // Log activity
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'UPDATE_LPO', 'LPO', input.id, `Updated LPO ${input.id}`, now]
        );

        return { success: true };
      } catch (error) {
        console.error("LPO update error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update LPO" });
      }
    }),

  lpoDelete: writeProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      
      try {
        const now = new Date().toISOString();
        await rawQuery(`DELETE FROM lpos WHERE id = ?`, [input]);
        
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'DELETE_LPO', 'LPO', input, `Deleted LPO`, now]
        );

        return { success: true };
      } catch (error) {
        console.error("LPO delete error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete LPO" });
      }
    }),

  // ====== PURCHASE ORDER OPERATIONS ======

  orderList: readProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      supplierId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input = {} }) => {
      try {
        let query = `SELECT * FROM purchase_orders WHERE 1=1`;
        const params: any[] = [];
        
        if (input.search) {
          query += ` AND (orderNumber LIKE ? OR supplierName LIKE ? OR description LIKE ?)`;
          const search = `%${input.search}%`;
          params.push(search, search, search);
        }
        if (input.status) {
          query += ` AND status = ?`;
          params.push(input.status);
        }
        if (input.supplierId) {
          query += ` AND supplierId = ?`;
          params.push(input.supplierId);
        }
        
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(input.limit, input.offset);
        
        return await rawQuery(query, params) || [];
      } catch (error) {
        console.error("Order list error:", error);
        return [];
      }
    }),

  orderGetById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const result = await rawQuery(
          `SELECT * FROM purchase_orders WHERE id = ? LIMIT 1`,
          [input]
        );
        return result?.[0] || null;
      } catch (error) {
        console.error("Order getById error:", error);
        return null;
      }
    }),

  orderCreate: writeProcedure
    .input(orderCreateSchema)
    .mutation(async ({ input, ctx }) => {
      
      try {
        const id = uuidv4();
        const orderNumber = input.orderNumber || await generateOrderNumber();
        const now = new Date().toISOString();

        await rawQuery(
          `INSERT INTO purchase_orders (id, orderNumber, supplierId, supplierName, description, items, totalAmount, deliveryAddress, expectedDelivery, paymentTerms, status, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, orderNumber, input.supplierId, input.supplierName, input.description,
            JSON.stringify(input.items), input.totalAmount, input.deliveryAddress,
            input.expectedDelivery || null, input.paymentTerms || null, input.status,
            ctx.user?.id || 'system', now, now
          ]
        );

        // Log activity
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'CREATE_ORDER', 'PurchaseOrder', id, `Created Order ${orderNumber}`, now]
        );

        return { id, orderNumber, success: true };
      } catch (error) {
        console.error("Order create error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create order" });
      }
    }),

  orderUpdate: writeProcedure
    .input(z.object({
      id: z.string(),
      supplierName: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        amount: z.number().positive(),
      })).optional(),
      totalAmount: z.number().positive().optional(),
      status: z.enum(['draft', 'sent', 'confirmed', 'delivered', 'invoiced']).optional(),
      expectedDelivery: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      
      try {
        const now = new Date().toISOString();
        const updates: any[] = [];
        const values: any[] = [];

        if (input.supplierName) { updates.push('supplierName = ?'); values.push(input.supplierName); }
        if (input.description) { updates.push('description = ?'); values.push(input.description); }
        if (input.items) { updates.push('items = ?'); values.push(JSON.stringify(input.items)); }
        if (input.totalAmount) { updates.push('totalAmount = ?'); values.push(input.totalAmount); }
        if (input.status) { updates.push('status = ?'); values.push(input.status); }
        if (input.expectedDelivery) { updates.push('expectedDelivery = ?'); values.push(input.expectedDelivery); }

        updates.push('updatedAt = ?');
        values.push(now);
        values.push(input.id);

        await rawQuery(
          `UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = ?`,
          values
        );

        // Log activity
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'UPDATE_ORDER', 'PurchaseOrder', input.id, `Updated Order`, now]
        );

        return { success: true };
      } catch (error) {
        console.error("Order update error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update order" });
      }
    }),

  orderDelete: writeProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      
      try {
        const now = new Date().toISOString();
        await rawQuery(`DELETE FROM purchase_orders WHERE id = ?`, [input]);
        
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'DELETE_ORDER', 'PurchaseOrder', input, `Deleted Order`, now]
        );

        return { success: true };
      } catch (error) {
        console.error("Order delete error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete order" });
      }
    }),

  // ====== IMPREST OPERATIONS ======

  imprestList: readProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      employeeId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input = {} }) => {
      try {
        let query = `SELECT * FROM imprests WHERE 1=1`;
        const params: any[] = [];
        
        if (input.search) {
          query += ` AND (imprestNumber LIKE ? OR employeeName LIKE ? OR purpose LIKE ?)`;
          const search = `%${input.search}%`;
          params.push(search, search, search);
        }
        if (input.status) {
          query += ` AND status = ?`;
          params.push(input.status);
        }
        if (input.employeeId) {
          query += ` AND employeeId = ?`;
          params.push(input.employeeId);
        }
        
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(input.limit, input.offset);
        
        return await rawQuery(query, params) || [];
      } catch (error) {
        console.error("Imprest list error:", error);
        return [];
      }
    }),

  imprestCreate: writeProcedure
    .input(imprestCreateSchema)
    .mutation(async ({ input, ctx }) => {
      
      try {
        const id = uuidv4();
        const now = new Date().toISOString();
        const imprestNumber = `IMP-${String(Date.now()).slice(-6)}`;

        await rawQuery(
          `INSERT INTO imprests (id, imprestNumber, employeeId, employeeName, purpose, amount, justification, expectedReturnDate, status, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, imprestNumber, input.employeeId, input.employeeName, input.purpose,
            input.amount, input.justification || null, input.expectedReturnDate || null,
            input.status, ctx.user?.id || 'system', now, now
          ]
        );

        // Log activity
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'CREATE_IMPREST', 'Imprest', id, `Created Imprest ${imprestNumber}`, now]
        );

        return { id, imprestNumber, success: true };
      } catch (error) {
        console.error("Imprest create error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create imprest" });
      }
    }),

  imprestUpdate: writeProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['requested', 'approved', 'rejected', 'issued', 'surrendered']).optional(),
      amount: z.number().positive().optional(),
      purpose: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      
      try {
        const now = new Date().toISOString();
        const updates: any[] = [];
        const values: any[] = [];

        if (input.status) { updates.push('status = ?'); values.push(input.status); }
        if (input.amount) { updates.push('amount = ?'); values.push(input.amount); }
        if (input.purpose) { updates.push('purpose = ?'); values.push(input.purpose); }

        updates.push('updatedAt = ?');
        values.push(now);
        values.push(input.id);

        await rawQuery(
          `UPDATE imprests SET ${updates.join(', ')} WHERE id = ?`,
          values
        );

        // Log activity
        await rawQuery(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), ctx.user?.id || 'system', 'UPDATE_IMPREST', 'Imprest', input.id, `Updated Imprest status to ${input.status}`, now]
        );

        return { success: true };
      } catch (error) {
        console.error("Imprest update error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update imprest" });
      }
    }),
});

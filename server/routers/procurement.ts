import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";

// Feature-based procedures
const readProcedure = createFeatureRestrictedProcedure("procurement:read");
const createProcedure = createFeatureRestrictedProcedure("procurement:create");
const updateProcedure = createFeatureRestrictedProcedure("procurement:edit");
const deleteProcedure = createFeatureRestrictedProcedure("procurement:delete");

// Define procurement request schema
const procurementRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["equipment", "supplies", "services", "materials"]),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  requiredDate: z.date().optional(),
  notes: z.string().optional(),
});

export const procurementRouter = router({
  list: readProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const orgId = ctx.user?.organizationId;
      if (!orgId) return [];

      try {
        const rows = await db.raw(`
          SELECT 
            id, name, description, category, quantity, price, 
            status, requiredDate, notes, createdAt, updatedAt, createdBy
          FROM procurement_requests
          WHERE organizationId = ?
          ORDER BY createdAt DESC
          LIMIT ? OFFSET ?
        `, [orgId, input?.limit || 50, input?.offset || 0]);
        
        return (rows || []).map((r: any) => ({
          ...r,
          createdAt: r.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
        }));
      } catch (err) {
        console.warn("Procurement query failed, returning empty", err);
        return [];
      }
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const orgId = ctx.user?.organizationId;
      if (!orgId) return null;

      try {
        const rows = await db.raw(
          `SELECT * FROM procurement_requests WHERE id = ? AND organizationId = ? LIMIT 1`,
          [input, orgId]
        );
        return (rows || [])[0] || null;
      } catch (err) {
        console.warn("Procurement getById failed", err);
        return null;
      }
    }),

  create: createProcedure
    .input(procurementRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const id = uuidv4();
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);

        const orgId = ctx.user?.organizationId;
        if (!orgId) throw new Error("Organization not found");

        await db.raw(
          `INSERT INTO procurement_requests 
          (id, name, description, category, quantity, price, status, requiredDate, notes, createdBy, organizationId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.name,
            input.description || null,
            input.category,
            input.quantity,
            input.price,
            "pending",
            input.requiredDate ? input.requiredDate.toISOString().split("T")[0] : null,
            input.notes || null,
            ctx.user?.id || "system",
            orgId,
            now,
            now,
          ]
        );

        // Log activity
        await db.raw(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            ctx.user?.id || "system",
            "create_procurement_request",
            "procurement_request",
            id,
            `Created procurement request: ${input.name}`,
            now,
          ]
        ).catch(() => {});

        return { id, success: true };
      } catch (err) {
        console.error("Procurement create error:", err);
        throw new Error("Failed to create procurement request");
      }
    }),

  update: updateProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "approved", "ordered", "delivered", "rejected"]).optional(),
      ...procurementRequestSchema.partial().shape,
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const { id, ...updateData } = input;
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);

        // Build update query dynamically
        const updateFields: string[] = [];
        const values: any[] = [];

        if (updateData.name) {
          updateFields.push("name = ?");
          values.push(updateData.name);
        }
        if (updateData.description !== undefined) {
          updateFields.push("description = ?");
          values.push(updateData.description);
        }
        if (updateData.status) {
          updateFields.push("status = ?");
          values.push(updateData.status);
        }
        if (updateData.quantity) {
          updateFields.push("quantity = ?");
          values.push(updateData.quantity);
        }
        if (updateData.price !== undefined) {
          updateFields.push("price = ?");
          values.push(updateData.price);
        }
        if (updateData.notes !== undefined) {
          updateFields.push("notes = ?");
          values.push(updateData.notes);
        }

        updateFields.push("updatedAt = ?");
        values.push(now);
        values.push(id);
        values.push(ctx.user?.organizationId);

        if (updateFields.length > 1) {
          await db.raw(
            `UPDATE procurement_requests SET ${updateFields.join(", ")} WHERE id = ? AND organizationId = ?`,
            values
          );

          // Log activity
          await db.raw(
            `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              ctx.user?.id || "system",
              "update_procurement_request",
              "procurement_request",
              id,
              `Updated procurement request: ${updateData.status ? `status changed to ${updateData.status}` : "details updated"}`,
              now,
            ]
          ).catch(() => {});
        }

        return { id, success: true };
      } catch (err) {
        console.error("Procurement update error:", err);
        throw new Error("Failed to update procurement request");
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);

        const orgId = ctx.user?.organizationId;
        if (!orgId) throw new Error("Organization not found");

        await db.raw(`DELETE FROM procurement_requests WHERE id = ? AND organizationId = ?`, [input, orgId]);

        // Log activity
        await db.raw(
          `INSERT INTO activity_logs (id, userId, action, entityType, entityId, description, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            ctx.user?.id || "system",
            "delete_procurement_request",
            "procurement_request",
            input,
            "Deleted procurement request",
            now,
          ]
        ).catch(() => {});

        return { success: true };
      } catch (err) {
        console.error("Procurement delete error:", err);
        throw new Error("Failed to delete procurement request");
      }
    }),

  getStats: readProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalRequests: 0, pendingCount: 0, totalSpend: 0, approvedCount: 0 };

      const orgId = ctx.user?.organizationId;
      if (!orgId) return { totalRequests: 0, pendingCount: 0, totalSpend: 0, approvedCount: 0 };

      try {
        const result = await db.raw(`
          SELECT 
            COUNT(*) as totalRequests,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
            SUM(CASE WHEN status = 'approved' THEN price * quantity ELSE 0 END) as totalSpend,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedCount
          FROM procurement_requests
          WHERE organizationId = ?
        `, [orgId]);

        const row = (result || [])[0] || {};
        return {
          totalRequests: row.totalRequests || 0,
          pendingCount: row.pendingCount || 0,
          totalSpend: row.totalSpend || 0,
          approvedCount: row.approvedCount || 0,
        };
      } catch (err) {
        console.warn("Stats query failed", err);
        return { totalRequests: 0, pendingCount: 0, totalSpend: 0, approvedCount: 0 };
      }
    }),
});

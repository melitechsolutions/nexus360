import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getPool, logActivity } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return p;
}

const readProc = createFeatureRestrictedProcedure("hr:view");
const writeProc = createFeatureRestrictedProcedure("hr:edit");

export const employeeContractsRouter = router({
  list: readProc
    .input(z.object({
      employeeId: z.string().optional(),
      status: z.string().optional(),
      contractType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const conds: string[] = [];
        const params: any[] = [];
        if (input?.employeeId) { conds.push("c.employeeId = ?"); params.push(input.employeeId); }
        if (input?.status) { conds.push("c.status = ?"); params.push(input.status); }
        if (input?.contractType) { conds.push("c.contractType = ?"); params.push(input.contractType); }
        const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
        const [rows] = await pool().query(
          `SELECT c.*, CONCAT(e.firstName, ' ', e.lastName) as employeeName
           FROM employeeContracts c
           LEFT JOIN employees e ON c.employeeId = e.id
           ${where} ORDER BY c.createdAt DESC`, params
        );
        return rows as any[];
      } catch (err) { console.error("employeeContracts.list error", err); return []; }
    }),

  getById: readProc.input(z.string()).query(async ({ input }) => {
    const [rows] = await pool().query(
      `SELECT c.*, CONCAT(e.firstName, ' ', e.lastName) as employeeName
       FROM employeeContracts c LEFT JOIN employees e ON c.employeeId = e.id
       WHERE c.id = ? LIMIT 1`, [input]
    );
    return (rows as any[])[0] || null;
  }),

  create: writeProc
    .input(z.object({
      employeeId: z.string(),
      contractType: z.enum(["permanent", "fixed_term", "probation", "casual", "internship"]),
      title: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      salary: z.number().optional(),
      currency: z.string().optional(),
      terms: z.string().optional(),
      renewalDate: z.string().optional(),
      noticePeriod: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = uuidv4();
      await pool().query(
        `INSERT INTO employeeContracts (id, employeeId, contractType, title, startDate, endDate, salary, currency, terms, renewalDate, noticePeriod, status, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [id, input.employeeId, input.contractType, input.title || null, input.startDate, input.endDate || null, input.salary || null, input.currency || 'KES', input.terms || null, input.renewalDate || null, input.noticePeriod || 30, ctx.user.id]
      );
      await logActivity({ userId: ctx.user.id, action: 'contract_created', entityType: 'employeeContract', entityId: id, description: `Created contract for employee ${input.employeeId}` });
      return { id };
    }),

  update: writeProc
    .input(z.object({
      id: z.string(),
      contractType: z.enum(["permanent", "fixed_term", "probation", "casual", "internship"]).optional(),
      title: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      salary: z.number().optional(),
      terms: z.string().optional(),
      renewalDate: z.string().optional(),
      noticePeriod: z.number().optional(),
      status: z.enum(["active", "expired", "terminated", "renewed", "pending"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sets: string[] = [];
      const params: any[] = [];
      if (input.contractType) { sets.push("contractType = ?"); params.push(input.contractType); }
      if (input.title !== undefined) { sets.push("title = ?"); params.push(input.title); }
      if (input.startDate) { sets.push("startDate = ?"); params.push(input.startDate); }
      if (input.endDate !== undefined) { sets.push("endDate = ?"); params.push(input.endDate || null); }
      if (input.salary !== undefined) { sets.push("salary = ?"); params.push(input.salary); }
      if (input.terms !== undefined) { sets.push("terms = ?"); params.push(input.terms); }
      if (input.renewalDate !== undefined) { sets.push("renewalDate = ?"); params.push(input.renewalDate || null); }
      if (input.noticePeriod !== undefined) { sets.push("noticePeriod = ?"); params.push(input.noticePeriod); }
      if (input.status) { sets.push("status = ?"); params.push(input.status); }
      if (!sets.length) return { success: true };
      params.push(input.id);
      await pool().query(`UPDATE employeeContracts SET ${sets.join(", ")} WHERE id = ?`, params);
      await logActivity({ userId: ctx.user.id, action: 'contract_updated', entityType: 'employeeContract', entityId: input.id, description: `Updated contract ${input.id}` });
      return { success: true };
    }),

  delete: writeProc.input(z.string()).mutation(async ({ input, ctx }) => {
    await pool().query(`DELETE FROM employeeContracts WHERE id = ?`, [input]);
    await logActivity({ userId: ctx.user.id, action: 'contract_deleted', entityType: 'employeeContract', entityId: input, description: `Deleted contract ${input}` });
    return { success: true };
  }),

  stats: readProc.query(async () => {
    try {
      const [rows] = await pool().query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN endDate IS NOT NULL AND endDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status = 'active' THEN 1 ELSE 0 END) as expiringSoon
        FROM employeeContracts
      `);
      const r = (rows as any[])[0];
      return { total: Number(r.total || 0), active: Number(r.active || 0), expired: Number(r.expired || 0), expiringSoon: Number(r.expiringSoon || 0) };
    } catch { return { total: 0, active: 0, expired: 0, expiringSoon: 0 }; }
  }),
});

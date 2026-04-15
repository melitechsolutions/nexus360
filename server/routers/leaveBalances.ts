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

export const leaveBalancesRouter = router({
  list: readProc
    .input(z.object({
      employeeId: z.string().optional(),
      year: z.number().optional(),
      leaveType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const conds: string[] = [];
        const params: any[] = [];
        const year = input?.year || new Date().getFullYear();
        conds.push("lb.year = ?");
        params.push(year);
        if (input?.employeeId) { conds.push("lb.employeeId = ?"); params.push(input.employeeId); }
        if (input?.leaveType) { conds.push("lb.leaveType = ?"); params.push(input.leaveType); }
        const where = `WHERE ${conds.join(" AND ")}`;
        const [rows] = await pool().query(
          `SELECT lb.*, CONCAT(e.firstName, ' ', e.lastName) as employeeName, e.department
           FROM leaveBalances lb
           LEFT JOIN employees e ON lb.employeeId = e.id
           ${where} ORDER BY e.firstName, lb.leaveType`, params
        );
        return rows as any[];
      } catch (err) { console.error("leaveBalances.list error", err); return []; }
    }),

  byEmployee: readProc
    .input(z.object({ employeeId: z.string(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();
      const [rows] = await pool().query(
        `SELECT * FROM leaveBalances WHERE employeeId = ? AND year = ? ORDER BY leaveType`, [input.employeeId, year]
      );
      return rows as any[];
    }),

  update: writeProc
    .input(z.object({
      id: z.string(),
      entitlement: z.number().optional(),
      used: z.number().optional(),
      pending: z.number().optional(),
      carriedOver: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sets: string[] = [];
      const params: any[] = [];
      if (input.entitlement !== undefined) { sets.push("entitlement = ?"); params.push(input.entitlement); }
      if (input.used !== undefined) { sets.push("used = ?"); params.push(input.used); }
      if (input.pending !== undefined) { sets.push("pending = ?"); params.push(input.pending); }
      if (input.carriedOver !== undefined) { sets.push("carriedOver = ?"); params.push(input.carriedOver); }
      if (!sets.length) return { success: true };
      params.push(input.id);
      await pool().query(`UPDATE leaveBalances SET ${sets.join(", ")} WHERE id = ?`, params);
      await logActivity({ userId: ctx.user.id, action: 'leave_balance_updated', entityType: 'leaveBalance', entityId: input.id, description: `Updated leave balance ${input.id}` });
      return { success: true };
    }),

  allocate: writeProc
    .input(z.object({
      employeeId: z.string(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "compassionate", "unpaid", "study"]),
      year: z.number(),
      entitlement: z.number(),
      carriedOver: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = uuidv4();
      await pool().query(
        `INSERT INTO leaveBalances (id, employeeId, leaveType, year, entitlement, carriedOver)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE entitlement = VALUES(entitlement), carriedOver = VALUES(carriedOver)`,
        [id, input.employeeId, input.leaveType, input.year, input.entitlement, input.carriedOver || 0]
      );
      await logActivity({ userId: ctx.user.id, action: 'leave_allocated', entityType: 'leaveBalance', entityId: id, description: `Allocated ${input.entitlement} days ${input.leaveType} leave for ${input.employeeId}` });
      return { id };
    }),

  summary: readProc
    .input(z.object({ year: z.number().optional() }).optional())
    .query(async ({ input }) => {
      try {
        const year = input?.year || new Date().getFullYear();
        const [rows] = await pool().query(`
          SELECT 
            leaveType,
            COUNT(DISTINCT employeeId) as employees,
            SUM(entitlement) as totalEntitlement,
            SUM(used) as totalUsed,
            SUM(pending) as totalPending,
            SUM(remaining) as totalRemaining
          FROM leaveBalances
          WHERE year = ?
          GROUP BY leaveType
        `, [year]);
        return rows as any[];
      } catch { return []; }
    }),
});

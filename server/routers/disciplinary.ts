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

export const disciplinaryRouter = router({
  list: readProc
    .input(z.object({
      employeeId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const conds: string[] = [];
        const params: any[] = [];
        if (input?.employeeId) { conds.push("d.employeeId = ?"); params.push(input.employeeId); }
        if (input?.type) { conds.push("d.type = ?"); params.push(input.type); }
        if (input?.status) { conds.push("d.status = ?"); params.push(input.status); }
        const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
        const [rows] = await pool().query(
          `SELECT d.*, CONCAT(e.firstName, ' ', e.lastName) as employeeName,
            CONCAT(i.firstName, ' ', i.lastName) as issuedByName
           FROM disciplinaryRecords d
           LEFT JOIN employees e ON d.employeeId = e.id
           LEFT JOIN employees i ON d.issuedBy = i.id
           ${where} ORDER BY d.incidentDate DESC`, params
        );
        return rows as any[];
      } catch (err) { console.error("disciplinary.list error", err); return []; }
    }),

  getById: readProc.input(z.string()).query(async ({ input }) => {
    const [rows] = await pool().query(
      `SELECT d.*, CONCAT(e.firstName, ' ', e.lastName) as employeeName
       FROM disciplinaryRecords d LEFT JOIN employees e ON d.employeeId = e.id
       WHERE d.id = ? LIMIT 1`, [input]
    );
    return (rows as any[])[0] || null;
  }),

  create: writeProc
    .input(z.object({
      employeeId: z.string(),
      type: z.enum(["verbal_warning", "written_warning", "final_warning", "suspension", "termination", "counseling"]),
      reason: z.string(),
      description: z.string().optional(),
      incidentDate: z.string(),
      actionTaken: z.string().optional(),
      followUpDate: z.string().optional(),
      witnessName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = uuidv4();
      await pool().query(
        `INSERT INTO disciplinaryRecords (id, employeeId, type, reason, description, incidentDate, actionTaken, followUpDate, witnessName, issuedBy, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
        [id, input.employeeId, input.type, input.reason, input.description || null, input.incidentDate, input.actionTaken || null, input.followUpDate || null, input.witnessName || null, ctx.user.id]
      );
      await logActivity({ userId: ctx.user.id, action: 'disciplinary_created', entityType: 'disciplinary', entityId: id, description: `Created ${input.type} for employee ${input.employeeId}` });
      return { id };
    }),

  update: writeProc
    .input(z.object({
      id: z.string(),
      type: z.enum(["verbal_warning", "written_warning", "final_warning", "suspension", "termination", "counseling"]).optional(),
      reason: z.string().optional(),
      description: z.string().optional(),
      actionTaken: z.string().optional(),
      followUpDate: z.string().optional(),
      outcome: z.string().optional(),
      status: z.enum(["open", "acknowledged", "resolved", "escalated", "appealed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sets: string[] = [];
      const params: any[] = [];
      if (input.type) { sets.push("type = ?"); params.push(input.type); }
      if (input.reason) { sets.push("reason = ?"); params.push(input.reason); }
      if (input.description !== undefined) { sets.push("description = ?"); params.push(input.description); }
      if (input.actionTaken !== undefined) { sets.push("actionTaken = ?"); params.push(input.actionTaken); }
      if (input.followUpDate !== undefined) { sets.push("followUpDate = ?"); params.push(input.followUpDate || null); }
      if (input.outcome !== undefined) { sets.push("outcome = ?"); params.push(input.outcome); }
      if (input.status) { sets.push("status = ?"); params.push(input.status); }
      if (!sets.length) return { success: true };
      params.push(input.id);
      await pool().query(`UPDATE disciplinaryRecords SET ${sets.join(", ")} WHERE id = ?`, params);
      await logActivity({ userId: ctx.user.id, action: 'disciplinary_updated', entityType: 'disciplinary', entityId: input.id, description: `Updated disciplinary record ${input.id}` });
      return { success: true };
    }),

  delete: writeProc.input(z.string()).mutation(async ({ input, ctx }) => {
    await pool().query(`DELETE FROM disciplinaryRecords WHERE id = ?`, [input]);
    await logActivity({ userId: ctx.user.id, action: 'disciplinary_deleted', entityType: 'disciplinary', entityId: input, description: `Deleted disciplinary record ${input}` });
    return { success: true };
  }),

  stats: readProc.query(async () => {
    try {
      const [rows] = await pool().query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN type = 'verbal_warning' THEN 1 ELSE 0 END) as verbalWarnings,
          SUM(CASE WHEN type = 'written_warning' THEN 1 ELSE 0 END) as writtenWarnings,
          SUM(CASE WHEN type = 'suspension' THEN 1 ELSE 0 END) as suspensions
        FROM disciplinaryRecords
      `);
      const r = (rows as any[])[0];
      return { total: Number(r.total || 0), open: Number(r.open || 0), resolved: Number(r.resolved || 0), verbalWarnings: Number(r.verbalWarnings || 0), writtenWarnings: Number(r.writtenWarnings || 0), suspensions: Number(r.suspensions || 0) };
    } catch { return { total: 0, open: 0, resolved: 0, verbalWarnings: 0, writtenWarnings: 0, suspensions: 0 }; }
  }),
});

/**
 * Payslip Generation Router
 * Generate, view, and send employee payslips
 */
import { router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return p;
}

const payrollView = createFeatureRestrictedProcedure("payroll:view");
const payrollWrite = createFeatureRestrictedProcedure("payroll:edit");

export const payslipRouter = router({
  list: payrollView
    .input(z.object({
      employeeId: z.string().optional(),
      payPeriod: z.string().optional(),
      status: z.enum(["draft", "generated", "sent", "viewed"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const p = pool();
      const orgId = ctx.user.organizationId;
      let query = `SELECT p.*, e.firstName, e.lastName, e.employeeNumber, e.department, e.position
        FROM payslips p
        LEFT JOIN employees e ON p.employeeId = e.id
        WHERE (p.organizationId = ? OR p.organizationId IS NULL)`;
      const params: any[] = [orgId];

      if (input?.employeeId) { query += ` AND p.employeeId = ?`; params.push(input.employeeId); }
      if (input?.payPeriod) { query += ` AND p.payPeriod = ?`; params.push(input.payPeriod); }
      if (input?.status) { query += ` AND p.status = ?`; params.push(input.status); }
      query += ` ORDER BY p.payDate DESC LIMIT ? OFFSET ?`;
      params.push(input?.limit || 50, input?.offset || 0);

      const [rows] = await p.query(query, params);
      return rows || [];
    }),

  getById: payrollView
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const p = pool();
      const [rows] = await p.query(
        `SELECT p.*, e.firstName, e.lastName, e.employeeNumber, e.department, e.position,
                e.bankName, e.bankBranch, e.bankAccountNumber, e.nhifNumber, e.nssfNumber, e.taxId
         FROM payslips p
         LEFT JOIN employees e ON p.employeeId = e.id
         WHERE p.id = ?`, [input.id]
      );
      return rows?.[0] || null;
    }),

  // Generate payslips for a payroll period
  generate: payrollWrite
    .input(z.object({
      payPeriod: z.string(), // e.g. "2026-04"
      payDate: z.string(),
      employeeIds: z.array(z.string()).optional(), // if empty, all active employees
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      const orgId = ctx.user.organizationId;

      // Get employees
      let empQuery = `SELECT * FROM employees WHERE status = 'active'`;
      const empParams: any[] = [];
      if (orgId) { empQuery += ` AND organizationId = ?`; empParams.push(orgId); }
      if (input.employeeIds?.length) {
        empQuery += ` AND id IN (${input.employeeIds.map(() => "?").join(",")})`;
        empParams.push(...input.employeeIds);
      }
      const [employees] = await p.query(empQuery, empParams);

      const generated: string[] = [];
      const errors: string[] = [];

      for (const emp of (employees || [])) {
        try {
          // Check if payslip already exists
          const [existing] = await p.query(
            `SELECT id FROM payslips WHERE employeeId = ? AND payPeriod = ?`, [emp.id, input.payPeriod]
          );
          if (existing?.length > 0) { errors.push(`Payslip already exists for ${emp.firstName} ${emp.lastName}`); continue; }

          const basicSalary = emp.salary || 0;

          // Get allowances
          const [allowances] = await p.query(
            `SELECT * FROM salaryAllowances WHERE employeeId = ? AND isActive = 1`, [emp.id]
          );
          let totalAllowances = 0;
          const allowancesBreakdown: any[] = [];
          for (const a of (allowances || [])) {
            const amount = a.amount || 0;
            totalAllowances += amount;
            allowancesBreakdown.push({ name: a.allowanceName || a.type, amount });
          }

          // Get deductions
          const [deductions] = await p.query(
            `SELECT * FROM salaryDeductions WHERE employeeId = ? AND isActive = 1`, [emp.id]
          );
          let customDeductions = 0;
          const deductionsBreakdown: any[] = [];
          for (const d of (deductions || [])) {
            const amount = d.amount || 0;
            customDeductions += amount;
            deductionsBreakdown.push({ name: d.deductionName || d.type, amount });
          }

          const grossPay = basicSalary + totalAllowances;

          // Kenyan statutory deductions
          const nssf = Math.min(grossPay * 0.06, 1080); // Tier 1
          const nhif = Math.min(grossPay * 0.025, 15000); // SHIF
          const housingLevy = Math.min(grossPay * 0.015, 15000);

          // PAYE calculation (progressive)
          const taxableIncome = grossPay - nssf;
          let paye = 0;
          if (taxableIncome > 32333) paye += (Math.min(taxableIncome, 57333) - 32333) * 0.25;
          if (taxableIncome > 57333) paye += (taxableIncome - 57333) * 0.30;
          if (taxableIncome <= 32333) paye += taxableIncome * 0.10;
          else paye += 32333 * 0.10;
          paye = Math.max(0, paye - 2400); // Personal relief

          deductionsBreakdown.push({ name: "PAYE", amount: Math.round(paye) });
          deductionsBreakdown.push({ name: "NSSF", amount: Math.round(nssf) });
          deductionsBreakdown.push({ name: "NHIF/SHIF", amount: Math.round(nhif) });
          deductionsBreakdown.push({ name: "Housing Levy", amount: Math.round(housingLevy) });

          const totalDeductions = Math.round(paye + nssf + nhif + housingLevy + customDeductions);
          const netPay = grossPay - totalDeductions;

          const id = uuidv4();
          await p.query(
            `INSERT INTO payslips (id, organizationId, employeeId, payPeriod, payDate, basicSalary, grossPay, totalAllowances, totalDeductions, netPay, paye, nhif, nssf, housingLevy, allowancesBreakdown, deductionsBreakdown, status, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?)`,
            [id, orgId, emp.id, input.payPeriod, input.payDate, basicSalary, grossPay, totalAllowances, totalDeductions, netPay, Math.round(paye), Math.round(nhif), Math.round(nssf), Math.round(housingLevy), JSON.stringify(allowancesBreakdown), JSON.stringify(deductionsBreakdown), ctx.user.id]
          );
          generated.push(id);
        } catch (err: any) {
          errors.push(`Error for ${emp.firstName} ${emp.lastName}: ${err.message}`);
        }
      }

      return { generated: generated.length, errors, payslipIds: generated };
    }),

  // Send payslips to employees via email
  sendPayslips: payrollWrite
    .input(z.object({
      payslipIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const p = pool();
      let sent = 0;
      const errors: string[] = [];

      for (const payslipId of input.payslipIds) {
        try {
          const [rows] = await p.query(
            `SELECT p.*, e.email, e.firstName, e.lastName FROM payslips p LEFT JOIN employees e ON p.employeeId = e.id WHERE p.id = ?`,
            [payslipId]
          );
          const payslip = rows?.[0];
          if (!payslip?.email) { errors.push(`No email for payslip ${payslipId}`); continue; }

          const { sendEmail } = await import("../_core/mail");
          const allowances = JSON.parse(payslip.allowancesBreakdown || "[]");
          const deductions = JSON.parse(payslip.deductionsBreakdown || "[]");

          await sendEmail({
            to: payslip.email,
            subject: `Payslip - ${payslip.payPeriod}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
                  <h2 style="margin: 0;">Payslip - ${payslip.payPeriod}</h2>
                  <p style="margin: 5px 0 0;">${payslip.firstName} ${payslip.lastName}</p>
                </div>
                <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Basic Salary</strong></td><td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb;">KES ${payslip.basicSalary?.toLocaleString()}</td></tr>
                    ${allowances.map((a: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #059669;">${a.name}</td><td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #059669;">+ KES ${a.amount?.toLocaleString()}</td></tr>`).join("")}
                    <tr style="background: #dcfce7;"><td style="padding: 8px; border-bottom: 2px solid #e5e7eb;"><strong>Gross Pay</strong></td><td style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb;"><strong>KES ${payslip.grossPay?.toLocaleString()}</strong></td></tr>
                    ${deductions.map((d: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${d.name}</td><td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">- KES ${d.amount?.toLocaleString()}</td></tr>`).join("")}
                    <tr style="background: #dbeafe;"><td style="padding: 12px; font-size: 16px;"><strong>Net Pay</strong></td><td style="text-align: right; padding: 12px; font-size: 16px;"><strong>KES ${payslip.netPay?.toLocaleString()}</strong></td></tr>
                  </table>
                </div>
                <div style="background: #f3f4f6; padding: 10px; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 12px;">
                  Pay Date: ${payslip.payDate} | This is a system-generated payslip.
                </div>
              </div>
            `,
          });

          await p.query(`UPDATE payslips SET status = 'sent', sentAt = NOW() WHERE id = ?`, [payslipId]);
          sent++;
        } catch (err: any) {
          errors.push(`Failed to send ${payslipId}: ${err.message}`);
        }
      }

      return { sent, errors, total: input.payslipIds.length };
    }),

  // Delete a payslip
  delete: payrollWrite
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query(`DELETE FROM payslips WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // Bulk generate for all active employees
  bulkGenerate: payrollWrite
    .input(z.object({
      payPeriod: z.string(),
      payDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Reuse the generate mutation logic without employeeIds = all employees
      const p = pool();
      const orgId = ctx.user.organizationId;
      const [countRows] = await p.query(
        `SELECT COUNT(*) as cnt FROM employees WHERE status = 'active' ${orgId ? 'AND organizationId = ?' : ''}`,
        orgId ? [orgId] : []
      );
      return { employeeCount: countRows?.[0]?.cnt || 0, message: "Use generate endpoint with no employeeIds to process all" };
    }),
});

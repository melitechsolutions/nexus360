import { z } from "zod";
import { router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../_core/trpc";
import { getPool } from "../db";
import { TRPCError } from "@trpc/server";

const hrViewProcedure = createFeatureRestrictedProcedure("hr:view");
const hrEditProcedure = createFeatureRestrictedProcedure("hr:edit");

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return p;
}

export const hrAutomationRouter = router({
  // ── Automation Dashboard Stats ─────────────────────────────────
  getStats: hrViewProcedure.query(async () => {
    const p = pool();

    // Count contracts expiring within 30 days
    const [expiringContracts] = await p.query(
      `SELECT COUNT(*) as count FROM employee_contracts
       WHERE status = 'active' AND end_date IS NOT NULL
       AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    // Count employees needing leave accrual
    const [pendingAccrual] = await p.query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM leave_balances
       WHERE YEAR(created_at) = YEAR(CURDATE())`
    );

    // Count pending payroll runs
    const [pendingPayroll] = await p.query(
      `SELECT COUNT(*) as count FROM payroll WHERE status = 'draft'`
    );

    // Count active automation rules
    const [automationRules] = await p.query(
      `SELECT COUNT(*) as count FROM hr_automation_rules WHERE is_active = 1`
    );

    return {
      expiringContracts: (expiringContracts as any[])[0]?.count || 0,
      pendingAccrual: (pendingAccrual as any[])[0]?.count || 0,
      pendingPayroll: (pendingPayroll as any[])[0]?.count || 0,
      activeRules: (automationRules as any[])[0]?.count || 0,
    };
  }),

  // ── Contract Expiry Alerts ─────────────────────────────────────
  getExpiringContracts: hrViewProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const p = pool();
      const [rows] = await p.query(
        `SELECT ec.*, e.first_name, e.last_name, e.email, e.department
         FROM employee_contracts ec
         LEFT JOIN employees e ON ec.employee_id = e.id
         WHERE ec.status = 'active' AND ec.end_date IS NOT NULL
         AND ec.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         ORDER BY ec.end_date ASC`,
        [input.days]
      );
      return rows as any[];
    }),

  // ── Leave Accrual ──────────────────────────────────────────────
  runLeaveAccrual: hrEditProcedure
    .input(z.object({
      leaveType: z.string().default("annual"),
      accrualDays: z.number().default(1.75), // ~21 days/year monthly
      year: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const year = input.year || new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      // Get all active employees
      const [employees] = await p.query(
        "SELECT id, first_name, last_name FROM employees WHERE status = 'active'"
      );

      let accrued = 0;
      for (const emp of employees as any[]) {
        // Check if already accrued this month
        const [existing] = await p.query(
          `SELECT id FROM leave_balances
           WHERE employee_id = ? AND leave_type = ? AND YEAR(created_at) = ?
           AND MONTH(created_at) = ?`,
          [emp.id, input.leaveType, year, month]
        );

        if ((existing as any[]).length === 0) {
          // Upsert leave balance
          const [balRow] = await p.query(
            `SELECT id, total_days, used_days FROM leave_balances
             WHERE employee_id = ? AND leave_type = ? AND YEAR(created_at) = YEAR(CURDATE())`,
            [emp.id, input.leaveType]
          );

          if ((balRow as any[]).length > 0) {
            const bal = (balRow as any[])[0];
            await p.query(
              "UPDATE leave_balances SET total_days = total_days + ? WHERE id = ?",
              [input.accrualDays, bal.id]
            );
          } else {
            const id = `lb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await p.query(
              `INSERT INTO leave_balances (id, employee_id, leave_type, total_days, used_days, year, created_at)
               VALUES (?, ?, ?, ?, 0, ?, NOW())`,
              [id, emp.id, input.leaveType, input.accrualDays, year]
            );
          }
          accrued++;
        }
      }

      return { success: true, accrued, message: `Leave accrual completed for ${accrued} employees` };
    }),

  // ── Auto Payroll Generation ────────────────────────────────────
  generatePayroll: hrEditProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const period = `${input.year}-${String(input.month).padStart(2, "0")}`;

      // Check if payroll already exists for this period
      const [existing] = await p.query(
        "SELECT id FROM payroll WHERE pay_period = ? LIMIT 1",
        [period]
      );
      if ((existing as any[]).length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Payroll for ${period} already exists` });
      }

      // Get all active employees with salary info
      const [employees] = await p.query(
        `SELECT e.id, e.first_name, e.last_name, e.email, e.department,
                COALESCE(e.basic_salary, 0) as basic_salary
         FROM employees e
         WHERE e.status = 'active' AND e.basic_salary > 0`
      );

      let generated = 0;
      for (const emp of employees as any[]) {
        const basic = parseFloat(emp.basic_salary) || 0;
        if (basic <= 0) continue;

        // Simple Kenyan payroll calc
        const nhif = basic <= 5999 ? 150 : basic <= 7999 ? 300 : basic <= 11999 ? 400 : basic <= 14999 ? 500 : basic <= 19999 ? 600 : basic <= 24999 ? 750 : basic <= 29999 ? 850 : basic <= 34999 ? 900 : basic <= 39999 ? 950 : basic <= 44999 ? 1000 : basic <= 49999 ? 1100 : basic <= 59999 ? 1200 : basic <= 69999 ? 1300 : basic <= 79999 ? 1400 : basic <= 89999 ? 1500 : basic <= 99999 ? 1600 : 1700;
        const nssf = Math.min(basic * 0.06, 1080);
        const housingLevy = basic * 0.015;
        const taxableIncome = basic - nssf;
        // Simplified PAYE
        let paye = 0;
        if (taxableIncome > 0) {
          if (taxableIncome <= 24000) paye = taxableIncome * 0.10;
          else if (taxableIncome <= 32333) paye = 2400 + (taxableIncome - 24000) * 0.25;
          else paye = 2400 + 2083.25 + (taxableIncome - 32333) * 0.30;
          paye = Math.max(0, paye - 2400); // Personal relief
        }

        const totalDeductions = nhif + nssf + housingLevy + paye;
        const netPay = basic - totalDeductions;

        const payrollId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await p.query(
          `INSERT INTO payroll (id, employee_id, pay_period, basic_salary, gross_salary, nhif, nssf, paye, housing_levy, total_deductions, net_salary, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())`,
          [payrollId, emp.id, period, basic, basic, nhif, nssf, paye, housingLevy, totalDeductions, netPay]
        );
        generated++;
      }

      return { success: true, generated, message: `Generated payroll for ${generated} employees for ${period}` };
    }),

  // ── Automation Rules CRUD ──────────────────────────────────────
  getRules: hrViewProcedure.query(async () => {
    const p = pool();
    const [rows] = await p.query(
      "SELECT * FROM hr_automation_rules ORDER BY created_at DESC"
    );
    return rows as any[];
  }),

  createRule: hrEditProcedure
    .input(z.object({
      name: z.string().max(200),
      type: z.enum(["leave_accrual", "contract_alert", "payroll_generation", "probation_alert", "birthday_reminder"]),
      schedule: z.string().max(100).default("monthly"), // monthly, weekly, daily
      config: z.string().max(2000).default("{}"),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await p.query(
        `INSERT INTO hr_automation_rules (id, name, type, schedule, config, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, input.name, input.type, input.schedule, input.config, input.isActive ? 1 : 0]
      );
      return { success: true, id };
    }),

  updateRule: hrEditProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().max(200).optional(),
      schedule: z.string().max(100).optional(),
      config: z.string().max(2000).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const p = pool();
      const sets: string[] = [];
      const vals: any[] = [];
      if (input.name !== undefined) { sets.push("name = ?"); vals.push(input.name); }
      if (input.schedule !== undefined) { sets.push("schedule = ?"); vals.push(input.schedule); }
      if (input.config !== undefined) { sets.push("config = ?"); vals.push(input.config); }
      if (input.isActive !== undefined) { sets.push("is_active = ?"); vals.push(input.isActive ? 1 : 0); }
      if (sets.length === 0) return { success: true };
      vals.push(input.id);
      await p.query(`UPDATE hr_automation_rules SET ${sets.join(", ")} WHERE id = ?`, vals);
      return { success: true };
    }),

  deleteRule: hrEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const p = pool();
      await p.query("DELETE FROM hr_automation_rules WHERE id = ?", [input.id]);
      return { success: true };
    }),

  // ── Automation Logs ────────────────────────────────────────────
  getLogs: hrViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const p = pool();
      const [rows] = await p.query(
        "SELECT * FROM hr_automation_logs ORDER BY executed_at DESC LIMIT ?",
        [input.limit]
      );
      return rows as any[];
    }),

  // ── Run All Active Automation ──────────────────────────────────
  runAutomation: hrEditProcedure.mutation(async () => {
    const p = pool();
    const [rules] = await p.query(
      "SELECT * FROM hr_automation_rules WHERE is_active = 1"
    );

    const results: any[] = [];
    for (const rule of rules as any[]) {
      const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        let result = "";
        const config = JSON.parse(rule.config || "{}");

        switch (rule.type) {
          case "contract_alert": {
            const days = config.days || 30;
            const [expiring] = await p.query(
              `SELECT COUNT(*) as count FROM employee_contracts
               WHERE status = 'active' AND end_date IS NOT NULL
               AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
              [days]
            );
            result = `Found ${(expiring as any[])[0]?.count || 0} contracts expiring within ${days} days`;
            break;
          }
          case "probation_alert": {
            const days = config.days || 90;
            const [probation] = await p.query(
              `SELECT COUNT(*) as count FROM employee_contracts
               WHERE contract_type = 'probation' AND status = 'active'
               AND start_date <= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
              [days]
            );
            result = `Found ${(probation as any[])[0]?.count || 0} employees completing probation`;
            break;
          }
          default:
            result = `Rule type '${rule.type}' executed`;
        }

        await p.query(
          `INSERT INTO hr_automation_logs (id, rule_id, rule_name, status, result, executed_at)
           VALUES (?, ?, ?, 'success', ?, NOW())`,
          [logId, rule.id, rule.name, result]
        );
        results.push({ ruleId: rule.id, status: "success", result });
      } catch (err: any) {
        await p.query(
          `INSERT INTO hr_automation_logs (id, rule_id, rule_name, status, result, executed_at)
           VALUES (?, ?, ?, 'error', ?, NOW())`,
          [logId, rule.id, rule.name, err.message || "Unknown error"]
        );
        results.push({ ruleId: rule.id, status: "error", result: err.message });
      }
    }

    return { success: true, results };
  }),
});

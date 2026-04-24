/**
 * Automated Payroll Processing Jobs
 * - 20th of every month at 08:00 EAT: process payroll for all active employees
 * - Last day of every month at 23:59 EAT: dispatch payslips to staff
 */
import { CronJob } from "cron";
import { getDb, getPool, createNotification } from "../db";
import { payroll, employees, users, budgets } from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { calculateKenyanPayroll } from "../utils/kenyan-payroll-calculator";
import { generatePayslipHTML } from "../utils/payslip-template";
import { deductFromBudget, findActiveBudget } from "../utils/budgetEnforcer";
import { sendEmailImmediately } from "../services/emailService";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return d.toISOString().replace("T", " ").substring(0, 19);
}

/** Last day of a given year/month */
function lastDay(year: number, month: number) {
  return new Date(year, month, 0); // day 0 = last day of previous month
}

/** Notify all users with a specific role in an org */
async function notifyByRole(
  db: any,
  orgId: string | null | undefined,
  roles: string[],
  notification: { title: string; message: string; actionUrl?: string; type?: string }
) {
  try {
    const cond = orgId
      ? and(eq(users.organizationId, orgId), inArray(users.role as any, roles))
      : inArray(users.role as any, roles);
    const targets = await db.select({ id: users.id, email: users.email, firstName: users.firstName }).from(users).where(cond);
    for (const u of targets) {
      await createNotification({
        userId: u.id,
        title: notification.title,
        message: notification.message,
        type: (notification.type || "info") as any,
        category: "payroll",
        entityType: "payroll_run",
        entityId: "",
        actionUrl: notification.actionUrl,
        priority: "high" as any,
      }).catch(console.warn);
    }
    return targets as { id: string; email: string; firstName: string }[];
  } catch (e) {
    console.warn("[PAYROLL] notifyByRole error:", e);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: Process Monthly Payroll
// ─────────────────────────────────────────────────────────────────────────────

export async function processMonthlyPayroll(
  targetYear?: number,
  targetMonth?: number,
  triggeredBy?: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  const db = await getDb();
  const pool = getPool();
  if (!db) {
    console.error("[PAYROLL-CRON] Database not available");
    return { processed: 0, skipped: 0, errors: ["Database not available"] };
  }

  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? now.getMonth() + 1; // 1-12
  const payPeriodLabel = `${year}-${String(month).padStart(2, "0")}`;
  const payPeriodStart = fmt(new Date(year, month - 1, 1));
  const payPeriodEnd = fmt(lastDay(year, month));
  const processedAt = fmt(now);

  console.log(`[PAYROLL-CRON] Processing payroll for ${payPeriodLabel}...`);

  // Fetch all active employees grouped by org
  const activeEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.status, "active"));

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];
  // Track total payroll cost per org for budget deduction
  const orgTotals = new Map<string, number>(); // orgId → total net salary (cents)

  for (const emp of activeEmployees) {
    try {
      // Skip if payroll already exists for this period
      const existing = await db
        .select({ id: payroll.id })
        .from(payroll)
        .where(
          and(
            eq(payroll.employeeId, emp.id),
            eq(payroll.payPeriodStart, payPeriodStart)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const basicSalaryCents = emp.salary ?? 0;
      if (basicSalaryCents === 0) {
        errors.push(`${emp.firstName} ${emp.lastName}: no salary configured`);
        skipped++;
        continue;
      }

      // Get allowances from DB if pool available
      let allowancesCents = 0;
      if (pool) {
        try {
          const [allRows] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total FROM salaryAllowances WHERE employeeId = ? AND isActive = 1`,
            [emp.id]
          );
          allowancesCents = (allRows as any[])[0]?.total ?? 0;
        } catch { /* ignore — allowances optional */ }
      }

      // Calculate Kenyan payroll deductions
      const calc = calculateKenyanPayroll({
        basicSalary: basicSalaryCents,
        allowances: allowancesCents,
      });

      const id = uuidv4();
      const totalDeductions =
        calc.nssfContribution + calc.payeeTax + calc.shifContribution + calc.housingLevyDeduction;

      await db.insert(payroll).values({
        id,
        employeeId: emp.id,
        payPeriodStart,
        payPeriodEnd,
        basicSalary: calc.basicSalary,
        allowances: allowancesCents,
        deductions: totalDeductions,
        tax: calc.payeeTax,
        netSalary: calc.netSalary,
        status: "processed",
        notes: JSON.stringify({
          grossSalary: calc.grossSalary,
          nssfTier1: calc.details.nssfTier1,
          nssfTier2: calc.details.nssfTier2,
          nssf: calc.nssfContribution,
          shif: calc.shifContribution,
          housingLevy: calc.housingLevyDeduction,
          personalRelief: calc.personalRelief,
          paye: calc.payeeTax,
          payPeriod: payPeriodLabel,
          processedBy: triggeredBy ?? "auto-cron",
          processedAt,
        }),
        createdBy: triggeredBy ?? "system",
        createdAt: processedAt,
        updatedAt: processedAt,
      } as any);

      // Track org total
      const orgId = emp.organizationId ?? "";
      orgTotals.set(orgId, (orgTotals.get(orgId) ?? 0) + calc.netSalary);

      processed++;
    } catch (err: any) {
      errors.push(`${emp.firstName} ${emp.lastName}: ${err?.message ?? err}`);
      console.error("[PAYROLL-CRON] Error processing employee payroll:", err);
    }
  }

  // ── Budget deduction for total payroll cost per org ──────────────────────
  for (const [orgId, totalCents] of orgTotals.entries()) {
    try {
      const budget = await findActiveBudget(db, orgId, undefined, String(year));
      if (budget) {
        await deductFromBudget(db, budget.id, totalCents);
        console.log(`[PAYROLL-CRON] Deducted ${totalCents / 100} from budget "${budget.budgetName}" for org ${orgId}`);
      }
    } catch (budgetErr: any) {
      console.warn(`[PAYROLL-CRON] Budget deduction failed for org ${orgId}:`, budgetErr?.message);
      errors.push(`Budget deduction: ${budgetErr?.message}`);
    }
  }

  // ── Notify admins + HR managers ──────────────────────────────────────────
  try {
    // Get one org to use for notifications (or broadcast to all)
    for (const [orgId] of orgTotals.entries()) {
      await notifyByRole(db, orgId, ["admin", "hr_manager", "hr", "superadmin"], {
        title: "✅ Monthly Payroll Processed",
        message: `Payroll for ${payPeriodLabel} has been automatically processed. ${processed} employees processed, ${skipped} skipped.`,
        actionUrl: "/payroll",
        type: "success",
      });
    }
    if (orgTotals.size === 0 && activeEmployees.length > 0) {
      // fallback — no org grouping
      await notifyByRole(db, undefined, ["admin", "hr_manager", "hr", "superadmin"], {
        title: "✅ Monthly Payroll Processed",
        message: `Payroll for ${payPeriodLabel} has been automatically processed. ${processed} employees processed.`,
        actionUrl: "/payroll",
        type: "success",
      });
    }
  } catch (notifyErr) {
    console.warn("[PAYROLL-CRON] Failed to send admin notifications:", notifyErr);
  }

  console.log(
    `[PAYROLL-CRON] ${payPeriodLabel} — processed: ${processed}, skipped: ${skipped}, errors: ${errors.length}`
  );
  return { processed, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: Dispatch Payslips (last day of month)
// ─────────────────────────────────────────────────────────────────────────────

export async function dispatchPayslips(
  targetYear?: number,
  targetMonth?: number
): Promise<{ dispatched: number; errors: string[] }> {
  const db = await getDb();
  const pool = getPool();
  if (!db) {
    console.error("[PAYROLL-CRON] Database not available for payslip dispatch");
    return { dispatched: 0, errors: ["Database not available"] };
  }

  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? now.getMonth() + 1;
  const payPeriodLabel = `${year}-${String(month).padStart(2, "0")}`;
  const payPeriodStart = fmt(new Date(year, month - 1, 1));

  console.log(`[PAYROLL-CRON] Dispatching payslips for ${payPeriodLabel}...`);

  // Get all processed payroll records for this period
  const payrollRecords = await db
    .select()
    .from(payroll)
    .where(eq(payroll.payPeriodStart, payPeriodStart));

  if (payrollRecords.length === 0) {
    console.log("[PAYROLL-CRON] No payroll records found for dispatch");
    return { dispatched: 0, errors: ["No payroll records found for this period"] };
  }

  const empIds = payrollRecords.map((r: any) => r.employeeId);
  const empData = await db.select().from(employees).where(inArray(employees.id, empIds));
  const empMap = new Map(empData.map((e: any) => [e.id, e]));

  // Get company info
  let companyName = "Nexus360";
  let companyAddress = "";
  let companyLogo = "";
  try {
    const [orgRows] = await (pool as any).query(`SELECT * FROM organizations LIMIT 1`);
    if ((orgRows as any[])?.[0]) {
      const org = (orgRows as any[])[0];
      companyName = org.name ?? companyName;
      companyAddress = org.address ?? "";
      companyLogo = org.logoUrl ?? "";
    }
  } catch { /* ignore */ }

  let dispatched = 0;
  const errors: string[] = [];

  for (const record of payrollRecords) {
    try {
      const emp = empMap.get((record as any).employeeId) as any;
      if (!emp) { errors.push(`Employee not found: ${(record as any).employeeId}`); continue; }

      // Parse details from notes JSON
      let details: any = {};
      try { details = JSON.parse((record as any).notes || "{}"); } catch { /* ignore */ }

      // Get employee allowances breakdown
      let allowancesBreakdown: Array<{ name: string; amount: number }> = [];
      if (pool) {
        try {
          const [allRows] = await (pool as any).query(
            `SELECT allowanceName, amount FROM salaryAllowances WHERE employeeId = ? AND isActive = 1`,
            [emp.id]
          );
          allowancesBreakdown = (allRows as any[]).map((a: any) => ({
            name: a.allowanceName,
            amount: a.amount,
          }));
        } catch { /* ignore */ }
      }

      // Build payslip data
      const payslipData = {
        payPeriod: payPeriodLabel,
        payDate: fmt(lastDay(year, month)),
        employee: {
          name: `${emp.firstName} ${emp.lastName}`,
          id: emp.employeeNumber,
          department: emp.department ?? "",
          position: emp.position ?? "",
          bankName: emp.bankName ?? "",
          bankAccount: emp.bankAccountNumber ?? "",
          nssfNumber: emp.nssfNumber ?? "",
          nhifNumber: emp.nhifNumber ?? "",
          taxPin: emp.taxId ?? "",
          nationalId: emp.nationalId ?? "",
        },
        company: { name: companyName, address: companyAddress, logo: companyLogo },
        earnings: {
          basicSalary: (record as any).basicSalary,
          allowances: allowancesBreakdown,
          grossSalary: details.grossSalary ?? ((record as any).basicSalary + (record as any).allowances),
        },
        deductions: {
          paye: details.paye ?? (record as any).tax ?? 0,
          nssf: details.nssf ?? 0,
          nssfTier1: details.nssfTier1 ?? 0,
          nssfTier2: details.nssfTier2 ?? 0,
          shif: details.shif ?? 0,
          housingLevy: details.housingLevy ?? 0,
          personalRelief: details.personalRelief ?? 0,
          total: (record as any).deductions ?? 0,
        },
        netSalary: (record as any).netSalary,
      };

      const htmlContent = generatePayslipHTML(payslipData);

      // Upsert payslip record in DB
      if (pool) {
        try {
          const [existing] = await (pool as any).query(
            `SELECT id FROM payslips WHERE employeeId = ? AND payPeriod = ?`,
            [emp.id, payPeriodLabel]
          );
          const payslipId = uuidv4();
          if ((existing as any[]).length === 0) {
            await (pool as any).query(
              `INSERT INTO payslips (id, employeeId, organizationId, payPeriod, payDate, basicSalary, grossSalary,
               allowances, deductions, taxAmount, netSalary, status, htmlContent, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, NOW(), NOW())`,
              [
                payslipId, emp.id, emp.organizationId, payPeriodLabel,
                fmt(lastDay(year, month)),
                (record as any).basicSalary,
                payslipData.earnings.grossSalary,
                (record as any).allowances,
                (record as any).deductions,
                (record as any).tax,
                (record as any).netSalary,
                htmlContent,
              ]
            );
          } else {
            await (pool as any).query(
              `UPDATE payslips SET htmlContent = ?, status = 'sent', updatedAt = NOW() WHERE employeeId = ? AND payPeriod = ?`,
              [htmlContent, emp.id, payPeriodLabel]
            );
          }
        } catch (dbErr: any) {
          console.warn("[PAYROLL-CRON] payslip DB upsert error:", dbErr?.message);
        }
      }

      // Send email payslip if employee has email
      if (emp.email) {
        try {
          await sendEmailImmediately({
            to: emp.email,
            subject: `Your Payslip for ${payPeriodLabel} — ${companyName}`,
            html: htmlContent,
          });
        } catch (emailErr: any) {
          console.warn(`[PAYROLL-CRON] Failed to email payslip to ${emp.email}:`, emailErr?.message);
        }
      }

      // Find user account linked to this employee and notify via dashboard
      try {
        let empUserId: string | null = emp.userId ?? null;
        if (!empUserId && emp.email && pool) {
          const [uRows] = await (pool as any).query(
            `SELECT id FROM users WHERE email = ? LIMIT 1`,
            [emp.email]
          );
          empUserId = (uRows as any[])[0]?.id ?? null;
        }
        if (empUserId) {
          await createNotification({
            userId: empUserId,
            title: `📄 Your Payslip for ${payPeriodLabel} is Ready`,
            message: `Your payslip for ${payPeriodLabel} has been issued. Net Pay: KES ${((record as any).netSalary / 100).toLocaleString()}. Click to view.`,
            type: "info" as any,
            category: "payslip",
            entityType: "payslip",
            entityId: payPeriodLabel,
            actionUrl: "/payslips",
            priority: "high" as any,
          }).catch(console.warn);
        }
      } catch (notifErr) {
        console.warn("[PAYROLL-CRON] Failed to notify employee:", notifErr);
      }

      dispatched++;
    } catch (err: any) {
      errors.push(`Payslip error for employee ${(record as any).employeeId}: ${err?.message}`);
      console.error("[PAYROLL-CRON] Payslip dispatch error:", err);
    }
  }

  // Notify HR + Admins that payslips have been dispatched
  try {
    const orgId = empData[0]?.organizationId;
    await notifyByRole(db, orgId, ["admin", "hr_manager", "hr", "superadmin"], {
      title: "📤 Payslips Dispatched",
      message: `${dispatched} payslips for ${payPeriodLabel} have been dispatched to staff.`,
      actionUrl: "/payslips",
      type: "success",
    });
  } catch { /* ignore */ }

  console.log(`[PAYROLL-CRON] Dispatched ${dispatched} payslips for ${payPeriodLabel}`);
  return { dispatched, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron Registration
// ─────────────────────────────────────────────────────────────────────────────

export function initializePayrollJobs() {
  // 20th of every month at 08:00 AM EAT — process payroll
  const payrollProcessingJob = new CronJob(
    "0 8 20 * *",
    async () => {
      console.log("[PAYROLL-CRON] Triggered monthly payroll processing (20th)...");
      await processMonthlyPayroll();
    },
    null,
    true,
    "Africa/Nairobi"
  );

  // Last day of every month at 23:59 EAT — dispatch payslips
  // "59 23 28-31 * *" — runs on 28-31 and checks internally whether it's the last day
  const payslipDispatchJob = new CronJob(
    "59 23 28-31 * *",
    async () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      // Only run on actual last day of month
      if (tomorrow.getDate() === 1) {
        console.log("[PAYROLL-CRON] Triggered payslip dispatch (last day of month)...");
        await dispatchPayslips();
      }
    },
    null,
    true,
    "Africa/Nairobi"
  );

  console.log("[PAYROLL-CRON] Payroll jobs registered: processing=20th, dispatch=last day");
  return { payrollProcessingJob, payslipDispatchJob };
}

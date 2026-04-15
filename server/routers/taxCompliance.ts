import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { payroll, employees } from "../../drizzle/schema";
import { sql, between } from "drizzle-orm";
import { calculateYTDTotals } from "../utils/kenyan-payroll-calculator";

// Define typed procedures
const readProcedure = createFeatureRestrictedProcedure("tax:read");

// Input type shared by most report procedures
const dateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
});

export const taxComplianceRouter = router({
  /**
   * Return PAYE withholdings aggregated by month (or per record if needed)
   */
  getPAYEReport: readProcedure
    .input(dateRangeSchema)
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      
      const { from, to, employeeId, departmentId } = input;
      const fromStr = typeof from === 'string' ? from : from.toISOString().slice(0, 10);
      const toStr = typeof to === 'string' ? to : to.toISOString().replace('T', ' ').substring(0, 19).slice(0, 10);
      
      try {
        const rows = await database
          .select({
            month: sql<string>`DATE_FORMAT(${payroll.date}, '%Y-%m')`,
            totalPayee: sql<number>`SUM(CAST(${payroll.payeeTax} AS DECIMAL(10,2)))`,
          })
          .from(payroll)
          .where(between(payroll.date, fromStr, toStr))
          .groupBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`);
        
        return rows;
      } catch (error) {
        console.error("PAYE Report error:", error);
        return [];
      }
    }),

  /**
   * NSSF contributions report
   */
  getNSSFReport: readProcedure
    .input(dateRangeSchema)
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      
      const { from, to } = input;
      const fromStr = typeof from === 'string' ? from : from.toISOString().slice(0, 10);
      const toStr = typeof to === 'string' ? to : to.toISOString().replace('T', ' ').substring(0, 19).slice(0, 10);

      try {
        const rows = await database
          .select({
            month: sql<string>`DATE_FORMAT(${payroll.date}, '%Y-%m')`,
            totalNSSF: sql<number>`SUM(CAST(${payroll.nssfContribution} AS DECIMAL(10,2)))`,
          })
          .from(payroll)
          .where(between(payroll.date, fromStr, toStr))
          .groupBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`);
        
        return rows;
      } catch (error) {
        console.error("NSSF Report error:", error);
        return [];
      }
    }),

  /**
   * SHIF contributions report
   */
  getSHIFReport: readProcedure
    .input(dateRangeSchema)
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      
      const { from, to, employeeId, departmentId } = input;
      const fromStr = typeof from === 'string' ? from : from.toISOString().slice(0, 10);
      const toStr = typeof to === 'string' ? to : to.toISOString().replace('T', ' ').substring(0, 19).slice(0, 10);
      
      try {
        const rows = await database
          .select({
            month: sql<string>`DATE_FORMAT(${payroll.date}, '%Y-%m')`,
            totalSHIF: sql<number>`SUM(CAST(${payroll.shifContribution} AS DECIMAL(10,2)))`,
          })
          .from(payroll)
          .where(between(payroll.date, fromStr, toStr))
          .groupBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`);
        
        return rows;
      } catch (error) {
        console.error("SHIF Report error:", error);
        return [];
      }
    }),

  /**
   * Housing levy report
   */
  getHousingLevyReport: readProcedure
    .input(dateRangeSchema)
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      
      const { from, to, employeeId, departmentId } = input;
      const fromStr = typeof from === 'string' ? from : from.toISOString().slice(0, 10);
      const toStr = typeof to === 'string' ? to : to.toISOString().replace('T', ' ').substring(0, 19).slice(0, 10);
      
      try {
        const rows = await database
          .select({
            month: sql<string>`DATE_FORMAT(${payroll.date}, '%Y-%m')`,
            totalHousing: sql<number>`SUM(CAST(${payroll.housingLevyDeduction} AS DECIMAL(10,2)))`,
          })
          .from(payroll)
          .where(between(payroll.date, fromStr, toStr))
          .groupBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${payroll.date}, '%Y-%m')`);
        
        return rows;
      } catch (error) {
        console.error("Housing Levy Report error:", error);
        return [];
      }
    }),

  /**
   * Export KRA filing format (simple CSV) - returns base64 string
   */
  getKRAFilingFormat: readProcedure
    .input(dateRangeSchema)
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return '';
      
      const { from, to } = input;
      const fromStr = typeof from === 'string' ? from : from.toISOString().slice(0, 10);
      const toStr = typeof to === 'string' ? to : to.toISOString().replace('T', ' ').substring(0, 19).slice(0, 10);
      
      try {
        const records = await database
          .select()
          .from(payroll)
          .where(between(payroll.date, fromStr, toStr))
          .orderBy(payroll.employeeId);

        // Create CSV lines
        const header = [
          "EmployeeID",
          "Name",
          "GrossSalary",
          "NSSF",
          "PAYE",
          "SHIF",
          "HousingLevy",
        ];
        const lines = [header.join(",")];
        
        for (const rec of records) {
          const emp = await database
            .select({ firstName: employees.firstName, lastName: employees.lastName })
            .from(employees)
            .where(sql`${employees.id} = ${rec.employeeId}`)
            .limit(1)
            .then((r: any[]) => r[0] || { firstName: "", lastName: "" });
          
          const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
          lines.push([
            rec.employeeId,
            name,
            rec.grossSalary,
            rec.nssfContribution,
            rec.payeeTax,
            rec.shifContribution,
            rec.housingLevyDeduction,
          ].join(","));
        }
        
        const csv = lines.join("\n");
        return Buffer.from(csv).toString("base64");
      } catch (error) {
        console.error("KRA Filing Format error:", error);
        return '';
      }
    }),

  /**
   * Year-to-date tax summary (leverages existing calculation utility)
   */
  getYearToDateSummary: createFeatureRestrictedProcedure("reporting:read")
    .input(z.object({ employeeId: z.string().optional() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return {};
      
      const { employeeId } = input;
      
      try {
        const payrolls = await database
          .select()
          .from(payroll)
          .where(employeeId ? sql`${payroll.employeeId} = ${employeeId}` : undefined);

        const calculations = payrolls.map((p: any) => ({
          grossSalary: p.grossSalary,
          nssfContribution: p.nssfContribution,
          payeeTax: p.payeeTax,
          shifContribution: p.shifContribution,
          housingLevyDeduction: p.housingLevyDeduction,
          netSalary: p.netSalary,
        }));

        const totals = calculateYTDTotals(calculations as any);
        return totals;
      } catch (error) {
        console.error("Year to Date Summary error:", error);
        return {};
      }
    }),
});

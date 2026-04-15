import { router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { employees, attendance, leaveRequests, payroll } from "../../drizzle/schema";
import { eq, gte, sql } from "drizzle-orm";

// Feature-based procedures
const hrReadProcedure = createFeatureRestrictedProcedure("hr:analytics");

export const hrAnalyticsRouter = router({
  /**
   * Get employee headcount trends over time
   */
  getHeadcountTrends: hrReadProcedure
    .input(z.object({
      months: z.number().default(12),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      try {
        const allEmployees = await database.select({
          hireDate: employees.hireDate,
          status: employees.status,
        }).from(employees);

        const numMonths = input?.months || 12;
        const now = new Date();
        const months: any[] = [];

        for (let i = numMonths - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          const headcount = allEmployees.filter((e: any) => {
            const hd = new Date(e.hireDate);
            return hd <= monthEnd;
          }).length;

          const newHires = allEmployees.filter((e: any) => {
            const hd = new Date(e.hireDate);
            return hd >= date && hd <= monthEnd;
          }).length;

          months.push({ month: monthKey, headcount, newHires });
        }

        return months;
      } catch (error: any) {
        console.error("Error fetching headcount trends:", error);
        return [];
      }
    }),

  /**
   * Get salary distribution by department
   */
  getSalaryDistribution: hrReadProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) return [];

      try {
        const allEmployees = await database.select({
          department: employees.department,
          salary: employees.salary,
        }).from(employees);

        // Group by department string
        const deptMap: Record<string, number[]> = {};
        for (const emp of allEmployees) {
          const dept = (emp.department as string) || "Unassigned";
          if (!deptMap[dept]) deptMap[dept] = [];
          if (emp.salary) deptMap[dept].push(emp.salary);
        }

        return Object.entries(deptMap).map(([dept, salaries]) => {
          const avg = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;
          return {
            department: dept,
            avgSalary: avg,
            minSalary: salaries.length > 0 ? Math.min(...salaries) : 0,
            maxSalary: salaries.length > 0 ? Math.max(...salaries) : 0,
            employeeCount: salaries.length,
          };
        });
      } catch (error: any) {
        console.error("Error fetching salary distribution:", error);
        return [];
      }
    }),

  /**
   * Get turnover analysis and trends
   */
  getTurnoverAnalysis: hrReadProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) return { totalEmployees: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0, turnoverRate: 0 };

      try {
        const allEmployees = await database.select({
          status: employees.status,
        }).from(employees);

        const total = allEmployees.length;
        const active = allEmployees.filter((e: any) => e.status === 'active').length;
        const onLeave = allEmployees.filter((e: any) => e.status === 'on_leave').length;
        const terminated = allEmployees.filter((e: any) => e.status === 'terminated').length;
        const suspended = allEmployees.filter((e: any) => e.status === 'suspended').length;

        return {
          totalEmployees: total,
          active,
          inactive: suspended,
          onLeave,
          terminated,
          turnoverRate: total > 0 ? (terminated / total) * 100 : 0,
        };
      } catch (error: any) {
        console.error("Error fetching turnover analysis:", error);
        return { totalEmployees: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0, turnoverRate: 0 };
      }
    }),

  /**
   * Get attendance patterns and KPIs
   */
  getAttendanceKPIs: hrReadProcedure
    .input(z.object({
      months: z.number().default(3),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return { present: 0, absent: 0, late: 0, halfDay: 0, total: 0, presentPercentage: 0, absentPercentage: 0, latePercentage: 0 };

      try {
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - (input?.months || 3));

        const attendanceRecords = await database.select({
          status: attendance.status,
        }).from(attendance).where(gte(attendance.attendanceDate, monthsAgo.toISOString().replace('T', ' ').substring(0, 19)));

        const total = attendanceRecords.length;
        const present = attendanceRecords.filter((a: any) => a.status === 'present').length;
        const absent = attendanceRecords.filter((a: any) => a.status === 'absent').length;
        const late = attendanceRecords.filter((a: any) => a.status === 'late').length;
        const halfDay = attendanceRecords.filter((a: any) => a.status === 'half_day').length;

        return {
          present,
          absent,
          late,
          halfDay,
          total,
          presentPercentage: total > 0 ? (present / total) * 100 : 0,
          absentPercentage: total > 0 ? (absent / total) * 100 : 0,
          latePercentage: total > 0 ? (late / total) * 100 : 0,
        };
      } catch (error: any) {
        console.error("Error fetching attendance KPIs:", error);
        return { present: 0, absent: 0, late: 0, halfDay: 0, total: 0, presentPercentage: 0, absentPercentage: 0, latePercentage: 0 };
      }
    }),

  /**
   * Get leave utilization statistics
   */
  getLeaveUtilization: hrReadProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) return [];

      try {
        const allLeaves = await database.select({
          leaveType: leaveRequests.leaveType,
          numberOfDays: leaveRequests.days,
          status: leaveRequests.status,
        }).from(leaveRequests).where(eq(leaveRequests.status, 'approved'));

        // Group by leave type
        const typeMap: Record<string, number[]> = {};
        for (const leave of allLeaves) {
          const type = (leave.leaveType as string) || "Unknown";
          if (!typeMap[type]) typeMap[type] = [];
          typeMap[type].push(leave.numberOfDays || 1);
        }

        return Object.entries(typeMap).map(([type, days]) => ({
          type,
          count: days.length,
          totalDays: days.reduce((a, b) => a + b, 0),
          avgDuration: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
        }));
      } catch (error: any) {
        console.error("Error fetching leave utilization:", error);
        return [];
      }
    }),

  /**
   * Get department-wise analytics
   */
  getDepartmentAnalytics: hrReadProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) return [];

      try {
        const allEmployees = await database.select({
          department: employees.department,
          salary: employees.salary,
        }).from(employees);

        const deptMap: Record<string, { salaries: number[] }> = {};
        for (const emp of allEmployees) {
          const dept = (emp.department as string) || "Unassigned";
          if (!deptMap[dept]) deptMap[dept] = { salaries: [] };
          if (emp.salary) deptMap[dept].salaries.push(emp.salary);
        }

        return Object.entries(deptMap).map(([name, data]) => ({
          id: name,
          name,
          employees: data.salaries.length,
          avgSalary: data.salaries.length > 0
            ? Math.round(data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length)
            : 0,
        }));
      } catch (error: any) {
        console.error("Error fetching department analytics:", error);
        return [];
      }
    }),

  /**
   * Get employee performance metrics
   */
  getPerformanceMetrics: hrReadProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) return { totalEmployees: 0, avgPresenceRate: 0, highPerformers: 0, needsImprovement: 0 };

      try {
        const [totalResult] = await database
          .select({ totalCount: sql<number>`count(${employees.id})` })
          .from(employees);

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const attendanceRecords = await database.select({
          status: attendance.status,
        }).from(attendance).where(gte(attendance.attendanceDate, lastMonth.toISOString().replace('T', ' ').substring(0, 19)));

        const totalRecords = attendanceRecords.length;
        const presentCount = attendanceRecords.filter((a: any) => a.status === 'present').length;
        const avgPresenceRate = totalRecords > 0 ? presentCount / totalRecords : 0;

        return {
          totalEmployees: totalResult?.totalCount || 0,
          avgPresenceRate,
          highPerformers: 0,
          needsImprovement: 0,
        };
      } catch (error: any) {
        console.error("Error fetching performance metrics:", error);
        return { totalEmployees: 0, avgPresenceRate: 0, highPerformers: 0, needsImprovement: 0 };
      }
    }),

  /**
   * Get salary expense trends
   */
  getSalaryExpenseTrends: hrReadProcedure
    .input(z.object({
      months: z.number().default(12),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      try {
        const allPayroll = await database.select({
          basicSalary: payroll.basicSalary,
          netSalary: payroll.netSalary,
          employeeId: payroll.employeeId,
          paymentDate: payroll.paymentDate,
          payPeriodStart: payroll.payPeriodStart,
        }).from(payroll);

        const numMonths = input?.months || 12;
        const now = new Date();
        const months: any[] = [];

        for (let i = numMonths - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          const monthRecords = allPayroll.filter((p: any) => {
            const pd = new Date(p.paymentDate || p.payPeriodStart);
            return pd >= date && pd <= monthEnd;
          });

          const totalCost = monthRecords.reduce((sum: number, p: any) => sum + (p.netSalary || p.basicSalary || 0), 0);
          const uniqueEmployees = new Set(monthRecords.map((p: any) => p.employeeId));

          months.push({ month: monthKey, totalCost, employeeCount: uniqueEmployees.size });
        }

        return months;
      } catch (error: any) {
        console.error("Error fetching salary expense trends:", error);
        return [];
      }
    }),
});

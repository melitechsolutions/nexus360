import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { payroll, employees } from "../../drizzle/schema";
import {
  salaryStructures,
  salaryAllowances,
  salaryDeductions,
  employeeBenefits,
  payrollDetails,
  payrollApprovals,
  employeeTaxInfo,
  salaryIncrements,
} from "../../drizzle/schema-extended";
import { eq, and, inArray } from "drizzle-orm";
import { getCompanyInfo } from "../utils/company-info";
import { v4 as uuidv4 } from "uuid";
import { generateP9Form, generateP9DataFromPayroll } from "../utils/p9-form-generator";

export const payrollRouter = router({
  // ===================== Main Payroll Management =====================
  list: createFeatureRestrictedProcedure("payroll:read")
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const rows = await db
          .select()
          .from(payroll)
          .limit(input?.limit || 50)
          .offset(input?.offset || 0);
        
        // fetch employee info for names/departments
        const empIds = rows.map((r: any) => r.employeeId);
        let empMap = new Map();
        if (empIds.length) {
          const empData = await db.select().from(employees).where(inArray(employees.id, empIds));
          empMap = new Map(empData.map((e: any) => [e.id, e]));
        }

        return rows.map((r: any) => {
          const emp = empMap.get(r.employeeId) || {};
          return {
            ...r,
            employeeName: emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : undefined,
            department: emp.department,
            month: (r as any).month || (r as any).payPeriodStart || null,
          };
        });
      } catch (error) {
        console.warn("Error fetching payroll records:", error);
        return [];
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const result = await db.select().from(payroll).where(eq(payroll.id, input)).limit(1);
        const row = result[0] || null;
        if (!row) return null;
        return {
          ...row,
          month: (row as any).month || (row as any).payPeriodStart || null,
        };
      } catch (error) {
        console.warn("Error fetching payroll by ID:", error);
        return null;
      }
    }),

  byEmployee: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const result = await db.select().from(payroll).where(eq(payroll.employeeId, input.employeeId));
        return result.map((r: any) => ({
          ...r,
          month: (r as any).month || (r as any).payPeriodStart || null,
        }));
      } catch (error) {
        console.warn("Error fetching payroll by employee:", error);
        return [];
      }
    }),

  create: createFeatureRestrictedProcedure("payroll:create")
    .input(z.object({
      employeeId: z.string(),
      // Accept `month` (YYYY-MM) from frontend for convenience
      month: z.union([z.string(), z.date()]).optional(),
      payPeriodStart: z.date().optional(),
      payPeriodEnd: z.date().optional(),
      notes: z.string().optional(),
      basicSalary: z.number(),
      allowances: z.number().optional(),
      deductions: z.number().optional(),
      tax: z.number().optional(),
      netSalary: z.number(),
      status: z.enum(["draft", "processed", "paid"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const id = uuidv4();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      // If month provided, map to first day of month for payPeriodStart
      let derivedStart: string | undefined = undefined;
      if (input.month) {
        try {
          if (input.month instanceof Date) {
            derivedStart = (input.month as Date).toISOString().replace('T', ' ').substring(0, 19);
          } else {
            derivedStart = new Date(`${input.month}-01`).toISOString().replace('T', ' ').substring(0, 19);
          }
        } catch (e) {
          derivedStart = undefined;
        }
      }

      const insertData: any = {
        ...input,
        payPeriodStart: input.payPeriodStart ? input.payPeriodStart.toISOString().replace('T', ' ').substring(0, 19) : derivedStart,
        payPeriodEnd: input.payPeriodEnd ? input.payPeriodEnd.toISOString().replace('T', ' ').substring(0, 19) : undefined,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(payroll).values({
        id,
        ...insertData,
      } as any);
      return { id };
    }),

  update: createFeatureRestrictedProcedure("payroll:edit")
    .input(z.object({
      id: z.string(),
      employeeId: z.string().optional(),
      // Allow updating via `month` as well (string YYYY-MM or Date)
      month: z.union([z.string(), z.date()]).optional(),
      payPeriodStart: z.date().optional(),
      payPeriodEnd: z.date().optional(),
      notes: z.string().optional(),
      basicSalary: z.number().optional(),
      allowances: z.number().optional(),
      deductions: z.number().optional(),
      tax: z.number().optional(),
      netSalary: z.number().optional(),
      status: z.enum(["draft", "processed", "paid"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      let derivedStart: string | undefined = undefined;
      if ((data as any).month) {
        try {
          if ((data as any).month instanceof Date) {
            derivedStart = ((data as any).month as Date).toISOString().replace('T', ' ').substring(0, 19);
          } else {
            derivedStart = new Date(`${(data as any).month}-01`).toISOString().replace('T', ' ').substring(0, 19);
          }
        } catch (e) {
          derivedStart = undefined;
        }
      }

      const updateData: any = {
        ...data,
        payPeriodStart: (data as any).payPeriodStart ? (data as any).payPeriodStart.toISOString().replace('T', ' ').substring(0, 19) : derivedStart || undefined,
        payPeriodEnd: (data as any).payPeriodEnd ? (data as any).payPeriodEnd.toISOString().replace('T', ' ').substring(0, 19) : undefined,
        updatedAt: now,
      };

      // remove frontend-only key
      delete updateData.month;

      await db.update(payroll).set(updateData as any).where(eq(payroll.id, id));
      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("payroll:delete")
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(payroll).where(eq(payroll.id, input));
      return { success: true };
    }),

  // bulk operations for payroll records (Tier 3)
  bulkUpdateStatus: createFeatureRestrictedProcedure("payroll:edit")
    .input(z.object({
      ids: z.array(z.string()),
      status: z.enum(["draft", "processed", "paid"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input.ids.length === 0) {
        return { success: true };
      }

      await db
        .update(payroll)
        .set({ status: input.status })
        .where(inArray(payroll.id, input.ids));
      return { success: true };
    }),

  bulkDelete: createFeatureRestrictedProcedure("payroll:delete")
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.ids.length === 0) return { success: true };
      await db.delete(payroll).where(inArray(payroll.id, input.ids));
      return { success: true };
    }),

  bulkExport: createFeatureRestrictedProcedure("payroll:read")
    .input(z.object({
      ids: z.array(z.string()),
      format: z.enum(["xlsx", "csv"]).default("xlsx"),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      let query = database
        .select()
        .from(payroll)
        .where(inArray(payroll.id, input.ids));

      const records: any[] = await (query as any);
      if (records.length === 0) {
        return { success: false, message: "No records selected" };
      }

      if (input.format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Payroll");
        worksheet.columns = [
          { header: "Employee ID", key: "employeeId", width: 20 },
          { header: "Payment Date", key: "paymentDate", width: 15 },
          { header: "Basic Salary", key: "basicSalary", width: 14 },
          { header: "Allowances", key: "allowances", width: 12 },
          { header: "Deductions", key: "deductions", width: 12 },
          { header: "Net Salary", key: "netSalary", width: 12 },
          { header: "Status", key: "status", width: 10 },
        ];
        records.forEach((r) => worksheet.addRow(r));
        const buffer = await workbook.xlsx.writeBuffer();
        return { data: buffer.toString("base64"), format: "xlsx" };
      } else {
        const headers = [
          "Employee ID",
          "Payment Date",
          "Basic Salary",
          "Allowances",
          "Deductions",
          "Net Salary",
          "Status",
        ];
        const rows = records.map((r) => [
          r.employeeId,
          r.paymentDate,
          r.basicSalary,
          r.allowances,
          r.deductions,
          r.netSalary,
          r.status,
        ]);
        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        return { data: csv, format: "csv" };
      }
    }),

  // ===================== Salary Structure Management =====================
  salaryStructures: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(salaryStructures);
      } catch (error) {
        console.warn("Error fetching salary structures:", error);
        return [];
      }
    }),

    byEmployee: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        try {
          return await db.select().from(salaryStructures).where(eq(salaryStructures.employeeId, input.employeeId));
        } catch (error) {
          console.warn("Error fetching salary structures for employee:", error);
          return [];
        }
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        employeeId: z.string(),
        basicSalary: z.number(),
        allowances: z.number().optional().default(0),
        deductions: z.number().optional().default(0),
        taxRate: z.number().optional().default(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.insert(salaryStructures).values({
          id,
          ...input,
          effectiveDate: now,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        } as any);

        return { id };
      }),

    update: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        basicSalary: z.number().optional(),
        allowances: z.number().optional(),
        deductions: z.number().optional(),
        taxRate: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.update(salaryStructures).set({
          ...data,
          updatedAt: now,
        } as any).where(eq(salaryStructures.id, id));

        return { success: true };
      }),

    delete: createFeatureRestrictedProcedure("payroll:delete")
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(salaryStructures).where(eq(salaryStructures.id, input));
        return { success: true };
      }),
  }),

  // ===================== Salary Allowances Management =====================
  allowances: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(salaryAllowances);
      } catch (error) {
        console.warn("Error fetching salary allowances:", error);
        return [];
      }
    }),

    byEmployee: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        try {
          return await db.select().from(salaryAllowances).where(eq(salaryAllowances.employeeId, input.employeeId));
        } catch (error) {
          console.warn("Error fetching salary allowances for employee:", error);
          return [];
        }
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        employeeId: z.string(),
        allowanceType: z.string(),
        amount: z.number(),
        frequency: z.enum(["monthly", "quarterly", "annual", "one_time"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.insert(salaryAllowances).values({
          id,
          ...input,
          effectiveDate: now,
          isActive: true,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        } as any);

        return { id };
      }),

    update: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        allowanceType: z.string().optional(),
        amount: z.number().optional(),
        frequency: z.enum(["monthly", "quarterly", "annual", "one_time"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.update(salaryAllowances).set({
          ...data,
          updatedAt: now,
        } as any).where(eq(salaryAllowances.id, id));

        return { success: true };
      }),

    delete: createFeatureRestrictedProcedure("payroll:delete")
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(salaryAllowances).where(eq(salaryAllowances.id, input));
        return { success: true };
      }),
  }),

  // ===================== Salary Deductions Management =====================
  deductions: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(salaryDeductions);
      } catch (error) {
        console.warn("Error fetching salary deductions:", error);
        return [];
      }
    }),

    byEmployee: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        try {
          return await db.select().from(salaryDeductions).where(eq(salaryDeductions.employeeId, input.employeeId));
        } catch (error) {
          console.warn("Error fetching salary deductions for employee:", error);
          return [];
        }
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        employeeId: z.string(),
        deductionType: z.string(),
        amount: z.number(),
        frequency: z.enum(["monthly", "quarterly", "annual", "one_time"]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.insert(salaryDeductions).values({
          id,
          ...input,
          effectiveDate: now,
          isActive: true,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        } as any);

        return { id };
      }),

    update: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        deductionType: z.string().optional(),
        amount: z.number().optional(),
        frequency: z.enum(["monthly", "quarterly", "annual", "one_time"]).optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.update(salaryDeductions).set({
          ...data,
          updatedAt: now,
        } as any).where(eq(salaryDeductions.id, id));

        return { success: true };
      }),

    delete: createFeatureRestrictedProcedure("payroll:delete")
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(salaryDeductions).where(eq(salaryDeductions.id, input));
        return { success: true };
      }),
  }),

  // ===================== Employee Benefits Management =====================
  benefits: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(employeeBenefits);
      } catch (error) {
        console.warn("Error fetching employee benefits:", error);
        return [];
      }
    }),

    byEmployee: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        try {
          return await db.select().from(employeeBenefits).where(eq(employeeBenefits.employeeId, input.employeeId));
        } catch (error) {
          console.warn("Error fetching employee benefits for employee:", error);
          return [];
        }
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        employeeId: z.string(),
        benefitType: z.string(),
        provider: z.string().optional(),
        coverage: z.string().optional(),
        cost: z.number().optional(),
        employerCost: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.insert(employeeBenefits).values({
          id,
          ...input,
          enrollDate: now,
          isActive: true,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        } as any);

        return { id };
      }),

    update: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        benefitType: z.string().optional(),
        provider: z.string().optional(),
        coverage: z.string().optional(),
        cost: z.number().optional(),
        employerCost: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.update(employeeBenefits).set({
          ...data,
          updatedAt: now,
        } as any).where(eq(employeeBenefits.id, id));

        return { success: true };
      }),

    delete: createFeatureRestrictedProcedure("payroll:delete")
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(employeeBenefits).where(eq(employeeBenefits.id, input));
        return { success: true };
      }),
  }),

  // ===================== Tax Information Management =====================
  taxInfo: router({
    byEmployee: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(employeeTaxInfo).where(eq(employeeTaxInfo.employeeId, input.employeeId));
        return result[0] || null;
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        employeeId: z.string(),
        taxNumber: z.string(),
        taxBracket: z.string().optional(),
        exemptions: z.number().optional().default(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.insert(employeeTaxInfo).values({
          id,
          ...input,
          effectiveDate: now,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        } as any);

        return { id };
      }),

    update: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        taxBracket: z.string().optional(),
        exemptions: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.update(employeeTaxInfo).set({
          ...data,
          updatedAt: now,
        } as any).where(eq(employeeTaxInfo.id, id));

        return { success: true };
      }),

    delete: createFeatureRestrictedProcedure("payroll:delete")
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(employeeTaxInfo).where(eq(employeeTaxInfo.id, input));
        return { success: true };
      }),
  }),

  // ===================== Salary Increment Management =====================
  increments: router({
    byEmployee: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(salaryIncrements).where(eq(salaryIncrements.employeeId, input.employeeId));
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        employeeId: z.string(),
        previousSalary: z.number(),
        newSalary: z.number(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        const previousSalary = input.previousSalary;
        const newSalary = input.newSalary;
        const incrementPercent = previousSalary > 0 ? ((newSalary - previousSalary) / previousSalary) * 10000 : 0;

        await db.insert(salaryIncrements).values({
          id,
          ...input,
          incrementPercent: Math.round(incrementPercent),
          effectiveDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          createdBy: ctx.user.id,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any);

        return { id };
      }),

    approve: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(salaryIncrements).set({
          approvedBy: ctx.user.id,
          approvalDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any).where(eq(salaryIncrements.id, input.id));

        return { success: true };
      }),

    update: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        previousSalary: z.number().optional(),
        newSalary: z.number().optional(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const updateData: any = { ...data };
        
        if (data.previousSalary && data.newSalary) {
          const incrementPercent = data.previousSalary > 0 ? ((data.newSalary - data.previousSalary) / data.previousSalary) * 10000 : 0;
          updateData.incrementPercent = Math.round(incrementPercent);
        }

        await db.update(salaryIncrements).set({
          ...updateData,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any).where(eq(salaryIncrements.id, id));

        return { success: true };
      }),

    delete: createFeatureRestrictedProcedure("payroll:delete")
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(salaryIncrements).where(eq(salaryIncrements.id, input));
        return { success: true };
      }),
  }),

  // ===================== Payroll Approval Workflow =====================
  approvals: router({
    list: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const params = input || {};
        const conditions: any[] = [];
        if (params.status) conditions.push(eq(payrollApprovals.status, params.status as any));
        const rows = await db.select().from(payrollApprovals).where(conditions.length ? and(...conditions) : undefined);
        // Join with payroll + employees for display names & salary info
        const payrollIds = [...new Set(rows.map(r => (r as any).payrollId))];
        if (payrollIds.length === 0) return [];
        const payrollRows = await db.select().from(payroll).where(inArray(payroll.id, payrollIds));
        const empIds = [...new Set(payrollRows.map(p => p.employeeId))];
        const empRows = empIds.length ? await db.select().from(employees).where(inArray(employees.id, empIds)) : [];
        const payrollMap = Object.fromEntries(payrollRows.map(p => [p.id, p]));
        const empMap = Object.fromEntries(empRows.map(e => [e.id, e]));
        return rows.map((r: any) => {
          const pr = payrollMap[r.payrollId];
          const emp = pr ? empMap[pr.employeeId] : null;
          return {
            ...r,
            employeeName: emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Unknown",
            basicSalary: pr?.basicSalary || 0,
            netSalary: pr?.netSalary || 0,
            payPeriodStart: pr?.payPeriodStart,
            payPeriodEnd: pr?.payPeriodEnd,
          };
        });
      }),

    byPayroll: createFeatureRestrictedProcedure("payroll:read")
      .input(z.object({ payrollId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(payrollApprovals).where(eq(payrollApprovals.payrollId, input.payrollId));
      }),

    create: createFeatureRestrictedProcedure("payroll:create")
      .input(z.object({
        payrollId: z.string(),
        approverRole: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const id = uuidv4();
        await db.insert(payrollApprovals).values({
          id,
          ...input,
          approverId: ctx.user.id,
          status: "pending",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any);

        return { id };
      }),

    approve: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(payrollApprovals).set({
          status: "approved",
          approvalDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any).where(eq(payrollApprovals.id, input.id));

        return { success: true };
      }),

    reject: createFeatureRestrictedProcedure("payroll:edit")
      .input(z.object({
        id: z.string(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(payrollApprovals).set({
          status: "rejected",
          rejectionReason: input.reason,
          approvalDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        } as any).where(eq(payrollApprovals.id, input.id));

        return { success: true };
      }),
  }),

  // ===================== Kenyan Payroll Calculation =====================
  kenyanCalculate: protectedProcedure
    .input(z.object({
      basicSalary: z.number(),
      allowances: z.number().optional().default(0),
      housingAllowance: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      // Import the Kenyan calculator
      const { calculateKenyanPayroll } = await import("../utils/kenyan-payroll-calculator");
      
      try {
        const result = calculateKenyanPayroll({
          basicSalary: input.basicSalary,
          allowances: input.allowances,
          housingAllowance: input.housingAllowance,
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to calculate payroll'
        });
      }
    }),

  // Save calculated Kenyan payroll
  saveKenyanPayroll: createFeatureRestrictedProcedure("payroll:create")
    .input(z.object({
      employeeId: z.string(),
      basicSalary: z.number(),
      allowances: z.number().optional().default(0),
      housingAllowance: z.number().optional().default(0),
      payPeriodStart: z.date(),
      payPeriodEnd: z.date(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Calculate payroll using Kenyan system
        const { calculateKenyanPayroll } = await import("../utils/kenyan-payroll-calculator");
        const calculation = calculateKenyanPayroll({
          basicSalary: input.basicSalary,
          allowances: input.allowances,
          housingAllowance: input.housingAllowance,
        });

        const payrollId = uuidv4();

        // Save main payroll record
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const periodStart = input.payPeriodStart.toISOString().replace('T', ' ').substring(0, 19);
        const periodEnd = input.payPeriodEnd.toISOString().replace('T', ' ').substring(0, 19);
        
        await db.insert(payroll).values({
          id: payrollId,
          employeeId: input.employeeId,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          status: "processed",
          basicSalary: calculation.basicSalary,
          allowances: input.allowances * 100,
          deductions: calculation.nssfContribution + calculation.payeeTax + calculation.shifContribution + calculation.housingLevyDeduction,
          tax: calculation.payeeTax,
          netSalary: calculation.netSalary,
          notes: input.notes || `Kenyan payroll: NSSF=${calculation.nssfContribution}, PAYE=${calculation.payeeTax}, SHIF=${calculation.shifContribution}, Housing=${calculation.housingLevyDeduction}`,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        } as any);

        // Save detailed breakdown as payroll details
        const components = [
          { type: 'allowance', name: 'Allowances', amount: input.allowances * 100 },
          { type: 'deduction', name: 'NSSF Tier 1', amount: calculation.details.nssfTier1 },
          { type: 'deduction', name: 'NSSF Tier 2', amount: calculation.details.nssfTier2 },
          { type: 'deduction', name: 'PAYE Tax', amount: calculation.payeeTax },
          { type: 'deduction', name: 'SHIF Contribution', amount: calculation.shifContribution },
          { type: 'deduction', name: 'Housing Levy', amount: calculation.housingLevyDeduction },
          { type: 'deduction', name: 'Personal Relief', amount: calculation.personalRelief },
        ];

        for (const comp of components) {
          if (comp.amount > 0) {
            await db.insert(payrollDetails).values({
              id: uuidv4(),
              payrollId,
              componentType: comp.type,
              component: comp.name,
              amount: comp.amount,
              notes: `${comp.name} deduction for ${periodStart.split(' ')[0]}`,
            } as any);
          }
        }

        return {
          id: payrollId,
          calculation,
          message: 'Kenyan payroll created successfully'
        };
      } catch (error) {
        console.error('Payroll save error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save payroll'
        });
      }
    }),

  // ===================== P9 Form Generation =====================
  // Generate and send KRA P9 form to employee
  generateP9: createFeatureRestrictedProcedure("payroll:read")
    .input(z.object({
      employeeId: z.string(),
      taxYear: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get employee
        const employee = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        if (!employee || employee.length === 0) {
          throw new Error("Employee not found");
        }

        const emp = employee[0];
        const taxYear = input.taxYear || new Date().getFullYear();

        // Get annual payroll summary for the employee
        const payrollRecords = await db.select().from(payroll)
          .where(and(
            eq(payroll.employeeId, input.employeeId),
          ));

        if (!payrollRecords || payrollRecords.length === 0) {
          throw new Error("No payroll records found for employee");
        }

        // Calculate annual totals
        let totalBasicSalary = 0;
        let totalAllowances = 0;
        let totalTax = 0;
        let totalNssf = 0;
        let totalShif = 0;
        let totalHousingLevy = 0;
        let totalNetSalary = 0;

        for (const record of payrollRecords) {
          totalBasicSalary += record.basicSalary || 0;
          totalAllowances += record.allowances || 0;
          totalTax += record.tax || 0;
          totalNssf += record.nssf || 0;
          totalShif += record.shif || 0;
          totalHousingLevy += record.housingLevy || 0;
          totalNetSalary += record.netSalary || 0;
        }

        const companyInfo = await getCompanyInfo();

        // Generate P9 data
        const p9Data = {
          employeeId: emp.employeeNumber || emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          nationalId: emp.nationalId || 'N/A',
          knRegNo: emp.taxId || '',
          grossSalary: totalBasicSalary + totalAllowances,
          paye: totalTax,
          nssf: totalNssf,
          shif: totalShif,
          housingLevy: totalHousingLevy,
          totalDeductions: totalTax + totalNssf + totalShif + totalHousingLevy,
          netIncome: totalNetSalary,
          taxYear,
          monthFrom: 1,
          monthTo: 12,
          companyName: companyInfo.name,
          companyKRAPin: companyInfo.kraPin || 'N/A',
          companyAddress: companyInfo.address || 'N/A',
          certificationDate: new Date(),
          certifiedBy: ctx.user.firstName ? `${ctx.user.firstName} ${ctx.user.lastName}` : 'HR Manager',
          certifiedByTitle: 'Human Resources Manager',
        };

        // Generate HTML form
        const htmlForm = generateP9Form(p9Data);

        return {
          success: true,
          data: {
            htmlContent: htmlForm,
            fileName: `P9-${emp.employeeNumber || emp.id}-${taxYear}.html`,
            employeeName: emp.firstName ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          },
        };
      } catch (error: any) {
        console.error('P9 form generation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate P9 form: ${error?.message || 'Unknown error'}`,
        });
      }
    }),

  // Download P9 form as PDF/HTML
  downloadP9: createFeatureRestrictedProcedure("payroll:read")
    .input(z.object({
      employeeId: z.string(),
      format: z.enum(['html', 'pdf']).optional().default('html'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // For now, we generate HTML. PDF generation would require additional library
        const result = await ctx.caller.payroll.generateP9({ employeeId: input.employeeId });
        
        if (!result.success) {
          throw new Error('Failed to generate P9');
        }

        return {
          success: true,
          data: result.data.htmlContent,
          fileName: result.data.fileName,
          mimeType: 'text/html',
        };
      } catch (error: any) {
        console.error('P9 download error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to download P9: ${error?.message || 'Unknown error'}`,
        });
      }
    }),

  // List and send P9 forms to multiple employees
  sendP9ToMultiple: createFeatureRestrictedProcedure("payroll:read")
    .input(z.object({
      employeeIds: z.array(z.string()),
      sendEmail: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const results = [];
        const errors = [];

        for (const employeeId of input.employeeIds) {
          try {
            const p9Result = await ctx.caller.payroll.generateP9({ employeeId });
            results.push({
              employeeId,
              success: true,
              fileName: p9Result.data?.fileName,
            });
          } catch (err: any) {
            errors.push({
              employeeId,
              success: false,
              error: err?.message || 'Unknown error',
            });
          }
        }

        return {
          success: errors.length === 0,
          generated: results.length,
          failed: errors.length,
          results,
          errors,
        };
      } catch (error: any) {
        console.error('Bulk P9 generation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate P9 forms: ${error?.message || 'Unknown error'}`,
        });
      }
    }),
});


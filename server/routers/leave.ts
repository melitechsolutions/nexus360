import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { leaveRequests, employees } from "../../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Define typed procedures
const readProcedure = protectedProcedure;

export const leaveRouter = router({
  list: readProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = (ctx as any).user?.organizationId;
      const leaves = orgId
        ? await db.select().from(leaveRequests).where(eq(leaveRequests.organizationId, orgId)).limit(input?.limit || 50).offset(input?.offset || 0)
        : await db.select().from(leaveRequests).limit(input?.limit || 50).offset(input?.offset || 0);

      // enrich with employee name/email if available
      const ids = leaves.map((l: any) => l.employeeId);
      if (ids.length === 0) return leaves;
      const employeesData = await db
        .select()
        .from(employees)
        .where(inArray(employees.id, ids));
      const empMap = new Map(employeesData.map((e: any) => [e.id, e]));

      return leaves.map((l: any) => {
        const emp = empMap.get(l.employeeId);
        return {
          ...l,
          employeeName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : undefined,
          employeeEmail: emp ? emp.email : undefined,
        };
      });
    }),

  getById: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = (ctx as any).user?.organizationId;
      const where = orgId ? and(eq(leaveRequests.id, input), eq(leaveRequests.organizationId, orgId)) : eq(leaveRequests.id, input);
      const result = await db.select().from(leaveRequests).where(where).limit(1);
      return result[0] || null;
    }),

  byEmployee: readProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = (ctx as any).user?.organizationId;
      const where = orgId ? and(eq(leaveRequests.employeeId, input.employeeId), eq(leaveRequests.organizationId, orgId)) : eq(leaveRequests.employeeId, input.employeeId);
      const result = await db.select().from(leaveRequests).where(where);
      return result;
    }),

  create: createFeatureRestrictedProcedure("leave:create")
    .input(z.object({
      employeeId: z.string(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "other"]),
      startDate: z.date(),
      endDate: z.date(),
      days: z.number().min(0, "Days must be zero or positive"),
      reason: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const id = uuidv4();
      const insertData: any = {
        ...input,
        startDate: input.startDate ? input.startDate.toISOString().replace('T', ' ').substring(0, 19) : undefined,
        endDate: input.endDate ? input.endDate.toISOString().replace('T', ' ').substring(0, 19) : undefined,
        approvalDate: (input as any).approvalDate ? (input as any).approvalDate.toISOString().replace('T', ' ').substring(0, 19) : undefined,
      };

      await db.insert(leaveRequests).values({
        id,
        ...insertData,
        organizationId: (ctx as any).user?.organizationId ?? null,
      });
      return { id };
    }),

  update: createFeatureRestrictedProcedure("leave:edit")
    .input(z.object({
      id: z.string(),
      employeeId: z.string().optional(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "other"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      days: z.number().min(0, "Days must be zero or positive").optional(),
      reason: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
      approvedBy: z.string().optional(),
      approvalDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const orgId = (ctx as any).user?.organizationId;
      const updateWhere = orgId ? and(eq(leaveRequests.id, id), eq(leaveRequests.organizationId, orgId)) : eq(leaveRequests.id, id);
      const updateData: any = {
        ...data,
        startDate: (data as any).startDate ? (data as any).startDate.toISOString().replace('T', ' ').substring(0, 19) : undefined,
        endDate: (data as any).endDate ? (data as any).endDate.toISOString().replace('T', ' ').substring(0, 19) : undefined,
        approvalDate: (data as any).approvalDate ? (data as any).approvalDate.toISOString().replace('T', ' ').substring(0, 19) : undefined,
      };

      await db.update(leaveRequests).set(updateData as any).where(updateWhere);
      return { success: true };
    }),

  delete: createFeatureRestrictedProcedure("leave:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const orgId = (ctx as any).user?.organizationId;
      const deleteWhere = orgId ? and(eq(leaveRequests.id, input), eq(leaveRequests.organizationId, orgId)) : eq(leaveRequests.id, input);
      await db.delete(leaveRequests).where(deleteWhere);
      return { success: true };
    }),

  byStatus: readProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = (ctx as any).user?.organizationId;
      const where = orgId ? and(eq(leaveRequests.status, input.status as any), eq(leaveRequests.organizationId, orgId)) : eq(leaveRequests.status, input.status as any);
      const result = await db.select().from(leaveRequests).where(where);
      return result;
    }),
});


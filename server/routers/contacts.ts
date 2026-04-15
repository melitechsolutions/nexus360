import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { contacts } from "../../drizzle/schema";
import { eq, desc, sql, like, or, inArray, and } from "drizzle-orm";

const viewProcedure = createFeatureRestrictedProcedure("crm:contacts:view");
const createProcedure = createFeatureRestrictedProcedure("crm:contacts:create");
const editProcedure = createFeatureRestrictedProcedure("crm:contacts:edit");
const deleteProcedure = createFeatureRestrictedProcedure("crm:contacts:delete");

export const contactsRouter = router({
  list: viewProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      clientId: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const conditions: any[] = [];
        const orgId = ctx.user.organizationId;
        if (orgId) conditions.push(eq(contacts.organizationId, orgId));
        if (input?.clientId) conditions.push(eq(contacts.clientId, input.clientId));
        if (input?.search) {
          conditions.push(
            or(
              like(contacts.firstName, `%${input.search}%`),
              like(contacts.lastName, `%${input.search}%`),
              like(contacts.email, `%${input.search}%`),
            )
          );
        }

        const whereClause = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

        const all = await db.select().from(contacts)
          .where(whereClause)
          .orderBy(desc(contacts.createdAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0);

        const countResult = await db.select({ count: sql<number>`count(*)` }).from(contacts)
          .where(whereClause);

        return { data: all, total: countResult[0]?.count || 0 };
      } catch (error) {
        console.error("Error listing contacts:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch contacts" });
      }
    }),

  getById: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const conditions = orgId
          ? and(eq(contacts.id, input), eq(contacts.organizationId, orgId))
          : eq(contacts.id, input);
        const result = await db.select().from(contacts).where(conditions);
        if (!result.length) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch contact" });
      }
    }),

  getByClient: viewProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const conditions = orgId
          ? and(eq(contacts.clientId, input), eq(contacts.organizationId, orgId))
          : eq(contacts.clientId, input);
        const result = await db.select().from(contacts)
          .where(conditions)
          .orderBy(desc(contacts.isPrimary), desc(contacts.createdAt));
        return result;
      } catch (error) {
        console.error("Error fetching contacts for client:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch contacts" });
      }
    }),

  create: createProcedure
    .input(z.object({
      clientId: z.string().optional(),
      salutation: z.string().optional(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      jobTitle: z.string().optional(),
      department: z.string().optional(),
      isPrimary: z.boolean().optional(),
      notes: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      linkedIn: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const id = uuidv4();
        await db.insert(contacts).values({
          id,
          organizationId: ctx.user?.organizationId ?? null,
          clientId: input.clientId || null,
          salutation: input.salutation || null,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || null,
          phone: input.phone || null,
          mobile: input.mobile || null,
          jobTitle: input.jobTitle || null,
          department: input.department || null,
          isPrimary: input.isPrimary ? 1 : 0,
          notes: input.notes || null,
          address: input.address || null,
          city: input.city || null,
          country: input.country || null,
          postalCode: input.postalCode || null,
          linkedIn: input.linkedIn || null,
          createdBy: ctx.user?.id || "",
        });
        const created = await db.select().from(contacts).where(eq(contacts.id, id));
        return created[0] || { id, ...input };
      } catch (error) {
        console.error("Error creating contact:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create contact" });
      }
    }),

  update: editProcedure
    .input(z.object({
      id: z.string(),
      clientId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      jobTitle: z.string().optional(),
      department: z.string().optional(),
      isPrimary: z.boolean().optional(),
      notes: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      salutation: z.string().optional(),
      postalCode: z.string().optional(),
      linkedIn: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const idCondition = orgId
          ? and(eq(contacts.id, input.id), eq(contacts.organizationId, orgId))
          : eq(contacts.id, input.id);
        const existing = await db.select().from(contacts).where(idCondition);
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });

        const { id, isPrimary, ...rest } = input;
        const setObj: any = {};
        for (const [key, val] of Object.entries(rest)) {
          if (val !== undefined) setObj[key] = val;
        }
        if (isPrimary !== undefined) setObj.isPrimary = isPrimary ? 1 : 0;

        await db.update(contacts).set(setObj).where(eq(contacts.id, id));
        const updated = await db.select().from(contacts).where(eq(contacts.id, id));
        return updated[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update contact" });
      }
    }),

  delete: deleteProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      try {
        const orgId = ctx.user.organizationId;
        const idCondition = orgId
          ? and(eq(contacts.id, input), eq(contacts.organizationId, orgId))
          : eq(contacts.id, input);
        const existing = await db.select().from(contacts).where(idCondition);
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
        await db.delete(contacts).where(idCondition);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete contact" });
      }
    }),

  bulkDelete: deleteProcedure
    .input(z.array(z.string()).min(1))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const orgId = ctx.user.organizationId;
      const conditions = orgId
        ? and(inArray(contacts.id, input), eq(contacts.organizationId, orgId))
        : inArray(contacts.id, input);
      await db.delete(contacts).where(conditions);
      return { success: true, count: input.length };
    }),
});

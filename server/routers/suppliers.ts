import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { suppliers, supplierRatings, supplierAudits } from "../../drizzle/schema-extended";
import { contacts } from "../../drizzle/schema";
import { eq, and, or, desc, like } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate next supplier number (SUP-XXXX)
 */
async function getNextSupplierNumber(database: any): Promise<string> {
  try {
    const lastSupplier = await database
      .select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt))
      .limit(1);

    if (!lastSupplier.length) {
      return "SUP-0001";
    }

    const lastNumber = lastSupplier[0].supplierNumber;
    const match = lastNumber?.match(/SUP-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `SUP-${String(num).padStart(4, "0")}`;
    }
    return "SUP-0001";
  } catch {
    return "SUP-0001";
  }
}

export const suppliersRouter = router({
  // Get all suppliers with filters
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional(),
          offset: z.number().optional(),
          status: z.enum(["pending", "pre_qualified", "qualified", "rejected", "inactive"]).optional(),
          search: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const limit = input?.limit || 50;
        const offset = input?.offset || 0;
        const orgId = ctx.user.organizationId;

        let query = database.select().from(suppliers);

        // Apply filters
        const conditions = [];
        
        if (orgId) {
          conditions.push(eq(suppliers.organizationId, orgId));
        }

        if (input?.status) {
          conditions.push(eq(suppliers.qualificationStatus, input.status));
        }

        if (typeof input?.isActive === "boolean") {
          conditions.push(eq(suppliers.isActive, input.isActive));
        }

        if (input?.search) {
          conditions.push(
            or(
              like(suppliers.companyName, `%${input.search}%`),
              like(suppliers.email, `%${input.search}%`),
              like(suppliers.phone, `%${input.search}%`)
            )
          );
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const results = await query.limit(limit).offset(offset);
        return results;
      } catch (error) {
        console.error("[Suppliers List Error]", error);
        return [];
      }
    }),

  // Get supplier by ID
  getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
    try {
      const database = await getDb();
      if (!database) return null;

      const orgId = ctx.user.organizationId;
      const where = orgId ? and(eq(suppliers.id, input), eq(suppliers.organizationId, orgId)) : eq(suppliers.id, input);
      const result = await database.select().from(suppliers).where(where).limit(1);

      if (!result.length) return null;

      const supplier = result[0];

      // Get ratings for this supplier
      const ratings = await database
        .select()
        .from(supplierRatings)
        .where(eq(supplierRatings.supplierId, input));

      // Parse JSON fields
      return {
        ...supplier,
        paymentMethods: supplier.paymentMethods ? JSON.parse(supplier.paymentMethods) : [],
        categories: supplier.categories ? JSON.parse(supplier.categories) : [],
        certifications: supplier.certifications ? JSON.parse(supplier.certifications) : [],
        ratings: ratings || [],
      };
    } catch (error) {
      console.error("[Suppliers GetById Error]", error);
      return null;
    }
  }),

  // Create new supplier
  create: createFeatureRestrictedProcedure("suppliers:create")
    .input(
      z.object({
        companyName: z.string().min(1),
        registrationNumber: z.string().optional(),
        taxId: z.string().optional(),
        contactPerson: z.string().optional(),
        contactTitle: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        alternatePhone: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        bankName: z.string().optional(),
        bankBranch: z.string().optional(),
        accountNumber: z.string().optional(),
        accountName: z.string().optional(),
        paymentTerms: z.string().optional(),
        paymentMethods: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        certifications: z.array(z.string()).optional(),
        qualificationStatus: z.enum(["pending", "pre_qualified", "qualified", "rejected", "inactive"]).default("pending"),
        qualificationDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user has admin or procurement role
        if (!["super_admin", "admin", "finance", "procurement"].includes(ctx.user?.role || "")) {
          throw new Error("Unauthorized: Admin or Procurement role required");
        }

        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const supplierId = uuidv4();
        const supplierNumber = await getNextSupplierNumber(database);

        const newSupplier = {
          id: supplierId,
          organizationId: ctx.user?.organizationId ?? null,
          supplierNumber,
          companyName: input.companyName,
          registrationNumber: input.registrationNumber || null,
          taxId: input.taxId || null,
          contactPerson: input.contactPerson || null,
          contactTitle: input.contactTitle || null,
          email: input.email || null,
          phone: input.phone || null,
          alternatePhone: input.alternatePhone || null,
          website: input.website || null,
          address: input.address || null,
          city: input.city || null,
          country: input.country || null,
          postalCode: input.postalCode || null,
          bankName: input.bankName || null,
          bankBranch: input.bankBranch || null,
          accountNumber: input.accountNumber || null,
          accountName: input.accountName || null,
          paymentTerms: input.paymentTerms || null,
          paymentMethods: input.paymentMethods ? JSON.stringify(input.paymentMethods) : null,
          categories: input.categories ? JSON.stringify(input.categories) : null,
          certifications: input.certifications ? JSON.stringify(input.certifications) : null,
          qualificationStatus: input.qualificationStatus,
          qualificationDate: input.qualificationDate || null,
          notes: input.notes || null,
          isActive: true,
          createdBy: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        await database.insert(suppliers).values(newSupplier);

        // Auto-create contact from supplier data
        try {
          if (input.contactPerson || input.email) {
            const nameParts = (input.contactPerson || input.companyName).trim().split(/\s+/);
            const firstName = nameParts[0] || input.companyName;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
            await database.insert(contacts).values({
              id: uuidv4(),
              organizationId: ctx.user?.organizationId ?? null,
              firstName,
              lastName,
              email: input.email || null,
              phone: input.phone || null,
              mobile: input.alternatePhone || null,
              jobTitle: input.contactTitle || null,
              isPrimary: 1,
              address: input.address || null,
              city: input.city || null,
              country: input.country || null,
              postalCode: input.postalCode || null,
              notes: `Supplier: ${input.companyName}`,
              createdBy: ctx.user?.id || "system",
            });
          }
        } catch (contactErr) {
          console.error("[Suppliers] Auto-create contact failed:", contactErr);
        }

        return newSupplier;
      } catch (error) {
        console.error("[Suppliers Create Error]", error);
        throw error;
      }
    }),

  // Update supplier
  update: createFeatureRestrictedProcedure("suppliers:edit")
    .input(
      z.object({
        id: z.string(),
        companyName: z.string().optional(),
        contactPerson: z.string().optional(),
        contactTitle: z.string().optional(),
        email: z.string().optional(),
        phone: z.union([z.string(), z.number()]).optional(),
        alternatePhone: z.union([z.string(), z.number()]).optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        taxId: z.string().optional(),
        registrationNumber: z.string().optional(),
        website: z.string().optional(),
        bankName: z.string().optional(),
        bankBranch: z.string().optional(),
        accountNumber: z.string().optional(),
        accountName: z.string().optional(),
        paymentTerms: z.string().optional(),
        paymentMethods: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        certifications: z.array(z.string()).optional(),
        qualificationStatus: z.enum(["pending", "pre_qualified", "qualified", "rejected", "inactive"]).optional(),
        qualificationDate: z.string().optional(),
        qualityRating: z.number().min(0).max(100).optional(),
        deliveryRating: z.number().min(0).max(100).optional(),
        priceCompetitiveness: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (!["super_admin", "admin", "finance", "procurement"].includes(ctx.user?.role || "")) {
          throw new Error("Unauthorized");
        }

        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const updates: any = {
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        // Verify org ownership
        const orgId = ctx.user?.organizationId;
        if (orgId) {
          const existing = await database.select().from(suppliers).where(eq(suppliers.id, input.id)).limit(1);
          if (!existing.length || existing[0].organizationId !== orgId) throw new Error("Supplier not found");
        }

        if (input.companyName) updates.companyName = input.companyName;
        if (input.contactPerson) updates.contactPerson = input.contactPerson;
        if (input.contactTitle !== undefined) updates.contactTitle = input.contactTitle;
        if (input.email) updates.email = input.email;
        if (input.phone !== undefined) updates.phone = String(input.phone);
        if (input.alternatePhone !== undefined) updates.alternatePhone = String(input.alternatePhone);
        if (input.address !== undefined) updates.address = input.address;
        if (input.city !== undefined) updates.city = input.city;
        if (input.country !== undefined) updates.country = input.country;
        if (input.postalCode !== undefined) updates.postalCode = input.postalCode;
        if (input.taxId !== undefined) updates.taxId = input.taxId;
        if (input.registrationNumber !== undefined) updates.registrationNumber = input.registrationNumber;
        if (input.website !== undefined) updates.website = input.website;
        if (input.bankName !== undefined) updates.bankName = input.bankName;
        if (input.bankBranch !== undefined) updates.bankBranch = input.bankBranch;
        if (input.accountNumber !== undefined) updates.accountNumber = input.accountNumber;
        if (input.accountName !== undefined) updates.accountName = input.accountName;
        if (input.paymentTerms) updates.paymentTerms = input.paymentTerms;
        if (input.paymentMethods !== undefined) updates.paymentMethods = JSON.stringify(input.paymentMethods);
        if (input.categories !== undefined) updates.categories = JSON.stringify(input.categories);
        if (input.certifications !== undefined) updates.certifications = JSON.stringify(input.certifications);
        if (input.qualificationStatus) updates.qualificationStatus = input.qualificationStatus;
        if (input.qualificationDate !== undefined) updates.qualificationDate = input.qualificationDate;
        if (typeof input.isActive === "boolean") updates.isActive = input.isActive;
        if (input.notes !== undefined) updates.notes = input.notes;

        // Calculate average rating if any rating updated
        if (
          input.qualityRating !== undefined ||
          input.deliveryRating !== undefined ||
          input.priceCompetitiveness !== undefined
        ) {
          if (input.qualityRating !== undefined) updates.qualityRating = input.qualityRating;
          if (input.deliveryRating !== undefined) updates.deliveryRating = input.deliveryRating;
          if (input.priceCompetitiveness !== undefined) updates.priceCompetitiveness = input.priceCompetitiveness;

          // Get current values
          const current = await database.select().from(suppliers).where(eq(suppliers.id, input.id)).limit(1);
          if (current.length) {
            const quality = input.qualityRating ?? current[0].qualityRating ?? 0;
            const delivery = input.deliveryRating ?? current[0].deliveryRating ?? 0;
            const price = input.priceCompetitiveness ?? current[0].priceCompetitiveness ?? 0;
            updates.averageRating = Math.round((quality + delivery + price) / 3);
          }
        }

        await database.update(suppliers).set(updates).where(eq(suppliers.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[Suppliers Update Error]", error);
        throw error;
      }
    }),

  // Delete supplier
  delete: createFeatureRestrictedProcedure("suppliers:delete").input(z.string()).mutation(async ({ input, ctx }) => {
    try {
      if (!["super_admin", "admin", "finance"].includes(ctx.user?.role || "")) {
        throw new Error("Unauthorized");
      }

      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Verify org ownership
      const orgId = ctx.user?.organizationId;
      if (orgId) {
        const existing = await database.select().from(suppliers).where(eq(suppliers.id, input)).limit(1);
        if (!existing.length || existing[0].organizationId !== orgId) throw new Error("Supplier not found");
      }

      await database.delete(suppliers).where(eq(suppliers.id, input));

      return { success: true };
    } catch (error) {
      console.error("[Suppliers Delete Error]", error);
      throw error;
    }
  }),

  // Get suppliers by status
  byStatus: protectedProcedure
    .input(z.enum(["pending", "pre_qualified", "qualified", "rejected", "inactive"]))
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const orgId = ctx.user.organizationId;
        const where = orgId ? and(eq(suppliers.qualificationStatus, input), eq(suppliers.organizationId, orgId)) : eq(suppliers.qualificationStatus, input);
        const results = await database
          .select()
          .from(suppliers)
          .where(where);

        return results;
      } catch (error) {
        console.error("[Suppliers ByStatus Error]", error);
        return [];
      }
    }),

  // Add supplier rating
  addRating: createFeatureRestrictedProcedure("suppliers:edit")
    .input(
      z.object({
        supplierId: z.string(),
        orderId: z.string().optional(),
        qualityScore: z.number().min(1).max(5),
        deliveryScore: z.number().min(1).max(5),
        priceScore: z.number().min(1).max(5),
        serviceScore: z.number().min(1).max(5),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const ratingId = uuidv4();
        const averageScore = Math.round(
          ((input.qualityScore + input.deliveryScore + input.priceScore + input.serviceScore) / 4) * 20
        );

        await database.insert(supplierRatings).values({
          id: ratingId,
          supplierId: input.supplierId,
          orderId: input.orderId || null,
          qualityScore: input.qualityScore,
          deliveryScore: input.deliveryScore,
          priceScore: input.priceScore,
          serviceScore: input.serviceScore,
          comments: input.comments || null,
          ratedBy: ctx.user?.id || "system",
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        // Update supplier average rating
        const allRatings = await database
          .select()
          .from(supplierRatings)
          .where(eq(supplierRatings.supplierId, input.supplierId));

        if (allRatings.length > 0) {
          const avgQuality = Math.round(
            allRatings.reduce((sum, r) => sum + r.qualityScore, 0) / allRatings.length * 20
          );
          const avgDelivery = Math.round(
            allRatings.reduce((sum, r) => sum + r.deliveryScore, 0) / allRatings.length * 20
          );
          const avgPrice = Math.round(
            allRatings.reduce((sum, r) => sum + r.priceScore, 0) / allRatings.length * 20
          );

          await database.update(suppliers).set({
            qualityRating: avgQuality,
            deliveryRating: avgDelivery,
            priceCompetitiveness: avgPrice,
            averageRating: Math.round((avgQuality + avgDelivery + avgPrice) / 3),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          }).where(eq(suppliers.id, input.supplierId));
        }

        return { success: true, ratingId };
      } catch (error) {
        console.error("[Suppliers AddRating Error]", error);
        throw error;
      }
    }),

  // Get supplier ratings
  getRatings: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const ratings = await database
          .select()
          .from(supplierRatings)
          .where(eq(supplierRatings.supplierId, input));

        return ratings;
      } catch (error) {
        console.error("[Suppliers GetRatings Error]", error);
        return [];
      }
    }),
});

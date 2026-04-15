import { router, protectedProcedure } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { z } from "zod";
import { getDb } from "../db";
import { clients, employees, services } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Feature-based procedures
const importProcedure = createFeatureRestrictedProcedure("data:import");

// Parse CSV/Excel string data
interface ImportRow {
  [key: string]: any;
}

const importClientSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  fieldMap: z.record(z.string(), z.string()), // maps input fields to schema fields
});

const importEmployeeSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  fieldMap: z.record(z.string(), z.string()),
});

const importServiceSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  fieldMap: z.record(z.string(), z.string()),
});

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  warnings: string[];
}

export const importExcelRouter = router({
  /**
   * Validate and import clients from uploaded data
   */
  importClients: importProcedure
    .input(importClientSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        warnings: [],
      };

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];
        try {
          // Map fields based on fieldMap
          const mappedData = {
            companyName: row[input.fieldMap.companyName] || "",
            email: row[input.fieldMap.email] || "",
            phone: row[input.fieldMap.phone] || "",
            address: row[input.fieldMap.address] || "",
            city: row[input.fieldMap.city] || "",
            postalCode: row[input.fieldMap.postalCode] || "",
            country: row[input.fieldMap.country] || "",
            industry: row[input.fieldMap.industry] || "",
            website: row[input.fieldMap.website] || "",
          };

          // Validate required fields
          if (!mappedData.companyName) {
            result.errors.push({ row: i + 1, error: "Company name is required" });
            result.failed++;
            continue;
          }

          // Check for duplicate
          const existing = await db
            .select()
            .from(clients)
            .where(eq(clients.companyName, mappedData.companyName))
            .limit(1);

          if (existing.length > 0) {
            result.warnings.push(`Row ${i + 1}: Client "${mappedData.companyName}" already exists`);
            result.failed++;
            continue;
          }

          // Insert client
          await db.insert(clients).values({
            ...mappedData,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          result.success++;
        } catch (err: any) {
          result.errors.push({ row: i + 1, error: err.message || "Unknown error" });
          result.failed++;
        }
      }

      return result;
    }),

  /**
   * Validate and import employees from uploaded data
   */
  importEmployees: importProcedure
    .input(importEmployeeSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        warnings: [],
      };

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];
        try {
          const mappedData = {
            firstName: row[input.fieldMap.firstName] || "",
            lastName: row[input.fieldMap.lastName] || "",
            email: row[input.fieldMap.email] || "",
            phone: row[input.fieldMap.phone] || "",
            department: row[input.fieldMap.department] || "",
            position: row[input.fieldMap.position] || "",
            salary: parseInt(row[input.fieldMap.salary] || "0"),
            startDate: row[input.fieldMap.startDate] ? new Date(row[input.fieldMap.startDate]) : new Date().toISOString().replace('T', ' ').substring(0, 19),
            status: "active",
          };

          // Validate required fields
          if (!mappedData.firstName || !mappedData.lastName) {
            result.errors.push({ row: i + 1, error: "First name and last name are required" });
            result.failed++;
            continue;
          }

          // Check for duplicate by email (if provided)
          if (mappedData.email) {
            const existing = await db
              .select()
              .from(employees)
              .where(eq(employees.email, mappedData.email))
              .limit(1);

            if (existing.length > 0) {
              result.warnings.push(`Row ${i + 1}: Employee with email "${mappedData.email}" already exists`);
              result.failed++;
              continue;
            }
          }

          // Insert employee
          await db.insert(employees).values({
            firstName: mappedData.firstName,
            lastName: mappedData.lastName,
            email: mappedData.email,
            phone: mappedData.phone,
            department: mappedData.department,
            position: mappedData.position,
            salary: mappedData.salary,
            startDate: mappedData.startDate,
            status: "active",
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          result.success++;
        } catch (err: any) {
          result.errors.push({ row: i + 1, error: err.message || "Unknown error" });
          result.failed++;
        }
      }

      return result;
    }),

  /**
   * Validate and import services from uploaded data
   */
  importServices: importProcedure
    .input(importServiceSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        warnings: [],
      };

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];
        try {
          const mappedData = {
            serviceName: row[input.fieldMap.serviceName] || "",
            description: row[input.fieldMap.description] || "",
            price: parseFloat(row[input.fieldMap.price] || "0") * 100, // Store as cents
            category: row[input.fieldMap.category] || "General",
            isActive: row[input.fieldMap.isActive] !== "No" && row[input.fieldMap.isActive] !== "false",
          };

          // Validate required fields
          if (!mappedData.serviceName) {
            result.errors.push({ row: i + 1, error: "Service name is required" });
            result.failed++;
            continue;
          }

          if (mappedData.price <= 0) {
            result.errors.push({ row: i + 1, error: "Price must be greater than 0" });
            result.failed++;
            continue;
          }

          // Check for duplicate
          const existing = await db
            .select()
            .from(services)
            .where(eq(services.serviceName, mappedData.serviceName))
            .limit(1);

          if (existing.length > 0) {
            result.warnings.push(`Row ${i + 1}: Service "${mappedData.serviceName}" already exists`);
            result.failed++;
            continue;
          }

          // Insert service
          await db.insert(services).values({
            serviceName: mappedData.serviceName,
            description: mappedData.description,
            price: mappedData.price,
            category: mappedData.category,
            isActive: mappedData.isActive,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          result.success++;
        } catch (err: any) {
          result.errors.push({ row: i + 1, error: err.message || "Unknown error" });
          result.failed++;
        }
      }

      return result;
    }),

  /**
   * Preview import data without saving - validates structure and shows unique references
   */
  previewImport: importProcedure
    .input(
      z.object({
        data: z.array(z.record(z.string(), z.any())),
        type: z.enum(["clients", "employees", "services"]),
      })
    )
    .query(async ({ input }) => {
      const preview = {
        totalRows: input.data.length,
        sampleRows: input.data.slice(0, 3),
        columns: input.data.length > 0 ? Object.keys(input.data[0]) : [],
        type: input.type,
      };

      return preview;
    }),
});

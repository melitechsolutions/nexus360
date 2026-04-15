import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from 'xlsx';
import * as db from "../db";
import { TRPCError } from "@trpc/server";

// Define typed procedures
const importProcedure = createFeatureRestrictedProcedure("data:import");

// Enhanced validation schemas
const employeeImportSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().optional(),
  salary: z.number().optional(),
});

const clientImportSchema = z.object({
  name: z.string().min(1, "Client name required"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
});

const productImportSchema = z.object({
  productName: z.string().min(1, "Product name required"),
  description: z.string().optional(),
  unitPrice: z.number().positive("Unit price must be positive"),
  quantity: z.number().nonnegative("Quantity must be non-negative").optional(),
  sku: z.string().optional(),
});

interface ImportError {
  rowIndex: number;
  field: string;
  value: string;
  error: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  warnings: string[];
}

export const importValidationRouter = router({
  /**
   * Validate Excel file structure and data before import
   */
  validateFile: importProcedure
    .input(
      z.object({
        fileContent: z.string(), // Base64 encoded file
        importType: z.enum(["employees", "clients", "products"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Decode base64
        const binaryString = Buffer.from(input.fileContent, "base64").toString("binary");
        const workbook = XLSX.read(binaryString, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          throw new Error("No data found in worksheet");
        }

        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
          throw new Error("File is empty");
        }

        const errors: ImportError[] = [];
        const warnings: string[] = [];

        // Get schema based on import type
        let schema = employeeImportSchema;
        if (input.importType === "clients") {
          schema = clientImportSchema;
        } else if (input.importType === "products") {
          schema = productImportSchema;
        }

        // Validate each row
        data.forEach((row: any, index: number) => {
          const result = schema.safeParse(row);

          if (!result.success) {
            result.error.errors.forEach((err) => {
              errors.push({
                rowIndex: index + 1, // Excel row numbering starts at 1
                field: err.path.join("."),
                value: row[err.path[0]] || "N/A",
                error: err.message,
              });
            });
          }

          // Additional checks
          if (input.importType === "employees" && row.email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
              errors.push({
                rowIndex: index + 1,
                field: "email",
                value: row.email,
                error: "Invalid email format",
              });
            }
          }

          // Check for duplicates in file
          const duplicateRow = data.findIndex(
            (r: any, i: number) =>
              i < index && r.email === row.email && input.importType === "employees"
          );
          if (duplicateRow >= 0) {
            warnings.push(
              `Row ${index + 1}: Duplicate email '${row.email}' also appears in row ${duplicateRow + 1}`
            );
          }
        });

        return {
          isValid: errors.length === 0,
          totalRows: data.length,
          errors,
          warnings,
          data: errors.length > 0 ? null : data,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File validation failed: ${error.message}`,
        });
      }
    }),

  /**
   * Import validated data in batches
   */
  importData: importProcedure
    .input(
      z.object({
        importType: z.enum(["employees", "clients", "products"]),
        data: z.array(z.record(z.string(), z.any())),
        batchSize: z.number().default(100),
        skipOnError: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        warnings: [],
      };

      const importId = uuidv4();
      const now = new Date().toISOString().replace("T", " ").substring(0, 19);

      try {
        // Process in batches
        for (let i = 0; i < input.data.length; i += input.batchSize) {
          const batch = input.data.slice(i, i + input.batchSize);

          for (let j = 0; j < batch.length; j++) {
            const row = batch[j];
            const rowIndex = i + j + 1;

            try {
              if (input.importType === "employees") {
                const id = uuidv4();
                const hireDate = row.hireDate
                  ? new Date(row.hireDate).toISOString().replace("T", " ").substring(0, 19)
                  : now;

                await database.raw(
                  `
                  INSERT INTO employees 
                  (id, firstName, lastName, email, phone, departmentId, position, hireDate, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `,
                  [
                    id,
                    row.firstName,
                    row.lastName,
                    row.email,
                    row.phone || null,
                    row.departmentId || null,
                    row.position || null,
                    hireDate,
                    now,
                    now,
                  ]
                );
                result.success++;
              } else if (input.importType === "clients") {
                const id = uuidv4();

                await database.raw(
                  `
                  INSERT INTO clients 
                  (id, clientName, email, phone, address, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  `,
                  [
                    id,
                    row.name,
                    row.email || null,
                    row.phone || null,
                    row.address || null,
                    now,
                    now,
                  ]
                );
                result.success++;
              } else if (input.importType === "products") {
                const id = uuidv4();

                await database.raw(
                  `
                  INSERT INTO products 
                  (id, productName, description, unitPrice, quantity, sku, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `,
                  [
                    id,
                    row.productName,
                    row.description || null,
                    Math.round((row.unitPrice || 0) * 100), // Store in cents
                    row.quantity || 0,
                    row.sku || null,
                    now,
                    now,
                  ]
                );
                result.success++;
              }
            } catch (err: any) {
              result.failed++;

              if (!input.skipOnError) {
                result.errors.push({
                  rowIndex,
                  field: "general",
                  value: JSON.stringify(row),
                  error: err.message || "Unknown error during import",
                });
              }
            }
          }
        }

        // Log import activity
        await db.logActivity({
          userId: ctx.user.id,
          action: `import_${input.importType}`,
          entityType: "import",
          entityId: importId,
          description: `Imported ${result.success} ${input.importType}. Failed: ${result.failed}`,
        });

        return result;
      } catch (error: any) {
        console.error("Error importing data:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Import failed: ${error.message}`,
        });
      }
    }),

  /**
   * Check for duplicate entries in database before import
   */
  checkDuplicates: importProcedure
    .input(
      z.object({
        importType: z.enum(["employees", "clients", "products"]),
        data: z.array(z.record(z.string(), z.any())),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      try {
        const duplicates: any[] = [];

        if (input.importType === "employees") {
          for (const row of input.data) {
            const existing = await database.raw(
              `SELECT id, email FROM employees WHERE email = ? LIMIT 1`,
              [row.email]
            );

            if (existing && existing.length > 0) {
              duplicates.push({
                rowData: row,
                existingId: existing[0].id,
                matchField: "email",
                message: `Employee with email '${row.email}' already exists`,
              });
            }
          }
        } else if (input.importType === "clients") {
          for (const row of input.data) {
            const existing = await database.raw(
              `SELECT id, clientName FROM clients WHERE clientName = ? LIMIT 1`,
              [row.name]
            );

            if (existing && existing.length > 0) {
              duplicates.push({
                rowData: row,
                existingId: existing[0].id,
                matchField: "name",
                message: `Client '${row.name}' already exists`,
              });
            }
          }
        } else if (input.importType === "products") {
          for (const row of input.data) {
            const existing = await database.raw(
              `SELECT id, productName FROM products WHERE productName = ? LIMIT 1`,
              [row.productName]
            );

            if (existing && existing.length > 0) {
              duplicates.push({
                rowData: row,
                existingId: existing[0].id,
                matchField: "productName",
                message: `Product '${row.productName}' already exists`,
              });
            }
          }
        }

        return duplicates;
      } catch (error: any) {
        console.error("Error checking duplicates:", error);
        return [];
      }
    }),

  /**
   * Get import history and status
   */
  getImportHistory: importProcedure
    .input(
      z.object({
        importType: z.enum(["employees", "clients", "products"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const results = await database.raw<
          Array<{
            id: string;
            action: string;
            description: string;
            createdAt: string;
          }>
        >(
          `
          SELECT id, action, description, createdAt
          FROM activity_logs
          WHERE userId = ? AND action LIKE 'import_%'
          ORDER BY createdAt DESC
          LIMIT ? OFFSET ?
          `,
          [ctx.user.id, 50, 0]
        );

        return results || [];
      } catch (error) {
        console.error("Error fetching import history:", error);
        return [];
      }
    }),
});

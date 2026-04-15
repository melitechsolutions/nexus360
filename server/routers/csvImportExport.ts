import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { 
  clients, employees, departments, jobGroups, products, services,
  payments, accounts, bankAccounts, expenses, invoices, users
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as csvGen from "../utils/csvGenerator";
import * as db from "../db";

const parseOptionalIntString = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseRequiredIntString = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * CSV Import/Export Router
 * Handles template generation, CSV parsing, and module-specific imports
 */
export const csvImportExportRouter = router({
  // Get list of available modules for import
  getAvailableModules: createFeatureRestrictedProcedure("data:export")
    .query(async () => {
      return csvGen.getAvailableModules();
    }),

  // Generate CSV template for a specific module
  generateTemplate: createFeatureRestrictedProcedure("data:export")
    .input(z.enum([
      'clients', 'employees', 'departments', 'jobGroups', 'products', 'services',
      'payments', 'accounts', 'bankAccounts', 'expenses', 'invoices', 'users'
    ]))
    .query(async ({ input }) => {
      try {
        const template = csvGen.generateCSVTemplate(input as csvGen.ModuleType);
        return {
          success: true,
          content: template,
          module: input,
          timestamp: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate template: ${error}`,
        });
      }
    }),

  // Import clients from CSV data
  importClients: createFeatureRestrictedProcedure("data:import")
    .input(z.object({
      data: z.array(z.object({
        companyName: z.string(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        taxId: z.string().optional(),
        website: z.string().optional(),
        industry: z.string().optional(),
        status: z.enum(['active', 'inactive', 'prospect', 'archived']).optional(),
        businessType: z.string().optional(),
        registrationNumber: z.string().optional(),
        creditLimit: z.number().optional().or(z.string().transform(parseOptionalIntString)),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field?: string; message: string }>,
        batchId: uuidv4(),
      };

      for (let idx = 0; idx < input.data.length; idx++) {
        const row = idx + 1; // CSV row number (1-indexed)
        const clientData = input.data[idx];

        try {
          // Validate required fields
          if (!clientData.companyName || clientData.companyName.trim() === '') {
            results.errors.push({ row, field: 'companyName', message: 'Company name is required' });
            results.skipped++;
            continue;
          }

          // Check for duplicates
          if (input.skipDuplicates && clientData.email) {
            const existing = await database
              .select()
              .from(clients)
              .where(eq(clients.email, clientData.email));
            
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(clients).values({
            id,
            companyName: clientData.companyName,
            contactPerson: clientData.contactPerson || null,
            email: clientData.email || null,
            phone: clientData.phone || null,
            address: clientData.address || null,
            city: clientData.city || null,
            country: clientData.country || null,
            postalCode: clientData.postalCode || null,
            taxId: clientData.taxId || null,
            website: clientData.website || null,
            industry: clientData.industry || null,
            status: clientData.status || 'active',
            businessType: clientData.businessType || null,
            registrationNumber: clientData.registrationNumber || null,
            creditLimit: clientData.creditLimit ? parseInt(clientData.creditLimit.toString()) : null,
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          results.imported++;
        } catch (error) {
          results.errors.push({
            row,
            message: `Failed to import client: ${error}`,
          });
        }
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "csv_import_clients",
        entityType: "client",
        entityId: "bulk",
        description: `Imported ${results.imported} clients via CSV (skipped: ${results.skipped})`,
      });

      return results;
    }),

  // Import employees from CSV data
  importEmployees: createFeatureRestrictedProcedure("data:import")
    .input(z.object({
      data: z.array(z.object({
        employeeNumber: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().optional(),
        hireDate: z.string(),
        department: z.string().optional(),
        position: z.string().optional(),
        jobGroupId: z.string().optional(),
        salary: z.number().optional().or(z.string().transform(parseOptionalIntString)),
        employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
        status: z.enum(['active', 'on_leave', 'terminated', 'suspended']).optional(),
        address: z.string().optional(),
        nationalId: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        taxId: z.string().optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field?: string; message: string }>,
        batchId: uuidv4(),
      };

      for (let idx = 0; idx < input.data.length; idx++) {
        const row = idx + 1;
        const empData = input.data[idx];

        try {
          // Validate required fields
          if (!empData.employeeNumber || empData.employeeNumber.trim() === '') {
            results.errors.push({ row, field: 'employeeNumber', message: 'Employee number is required' });
            results.skipped++;
            continue;
          }
          if (!empData.firstName || empData.firstName.trim() === '') {
            results.errors.push({ row, field: 'firstName', message: 'First name is required' });
            results.skipped++;
            continue;
          }
          if (!empData.lastName || empData.lastName.trim() === '') {
            results.errors.push({ row, field: 'lastName', message: 'Last name is required' });
            results.skipped++;
            continue;
          }
          if (!empData.hireDate || empData.hireDate.trim() === '') {
            results.errors.push({ row, field: 'hireDate', message: 'Hire date is required' });
            results.skipped++;
            continue;
          }

          // Check for duplicates
          if (input.skipDuplicates) {
            const existing = await database
              .select()
              .from(employees)
              .where(eq(employees.employeeNumber, empData.employeeNumber));
            
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(employees).values({
            id,
            employeeNumber: empData.employeeNumber,
            firstName: empData.firstName,
            lastName: empData.lastName,
            email: empData.email || null,
            phone: empData.phone || null,
            dateOfBirth: empData.dateOfBirth ? new Date(empData.dateOfBirth).toISOString() : null,
            hireDate: new Date(empData.hireDate).toISOString(),
            department: empData.department || null,
            position: empData.position || null,
            jobGroupId: empData.jobGroupId || uuidv4(), // Default job group
            salary: empData.salary ? parseInt(empData.salary.toString()) : 0,
            employmentType: empData.employmentType || 'full_time',
            status: empData.status || 'active',
            address: empData.address || null,
            nationalId: empData.nationalId || null,
            bankAccountNumber: empData.bankAccountNumber || null,
            taxId: empData.taxId || null,
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          results.imported++;
        } catch (error) {
          results.errors.push({
            row,
            message: `Failed to import employee: ${error}`,
          });
        }
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: "csv_import_employees",
        entityType: "employee",
        entityId: "bulk",
        description: `Imported ${results.imported} employees via CSV`,
      });

      return results;
    }),

  // Import products from CSV data
  importProducts: createFeatureRestrictedProcedure("data:import")
    .input(z.object({
      data: z.array(z.object({
        productName: z.string(),
        productCode: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        unitPrice: z.number().or(z.string().transform(parseRequiredIntString)),
        taxRate: z.number().optional().or(z.string().transform(parseOptionalIntString)),
        quantity: z.number().optional().or(z.string().transform(parseOptionalIntString)),
        reorderLevel: z.number().optional().or(z.string().transform(parseOptionalIntString)),
        supplier: z.string().optional(),
        status: z.enum(['active', 'inactive', 'discontinued']).optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field?: string; message: string }>,
        batchId: uuidv4(),
      };

      for (let idx = 0; idx < input.data.length; idx++) {
        const row = idx + 1;
        const prodData = input.data[idx];

        try {
          if (!prodData.productName || prodData.productName.trim() === '') {
            results.errors.push({ row, field: 'productName', message: 'Product name is required' });
            results.skipped++;
            continue;
          }

          if (input.skipDuplicates && prodData.productCode) {
            const existing = await database.select().from(products).where(eq(products.productCode, prodData.productCode));
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(products).values({
            id,
            productName: prodData.productName,
            productCode: prodData.productCode || uuidv4(),
            description: prodData.description || null,
            category: prodData.category || null,
            unitPrice: parseInt(prodData.unitPrice.toString()),
            taxRate: prodData.taxRate ? parseInt(prodData.taxRate.toString()) : 0,
            quantity: prodData.quantity ? parseInt(prodData.quantity.toString()) : 0,
            reorderLevel: prodData.reorderLevel ? parseInt(prodData.reorderLevel.toString()) : 0,
            supplier: prodData.supplier || null,
            status: prodData.status || 'active',
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          results.imported++;
        } catch (error) {
          results.errors.push({
            row,
            message: `Failed to import product: ${error}`,
          });
        }
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: "csv_import_products",
        entityType: "product",
        entityId: "bulk",
        description: `Imported ${results.imported} products via CSV`,
      });

      return results;
    }),

  // Import accounts (Chart of Accounts) from CSV data
  importAccounts: createFeatureRestrictedProcedure("data:import")
    .input(z.object({
      data: z.array(z.object({
        accountCode: z.string(),
        accountName: z.string(),
        accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
        parentAccountCode: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional().or(z.string().transform(v => v === 'true')),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field?: string; message: string }>,
        batchId: uuidv4(),
      };

      // First pass: collect all account codes being imported
      const importedCodes = new Map<string, string>(); // code -> id

      for (let idx = 0; idx < input.data.length; idx++) {
        const row = idx + 1;
        const accData = input.data[idx];

        try {
          if (!accData.accountCode || accData.accountCode.trim() === '') {
            results.errors.push({ row, field: 'accountCode', message: 'Account code is required' });
            results.skipped++;
            continue;
          }
          if (!accData.accountName || accData.accountName.trim() === '') {
            results.errors.push({ row, field: 'accountName', message: 'Account name is required' });
            results.skipped++;
            continue;
          }

          if (input.skipDuplicates) {
            const existing = await database
              .select()
              .from(accounts)
              .where(eq(accounts.accountCode, accData.accountCode));
            
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          // Look up parent account if specified
          let parentAccountId: string | null = null;
          if (accData.parentAccountCode) {
            const parentFromDb = await database
              .select()
              .from(accounts)
              .where(eq(accounts.accountCode, accData.parentAccountCode));
            
            if (parentFromDb.length === 0) {
              results.errors.push({
                row,
                field: 'parentAccountCode',
                message: `Parent account with code ${accData.parentAccountCode} not found`,
              });
              results.skipped++;
              continue;
            }
            parentAccountId = parentFromDb[0].id;
          }

          const id = uuidv4();
          importedCodes.set(accData.accountCode, id);

          await database.insert(accounts).values({
            id,
            accountCode: accData.accountCode,
            accountName: accData.accountName,
            accountType: accData.accountType,
            parentAccountId,
            description: accData.description || null,
            isActive: accData.isActive ? 1 : 0,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          results.imported++;
        } catch (error) {
          results.errors.push({
            row,
            message: `Failed to import account: ${error}`,
          });
        }
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: "csv_import_accounts",
        entityType: "account",
        entityId: "bulk",
        description: `Imported ${results.imported} accounts via CSV`,
      });

      return results;
    }),

  // Import payments from CSV data
  importPayments: createFeatureRestrictedProcedure("data:import")
    .input(z.object({
      data: z.array(z.object({
        invoiceNumber: z.string(),
        clientName: z.string().optional(),
        amount: z.number().or(z.string().transform(parseRequiredIntString)),
        paymentDate: z.string(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'card', 'other']).optional(),
        reference: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'completed', 'cancelled']).optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field?: string; message: string }>,
        batchId: uuidv4(),
      };

      for (let idx = 0; idx < input.data.length; idx++) {
        const row = idx + 1;
        const payData = input.data[idx];

        try {
          if (!payData.invoiceNumber || payData.invoiceNumber.trim() === '') {
            results.errors.push({ row, field: 'invoiceNumber', message: 'Invoice number is required' });
            results.skipped++;
            continue;
          }

          if (!payData.amount || payData.amount <= 0) {
            results.errors.push({ row, field: 'amount', message: 'Amount must be greater than 0' });
            results.skipped++;
            continue;
          }

          const id = uuidv4();
          await database.insert(payments).values({
            id,
            invoiceNumber: payData.invoiceNumber,
            amount: parseInt(payData.amount.toString()),
            paymentDate: new Date(payData.paymentDate).toISOString().replace('T', ' ').substring(0, 19),
            paymentMethod: payData.paymentMethod || 'bank_transfer',
            reference: payData.reference || null,
            description: payData.description || null,
            status: payData.status || 'completed',
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          } as any);

          results.imported++;
        } catch (error) {
          results.errors.push({
            row,
            message: `Failed to import payment: ${error}`,
          });
        }
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: "csv_import_payments",
        entityType: "payment",
        entityId: "bulk",
        description: `Imported ${results.imported} payments via CSV`,
      });

      return results;
    }),
});

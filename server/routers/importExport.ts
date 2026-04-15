import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { 
  clients, services, products, invoices, payroll, employees, departments,
  estimates, receipts, expenses, jobGroups, bankAccounts, journalEntries,
  accounts, recurringInvoices, communicationLogs, users, auditLogs
} from "../../drizzle/schema";
import { suppliers } from "../../drizzle/schema-extended";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

const createProcedure = createFeatureRestrictedProcedure("import:create");
const viewProcedure = protectedProcedure;

// Enhanced import result with detailed error tracking
interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    severity: "error" | "warning";
  }>;
  batchId: string;
  startTime: Date;
  endTime: Date;
}

export const importExportRouter = router({
  // Import clients from CSV
  importClients: createProcedure
    .input(z.object({
      data: z.array(z.object({
        companyName: z.string(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        status: z.enum(['active', 'inactive', 'prospect', 'archived']).optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const clientData of input.data) {
        try {
          // Validate required fields
          if (!clientData.companyName) {
            results.errors.push("Company name is required");
            results.skipped++;
            continue;
          }

          // Check for duplicates if enabled
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
            ...clientData,
            createdBy: ctx.user.id,
          });

          results.imported++;
        } catch (error) {
          results.errors.push(`Error importing client ${clientData.companyName}: ${error}`);
        }
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "clients_imported",
        entityType: "client",
        entityId: "bulk",
        description: `Imported ${results.imported} clients`,
      });

      return results;
    }),

  // Import services from CSV
  importServices: createProcedure
    .input(z.object({
      data: z.array(z.object({
        serviceName: z.string(),
        description: z.string().max(500).optional(),
        serviceType: z.string().optional(),
        rate: z.number().optional(),
        unit: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const serviceData of input.data) {
        try {
          // Validate required fields
          if (!serviceData.serviceName) {
            results.errors.push("Service name is required");
            results.skipped++;
            continue;
          }

          // Check for duplicates if enabled
          if (input.skipDuplicates) {
            const existing = await database
              .select()
              .from(services)
              .where(eq(services.name, serviceData.serviceName));
            
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(services).values({
            id,
            name: serviceData.serviceName,
            description: serviceData.description,
            category: serviceData.serviceType || null,
            hourlyRate: serviceData.rate ?? null,
            unit: serviceData.unit ?? null,
            createdBy: ctx.user.id,
          });

          results.imported++;
        } catch (error) {
          results.errors.push(`Error importing service ${serviceData.serviceName}: ${error}`);
        }
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "services_imported",
        entityType: "service",
        entityId: "bulk",
        description: `Imported ${results.imported} services`,
      });

      return results;
    }),

  // Import products from CSV
  importProducts: createProcedure
    .input(z.object({
      data: z.array(z.object({
        productName: z.string(),
        description: z.string().max(500).optional(),
        sku: z.string().optional(),
        unitPrice: z.number().optional(),
        quantity: z.number().optional(),
        category: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const productData of input.data) {
        try {
          // Validate required fields
          if (!productData.productName) {
            results.errors.push("Product name is required");
            results.skipped++;
            continue;
          }

          // Check for duplicates if enabled
          if (input.skipDuplicates && productData.sku) {
            const existing = await database
              .select()
              .from(products)
              .where(eq(products.sku, productData.sku));
            
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(products).values({
            id,
            name: productData.productName,
            description: productData.description,
            sku: productData.sku ?? null,
            unitPrice: productData.unitPrice ?? 0,
            stockQuantity: productData.quantity ?? 0,
            category: productData.category ?? null,
            createdBy: ctx.user.id,
          });

          results.imported++;
        } catch (error) {
          results.errors.push(`Error importing product ${productData.productName}: ${error}`);
        }
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "products_imported",
        entityType: "product",
        entityId: "bulk",
        description: `Imported ${results.imported} products`,
      });

      return results;
    }),

  // Import employees from CSV
  importEmployees: createProcedure
    .input(z.object({
      data: z.array(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        department: z.string().optional(),
        jobTitle: z.string().optional(),
        salary: z.number().optional(),
        startDate: z.string().optional(),
        status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional(),
        idNumber: z.string().optional(),
        tin: z.string().optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const batchId = uuidv4();
      const errors: Array<{ row: number; field?: string; message: string; severity: "error" | "warning" }> = [];
      let imported = 0;
      let skipped = 0;

      for (let i = 0; i < input.data.length; i++) {
        const employeeData = input.data[i];
        const rowNum = i + 1;

        try {
          // Validate required fields
          if (!employeeData.firstName) {
            errors.push({ row: rowNum, field: "firstName", message: "First name is required", severity: "error" });
            skipped++;
            continue;
          }

          if (!employeeData.lastName) {
            errors.push({ row: rowNum, field: "lastName", message: "Last name is required", severity: "error" });
            skipped++;
            continue;
          }

          if (!employeeData.email) {
            errors.push({ row: rowNum, field: "email", message: "Email is required", severity: "error" });
            skipped++;
            continue;
          }

          // Check for duplicate email
          if (input.skipDuplicates) {
            const existing = await database
              .select()
              .from(employees)
              .where(eq(employees.email, employeeData.email));
            
            if (existing.length > 0) {
              errors.push({ row: rowNum, field: "email", message: "Duplicate email found", severity: "warning" });
              skipped++;
              continue;
            }
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(employeeData.email)) {
            errors.push({ row: rowNum, field: "email", message: "Invalid email format", severity: "error" });
            skipped++;
            continue;
          }

          // Get department ID if department name provided
          let departmentId = null;
          if (employeeData.department) {
            const dept = await database
              .select()
              .from(departments)
              .where(eq(departments.name, employeeData.department));
            
            if (dept.length === 0) {
              errors.push({ row: rowNum, field: "department", message: `Department '${employeeData.department}' not found`, severity: "warning" });
            } else {
              departmentId = dept[0].id;
            }
          }

          const id = uuidv4();
          await database.insert(employees).values({
            id,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            email: employeeData.email,
            phone: employeeData.phone ?? null,
            departmentId: departmentId,
            position: employeeData.jobTitle ?? null,
            baseSalary: employeeData.salary ?? 0,
            dateOfJoining: employeeData.startDate ? new Date(employeeData.startDate) : new Date().toISOString().replace('T', ' ').substring(0, 19),
            status: employeeData.status ?? 'active',
            idNumber: employeeData.idNumber ?? null,
            nssf: null,
            nhif: null,
            tin: employeeData.tin ?? null,
          });

          imported++;
        } catch (error) {
          errors.push({ row: rowNum, message: `Error importing employee: ${String(error)}`, severity: "error" });
        }
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "employees_imported",
        entityType: "employee",
        entityId: "bulk",
        description: `Imported ${imported} employees (${skipped} skipped)`,
      });

      return {
        imported,
        skipped,
        errors,
        batchId,
        startTime: new Date(),
        endTime: new Date(),
      };
    }),

  // Get detailed import errors
  getImportErrors: viewProcedure
    .input(z.object({
      batchId: z.string(),
      type: z.enum(['error', 'warning', 'all']).optional(),
    }))
    .query(async ({ input }) => {
      // In production, fetch from database
      // For now return structured format
      return {
        batchId: input.batchId,
        errors: [] as any[],
        totalCount: 0,
      };
    }),

  // Import payroll records from JSON/parsed Excel
  importPayroll: createProcedure
    .input(z.object({
      data: z.array(z.object({
        employeeId: z.string(),
        paymentDate: z.string(),
        basicSalary: z.number(),
        allowances: z.number().optional(),
        deductions: z.number().optional(),
        netSalary: z.number().optional(),
        status: z.enum(['draft','processed','paid']).optional(),
      })),
      skipDuplicates: z.boolean().default(true),
      batchId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
        batchId: input.batchId || '',
      };

      const importedIds: string[] = [];

      for (const row of input.data) {
        try {
          // minimal validation
          if (!row.employeeId || !row.paymentDate) {
            results.errors.push("employeeId and paymentDate required");
            results.skipped++;
            continue;
          }

          if (input.skipDuplicates) {
            const exists = await database
              .select()
              .from(payroll)
              .where(eq(payroll.employeeId, row.employeeId))
              .where(eq(payroll.paymentDate, row.paymentDate));
            if (exists.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(payroll).values({
            id,
            employeeId: row.employeeId,
            paymentDate: row.paymentDate,
            basicSalary: row.basicSalary,
            allowances: row.allowances ?? 0,
            deductions: row.deductions ?? 0,
            netSalary: row.netSalary ?? 0,
            status: row.status || 'draft',
          } as any);

          importedIds.push(id);
          results.imported++;
        } catch (error) {
          results.errors.push(`Error importing payroll row: ${error}`);
        }
      }

      // Store batch information for potential rollback
      if (input.batchId && importedIds.length > 0) {
        // Store in memory for now (could be moved to database)
        if (!((globalThis as any).__import_batches)) {
          (globalThis as any).__import_batches = new Map();
        }
        (globalThis as any).__import_batches.set(input.batchId, {
          entityType: 'payroll',
          importedIds,
          userId: ctx.user.id,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      }

      await db.logActivity({
        userId: ctx.user.id,
        action: "payroll_imported",
        entityType: "payroll",
        entityId: "bulk",
        description: `Imported ${results.imported} payroll records (batchId: ${input.batchId})`,
      });

      return results;
    }),

  // Rollback import batch
  rollbackImport: createProcedure
    .input(z.object({ batchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const batchInfo = (globalThis as any).__import_batches.get(input.batchId);
      if (!batchInfo) {
        throw new Error("Batch not found or already rolled back");
      }

      // Verify user authorization (only user who imported can rollback)
      if (batchInfo.userId !== ctx.user.id) {
        throw new Error("Unauthorized to rollback this batch");
      }

      try {
        // Delete all records for this batch
        if (batchInfo.entityType === 'payroll') {
          for (const id of batchInfo.importedIds) {
            await database.delete(payroll).where(eq(payroll.id, id));
          }
        }

        // Clear batch info
        (globalThis as any).__import_batches.delete(input.batchId);

        await db.logActivity({
          userId: ctx.user.id,
          action: "import_rolled_back",
          entityType: batchInfo.entityType,
          entityId: input.batchId,
          description: `Rolled back import of ${batchInfo.importedIds.length} ${batchInfo.entityType} records`,
        });

        return { success: true, recordsDeleted: batchInfo.importedIds.length };
      } catch (error) {
        throw new Error(`Rollback failed: ${error}`);
      }
    }),

  // Export clients
  exportClients: viewProcedure
    .input(z.object({
      format: z.enum(['json', 'csv']).default('json'),
      status: z.enum(['all', 'active', 'inactive', 'prospect', 'archived']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      let clientsData = await database.select().from(clients);

      if (input?.status && input.status !== 'all') {
        clientsData = clientsData.filter(c => c.status === input.status);
      }

      if (input?.format === 'csv') {
        const headers = ['Company Name', 'Contact Person', 'Email', 'Phone', 'Address', 'City', 'Country', 'Status'];
        const rows = clientsData.map(c => [
          c.companyName,
          c.contactPerson || '',
          c.email || '',
          c.phone || '',
          c.address || '',
          c.city || '',
          c.country || '',
          c.status || 'active',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        return { data: csv, format: 'csv', fileName: `clients_${new Date().toISOString().split('T')[0]}.csv` };
      }

      return { data: clientsData, format: 'json', fileName: `clients_${new Date().toISOString().split('T')[0]}.json` };
    }),

  // Export services
  exportServices: viewProcedure
    .input(z.object({
      format: z.enum(['json', 'csv']).default('json'),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const servicesData = await database.select().from(services);

      if (input?.format === 'csv') {
        const headers = ['Service Name', 'Description', 'Service Type', 'Rate', 'Unit', 'Status'];
        const rows = servicesData.map(s => [
          s.name,
          s.description || '',
          s.category || '',
          s.hourlyRate ?? s.fixedPrice ?? '',
          s.unit || '',
          s.isActive ? 'active' : 'inactive',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        return { data: csv, format: 'csv', fileName: `services_${new Date().toISOString().split('T')[0]}.csv` };
      }

      return { data: servicesData, format: 'json', fileName: `services_${new Date().toISOString().split('T')[0]}.json` };
    }),

  // Export products
  exportProducts: viewProcedure
    .input(z.object({
      format: z.enum(['json', 'csv']).default('json'),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const productsData = await database.select().from(products);

      if (input?.format === 'csv') {
        const headers = ['Product Name', 'Description', 'SKU', 'Unit Price', 'Quantity', 'Category', 'Status'];
        const rows = productsData.map(p => [
          p.name,
          p.description || '',
          p.sku || '',
          p.unitPrice ?? '',
          p.stockQuantity ?? '',
          p.category || '',
          p.isActive ? 'active' : 'inactive',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        return { data: csv, format: 'csv', fileName: `products_${new Date().toISOString().split('T')[0]}.csv` };
      }

      return { data: productsData, format: 'json', fileName: `products_${new Date().toISOString().split('T')[0]}.json` };
    }),

  // Import suppliers from CSV
  importSuppliers: createProcedure
    .input(z.object({
      data: z.array(z.object({
        companyName: z.string(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        altPhone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        taxIdPin: z.string().optional(),
        website: z.string().optional(),
        paymentTerms: z.string().optional(),
        qualificationStatus: z.enum(['pending', 'pre_qualified', 'qualified', 'rejected', 'inactive']).optional(),
        notes: z.string().optional(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const supplierData of input.data) {
        try {
          // Validate required fields
          if (!supplierData.companyName) {
            results.errors.push("Company name is required");
            results.skipped++;
            continue;
          }

          // Check for duplicates if enabled
          if (input.skipDuplicates && supplierData.email) {
            const existing = await database
              .select()
              .from(suppliers)
              .where(eq(suppliers.email, supplierData.email));
            
            if (existing.length > 0) {
              results.skipped++;
              continue;
            }
          }

          const id = uuidv4();
          await database.insert(suppliers).values({
            id,
            companyName: supplierData.companyName,
            contactPerson: supplierData.contactPerson,
            email: supplierData.email,
            phone: supplierData.phone,
            altPhone: supplierData.altPhone,
            address: supplierData.address,
            city: supplierData.city,
            postalCode: supplierData.postalCode,
            taxIdPin: supplierData.taxIdPin,
            website: supplierData.website,
            paymentTerms: supplierData.paymentTerms,
            qualificationStatus: supplierData.qualificationStatus || 'pending',
            notes: supplierData.notes,
            isActive: true,
            createdBy: ctx.user.id,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });

          results.imported++;
        } catch (error) {
          results.errors.push(`Error importing supplier ${supplierData.companyName}: ${error}`);
        }
      }

      // Log activity
      await db.logActivity({
        userId: ctx.user.id,
        action: "suppliers_imported",
        entityType: "supplier",
        entityId: "bulk",
        description: `Imported ${results.imported} suppliers`,
      });

      return results;
    }),

  // Export suppliers to CSV/JSON
  exportSuppliers: viewProcedure
    .input(z.object({
      format: z.enum(['json', 'csv']).default('json'),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const suppliersData = await database.select().from(suppliers);

      if (input?.format === 'csv') {
        const headers = [
          'Company Name', 'Contact Person', 'Email', 'Phone', 'Alt Phone',
          'Address', 'City', 'Postal Code', 'Tax ID/PIN', 'Website',
          'Payment Terms', 'Qualification Status', 'Quality Rating', 
          'Delivery Rating', 'Price Rating', 'Average Rating', 'Notes', 'Status'
        ];
        const rows = suppliersData.map(s => [
          s.companyName || '',
          s.contactPerson || '',
          s.email || '',
          s.phone || '',
          s.altPhone || '',
          s.address || '',
          s.city || '',
          s.postalCode || '',
          s.taxIdPin || '',
          s.website || '',
          s.paymentTerms || '',
          s.qualificationStatus || '',
          s.qualityRating ?? '',
          s.deliveryRating ?? '',
          s.priceCompetitiveness ?? '',
          s.averageRating ?? '',
          s.notes || '',
          s.isActive ? 'active' : 'inactive',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        return { data: csv, format: 'csv', fileName: `suppliers_${new Date().toISOString().split('T')[0]}.csv` };
      }

      return { data: suppliersData, format: 'json', fileName: `suppliers_${new Date().toISOString().split('T')[0]}.json` };
    }),

  // Validate import data
  validateImportData: createProcedure
    .input(z.object({
      type: z.enum(['clients', 'services', 'products', 'suppliers']),
      data: z.array(z.record(z.string(), z.any())),
    }))
    .query(async ({ input }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];

        if (input.type === 'clients') {
          if (!row.companyName) {
            errors.push(`Row ${i + 1}: Company name is required`);
          }
          if (!row.email && !row.phone) {
            warnings.push(`Row ${i + 1}: No contact information provided`);
          }
        } else if (input.type === 'services') {
          if (!row.serviceName) {
            errors.push(`Row ${i + 1}: Service name is required`);
          }
        } else if (input.type === 'products') {
          if (!row.productName) {
            errors.push(`Row ${i + 1}: Product name is required`);
          }
        } else if (input.type === 'suppliers') {
          if (!row.companyName) {
            errors.push(`Row ${i + 1}: Company name is required`);
          }
          if (!row.email && !row.phone) {
            warnings.push(`Row ${i + 1}: No contact information provided`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        rowCount: input.data.length,
      };
    }),

  // Create Full Database Backup
  createBackup: createProcedure
    .query(async ({ ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Check admin permission
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can create backups" });
        }

        const backupData: any = {
          metadata: {
            version: '1.0',
            timestamp: new Date().toISOString(),
            userId: ctx.user.id,
            userEmail: ctx.user.email,
            environment: process.env.NODE_ENV || 'production',
          },
          data: {
            users: [],
            employees: [],
            departments: [],
            jobGroups: [],
            clients: [],
            suppliers: [],
            services: [],
            products: [],
            invoices: [],
            invoiceItems: [],
            estimates: [],
            estimateItems: [],
            receipts: [],
            expenses: [],
            payroll: [],
            recurringInvoices: [],
            bankAccounts: [],
            journalEntries: [],
            accounts: [],
            communicationLogs: [],
            auditLogs: [],
          },
          stats: {
            totalRecords: 0,
            tablesBackedUp: 0,
            backupSize: 0,
          },
        };

        // Backup all tables
        const tables = [
          { name: 'users', schema: users },
          { name: 'employees', schema: employees },
          { name: 'departments', schema: departments },
          { name: 'jobGroups', schema: jobGroups },
          { name: 'clients', schema: clients },
          { name: 'suppliers', schema: suppliers },
          { name: 'services', schema: services },
          { name: 'products', schema: products },
          { name: 'invoices', schema: invoices },
          { name: 'estimates', schema: estimates },
          { name: 'receipts', schema: receipts },
          { name: 'expenses', schema: expenses },
          { name: 'payroll', schema: payroll },
          { name: 'recurringInvoices', schema: recurringInvoices },
          { name: 'bankAccounts', schema: bankAccounts },
          { name: 'journalEntries', schema: journalEntries },
          { name: 'accounts', schema: accounts },
          { name: 'communicationLogs', schema: communicationLogs },
          { name: 'auditLogs', schema: auditLogs },
        ];

        for (const table of tables) {
          try {
            const records = await database.select().from(table.schema);
            backupData.data[table.name as keyof typeof backupData.data] = records;
            backupData.stats.totalRecords += records.length;
            backupData.stats.tablesBackedUp += 1;
          } catch (error: any) {
            // Table might not exist, skip it
            console.warn(`Warning: Could not backup table ${table.name}:`, error.message);
          }
        }

        // Calculate backup size
        const backupJson = JSON.stringify(backupData);
        backupData.stats.backupSize = new Blob([backupJson]).size;

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: 'database_backup_created',
          entityType: 'system',
          entityId: 'backup',
          description: `Database backup created with ${backupData.stats.totalRecords} records from ${backupData.stats.tablesBackedUp} tables`,
        });

        return {
          success: true,
          backup: backupData,
          fileName: `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create backup" });
      }
    }),

  // Restore Database from Backup
  restoreBackup: createProcedure
    .input(z.object({
      backupData: z.string(), // JSON string of backup data
      mode: z.enum(['merge', 'replace']).default('merge'), // merge: add new records, replace: clear and restore
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Check admin permission
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can restore backups" });
        }

        // Parse backup data
        let backup;
        try {
          backup = JSON.parse(input.backupData);
        } catch (e) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid backup file format" });
        }

        // Validate backup structure
        if (!backup.metadata || !backup.data || !backup.stats) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Backup file is missing required fields" });
        }

        const results = {
          restored: 0,
          skipped: 0,
          errors: [] as string[],
          tablesProcessed: 0,
        };

        // Restore data by table
        const tableConfigs: Array<{ name: string; schema: any; dataKey: keyof typeof backup.data }> = [
          { name: 'users', schema: users, dataKey: 'users' },
          { name: 'employees', schema: employees, dataKey: 'employees' },
          { name: 'departments', schema: departments, dataKey: 'departments' },
          { name: 'jobGroups', schema: jobGroups, dataKey: 'jobGroups' },
          { name: 'clients', schema: clients, dataKey: 'clients' },
          { name: 'suppliers', schema: suppliers, dataKey: 'suppliers' },
          { name: 'services', schema: services, dataKey: 'services' },
          { name: 'products', schema: products, dataKey: 'products' },
          { name: 'invoices', schema: invoices, dataKey: 'invoices' },
          { name: 'estimates', schema: estimates, dataKey: 'estimates' },
          { name: 'receipts', schema: receipts, dataKey: 'receipts' },
          { name: 'expenses', schema: expenses, dataKey: 'expenses' },
          { name: 'payroll', schema: payroll, dataKey: 'payroll' },
          { name: 'recurringInvoices', schema: recurringInvoices, dataKey: 'recurringInvoices' },
          { name: 'bankAccounts', schema: bankAccounts, dataKey: 'bankAccounts' },
          { name: 'journalEntries', schema: journalEntries, dataKey: 'journalEntries' },
          { name: 'accounts', schema: accounts, dataKey: 'accounts' },
          { name: 'communicationLogs', schema: communicationLogs, dataKey: 'communicationLogs' },
          { name: 'auditLogs', schema: auditLogs, dataKey: 'auditLogs' },
        ];

        for (const tableConfig of tableConfigs) {
          try {
            const records = backup.data[tableConfig.dataKey] || [];
            if (records.length === 0) continue;

            // For replace mode, clear table first (except users and system tables)
            if (input.mode === 'replace' && !['users', 'auditLogs'].includes(tableConfig.name)) {
              try {
                // Would need a raw delete for this, skipping for safety
                // await database.delete(tableConfig.schema);
              } catch (e) {
                // Skip delete error
              }
            }

            // Insert records
            for (const record of records) {
              try {
                // Skip certain fields for security
                const cleanRecord: any = { ...record };
                if (tableConfig.name === 'users') {
                  delete cleanRecord.password; // Don't restore passwords
                }

                await database.insert(tableConfig.schema).values(cleanRecord as any).catch(err => {
                  // Record might already exist in merge mode
                  if (input.mode === 'merge' && err.code === 'ER_DUP_ENTRY') {
                    results.skipped++;
                  } else {
                    throw err;
                  }
                });

                results.restored++;
              } catch (error: any) {
                if (input.mode === 'merge' && error?.code === 'ER_DUP_ENTRY') {
                  results.skipped++;
                } else {
                  results.errors.push(`${tableConfig.name}: ${error?.message || 'Unknown error'}`);
                }
              }
            }

            results.tablesProcessed++;
          } catch (error) {
            results.errors.push(`Failed to restore table ${tableConfig.name}: ${error}`);
          }
        }

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: 'database_backup_restored',
          entityType: 'system',
          entityId: 'backup',
          description: `Database backup restored: ${results.restored} records restored, ${results.skipped} skipped, ${results.errors.length} errors`,
        });

        return {
          success: results.errors.length === 0,
          results,
          message: `Restored ${results.restored} records from ${results.tablesProcessed} tables`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to restore backup" });
      }
    }),
});

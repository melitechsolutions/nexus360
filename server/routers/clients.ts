import { router, protectedProcedure, createFeatureRestrictedProcedure, orgScopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { clients, projects, invoices, contacts } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";
import * as bcrypt from "bcryptjs";
import { notifyOrg } from "../sse";
import { triggerEventNotification } from "./emailNotifications";
import { verifyOrgOwnership, enforceOrgScope } from "../middleware/orgIsolation";
import { TRPCError } from "@trpc/server";

const nullableIntFromInput = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  }

  return value;
}, z.number().int().nullable().optional());

const toNullableInt = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeOptionalString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const sanitizeClientPayload = <T extends Record<string, unknown>>(data: T) => {
  return {
    ...data,
    creditLimit: toNullableInt(data.creditLimit),
    numberOfEmployees: toNullableInt(data.numberOfEmployees),
    yearEstablished: toNullableInt(data.yearEstablished),
    assignedTo: normalizeOptionalString(data.assignedTo),
  };
};

/**
 * Generate a random password
 * @param length - Password length (default 12)
 * @returns Random password string
 */
function generatePassword(length: number = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = "";
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export const clientsRouter = router({
  list: createFeatureRestrictedProcedure("clients:read")
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const orgId = ctx.user.organizationId;
        const baseQuery = orgId
          ? database.select().from(clients).where(eq(clients.organizationId, orgId))
          : database.select().from(clients);

        const clientsList = await (baseQuery as any).limit(input?.limit || 50).offset(input?.offset || 0);
        
        // Fetch revenue data for each client
        const clientsWithRevenue = await Promise.all(
          clientsList.map(async (client: any) => {
            const clientInvoices = await database.select().from(invoices).where(eq(invoices.clientId, client.id));
            
            const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const paidRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
            const outstandingRevenue = totalRevenue - paidRevenue;
            
            return {
              ...client,
              name: client.companyName || undefined,
              accountManager: client.assignedTo || undefined,
              revenue: {
                totalRevenue,
                paidRevenue,
                outstandingRevenue,
                invoiceCount: clientInvoices.length,
              },
            };
          })
        );
        
        return clientsWithRevenue;
      } catch (error) {
        console.error("[Clients List Error]", error);
        return [];
      }
    }),

  getById: createFeatureRestrictedProcedure("clients:read")
    .input(z.string())
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return null;
        
        // STRICT: Get the specific client record
        const result = await database.select().from(clients).where(eq(clients.id, input)).limit(1);
        if (!result.length) return null;
        
        const client = result[0];
        
        // STRICT: Verify the user owns this client's organization
        verifyOrgOwnership(ctx, client.organizationId);
        
        const r = client as any;
        return {
          ...r,
          name: r.companyName || undefined,
          accountManager: r.assignedTo || undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Clients GetById Error]", error);
        return null;
      }
    }),

  create: createFeatureRestrictedProcedure("clients:create")
    .input(z.object({
      companyName: z.string(),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      taxId: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      status: z.enum(["active", "inactive", "prospect", "archived"]).optional(),
      notes: z.string().optional(),
      // Extended business fields
      businessType: z.string().optional(),
      registrationNumber: z.string().optional(),
      yearEstablished: nullableIntFromInput,
      numberOfEmployees: nullableIntFromInput,
      businessLicense: z.string().optional(),
      paymentTerms: z.string().optional(),
      creditLimit: nullableIntFromInput,
      bankName: z.string().optional(),
      bankCode: z.string().optional(),
      branch: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      currency: z.string().optional(),
      leadSource: z.string().optional(),
      secondaryPhone: z.string().optional(),
      assignedTo: z.string().optional(),
      createClientLogin: z.boolean().optional().default(false),
      clientPassword: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        const id = uuidv4();
        const { createClientLogin, clientPassword, ...clientData } = input;
        const sanitizedClientData = sanitizeClientPayload(clientData);
        
        // Create client record
        await database.insert(clients).values({
          id,
          ...sanitizedClientData,
          organizationId: ctx.user.organizationId ?? null,
          createdBy: ctx.user.id,
        });
        
        let generatedPassword = null;
        
        // If client login should be created
        if (createClientLogin && input.email) {
          // Generate password if not provided
          generatedPassword = clientPassword || generatePassword(12);
          
          // Hash the password
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(generatedPassword, salt);
          
          // Create user account for client
          const userId = `client_${id}`;
          await db.upsertUser({
            id: userId,
            email: input.email,
            name: input.contactPerson || input.companyName,
            role: "client",
            loginMethod: "local",
            lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
          
          // Store password hash
          await db.setUserPassword(userId, passwordHash);
        }

        // Auto-create contact from client data
        try {
          if (input.contactPerson || input.email) {
            const nameParts = (input.contactPerson || input.companyName).trim().split(/\s+/);
            const firstName = nameParts[0] || input.companyName;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
            await database.insert(contacts).values({
              id: uuidv4(),
              organizationId: ctx.user.organizationId ?? null,
              clientId: id,
              firstName,
              lastName: lastName || "-",
              email: input.email || null,
              phone: input.phone || null,
              mobile: input.secondaryPhone || null,
              isPrimary: 1,
              address: input.address || null,
              city: input.city || null,
              country: input.country || null,
              postalCode: input.postalCode || null,
              createdBy: ctx.user.id,
            });
          }
        } catch (contactErr) {
          console.error("[Clients] Auto-create contact failed:", contactErr);
        }

        // SSE: broadcast new client
        if (ctx.user.organizationId) {
          notifyOrg(ctx.user.organizationId, {
            id: `client-created-${id}`,
            type: "new_client",
            title: "New Client Added",
            body: `${input.companyName} has been added as a client`,
            href: `/org/${(ctx.user as any).organizationSlug || ''}/crm`,
            timestamp: new Date().toISOString(),
          });
        }

        // Email notification to creator
        try {
          if (ctx.user.email) {
            await triggerEventNotification({
              userId: ctx.user.id,
              eventType: "client_created",
              recipientEmail: ctx.user.email,
              recipientName: ctx.user.name,
              subject: `New Client Created: ${input.companyName}`,
              htmlContent: `<h2>New Client Added</h2><p>Client <strong>${input.companyName}</strong> has been created.</p>${input.contactPerson ? `<p><strong>Contact:</strong> ${input.contactPerson}</p>` : ''}${input.email ? `<p><strong>Email:</strong> ${input.email}</p>` : ''}<p><a href="/clients/${id}">View Client</a></p>`,
              entityType: "client",
              entityId: id,
              actionUrl: `/clients/${id}`,
            });
          }
        } catch (notifError) {
          console.error("[Clients] Failed to send email notification:", notifError);
        }
        
        return { 
          id,
          clientLoginCreated: createClientLogin && !!input.email,
          generatedPassword: generatedPassword,
          message: generatedPassword ? `Client account created. Password: ${generatedPassword}` : "Client created successfully"
        };
      } catch (error) {
        console.error("[Clients Create Error]", error);
        throw error;
      }
    }),

  update: createFeatureRestrictedProcedure("clients:edit")
    .input(z.object({
      id: z.string(),
      companyName: z.string().optional(),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      secondaryPhone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      taxId: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      businessType: z.string().optional(),
      registrationNumber: z.string().optional(),
      yearEstablished: nullableIntFromInput,
      numberOfEmployees: nullableIntFromInput,
      businessLicense: z.string().optional(),
      paymentTerms: z.string().optional(),
      creditLimit: nullableIntFromInput,
      bankName: z.string().optional(),
      bankCode: z.string().optional(),
      branch: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      currency: z.string().optional(),
      leadSource: z.string().optional(),
      status: z.enum(["active", "inactive", "prospect", "archived"]).optional(),
      assignedTo: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        const { id, ...data } = input;
        const sanitizedData = sanitizeClientPayload(data);
        
        // STRICT: Verify client exists and belongs to user's org
        const existing = await database.select({ organizationId: clients.organizationId }).from(clients).where(eq(clients.id, id)).limit(1);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        
        // STRICT: Verify org ownership
        verifyOrgOwnership(ctx, existing[0].organizationId);
        
        await database.update(clients).set(sanitizedData).where(eq(clients.id, id));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Clients Update Error]", error);
        throw error;
      }
    }),

  delete: createFeatureRestrictedProcedure("clients:delete")
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        // STRICT: Verify client exists and belongs to user's org
        const existing = await database.select({ organizationId: clients.organizationId }).from(clients).where(eq(clients.id, input)).limit(1);
        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        
        // STRICT: Verify org ownership
        verifyOrgOwnership(ctx, existing[0].organizationId);
        
        await database.delete(clients).where(eq(clients.id, input));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Clients Delete Error]", error);
        throw error;
      }
    }),

  bulkDelete: createFeatureRestrictedProcedure("clients:delete")
    .input(z.array(z.string()).min(1))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      // STRICT: Verify all clients belong to the user's org
      const existingClients = await database.select({ id: clients.id, organizationId: clients.organizationId }).from(clients).where(inArray(clients.id, input));
      
      for (const client of existingClients) {
        verifyOrgOwnership(ctx, client.organizationId);
      }
      
      // Only delete the clients that were verified
      const verifiedIds = existingClients.map(c => c.id);
      await database.delete(clients).where(inArray(clients.id, verifiedIds));
      return { success: true, count: verifiedIds.length };
    }),

  // Get client projects
  getProjects: createFeatureRestrictedProcedure("clients:read")
    .input(z.string())
    .query(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) return [];
        
        // STRICT: First verify client belongs to user's org
        const clientExists = await database.select({ organizationId: clients.organizationId }).from(clients).where(eq(clients.id, input)).limit(1);
        if (!clientExists.length) return [];
        
        verifyOrgOwnership(ctx, clientExists[0].organizationId);
        
        // Now safe to return projects
        const result = await database.select().from(projects).where(eq(projects.clientId, input));
        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Clients GetProjects Error]", error);
        return [];
      }
    }),

  // Get client revenue
  getRevenue: createFeatureRestrictedProcedure("clients:read")
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) return { totalRevenue: 0, paidRevenue: 0, outstandingRevenue: 0, invoices: [] };

        const clientInvoices = await database.select().from(invoices).where(eq(invoices.clientId, input));

        const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const paidRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const outstandingRevenue = totalRevenue - paidRevenue;

        return {
          totalRevenue,
          paidRevenue,
          outstandingRevenue,
          invoices: clientInvoices,
        };
      } catch (error) {
        console.error("[Clients GetRevenue Error]", error);
        return { totalRevenue: 0, paidRevenue: 0, outstandingRevenue: 0, invoices: [] };
      }
    }),

  // Get top clients by revenue
  getTopClients: createFeatureRestrictedProcedure("clients:read")
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) return [];

        const allClients = await database.select().from(clients);

        const clientsWithRevenue = await Promise.all(
          allClients.map(async (client) => {
            const clientInvoices = await database.select().from(invoices).where(eq(invoices.clientId, client.id));
            const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            return { ...client, totalRevenue } as any;
          })
        );

        return clientsWithRevenue
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, input?.limit || 10)
          .map((c: any) => ({
            ...c,
            name: c.companyName || undefined,
            accountManager: c.assignedTo || undefined,
          }));
      } catch (error) {
        console.error("[Clients GetTopClients Error]", error);
        return [];
      }
    }),

  // Get client by user ID (for client portal)
  getClientByUserId: protectedProcedure.query(async ({ ctx }) => {
    try {
      const database = await getDb();
      if (!database) return null;

      const result = await database.select().from(clients).where(eq(clients.createdBy, ctx.user.id)).limit(1);
      if (!result.length) return null;
      const r = result[0] as any;
      return {
        ...r,
        name: r.companyName || undefined,
        accountManager: r.assignedTo || undefined,
      };
    } catch (error) {
      console.error("[Clients GetClientByUserId Error]", error);
      return null;
    }
  }),

  // Create or update client login
  createClientLogin: createFeatureRestrictedProcedure("clients:create")
    .input(z.object({
      clientId: z.string(),
      email: z.string().email(),
      password: z.string().optional(),
      autoGenerate: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        // Verify client exists
        const clientRecord = await database.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
        if (!clientRecord.length) {
          throw new Error("Client not found");
        }

        // Generate password if not provided
        const password = input.password || (input.autoGenerate ? generatePassword(12) : null);
        if (!password) {
          throw new Error("Password required when autoGenerate is false");
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create or update user account
        const userId = `client_${input.clientId}`;
        const clientName = clientRecord[0].contactPerson || clientRecord[0].companyName;
        
        await db.upsertUser({
          id: userId,
          email: input.email,
          name: clientName,
          role: "client",
          loginMethod: "local",
          lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        // Store password hash
        await db.setUserPassword(userId, passwordHash);

        return {
          success: true,
          userId,
          email: input.email,
          password: input.autoGenerate ? password : undefined,
          message: input.autoGenerate ? `Client login created. Password: ${password}` : "Client login updated successfully"
        };
      } catch (error) {
        console.error("[Clients CreateClientLogin Error]", error);
        throw error;
      }
    }),
});

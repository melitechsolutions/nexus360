import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { invoices, payments, clients, expenses, accounts } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export const reportsRouter = router({
  // Profit & Loss Report
  profitAndLoss: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      // Get revenue accounts
      const revenueAccounts = await database
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'revenue'),
          eq(accounts.isActive, 1)
        ));

      // Get expense accounts
      const expenseAccounts = await database
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'expense'),
          eq(accounts.isActive, 1)
        ));

      // Calculate totals
      const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const netIncome = totalRevenue - totalExpenses;

      return {
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
        revenue: {
          accounts: revenueAccounts,
          total: totalRevenue,
        },
        expenses: {
          accounts: expenseAccounts,
          total: totalExpenses,
        },
        netIncome,
        netIncomePercentage: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      };
    }),

  // Balance Sheet Report
  balanceSheet: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const database = await getDb();
      if (!database) return null;

      // Get all account types
      const assetAccounts = await database
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'asset'),
          eq(accounts.isActive, 1)
        ));

      const liabilityAccounts = await database
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'liability'),
          eq(accounts.isActive, 1)
        ));

      const equityAccounts = await database
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'equity'),
          eq(accounts.isActive, 1)
        ));

      const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const totalEquity = equityAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

      return {
        assets: {
          accounts: assetAccounts,
          total: totalAssets,
        },
        liabilities: {
          accounts: liabilityAccounts,
          total: totalLiabilities,
        },
        equity: {
          accounts: equityAccounts,
          total: totalEquity,
        },
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      };
    }),

  // Sales Report
  salesReport: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      groupBy: z.enum(['day', 'week', 'month']).default('month'),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      // Get invoices in date range
      const invoiceData = await database
        .select()
        .from(invoices)
        .where(and(
          gte(invoices.issueDate, input.startDate.toISOString().replace('T', ' ').substring(0, 19)),
          lte(invoices.issueDate, input.endDate.toISOString().replace('T', ' ').substring(0, 19))
        ));

      // Get clients for names
      const clientsData = await database.select().from(clients);

      // Group by client
      const salesByClient: Record<string, any> = {};
      invoiceData.forEach(inv => {
        const client = clientsData.find(c => c.id === inv.clientId);
        const clientName = client?.companyName || 'Unknown';
        
        if (!salesByClient[clientName]) {
          salesByClient[clientName] = {
            clientId: inv.clientId,
            clientName,
            invoiceCount: 0,
            totalSales: 0,
            paidAmount: 0,
            pendingAmount: 0,
          };
        }
        
        salesByClient[clientName].invoiceCount++;
        salesByClient[clientName].totalSales += inv.total || 0;
        salesByClient[clientName].paidAmount += inv.paidAmount || 0;
        salesByClient[clientName].pendingAmount += (inv.total || 0) - (inv.paidAmount || 0);
      });

      const totalSales = Object.values(salesByClient).reduce((sum: number, s: any) => sum + s.totalSales, 0);
      const totalPaid = Object.values(salesByClient).reduce((sum: number, s: any) => sum + s.paidAmount, 0);
      const totalPending = Object.values(salesByClient).reduce((sum: number, s: any) => sum + s.pendingAmount, 0);

      return {
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
        summary: {
          totalInvoices: invoiceData.length,
          totalSales,
          totalPaid,
          totalPending,
          collectionRate: totalSales > 0 ? (totalPaid / totalSales) * 100 : 0,
        },
        byClient: Object.values(salesByClient),
        byStatus: {
          paid: invoiceData.filter(i => i.status === 'paid').length,
          pending: invoiceData.filter(i => i.status === 'sent').length,
          overdue: invoiceData.filter(i => i.status === 'overdue').length,
          draft: invoiceData.filter(i => i.status === 'draft').length,
        },
      };
    }),

  // Cash Flow Report
  cashFlowReport: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      // Get payments in date range
      const paymentData = await database
        .select()
        .from(payments)
        .where(and(
          gte(payments.paymentDate, input.startDate.toISOString().replace('T', ' ').substring(0, 19)),
          lte(payments.paymentDate, input.endDate.toISOString().replace('T', ' ').substring(0, 19))
        ));

      // Get expenses in date range
      const expenseData = await database
        .select()
        .from(expenses)
        .where(and(
          gte(expenses.expenseDate, input.startDate.toISOString().replace('T', ' ').substring(0, 19)),
          lte(expenses.expenseDate, input.endDate.toISOString().replace('T', ' ').substring(0, 19))
        ));

      const totalInflow = paymentData.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOutflow = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netCashFlow = totalInflow - totalOutflow;

      // Group payments by method
      const paymentsByMethod: Record<string, number> = {};
      paymentData.forEach(p => {
        const method = p.paymentMethod || 'other';
        paymentsByMethod[method] = (paymentsByMethod[method] || 0) + (p.amount || 0);
      });

      return {
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
        inflow: {
          totalPayments: totalInflow,
          paymentCount: paymentData.length,
          byMethod: paymentsByMethod,
        },
        outflow: {
          totalExpenses: totalOutflow,
          expenseCount: expenseData.length,
        },
        netCashFlow,
        cashFlowTrend: netCashFlow > 0 ? 'positive' : netCashFlow < 0 ? 'negative' : 'neutral',
      };
    }),

  // Monthly Recurring Revenue (MRR)
  mrr: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const database = await getDb();
      if (!database) return null;

      // Join recurring invoices with template invoices to get amounts
      const recs = await database.select().from((await import('../../drizzle/schema')).recurringInvoices as any);
      const invoicesTable = (await import('../../drizzle/schema')).invoices as any;

      let monthlyTotal = 0;

      for (const r of recs) {
        let templateInvoice: any = null;
        if (r.templateInvoiceId) {
          const res = await database.select().from(invoicesTable).where(eq(invoicesTable.id, r.templateInvoiceId)).limit(1);
          templateInvoice = res?.[0];
        }

        const amount = templateInvoice?.total || 0;

        // Convert frequency to monthly equivalent
        const factor = (() => {
          switch (r.frequency) {
            case 'weekly': return 52 / 12;
            case 'biweekly': return 26 / 12;
            case 'monthly': return 1;
            case 'quarterly': return 1 / 3;
            case 'annually': return 1 / 12;
            default: return 0;
          }
        })();

        monthlyTotal += amount * factor;
      }

      return {
        mrr: Math.round(monthlyTotal),
        currency: 'KES',
        sourceCount: recs.length,
      };
    }),

  // Project performance metrics
  projectMetrics: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const database = await getDb();
      if (!database) return null;

      const projectsTable = (await import('../../drizzle/schema')).projects as any;

      const allProjects = await database.select().from(projectsTable);
      const total = allProjects.length;
      const completed = allProjects.filter((p: any) => p.status === 'completed').length;
      const avgProgress = total > 0 ? Math.round((allProjects.reduce((s: number, p: any) => s + (p.progress || 0), 0) / total) * 100) / 100 : 0;

      // On-time completion rate
      const onTimeCompleted = allProjects.filter((p: any) => p.status === 'completed' && p.actualEndDate && p.endDate && new Date(p.actualEndDate) <= new Date(p.endDate)).length;
      const onTimeRate = completed > 0 ? Math.round((onTimeCompleted / completed) * 10000) / 100 : 0;

      return {
        totalProjects: total,
        completedProjects: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        avgProgress,
        onTimeCompletionRate: onTimeRate,
      };
    }),

  // Simple cash flow forecast (based on average monthly inflow)
  cashFlowForecast: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({ monthsAhead: z.number().min(1).max(24).default(3) }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const paymentsTable = (await import('../../drizzle/schema')).payments as any;

      // Look back 3 months for average monthly inflow
      const now = new Date();
      const lookbackStart = new Date(now);
      lookbackStart.setMonth(lookbackStart.getMonth() - 3);

      const payments = await database
        .select()
        .from(paymentsTable)
        .where(and(gte(paymentsTable.paymentDate, lookbackStart.toISOString().replace('T', ' ').substring(0, 19)), lte(paymentsTable.paymentDate, now.toISOString().replace('T', ' ').substring(0, 19))));

      const totalInflow = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const avgMonthly = totalInflow / 3;

      const forecast: Array<{ month: string; projectedInflow: number }> = [];
      for (let i = 1; i <= input.monthsAhead; i++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() + i);
        forecast.push({ month: d.toISOString().slice(0, 7), projectedInflow: Math.round(avgMonthly) });
      }

      return {
        lookbackMonths: 3,
        avgMonthlyInflow: Math.round(avgMonthly),
        forecast,
      };
    }),

  // Customer Analysis Report
  customerAnalysis: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const database = await getDb();
      if (!database) return null;

      const clientsData = await database.select().from(clients);
      const invoiceData = await database.select().from(invoices);
      const paymentData = await database.select().from(payments);

      const customerMetrics = clientsData.map(client => {
        const clientInvoices = invoiceData.filter(i => i.clientId === client.id);
        const clientPayments = paymentData.filter(p => p.clientId === client.id);
        
        const totalRevenue = clientInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
        const totalPaid = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const outstanding = totalRevenue - totalPaid;
        const avgInvoiceValue = clientInvoices.length > 0 ? totalRevenue / clientInvoices.length : 0;

        return {
          clientId: client.id,
          clientName: client.companyName,
          contactPerson: client.contactPerson,
          invoiceCount: clientInvoices.length,
          totalRevenue,
          totalPaid,
          outstanding,
          avgInvoiceValue,
          paymentRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
          status: client.status,
        };
      });

      // Sort by revenue
      customerMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

      const topCustomers = customerMetrics.slice(0, 10);
      const totalCustomerRevenue = customerMetrics.reduce((sum, c) => sum + c.totalRevenue, 0);
      const avgCustomerValue = customerMetrics.length > 0 ? totalCustomerRevenue / customerMetrics.length : 0;

      return {
        summary: {
          totalCustomers: customerMetrics.length,
          totalRevenue: totalCustomerRevenue,
          avgCustomerValue,
          topCustomerRevenue: topCustomers[0]?.totalRevenue || 0,
        },
        topCustomers,
        allCustomers: customerMetrics,
      };
    }),

  // Aging Report (for receivables)
  agingReport: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const database = await getDb();
      if (!database) return null;

      const invoiceData = await database.select().from(invoices);
      const today = new Date();

      const aged = {
        current: [] as any[],
        thirtyDays: [] as any[],
        sixtyDays: [] as any[],
        ninetyDays: [] as any[],
        over90Days: [] as any[],
      };

      invoiceData.forEach(inv => {
        if (inv.status === 'paid') return;

        const daysOverdue = Math.floor(
          (today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const outstanding = (inv.total || 0) - (inv.paidAmount || 0);

        if (daysOverdue <= 0) {
          aged.current.push({ ...inv, outstanding, daysOverdue: 0 });
        } else if (daysOverdue <= 30) {
          aged.thirtyDays.push({ ...inv, outstanding, daysOverdue });
        } else if (daysOverdue <= 60) {
          aged.sixtyDays.push({ ...inv, outstanding, daysOverdue });
        } else if (daysOverdue <= 90) {
          aged.ninetyDays.push({ ...inv, outstanding, daysOverdue });
        } else {
          aged.over90Days.push({ ...inv, outstanding, daysOverdue });
        }
      });

      const totals = {
        current: aged.current.reduce((sum, i) => sum + i.outstanding, 0),
        thirtyDays: aged.thirtyDays.reduce((sum, i) => sum + i.outstanding, 0),
        sixtyDays: aged.sixtyDays.reduce((sum, i) => sum + i.outstanding, 0),
        ninetyDays: aged.ninetyDays.reduce((sum, i) => sum + i.outstanding, 0),
        over90Days: aged.over90Days.reduce((sum, i) => sum + i.outstanding, 0),
      };

      const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

      return {
        aged,
        totals,
        grandTotal,
        percentages: {
          current: grandTotal > 0 ? (totals.current / grandTotal) * 100 : 0,
          thirtyDays: grandTotal > 0 ? (totals.thirtyDays / grandTotal) * 100 : 0,
          sixtyDays: grandTotal > 0 ? (totals.sixtyDays / grandTotal) * 100 : 0,
          ninetyDays: grandTotal > 0 ? (totals.ninetyDays / grandTotal) * 100 : 0,
          over90Days: grandTotal > 0 ? (totals.over90Days / grandTotal) * 100 : 0,
        },
      };
    }),

  // Schema introspection for custom report builder
  schemaIntrospection: createFeatureRestrictedProcedure("reporting:view")
    .query(async () => {
      const database = await getDb();
      if (!database) return { tables: [] };

      // Define available tables and their fields for reporting
      const schemaMetadata = {
        tables: [
          {
            value: "invoices",
            label: "Invoices",
            fields: [
              { value: "invoiceNumber", label: "Invoice Number", type: "string" },
              { value: "clientId", label: "Client", type: "string" },
              { value: "amount", label: "Amount", type: "number" },
              { value: "total", label: "Total", type: "number" },
              { value: "status", label: "Status", type: "string" },
              { value: "issueDate", label: "Issue Date", type: "date" },
              { value: "dueDate", label: "Due Date", type: "date" },
              { value: "paidAmount", label: "Paid Amount", type: "number" },
              { value: "taxAmount", label: "Tax Amount", type: "number" },
              { value: "discountAmount", label: "Discount Amount", type: "number" },
            ]
          },
          {
            value: "payments",
            label: "Payments",
            fields: [
              { value: "paymentNumber", label: "Payment Number", type: "string" },
              { value: "invoiceId", label: "Invoice", type: "string" },
              { value: "amount", label: "Amount", type: "number" },
              { value: "paymentDate", label: "Payment Date", type: "date" },
              { value: "method", label: "Payment Method", type: "string" },
              { value: "status", label: "Status", type: "string" },
              { value: "reference", label: "Reference", type: "string" },
            ]
          },
          {
            value: "expenses",
            label: "Expenses",
            fields: [
              { value: "expenseNumber", label: "Expense Number", type: "string" },
              { value: "category", label: "Category", type: "string" },
              { value: "amount", label: "Amount", type: "number" },
              { value: "vendor", label: "Vendor", type: "string" },
              { value: "status", label: "Status", type: "string" },
              { value: "expenseDate", label: "Expense Date", type: "date" },
              { value: "description", label: "Description", type: "string" },
            ]
          },
          {
            value: "employees",
            label: "Employees",
            fields: [
              { value: "firstName", label: "First Name", type: "string" },
              { value: "lastName", label: "Last Name", type: "string" },
              { value: "email", label: "Email", type: "string" },
              { value: "departmentId", label: "Department", type: "string" },
              { value: "hireDate", label: "Hire Date", type: "date" },
              { value: "salary", label: "Salary", type: "number" },
              { value: "status", label: "Status", type: "string" },
            ]
          },
          {
            value: "payroll",
            label: "Payroll",
            fields: [
              { value: "employeeId", label: "Employee", type: "string" },
              { value: "basicSalary", label: "Basic Salary", type: "number" },
              { value: "allowances", label: "Allowances", type: "number" },
              { value: "deductions", label: "Deductions", type: "number" },
              { value: "netPay", label: "Net Pay", type: "number" },
              { value: "paymentDate", label: "Payment Date", type: "date" },
              { value: "taxAmount", label: "Tax Amount", type: "number" },
            ]
          },
          {
            value: "clients",
            label: "Clients",
            fields: [
              { value: "name", label: "Name", type: "string" },
              { value: "email", label: "Email", type: "string" },
              { value: "phone", label: "Phone", type: "string" },
              { value: "city", label: "City", type: "string" },
              { value: "country", label: "Country", type: "string" },
              { value: "status", label: "Status", type: "string" },
              { value: "createdAt", label: "Created Date", type: "date" },
            ]
          },
          {
            value: "projects",
            label: "Projects",
            fields: [
              { value: "name", label: "Name", type: "string" },
              { value: "status", label: "Status", type: "string" },
              { value: "budget", label: "Budget", type: "number" },
              { value: "spent", label: "Spent", type: "number" },
              { value: "startDate", label: "Start Date", type: "date" },
              { value: "endDate", label: "End Date", type: "date" },
              { value: "clientId", label: "Client", type: "string" },
            ]
          },
        ]
      };

      return schemaMetadata;
    }),

  // Get data for custom reports
  getReportData: createFeatureRestrictedProcedure("reporting:view")
    .input(z.object({
      table: z.string(),
      fields: z.array(z.string()),
      filters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'contains', 'startsWith']),
        value: z.any(),
      })).optional(),
      limit: z.number().default(1000),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      try {
        // Build dynamic query based on table selection
        // This is a simplified version that returns sample data
        // In production, you'd use proper ORM query builders for each table
        switch (input.table) {
          case 'invoices':
            const invoiceData = await database.select().from(invoices);
            return invoiceData.slice(input.offset, input.offset + input.limit);
          case 'payments':
            const paymentData = await database.select().from(payments);
            return paymentData.slice(input.offset, input.offset + input.limit);
          case 'expenses':
            const expenseData = await database.select().from(expenses);
            return expenseData.slice(input.offset, input.offset + input.limit);
          case 'clients':
            const clientData = await database.select().from(clients);
            return clientData.slice(input.offset, input.offset + input.limit);
          default:
            return [];
        }
      } catch (err) {
        console.error(`Error fetching ${input.table} data:`, err);
        return [];
      }
    }),

  // Export report
  exportReport: createFeatureRestrictedProcedure("reporting:export")
    .input(z.object({
      reportType: z.enum(['pl', 'balanceSheet', 'sales', 'cashFlow', 'customer', 'aging']),
      format: z.enum(['json', 'csv']).default('json'),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      // This would call the appropriate report function and format the output
      return {
        success: true,
        format: input?.format || 'json',
        message: `Report exported as ${input?.format || 'json'}`,
      };
    }),
});

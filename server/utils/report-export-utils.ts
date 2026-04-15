/**
 * Utility functions for exporting financial reports in various formats
 */

import { getDb } from '../db';
import { invoices, expenses } from '../../drizzle/schema';
import { gte, lte } from 'drizzle-orm';
import { getCompanyInfo } from './company-info';

interface ReportConfig {
  title: string;
  startDate?: Date;
  endDate?: Date;
  includeDetails?: boolean;
}

interface FinancialData {
  invoiceData: any[];
  expenseData: any[];
  totalInvoiced: number;
  paidInvoices: number;
  outstandingAmount: number;
  totalExpenses: number;
  netProfit: number;
}

/**
 * Fetch financial data from database
 */
export async function fetchFinancialData(config: ReportConfig): Promise<FinancialData> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  try {
    // Fetch invoice data - select only necessary columns to reduce query load
    let invoicesQuery = db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      issueDate: invoices.issueDate,
    }).from(invoices);

    let expensesQuery = db.select({
      id: expenses.id,
      amount: expenses.amount,
      expenseDate: expenses.expenseDate,
      status: expenses.status,
    }).from(expenses);

    if (config.startDate) {
      invoicesQuery = invoicesQuery.where(gte(invoices.issueDate, config.startDate)) as any;
      expensesQuery = expensesQuery.where(gte(expenses.expenseDate, config.startDate)) as any;
    }

    if (config.endDate) {
      invoicesQuery = invoicesQuery.where(lte(invoices.issueDate, config.endDate)) as any;
      expensesQuery = expensesQuery.where(lte(expenses.expenseDate, config.endDate)) as any;
    }

    const invoiceData = await invoicesQuery;
    const expenseData = await expensesQuery;

    // Calculate metrics - use paidAmount field to reflect approved payments
    const totalInvoiced = invoiceData.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
    const paidInvoices = invoiceData
      .filter((inv: any) => inv.status === 'paid')
      .reduce((sum, inv: any) => sum + (inv.total || 0), 0);
    // Outstanding = Total - Paid amounts (better reflects actual receivables)
    const outstandingAmount = invoiceData.reduce((sum, inv: any) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
    const totalExpenses = expenseData.reduce((sum, exp: any) => sum + (exp.amount || 0), 0);
    const netProfit = totalInvoiced - totalExpenses;

    return {
      invoiceData,
      expenseData,
      totalInvoiced,
      paidInvoices,
      outstandingAmount,
      totalExpenses,
      netProfit,
    };
  } catch (error) {
    console.error("Error fetching financial data:", error);
    throw new Error(`Failed to fetch financial data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount / 100);
};

/**
 * Generate financial report as CSV
 */
export async function generateFinancialReportCSV(config: ReportConfig): Promise<Buffer> {
  const data = await fetchFinancialData(config);
  const companyInfo = await getCompanyInfo();

  let csv = '';

  // Add header
  csv += `${companyInfo.name} - Financial Report\n`;
  csv += `Report: ${config.title}\n`;
  const periodText =
    config.startDate && config.endDate
      ? `Period: ${config.startDate.toLocaleDateString()} - ${config.endDate.toLocaleDateString()}`
      : 'Period: All Time';
  csv += `${periodText}\n`;
  csv += `Generated: ${new Date().toLocaleDateString()}\n`;
  csv += '\n';

  // Add financial summary
  csv += 'FINANCIAL SUMMARY\n';
  csv += 'Metric,Amount\n';
  csv += `Total Revenue,"${formatCurrency(data.totalInvoiced)}"\n`;
  csv += `Paid Invoices,"${formatCurrency(data.paidInvoices)}"\n`;
  csv += `Outstanding Receivables,"${formatCurrency(data.outstandingAmount)}"\n`;
  csv += `Total Expenses,"${formatCurrency(data.totalExpenses)}"\n`;
  csv += `Net Profit,"${formatCurrency(data.netProfit)}"\n`;
  csv += '\n';

  // Add invoice details if requested
  if (config.includeDetails && data.invoiceData.length > 0) {
    csv += 'INVOICE DETAILS\n';
    csv += 'Invoice #,Client,Date,Amount,Status\n';
    data.invoiceData.forEach((inv: any) => {
      csv += `"${inv.invoiceNumber || 'N/A'}","Client ${inv.clientId ? inv.clientId.substring(0, 8) : 'N/A'}","${new Date(inv.issueDate).toLocaleDateString()}","${formatCurrency(inv.total || 0)}","${inv.status || 'pending'}"\n`;
    });
    csv += '\n';
  }

  // Add expense details if requested
  if (config.includeDetails && data.expenseData.length > 0) {
    csv += 'EXPENSE DETAILS\n';
    csv += 'Description,Category,Amount,Date,Status\n';
    data.expenseData.forEach((exp: any) => {
      csv += `"${exp.description || 'N/A'}","${exp.category || 'N/A'}","${formatCurrency(exp.amount || 0)}","${new Date(exp.expenseDate).toLocaleDateString()}","${exp.status || 'pending'}"\n`;
    });
  }

  return Buffer.from(csv, 'utf-8');
}

/**
 * Generate financial report as TXT
 */
export async function generateFinancialReportTXT(config: ReportConfig): Promise<Buffer> {
  const data = await fetchFinancialData(config);
  const companyInfo = await getCompanyInfo();

  let txt = '';

  // Add header
  const headerLine = '═'.repeat(70);
  txt += `${headerLine}\n`;
  txt += `${companyInfo.name.toUpperCase()} - FINANCIAL REPORT\n`;
  txt += `${headerLine}\n\n`;

  txt += `Report: ${config.title}\n`;
  const periodText =
    config.startDate && config.endDate
      ? `Period: ${config.startDate.toLocaleDateString()} - ${config.endDate.toLocaleDateString()}`
      : 'Period: All Time';
  txt += `${periodText}\n`;
  txt += `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;

  // Add financial summary
  txt += `${'─'.repeat(70)}\n`;
  txt += 'FINANCIAL SUMMARY\n';
  txt += `${'─'.repeat(70)}\n`;
  txt += `Total Revenue:              ${formatCurrency(data.totalInvoiced).padEnd(20)}\n`;
  txt += `Paid Invoices:              ${formatCurrency(data.paidInvoices).padEnd(20)}\n`;
  txt += `Outstanding Receivables:    ${formatCurrency(data.outstandingAmount).padEnd(20)}\n`;
  txt += `Total Expenses:             ${formatCurrency(data.totalExpenses).padEnd(20)}\n`;
  txt += `${'─'.repeat(70)}\n`;
  txt += `Net Profit:                 ${formatCurrency(data.netProfit).padEnd(20)}\n`;
  txt += `${headerLine}\n\n`;

  // Add invoice details if requested
  if (config.includeDetails && data.invoiceData.length > 0) {
    txt += `${'─'.repeat(70)}\n`;
    txt += 'INVOICE DETAILS\n';
    txt += `${'─'.repeat(70)}\n`;
    txt += `${`Invoice #`.padEnd(15)} | ${'Client'.padEnd(15)} | ${'Date'.padEnd(12)} | ${'Amount'.padEnd(15)} | Status\n`;
    txt += `${'-'.repeat(15)} | ${'-'.repeat(15)} | ${'-'.repeat(12)} | ${'-'.repeat(15)} | ${'-'.repeat(10)}\n`;
    data.invoiceData.slice(0, 50).forEach((inv: any) => {
      const invNum = (inv.invoiceNumber || 'N/A').substring(0, 14).padEnd(15);
      const client = `Client ${inv.clientId ? inv.clientId.substring(0, 8) : 'N/A'}`.padEnd(15);
      const date = new Date(inv.issueDate).toLocaleDateString().padEnd(12);
      const amount = formatCurrency(inv.total || 0).padEnd(15);
      const status = (inv.status || 'pending').padEnd(10);
      txt += `${invNum} | ${client} | ${date} | ${amount} | ${status}\n`;
    });
    txt += '\n';
  }

  // Add expense details if requested
  if (config.includeDetails && data.expenseData.length > 0) {
    txt += `${'─'.repeat(70)}\n`;
    txt += 'EXPENSE DETAILS\n';
    txt += `${'─'.repeat(70)}\n`;
    txt += `${'Description'.padEnd(25)} | ${'Category'.padEnd(15)} | ${'Amount'.padEnd(15)} | ${'Date'.padEnd(12)} | Status\n`;
    txt += `${'-'.repeat(25)} | ${'-'.repeat(15)} | ${'-'.repeat(15)} | ${'-'.repeat(12)} | ${'-'.repeat(10)}\n`;
    data.expenseData.slice(0, 50).forEach((exp: any) => {
      const desc = (exp.description || 'N/A').substring(0, 24).padEnd(25);
      const category = (exp.category || 'N/A').substring(0, 14).padEnd(15);
      const amount = formatCurrency(exp.amount || 0).padEnd(15);
      const date = new Date(exp.expenseDate).toLocaleDateString().padEnd(12);
      const status = (exp.status || 'pending').padEnd(10);
      txt += `${desc} | ${category} | ${amount} | ${date} | ${status}\n`;
    });
    txt += '\n';
  }

  txt += `${headerLine}\n`;
  txt += 'End of Report\n';
  txt += `${headerLine}\n`;

  return Buffer.from(txt, 'utf-8');
}

/**
 * Generate financial report as JSON
 */
export async function generateFinancialReportJSON(config: ReportConfig): Promise<Buffer> {
  const data = await fetchFinancialData(config);

  const reportData = {
    title: config.title,
    generated: new Date().toISOString(),
    period: {
      startDate: config.startDate?.toISOString() || 'all',
      endDate: config.endDate?.toISOString() || 'all',
    },
    summary: {
      totalRevenue: data.totalInvoiced,
      paidInvoices: data.paidInvoices,
      outstandingReceivables: data.outstandingAmount,
      totalExpenses: data.totalExpenses,
      netProfit: data.netProfit,
    },
    invoices: config.includeDetails ? data.invoiceData : undefined,
    expenses: config.includeDetails ? data.expenseData : undefined,
  };

  return Buffer.from(JSON.stringify(reportData, null, 2), 'utf-8');
}

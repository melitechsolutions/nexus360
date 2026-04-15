import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDb } from '../db';
import { invoices, expenses } from '../../drizzle/schema';
import { gte, lte } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { getCompanyInfo } from './company-info';

interface ReportConfig {
  title: string;
  startDate?: Date;
  endDate?: Date;
  includeDetails?: boolean;
}

/**
 * Generate a financial report PDF buffer
 * @param config - Report configuration options
 * @returns Buffer containing the PDF data
 */
export async function generateFinancialReportPDF(config: ReportConfig): Promise<Buffer> {
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

    // Calculate metrics - use paid status instead to reflect approved payments
    const totalInvoiced = invoiceData.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
    const paidInvoices = invoiceData
      .filter((inv: any) => inv.status === 'paid')
      .reduce((sum, inv: any) => sum + (inv.total || 0), 0);
    // Outstanding = Total - Paid (better represents actual outstanding)
    const outstandingAmount = invoiceData.reduce((sum, inv: any) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
    const totalExpenses = expenseData.reduce((sum, exp: any) => sum + (exp.amount || 0), 0);
    const netProfit = totalInvoiced - totalExpenses;

    // Create PDF document
    const doc = new jsPDF();

    // Set font
    doc.setFont('helvetica');

    const companyInfo = await getCompanyInfo();

    // Add company header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(companyInfo.name, 20, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Financial Report', 20, 28);
  
  // Add report title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(config.title, 20, 40);

  // Add report period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const periodText = config.startDate && config.endDate 
    ? `Period: ${config.startDate.toLocaleDateString()} - ${config.endDate.toLocaleDateString()}`
    : 'Period: All Time';
  doc.text(periodText, 20, 48);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 54);

  // Add summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Financial Summary', 20, 70);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount / 100);
  };

  const summaryData = [
    ['Total Revenue', formatCurrency(totalInvoiced)],
    ['Paid Invoices', formatCurrency(paidInvoices)],
    ['Outstanding Receivables', formatCurrency(outstandingAmount)],
    ['Total Expenses', formatCurrency(totalExpenses)],
    ['Net Profit', formatCurrency(netProfit)],
  ];

  autoTable(doc, {
    startY: 76,
    head: [['Metric', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 70, halign: 'right' },
    },
  });

  // Add invoice details if requested
  if (config.includeDetails && invoiceData.length > 0) {
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Invoice Details', 20, currentY);

    const invoiceTableData = invoiceData.slice(0, 20).map((inv: any) => [
      inv.invoiceNumber || 'N/A',
      inv.clientId ? `Client ${inv.clientId.substring(0, 8)}` : 'N/A',
      new Date(inv.issueDate).toLocaleDateString(),
      formatCurrency(inv.total || 0),
      inv.status || 'pending',
    ]);

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Invoice #', 'Client', 'Date', 'Amount', 'Status']],
      body: invoiceTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 55 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 25 },
      },
    });
  }

  // Add footer
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);
    doc.text('Confidential - For Authorized Use Only', 20, doc.internal.pageSize.getHeight() - 10);
  }

  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error("Error generating financial report PDF:", error);
    throw new Error(`Failed to generate financial report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate an expense report PDF buffer
 * @param config - Report configuration options
 * @returns Buffer containing the PDF data
 */
export async function generateExpenseReportPDF(config: ReportConfig): Promise<Buffer> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Fetch expense data
  let expensesQuery = db.select().from(expenses);

  if (config.startDate) {
    expensesQuery = expensesQuery.where(gte(expenses.expenseDate, config.startDate)) as any;
  }

  if (config.endDate) {
    expensesQuery = expensesQuery.where(lte(expenses.expenseDate, config.endDate)) as any;
  }

  const expenseData = await expensesQuery;

  // Calculate metrics
  const totalExpenses = expenseData.reduce((sum, exp: any) => sum + (exp.amount || 0), 0);
  const expensesByCategory: Record<string, number> = {};
  
  expenseData.forEach((exp: any) => {
    const category = exp.category || 'Uncategorized';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + (exp.amount || 0);
  });

  // Create PDF document
  const doc = new jsPDF();

  // Set font
  doc.setFont('helvetica');

  const companyInfo = await getCompanyInfo();

  // Add company header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(companyInfo.name, 20, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Expense Report', 20, 28);

  // Add report title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(config.title, 20, 40);

  // Add report period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const periodText = config.startDate && config.endDate 
    ? `Period: ${config.startDate.toLocaleDateString()} - ${config.endDate.toLocaleDateString()}`
    : 'Period: All Time';
  doc.text(periodText, 20, 48);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 54);

  // Add summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Expense Summary', 20, 70);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount / 100);
  };

  const summaryData = [
    ['Total Expenses', formatCurrency(totalExpenses)],
    ['Number of Expenses', String(expenseData.length)],
    ['Average Expense', expenseData.length > 0 ? formatCurrency(totalExpenses / expenseData.length) : 'Ksh 0'],
  ];

  autoTable(doc, {
    startY: 76,
    head: [['Metric', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 70, halign: 'right' },
    },
  });

  // Add category breakdown if requested
  if (config.includeDetails && Object.keys(expensesByCategory).length > 0) {
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Expenses by Category', 20, currentY);

    const categoryTableData = Object.entries(expensesByCategory).map(([category, amount]) => [
      category,
      formatCurrency(amount),
      totalExpenses > 0 ? `${((amount / totalExpenses) * 100).toFixed(1)}%` : '0%',
    ]);

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
      },
    });
  }

  // Add footer
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);
    doc.text('Confidential - For Authorized Use Only', 20, doc.internal.pageSize.getHeight() - 10);
  }

  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
}

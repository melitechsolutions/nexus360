/**
 * Template-based PDF/HTML renderer for documents
 * Fetches the default (or specified) document template from documentTemplates table,
 * binds actual DB data, and returns rendered HTML for PDF/print rendering.
 */

import { getDb, getPool } from '../db';
import { invoices, invoiceItems, clients, settings, receipts, lineItems } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Map document type to template type name in documentTemplates table
const TYPE_MAP: Record<string, string> = {
  invoice: 'invoice',
  receipt: 'receipt',
  estimate: 'estimate',
  quotation: 'quotation',
  credit_note: 'credit_note',
  debit_note: 'debit_note',
  lpo: 'lpo',
  grn: 'grn',
  delivery_note: 'delivery_note',
  order: 'order',
  imprest: 'imprest',
  expense_claim: 'expense_claim',
  service_invoice: 'service_invoice',
  work_order: 'work_order',
  asset: 'asset',
};

// Map document type to fallback HTML template file
const TEMPLATE_FILE_MAP: Record<string, string> = {
  invoice: 'Invoice-template.html',
  receipt: 'receipt-template.html',
  estimate: 'estimate-template.html',
  quotation: 'quotation-rfq-template.html',
  credit_note: 'credit-note-template.html',
  debit_note: 'debit-note-template.html',
  lpo: 'lpo-template.html',
  grn: 'grn-template.html',
  delivery_note: 'dn-template.html',
  order: 'order-template.html',
  imprest: 'imprest-template.html',
  expense_claim: 'expense-claim-template.html',
  service_invoice: 'service-invoice-template.html',
  work_order: 'work-order-template.html',
  asset: 'assets-template.html',
};

interface RenderResult {
  html: string;
  title: string;
}

/**
 * Get template HTML content: from DB (default template) or fallback to file system
 */
async function getTemplateContent(documentType: string, organizationId?: string | null, templateId?: string): Promise<string | null> {
  const pool = getPool();
  if (!pool) return null;

  const type = TYPE_MAP[documentType] || documentType;

  // 1. If specific templateId provided, use it
  if (templateId) {
    const [rows] = organizationId
      ? await pool.query("SELECT content FROM documentTemplates WHERE id = ? AND organizationId = ?", [templateId, organizationId])
      : await pool.query("SELECT content FROM documentTemplates WHERE id = ?", [templateId]);
    const arr = rows as any[];
    if (arr.length) return arr[0].content;
  }

  // 2. Try default template for this type+org
  if (organizationId) {
    const [rows] = await pool.query(
      "SELECT content FROM documentTemplates WHERE type = ? AND organizationId = ? AND isDefault = 1 LIMIT 1",
      [type, organizationId]
    );
    const arr = rows as any[];
    if (arr.length) return arr[0].content;
  }

  // 3. Try any default template for this type
  const [rows] = await pool.query(
    "SELECT content FROM documentTemplates WHERE type = ? AND isDefault = 1 LIMIT 1",
    [type]
  );
  const arr = rows as any[];
  if (arr.length) return arr[0].content;

  // 4. Try first template of this type
  const [first] = organizationId
    ? await pool.query("SELECT content FROM documentTemplates WHERE type = ? AND organizationId = ? ORDER BY createdAt ASC LIMIT 1", [type, organizationId])
    : await pool.query("SELECT content FROM documentTemplates WHERE type = ? ORDER BY createdAt ASC LIMIT 1", [type]);
  const firstArr = first as any[];
  if (firstArr.length) return firstArr[0].content;

  // 5. Final fallback: load from file system
  const templateFile = TEMPLATE_FILE_MAP[documentType];
  if (templateFile) {
    const filePath = path.resolve(process.cwd(), 'templates', templateFile);
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Fetch common company info from settings
 */
async function fetchCompanyInfo(db: any): Promise<Record<string, string>> {
  const companyRows = await db.select().from(settings).where(eq(settings.category, 'company'));
  const company: Record<string, string> = {};
  companyRows.forEach((s: any) => { if (s.key) company[s.key] = s.value ?? ''; });
  return company;
}

/**
 * Fetch payment settings (bank + mpesa)
 */
async function fetchPaymentSettings(db: any): Promise<{ bank: Record<string, string>; mpesa: Record<string, string> }> {
  const bankRows = await db.select().from(settings).where(eq(settings.category, 'payment_bank'));
  const bank: Record<string, string> = {};
  bankRows.forEach((s: any) => { if (s.key) bank[s.key] = s.value ?? ''; });

  const mpesaRows = await db.select().from(settings).where(eq(settings.category, 'payment_mpesa'));
  const mpesa: Record<string, string> = {};
  mpesaRows.forEach((s: any) => { if (s.key) mpesa[s.key] = s.value ?? ''; });

  return { bank, mpesa };
}

/**
 * Fetch currency setting
 */
async function fetchCurrency(db: any): Promise<string> {
  const currRows = await db.select().from(settings).where(eq(settings.category, 'currency'));
  const currMap: Record<string, string> = {};
  currRows.forEach((s: any) => { if (s.key) currMap[s.key] = s.value ?? ''; });
  return currMap.code || currMap.symbol || 'KES';
}

/**
 * Fetch invoice terms from settings
 */
async function fetchInvoiceTerms(db: any): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.category, 'invoice_settings'));
  const map: Record<string, string> = {};
  rows.forEach((s: any) => { if (s.key) map[s.key] = s.value ?? ''; });
  return map.termsAndConditions || '';
}

/**
 * Bind data to template HTML by replacing placeholders
 */
function bindDataToTemplate(html: string, data: Record<string, any>): string {
  let result = html;

  // Replace ${companyInfo.*} placeholders
  if (data.companyInfo) {
    result = result.replace(/\$\{companyInfo\.(\w+)\}/g, (_m: string, key: string) => {
      return data.companyInfo[key] || '';
    });
  }

  // Replace [PLACEHOLDER] format
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && typeof value !== 'object') {
      const placeholder = `[${key}]`;
      result = result.split(placeholder).join(String(value));
    }
  }

  // Replace {{placeholder}} format (used by DocumentTemplates.tsx editor)
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && typeof value !== 'object') {
      const placeholder = `{{${key}}}`;
      result = result.split(placeholder).join(String(value));
    }
  }

  return result;
}

/**
 * Build line items HTML table rows
 */
function buildLineItemsTable(items: any[], currency: string): string {
  if (!items.length) return '<tr><td colspan="4" style="text-align:center;padding:12px;color:#636e72;">No line items</td></tr>';

  return items.map((item, index) => {
    const qty = item.quantity ?? 1;
    const unitPrice = (item.unitPrice ?? item.rate ?? 0) / 100;
    const total = (item.total ?? item.amount ?? 0) / 100;
    const desc = item.description || item.itemType || `Item ${index + 1}`;
    return `<tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9;">${desc}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9; text-align: center;">${qty}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9; text-align: right;">${currency} ${unitPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9; text-align: right;">${currency} ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('\n');
}

/**
 * Render an invoice using the document template
 */
export async function renderInvoiceTemplate(invoiceId: string, organizationId?: string | null, templateId?: string): Promise<RenderResult | null> {
  const db = await getDb();
  if (!db) return null;

  // Fetch invoice
  const invoiceData = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoiceData.length) return null;
  const invoice = invoiceData[0];

  // Fetch client
  const clientData = await db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1);
  const client = clientData.length ? clientData[0] : null;

  // Fetch line items
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

  // Fetch settings
  const company = await fetchCompanyInfo(db);
  const payment = await fetchPaymentSettings(db);
  const currency = await fetchCurrency(db);
  const defaultTerms = await fetchInvoiceTerms(db);

  // Get template
  const templateHtml = await getTemplateContent('invoice', organizationId, templateId);
  if (!templateHtml) return null;

  const formatDate = (d: any) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return String(d); }
  };

  const formatAmount = (amt: any) => {
    const n = (Number(amt) || 0) / 100;
    return `${currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  // Build items table HTML
  const itemsTableRows = buildLineItemsTable(items, currency);
  const itemsTableHtml = `<table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #2d3436; color: #fff;">
        <th style="padding: 10px 12px; text-align: left; font-weight: 600;">Description</th>
        <th style="padding: 10px 12px; text-align: center; font-weight: 600;">Qty</th>
        <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Unit Price</th>
        <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemsTableRows}</tbody>
  </table>`;

  // Build totals section
  const subtotal = (Number(invoice.subtotal) || 0) / 100;
  const taxAmount = (Number(invoice.taxAmount) || 0) / 100;
  const discountAmount = (Number(invoice.discountAmount) || 0) / 100;
  const total = (Number(invoice.total) || 0) / 100;

  const totalsHtml = `
    <div style="margin-top: 16px; text-align: right;">
      <div style="margin: 4px 0;"><strong>Subtotal:</strong> ${currency} ${subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
      ${taxAmount > 0 ? `<div style="margin: 4px 0;"><strong>Tax:</strong> ${currency} ${taxAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>` : ''}
      ${discountAmount > 0 ? `<div style="margin: 4px 0;"><strong>Discount:</strong> -${currency} ${discountAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>` : ''}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 2px solid #ff9f43; font-size: 18px; font-weight: 700; color: #ff9f43;">
        Total: ${currency} ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
      </div>
    </div>`;

  // Build payment instructions
  const paymentHtml = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
    <div style="background: #f8f9fa; padding: 12px; border-radius: 4px;">
      <strong style="display: block; margin-bottom: 6px;">Bank Details</strong>
      ${payment.bank.bankName ? `<div>Bank: ${payment.bank.bankName}</div>` : ''}
      ${payment.bank.branch ? `<div>Branch: ${payment.bank.branch}</div>` : ''}
      ${payment.bank.accountNumber ? `<div>Account: ${payment.bank.accountNumber}</div>` : ''}
      ${payment.bank.accountName ? `<div>Name: ${payment.bank.accountName}</div>` : ''}
    </div>
    <div style="background: #f8f9fa; padding: 12px; border-radius: 4px;">
      <strong style="display: block; margin-bottom: 6px;">M-Pesa Payment</strong>
      ${payment.mpesa.paybillNumber ? `<div>Paybill: ${payment.mpesa.paybillNumber}</div>` : ''}
      ${payment.mpesa.accountNumber ? `<div>Account: ${payment.mpesa.accountNumber}</div>` : ''}
    </div>
  </div>`;

  // Bind all data
  const boundHtml = bindDataToTemplate(templateHtml, {
    companyInfo: company,
    // Document details
    INVOICE_NUMBER: invoice.invoiceNumber,
    invoice_number: invoice.invoiceNumber,
    DATE_ISSUED: formatDate(invoice.issueDate),
    date_issued: formatDate(invoice.issueDate),
    DUE_DATE: formatDate(invoice.dueDate),
    due_date: formatDate(invoice.dueDate),
    STATUS: invoice.status?.toUpperCase() || 'DRAFT',
    TAX_RATE: invoice.taxAmount ? `${((Number(invoice.taxAmount) / Number(invoice.subtotal)) * 100).toFixed(1)}%` : '0%',
    // Client/Payer details
    CLIENT_NAME: client?.companyName || client?.contactPerson || '',
    client_name: client?.companyName || client?.contactPerson || '',
    COMPANY_NAME: client?.companyName || '',
    CLIENT_EMAIL: client?.email || '',
    client_email: client?.email || '',
    CLIENT_PHONE: client?.phone || '',
    client_phone: client?.phone || '',
    CLIENT_ADDRESS: client?.address || '',
    client_address: client?.address || '',
    CONTACT_PERSON: client?.contactPerson || '',
    // Amounts
    SUBTOTAL: formatAmount(invoice.subtotal),
    TAX_AMOUNT: formatAmount(invoice.taxAmount),
    DISCOUNT: formatAmount(invoice.discountAmount),
    TOTAL: formatAmount(invoice.total),
    PAID_AMOUNT: formatAmount(invoice.paidAmount),
    BALANCE_DUE: formatAmount((Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0)),
    // Table
    ITEMS_TABLE: itemsTableHtml,
    items_table: itemsTableHtml,
    LINE_ITEMS: itemsTableHtml,
    // Totals section
    TOTALS_SECTION: totalsHtml,
    // Payment
    PAYMENT_INSTRUCTIONS: paymentHtml,
    BANK_NAME: payment.bank.bankName || '',
    BANK_BRANCH: payment.bank.branch || '',
    BANK_ACCOUNT: payment.bank.accountNumber || '',
    BANK_ACCOUNT_NAME: payment.bank.accountName || '',
    MPESA_PAYBILL: payment.mpesa.paybillNumber || '',
    MPESA_ACCOUNT: payment.mpesa.accountNumber || '',
    // Terms & Notes
    NOTES: invoice.notes || '',
    TERMS: invoice.terms || defaultTerms || '',
    TERMS_AND_CONDITIONS: invoice.terms || defaultTerms || '',
    // Footer
    FOOTER_TEXT: `This is a system generated invoice. For inquiries, contact ${company.email || ''}`,
  });

  return {
    html: boundHtml,
    title: `Invoice ${invoice.invoiceNumber}`,
  };
}

/**
 * Render a receipt using the document template
 */
export async function renderReceiptTemplate(receiptId: string, organizationId?: string | null, templateId?: string): Promise<RenderResult | null> {
  const db = await getDb();
  if (!db) return null;

  const receiptData = await db.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1);
  if (!receiptData.length) return null;
  const receipt = receiptData[0];

  const clientData = await db.select().from(clients).where(eq(clients.id, receipt.clientId)).limit(1);
  const client = clientData.length ? clientData[0] : null;

  const items = await db.select().from(lineItems).where(
    and(eq(lineItems.documentId, receiptId), eq(lineItems.documentType, 'receipt'))
  );

  const company = await fetchCompanyInfo(db);
  const currency = await fetchCurrency(db);

  const templateHtml = await getTemplateContent('receipt', organizationId, templateId);
  if (!templateHtml) return null;

  const formatDate = (d: any) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return String(d); }
  };

  const amount = (Number(receipt.amount) || 0) / 100;
  const formatAmount = (amt: any) => {
    const n = (Number(amt) || 0) / 100;
    return `${currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const itemsTableRows = items.length ? items.map((item: any, index: number) => {
    const qty = item.quantity ?? 1;
    const rate = (item.rate ?? 0) / 100;
    const total = (item.amount ?? 0) / 100;
    return `<tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9;">${item.description || `Item ${index + 1}`}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9; text-align: center;">${qty}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9; text-align: right;">${currency} ${rate.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #dfe6e9; text-align: right;">${currency} ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('\n') : `<tr><td colspan="4" style="text-align:center;padding:12px;">Payment received - ${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>`;

  const boundHtml = bindDataToTemplate(templateHtml, {
    companyInfo: company,
    RECEIPT_NUMBER: receipt.receiptNumber,
    receipt_number: receipt.receiptNumber,
    RECEIPT_DATE: formatDate(receipt.receiptDate),
    receipt_date: formatDate(receipt.receiptDate),
    PAYMENT_METHOD: receipt.paymentMethod?.replace(/_/g, ' ').toUpperCase() || '',
    payment_method: receipt.paymentMethod?.replace(/_/g, ' ') || '',
    AMOUNT: `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
    amount: `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
    CLIENT_NAME: client?.companyName || client?.contactPerson || '',
    client_name: client?.companyName || client?.contactPerson || '',
    CLIENT_EMAIL: client?.email || '',
    CLIENT_PHONE: client?.phone || '',
    CLIENT_ADDRESS: client?.address || '',
    ITEMS_TABLE: `<table style="width: 100%; border-collapse: collapse;">
      <thead><tr style="background: #2d3436; color: #fff;">
        <th style="padding: 10px 12px; text-align: left;">Description</th>
        <th style="padding: 10px 12px; text-align: center;">Qty</th>
        <th style="padding: 10px 12px; text-align: right;">Rate</th>
        <th style="padding: 10px 12px; text-align: right;">Amount</th>
      </tr></thead>
      <tbody>${itemsTableRows}</tbody></table>`,
    items_table: `<table style="width: 100%; border-collapse: collapse;"><tbody>${itemsTableRows}</tbody></table>`,
    NOTES: receipt.notes || '',
    FOOTER_TEXT: `This is a system generated receipt. For inquiries, contact ${company.email || ''}`,
  });

  return {
    html: boundHtml,
    title: `Receipt ${receipt.receiptNumber}`,
  };
}

/**
 * Generic document template renderer - routes to specific renderers
 */
export async function renderDocumentTemplate(
  documentType: string,
  documentId: string,
  organizationId?: string | null,
  templateId?: string
): Promise<RenderResult | null> {
  switch (documentType) {
    case 'invoice':
      return renderInvoiceTemplate(documentId, organizationId, templateId);
    case 'receipt':
      return renderReceiptTemplate(documentId, organizationId, templateId);
    default:
      // For other document types, return null (fallback to jsPDF)
      return null;
  }
}

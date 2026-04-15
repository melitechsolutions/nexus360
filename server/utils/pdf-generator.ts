import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDb } from '../db';
import { invoices, invoiceItems, clients, settings } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Generate an invoice PDF buffer using professional template layout
 * @param invoiceId - The ID of the invoice to generate
 * @returns Buffer containing the PDF data
 */
export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Fetch invoice data
  const invoiceData = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoiceData || invoiceData.length === 0) {
    throw new Error(`Invoice with ID ${invoiceId} not found`);
  }

  const invoice = invoiceData[0];

  // Fetch client data
  const clientData = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .limit(1);

  const client = clientData && clientData.length > 0 ? clientData[0] : null;

  // Fetch invoice line items
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  // Fetch company info from settings
  const companyRows = await db.select().from(settings).where(eq(settings.category, 'company'));
  const company: Record<string, string> = {};
  companyRows.forEach(s => { if (s.key) company[s.key] = s.value ?? ''; });

  // Fetch bank payment settings
  const bankRows = await db.select().from(settings).where(eq(settings.category, 'payment_bank'));
  const bankPay: Record<string, string> = {};
  bankRows.forEach(s => { if (s.key) bankPay[s.key] = s.value ?? ''; });

  // Fetch M-Pesa settings
  const mpesaRows = await db.select().from(settings).where(eq(settings.category, 'payment_mpesa'));
  const mpesaPay: Record<string, string> = {};
  mpesaRows.forEach(s => { if (s.key) mpesaPay[s.key] = s.value ?? ''; });

  // Fetch invoice settings (terms & conditions)
  const invSettingsRows = await db.select().from(settings).where(eq(settings.category, 'invoice_settings'));
  const invSettings: Record<string, string> = {};
  invSettingsRows.forEach(s => { if (s.key) invSettings[s.key] = s.value ?? ''; });

  // Fetch currency setting
  const currRows = await db.select().from(settings).where(eq(settings.category, 'currency'));
  const currMap: Record<string, string> = {};
  currRows.forEach(s => { if (s.key) currMap[s.key] = s.value ?? ''; });
  const cur = currMap.code || 'KES';

  // Create PDF document
  const doc = new jsPDF();
  let currentY = 15;

  // ========== HEADER WITH BRANDING ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text((company.name || 'Company Name').toUpperCase(), 20, currentY);
  
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (company.tagline) doc.text(company.tagline, 20, currentY);
  
  currentY += 6;
  doc.setFontSize(9);
  const contactLines: string[] = [];
  if (company.phone) contactLines.push(company.phone);
  if (company.email) contactLines.push(company.email);
  if (company.address) contactLines.push(company.address);
  if (contactLines.length) doc.text(contactLines, 20, currentY);

  // Document type on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text('INVOICE', 190, currentY - 6, { align: 'right' });

  currentY = 50;

  // ========== DOCUMENT METADATA ==========
  doc.setDrawColor(220, 220, 220);
  doc.rect(20, currentY - 5, 170, 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 25, currentY + 2);
  doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 110, currentY + 2);
  doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 150, currentY + 2);

  currentY += 20;

  // ========== BILL TO / CLIENT DETAILS ==========
  doc.setDrawColor(240, 240, 240);
  doc.rect(20, currentY - 5, 170, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Bill To / Client Details', 25, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const clientDetails = [];
  if (client) {
    clientDetails.push(`${client.companyName || ''}`);
    if (client.contactPerson) clientDetails.push(`Contact: ${client.contactPerson}`);
    if (client.email) clientDetails.push(`Email: ${client.email}`);
    if (client.phone) clientDetails.push(`Phone: ${client.phone}`);
    if (client.address) clientDetails.push(`Address: ${client.address}`);
  }
  doc.text(clientDetails, 25, currentY + 6);

  currentY += 40;

  // ========== LINE ITEMS TABLE ==========
  const tableData = items.map((item) => [
    item.description || '',
    item.quantity.toString(),
    `${cur} ${(item.unitPrice / 100).toFixed(2)}`,
    `${cur} ${(item.total / 100).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [80, 80, 80],
    },
    footStyles: {
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 80, halign: 'left' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  currentY += 10;

  // ========== TOTALS SECTION ==========
  doc.setDrawColor(240, 240, 240);
  doc.rect(120, currentY - 5, 70, 5 + (invoice.taxAmount ? 5 : 0) + (invoice.discountAmount ? 5 : 0) + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  
  doc.text('Subtotal:', 125, currentY + 2);
  doc.text(`${cur} ${(invoice.subtotal / 100).toFixed(2)}`, 185, currentY + 2, { align: 'right' });

  let totalLineY = currentY + 2;
  
  if (invoice.taxAmount && invoice.taxAmount > 0) {
    totalLineY += 5;
    doc.text('Tax:', 125, totalLineY);
    doc.text(`${cur} ${(invoice.taxAmount / 100).toFixed(2)}`, 185, totalLineY, { align: 'right' });
  }

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    totalLineY += 5;
    doc.text('Discount:', 125, totalLineY);
    doc.text(`-${cur} ${(invoice.discountAmount / 100).toFixed(2)}`, 185, totalLineY, { align: 'right' });
  }

  totalLineY += 8;
  
  // Highlight box for total
  doc.setDrawColor(255, 159, 67);
  doc.setFillColor(255, 159, 67);
  doc.rect(120, totalLineY - 5, 70, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Total:', 125, totalLineY + 1);
  doc.text(`${cur} ${(invoice.total / 100).toFixed(2)}`, 185, totalLineY + 1, { align: 'right' });

  currentY = totalLineY + 15;

  // ========== PAYMENT INSTRUCTIONS ==========
  if (currentY > 200) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Payment Instructions', 20, currentY);

  currentY += 10;

  // Bank Details Box
  doc.setDrawColor(240, 240, 240);
  doc.rect(20, currentY - 5, 80, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Bank Details', 25, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const bankLines: string[] = [];
  if (bankPay.bankName) bankLines.push(`Bank: ${bankPay.bankName}`);
  if (bankPay.branch) bankLines.push(`Branch: ${bankPay.branch}`);
  if (bankPay.accountNumber) bankLines.push(`Account: ${bankPay.accountNumber}`);
  if (bankPay.accountName) bankLines.push(`Name: ${bankPay.accountName}`);
  if (bankLines.length) doc.text(bankLines, 25, currentY + 6);

  // M-Pesa Box
  doc.setDrawColor(240, 240, 240);
  doc.rect(110, currentY - 5, 80, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('M-Pesa Payment', 115, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const mpesaLines: string[] = [];
  if (mpesaPay.paybillNumber) mpesaLines.push(`Paybill: ${mpesaPay.paybillNumber}`);
  if (mpesaPay.accountNumber) mpesaLines.push(`Account: ${mpesaPay.accountNumber}`);
  if (mpesaLines.length) doc.text(mpesaLines, 115, currentY + 6);

  currentY += 40;

  // ========== NOTES & TERMS ==========
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Notes:', 20, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const notesLines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(notesLines, 20, currentY + 5);
    currentY += 5 + (notesLines.length * 4);
  }

  // Terms & Conditions
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Terms & Conditions:', 20, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const defaultTerms = invoice.terms || invSettings.termsAndConditions || `1. All prices are in Kenya Shillings (KES)
2. VAT charged where applicable
3. Invoice valid for 7 days from date of generation
4. Late payment may result in suspension of services`;
  const termsLines = doc.splitTextToSize(defaultTerms, 170);
  doc.text(termsLines, 20, currentY + 5);

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.height - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`This is a system generated invoice. For inquiries, contact ${company.email || ''}`, doc.internal.pageSize.width / 2, footerY, { align: 'center' });

  // Convert PDF to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

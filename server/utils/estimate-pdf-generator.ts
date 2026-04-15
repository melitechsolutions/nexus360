import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDb } from '../db';
import { estimates, estimateItems, clients } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getCompanyInfo } from './company-info';

/**
 * Generate an estimate PDF buffer
 * @param estimateId - The ID of the estimate to generate
 * @returns Buffer containing the PDF data
 */
export async function generateEstimatePDF(estimateId: string): Promise<Buffer> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Fetch estimate data
  const estimateData = await db
    .select()
    .from(estimates)
    .where(eq(estimates.id, estimateId))
    .limit(1);

  if (!estimateData || estimateData.length === 0) {
    throw new Error(`Estimate with ID ${estimateId} not found`);
  }

  const estimate = estimateData[0];

  // Fetch client data
  const clientData = await db
    .select()
    .from(clients)
    .where(eq(clients.id, estimate.clientId))
    .limit(1);

  const client = clientData && clientData.length > 0 ? clientData[0] : null;

  // Fetch estimate line items
  const items = await db
    .select()
    .from(estimateItems)
    .where(eq(estimateItems.estimateId, estimateId));

  // Create PDF document
  const doc = new jsPDF();

  // Set font
  doc.setFont('helvetica');

  const companyInfo = await getCompanyInfo();

  // Add company header with logo placeholder and contact details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(companyInfo.name, 20, 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  if (companyInfo.email) doc.text(`Email: ${companyInfo.email}`, 20, 27);
  if (companyInfo.phone) doc.text(`Phone: ${companyInfo.phone}`, 20, 32);
  if (companyInfo.address) doc.text(`Address: ${companyInfo.address}`, 20, 37);
  
  // Add ESTIMATE title and number on the right
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('ESTIMATE', 200, 20, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(estimate.estimateNumber, 200, 28, { align: 'right' });

  // Add estimate details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Estimate Number: ${estimate.estimateNumber}`, 20, 50);
  doc.text(`Issue Date: ${new Date(estimate.issueDate).toLocaleDateString()}`, 20, 57);
  // Schema uses `expiryDate` for estimate validity
  const validUntilText = estimate.expiryDate ? new Date(estimate.expiryDate).toLocaleDateString() : 'N/A';
  doc.text(`Valid Until: ${validUntilText}`, 20, 64);
  doc.text(`Status: ${estimate.status.toUpperCase()}`, 20, 71);

  // Add client information
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Prepared For:', 20, 85);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  if (client) {
    doc.text(client.companyName || 'N/A', 20, 92);
    if (client.contactPerson) doc.text(client.contactPerson, 20, 99);
    if (client.email) doc.text(client.email, 20, 106);
    if (client.phone) doc.text(client.phone, 20, 113);
    if (client.address) doc.text(client.address, 20, 120);
  } else {
    doc.text('Client information not available', 20, 92);
  }

  // Add line items table
  const tableData = items.map((item) => [
    item.description || '',
    item.quantity.toString(),
    `KES ${(item.unitPrice / 100).toFixed(2)}`,
    `${item.taxRate || 0}%`,
    `${item.discountPercent || 0}%`,
    `KES ${(item.total / 100).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 135,
    head: [['Description', 'Qty', 'Unit Price', 'Tax', 'Discount', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 35, halign: 'right' },
    },
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 135;

  // Add totals
  const totalsStartY = finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  doc.text('Subtotal:', 130, totalsStartY);
  doc.text(`KES ${(estimate.subtotal / 100).toFixed(2)}`, 170, totalsStartY, { align: 'right' });

  if (estimate.taxAmount && estimate.taxAmount > 0) {
    doc.text('Tax:', 130, totalsStartY + 7);
    doc.text(`KES ${(estimate.taxAmount / 100).toFixed(2)}`, 170, totalsStartY + 7, { align: 'right' });
  }

  if (estimate.discountAmount && estimate.discountAmount > 0) {
    doc.text('Discount:', 130, totalsStartY + 14);
    doc.text(`-KES ${(estimate.discountAmount / 100).toFixed(2)}`, 170, totalsStartY + 14, { align: 'right' });
  }

  // Total line
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  const totalY = estimate.taxAmount || estimate.discountAmount ? totalsStartY + 21 : totalsStartY + 7;
  doc.text('Total:', 130, totalY);
  doc.text(`KES ${(estimate.total / 100).toFixed(2)}`, 170, totalY, { align: 'right' });

  // Add notes if available
  if (estimate.notes) {
    const notesY = totalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Notes:', 20, notesY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(estimate.notes, 170);
    doc.text(splitNotes, 20, notesY + 7);
  }

  // Add terms and conditions (default if not provided)
  const defaultEstimateTerms = `1. All prices are in Kenya shillings (KSHs)
2. VAT is charged where applicable.
3. Quotation is valid for 45 days from date of generation.
4. Payment of 75% is expected before commencement of the project.`;
  
  const termsY = totalY + 30 + (estimate.notes ? 15 : 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Terms & Conditions:', 20, termsY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const termsToUse = estimate.terms || defaultEstimateTerms;
  const splitTerms = doc.splitTextToSize(termsToUse, 170);
  doc.text(splitTerms, 20, termsY + 7);

  // Add footer tag
  const footerY = doc.internal.pageSize.height - 15;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`This is a system generated estimate and is digitally signed under ${companyInfo.name}.`, doc.internal.pageSize.width / 2, footerY, { align: 'center' });

  // Convert PDF to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

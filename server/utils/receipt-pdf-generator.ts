import jsPDF from 'jspdf';
import { getDb } from '../db';
import { receipts, clients, payments } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getCompanyInfo } from './company-info';

/**
 * Generate a receipt PDF buffer
 * @param receiptId - The ID of the receipt to generate
 * @returns Buffer containing the PDF data
 */
export async function generateReceiptPDF(receiptId: string): Promise<Buffer> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Fetch receipt data
  const receiptData = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, receiptId))
    .limit(1);

  if (!receiptData || receiptData.length === 0) {
    throw new Error(`Receipt with ID ${receiptId} not found`);
  }

  const receipt = receiptData[0];

  // Fetch client data
  let client = null;
  if (receipt.clientId) {
    const clientData = await db
      .select()
      .from(clients)
      .where(eq(clients.id, receipt.clientId))
      .limit(1);
    client = clientData && clientData.length > 0 ? clientData[0] : null;
  }

  // Fetch payment data if linked
  let payment = null;
  if (receipt.paymentId) {
    const paymentData = await db
      .select()
      .from(payments)
      .where(eq(payments.id, receipt.paymentId))
      .limit(1);
    payment = paymentData && paymentData.length > 0 ? paymentData[0] : null;
  }

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
  
  // Add RECEIPT title and number on the right
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('RECEIPT', 200, 20, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.receiptNumber, 200, 28, { align: 'right' });

  // Add receipt details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt Number: ${receipt.receiptNumber}`, 20, 55);
  doc.text(`Date: ${new Date(receipt.receiptDate).toLocaleDateString()}`, 20, 62);
  doc.text(`Payment Method: ${receipt.paymentMethod || 'N/A'}`, 20, 69);

  // Add client information if available
  if (client) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Received From:', 20, 85);
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(client.companyName || 'N/A', 20, 92);
    if (client.contactPerson) doc.text(client.contactPerson, 20, 99);
    if (client.email) doc.text(client.email, 20, 106);
    if (client.phone) doc.text(client.phone, 20, 113);
  }

  // Add payment details box
  const boxStartY = 130;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(20, boxStartY, 170, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Payment Details', 25, boxStartY + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  // Use payment notes if available, otherwise fallback to receipt notes
  const descriptionText = (payment && (payment.notes as string)) || receipt.notes || 'Payment received';
  doc.text(`Description: ${descriptionText}`, 25, boxStartY + 20);
  
  // Amount in large text
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`Amount: KES ${(receipt.amount / 100).toFixed(2)}`, 25, boxStartY + 32);

  // Add notes if available
  if (receipt.notes) {
    const notesY = boxStartY + 55;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Notes:', 20, notesY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(receipt.notes, 170);
    doc.text(splitNotes, 20, notesY + 7);
  }

  // Add thank you message
  const thankYouY = boxStartY + (receipt.notes ? 80 : 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Thank you for your business.', doc.internal.pageSize.width / 2, thankYouY, { align: 'center' });

  // Add footer tag
  const footerY = doc.internal.pageSize.height - 15;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`This is a system generated receipt from ${companyInfo.name}.`, doc.internal.pageSize.width / 2, footerY, { align: 'center' });

  // Convert PDF to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
}

interface ReceiptData {
  receiptNumber: string;
  date: string;
  client: {
    name: string;
    email: string;
  };
  invoiceNumber?: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  terms?: string;
  notes?: string;
}

const companyInfo: CompanyInfo = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo: '/logo.png',
};

/** Call this once when settings are loaded to populate PDF company info */
export function setCompanyInfo(info: Partial<CompanyInfo>) {
  Object.assign(companyInfo, info);
}

// Helper function to add company header
function addCompanyHeader(doc: jsPDF, title: string) {
  // Add logo if available
  try {
    const logoImg = new Image();
    logoImg.src = companyInfo.logo || '';
    doc.addImage(logoImg, 'PNG', 15, 10, 40, 20);
  } catch (error) {
    console.warn('Logo not loaded');
  }

  // Company info (right side)
  doc.setFontSize(10);
  doc.setTextColor(100);
  const pageWidth = doc.internal.pageSize.width;
  doc.text(companyInfo.name, pageWidth - 15, 15, { align: 'right' });
  doc.text(companyInfo.address, pageWidth - 15, 20, { align: 'right' });
  doc.text(companyInfo.phone, pageWidth - 15, 25, { align: 'right' });
  doc.text(companyInfo.email, pageWidth - 15, 30, { align: 'right' });
  doc.text(companyInfo.website, pageWidth - 15, 35, { align: 'right' });

  // Document title
  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, 50);

  // Orange line under title
  doc.setDrawColor(255, 153, 0); // Orange color
  doc.setLineWidth(2);
  doc.line(15, 53, pageWidth - 15, 53);

  return 60; // Return Y position after header
}

// Helper function to add footer
function addFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text(
    `${companyInfo.name} | ${companyInfo.email} | ${companyInfo.phone}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.text(companyInfo.name || '', pageWidth / 2, pageHeight - 10, { align: 'center' });
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  let yPos = addCompanyHeader(doc, 'INVOICE');

  // Invoice details
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dueDate, 60, yPos);

  // Client details
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Bill To:', 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.client.name, 15, yPos);
  yPos += 5;
  doc.text(data.client.email, 15, yPos);
  if (data.client.phone) {
    yPos += 5;
    doc.text(data.client.phone, 15, yPos);
  }
  if (data.client.address) {
    yPos += 5;
    doc.text(data.client.address, 15, yPos);
  }

  // Items table
  yPos += 15;
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Quantity', 'Rate', 'Amount']],
    body: data.items.map((item) => [
      item.description,
      item.quantity.toString(),
      `Ksh ${item.rate.toLocaleString()}`,
      `Ksh ${item.amount.toLocaleString()}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [255, 153, 0] }, // Orange header
    styles: { fontSize: 10 },
  });

  // Totals
  yPos = (doc as any).lastAutoTable.finalY + 10;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 70, yPos);
  doc.text(`Ksh ${data.subtotal.toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });

  if (data.tax) {
    yPos += 6;
    doc.text('Tax:', pageWidth - 70, yPos);
    doc.text(`Ksh ${data.tax.toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });
  }

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', pageWidth - 70, yPos);
  doc.text(`Ksh ${data.total.toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });

  // Notes
  if (data.notes) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
  }

  addFooter(doc);
  return doc;
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF();
  let yPos = addCompanyHeader(doc, 'RECEIPT');

  // Receipt details
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt Number:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.receiptNumber, 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 60, yPos);

  if (data.invoiceNumber) {
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Number:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceNumber, 60, yPos);
  }

  // Client details
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Received From:', 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.client.name, 15, yPos);
  yPos += 5;
  doc.text(data.client.email, 15, yPos);

  // Payment details box
  yPos += 20;
  const pageWidth = doc.internal.pageSize.width;
  const boxWidth = pageWidth - 30;
  const boxHeight = 40;

  // Draw box
  doc.setDrawColor(255, 153, 0);
  doc.setLineWidth(1);
  doc.rect(15, yPos, boxWidth, boxHeight);

  // Payment details inside box
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod, 70, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Amount Paid:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0); // Green color for amount
  doc.text(`Ksh ${data.amount.toLocaleString()}`, 70, yPos);
  doc.setTextColor(0); // Reset to black

  // Notes
  if (data.notes) {
    yPos += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
  }

  addFooter(doc);
  return doc;
}

export function generateQuotationPDF(data: QuotationData): jsPDF {
  const doc = new jsPDF();
  let yPos = addCompanyHeader(doc, 'QUOTATION');

  // Quotation details
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation Number:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationNumber, 65, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 65, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Valid Until:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.validUntil, 65, yPos);

  // Client details
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Prepared For:', 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.client.name, 15, yPos);
  yPos += 5;
  doc.text(data.client.email, 15, yPos);
  if (data.client.phone) {
    yPos += 5;
    doc.text(data.client.phone, 15, yPos);
  }
  if (data.client.address) {
    yPos += 5;
    doc.text(data.client.address, 15, yPos);
  }

  // Items table
  yPos += 15;
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Quantity', 'Rate', 'Amount']],
    body: data.items.map((item) => [
      item.description,
      item.quantity.toString(),
      `Ksh ${item.rate.toLocaleString()}`,
      `Ksh ${item.amount.toLocaleString()}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [255, 153, 0] },
    styles: { fontSize: 10 },
  });

  // Totals
  yPos = (doc as any).lastAutoTable.finalY + 10;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 70, yPos);
  doc.text(`Ksh ${data.subtotal.toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });

  if (data.tax) {
    yPos += 6;
    doc.text('Tax:', pageWidth - 70, yPos);
    doc.text(`Ksh ${data.tax.toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });
  }

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', pageWidth - 70, yPos);
  doc.text(`Ksh ${data.total.toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });

  // Terms and Notes
  if (data.terms) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Conditions:', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(data.terms, pageWidth - 30);
    doc.text(splitTerms, 15, yPos);
    yPos += splitTerms.length * 5;
  }

  if (data.notes) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
  }

  addFooter(doc);
  return doc;
}

// Export function to download PDF
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

interface DebitNoteData {
  debitNoteNumber: string;
  date: string;
  supplier: {
    name: string;
  };
  reason: string;
  amount: number;
  status: string;
}

export function generateDebitNotePDF(data: DebitNoteData): jsPDF {
  const doc = new jsPDF();
  let yPos = addCompanyHeader(doc, 'DEBIT NOTE');

  // Debit note details
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Debit Note No:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.debitNoteNumber, 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.status.charAt(0).toUpperCase() + data.status.slice(1), 60, yPos);

  // Supplier details
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Issued To:', 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.supplier.name, 15, yPos);

  // Reason
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Reason:', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const pageWidth = doc.internal.pageSize.width;
  const splitReason = doc.splitTextToSize(data.reason, pageWidth - 30);
  doc.text(splitReason, 15, yPos);
  yPos += splitReason.length * 5;

  // Amount box
  yPos += 15;
  const boxWidth = pageWidth - 30;
  const boxHeight = 30;
  doc.setDrawColor(220, 53, 69);
  doc.setLineWidth(1);
  doc.rect(15, yPos, boxWidth, boxHeight);

  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total Amount:', 20, yPos);
  doc.setTextColor(220, 53, 69);
  doc.text(`KES ${data.amount.toLocaleString()}`, 75, yPos);
  doc.setTextColor(0);

  addFooter(doc);
  return doc;
}


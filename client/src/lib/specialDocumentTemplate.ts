/**
 * Special Document Template Generator
 * For documents that don't follow the standard invoice/estimate structure
 * Includes: Expenses, Payments, Credit Notes, Debit Notes, Cheques, Reports, etc.
 * 
 * Use this template for any custom document layouts that require unique formatting
 */

interface SpecialDocumentData {
  documentType: 'expense' | 'payment' | 'credit_note' | 'debit_note' | 'cheque' | 'report' | 'custom';
  documentNumber: string;
  documentDate: string;
  documentTitle?: string;
  companyName?: string;
  companyLogo?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  
  // For expense/payment documents
  amount?: number;
  currency?: string;
  description?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  amountInWords?: string;
  
  // For structured content
  sections?: Array<{
    title: string;
    content: string | Array<{ label: string; value: string }>;
  }>;
  
  // For table data
  tableData?: {
    headers: string[];
    rows: Array<string[]>;
  };
  
  // Additional fields
  status?: string;
  approvalStatus?: string;
  notes?: string;
  terms?: string;
  kraPIN?: string;
}

export function generateSpecialDocumentHTML(data: SpecialDocumentData): string {
  const logoHtml = data.companyLogo 
    ? `<img src="${data.companyLogo}" style="max-height: 80px; margin-bottom: 15px;" />` 
    : `<div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">${data.documentTitle || data.documentType.toUpperCase()}</div>`;

  const documentTitle = data.documentTitle || (
    data.documentType === 'expense' ? 'EXPENSE REPORT'
    : data.documentType === 'payment' ? 'PAYMENT VOUCHER'
    : data.documentType === 'credit_note' ? 'CREDIT NOTE'
    : data.documentType === 'debit_note' ? 'DEBIT NOTE'
    : data.documentType === 'cheque' ? 'CHEQUE'
    : data.documentType === 'report' ? 'REPORT'
    : 'DOCUMENT'
  );

  // Format amount in words if provided
  const amountDisplay = data.amount ? `${data.currency || 'KES'} ${(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';

  // Generate sections HTML
  const sectionsHtml = data.sections ? data.sections.map(section => {
    if (Array.isArray(section.content)) {
      // Content is key-value pairs
      return `
        <div style="margin: 20px 0; page-break-inside: avoid;">
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.95em; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">
            ${section.title}
          </div>
          <div style="font-size: 0.9em; color: #555;">
            ${section.content.map(item => `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 500;">${item.label}</span>
                <span>${item.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Content is plain text
      return `
        <div style="margin: 20px 0; page-break-inside: avoid;">
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.95em; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">
            ${section.title}
          </div>
          <div style="font-size: 0.9em; color: #555; white-space: pre-wrap; line-height: 1.6;">
            ${section.content}
          </div>
        </div>
      `;
    }
  }).join('') : '';

  // Generate table HTML if provided
  const tableHtml = data.tableData ? `
    <div style="margin: 20px 0; page-break-inside: avoid;">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
        <thead>
          <tr style="background: #f3f4f6;">
            ${data.tableData.headers.map(header => `<th style="padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600;">${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.tableData.rows.map(row => `
            <tr>
              ${row.map(cell => `<td style="padding: 12px; border: 1px solid #d1d5db;">${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const html = `
    <html>
      <head>
        <title>${documentTitle} ${data.documentNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #333;
            background: #fff;
          }
          .document-container { max-width: 900px; margin: 0 auto; }
          .header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 40px;
            align-items: start;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 20px;
          }
          .company-info { 
            flex: 1;
            max-width: 50%;
          }
          .company-branding { margin-bottom: 15px; }
          .company-detail { 
            font-size: 0.85em;
            color: #666;
            margin: 3px 0;
          }
          .doc-header { 
            text-align: right;
            flex: 1;
          }
          .document-title { 
            font-size: 28px; 
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 10px;
          }
          .doc-meta { 
            font-size: 0.9em;
            margin: 5px 0;
            color: #666;
          }
          .doc-meta-label {
            font-weight: 600;
            color: #333;
          }
          .amount-section {
            background: #f0f9ff;
            border: 2px solid #0284c7;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
          }
          .amount-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 8px;
          }
          .amount-value {
            font-size: 2em;
            font-weight: bold;
            color: #0284c7;
          }
          .amount-words {
            font-size: 0.85em;
            color: #555;
            margin-top: 8px;
            font-style: italic;
          }
          .recipient-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
          }
          .recipient-block {
            border: 1px solid #e5e7eb;
            padding: 15px;
            border-radius: 4px;
            background: #f9fafb;
          }
          .recipient-label {
            font-weight: 600;
            font-size: 0.9em;
            margin-bottom: 8px;
            color: #333;
          }
          .recipient-content {
            font-size: 0.85em;
            color: #666;
            line-height: 1.6;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            margin: 5px 0;
          }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #7f1d1d; }
          .status-completed { background: #dbeafe; color: #1e40af; }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 0.85em;
            color: #999;
          }
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 40px;
            margin-top: 50px;
            text-align: center;
          }
          .signature-block {
            border-top: 2px solid #333;
            padding-top: 40px;
            font-size: 0.9em;
          }
          .signature-name {
            font-weight: 600;
            margin-top: 8px;
          }
          @media print { 
            body { padding: 20px; }
            .no-print { display: none !important; }
            .document-container { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="document-container">
          <!-- HEADER -->
          <div class="header">
            <div class="company-info">
              <div class="company-branding">
                ${logoHtml}
              </div>
              <div class="company-detail">Phone: ${data.companyPhone || '+254 712 236 643 / +254 713 822 486'}</div>
              <div class="company-detail">Email: ${data.companyEmail || ''}</div>
              <div class="company-detail">Website: ${data.companyWebsite || ''}</div>
              <div class="company-detail">Address: ${data.companyAddress || 'Nairobi, Kenya'}</div>
            </div>
            <div class="doc-header">
              <div class="document-title">${documentTitle}</div>
              <div class="doc-meta"><span class="doc-meta-label">Document #:</span> ${data.documentNumber}</div>
              <div class="doc-meta"><span class="doc-meta-label">Date:</span> ${data.documentDate}</div>
              ${data.referenceNumber ? `<div class="doc-meta"><span class="doc-meta-label">Reference:</span> ${data.referenceNumber}</div>` : ''}
              ${data.kraPIN ? `<div class="doc-meta"><span class="doc-meta-label">KRA PIN:</span> ${data.kraPIN}</div>` : ''}
            </div>
          </div>

          <!-- RECIPIENT INFO -->
          ${data.recipientName ? `
          <div class="recipient-section">
            <div class="recipient-block">
              <div class="recipient-label">Recipient / Payee</div>
              <div class="recipient-content">
                <strong>${data.recipientName}</strong><br>
                ${data.recipientPhone ? `Phone: ${data.recipientPhone}<br>` : ''}
                ${data.recipientEmail ? `Email: ${data.recipientEmail}<br>` : ''}
                ${data.recipientAddress ? `Address: ${data.recipientAddress}` : ''}
              </div>
            </div>
            <div class="recipient-block">
              <div class="recipient-label">Status</div>
              <div class="recipient-content">
                ${data.status ? `<div class="status-badge status-${data.status?.toLowerCase()}">${data.status?.toUpperCase()}</div>` : ''}
                ${data.approvalStatus ? `<div style="margin-top: 8px;">Approval: <strong>${data.approvalStatus}</strong></div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- AMOUNT SECTION (for expense/payment documents) -->
          ${data.amount ? `
          <div class="amount-section">
            <div class="amount-label">Total Amount</div>
            <div class="amount-value">${amountDisplay}</div>
            ${data.amountInWords ? `<div class="amount-words">${data.amountInWords}</div>` : ''}
            ${data.paymentMethod ? `<div style="margin-top: 12px; font-size: 0.9em; color: #555;">Method: <strong>${data.paymentMethod}</strong></div>` : ''}
          </div>
          ` : ''}

          <!-- DESCRIPTION -->
          ${data.description ? `
          <div style="margin: 20px 0; page-break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.95em; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">
              Description
            </div>
            <div style="font-size: 0.9em; color: #555; white-space: pre-wrap; line-height: 1.6;">
              ${data.description}
            </div>
          </div>
          ` : ''}

          <!-- DYNAMIC SECTIONS -->
          ${sectionsHtml}

          <!-- TABLE DATA -->
          ${tableHtml}

          <!-- NOTES -->
          ${data.notes ? `
          <div style="margin: 20px 0; page-break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.95em; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">
              Notes
            </div>
            <div style="font-size: 0.9em; color: #555; white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 3px solid #ff9f43;">
              ${data.notes}
            </div>
          </div>
          ` : ''}

          <!-- TERMS -->
          ${data.terms ? `
          <div style="margin: 20px 0; page-break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.95em; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">
              Terms & Conditions
            </div>
            <div style="font-size: 0.85em; color: #555; white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 4px;">
              ${data.terms}
            </div>
          </div>
          ` : ''}

          <!-- SIGNATURE SECTION -->
          <div class="signature-section">
            <div class="signature-block">
              <div>Prepared By</div>
              <div class="signature-name">_________________</div>
            </div>
            <div class="signature-block">
              <div>Reviewed By</div>
              <div class="signature-name">_________________</div>
            </div>
            <div class="signature-block">
              <div>Approved By</div>
              <div class="signature-name">_________________</div>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <p>This is a system generated ${documentTitle} and is digitally signed under ${data.companyName || 'the issuing company'}.</p>
            <p style="margin-top: 10px; font-size: 0.8em;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <script>
          window.onload = () => { 
            setTimeout(() => {
              window.print();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  return html;
}

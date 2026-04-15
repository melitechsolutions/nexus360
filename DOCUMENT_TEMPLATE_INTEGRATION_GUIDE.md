# Document Template Integration Guide

## Overview

This guide explains how to integrate the ISO-compliant HTML templates with React components for document rendering, data binding, and printing/PDF generation.

## Architecture

The template integration consists of three main components:

1. **HTML Templates** (`/templates/`) with ISO-compliant structure
2. **Template Renderer** (`@/lib/templateRenderer.ts`) for loading and data binding
3. **React Components** (TemplatePreview, document forms) for UI integration
4. **Backend Routers** for CRUD operations on document types

## Template Structure

All templates follow a consistent ISO-compliant format:

```html
<!-- ISO Compliant Header -->
<div class="document-header">
    <div class="company-info">
        <div class="company-logo" data-field="companyLogo">
            <img src="[COMPANY_LOGO]" alt="Company Logo">
        </div>
        <div>
            <div class="company-name" data-field="companyName">[COMPANY_NAME]</div>
            <div class="company-tax-id" data-field="companyPin">Tax ID: [COMPANY_PIN]</div>
        </div>
    </div>
</div>

<!-- Document Title and Metadata -->
<div class="document-header-section">
    <h1 class="document-title">DOCUMENT_TYPE</h1>
    <div class="document-meta">
        <div class="meta-item">
            <span class="meta-label">Document #:</span>
            <span class="meta-value" data-field="documentNumber">[DOC-00001]</span>
        </div>
        <!-- More metadata -->
    </div>
</div>

<!-- Document Body (dynamic content) -->
<!-- Your document-specific content here -->

<!-- ISO Minimal Footer -->
<div class="document-footer">
    <div class="footer-info">
        <span class="document-id" data-field="documentNumber">Doc: [DOC-00001]</span>
        <span class="document-date" data-field="issueDate">Issued: [DD/MM/YYYY]</span>
        <span class="page-number">Page 1 of 1</span>
    </div>
    <div class="footer-company" data-field="companyName">[COMPANY_NAME]</div>
</div>
```

## Data Binding Syntax

Templates support two data binding patterns:

### 1. Bracket Placeholders
```html
<span>[COMPANY_NAME]</span>
<span>[Invoice Number]</span>

<!-- In code: -->
const data = {
  companyName: "Acme Corp",
  invoiceNumber: "INV-00001"
};
```

### 2. Data-Field Attributes
```html
<span data-field="companyName">[COMPANY_NAME]</span>
<span data-field="invoiceNumber">[INV-00001]</span>

<!-- Both patterns work simultaneously -->
```

## Using the Template Renderer

### Async Data Binding
```typescript
import { templateRenderer, TemplateData } from "@/lib/templateRenderer";

const data: TemplateData = {
  documentType: "invoice",
  documentNumber: "INV-00001",
  issueDate: "2025-03-13",
  invoiceNumber: "INV-00001",
  dueDate: "2025-04-13",
  clientName: "Acme Corp",
  companyName: "Melitech Solutions",
  companyPin: "P000123456",
  companyLogo: "https://example.com/logo.png",
};

// Render template and get HTML
const html = await templateRenderer.renderTemplate("invoice", data);

// Render directly to DOM element
const container = document.getElementById("template-container");
await templateRenderer.renderToElement("invoice", data, container);

// Clear cache if needed
templateRenderer.clearCache();
```

## React Component Usage

### Using TemplatePreview Component
```typescript
import TemplatePreview from "@/components/TemplatePreview";

function InvoicePreview() {
  const invoice = useInvoiceData(); // Fetch invoice data

  return (
    <TemplatePreview
      templateType="invoice"
      data={{
        documentType: "invoice",
        invoiceNumber: invoice.number,
        issueDate: invoice.date,
        dueDate: invoice.dueDate,
        clientName: invoice.client.name,
        // ... more fields
      }}
      onPrint={() => console.log("Printed!")}
      onDownload={() => console.log("Downloaded!")}
    />
  );
}
```

### Implementing in Document Detail Pages
```typescript
export function InvoiceDetails({ id }: { id: string }) {
  const { data: invoice } = trpc.invoices.get.useQuery({ id });

  if (!invoice) return <Spinner />;

  const templateData: TemplateData = {
    documentType: "invoice",
    documentNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate).toLocaleDateString(),
    dueDate: new Date(invoice.dueDate).toLocaleDateString(),
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.client?.companyName || "Unknown",
    // ... map all fields to template data
  };

  return (
    <div>
      <TemplatePreview templateType="invoice" data={templateData} />
    </div>
  );
}
```

## Available Templates

### Existing Templates
- `invoice` - Customer invoices
- `receipt` - Payment receipts
- `estimate` - Quotations and estimates
- `lpo` - Local purchase orders
- `dn` - Delivery notes
- `grn` - Goods received notes
- `imprest` - Employee advance requests
- `asset` - Asset allocation receipts
- `order` - Purchase orders
- `rfq` - Request for quotations

### New Templates
- `credit-note` - Customer credit notes
- `debit-note` - Supplier debit notes
- `service-invoice` - Service invoices
- `expense-claim` - Employee expense claims
- `work-order` - Service work orders

## Document-Specific Fields

### Invoice Fields
```typescript
{
  invoiceNumber: "INV-00001",
  issueDate: "2025-03-13",
  dueDate: "2025-04-13",
  clientName: "Client Company",
  clientCompany: "Client Business Name",
  clientEmail: "client@company.com",
  clientPhone: "+254 700 000000",
  clientAddress: "123 Main St",
  clientPin: "P000123456",
  lineItems: [
    {
      description: "Service Description",
      quantity: 1,
      unitPrice: 1000,
      total: 1000
    }
  ],
  subtotal: 1000,
  taxAmount: 160,
  total: 1160,
  taxType: "exclusive",
  paymentTerms: "Net 30 days",
  paymentMethods: "Bank transfer, M-Pesa",
  notes: "Thank you for your business",
  companyName: "Your Company",
  companyPin: "P000123456",
  companyLogo: "https://example.com/logo.png"
}
```

### Receipt Fields
```typescript
{
  receiptNumber: "RCP-00001",
  issueDate: "2025-03-13",
  paymentMethod: "M-Pesa",
  payerName: "Payer Name",
  payerCompany: "Payer Company",
  amount: 1000,
  reference: "Invoice reference",
  companyName: "Your Company",
  companyPin: "P000123456",
  companyLogo: "https://example.com/logo.png"
}
```

### Work Order Fields
```typescript
{
  workOrderNumber: "WO-00001",
  issueDate: "2025-03-13",
  description: "Work description",
  assignedTo: "Staff member name",
  priority: "high",
  startDate: "2025-03-13",
  targetEndDate: "2025-03-20",
  materials: [
    {
      description: "Material name",
      quantity: 10,
      unitCost: 100,
      total: 1000
    }
  ],
  laborCost: 5000,
  serviceCost: 2000,
  total: 8000,
  companyName: "Your Company",
  companyPin: "P000123456",
  companyLogo: "https://example.com/logo.png"
}
```

## Backend Integration

### Creating Documents

```typescript
// API call example
const response = await trpc.invoices.create.mutate({
  invoiceNumber: "INV-00001",
  clientId: "client-123",
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  lineItems: [...],
  total: 1000,
  status: "draft"
});
```

### Listing Documents

```typescript
// Get all documents of a type
const invoices = await trpc.invoices.list.query();

// Filter and sort on frontend or backend
const filtered = invoices.filter(inv => inv.status === "draft");
```

### Retrieving Template Data

The backend routers automatically format responses with all template-required fields:

```typescript
const invoice = await trpc.invoices.get.query({ id: "invoice-123" });

// Response includes all fields needed for template rendering
const templateData = {
  documentType: "invoice",
  ...invoice,
  companyName: settings.companyName,
  companyPin: settings.companyPin,
  // etc.
};
```

## Printing and PDF Generation

### Print to Paper
```typescript
const handlePrint = () => {
  const printWindow = window.open("", "_blank");
  if (printWindow && containerRef.current) {
    printWindow.document.write(containerRef.current.innerHTML);
    printWindow.document.close();
    printWindow.print();
  }
};
```

### PDF Generation (Future)
```typescript
// Integration planned with:
// - html2pdf
// - jsPDF
// - pdfkit
// - Server-side rendering with puppeteer

const handleDownloadPDF = async () => {
  const response = await fetch("/api/generate-pdf", {
    method: "POST",
    body: JSON.stringify({
      templateType: "invoice",
      data: templateData
    })
  });
  const blob = await response.blob();
  downloadFile(blob, "invoice.pdf");
};
```

## Permission Integration

All document routers use feature-based permissions:

```typescript
// Credit Notes
"accounting:credit-notes:view"
"accounting:credit-notes:create"
"accounting:credit-notes:edit"
"accounting:credit-notes:delete"

// Work Orders
"operations:work-orders:view"
"operations:work-orders:create"
"operations:work-orders:edit"
"operations:work-orders:delete"

// Service Invoices
"accounting:service-invoices:view"
"accounting:service-invoices:create"
"accounting:service-invoices:edit"
"accounting:service-invoices:delete"

// Debit Notes
"accounting:debit-notes:view"
"accounting:debit-notes:create"
"accounting:debit-notes:edit"
"accounting:debit-notes:delete"
```

## Frontend Pages Created

1. **CreditNotes.tsx** - List and manage credit notes
2. **DebitNotes.tsx** - List and manage debit notes
3. **ServiceInvoices.tsx** - List and manage service invoices
4. **WorkOrders.tsx** - List and manage work orders

## Next Steps

1. **Create Create/Edit Pages** for new document types
2. **Add PDF Generation** backend support
3. **Implement Email Templates** using same System
4. **Add Document Archiving** and History
5. **Create Batch Operations** for documents
6. **Add Digital Signatures** support
7. **Implement Audit Trail** for all documents

## Testing Checklist

- [ ] Template loads without errors
- [ ] All data fields bind correctly
- [ ] Print output looks professional
- [ ] Pagination works for multi-page docs
- [ ] Mobile responsive design
- [ ] PDF download works
- [ ] Email sending with attachments
- [ ] Permission checks enforced
- [ ] CRUD operations complete
- [ ] Document archiving works

## CSS Customization

Templates use CSS variables for styling:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #6b7280;
    --text-color: #1f2937;
    --border-color: #e5e7eb;
    --spacing: 8px;
}

@media print {
    /* Print-specific styles */
    .no-print { display: none; }
    body { margin: 0; padding: 0; }
    @page { margin: 10mm; }
}
```

## API Endpoints

```
GET    /api/creditNotes          - List  
POST   /api/creditNotes          - Create
GET    /api/creditNotes/:id      - Get
PUT    /api/creditNotes/:id      - Update
DELETE /api/creditNotes/:id      - Delete

GET    /api/debitNotes           - List
POST   /api/debitNotes           - Create
GET    /api/debitNotes/:id       - Get
PUT    /api/debitNotes/:id       - Update
DELETE /api/debitNotes/:id       - Delete

GET    /api/serviceInvoices      - List
POST   /api/serviceInvoices      - Create
GET    /api/serviceInvoices/:id  - Get
PUT    /api/serviceInvoices/:id  - Update
DELETE /api/serviceInvoices/:id  - Delete

GET    /api/workOrders           - List
POST   /api/workOrders           - Create
GET    /api/workOrders/:id       - Get
PUT    /api/workOrders/:id       - Update
DELETE /api/workOrders/:id       - Delete
PATCH  /api/workOrders/:id/status - Update Status
```

## Troubleshooting

### Template not loading
- Verify template file exists in `/templates/` directory
- Check browser console for network errors
- Clear templateRenderer cache: `templateRenderer.clearCache()`

### Data not binding
- Ensure field names match between data object and placeholders
- Check for typos in [PLACEHOLDER] or data-field attributes
- Verify data is being passed correctly to component

### Print not working
- Check browser console for javascript errors
- Verify pop-ups are allowed in browser
- Test with a different browser

### Styling issues
- Check CSS file is being loaded
- Inspect element to see applied styles
- Verify print media queries are working
- Test print preview before printing

## Performance Optimization

- Cache templates after first load
- Pre-render frequently-used templates
- Lazy load inactive template types
- Minimize DOM operations during data binding
- Use React.memo for TemplatePreview component

```typescript
export const TemplatePreview = React.memo(function TemplatePreview({
  templateType,
  data,
  ...props
}: TemplatePreviewProps) {
  // Component implementation
});
```

## References

- HTML Template Files: `/templates/`
- Template Renderer: `@/lib/templateRenderer.ts`
- Template Component: `@/components/TemplatePreview.tsx`
- Backend Routers: `/server/routers/creditNotes.ts`, etc.
- Frontend Pages: `/client/src/pages/CreditNotes.tsx`, etc.

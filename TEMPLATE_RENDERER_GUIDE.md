# Document Template Renderer - Implementation Guide

## Overview

The redesigned **Template Renderer** (v2) is built to handle complex nested HTML template structures with dynamic data binding, supporting:

- ✅ Nested HTML structures with multiple `<html>`, `<head>`, `<body>` tags
- ✅ Template variable substitution (`${variable}`, `${object.field}`)
- ✅ Dynamic line items rendering from arrays
- ✅ Print-friendly document generation
- ✅ Data-section attributes for dynamic content areas
- ✅ Backward compatibility with legacy `[PLACEHOLDER]` format

---

## HTML Template Structure

Templates should follow this structure:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 40px; size: A4; }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: #fff;">
    <div class="document-container" style="max-width: 900px; margin: 0 auto; padding: 32px; background: white;">
      
      <!-- HEADER SECTION -->
      <div data-section="header">
        <h1>${companyInfo.companyName}</h1>
        <p>${companyInfo.companyTagline}</p>
        <div>${companyInfo.companyPhone}</div>
      </div>

      <!-- LINE ITEMS SECTION -->
      <div data-section="line-items">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <!-- Template row - will be cloned for each item -->
            <tr>
              <td>Item Description</td>
              <td>1</td>
              <td>Price</td>
              <td>Amount</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- CUSTOM SECTION -->
      <div data-section="custom-area">
        <p>Custom content here</p>
      </div>

    </div>
  </body>
</html>
```

---

## Template Variables

### 1. Object Field Variables
```
${companyInfo.companyName}
${companyInfo.companyPhone}
${companyInfo.companyEmail}
${clientInfo.clientName}
${clientInfo.clientCompany}
```

### 2. Simple Variables
```
${invoiceNumber}
${issueDate}
${dueDate}
${total}
```

### 3. Legacy Format (still supported)
```
[INVOICENUMBER]
[ISSUE_DATE]
```

---

## Data Structure

### CompanyInfo Object
```typescript
interface CompanyInfo {
  companyName?: string;           // Business name
  companyTagline?: string;        // Tagline/motto
  companyPhone?: string;          // Phone number
  companyEmail?: string;          // Email address
  companyAddress?: string;        // Physical address
  companyWebsite?: string;        // Website URL
  companyLogo?: string;           // Logo image URL
  kraPin?: string;                // Tax registration
  taxRate?: string;               // VAT/Tax rate
}
```

### ClientInfo Object
```typescript
interface ClientInfo {
  clientName?: string;            // Customer name
  clientCompany?: string;         // Customer company
  clientEmail?: string;           // Customer email
  clientPhone?: string;           // Customer phone
  clientAddress?: string;         // Customer address
  clientKraPin?: string;          // Customer tax ID
}
```

### LineItem Object
```typescript
interface LineItem {
  description?: string;           // Item description
  quantity?: number | string;     // Quantity
  unitPrice?: number | string;    // Price per unit
  amount?: number | string;       // Total amount
}
```

### Complete TemplateData
```typescript
interface TemplateData {
  documentType: string;           // "invoice", "estimate", etc.
  documentNumber: string;         // Document ID
  issueDate: string;              // Issue date
  dueDate?: string;               // Due date (optional)
  companyInfo?: CompanyInfo;      // Company details
  clientInfo?: ClientInfo;        // Client details
  lineItems?: LineItem[];         // Array of line items
  subtotal?: number | string;     // Subtotal
  tax?: number | string;          // Tax amount
  total?: number | string;        // Grand total
  taxRate?: string;               // Tax percentage
  [key: string]: any;             // Additional custom fields
}
```

---

## Usage Examples

### Basic Invoice Rendering
```typescript
import { templateRenderer } from "@/lib/templateRenderer";

const data = {
  documentType: "invoice",
  documentNumber: "INV-001",
  issueDate: "2026-04-22",
  dueDate: "2026-05-22",
  companyInfo: {
    companyName: "Melitech Solutions",
    companyTagline: "Enterprise Solutions",
    companyPhone: "+254 701 234567",
    companyEmail: "info@melitech.co.ke",
    companyAddress: "123 Tech Street, Nairobi, KE",
    companyWebsite: "https://melitech.co.ke",
    companyLogo: "https://example.com/logo.png",
    kraPin: "P001234567A",
    taxRate: "16%",
  },
  clientInfo: {
    clientName: "John Doe",
    clientCompany: "ABC Ltd",
    clientEmail: "john@abc.com",
    clientPhone: "+254 700 123456",
    clientAddress: "456 Business Ave, Nairobi",
    clientKraPin: "P987654321B",
  },
  lineItems: [
    {
      description: "Software Development Services",
      quantity: 40,
      unitPrice: "5000.00",
      amount: "200000.00",
    },
    {
      description: "Consultation & Support",
      quantity: 10,
      unitPrice: "2000.00",
      amount: "20000.00",
    },
  ],
  subtotal: "220000.00",
  tax: "35200.00",
  total: "255200.00",
};

// Render to HTML string
const html = await templateRenderer.renderTemplate("invoice", data);

// Or render directly to DOM element
const container = document.getElementById("template-container");
await templateRenderer.renderToElement("invoice", data, container);
```

### React Component Usage
```typescript
import { TemplatePreview } from "@/components/TemplatePreview";

export function InvoicePreview() {
  const data: TemplateData = {
    documentType: "invoice",
    documentNumber: "INV-001",
    issueDate: "2026-04-22",
    // ... rest of data
  };

  return (
    <TemplatePreview
      templateType="invoice"
      data={data}
      onPrint={() => console.log("Printing...")}
      onDownload={() => console.log("Downloading...")}
    />
  );
}
```

---

## How It Works

### 1. Content Extraction
The renderer extracts the main document content from nested HTML structures:
```
Input:  <!DOCTYPE html><html><head>...</head><body><div>...</div></body></html>
Output: <div>...</div>  (cleaned inner content)
```

### 2. Variable Substitution
Replaces all template variables in order:
1. Nested objects: `${companyInfo.companyName}` → "Melitech"
2. Simple variables: `${total}` → "255200.00"
3. Legacy format: `[TOTAL]` → "255200.00"

### 3. DOM Parsing
Converts HTML string to DOM for attribute binding:
- `data-section="line-items"` → Dynamic table rendering
- `data-field="fieldName"` → Value binding

### 4. Line Items Rendering
Clones table rows for each item:
```html
<!-- Template row -->
<tr>
  <td>Item Description</td>
  <td>1</td>
  <td>Price</td>
  <td>Amount</td>
</tr>

<!-- Rendered as: -->
<tr>
  <td>Software Development Services</td>
  <td>40</td>
  <td>5000.00</td>
  <td>200000.00</td>
</tr>
<tr>
  <td>Consultation & Support</td>
  <td>10</td>
  <td>2000.00</td>
  <td>20000.00</td>
</tr>
```

### 5. Print-Safe Output
Wraps rendered content in print-friendly container:
```html
<div class="document-print-container" style="max-width: 900px; ...">
  {rendered content}
</div>
```

---

## Integration Steps

### 1. Create Template File
Save template HTML to `/public/templates/{templateType}-template.html`:
- Example: `/public/templates/invoice-template.html`
- Example: `/public/templates/estimate-template.html`

### 2. Prepare Data
Structure your data according to `TemplateData` interface.

### 3. Render Template
```typescript
await templateRenderer.renderToElement("invoice", data, containerElement);
```

### 4. Add Print/Download
The `TemplatePreview` component includes buttons for print and PDF download.

---

## Advanced Features

### Custom Data Fields
Add any custom fields to `TemplateData`:
```typescript
const data: TemplateData = {
  documentType: "invoice",
  // ... standard fields
  customField: "Custom Value",           // Will be available as ${customField}
  paymentTerms: "Net 30",                // Will be available as ${paymentTerms}
  notes: "Please pay within 30 days",    // Will be available as ${notes}
};
```

### Dynamic Section Rendering
Create sections with `data-section` attribute:
```html
<div data-section="custom-section">
  <!-- Custom rendering logic handled here -->
</div>
```

### Template Caching
Templates are automatically cached after first load:
```typescript
// Clear cache (useful during development)
templateRenderer.clearCache();

// Get list of cached templates
const cached = templateRenderer.getCachedTemplates();
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Variables not replaced | Ensure syntax is exactly `${variableName}` (no spaces) |
| Line items not rendering | Add `data-section="line-items"` to table container |
| Multiple HTML tags causing issues | Renderer auto-extracts main content |
| Print not working | Check browser allows popups |
| Custom fields not available | Add to `TemplateData` interface if needed |

---

## Performance Considerations

- **Caching**: Templates are cached after first load
- **Large line items**: Renderer clones rows efficiently
- **Memory**: Max 1000 items recommended (can be adjusted)
- **Print**: Uses browser print preview (no server-side PDF)

---

## Backward Compatibility

The renderer maintains backward compatibility with:
- `${companyInfo.name}` → Falls back to `companyInfo.companyName`
- `[PLACEHOLDERS]` → Still supported alongside `${variables}`
- Legacy field names still work if provided

---

## File Structure

```
src/
├── lib/
│   └── templateRenderer.ts          # Main renderer (v2 - redesigned)
├── components/
│   └── TemplatePreview.tsx          # React component wrapper
public/
└── templates/
    ├── invoice-template.html        # Invoice template
    ├── estimate-template.html       # Estimate template
    ├── receipt-template.html        # Receipt template
    └── ...                          # Other templates
```

---

## Next Steps

1. **Create HTML templates** in `/public/templates/` directory
2. **Update template files** with proper variable syntax: `${field}`
3. **Use TemplatePreview** component in document details pages
4. **Test printing** and PDF download functionality
5. **Customize styling** for your brand guidelines


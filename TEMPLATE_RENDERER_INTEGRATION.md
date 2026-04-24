# Document Template Renderer - Integration Guide

## Quick Start

### 1. Place Template HTML File

Save your template HTML to:
```
public/templates/{templateType}-template.html
```

Example locations:
- `public/templates/invoice-template.html`
- `public/templates/estimate-template.html`
- `public/templates/receipt-template.html`

### 2. Use TemplatePreview Component

```typescript
import { TemplatePreview } from "@/components/TemplatePreview";
import { TemplateData } from "@/lib/templateRenderer";

export function InvoiceDetailsPage() {
  const data: TemplateData = {
    documentType: "invoice",
    documentNumber: "INV-2026-001",
    issueDate: "2026-04-22",
    dueDate: "2026-05-22",
    companyInfo: {
      companyName: "Melitech Solutions",
      companyTagline: "Enterprise Solutions",
      companyPhone: "+254 701 234567",
      companyEmail: "info@melitech.co.ke",
      companyAddress: "123 Tech Street, Nairobi, Kenya",
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

  return (
    <TemplatePreview
      templateType="invoice"
      data={data}
      title="Invoice Preview"
      showRefresh={true}
      onPrint={() => console.log("Document printed")}
      onDownload={() => console.log("PDF exported")}
    />
  );
}
```

### 3. Template Variables

Use these formats in your HTML template:

#### Object Fields (Recommended)
```html
<!-- Company Info -->
<div>${companyInfo.companyName}</div>
<div>${companyInfo.companyPhone}</div>
<div>${companyInfo.companyEmail}</div>

<!-- Client Info -->
<div>${clientInfo.clientName}</div>
<div>${clientInfo.clientCompany}</div>
<div>${clientInfo.clientEmail}</div>

<!-- Document Fields -->
<div>${documentNumber}</div>
<div>${issueDate}</div>
<div>${dueDate}</div>
```

#### Simple Variables
```html
<div>${total}</div>
<div>${subtotal}</div>
<div>${tax}</div>
<div>${taxRate}</div>
```

### 4. Dynamic Line Items

Mark your table with `data-section="line-items"`:

```html
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
      <!-- First row is template -->
      <tr>
        <td>Item Description</td>
        <td>1</td>
        <td>Price</td>
        <td>Amount</td>
      </tr>
    </tbody>
  </table>
</div>
```

The renderer will:
- Use the first `<tr>` as a template
- Clone it for each item in `data.lineItems`
- Fill in: description, quantity, unitPrice, amount
- Remove placeholder rows

---

## Template Structure Reference

### Nested HTML Handling

The renderer **automatically extracts** the main content from nested HTML:

```
Input:
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <div style="max-width: 900px; ...">
      {ACTUAL CONTENT HERE}
    </div>
  </body>
</html>

Output:
<div style="max-width: 900px; ...">
  {ACTUAL CONTENT HERE}
</div>
```

### Print-Safe Styling

Include these styles in your template `<style>` section:

```html
<style>
  @page {
    margin: 40px;
    size: A4;
  }
  
  @media print {
    * { 
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    body { 
      margin: 0;
      padding: 0;
      background: white;
    }
    .document-container { 
      max-width: 100%;
      padding: 0;
      margin: 0;
      box-shadow: none;
    }
    .no-print { 
      display: none !important;
    }
    table { 
      page-break-inside: avoid;
    }
  }
</style>
```

---

## Data Binding Examples

### Example 1: Invoice with Multiple Items

```typescript
const data: TemplateData = {
  documentType: "invoice",
  documentNumber: "INV-2026-0042",
  issueDate: "2026-04-22",
  dueDate: "2026-05-22",
  companyInfo: {
    companyName: "Melitech Solutions Ltd",
    companyTagline: "Enterprise CRM & Business Solutions",
    companyPhone: "+254 (0)701 234567",
    companyEmail: "billing@melitech.co.ke",
    companyAddress: "Level 3, Tech Park, Nairobi, Kenya",
    companyWebsite: "https://melitech.co.ke",
    companyLogo: "https://melitech.co.ke/logo.png",
    kraPin: "P001234567A",
    taxRate: "16%",
  },
  clientInfo: {
    clientName: "Jane Smith",
    clientCompany: "Digital Ventures Ltd",
    clientEmail: "jane.smith@digitalventures.com",
    clientPhone: "+254 700 123456",
    clientAddress: "10th Floor, Business Centre, Westlands, Nairobi",
    clientKraPin: "P987654321B",
  },
  lineItems: [
    {
      description: "System Development - Phase 1",
      quantity: 80,
      unitPrice: "2500.00",
      amount: "200000.00",
    },
    {
      description: "System Integration",
      quantity: 20,
      unitPrice: "2000.00",
      amount: "40000.00",
    },
    {
      description: "Training & Documentation",
      quantity: 2,
      unitPrice: "5000.00",
      amount: "10000.00",
    },
  ],
  subtotal: "250000.00",
  tax: "40000.00",
  total: "290000.00",
};
```

### Example 2: Estimate/Quotation

```typescript
const data: TemplateData = {
  documentType: "estimate",
  documentNumber: "EST-2026-0015",
  issueDate: "2026-04-22",
  dueDate: "2026-05-22", // Valid until date for estimates
  companyInfo: { /* ... */ },
  clientInfo: { /* ... */ },
  lineItems: [
    {
      description: "Web Application Development",
      quantity: 120,
      unitPrice: "3000.00",
      amount: "360000.00",
    },
  ],
  subtotal: "360000.00",
  tax: "57600.00",
  total: "417600.00",
  taxRate: "16%",
};
```

### Example 3: Receipt

```typescript
const data: TemplateData = {
  documentType: "receipt",
  documentNumber: "REC-2026-0089",
  issueDate: "2026-04-22",
  companyInfo: { /* ... */ },
  clientInfo: {
    clientName: "Payment from ABC Ltd",
    clientCompany: "ABC Ltd",
    clientEmail: "finance@abc.com",
    /* ... */
  },
  total: "145000.00",
  // Receipts typically show a single payment amount
};
```

---

## API Reference

### TemplatePreview Props

```typescript
interface TemplatePreviewProps {
  // Required
  templateType: string;              // "invoice", "estimate", etc.
  data: TemplateData;                // Document data

  // Optional
  onPrint?: () => void;              // Called after print dialog
  onDownload?: () => void;           // Called after PDF download
  className?: string;                // Additional CSS classes
  title?: string;                    // Display title (default: "Document Preview")
  showRefresh?: boolean;             // Show refresh button (default: true)
}
```

### templateRenderer Methods

```typescript
// Load and render template to HTML string
const html = await templateRenderer.renderTemplate("invoice", data);

// Render template into a DOM element
await templateRenderer.renderToElement("invoice", data, containerElement);

// Clear cache (development only)
templateRenderer.clearCache();

// Get cached template names
const cached = templateRenderer.getCachedTemplates(); // ["invoice", "estimate", ...]
```

---

## Troubleshooting

### Variables Not Replaced

**Problem:** `${companyInfo.companyName}` appears literally in output

**Solutions:**
- Check exact variable name matches your data object
- Ensure no extra spaces: `${ companyInfo.companyName }` won't work
- Verify template is loaded correctly in browser DevTools

### Line Items Not Rendering

**Problem:** Template row appears but data isn't filled in

**Solutions:**
- Add `data-section="line-items"` to table container
- Ensure `lineItems` array is provided in data
- Check first `<tr>` in `<tbody>` has 4 cells for 4 columns

### Print/PDF Not Working

**Problem:** Print button does nothing or shows blank page

**Solutions:**
- Check browser allows popups (whitelist domain)
- Verify template renders correctly in preview
- Check console for errors (F12)
- Try refreshing the page

### Styling Lost on Print

**Problem:** Colors or formatting disappears when printing

**Solutions:**
- Add `@media print` rules with `-webkit-print-color-adjust: exact`
- Use inline styles instead of CSS classes where possible
- Test in actual print preview (Ctrl+Shift+P)

---

## Best Practices

### 1. Template Organization
```
public/templates/
├── invoice-template.html
├── estimate-template.html
├── receipt-template.html
├── delivery-note-template.html
└── ...
```

### 2. Consistent Data Structure
Always provide all fields, use empty strings for optional ones:
```typescript
clientInfo: {
  clientName: "John Doe",
  clientCompany: "",           // Empty string, not undefined
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  clientKraPin: "",
}
```

### 3. Number Formatting
Format numbers before passing to template:
```typescript
const total = parseFloat("255200").toLocaleString('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 2,
});
// Result: "KES 255,200.00"
```

### 4. Date Formatting
```typescript
const issueDate = new Date().toLocaleDateString('en-KE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
// Result: "22/04/2026"
```

### 5. Image URLs
Use absolute URLs for logos in templates:
```html
<img src="https://example.com/logo.png" alt="Company Logo" />
```

---

## File Locations Reference

```
e:\Nexus360\
├── client\src\
│   ├── lib\
│   │   └── templateRenderer.ts          # Main renderer (v2)
│   └── components\
│       └── TemplatePreview.tsx          # React component
├── public\templates\                     # Template files
│   ├── invoice-template.html
│   ├── estimate-template.html
│   └── ...
├── TEMPLATE_RENDERER_GUIDE.md           # Full documentation
├── SAMPLE_INVOICE_TEMPLATE.html         # Example template
└── TEMPLATE_RENDERER_INTEGRATION.md     # This file
```

---

## Summary

The redesigned template renderer provides:

✅ Proper handling of nested HTML structures  
✅ Template variable substitution with dot notation  
✅ Dynamic line item rendering  
✅ Print and PDF export functionality  
✅ Print-safe styling  
✅ Easy integration with React components  
✅ Backward compatibility with legacy formats  

To implement:

1. Create HTML template in `/public/templates/`
2. Use `TemplatePreview` component in your page
3. Provide data matching `TemplateData` interface
4. Test printing and PDF export

See `SAMPLE_INVOICE_TEMPLATE.html` for a complete example.


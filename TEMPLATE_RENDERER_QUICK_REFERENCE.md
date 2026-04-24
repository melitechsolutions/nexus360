# Template Renderer - Quick Reference

## Template Variable Patterns

### Pattern 1: Company Information
```html
<h1>${companyInfo.companyName}</h1>
<p>${companyInfo.companyTagline}</p>
<p>${companyInfo.companyPhone}</p>
<p>${companyInfo.companyEmail}</p>
<p>${companyInfo.companyAddress}</p>
<p>${companyInfo.companyWebsite}</p>
<img src="${companyInfo.companyLogo}" alt="Logo" />
```

### Pattern 2: Client/Customer Information
```html
<div>
  <strong>${clientInfo.clientName}</strong>
  <div>${clientInfo.clientCompany}</div>
  <div>${clientInfo.clientEmail}</div>
  <div>${clientInfo.clientPhone}</div>
  <div>${clientInfo.clientAddress}</div>
  <div>KRA PIN: ${clientInfo.clientKraPin}</div>
</div>
```

### Pattern 3: Document Details
```html
<div>
  <div>Document #: ${documentNumber}</div>
  <div>Date: ${issueDate}</div>
  <div>Due: ${dueDate}</div>
  <div>Tax Rate: ${taxRate}</div>
</div>
```

### Pattern 4: Line Items Table
```html
<table data-section="line-items">
  <thead>
    <tr>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit Price</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    <!-- This row is cloned for each item -->
    <tr>
      <td>Item Description</td>
      <td>1</td>
      <td>$0.00</td>
      <td>$0.00</td>
    </tr>
  </tbody>
</table>
```

### Pattern 5: Totals Section
```html
<div>
  <div>Subtotal: ${subtotal}</div>
  <div>Tax (${taxRate}): ${tax}</div>
  <div><strong>Total: ${total}</strong></div>
</div>
```

---

## Component Usage

### Basic Usage
```typescript
import { TemplatePreview } from "@/components/TemplatePreview";

<TemplatePreview
  templateType="invoice"
  data={templateData}
/>
```

### Full Features
```typescript
<TemplatePreview
  templateType="invoice"
  data={templateData}
  title="Invoice Preview"
  showRefresh={true}
  onPrint={() => trackPrint("invoice")}
  onDownload={() => trackDownload("invoice")}
  className="mt-6"
/>
```

---

## Data Preparation

### Minimal Data
```typescript
const data: TemplateData = {
  documentType: "invoice",
  documentNumber: "INV-001",
  issueDate: "2026-04-22",
};
```

### Full Data
```typescript
const data: TemplateData = {
  documentType: "invoice",
  documentNumber: "INV-001",
  issueDate: "2026-04-22",
  dueDate: "2026-05-22",
  
  companyInfo: {
    companyName: "Your Company",
    companyTagline: "Tagline here",
    companyPhone: "+254 700 000000",
    companyEmail: "info@company.com",
    companyAddress: "Address line",
    companyWebsite: "https://company.com",
    companyLogo: "https://company.com/logo.png",
    kraPin: "P123456789X",
    taxRate: "16%",
  },

  clientInfo: {
    clientName: "Customer Name",
    clientCompany: "Customer Company",
    clientEmail: "customer@email.com",
    clientPhone: "+254 700 111111",
    clientAddress: "Customer address",
    clientKraPin: "P987654321Y",
  },

  lineItems: [
    {
      description: "Service 1",
      quantity: 10,
      unitPrice: "1000.00",
      amount: "10000.00",
    },
    {
      description: "Service 2",
      quantity: 5,
      unitPrice: "2000.00",
      amount: "10000.00",
    },
  ],

  subtotal: "20000.00",
  tax: "3200.00",
  total: "23200.00",
};
```

---

## Number Formatting

### Format Currency
```typescript
const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(num);
};

// Usage
subtotal: formatCurrency(250000),   // "KES 250,000.00"
tax: formatCurrency(40000),         // "KES 40,000.00"
total: formatCurrency(290000),      // "KES 290,000.00"
```

### Format Percentages
```typescript
const taxRate = "16%";  // Use as-is
```

### Format Dates
```typescript
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Usage
issueDate: formatDate(new Date()),          // "22/04/2026"
dueDate: formatDate(new Date(Date.now() + 30*24*60*60*1000))  // "22/05/2026"
```

---

## Template File Creation

### Step 1: Create HTML File
Save to: `public/templates/invoice-template.html`

### Step 2: Add Styles
```html
<style>
  @page { margin: 40px; size: A4; }
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 0; }
  }
</style>
```

### Step 3: Add Structure
```html
<body>
  <div class="document-container">
    <!-- Header -->
    <div data-section="header">...</div>
    
    <!-- Title -->
    <h1 data-section="title">INVOICE</h1>
    
    <!-- Details -->
    <div data-section="document-info">...</div>
    
    <!-- Line Items -->
    <div data-section="line-items">...</div>
    
    <!-- Totals -->
    <div data-section="totals">...</div>
    
    <!-- Footer -->
    <div data-section="footer">...</div>
  </div>
</body>
```

### Step 4: Add Variables
Replace all placeholders with `${variable}` syntax

### Step 5: Test
Load in browser and verify all variables replace

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Variables show as literal text | Check exact spelling and syntax: `${variableName}` |
| Line items not rendering | Add `data-section="line-items"` to table |
| Print is blank | Check template loads without errors (F12) |
| Missing company info | Ensure `companyInfo` object is provided in data |
| Currency formatting off | Use `formatCurrency()` function before passing |

---

## Testing Checklist

- [ ] Template loads without errors
- [ ] All variables replaced correctly
- [ ] Line items populate from array
- [ ] Print preview shows correct formatting
- [ ] PDF save dialog appears
- [ ] Page breaks work for large documents
- [ ] Colors maintain in print
- [ ] No console errors (F12)

---

## File Locations

```
Templates:
public/templates/
├── invoice-template.html
├── estimate-template.html
├── receipt-template.html
└── ...

Source Code:
client/src/
├── lib/templateRenderer.ts
└── components/TemplatePreview.tsx

Documentation:
├── TEMPLATE_RENDERER_GUIDE.md
├── TEMPLATE_RENDERER_INTEGRATION.md
├── TEMPLATE_RENDERER_REDESIGN_SUMMARY.md
├── TEMPLATE_RENDERER_QUICK_REFERENCE.md  (this file)
└── SAMPLE_INVOICE_TEMPLATE.html
```

---

## Copy-Paste Ready Examples

### Invoice Component
```typescript
import { TemplatePreview } from "@/components/TemplatePreview";
import type { TemplateData } from "@/lib/templateRenderer";

interface InvoicePreviewProps {
  invoice: {
    id: string;
    number: string;
    issueDate: Date;
    dueDate: Date;
    client: { name: string; email: string; phone: string };
    items: { description: string; quantity: number; price: number }[];
    subtotal: number;
    tax: number;
    total: number;
  };
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const data: TemplateData = {
    documentType: "invoice",
    documentNumber: invoice.number,
    issueDate: invoice.issueDate.toLocaleDateString('en-KE'),
    dueDate: invoice.dueDate.toLocaleDateString('en-KE'),
    
    companyInfo: {
      companyName: "Melitech Solutions",
      companyPhone: "+254 701 234567",
      companyEmail: "billing@melitech.co.ke",
      companyAddress: "Tech Park, Nairobi",
      companyLogo: "https://melitech.co.ke/logo.png",
      taxRate: "16%",
    },
    
    clientInfo: {
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      clientPhone: invoice.client.phone,
    },
    
    lineItems: invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.price.toFixed(2),
      amount: (item.quantity * item.price).toFixed(2),
    })),
    
    subtotal: invoice.subtotal.toFixed(2),
    tax: invoice.tax.toFixed(2),
    total: invoice.total.toFixed(2),
  };

  return (
    <TemplatePreview
      templateType="invoice"
      data={data}
      title={`Invoice ${invoice.number}`}
      onPrint={() => console.log("Invoice printed")}
      onDownload={() => console.log("Invoice downloaded")}
    />
  );
}
```

---

## API Quick Reference

```typescript
// Main functions
templateRenderer.renderTemplate(type, data)           // → Promise<string>
templateRenderer.renderToElement(type, data, element) // → Promise<void>
templateRenderer.loadTemplate(type)                   // → Promise<string>
templateRenderer.bindData(html, data)                 // → string

// Utilities
templateRenderer.clearCache()          // Clear cached templates
templateRenderer.getCachedTemplates()  // → string[] (cached types)
```

---

## Environment Setup

```bash
# No additional setup needed
# Templates load from: /public/templates/
# Component available at: @/components/TemplatePreview
# Renderer at: @/lib/templateRenderer
```

---

**Last Updated:** 2026-04-22  
**Version:** 2.0  
**Status:** Production Ready ✅

# Document Template Renderer - Redesign Summary

## Overview

The document template renderer has been **completely redesigned (v2)** to handle complex nested HTML structures and provide comprehensive data binding capabilities for invoice, estimate, and other business document templates.

---

## What Changed

### Before (v1)
- ❌ Only supported simple field replacement
- ❌ Struggled with nested HTML structures
- ❌ Limited data binding options
- ❌ Basic template variable support

### After (v2)
- ✅ **Proper nested HTML extraction** - Handles multiple `<html>`, `<head>`, `<body>` tags
- ✅ **Advanced variable substitution** - `${object.field}`, `${variable}`, `[PLACEHOLDER]`
- ✅ **Dynamic content rendering** - Automatic line item table population
- ✅ **Data-section attributes** - Specific areas for custom rendering
- ✅ **Enhanced print/PDF support** - Proper styling and formatting
- ✅ **Backward compatible** - Legacy format still works

---

## Key Improvements

### 1. HTML Structure Extraction
```typescript
// Automatically extracts main content from nested structure
// Input:  <!DOCTYPE html><html><head>...</head><body><div>...</div></body></html>
// Output: <div>...</div>

// Method: extractDocumentContent()
private extractDocumentContent(html: string): string
```

### 2. Template Variable Substitution
```typescript
// Supports three formats (in order of precedence):

// 1. Nested object paths (NEW)
${companyInfo.companyName}
${clientInfo.clientEmail}
${object.nested.field}

// 2. Simple variables
${documentNumber}
${issueDate}
${total}

// 3. Legacy brackets (backward compatible)
[INVOICENUMBER]
[ISSUE_DATE]
```

### 3. Dynamic Line Items Rendering
```typescript
// Automatically clones and populates table rows
<div data-section="line-items">
  <table>
    <tbody>
      <tr>
        <td>Item Description</td>
        <td>1</td>
        <td>Price</td>
        <td>Amount</td>
      </tr>
      <!-- Cloned for each lineItem in data -->
    </tbody>
  </table>
</div>

// Method: renderLineItems()
private renderLineItems(container: Element, items: LineItem[]): void
```

### 4. Enhanced Component
```typescript
// TemplatePreview Component (v2) Features:
- Toolbar with refresh button
- Better loading state UI
- Improved error handling
- Retry functionality
- Print preview dialog
- PDF export via browser print
- Proper print styling
```

---

## Data Structures

### CompanyInfo
```typescript
interface CompanyInfo {
  companyName?: string;        // "Melitech Solutions"
  companyTagline?: string;     // "Enterprise Solutions"
  companyPhone?: string;       // "+254 701 234567"
  companyEmail?: string;       // "info@melitech.co.ke"
  companyAddress?: string;     // "123 Tech St, Nairobi"
  companyWebsite?: string;     // "https://melitech.co.ke"
  companyLogo?: string;        // "https://.../logo.png"
  kraPin?: string;             // "P001234567A"
  taxRate?: string;            // "16%"
}
```

### ClientInfo
```typescript
interface ClientInfo {
  clientName?: string;         // "John Doe"
  clientCompany?: string;      // "ABC Ltd"
  clientEmail?: string;        // "john@abc.com"
  clientPhone?: string;        // "+254 700 123456"
  clientAddress?: string;      // "456 Business Ave"
  clientKraPin?: string;       // "P987654321B"
}
```

### LineItem
```typescript
interface LineItem {
  description?: string;        // "Software Development"
  quantity?: number | string;  // 40
  unitPrice?: number | string; // "2500.00"
  amount?: number | string;    // "100000.00"
}
```

### TemplateData
```typescript
interface TemplateData {
  documentType: string;        // "invoice", "estimate", etc.
  documentNumber: string;      // "INV-001"
  issueDate: string;           // "2026-04-22"
  dueDate?: string;            // "2026-05-22"
  companyInfo?: CompanyInfo;   // Company details
  clientInfo?: ClientInfo;     // Client/customer details
  lineItems?: LineItem[];      // Array of line items
  subtotal?: number | string;  // "250000.00"
  tax?: number | string;       // "40000.00"
  total?: number | string;     // "290000.00"
  taxRate?: string;            // "16%"
  [key: string]: any;          // Any custom fields
}
```

---

## Processing Pipeline

The renderer processes templates in this order:

```
1. Load Template
   ├─ Check cache
   ├─ Fetch from /templates/{type}-template.html
   └─ Cache for reuse

2. Extract Content
   ├─ Find nested <body> tags
   ├─ Extract main document container
   └─ Remove wrapper HTML

3. Bind Template Variables
   ├─ Replace ${object.field} paths
   ├─ Replace ${variable} names
   └─ Replace [PLACEHOLDER] format

4. Parse DOM
   ├─ Convert HTML string to DOM
   └─ Prepare for attribute binding

5. Process Data Sections
   ├─ Find [data-section="line-items"]
   ├─ Clone template rows
   ├─ Fill with item data
   └─ Remove placeholder rows

6. Extract Result
   ├─ Get processed body content
   └─ Return clean HTML

7. Render to Element
   ├─ Wrap in print-safe container
   └─ Set in target DOM element
```

---

## Usage Example

### React Component
```typescript
import { TemplatePreview } from "@/components/TemplatePreview";

export function InvoiceDetails() {
  const data: TemplateData = {
    documentType: "invoice",
    documentNumber: "INV-2026-001",
    issueDate: "2026-04-22",
    dueDate: "2026-05-22",
    companyInfo: {
      companyName: "Melitech Solutions",
      companyPhone: "+254 701 234567",
      companyEmail: "info@melitech.co.ke",
      companyAddress: "123 Tech St, Nairobi",
      companyWebsite: "https://melitech.co.ke",
      companyLogo: "https://melitech.co.ke/logo.png",
      kraPin: "P001234567A",
      taxRate: "16%",
    },
    clientInfo: {
      clientName: "John Doe",
      clientCompany: "ABC Ltd",
      clientEmail: "john@abc.com",
      clientPhone: "+254 700 123456",
      clientAddress: "456 Business Ave",
      clientKraPin: "P987654321B",
    },
    lineItems: [
      {
        description: "Software Development",
        quantity: 40,
        unitPrice: "2500.00",
        amount: "100000.00",
      },
      {
        description: "Consultation",
        quantity: 20,
        unitPrice: "1500.00",
        amount: "30000.00",
      },
    ],
    subtotal: "130000.00",
    tax: "20800.00",
    total: "150800.00",
  };

  return (
    <TemplatePreview
      templateType="invoice"
      data={data}
      title="Invoice Preview"
      showRefresh={true}
      onPrint={() => console.log("Printed")}
      onDownload={() => console.log("PDF saved")}
    />
  );
}
```

### Template HTML
```html
<!-- public/templates/invoice-template.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <div class="document-container" style="max-width: 900px; margin: 0 auto; padding: 32px;">
      
      <!-- Header -->
      <div data-section="header">
        <h1>${companyInfo.companyName}</h1>
        <p>${companyInfo.companyPhone}</p>
        <p>${companyInfo.companyEmail}</p>
      </div>

      <!-- Invoice Details -->
      <div>
        <h2>INVOICE</h2>
        <p>Invoice #: ${documentNumber}</p>
        <p>Date: ${issueDate}</p>
        <p>Due: ${dueDate}</p>
      </div>

      <!-- Bill To -->
      <div>
        <h3>Bill To</h3>
        <p>${clientInfo.clientName}</p>
        <p>${clientInfo.clientCompany}</p>
        <p>${clientInfo.clientEmail}</p>
      </div>

      <!-- Line Items -->
      <div data-section="line-items">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Item</td>
              <td>1</td>
              <td>$0.00</td>
              <td>$0.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div>
        <p>Subtotal: ${subtotal}</p>
        <p>Tax: ${tax}</p>
        <p>Total: ${total}</p>
      </div>

      <!-- Footer -->
      <div data-section="footer">
        <p>${companyInfo.companyName}</p>
        <p>${companyInfo.companyEmail}</p>
      </div>

    </div>
  </body>
</html>
```

---

## File Changes

### Modified Files
- ✅ `client/src/lib/templateRenderer.ts` - Complete redesign (v1 → v2)
- ✅ `client/src/components/TemplatePreview.tsx` - Enhanced with new features

### New Files
- ✅ `TEMPLATE_RENDERER_GUIDE.md` - Complete documentation
- ✅ `TEMPLATE_RENDERER_INTEGRATION.md` - Integration guide
- ✅ `SAMPLE_INVOICE_TEMPLATE.html` - Example template
- ✅ `TEMPLATE_RENDERER_REDESIGN_SUMMARY.md` - This file

---

## Migration Guide

### For Existing Templates

If you have existing templates using v1:

**Old Format (v1):**
```html
<p>[INVOICENUMBER]</p>
<p>[ISSUEDATE]</p>
<p>[CUSTOMERNAME]</p>
```

**New Format (v2) - Recommended:**
```html
<p>${documentNumber}</p>
<p>${issueDate}</p>
<p>${clientInfo.clientName}</p>
```

**Both formats work!** The renderer maintains backward compatibility.

### Template Updates

1. Update to use `${variable}` syntax
2. Change company/client fields to use proper object paths
3. Add `data-section="line-items"` to line items table
4. Test print/PDF functionality
5. Verify all variables replace correctly

---

## Performance

- **Template Caching**: First load is cached for reuse
- **DOM Parsing**: Single pass with efficient cloning
- **Line Items**: O(n) complexity - linear with item count
- **Memory**: Minimal - no external dependencies

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome)

---

## Next Steps

1. **Review** the sample template: `SAMPLE_INVOICE_TEMPLATE.html`
2. **Create** your templates in `/public/templates/`
3. **Use** the `TemplatePreview` component in your pages
4. **Test** printing and PDF export
5. **Customize** styling for your brand

---

## Support

For issues or questions:
1. Check `TEMPLATE_RENDERER_GUIDE.md` for detailed documentation
2. See `TEMPLATE_RENDERER_INTEGRATION.md` for integration examples
3. Review browser console (F12) for error messages
4. Verify template file exists and is valid HTML

---

## Changelog

### v2.0 (Current)
- Complete redesign with nested HTML support
- Advanced template variable substitution
- Dynamic line items rendering
- Enhanced print/PDF functionality
- Improved React component with toolbar
- Better error handling

### v1.0 (Previous)
- Basic template loading and rendering
- Simple placeholder replacement
- Limited data binding

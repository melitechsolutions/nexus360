# Document Template Implementation Guide

## Quick Start for Template Usage

### 1. **Template Structure**

All templates follow a consistent HTML structure with embedded CSS for styling:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Meta tags and CSS link -->
    <link rel="stylesheet" href="../styles/document-professional-template.css">
  </head>
  <body>
    <div class="document-container">
      <!-- Header with company branding -->
      <!-- Document title -->
      <!-- Document metadata -->
      <!-- Party details -->
      <!-- Document content -->
      <!-- Terms & Conditions -->
      <!-- Footer -->
    </div>
  </body>
</html>
```

### 2. **Data Binding Points**

Templates use placeholder syntax for dynamic data binding. Common patterns:

```html
<!-- Company Logo -->
<img src="${companyInfo.companyLogo}">

<!-- Document Number -->
<span class="meta-value">INV-00001</span>

<!-- Customer Details -->
<div><strong>Client Name:</strong> [Client Name]</div>

<!-- Formatted Currency -->
<td style="text-align: right;">KES 14,250.00</td>
```

### 3. **CSS Classes & Styling**

Key CSS classes used across templates:

- `.document-container` - Main document wrapper
- `.document-header` - Header with company info
- `.company-info` - Company details section
- `.document-title` - Main document heading
- `.document-meta` - Document metadata (numbers, dates)
- `.client-details` - Customer/supplier details box
- `.section` - Content sections
- `.section-title` - Section headings
- `.section-content` - Section body content
- `.info-box` - Information highlight boxes
- `.highlight-box` - Emphasized totals/key information
- `.document-footer` - Footer with contact info
- `.no-print` - Elements hidden during printing

### 4. **Common Usage Patterns**

#### Dynamic Data Replacement Pattern:
```html
<!-- Original Placeholder -->
<span class="meta-value">INV-00001</span>

<!-- In React/JS - Replace with -->
<span className="meta-value">{invoice.invoiceNumber}</span>
```

#### Table Data Population:
```html
<tbody>
  {items.map((item, index) => (
    <tr key={index}>
      <td>{item.description}</td>
      <td style="text-align: center;">{item.quantity}</td>
      <td style="text-align: right;">KES {item.unitPrice.toLocaleString()}</td>
      <td style="text-align: right;">KES {item.total.toLocaleString()}</td>
    </tr>
  ))}
</tbody>
```

#### Conditional Rendering for T&Cs:
Different T&Cs are already embedded in each template. No need to switch between files - just use the appropriate template file for the document type.

### 5. **Integration with React Component**

Example component for rendering a template:

```typescript
interface DocumentTemplateProps {
  documentType: 'invoice' | 'receipt' | 'grn' | 'workorder' | ...
  documentData: {
    invoiceNumber: string;
    date: string;
    customer: CustomerDetails;
    items: DocumentItem[];
    totals: DocumentTotals;
  }
}

export const DocumentTemplate: React.FC<DocumentTemplateProps> = ({ 
  documentType, 
  documentData 
}) => {
  
  const getTemplatePath = () => {
    const templates: Record<string, string> = {
      invoice: '/templates/Invoice-template.html',
      receipt: '/templates/receipt-template.html',
      grn: '/templates/grn-template.html',
      workorder: '/templates/work-order-template.html',
      // ... etc
    };
    return templates[documentType];
  };

  const populateTemplate = (html: string, data: any) => {
    // Replace placeholders with actual data
    let result = html;
    Object.keys(data).forEach(key => {
      result = result.replace(
        new RegExp(`\\[${key}\\]`, 'g'),
        data[key]
      );
    });
    return result;
  };

  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: populateTemplate(templateHTML, documentData) 
      }} 
    />
  );
};
```

### 6. **Printing & PDF Generation**

Built-in print button uses browser's print functionality:

```javascript
// Print functionality (already in template)
<button onclick="window.print()">Print Document</button>

// PDF generation (use browser print-to-PDF or server-side)
// Server-side example with Puppeteer:
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(htmlContent);
const pdf = await page.pdf({ format: 'A4' });
await browser.close();
```

### 7. **Document-Specific Implementations**

#### For Invoice Documents:
```typescript
const invoiceData = {
  invoiceNumber: 'INV-00001',
  invoiceDate: '29 Jan 2025',
  dueDate: '28 Feb 2025',
  clientName: 'ABC Company Ltd',
  items: [...],
  subtotal: 35000,
  vat: 5600,
  total: 40600
};
```

#### For Receiving Documents (GRN/DN):
```typescript
const receivingData = {
  documentNumber: 'GRN-00001',
  dateReceived: '29 Jan 2025',
  supplierName: 'Supplier Co',
  inspectionStatus: 'Passed',
  items: [...],
  remarks: 'All items received in good condition'
};
```

#### For Service/Work Orders:
```typescript
const workOrderData = {
  workOrderNumber: 'WO-00001',
  workType: 'Installation',
  clientName: 'Client Name',
  equipment: 'Server System',
  startDate: '05 Feb 2025',
  duration: '8 hours',
  team: ['Tech 1', 'Tech 2'],
  materials: [...],
  laborCost: 6000,
  materialsCost: 8000,
  total: 18560
};
```

### 8. **Company Information Placeholder**

All templates reference company information placeholder:
```html
<img src="${companyInfo.companyLogo}">
```

Ensure your component provides:
```typescript
const companyInfo = {
  companyLogo: '/path/to/logo.png',
  companyName: 'MELITECH SOLUTIONS',
  tagline: 'Redefining Technology!!!',
  phone: '+254 712 236 643',
  email: 'info@melitechsolutions.co.ke',
  address: 'P.O Box 85845 - 00200, Nairobi, Kenya'
};
```

### 9. **Styling Customization**

#### Apply Custom Colors:
All templates use CSS variables that can be overridden:
```css
/* In your own CSS file or style tag */
:root {
  --primary-color: #ff9f43;        /* Orange */
  --secondary-color: #3a4043;      /* Dark gray */
  --text-color: #333333;
  --border-color: #e0e0e0;
  --background-color: #ffffff;
}
```

#### Custom Fonts:
```css
/* Override in parent stylesheet */
.document-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
```

### 10. **Best Practices**

1. **Always include complete header information** - Logo, company name, contact details
2. **Validate data before rendering** - Ensure all required fields have values
3. **Format currency properly** - Use `.toLocaleString()` for thousands separators
4. **Include reference document numbers** - Link related documents (Invoice to PO, GRN to PO, etc)
5. **Maintain consistent naming** - Use same field names across templates
6. **Test printing** - Verify print layout matches on-screen appearance
7. **Archive PDFs** - Store generated documents with metadata for compliance
8. **Include audit information** - Track who created/modified each document
9. **Provide digital signatures** - Add e-signature capability for critical documents
10. **Version control T&Cs** - Document changes to terms and conditions

### 11. **Common Customization Scenarios**

#### Hide/Show Fields Based on Document Status:
```html
<!-- Only show on draft status -->
<p v-if="status !== 'finalized'">DRAFT - Not Official</p>

<!-- Only show if approved -->
<p v-if="approvalStatus === 'approved'" class="approved-badge">APPROVED</p>
```

#### Conditional T&Cs Based on Amount:
```html
<!-- Show payment terms only if amount is above threshold -->
<div v-if="total > 50000">
  <h2>Special Terms - Large Transaction</h2>
  <p>Installment payment available. Contact finance...</p>
</div>
```

#### Dynamic Table Rows with Totals:
```html
<tfoot>
  <tr>
    <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
    <td style="text-align: right;">KES {{itemsTotal.toLocaleString()}}</td>
  </tr>
</tfoot>
```

### 12. **Troubleshooting**

| Issue | Solution |
|-------|----------|
| Logo not displaying | Check image path, ensure publicURL is correct |
| Formatting breaks on print | Review CSS media queries, test in print preview |
| Data not populating | Verify placeholder syntax exactly matches template |
| Currency symbols wrong | Ensure locale formatting, use proper currency codes |
| Page breaks awkward | Use CSS `page-break-inside: avoid;` on critical sections |
| T&Cs too long | Use `font-size: 12px` for terms section, ensure readability |

---

## Template File Locations

All templates are in: `/templates/`

```
templates/
├── Invoice-template.html
├── receipt-template.html
├── credit-note-template.html
├── debit-note-template.html
├── service-invoice-template.html
├── expense-claim-template.html
├── order-template.html
├── lpo-template.html
├── quotation-rfq-template.html
├── estimate-template.html
├── grn-template.html
├── dn-template.html
├── assets-template.html
├── imprest-template.html
├── work-order-template.html
├── styles/
│   └── document-professional-template.css
⁄── TEMPLATE_REFERENCE_GUIDE.md
└── IMPLEMENTATION_GUIDE.md (this file)
```

---

## Support & Maintenance

For questions or updates:
- **Engineering Team:** [Contact Info]
- **Finance Team:** [Contact Info]
- **Last Updated:** March 13, 2025
- **Version:** 1.0

---

**Remember:** Each template includes document-type-specific Terms & Conditions that automatically apply to that document type. No configuration needed for T&Cs - they're built-in per template.

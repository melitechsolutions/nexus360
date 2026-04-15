/**
 * Template Renderer Utility
 * Handles loading, parsing, and rendering HTML templates with data binding
 */

export interface TemplateData {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  [key: string]: any;
}

class TemplateRenderer {
  private templateCache: Map<string, string> = new Map();

  /**
   * Load template HTML from public templates directory
   */
  async loadTemplate(templateType: string): Promise<string> {
    if (this.templateCache.has(templateType)) {
      return this.templateCache.get(templateType)!;
    }

    try {
      const response = await fetch(`/templates/${templateType}-template.html`);
      if (!response.ok) throw new Error(`Template not found: ${templateType}`);
      const html = await response.text();
      this.templateCache.set(templateType, html);
      return html;
    } catch (error) {
      console.error(`Failed to load template: ${templateType}`, error);
      throw error;
    }
  }

  /**
   * Bind data to template placeholders
   * Supports both [PLACEHOLDER] and data-field="fieldName" syntax
   */
  bindData(html: string, data: TemplateData): string {
    let result = html;

    // Replace [PLACEHOLDER] format
    Object.entries(data).forEach(([key, value]) => {
      const placeholders = [
        `[${key.toUpperCase()}]`,
        `[${key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}]`
      ];
      
      placeholders.forEach(placeholder => {
        result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
      });
    });

    // Replace data-field bindings using HTML parsing
    const parser = new DOMParser();
    try {
      const doc = parser.parseFromString(result, 'text/html');
      this.bindDataAttributes(doc, data);
      result = doc.documentElement.outerHTML;
    } catch (error) {
      console.warn('Error parsing DOM for data-field bindings:', error);
    }

    return result;
  }

  /**
   * Bind data to elements with data-field attributes
   */
  private bindDataAttributes(doc: Document, data: TemplateData): void {
    const elements = doc.querySelectorAll('[data-field]');
    elements.forEach((element) => {
      const fieldName = element.getAttribute('data-field');
      if (fieldName && data[fieldName]) {
        element.textContent = String(data[fieldName]);
      }
    });
  }

  /**
   * Render template with data and return as HTML string
   */
  async renderTemplate(templateType: string, data: TemplateData): Promise<string> {
    try {
      const template = await this.loadTemplate(templateType);
      return this.bindData(template, data);
    } catch (error) {
      console.error(`Failed to render template: ${templateType}`, error);
      throw error;
    }
  }

  /**
   * Render template into a DOM element
   */
  async renderToElement(
    templateType: string,
    data: TemplateData,
    targetElement: HTMLElement
  ): Promise<void> {
    try {
      const html = await this.renderTemplate(templateType, data);
      targetElement.innerHTML = html;
    } catch (error) {
      console.error(`Failed to render template to element:${templateType}`, error);
      throw error;
    }
  }

  /**
   * Clear cache (useful for dev/testing)
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get all cached templates
   */
  getCachedTemplates(): string[] {
    return Array.from(this.templateCache.keys());
  }
}

// Export singleton instance
export const templateRenderer = new TemplateRenderer();

// Export type for template configuration
export interface DocumentTemplate {
  type: string;
  label: string;
  icon: string;
  fields: string[];
}

// Template registry - maps document types to template configurations
export const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate> = {
  invoice: {
    type: 'invoice',
    label: 'Invoice',
    icon: 'FileText',
    fields: ['invoiceNumber', 'issueDate', 'dueDate', 'clientName', 'lineItems', 'total']
  },
  receipt: {
    type: 'receipt',
    label: 'Payment Receipt',
    icon: 'Receipt',
    fields: ['receiptNumber', 'issueDate', 'paymentMethod', 'payerName', 'amount']
  },
  estimate: {
    type: 'estimate',
    label: 'Quotation / Estimate',
    icon: 'FileText',
    fields: ['quoteNumber', 'issueDate', 'expiryDate', 'clientName', 'lineItems', 'total']
  },
  lpo: {
    type: 'lpo',
    label: 'Local Purchase Order',
    icon: 'ShoppingCart',
    fields: ['lpoNumber', 'issueDate', 'deliveryDate', 'supplierName', 'lineItems', 'total']
  },
  'delivery-note': {
    type: 'dn',
    label: 'Delivery Note',
    icon: 'Truck',
    fields: ['dnNumber', 'issueDate', 'poNumber', 'items', 'signatureDate']
  },
  grn: {
    type: 'grn',
    label: 'Goods Received Note',
    icon: 'CheckCircle',
    fields: ['grnNumber', 'issueDate', 'inspectionStatus', 'items', 'notes']
  },
  imprest: {
    type: 'imprest',
    label: 'Imprest Advance Request',
    icon: 'DollarSign',
    fields: ['imprestNumber', 'issueDate', 'employeeName', 'amount', 'purpose']
  },
  asset: {
    type: 'asset',
    label: 'Asset Allocation Receipt',
    icon: 'Package',
    fields: ['receiptNumber', 'issueDate', 'serialNumber', 'employeeName', 'assetDescription']
  },
  'purchase-order': {
    type: 'order',
    label: 'Purchase Order',
    icon: 'ShoppingCart',
    fields: ['poNumber', 'issueDate', 'deliveryDate', 'vendorName', 'lineItems', 'total']
  },
  rfq: {
    type: 'rfq',
    label: 'Request for Quotation',
    icon: 'FileText',
    fields: ['rfqNumber', 'issueDate', 'deadlineDate', 'vendorName', 'items']
  },
  'credit-note': {
    type: 'credit-note',
    label: 'Credit Note',
    icon: 'FileText',
    fields: ['creditNoteNumber', 'issueDate', 'reason', 'clientName', 'items', 'total']
  },
  'debit-note': {
    type: 'debit-note',
    label: 'Debit Note',
    icon: 'FileText',
    fields: ['debitNoteNumber', 'issueDate', 'reason', 'supplierName', 'items', 'total']
  },
  'service-invoice': {
    type: 'service-invoice',
    label: 'Service Invoice',
    icon: 'Wrench',
    fields: ['serviceInvoiceNumber', 'issueDate', 'dueDate', 'clientName', 'serviceItems', 'total']
  },
  'expense-claim': {
    type: 'expense-claim',
    label: 'Expense Claim',
    icon: 'DollarSign',
    fields: ['claimNumber', 'issueDate', 'employeeName', 'expenses', 'total']
  },
  'work-order': {
    type: 'work-order',
    label: 'Work Order',
    icon: 'Wrench',
    fields: ['workOrderNumber', 'issueDate', 'description', 'assignedTo', 'startDate', 'endDate']
  }
};

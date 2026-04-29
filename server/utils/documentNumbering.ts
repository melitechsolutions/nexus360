/**
 * Automatic Document Numbering Utility
 * 
 * Provides centralized numbering system for all procurement and business documents
 * Ensures sequential, consistent numbering across the application
 */

import { getDb } from "../db";
import {
  lpos,
  orders,
  imprests,
  imprestSurrender,
  receipts,
  invoices,
  estimates,
  payments,
  expenses,
  suppliers,
} from "../../drizzle/schema";
import { desc, sql } from "drizzle-orm";

type DocumentType = 
  | "lpo" | "purchase_order" | "imprest" | "imprest_surrender"
  | "receipt" | "invoice" | "estimate" | "payment"
  | "expense" | "supplier" | "debit_note" | "credit_note"
  | "quotation" | "proposal" | "order" | "service_invoice"
  | "work_order" | "grn" | "delivery_note" | "payslip"
  | "contract" | "warranty" | "ticket" | "product"
  | "service" | "subscription" | "department";

interface NumberingConfig {
  prefix: string;
  table: any | null;
  field: string;
  padding: number;
}

const NUMBERING_CONFIG: Record<DocumentType, NumberingConfig> = {
  lpo: { prefix: "LPO", table: lpos, field: "lpoNumber", padding: 6 },
  purchase_order: { prefix: "PO", table: orders, field: "orderNumber", padding: 6 },
  imprest: { prefix: "IMP", table: imprests, field: "imprestNumber", padding: 6 },
  imprest_surrender: { prefix: "IMPS", table: imprestSurrender, field: "surrenderNumber", padding: 6 },
  receipt: { prefix: "REC", table: receipts, field: "receiptNumber", padding: 6 },
  invoice: { prefix: "INV", table: invoices, field: "invoiceNumber", padding: 6 },
  estimate: { prefix: "EST", table: estimates, field: "estimateNumber", padding: 6 },
  payment: { prefix: "PAY", table: payments, field: "paymentNumber", padding: 6 },
  expense: { prefix: "EXP", table: expenses, field: "expenseNumber", padding: 6 },
  supplier: { prefix: "SUP", table: suppliers, field: "supplierNumber", padding: 4 },
  
  // Additional document types (table references to be added as needed)
  debit_note: { prefix: "DN", table: null, field: "debitNoteNumber", padding: 6 },
  credit_note: { prefix: "CN", table: null, field: "creditNoteNumber", padding: 6 },
  quotation: { prefix: "QT", table: null, field: "quotationNumber", padding: 6 },
  proposal: { prefix: "PROP", table: null, field: "proposalNumber", padding: 6 },
  order: { prefix: "ORD", table: null, field: "orderNumber", padding: 6 },
  service_invoice: { prefix: "SI", table: null, field: "serviceInvoiceNumber", padding: 6 },
  work_order: { prefix: "WO", table: null, field: "workOrderNumber", padding: 6 },
  grn: { prefix: "GRN", table: null, field: "grnNumber", padding: 6 },
  delivery_note: { prefix: "DN", table: null, field: "deliveryNoteNumber", padding: 6 },
  payslip: { prefix: "PS", table: null, field: "payslipNumber", padding: 6 },
  contract: { prefix: "CNT", table: null, field: "contractNumber", padding: 6 },
  warranty: { prefix: "WRT", table: null, field: "warrantyNumber", padding: 6 },
  ticket: { prefix: "TKT", table: null, field: "ticketNumber", padding: 6 },
  product: { prefix: "PROD", table: null, field: "productNumber", padding: 5 },
  service: { prefix: "SRV", table: null, field: "serviceNumber", padding: 5 },
  subscription: { prefix: "SUB", table: null, field: "subscriptionNumber", padding: 6 },
  department: { prefix: "DEPT", table: null, field: "departmentNumber", padding: 4 },
};

/**
 * Generate next document number with automatic sequencing
 * Example: "LPO-000001", "INV-000042", etc.
 */
export async function getNextDocumentNumber(documentType: DocumentType): Promise<string> {
  try {
    const config = NUMBERING_CONFIG[documentType];
    if (!config) {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    const database = await getDb();
    if (!database) {
      // Fallback: return with timestamp if DB unavailable
      return `${config.prefix}-${Date.now().toString().slice(-6)}`;
    }

    // Query the most recent document
    const lastDoc = await database
      .select()
      .from(config.table)
      .orderBy(desc(sql`created_at`))
      .limit(1);

    if (!lastDoc.length) {
      // First document
      return `${config.prefix}-${String(1).padStart(config.padding, "0")}`;
    }

    // Extract number from last document number
    const lastNumber = lastDoc[0][config.field];
    const match = lastNumber?.match(new RegExp(`${config.prefix}-(\\d+)`));
    
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `${config.prefix}-${String(num).padStart(config.padding, "0")}`;
    }

    // Fallback if pattern doesn't match
    return `${config.prefix}-${String(lastDoc.length + 1).padStart(config.padding, "0")}`;
  } catch (error) {
    console.error(`Error generating ${documentType} number:`, error);
    // Fallback: use timestamp-based number
    return `${NUMBERING_CONFIG[documentType]?.prefix || "DOC"}-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Generate multiple document numbers at once
 * Useful for batch operations
 */
export async function getNextDocumentNumbers(
  documentType: DocumentType,
  count: number
): Promise<string[]> {
  try {
    const firstNumber = await getNextDocumentNumber(documentType);
    const config = NUMBERING_CONFIG[documentType];
    
    // Extract the numeric part
    const match = firstNumber.match(/(\d+)$/);
    if (!match) {
      // Fallback: generate based on timestamp
      return Array.from({ length: count }, (_, i) => 
        `${config.prefix}-${String(Date.now() + i).slice(-6)}`
      );
    }

    const startNum = parseInt(match[1], 10);
    return Array.from({ length: count }, (_, i) => 
      `${config.prefix}-${String(startNum + i).padStart(config.padding, "0")}`
    );
  } catch (error) {
    console.error(`Error generating batch ${documentType} numbers:`, error);
    return Array.from({ length: count }, (_, i) => 
      `${NUMBERING_CONFIG[documentType]?.prefix || "DOC"}-${i}`
    );
  }
}

/**
 * Validate if a document number follows the correct format
 */
export function isValidDocumentNumber(documentType: DocumentType, number: string): boolean {
  const config = NUMBERING_CONFIG[documentType];
  if (!config) return false;
  
  const pattern = new RegExp(`^${config.prefix}-\\d{${config.padding}}$`);
  return pattern.test(number);
}

/**
 * Get document type from document number
 */
export function getDocumentTypeFromNumber(number: string): DocumentType | null {
  for (const [type, config] of Object.entries(NUMBERING_CONFIG)) {
    if (number.startsWith(config.prefix)) {
      return type as DocumentType;
    }
  }
  return null;
}

/**
 * Extract numeric sequence from document number
 */
export function extractSequenceNumber(number: string): number {
  const match = number.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

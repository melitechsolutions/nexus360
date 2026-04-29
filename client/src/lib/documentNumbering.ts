/**
 * Automatic Document Numbering Utility
 * Generates sequential numbers for all document types using a unified format
 */

export const DOCUMENT_PREFIXES = {
  debitNote: "DN",
  creditNote: "CN",
  supplier: "SUP",
  product: "PRD",
  service: "SRV",
  subscription: "SUB",
  purchaseOrder: "PO",
  order: "ORD",
  imprest: "IMP",
  deliveryNote: "DN",
  grn: "GRN",
  stock: "STK",
  asset: "AST",
  serviceInvoice: "SI",
  proposal: "PROP",
  quotation: "QT",
  contract: "CON",
  warranty: "WAR",
  workOrder: "WO",
  department: "DEPT",
  ticket: "TKT",
  receipt: "REC",
  invoice: "INV",
} as const;

export type DocumentType = keyof typeof DOCUMENT_PREFIXES;

/**
 * Generate a formatted document number
 * Format: PREFIX-YYMMDD-SEQUENCE
 * Example: INV-260429-001
 */
export const generateDocumentNumber = (
  documentType: DocumentType,
  sequenceNumber: number,
  date: Date = new Date()
): string => {
  const prefix = DOCUMENT_PREFIXES[documentType];
  const year = String(date.getFullYear()).slice(-2); // Last 2 digits
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const sequence = String(sequenceNumber).padStart(3, "0");

  return `${prefix}-${year}${month}${day}-${sequence}`;
};

/**
 * Extract sequence number from a formatted document number
 * From "INV-260429-001" extracts 1
 */
export const extractSequenceNumber = (documentNumber: string): number => {
  const match = documentNumber.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Extract date from a formatted document number
 * From "INV-260429-001" extracts 2026-04-29
 */
export const extractDateFromNumber = (documentNumber: string): Date | null => {
  const match = documentNumber.match(/-(\d{6})-/);
  if (!match) return null;

  const dateStr = match[1];
  const year = parseInt("20" + dateStr.slice(0, 2), 10);
  const month = parseInt(dateStr.slice(2, 4), 10) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.slice(4, 6), 10);

  return new Date(year, month, day);
};

/**
 * Get the next sequence number for a document type based on existing numbers
 */
export const getNextSequenceNumber = (
  existingNumbers: string[],
  documentType: DocumentType,
  date: Date = new Date()
): number => {
  const dateStr = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  // Filter numbers for today's date
  const todaysNumbers = existingNumbers.filter((num) => {
    const dateMatch = num.match(/-(\d{6})-/);
    return dateMatch && dateMatch[1] === dateStr;
  });

  // Get the highest sequence number for today
  let maxSequence = 0;
  for (const num of todaysNumbers) {
    const sequence = extractSequenceNumber(num);
    if (sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return maxSequence + 1;
};

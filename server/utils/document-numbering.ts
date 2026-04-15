import { desc, eq, and } from "drizzle-orm";
import { 
  invoices, 
  estimates, 
  expenses, 
  receipts, 
  proposals, 
  payments,
  settings,
} from "../../drizzle/schema";

// Default prefixes — overridden by settings
const DEFAULT_PREFIXES: Record<string, string> = {
  invoice: "INV",
  estimate: "EST",
  expense: "EXP",
  receipt: "REC",
  proposal: "PROP",
  payment: "PAY",
};

// Settings key names (match Settings.tsx document numbering keys)
const PREFIX_SETTING_KEYS: Record<string, string> = {
  invoice: "invoicePrefix",
  estimate: "estimatePrefix",
  expense: "expensePrefix",
  receipt: "receiptPrefix",
  proposal: "proposalPrefix",
  payment: "paymentPrefix",
};

/**
 * Helper function to generate next document number in format PREFIX-000000
 * Reads custom prefix from settings table, falls back to defaults
 */
async function generateNextDocumentNumber(
  db: any,
  documentType: "invoice" | "estimate" | "expense" | "receipt" | "proposal" | "payment"
): Promise<string> {
  try {
    // Look up custom prefix from settings
    let prefix = DEFAULT_PREFIXES[documentType] || "DOC";
    const settingKey = PREFIX_SETTING_KEYS[documentType];
    if (settingKey) {
      try {
        const rows = await db.select().from(settings)
          .where(and(eq(settings.category, "numbering"), eq(settings.key, settingKey)))
          .limit(1);
        if (rows.length > 0 && rows[0].value) {
          prefix = rows[0].value;
        }
      } catch { /* use default prefix */ }
    }

    const tableConfig: Record<string, { table: any; field: any }> = {
      invoice: { table: invoices, field: invoices.invoiceNumber },
      estimate: { table: estimates, field: estimates.estimateNumber },
      expense: { table: expenses, field: expenses.expenseNumber },
      receipt: { table: receipts, field: receipts.receiptNumber },
      proposal: { table: proposals, field: proposals.proposalNumber },
      payment: { table: payments, field: payments.referenceNumber },
    };

    const config = tableConfig[documentType];
    if (!config) throw new Error(`Unknown document type: ${documentType}`);

    // Find the highest document number
    const result = await db
      .select({ docNum: config.field })
      .from(config.table)
      .orderBy(desc(config.field))
      .limit(1);

    let maxSequence = 0;

    if (result && result.length > 0 && result[0].docNum) {
      const match = result[0].docNum.match(/(\d+)$/);
      if (match) {
        maxSequence = parseInt(match[1]);
      }
    }

    const nextSequence = maxSequence + 1;
    return `${prefix}-${String(nextSequence).padStart(6, "0")}`;
  } catch (err) {
    console.warn(`Error generating ${documentType} number, using default:`, err);
    const p = DEFAULT_PREFIXES[documentType] || "DOC";
    return `${p}-000001`;
  }
}

export {
  generateNextDocumentNumber,
};

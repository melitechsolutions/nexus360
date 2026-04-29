/**
 * Utility for auto-labeling recurring items with month/year
 * Provides consistent formatting for recurring invoices and expenses
 */

/**
 * Generate auto-label for recurring item with month and year
 * @param baseDescription - Original description/title
 * @param date - Date to extract month/year from (defaults to now)
 * @returns Formatted description with month/year appended
 * @example
 * generateRecurringLabel("Internet Subscription", new Date(2026, 3)) 
 * // Returns: "Internet Subscription - April 2026"
 */
export function generateRecurringLabel(
  baseDescription: string,
  date: Date = new Date()
): string {
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
  const month = monthFormatter.format(date);
  const year = date.getFullYear();

  // Add label only if not already present
  if (baseDescription.includes(`- ${month} ${year}`)) {
    return baseDescription;
  }

  return `${baseDescription} - ${month} ${year}`;
}

/**
 * Generate audit suffix for recurring items showing auto-generation info
 * @param recurringDescription - Description of the recurring setup
 * @param notes - Additional notes from recurring setup
 * @returns Formatted audit suffix
 */
export function generateRecurringAuditSuffix(
  recurringDescription?: string,
  notes?: string
): string {
  let suffix = "\n\n--- Auto-generated from recurring ---";

  if (recurringDescription) {
    suffix += `\nPlan: ${recurringDescription}`;
  }

  if (notes) {
    suffix += `\n${notes}`;
  }

  return suffix;
}

/**
 * Apply month/year label to recurring invoice notes and title
 * @param title - Invoice title
 * @param notes - Invoice notes
 * @param baseRecurringNotes - Notes from recurring setup
 * @param date - Date for the recurring item
 * @returns Object with updated title and notes
 */
export function applyRecurringLabel(
  title: string,
  notes: string,
  baseRecurringNotes?: string,
  date: Date = new Date()
): { title: string; notes: string } {
  const labeledTitle = generateRecurringLabel(title, date);
  const auditSuffix = generateRecurringAuditSuffix(title, baseRecurringNotes);
  const updatedNotes = (notes || "") + auditSuffix;

  return { title: labeledTitle, notes: updatedNotes };
}

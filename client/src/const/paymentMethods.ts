/**
 * Standardized payment methods across the application
 */

export const PAYMENT_METHODS = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  MPESA: "mpesa",
  CHEQUE: "cheque",
  OTHER: "other",
} as const;

export type PaymentMethodType = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  [PAYMENT_METHODS.CARD]: "Card",
  [PAYMENT_METHODS.BANK_TRANSFER]: "Bank Transfer",
  [PAYMENT_METHODS.CASH]: "Cash",
  [PAYMENT_METHODS.MPESA]: "M-Pesa",
  [PAYMENT_METHODS.CHEQUE]: "Cheque",
  [PAYMENT_METHODS.OTHER]: "Other",
};

/**
 * Get array of payment methods with labels for UI rendering
 */
export const getPaymentMethodOptions = () => 
  Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
    value: value as PaymentMethodType,
    label,
  }));

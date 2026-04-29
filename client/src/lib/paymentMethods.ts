/**
 * Standardized payment method options used across all forms in the application
 * This ensures consistency across all payment-related features
 */

export const PAYMENT_METHODS = [
  { value: "card", label: "Card", color: "bg-orange-500/10 text-orange-500" },
  { value: "bank_transfer", label: "Bank Transfer", color: "bg-blue-500/10 text-blue-500" },
  { value: "cash", label: "Cash", color: "bg-green-500/10 text-green-500" },
  { value: "mpesa", label: "M-Pesa", color: "bg-emerald-500/10 text-emerald-500" },
  { value: "cheque", label: "Cheque", color: "bg-purple-500/10 text-purple-500" },
  { value: "other", label: "Other", color: "bg-gray-500/10 text-gray-500" },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];

export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value);

export const getPaymentMethodLabel = (value: string): string => {
  const method = PAYMENT_METHODS.find((m) => m.value === value);
  return method?.label || value;
};

export const getPaymentMethodColor = (value: string): string => {
  const method = PAYMENT_METHODS.find((m) => m.value === value);
  return method?.color || "bg-gray-500/10 text-gray-500";
};

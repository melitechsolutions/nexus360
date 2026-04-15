import React, { createContext, useContext, useState, useEffect } from "react";

export type CurrencyCode = "KES" | "USD" | "EUR" | "GBP" | "UGX" | "TZS";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** How many units = 1 KES */
  rateFromKes: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling",   rateFromKes: 1 },
  { code: "USD", symbol: "$",   name: "US Dollar",         rateFromKes: 1 / 128 },
  { code: "EUR", symbol: "€",   name: "Euro",              rateFromKes: 1 / 140 },
  { code: "GBP", symbol: "£",   name: "British Pound",     rateFromKes: 1 / 163 },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling",  rateFromKes: 4.7 },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling",rateFromKes: 3.3 },
];

interface CurrencyContextValue {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  /** Convert a KES amount to the active currency, formatted */
  fmt: (kesAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const saved = (typeof window !== "undefined" ? localStorage.getItem("nx360_currency") : null) as CurrencyCode | null;
  const initial = CURRENCIES.find((c) => c.code === saved) ?? CURRENCIES[0];
  const [currency, setCurrencyState] = useState<CurrencyInfo>(initial);

  const setCurrency = (code: CurrencyCode) => {
    const found = CURRENCIES.find((c) => c.code === code);
    if (found) {
      setCurrencyState(found);
      localStorage.setItem("nx360_currency", code);
    }
  };

  const fmt = (kesAmount: number): string => {
    const converted = kesAmount * currency.rateFromKes;
    const formatted = new Intl.NumberFormat("en-KE", {
      minimumFractionDigits: converted < 1 ? 2 : 0,
      maximumFractionDigits: converted < 1 ? 2 : 0,
    }).format(Math.round(converted));
    return `${currency.symbol}${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

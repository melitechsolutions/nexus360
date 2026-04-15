import { trpc } from "./trpc";

/**
 * Hook to get the user-configured currency from Settings → Currency.
 * Returns { code, symbol, position } with defaults.
 */
export function useCurrencySettings() {
  const { data } = trpc.settings.getByCategory.useQuery(
    { category: "currency" },
    { staleTime: 5 * 60 * 1000 } // cache for 5 minutes
  );

  const code = data?.defaultCurrency || "KES";
  const symbol = data?.currencySymbol || code;
  const position = (data?.symbolPosition as "before" | "after") || "before";

  return { code, symbol, position };
}

/**
 * Format a number as currency using the given symbol/position.
 * Defaults to KES if no settings provided.
 */
export function formatAmount(
  amount: number,
  symbol: string = "KES",
  position: "before" | "after" = "before",
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
  });
  return position === "before" ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
}

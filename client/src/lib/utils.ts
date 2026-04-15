import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  for (let i = 0; i < inputs.length; i++) {
    const val = inputs[i];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      // Check for React elements / forwardRef objects passed to cn()
      if ("$$typeof" in val || "render" in val || "type" in val || "props" in val) {
        console.error(
          `[cn] ERROR: React element/component object passed as argument at index ${i}:`,
          val,
          "\nStack trace:",
          new Error().stack
        );
      }
      // Check for any non-plain object (not a Record<string, unknown>)
      const proto = Object.getPrototypeOf(val);
      if (proto !== Object.prototype && proto !== null) {
        console.error(
          `[cn] ERROR: Non-plain object passed as argument at index ${i}:`,
          Object.getPrototypeOf(val)?.constructor?.name,
          val,
          "\nStack trace:",
          new Error().stack
        );
      }
    }
  }
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currencyCode,
  }).format(amount / 100);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  // Use the shared formatter from utils/format.ts pattern
  try {
    const stored = localStorage.getItem('melitech_system_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.dateFormat) {
        const d = dateObj;
        const day = d.getDate();
        const dayPad = String(day).padStart(2, '0');
        const month = d.getMonth() + 1;
        const monthPad = String(month).padStart(2, '0');
        const year = d.getFullYear();
        const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
        const longMonth = d.toLocaleDateString('en-US', { month: 'long' });
        return settings.dateFormat
          .replace(/dd/g, dayPad)
          .replace(/\bd\b/g, String(day))
          .replace(/MMMM/g, longMonth)
          .replace(/MMM/g, shortMonth)
          .replace(/MM/g, monthPad)
          .replace(/\bM\b/g, shortMonth)
          .replace(/yyyy/g, String(year))
          .replace(/\bY\b/g, String(year))
          .replace(/\by\b/g, String(year).slice(-2))
          .replace(/\bm\b/g, monthPad)
          .replace(/\bj\b/g, String(day))
          .replace(/\bF\b/g, longMonth)
          .replace(/\bn\b/g, String(month));
      }
    }
  } catch {}
  return dateObj.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

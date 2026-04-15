/**
 * Get the configured date format from SystemSettingsContext localStorage.
 * Returns a PHP-style format string (e.g. "d-m-Y", "Y-m-d", "m/d/Y").
 */
function getConfiguredDateFormat(): string | null {
  try {
    const stored = localStorage.getItem('melitech_system_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return settings.dateFormat || null;
    }
  } catch {}
  return null;
}

/**
 * Convert a PHP-style date format token to Intl options or manual format.
 * Supports: d-m-Y, Y-m-d, m/d/Y, d/m/Y, d M Y, M d Y, etc.
 */
function formatDateWithPattern(d: Date, pattern: string): string {
  const day = d.getDate();
  const dayPad = String(day).padStart(2, '0');
  const month = d.getMonth() + 1;
  const monthPad = String(month).padStart(2, '0');
  const year = d.getFullYear();
  const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
  const longMonth = d.toLocaleDateString('en-US', { month: 'long' });

  return pattern
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

/**
 * Format date to readable string using configured date format.
 * Falls back to "Mar 15, 2025" if no setting configured.
 */
export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    const pattern = getConfiguredDateFormat();
    if (pattern) {
      return formatDateWithPattern(d, pattern);
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Format date and time (e.g., "Mar 15, 2025, 2:30 PM")
 */
export function formatDateTime(date: Date | string | number): string {
  try {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return d.toLocaleDateString("en-US", options);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format time only (e.g., "2:30 PM")
 */
export function formatTime(date: Date | string | number): string {
  try {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return d.toLocaleTimeString("en-US", options);
  } catch {
    return "Invalid time";
  }
}

/**
 * Format currency (e.g., "$1,234.50")
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Format percentage (e.g., "12.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number with thousand separators (e.g., "1,234")
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string | number): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} days ago`;

    return formatDate(d);
  } catch {
    return "Invalid date";
  }
}

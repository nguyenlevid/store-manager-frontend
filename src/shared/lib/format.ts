/**
 * Shared formatting utilities
 *
 * Currency and date formatting using business settings (currency, timezone).
 * Import these in pages/components instead of defining local formatCurrency/formatDate.
 */

/**
 * Format a number as currency using the given currency code.
 * Falls back to 'USD' if not provided.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

/**
 * Format a date string using the given timezone.
 * Falls back to 'UTC' if not provided.
 */
export function formatDate(
  dateString: string,
  timezone: string = 'UTC',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    ...options,
  };
  try {
    return date.toLocaleString('en-US', defaultOptions);
  } catch {
    // Fallback if timezone is invalid
    return date.toLocaleString('en-US', { ...defaultOptions, timeZone: 'UTC' });
  }
}

/**
 * Format a date as a short relative or absolute string.
 * Uses timezone for the absolute fallback.
 */
export function formatRelativeDate(
  dateString: string,
  timezone: string = 'UTC'
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(dateString, timezone, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Utility functions for formatting and display logic.
 * Extracted from components to follow Single Responsibility Principle.
 */

/**
 * Get initials from a name or email for avatar display.
 * @param name - Full name or email
 * @returns 2-character uppercase initials
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';

  const displayName = name.trim();
  const parts = displayName.split(' ').filter(p => p.length > 0);

  if (parts.length >= 2) {
    // First letter of first name + first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Single word - first 2 characters
  return displayName.substring(0, 2).toUpperCase();
}

/**
 * Format a date string to Vietnamese locale.
 * @param dateStr - ISO date string or null
 * @returns Formatted date string (dd/MM/yyyy) or '-'
 */
export function formatVietnameseDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

/**
 * Format a date with time for Vietnamese locale.
 * @param dateStr - ISO date string or null
 * @returns Formatted datetime string (dd/MM/yyyy HH:mm) or '-'
 */
export function formatVietnameseDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

/**
 * Format a currency amount to Vietnamese Dong.
 * @param amount - Number to format
 * @returns Formatted currency string (e.g., "1.000.000 ₫")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '0 ₫';

  return amount.toLocaleString('vi-VN') + ' ₫';
}

/**
 * Get display name with fallback to email.
 * @param name - Full name (can be null/empty)
 * @param email - Email for fallback
 * @returns Name if available, otherwise email, otherwise 'Unknown'
 */
export function getDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }
  if (email) {
    return email;
  }
  return 'Unknown';
}

/**
 * Returns Module Utilities
 *
 * Shared formatting functions for returns display.
 * Story 3.6: Used by approval queue components for consistent formatting.
 */

/**
 * Format currency with negative sign for returns display
 * Returns are displayed as negative values to indicate deductions
 *
 * @param amount - Numeric string amount (e.g., "312.50")
 * @returns Formatted negative currency string (e.g., "-$312.50")
 */
export function formatNegativeCurrency(amount: string): string {
  const num = parseFloat(amount);
  return `-$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format quantity with negative sign for returns display
 * Returns are displayed as negative values to indicate deductions
 *
 * @param quantity - Positive integer quantity
 * @returns Formatted negative quantity string (e.g., "-25")
 */
export function formatNegativeQuantity(quantity: number): string {
  return `-${quantity}`;
}

/**
 * Get human-readable format label
 *
 * @param format - Format value (physical, ebook, audiobook)
 * @returns Display label (e.g., "Physical Book")
 */
export function getFormatLabel(format: string): string {
  switch (format) {
    case "physical":
      return "Physical Book";
    case "ebook":
      return "Ebook";
    case "audiobook":
      return "Audiobook";
    default:
      return format;
  }
}

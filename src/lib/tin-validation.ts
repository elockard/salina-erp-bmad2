/**
 * TIN Validation Utilities
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.3: TIN Format Validation
 *
 * Provides validation and formatting functions for Tax Identification Numbers:
 * - SSN (Social Security Number): XXX-XX-XXXX format
 * - EIN (Employer Identification Number): XX-XXXXXXX format
 *
 * @see https://www.irs.gov/individuals/individual-taxpayer-identification-number
 */

/** SSN format pattern: XXX-XX-XXXX (9 digits with dashes at positions 3 and 5) */
const SSN_PATTERN = /^\d{3}-\d{2}-\d{4}$/;

/** EIN format pattern: XX-XXXXXXX (9 digits with dash at position 2) */
const EIN_PATTERN = /^\d{2}-\d{7}$/;

/**
 * Validate SSN format
 *
 * @param value - The SSN string to validate
 * @returns true if value matches XXX-XX-XXXX format
 *
 * @example
 * validateSSN("123-45-6789") // true
 * validateSSN("123456789")   // false (missing dashes)
 */
export function validateSSN(value: string): boolean {
  return SSN_PATTERN.test(value);
}

/**
 * Validate EIN format
 *
 * @param value - The EIN string to validate
 * @returns true if value matches XX-XXXXXXX format
 *
 * @example
 * validateEIN("12-3456789") // true
 * validateEIN("123456789")  // false (missing dash)
 */
export function validateEIN(value: string): boolean {
  return EIN_PATTERN.test(value);
}

/**
 * Validate TIN based on type
 *
 * @param value - The TIN string to validate
 * @param type - The TIN type ('ssn' or 'ein')
 * @returns true if value matches the format for the specified type
 *
 * @example
 * validateTIN("123-45-6789", "ssn") // true
 * validateTIN("12-3456789", "ein")  // true
 */
export function validateTIN(value: string, type: "ssn" | "ein"): boolean {
  return type === "ssn" ? validateSSN(value) : validateEIN(value);
}

/**
 * Auto-format input as SSN
 *
 * Takes raw digit input and formats it as XXX-XX-XXXX.
 * Strips non-digit characters and limits to 9 digits.
 *
 * @param value - The raw input (may contain dashes, spaces, etc.)
 * @returns Formatted SSN string with dashes
 *
 * @example
 * formatSSN("123456789")   // "123-45-6789"
 * formatSSN("1234")        // "123-4"
 * formatSSN("123-45-6789") // "123-45-6789" (already formatted)
 */
export function formatSSN(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "").slice(0, 9);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Auto-format input as EIN
 *
 * Takes raw digit input and formats it as XX-XXXXXXX.
 * Strips non-digit characters and limits to 9 digits.
 *
 * @param value - The raw input (may contain dashes, spaces, etc.)
 * @returns Formatted EIN string with dash
 *
 * @example
 * formatEIN("123456789") // "12-3456789"
 * formatEIN("123")       // "12-3"
 * formatEIN("12-3456789") // "12-3456789" (already formatted)
 */
export function formatEIN(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "").slice(0, 9);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Mask TIN for display
 *
 * Creates a masked display string showing only the last 4 digits.
 * Format depends on TIN type:
 * - SSN: ***-**-1234
 * - EIN: **-***1234
 *
 * @param lastFour - The last 4 digits of the TIN
 * @param type - The TIN type ('ssn' or 'ein')
 * @returns Masked TIN string
 *
 * @example
 * maskTIN("6789", "ssn") // "***-**-6789"
 * maskTIN("6789", "ein") // "**-***6789"
 */
export function maskTIN(lastFour: string, type: "ssn" | "ein"): string {
  if (type === "ssn") {
    return `***-**-${lastFour}`;
  }
  return `**-***${lastFour}`;
}

/**
 * Extract last 4 digits from a TIN
 *
 * Strips all non-digit characters and returns the last 4 digits.
 * Useful for storing the displayable portion of an encrypted TIN.
 *
 * @param tin - The full TIN (formatted or unformatted)
 * @returns The last 4 digits of the TIN
 *
 * @example
 * extractLastFour("123-45-6789") // "6789"
 * extractLastFour("12-3456789")  // "6789"
 * extractLastFour("123456789")   // "6789"
 */
export function extractLastFour(tin: string): string {
  const digits = tin.replace(/\D/g, "");
  return digits.slice(-4);
}

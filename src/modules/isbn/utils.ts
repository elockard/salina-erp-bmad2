/**
 * ISBN-13 Validation Utilities
 *
 * Story 2.7 - Build ISBN Import with CSV Upload and Validation
 * AC 5: Each ISBN validated with ISBN-13 checksum algorithm
 *
 * ISBN-13 Format:
 * - Must be 13 digits starting with 978 or 979 (GS1 prefixes for books)
 * - Checksum digit (position 13) must validate per ISBN-13 formula
 * - Accept with or without hyphens/spaces (normalize before validation)
 *
 * References:
 * - ISBN-13 Checksum Algorithm: https://www.isbn-international.org/content/isbn-users-manual
 * - tech-spec-epic-2.md (FR21 - ISBN-13 validation)
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Normalize ISBN-13 by removing hyphens, spaces, and other non-digit characters
 * @param isbn Raw ISBN string potentially with formatting
 * @returns String containing only digits
 */
export function normalizeIsbn13(isbn: string): string {
  return isbn.replace(/[-\s]/g, "");
}

/**
 * Validate ISBN-13 checksum using the standard algorithm
 *
 * ISBN-13 checksum formula:
 * 1. Multiply digits at odd positions (1, 3, 5...) by 1
 * 2. Multiply digits at even positions (2, 4, 6...) by 3
 * 3. Sum all products
 * 4. Checksum = (10 - (Sum mod 10)) mod 10
 * 5. Must equal the 13th digit (check digit)
 *
 * @param isbn Normalized 13-digit ISBN string
 * @returns true if checksum is valid, false otherwise
 */
export function validateIsbn13Checksum(isbn: string): boolean {
  const digits = normalizeIsbn13(isbn);

  // Must be exactly 13 digits
  if (digits.length !== 13 || !/^\d+$/.test(digits)) {
    return false;
  }

  // Calculate checksum: alternating weights of 1 and 3 for first 12 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    sum += parseInt(digits[i], 10) * weight;
  }

  // Check digit is (10 - (sum mod 10)) mod 10
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === parseInt(digits[12], 10);
}

/**
 * Full ISBN-13 validation with detailed error messages
 *
 * Validates:
 * 1. Format: Must be 13 digits after normalization
 * 2. Prefix: Must start with 978 or 979 (GS1 book prefixes)
 * 3. Checksum: Check digit must validate per ISBN-13 algorithm
 *
 * @param isbn Raw ISBN string (may include hyphens/spaces)
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateIsbn13(isbn: string): ValidationResult {
  // Normalize: remove hyphens and spaces
  const normalized = normalizeIsbn13(isbn);

  // Check for empty or whitespace-only input
  if (!normalized || normalized.trim().length === 0) {
    return {
      valid: false,
      error: "ISBN is required",
    };
  }

  // Check length
  if (normalized.length !== 13) {
    return {
      valid: false,
      error: `Invalid length: ${normalized.length} digits (must be 13)`,
    };
  }

  // Check all characters are digits
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      error: "ISBN must contain only digits (and optional hyphens/spaces)",
    };
  }

  // Check GS1 prefix (978 or 979 for books)
  if (!normalized.startsWith("978") && !normalized.startsWith("979")) {
    return {
      valid: false,
      error: "Invalid prefix: ISBN-13 must start with 978 or 979",
    };
  }

  // Validate checksum
  if (!validateIsbn13Checksum(normalized)) {
    return {
      valid: false,
      error: "Invalid checksum: check digit does not match",
    };
  }

  return { valid: true };
}

/**
 * Detect duplicate ISBNs within an array
 * @param isbns Array of ISBN strings (raw or normalized)
 * @returns Array of objects with isbn and row indices where duplicates occur
 */
export function detectDuplicates(
  isbns: string[],
): Array<{ isbn: string; rows: number[] }> {
  const seen = new Map<string, number[]>();

  isbns.forEach((isbn, index) => {
    const normalized = normalizeIsbn13(isbn);
    const existing = seen.get(normalized);
    if (existing) {
      existing.push(index + 1); // 1-indexed row numbers
    } else {
      seen.set(normalized, [index + 1]);
    }
  });

  // Return only entries with more than one occurrence
  const duplicates: Array<{ isbn: string; rows: number[] }> = [];
  seen.forEach((rows, isbn) => {
    if (rows.length > 1) {
      duplicates.push({ isbn, rows });
    }
  });

  return duplicates;
}

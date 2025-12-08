/**
 * ISBN Prefixes Utilities
 *
 * Functions for ISBN generation, validation, and formatting.
 * Story 7.4: Implement Publisher ISBN Prefix System
 */

import type { IsbnPrefixBlockSize } from "@/db/schema/isbn-prefixes";
import type { PrefixValidationResult } from "./types";

/**
 * Calculate ISBN-13 check digit using the standard algorithm
 * The check digit is calculated so that (sum of alternating weights 1 and 3) mod 10 = 0
 *
 * @param first12Digits - First 12 digits of the ISBN (no check digit)
 * @returns The check digit (0-9)
 */
export function calculateIsbn13CheckDigit(first12Digits: string): number {
  if (first12Digits.length !== 12 || !/^\d{12}$/.test(first12Digits)) {
    throw new Error("Input must be exactly 12 digits");
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    sum += Number.parseInt(first12Digits[i], 10) * weight;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Generate a full ISBN-13 from a prefix and title identifier
 *
 * @param prefix - Publisher prefix (e.g., "978-1-234567" or "9781234567")
 * @param titleId - Sequential title identifier (0-based index)
 * @returns Complete ISBN-13 string (13 digits, no hyphens)
 */
export function generateIsbn13(prefix: string, titleId: number): string {
  const normalizedPrefix = prefix.replace(/[-\s]/g, "");
  const titleIdentifierLength = 12 - normalizedPrefix.length;

  if (titleIdentifierLength < 1) {
    throw new Error("Prefix is too long - no room for title identifier");
  }

  const maxTitleId = Math.pow(10, titleIdentifierLength) - 1;
  if (titleId < 0 || titleId > maxTitleId) {
    throw new Error(
      `Title ID ${titleId} out of range (0-${maxTitleId}) for prefix length ${normalizedPrefix.length}`,
    );
  }

  const titleIdentifier = titleId
    .toString()
    .padStart(titleIdentifierLength, "0");
  const first12 = normalizedPrefix + titleIdentifier;
  const checkDigit = calculateIsbn13CheckDigit(first12);

  return first12 + checkDigit.toString();
}

/**
 * Calculate the maximum block size for a given prefix length
 *
 * @param prefix - Publisher prefix (with or without hyphens)
 * @returns Maximum number of ISBNs that can be generated
 */
export function getMaxBlockSizeForPrefix(prefix: string): number {
  const normalizedLength = prefix.replace(/[-\s]/g, "").length;
  const titleIdDigits = 12 - normalizedLength;

  if (titleIdDigits < 1) {
    return 0; // Invalid prefix length
  }

  return Math.pow(10, titleIdDigits);
}

/**
 * Validate that a block size is valid for the given prefix
 *
 * @param prefix - Publisher prefix
 * @param blockSize - Requested block size
 * @returns true if block size is valid for prefix
 */
export function validateBlockSizeForPrefix(
  prefix: string,
  blockSize: number,
): boolean {
  const maxSize = getMaxBlockSizeForPrefix(prefix);
  return blockSize <= maxSize;
}

/**
 * Validate an ISBN prefix format
 *
 * @param prefix - Publisher prefix to validate
 * @returns Validation result with normalized prefix and capacity info
 */
export function validateIsbnPrefix(prefix: string): PrefixValidationResult {
  const normalized = prefix.replace(/[-\s]/g, "");

  // Check length
  if (normalized.length < 7) {
    return {
      valid: false,
      error: "Prefix must be at least 7 digits",
    };
  }

  if (normalized.length > 12) {
    return {
      valid: false,
      error: "Prefix cannot exceed 12 digits",
    };
  }

  // Check digits only
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      error: "Prefix must contain only digits",
    };
  }

  // Check GS1 prefix
  if (!normalized.startsWith("978") && !normalized.startsWith("979")) {
    return {
      valid: false,
      error: "Prefix must start with 978 or 979",
    };
  }

  const titleIdDigits = 12 - normalized.length;
  const maxBlockSize = Math.pow(10, titleIdDigits);

  return {
    valid: true,
    normalizedPrefix: normalized,
    titleIdDigits,
    maxBlockSize,
  };
}

/**
 * Format a block size for display
 *
 * @param blockSize - Numeric block size
 * @returns Formatted string (e.g., "1K", "10K", "100K", "1M")
 */
export function formatBlockSize(blockSize: IsbnPrefixBlockSize): string {
  if (blockSize >= 1000000) {
    return `${blockSize / 1000000}M`;
  }
  if (blockSize >= 1000) {
    return `${blockSize / 1000}K`;
  }
  return blockSize.toString();
}

/**
 * Format an ISBN prefix with hyphens for display
 * Uses standard ISBN-13 hyphenation pattern
 *
 * Structure: GS1(3)-RegistrationGroup(1)-Registrant(variable)-Publication(X's)-Check(X)
 *
 * Block sizes and their publication digit count:
 * - 10 ISBN: 1 publication digit → 978-X-XXXXXXX-X-X (11-digit prefix)
 * - 100 ISBN: 2 publication digits → 978-X-XXXXXX-XX-X (10-digit prefix)
 * - 1,000 ISBN: 3 publication digits → 978-X-XXXXX-XXX-X (9-digit prefix)
 * - 10,000 ISBN: 4 publication digits → 978-X-XXXX-XXXX-X (8-digit prefix)
 * - 100,000 ISBN: 5 publication digits → 978-X-XXX-XXXXX-X (7-digit prefix)
 * - 1,000,000 ISBN: 6 publication digits → 978-X-XX-XXXXXX-X (6-digit prefix)
 *
 * @param prefix - Prefix (with or without hyphens)
 * @returns Formatted prefix with hyphens and X placeholders
 */
export function formatPrefix(prefix: string): string {
  const normalized = prefix.replace(/[-\s]/g, "");

  if (normalized.length < 6 || normalized.length > 11) {
    return normalized; // Invalid length, return as-is
  }

  // Calculate publication digits (title identifier)
  const publicationDigits = 12 - normalized.length;

  // Split into components
  const gs1 = normalized.slice(0, 3); // 978 or 979
  const registrationGroup = normalized.slice(3, 4); // Usually 0 or 1 for English
  const registrant = normalized.slice(4); // Remaining prefix digits

  // Build X placeholders for publication element
  const publicationXs = "X".repeat(publicationDigits);

  // Format: GS1-RegGroup-Registrant-Publication-Check
  return `${gs1}-${registrationGroup}-${registrant}-${publicationXs}-X`;
}

/**
 * Calculate available percentage for a prefix
 *
 * @param availableCount - Number of available ISBNs
 * @param totalIsbns - Total ISBNs in the block
 * @returns Percentage (0-100)
 */
export function calculateAvailablePercentage(
  availableCount: number,
  totalIsbns: number,
): number {
  if (totalIsbns === 0) return 0;
  return Math.round((availableCount / totalIsbns) * 100);
}

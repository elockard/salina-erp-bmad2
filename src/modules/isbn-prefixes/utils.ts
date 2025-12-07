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
 * @param prefix - Prefix (with or without hyphens)
 * @returns Formatted prefix with hyphens
 */
export function formatPrefix(prefix: string): string {
  const normalized = prefix.replace(/[-\s]/g, "");

  // Standard format: 978-X-XXXXXX or 979-X-XXXXXX
  if (normalized.length >= 4) {
    const gs1 = normalized.slice(0, 3);
    const rest = normalized.slice(3);

    // Simple format: GS1-rest
    return `${gs1}-${rest}`;
  }

  return normalized;
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

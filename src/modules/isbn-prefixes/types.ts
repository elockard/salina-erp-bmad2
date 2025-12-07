/**
 * ISBN Prefixes Types
 *
 * TypeScript types and interfaces for the ISBN prefix system.
 * Story 7.4: Implement Publisher ISBN Prefix System
 */

import type {
  IsbnPrefix,
  IsbnPrefixBlockSize,
  IsbnPrefixGenerationStatus,
} from "@/db/schema/isbn-prefixes";

/**
 * Re-export schema types for module consumers
 */
export type { IsbnPrefix, IsbnPrefixBlockSize, IsbnPrefixGenerationStatus };

/**
 * ISBN prefix with computed fields for display
 */
export interface IsbnPrefixWithStats extends IsbnPrefix {
  /** Percentage of ISBNs currently available */
  availablePercentage: number;
  /** Formatted block size for display (e.g., "1K", "10K", "100K", "1M") */
  formattedBlockSize: string;
  /** Formatted prefix with hyphens for display */
  formattedPrefix: string;
}

/**
 * Input for creating a new ISBN prefix
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export interface CreateIsbnPrefixInput {
  /** Publisher prefix (e.g., "978-1-234567") */
  prefix: string;
  /** Number of ISBNs to generate */
  block_size: IsbnPrefixBlockSize;
  /** Optional description for the prefix */
  description?: string;
}

/**
 * Result of prefix validation
 */
export interface PrefixValidationResult {
  /** Whether the prefix is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Normalized prefix (digits only, no hyphens) */
  normalizedPrefix?: string;
  /** Number of title identifier digits available */
  titleIdDigits?: number;
  /** Maximum block size supported by this prefix */
  maxBlockSize?: number;
}

/**
 * Prefix table row for display
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export interface PrefixTableRow {
  id: string;
  prefix: string;
  formattedPrefix: string;
  blockSize: number;
  formattedBlockSize: string;
  totalIsbns: number;
  availableCount: number;
  assignedCount: number;
  availablePercentage: number;
  generationStatus: IsbnPrefixGenerationStatus;
  generationError: string | null;
  createdAt: Date;
  description: string | null;
}

/**
 * Prefix detail for expanded row
 */
export interface PrefixDetail {
  prefix: IsbnPrefix;
  firstIsbns: Array<{
    id: string;
    isbn_13: string;
    status: string;
    assignedToTitleId: string | null;
  }>;
  createdByUser: {
    id: string;
    email: string;
  } | null;
}

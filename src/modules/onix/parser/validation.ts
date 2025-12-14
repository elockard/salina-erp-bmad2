/**
 * ONIX Import Validation
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 5: Create import validation layer (AC: 5)
 *
 * Validates imported ONIX products before database insertion.
 */

import { validateISBN13 } from "../validator";
import type {
  FieldValidationError,
  ImportError,
  MappedTitle,
  ParsedProduct,
  ParsingError,
} from "./types";

/**
 * Validate a single parsed product
 *
 * @param product - Parsed ONIX product
 * @returns Array of field validation errors
 */
export function validateImportProduct(
  product: ParsedProduct,
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  // Required: ISBN-13
  if (!product.isbn13) {
    errors.push({
      field: "isbn",
      message: "ISBN-13 is required for import",
    });
  } else {
    // Validate ISBN-13 checksum
    if (!validateISBN13(product.isbn13)) {
      errors.push({
        field: "isbn",
        message: "Invalid ISBN-13 checksum",
        value: product.isbn13,
      });
    }
  }

  // Required: Title
  if (!product.title || product.title.trim() === "") {
    errors.push({
      field: "title",
      message: "Title is required",
    });
  }

  // Validate title length
  if (product.title && product.title.length > 500) {
    errors.push({
      field: "title",
      message: "Title exceeds maximum length (500 characters)",
      value: `${product.title.substring(0, 50)}...`,
    });
  }

  // Validate subtitle length if present
  if (product.subtitle && product.subtitle.length > 500) {
    errors.push({
      field: "subtitle",
      message: "Subtitle exceeds maximum length (500 characters)",
      value: `${product.subtitle.substring(0, 50)}...`,
    });
  }

  // Validate publication date is reasonable
  if (product.publicationDate) {
    const year = product.publicationDate.getFullYear();
    if (year < 1450 || year > 2100) {
      errors.push({
        field: "publicationDate",
        message: "Publication date year is out of valid range (1450-2100)",
        value: product.publicationDate.toISOString(),
      });
    }
  }

  // Validate contributor data
  if (product.contributors.length === 0) {
    // Warning only - titles without contributors are allowed
    // but should be flagged for review
  }

  for (let i = 0; i < product.contributors.length; i++) {
    const contributor = product.contributors[i];

    // Must have at least a name or corporate name
    const hasName =
      contributor.personNameInverted ||
      (contributor.namesBeforeKey && contributor.keyNames) ||
      contributor.corporateName;

    if (!hasName) {
      errors.push({
        field: `contributors[${i}]`,
        message: `Contributor ${i + 1} has no identifiable name`,
      });
    }

    // Validate contributor role is a valid codelist 17 value
    if (contributor.role && !/^[A-Z]\d{2}$/.test(contributor.role)) {
      errors.push({
        field: `contributors[${i}].role`,
        message: `Invalid contributor role code: ${contributor.role}`,
        value: contributor.role,
      });
    }
  }

  return errors;
}

/**
 * Validate a batch of mapped titles
 *
 * @param mappedTitles - Array of mapped titles
 * @returns Combined validation results
 */
export function validateImportBatch(mappedTitles: MappedTitle[]): {
  validCount: number;
  invalidCount: number;
  errors: ImportError[];
} {
  let validCount = 0;
  let invalidCount = 0;
  const errors: ImportError[] = [];

  for (const mapped of mappedTitles) {
    if (mapped.validationErrors.length === 0) {
      validCount++;
    } else {
      invalidCount++;

      // Convert to ImportError format
      for (const err of mapped.validationErrors) {
        errors.push({
          productIndex: mapped.rawIndex,
          recordReference: null,
          field: err.field,
          message: err.message,
          severity: "error",
        });
      }
    }
  }

  return { validCount, invalidCount, errors };
}

/**
 * Collect all errors from parsing and validation
 *
 * @param parsingErrors - Errors from XML parsing
 * @param mappedTitles - Mapped titles with validation errors
 * @returns Combined import errors
 */
export function collectErrors(
  parsingErrors: ParsingError[],
  mappedTitles: MappedTitle[],
): ImportError[] {
  const errors: ImportError[] = [];

  // Add parsing errors
  for (const err of parsingErrors) {
    errors.push({
      productIndex: err.productIndex,
      recordReference: err.recordReference,
      field: err.field,
      message: err.message,
      severity: err.severity,
    });
  }

  // Add validation errors from mapped titles
  for (const mapped of mappedTitles) {
    for (const err of mapped.validationErrors) {
      errors.push({
        productIndex: mapped.rawIndex,
        recordReference: null,
        field: err.field,
        message: err.message,
        severity: "error",
      });
    }
  }

  return errors;
}

/**
 * Validate file constraints before processing
 *
 * @param file - File object to validate
 * @returns Validation result with error message if invalid
 */
export function validateFileConstraints(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  // Check file extension
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "xml") {
    return {
      valid: false,
      error: "File must have .xml extension",
    };
  }

  // Check MIME type (be lenient as some systems report different types)
  const validTypes = [
    "text/xml",
    "application/xml",
    "application/x-xml",
    "text/plain", // Some systems report XML as plain text
  ];
  if (file.type && !validTypes.includes(file.type)) {
    // Warn but don't fail - extension check is more reliable
    console.warn(`[ONIX Import] Unexpected MIME type: ${file.type}`);
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds 10MB limit`,
    };
  }

  // Check file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
    };
  }

  return { valid: true };
}

/**
 * Validate product count constraint
 *
 * @param count - Number of products in file
 * @param maxProducts - Maximum allowed (default 500)
 * @returns Validation result
 */
export function validateProductCount(
  count: number,
  maxProducts = 500,
): { valid: boolean; error?: string } {
  if (count === 0) {
    return {
      valid: false,
      error: "ONIX file contains no products to import",
    };
  }

  if (count > maxProducts) {
    return {
      valid: false,
      error: `Too many products (${count}). Maximum is ${maxProducts} per import.`,
    };
  }

  return { valid: true };
}

/**
 * Check for duplicate ISBNs within the import batch
 *
 * @param mappedTitles - Array of mapped titles
 * @returns Array of duplicate ISBN errors
 */
export function checkDuplicateISBNs(
  mappedTitles: MappedTitle[],
): ImportError[] {
  const errors: ImportError[] = [];
  const seenISBNs = new Map<string, number>();

  for (const mapped of mappedTitles) {
    const isbn = mapped.title.isbn;
    if (!isbn) continue;

    if (seenISBNs.has(isbn)) {
      const firstIndex = seenISBNs.get(isbn) ?? 0;
      errors.push({
        productIndex: mapped.rawIndex,
        recordReference: null,
        field: "isbn",
        message: `Duplicate ISBN in import file (also at product ${firstIndex + 1})`,
        severity: "error",
      });
    } else {
      seenISBNs.set(isbn, mapped.rawIndex);
    }
  }

  return errors;
}

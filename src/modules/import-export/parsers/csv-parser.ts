/**
 * CSV Parser for Import/Export Module
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 1.1: Create CSV parser with PapaParse
 *
 * FRs: FR170 (CSV import with column mapping)
 *
 * Patterns from:
 * - src/modules/isbn/components/isbn-import-form.tsx (PapaParse usage)
 * - src/modules/channels/adapters/amazon/sales-parser.ts (delimiter detection)
 */

import * as Papa from "papaparse";

import type { CsvParseError, CsvParseResult } from "../types";

/** Max file size: 5MB */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Max rows per import: 1000 */
export const MAX_ROWS = 1000;

/** Rows to show in sample preview */
export const SAMPLE_ROWS = 5;

/**
 * Configuration for CSV parsing
 */
export interface CsvParseConfig {
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Maximum number of rows (default: 1000) */
  maxRows?: number;
  /** Whether to auto-detect headers (default: true) */
  detectHeaders?: boolean;
  /** Force a specific delimiter instead of auto-detecting */
  delimiter?: "," | "\t";
}

/**
 * Check if the first row looks like a header row
 * Headers typically contain field names, not data values
 */
function detectIfHeader(row: string[]): boolean {
  if (!row || row.length === 0) return false;

  // Common header indicators
  const headerPatterns = [
    /^title$/i,
    /^author/i,
    /^isbn/i,
    /^name$/i,
    /^genre$/i,
    /^date$/i,
    /^status$/i,
    /^subtitle$/i,
    /^asin$/i,
    /^word/i,
    /^publication/i,
    /^category$/i,
  ];

  // Check if any cell matches a header pattern
  const matchCount = row.filter((cell) =>
    headerPatterns.some((pattern) => pattern.test(cell.trim())),
  ).length;

  // If 2+ cells look like headers, treat as header row
  return matchCount >= 2;
}

/**
 * Validate a file before parsing
 */
export function validateCsvFile(
  file: File,
  config: CsvParseConfig = {},
): string | null {
  const maxSize = config.maxFileSize ?? MAX_FILE_SIZE;

  // Check MIME type
  if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
    return "Invalid file type. Please upload a CSV file.";
  }

  // Check file size
  if (file.size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(1);
    const actualMB = (file.size / 1024 / 1024).toFixed(2);
    return `File too large. Maximum size is ${maxMB}MB (${actualMB}MB uploaded).`;
  }

  return null;
}

/**
 * Parse a CSV file using PapaParse
 *
 * Features:
 * - Auto-detects delimiter (comma vs tab)
 * - Auto-detects header row
 * - Handles quoted fields with proper escaping
 * - Supports UTF-8 encoding with BOM detection
 * - Enforces row limits
 *
 * @param file - The CSV file to parse
 * @param config - Optional parsing configuration
 * @returns Promise resolving to parse result
 */
export function parseCsvFile(
  file: File,
  config: CsvParseConfig = {},
): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    const maxRows = config.maxRows ?? MAX_ROWS;
    const detectHeaders = config.detectHeaders ?? true;

    // Validate file first
    const validationError = validateCsvFile(file, config);
    if (validationError) {
      resolve({
        success: false,
        rows: [],
        headers: [],
        headersDetected: false,
        rowCount: 0,
        errors: [{ row: 0, message: validationError }],
        delimiter: ",",
        filename: file.name,
        fileSize: file.size,
      });
      return;
    }

    Papa.parse<string[]>(file, {
      // Let PapaParse auto-detect delimiter if not specified
      delimiter: config.delimiter,
      // Don't treat first row as header - we'll detect ourselves
      header: false,
      // Skip empty lines
      skipEmptyLines: true,
      // Handle encoding
      encoding: "UTF-8",
      // Complete callback
      complete: (results) => {
        const errors: CsvParseError[] = [];
        let rows = results.data;

        // Add any PapaParse errors
        if (results.errors && results.errors.length > 0) {
          results.errors.forEach((err) => {
            errors.push({
              row: err.row ?? 0,
              message: err.message,
            });
          });
        }

        // Detect delimiter from meta
        const detectedDelimiter = (results.meta.delimiter as "," | "\t") || ",";

        // Filter out completely empty rows
        rows = rows.filter((row) =>
          row.some((cell) => cell && cell.trim() !== ""),
        );

        if (rows.length === 0) {
          resolve({
            success: false,
            rows: [],
            headers: [],
            headersDetected: false,
            rowCount: 0,
            errors: [
              {
                row: 0,
                message: "CSV file is empty or contains no valid data.",
              },
            ],
            delimiter: detectedDelimiter,
            filename: file.name,
            fileSize: file.size,
          });
          return;
        }

        // Detect and extract headers
        let headers: string[] = [];
        let headersDetected = false;
        let dataRows = rows;

        if (detectHeaders && rows.length > 0) {
          const firstRow = rows[0];
          if (detectIfHeader(firstRow)) {
            headers = firstRow.map((h) => h.trim());
            dataRows = rows.slice(1);
            headersDetected = true;
          } else {
            // Generate generic headers
            headers = firstRow.map((_, i) => `Column ${i + 1}`);
          }
        }

        // Check row limit
        if (dataRows.length > maxRows) {
          errors.push({
            row: 0,
            message: `Too many rows. Maximum is ${maxRows} rows (found ${dataRows.length}).`,
          });
          // Still return data but mark as failed
          resolve({
            success: false,
            rows: dataRows.slice(0, maxRows),
            headers,
            headersDetected,
            rowCount: dataRows.length,
            errors,
            delimiter: detectedDelimiter,
            filename: file.name,
            fileSize: file.size,
          });
          return;
        }

        resolve({
          success: errors.length === 0,
          rows: dataRows,
          headers,
          headersDetected,
          rowCount: dataRows.length,
          errors,
          delimiter: detectedDelimiter,
          filename: file.name,
          fileSize: file.size,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          rows: [],
          headers: [],
          headersDetected: false,
          rowCount: 0,
          errors: [
            { row: 0, message: `Failed to parse CSV: ${error.message}` },
          ],
          delimiter: ",",
          filename: file.name,
          fileSize: file.size,
        });
      },
    });
  });
}

/**
 * Parse CSV content from a string (useful for testing)
 */
export function parseCsvString(
  content: string,
  config: CsvParseConfig = {},
): CsvParseResult {
  const maxRows = config.maxRows ?? MAX_ROWS;
  const detectHeaders = config.detectHeaders ?? true;

  const results = Papa.parse<string[]>(content, {
    delimiter: config.delimiter,
    header: false,
    skipEmptyLines: true,
  });

  const errors: CsvParseError[] = [];

  // Add any PapaParse errors
  if (results.errors && results.errors.length > 0) {
    results.errors.forEach((err) => {
      errors.push({
        row: err.row ?? 0,
        message: err.message,
      });
    });
  }

  const detectedDelimiter = (results.meta.delimiter as "," | "\t") || ",";

  // Filter empty rows
  const rows = results.data.filter((row) =>
    row.some((cell) => cell && cell.trim() !== ""),
  );

  if (rows.length === 0) {
    return {
      success: false,
      rows: [],
      headers: [],
      headersDetected: false,
      rowCount: 0,
      errors: [
        { row: 0, message: "CSV content is empty or contains no valid data." },
      ],
      delimiter: detectedDelimiter,
    };
  }

  // Detect and extract headers
  let headers: string[] = [];
  let headersDetected = false;
  let dataRows = rows;

  if (detectHeaders && rows.length > 0) {
    const firstRow = rows[0];
    if (detectIfHeader(firstRow)) {
      headers = firstRow.map((h) => h.trim());
      dataRows = rows.slice(1);
      headersDetected = true;
    } else {
      headers = firstRow.map((_, i) => `Column ${i + 1}`);
    }
  }

  // Check row limit
  if (dataRows.length > maxRows) {
    errors.push({
      row: 0,
      message: `Too many rows. Maximum is ${maxRows} rows (found ${dataRows.length}).`,
    });
    return {
      success: false,
      rows: dataRows.slice(0, maxRows),
      headers,
      headersDetected,
      rowCount: dataRows.length,
      errors,
      delimiter: detectedDelimiter,
    };
  }

  return {
    success: errors.length === 0,
    rows: dataRows,
    headers,
    headersDetected,
    rowCount: dataRows.length,
    errors,
    delimiter: detectedDelimiter,
  };
}

/**
 * Get sample values from a column for preview
 */
export function getSampleValues(
  rows: string[][],
  columnIndex: number,
  maxSamples: number = SAMPLE_ROWS,
): string[] {
  const samples: string[] = [];

  for (let i = 0; i < Math.min(rows.length, maxSamples); i++) {
    const row = rows[i];
    if (row && row[columnIndex] !== undefined) {
      samples.push(row[columnIndex].trim());
    }
  }

  return samples;
}

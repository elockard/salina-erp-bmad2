/**
 * Ingram Inventory File Parser
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 *
 * Parses Ingram inventory status files (CSV/TSV format) to compare
 * with local catalog and identify mismatches.
 */

/**
 * Single inventory record from Ingram file
 */
export interface IngramInventoryRecord {
  isbn: string;
  availabilityCode: string; // Codelist 65 code from Ingram
  quantityOnHand?: number;
  lastUpdated?: Date;
  rawLine?: string;
}

/**
 * Result of parsing an inventory file
 */
export interface InventoryParseResult {
  success: boolean;
  records: IngramInventoryRecord[];
  errors: { line: number; message: string; raw?: string }[];
  format: "csv" | "tsv" | "unknown";
}

/**
 * Parse Ingram inventory file content
 *
 * Supports both CSV and TSV formats, auto-detecting based on header.
 * Expects columns for ISBN/EAN and availability status at minimum.
 *
 * @param content - File content as string
 * @param _fileName - File name (for logging)
 * @returns Parse result with records and any errors
 */
export function parseIngramInventoryFile(
  content: string,
  _fileName: string,
): InventoryParseResult {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      records: [],
      errors: [{ line: 0, message: "No data rows" }],
      format: "unknown",
    };
  }

  // Detect delimiter from header row
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const format = delimiter === "\t" ? "tsv" : "csv";

  // Parse header row
  const headers = lines[0]
    .toLowerCase()
    .split(delimiter)
    .map((h) => h.trim().replace(/"/g, ""));

  // Find column indices for required/optional fields
  const isbnCol = findColumn(headers, ["isbn", "isbn13", "ean", "product_id"]);
  const statusCol = findColumn(headers, [
    "availability",
    "status",
    "availability_code",
    "product_availability",
  ]);
  const qtyCol = findColumn(headers, [
    "quantity",
    "qty",
    "on_hand",
    "quantity_on_hand",
  ]);
  const dateCol = findColumn(headers, ["last_updated", "updated", "date"]);

  if (isbnCol === -1) {
    return {
      success: false,
      records: [],
      errors: [{ line: 1, message: "ISBN column not found" }],
      format,
    };
  }

  const records: IngramInventoryRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseDelimitedLine(line, delimiter);

    try {
      const isbn = normalizeIsbn(values[isbnCol] || "");
      const availabilityCode =
        statusCol !== -1 ? values[statusCol]?.trim() || "20" : "20";
      const quantityOnHand =
        qtyCol !== -1 ? parseInt(values[qtyCol], 10) : undefined;
      const lastUpdated =
        dateCol !== -1 && values[dateCol]
          ? new Date(values[dateCol])
          : undefined;

      if (isbn) {
        records.push({
          isbn,
          availabilityCode,
          quantityOnHand:
            quantityOnHand !== undefined && !Number.isNaN(quantityOnHand)
              ? quantityOnHand
              : undefined,
          lastUpdated,
          rawLine: line,
        });
      } else {
        errors.push({ line: i + 1, message: "Missing ISBN", raw: line });
      }
    } catch (err) {
      errors.push({
        line: i + 1,
        message: err instanceof Error ? err.message : "Parse error",
        raw: line,
      });
    }
  }

  return {
    success: records.length > 0,
    records,
    errors,
    format,
  };
}

/**
 * Find column index from list of candidate names
 */
function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a delimited line handling quoted values
 */
function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/**
 * Normalize ISBN by removing hyphens and other non-alphanumeric chars
 */
function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9X]/gi, "").toUpperCase();
}

/**
 * Map publication status to expected Codelist 65 code
 *
 * Used for comparison - same logic as getProductAvailabilityCode in message-builder
 */
function getExpectedCodeFromStatus(status: string): string {
  switch (status) {
    case "draft":
    case "pending":
      return "10";
    case "published":
      return "20";
    case "out_of_print":
      return "40";
    default:
      return "20";
  }
}

/**
 * Compare Ingram inventory with local catalog
 *
 * Story 16.4 - AC6: Status Mismatch Alerts
 *
 * Returns comparison results categorizing records as:
 * - matched: Ingram and local status agree
 * - mismatched: Ingram has different status than local expects
 * - ingramOnly: Record exists in Ingram but not locally
 * - localOnly: Record exists locally but not in Ingram
 *
 * @param ingramRecords - Parsed records from Ingram inventory file
 * @param localTitles - Local titles with ISBN and publication_status
 * @returns Comparison results
 */
export function compareInventoryStatus(
  ingramRecords: IngramInventoryRecord[],
  localTitles: { isbn: string; publication_status: string }[],
): {
  matched: { isbn: string; localStatus: string; ingramCode: string }[];
  mismatched: {
    isbn: string;
    localStatus: string;
    ingramCode: string;
    localExpectedCode: string;
  }[];
  ingramOnly: { isbn: string; ingramCode: string }[];
  localOnly: { isbn: string; localStatus: string }[];
} {
  const localByIsbn = new Map(
    localTitles.map((t) => [normalizeIsbn(t.isbn), t]),
  );
  const ingramByIsbn = new Map(ingramRecords.map((r) => [r.isbn, r]));

  const matched: { isbn: string; localStatus: string; ingramCode: string }[] =
    [];
  const mismatched: {
    isbn: string;
    localStatus: string;
    ingramCode: string;
    localExpectedCode: string;
  }[] = [];
  const ingramOnly: { isbn: string; ingramCode: string }[] = [];
  const localOnly: { isbn: string; localStatus: string }[] = [];

  // Check Ingram records against local catalog
  for (const [isbn, ingramRecord] of ingramByIsbn) {
    const localTitle = localByIsbn.get(isbn);
    if (!localTitle) {
      ingramOnly.push({ isbn, ingramCode: ingramRecord.availabilityCode });
      continue;
    }

    const localExpectedCode = getExpectedCodeFromStatus(
      localTitle.publication_status,
    );
    if (ingramRecord.availabilityCode === localExpectedCode) {
      matched.push({
        isbn,
        localStatus: localTitle.publication_status,
        ingramCode: ingramRecord.availabilityCode,
      });
    } else {
      mismatched.push({
        isbn,
        localStatus: localTitle.publication_status,
        ingramCode: ingramRecord.availabilityCode,
        localExpectedCode,
      });
    }
  }

  // Find local-only titles (in local catalog but not in Ingram file)
  for (const [isbn, localTitle] of localByIsbn) {
    if (!ingramByIsbn.has(isbn)) {
      localOnly.push({ isbn, localStatus: localTitle.publication_status });
    }
  }

  return { matched, mismatched, ingramOnly, localOnly };
}

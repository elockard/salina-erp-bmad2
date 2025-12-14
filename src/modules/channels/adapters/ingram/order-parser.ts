/**
 * Ingram Order File Parser
 *
 * Story 16.3 - AC2: Parse Ingram Order File Format
 *
 * Supports:
 * - EDI X12 850 Purchase Order format
 * - Delimited flat file format (CSV/TSV fallback)
 *
 * Ingram typically provides order files in one of these formats.
 * The parser auto-detects format based on file content.
 */

export interface IngramOrderRecord {
  orderId: string; // Ingram order/PO number
  isbn: string; // ISBN-13 (normalized)
  quantity: number; // Units ordered
  unitPrice: number; // Price per unit
  orderDate: Date; // Date of order
  lineNumber?: number; // Line number in PO (for tracking)
  rawLine?: string; // Original line for debugging
}

export interface ParseResult {
  success: boolean;
  orders: IngramOrderRecord[];
  errors: { line: number; message: string; raw?: string }[];
  format: "edi" | "delimited" | "unknown";
}

/**
 * Parse Ingram order file content
 * Auto-detects format (EDI X12 850 or delimited)
 *
 * @param content - Raw file content
 * @param fileName - File name for generating fallback order IDs
 * @returns ParseResult with orders and any parsing errors
 */
export function parseIngramOrderFile(
  content: string,
  fileName: string,
): ParseResult {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      orders: [],
      errors: [{ line: 0, message: "Empty file" }],
      format: "unknown",
    };
  }

  // Auto-detect format
  // EDI X12 starts with ISA or contains segment delimiters (~)
  if (lines[0].startsWith("ISA") || content.includes("~")) {
    return parseEdiX12(content, fileName);
  }

  // Delimited format (tab or comma separated)
  if (lines[0].includes("\t") || lines[0].includes(",")) {
    return parseDelimitedFile(content, fileName);
  }

  return {
    success: false,
    orders: [],
    errors: [{ line: 0, message: "Unrecognized file format" }],
    format: "unknown",
  };
}

/**
 * Parse EDI X12 850 Purchase Order format
 *
 * EDI segments:
 * - ISA: Interchange header
 * - GS: Functional group header
 * - ST: Transaction set header (850 = Purchase Order)
 * - BEG: Beginning segment (PO number, date)
 * - PO1: Line item (quantity, unit, price, ISBN)
 * - SE: Transaction set trailer
 * - GE: Functional group trailer
 * - IEA: Interchange trailer
 */
function parseEdiX12(content: string, _fileName: string): ParseResult {
  const orders: IngramOrderRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  // EDI uses ~ as segment terminator and * as element delimiter
  const segmentDelimiter = content.includes("~") ? "~" : "\n";
  const elementDelimiter = "*";

  const segments = content
    .split(segmentDelimiter)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let currentOrderId = "";
  let currentOrderDate = new Date();
  let lineNumber = 0;

  for (const segment of segments) {
    const elements = segment.split(elementDelimiter);
    const segmentId = elements[0];

    try {
      switch (segmentId) {
        case "BEG":
          // BEG*00*SA*{PO Number}**{Date YYYYMMDD}
          currentOrderId = elements[3] || "";
          if (elements[5]) {
            currentOrderDate = parseEdiDate(elements[5]);
          }
          break;

        case "PO1": {
          // PO1*{Line}*{Qty}*{Unit}*{Price}*{PriceUnit}**IB*{ISBN}
          lineNumber++;
          const qty = parseInt(elements[2], 10);
          const price = parseFloat(elements[4]);

          // Find ISBN in elements (typically after IB qualifier)
          let isbn = "";
          for (let i = 0; i < elements.length - 1; i++) {
            if (elements[i] === "IB" || elements[i] === "EN") {
              isbn = elements[i + 1];
              break;
            }
          }

          if (isbn && !Number.isNaN(qty) && !Number.isNaN(price)) {
            orders.push({
              orderId: currentOrderId,
              isbn: normalizeIsbn(isbn),
              quantity: qty,
              unitPrice: price,
              orderDate: currentOrderDate,
              lineNumber,
              rawLine: segment,
            });
          } else {
            errors.push({
              line: lineNumber,
              message: `Invalid PO1 segment: missing ISBN, quantity, or price`,
              raw: segment,
            });
          }
          break;
        }
      }
    } catch (err) {
      errors.push({
        line: lineNumber,
        message: err instanceof Error ? err.message : "Parse error",
        raw: segment,
      });
    }
  }

  return {
    success: orders.length > 0 || errors.length === 0,
    orders,
    errors,
    format: "edi",
  };
}

/**
 * Parse delimited (CSV/TSV) order file
 *
 * Expected columns (flexible order, detected from header):
 * - Order ID / PO Number
 * - ISBN / ISBN13
 * - Quantity / Qty
 * - Unit Price / Price
 * - Order Date / Date
 */
function parseDelimitedFile(content: string, fileName: string): ParseResult {
  const orders: IngramOrderRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      orders: [],
      errors: [{ line: 0, message: "No data rows" }],
      format: "delimited",
    };
  }

  // Detect delimiter
  const delimiter = lines[0].includes("\t") ? "\t" : ",";

  // Parse header
  const headers = lines[0]
    .toLowerCase()
    .split(delimiter)
    .map((h) => h.trim().replace(/"/g, ""));

  // Find column indices
  const orderIdCol = findColumn(headers, [
    "order_id",
    "orderid",
    "po_number",
    "ponumber",
    "po",
  ]);
  const isbnCol = findColumn(headers, ["isbn", "isbn13", "isbn_13", "ean"]);
  const qtyCol = findColumn(headers, ["quantity", "qty", "units"]);
  const priceCol = findColumn(headers, ["unit_price", "unitprice", "price"]);
  const dateCol = findColumn(headers, ["order_date", "orderdate", "date"]);

  if (isbnCol === -1) {
    return {
      success: false,
      orders: [],
      errors: [{ line: 1, message: "ISBN column not found in header" }],
      format: "delimited",
    };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseDelimitedLine(line, delimiter);

    try {
      const isbn = normalizeIsbn(values[isbnCol] || "");
      const quantity = parseInt(values[qtyCol] || "1", 10);
      const unitPrice = parseFloat(values[priceCol] || "0");
      const orderId = values[orderIdCol] || `${fileName}-${i}`;
      const orderDate =
        dateCol !== -1 ? parseFlexibleDate(values[dateCol]) : new Date();

      if (isbn && !Number.isNaN(quantity) && quantity > 0) {
        orders.push({
          orderId,
          isbn,
          quantity,
          unitPrice: Number.isNaN(unitPrice) ? 0 : unitPrice,
          orderDate,
          lineNumber: i,
          rawLine: line,
        });
      } else {
        errors.push({
          line: i + 1,
          message: "Invalid row: missing or invalid ISBN/quantity",
          raw: line,
        });
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
    success: orders.length > 0,
    orders,
    errors,
    format: "delimited",
  };
}

// Helper functions
function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  // Handle quoted fields
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

function parseEdiDate(dateStr: string): Date {
  // YYYYMMDD format
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

function parseFlexibleDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  // Try MM/DD/YYYY or similar
  const parts = dateStr.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    // Assume MM/DD/YYYY if first part <= 12
    if (a <= 12) {
      return new Date(c, a - 1, b);
    }
    // Otherwise YYYY-MM-DD
    return new Date(a, b - 1, c);
  }

  return new Date();
}

/**
 * Normalize ISBN to 13-digit format without hyphens
 *
 * Handles:
 * - Removing hyphens and spaces
 * - Converting ISBN-10 to ISBN-13
 * - Case-insensitive X handling for ISBN-10
 */
export function normalizeIsbn(isbn: string): string {
  // Remove all non-digit characters except X (for ISBN-10 check digit)
  let normalized = isbn.replace(/[^0-9X]/gi, "").toUpperCase();

  // If ISBN-10, convert to ISBN-13
  if (normalized.length === 10) {
    normalized = convertIsbn10To13(normalized);
  }

  return normalized;
}

function convertIsbn10To13(isbn10: string): string {
  // Prepend 978 and recalculate check digit
  const isbn12 = `978${isbn10.substring(0, 9)}`;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return isbn12 + checkDigit;
}

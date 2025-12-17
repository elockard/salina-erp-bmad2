/**
 * Amazon Sales Report Parser
 *
 * Story 17.3 - Import Amazon Sales Data
 *
 * Parses Amazon flat file sales reports (CSV/TSV format)
 *
 * Expected columns (from GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL):
 * - amazon-order-id
 * - purchase-date
 * - product-name
 * - sku
 * - asin
 * - item-price
 * - quantity-purchased
 *
 * Note: ISBN may be in SKU field if publisher uses ISBN as SKU
 */

import { normalizeIsbn } from "@/modules/channels/adapters/ingram/order-parser";

export interface AmazonSaleRecord {
  orderId: string; // amazon-order-id
  purchaseDate: Date; // purchase-date
  asin: string; // asin
  isbn: string; // Extracted from sku (if ISBN format)
  quantity: number; // quantity-purchased
  itemPrice: number; // item-price (total for line item)
  unitPrice: number; // Calculated: itemPrice / quantity
  sku: string; // sku (may contain ISBN)
  productName: string; // product-name
  lineNumber: number; // For error tracking
  rawLine?: string; // Original line for debugging
}

export interface AmazonSalesParseResult {
  success: boolean;
  sales: AmazonSaleRecord[];
  errors: { line: number; message: string; raw?: string }[];
}

/**
 * Parse Amazon sales report content
 *
 * Story 17.3 - AC3: Download and Parse Sales Report
 *
 * @param content - Raw CSV/TSV report content
 * @returns ParseResult with sales records and any parsing errors
 */
export function parseAmazonSalesReport(
  content: string,
): AmazonSalesParseResult {
  const sales: AmazonSaleRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      sales: [],
      errors: [{ line: 0, message: "No data rows found in report" }],
    };
  }

  // Detect delimiter (tab-separated for Amazon flat files, comma for CSV)
  const delimiter = lines[0].includes("\t") ? "\t" : ",";

  // Parse header
  const headers = lines[0]
    .toLowerCase()
    .split(delimiter)
    .map((h) => h.trim().replace(/"/g, ""));

  // Find column indices
  const orderIdCol = findColumn(headers, [
    "amazon-order-id",
    "order-id",
    "orderid",
  ]);
  const dateCol = findColumn(headers, [
    "purchase-date",
    "purchasedate",
    "order-date",
  ]);
  const asinCol = findColumn(headers, ["asin"]);
  const skuCol = findColumn(headers, ["sku", "seller-sku"]);
  const qtyCol = findColumn(headers, ["quantity-purchased", "quantity", "qty"]);
  const priceCol = findColumn(headers, ["item-price", "itemprice", "price"]);
  const nameCol = findColumn(headers, ["product-name", "productname", "title"]);

  if (orderIdCol === -1 || dateCol === -1) {
    return {
      success: false,
      sales: [],
      errors: [
        {
          line: 1,
          message:
            "Required columns (amazon-order-id, purchase-date) not found in header",
        },
      ],
    };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseDelimitedLine(line, delimiter);

    try {
      const orderId = values[orderIdCol] || "";
      const purchaseDate = parseFlexibleDate(values[dateCol] || "");
      const asin = asinCol !== -1 ? values[asinCol] || "" : "";
      const sku = skuCol !== -1 ? values[skuCol] || "" : "";
      const quantity = qtyCol !== -1 ? parseInt(values[qtyCol] || "1", 10) : 1;
      const itemPrice =
        priceCol !== -1 ? parseFloat(values[priceCol] || "0") : 0;
      const productName = nameCol !== -1 ? values[nameCol] || "" : "";

      // Try to extract ISBN from SKU (common practice: publishers use ISBN as SKU)
      let isbn = "";
      if (sku) {
        const cleanSku = sku.replace(/[-\s]/g, "");
        // Check if SKU looks like an ISBN (10 or 13 digits, possibly with X)
        if (
          /^\d{10}$/.test(cleanSku) ||
          /^\d{13}$/.test(cleanSku) ||
          /^\d{9}[Xx]$/.test(cleanSku)
        ) {
          isbn = normalizeIsbn(sku);
        }
      }

      // Validate required fields
      if (!orderId) {
        errors.push({
          line: i + 1,
          message: "Missing order ID",
          raw: line,
        });
        continue;
      }

      if (Number.isNaN(quantity) || quantity <= 0) {
        errors.push({
          line: i + 1,
          message: "Invalid quantity",
          raw: line,
        });
        continue;
      }

      // Calculate unit price (handle divide by zero)
      const unitPrice =
        !Number.isNaN(itemPrice) && quantity > 0 ? itemPrice / quantity : 0;

      sales.push({
        orderId,
        purchaseDate,
        asin,
        isbn,
        quantity,
        itemPrice: Number.isNaN(itemPrice) ? 0 : itemPrice,
        unitPrice,
        sku,
        productName,
        lineNumber: i,
        rawLine: line,
      });
    } catch (err) {
      errors.push({
        line: i + 1,
        message: err instanceof Error ? err.message : "Parse error",
        raw: line,
      });
    }
  }

  return {
    success: sales.length > 0,
    sales,
    errors,
  };
}

/**
 * Find column index by trying multiple candidate names
 */
function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a delimited line handling quoted fields
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
 * Parse flexible date formats
 * Amazon uses ISO format: 2024-01-15T10:30:00+00:00
 */
function parseFlexibleDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Try ISO format first (Amazon's primary format)
  const isoDate = new Date(dateStr);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  // Try MM/DD/YYYY or YYYY-MM-DD
  const parts = dateStr.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    // Assume MM/DD/YYYY if first part <= 12
    if (a <= 12 && c > 31) {
      return new Date(c, a - 1, b);
    }
    // Otherwise YYYY-MM-DD
    return new Date(a, b - 1, c);
  }

  return new Date();
}

/**
 * Extract summary statistics from parse result
 * Useful for logging and UI display
 */
export function getSalesParseStats(result: AmazonSalesParseResult): {
  totalRecords: number;
  validRecords: number;
  errorCount: number;
  recordsWithIsbn: number;
  recordsWithoutIsbn: number;
  uniqueOrderIds: number;
  totalQuantity: number;
  totalValue: number;
} {
  const uniqueOrders = new Set(result.sales.map((s) => s.orderId));

  return {
    totalRecords: result.sales.length + result.errors.length,
    validRecords: result.sales.length,
    errorCount: result.errors.length,
    recordsWithIsbn: result.sales.filter((s) => s.isbn).length,
    recordsWithoutIsbn: result.sales.filter((s) => !s.isbn).length,
    uniqueOrderIds: uniqueOrders.size,
    totalQuantity: result.sales.reduce((sum, s) => sum + s.quantity, 0),
    totalValue: result.sales.reduce((sum, s) => sum + s.itemPrice, 0),
  };
}

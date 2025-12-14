# Story 16.3: Ingest Ingram Order Data

Status: done

## Story

**As a** publisher,
**I want** to import orders from Ingram automatically,
**So that** sales are recorded without manual data entry.

## Context

This story builds on Story 16.1 (Ingram Account Connection) and Story 16.2 (Automated ONIX Feeds) to complete the two-way data flow with Ingram Content Group. Publishers send catalog metadata to Ingram via ONIX feeds; now they receive order data back.

### Dependencies
- Story 16.1 (Configure Ingram Account Connection) - Complete
- Story 16.2 (Schedule Automated ONIX Feeds) - Complete
- Epic 3 (Sales & Returns Processing) - Complete (provides sales schema)

### Business Value
- Eliminates manual order entry from Ingram reports
- Ensures sales data is captured in near real-time
- Provides accurate royalty calculation basis
- Reduces data entry errors and lag time

## Acceptance Criteria

### AC1: Download Order Files from FTP
- **Given** I have Ingram configured and connected
- **When** the order ingestion job runs
- **Then** system connects to Ingram FTP using stored credentials
- **And** system lists files in `/outbound/orders/` directory
- **And** system downloads files modified since last successful ingestion
- **And** downloaded files are processed and then archived/deleted from local temp storage

### AC2: Parse Ingram Order File Format
- **Given** an order file is downloaded
- **When** system parses the file
- **Then** system extracts order records with: ISBN, quantity, unit price, order date, order ID
- **And** system handles Ingram's EDI X12 850 format or delimited flat file format
- **And** parsing errors are logged with file name and line number
- **And** partial file failures don't stop processing of valid records

### AC3: Create Sales Transactions
- **Given** valid order records are parsed
- **When** system processes each order
- **Then** a sales transaction is created in the `sales` table
- **And** transaction includes: tenant_id, title_id, format, quantity, unit_price, total_amount, sale_date, channel='distributor'
- **And** `created_by_user_id` is set to a system user or the tenant owner
- **And** transaction timestamp reflects the Ingram order date

### AC4: Match Orders to Titles by ISBN
- **Given** an order contains an ISBN
- **When** system looks up the title
- **Then** system finds the matching title by ISBN-13 in the tenant's catalog
- **And** ISBN matching is case-insensitive and handles hyphens/formatting
- **And** matched orders proceed to sales creation

### AC5: Flag Unmatched ISBNs for Review
- **Given** an order has an ISBN that doesn't match any title
- **When** system processes the order
- **Then** order is logged as "unmatched" with ISBN and order details
- **And** unmatched orders are visible in an ingestion history view
- **And** system continues processing remaining orders (don't fail batch)
- **And** unmatched count is tracked in the ingestion record

### AC6: Detect and Skip Duplicate Orders
- **Given** an order has already been imported
- **When** system checks for duplicates
- **Then** system skips the duplicate order
- **And** duplicate is logged but not counted as error
- **And** deduplication is based on: tenant_id + title_id + sale_date + quantity + channel

### AC7: Scheduled Ingestion Job
- **Given** Ingram is configured for a tenant
- **When** the hourly scheduler runs
- **Then** system triggers order ingestion for tenants with active Ingram connections
- **And** ingestion runs with 3 retries on failure
- **And** ingestion history is recorded in `channel_feeds` table with type='order_import'

## Tasks

- [x] Task 1 (AC: 1): Extend FTP client with `downloadFromIngram` function for order files
- [x] Task 2 (AC: 2): Create Ingram order file parser (EDI X12 850 / flat file)
- [x] Task 3 (AC: 3, 4): Implement sales transaction creation from parsed orders
- [x] Task 4 (AC: 5): Implement unmatched ISBN tracking and logging
- [x] Task 5 (AC: 6): Implement duplicate order detection
- [x] Task 6 (AC: 7): Create Inngest job for order ingestion
- [x] Task 7 (AC: 7): Update scheduler to include order ingestion
- [x] Task 8 (AC: 1-7): Write comprehensive tests

## Dev Notes

### CRITICAL: Reuse Existing Patterns

**DO NOT** create new patterns. This project has established conventions:

1. **Inngest Jobs**: See `src/inngest/ingram-feed.ts` for the exact job pattern
2. **FTP Client**: Extend `src/modules/channels/adapters/ingram/ftp-client.ts`
3. **adminDb**: Use `adminDb` for background jobs (no RLS session context)
4. **Channel Feeds**: Track ingestion in `channel_feeds` table with feedType='import' (add IMPORT to FEED_TYPE constant)
5. **Sales Creation**: Follow pattern from `src/modules/sales/actions.ts`

### FTP Client Extension

Add to `src/modules/channels/adapters/ingram/ftp-client.ts`:

```typescript
/**
 * List files in Ingram's outbound orders directory
 *
 * Story 16.3 - AC1: Download Order Files from FTP
 */
export async function listIngramOrderFiles(
  credentials: IngramCredentials,
  since?: Date
): Promise<{ name: string; modifiedAt: Date; size: number }[]> {
  const client = new Client(30000); // 30 second timeout

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    const files = await client.list("/outbound/orders/");

    return files
      .filter(f => f.type === 1) // Regular files only
      .filter(f => !since || f.modifiedAt > since)
      .map(f => ({
        name: f.name,
        modifiedAt: f.modifiedAt,
        size: f.size,
      }));
  } finally {
    client.close();
  }
}

/**
 * Download a file from Ingram's outbound orders directory
 *
 * Story 16.3 - AC1: Download Order Files from FTP
 */
export async function downloadIngramOrderFile(
  credentials: IngramCredentials,
  fileName: string,
  localPath: string
): Promise<ConnectionTestResult> {
  const client = new Client(60000); // 60 second timeout for downloads

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    await client.downloadTo(localPath, `/outbound/orders/${fileName}`);

    return {
      success: true,
      message: `Successfully downloaded ${fileName}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Download failed",
    };
  } finally {
    client.close();
  }
}
```

### Order File Parser

Create `src/modules/channels/adapters/ingram/order-parser.ts`:

```typescript
/**
 * Ingram Order File Parser
 *
 * Story 16.3 - AC2: Parse Ingram Order File Format
 *
 * Supports:
 * - EDI X12 850 Purchase Order format
 * - Delimited flat file format (fallback)
 *
 * Ingram typically provides order files in one of these formats.
 * The parser auto-detects format based on file content.
 */

export interface IngramOrderRecord {
  orderId: string;          // Ingram order/PO number
  isbn: string;             // ISBN-13 (may need normalization)
  quantity: number;         // Units ordered
  unitPrice: number;        // Price per unit
  orderDate: Date;          // Date of order
  lineNumber?: number;      // Line number in PO (for tracking)
  rawLine?: string;         // Original line for debugging
}

export interface ParseResult {
  success: boolean;
  orders: IngramOrderRecord[];
  errors: { line: number; message: string; raw?: string }[];
  format: 'edi' | 'delimited' | 'unknown';
}

/**
 * Parse Ingram order file content
 * Auto-detects format (EDI X12 850 or delimited)
 */
export function parseIngramOrderFile(content: string, fileName: string): ParseResult {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) {
    return { success: false, orders: [], errors: [{ line: 0, message: 'Empty file' }], format: 'unknown' };
  }

  // Auto-detect format
  // EDI X12 starts with ISA or contains segment delimiters
  if (lines[0].startsWith('ISA') || content.includes('~')) {
    return parseEdiX12(content, fileName);
  }

  // Delimited format (tab or comma separated)
  if (lines[0].includes('\t') || lines[0].includes(',')) {
    return parseDelimitedFile(content, fileName);
  }

  return {
    success: false,
    orders: [],
    errors: [{ line: 0, message: 'Unrecognized file format' }],
    format: 'unknown'
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
function parseEdiX12(content: string, fileName: string): ParseResult {
  const orders: IngramOrderRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  // EDI uses ~ as segment terminator and * as element delimiter
  const segmentDelimiter = content.includes('~') ? '~' : '\n';
  const elementDelimiter = '*';

  const segments = content.split(segmentDelimiter).map(s => s.trim()).filter(s => s.length > 0);

  let currentOrderId = '';
  let currentOrderDate = new Date();
  let lineNumber = 0;

  for (const segment of segments) {
    const elements = segment.split(elementDelimiter);
    const segmentId = elements[0];

    try {
      switch (segmentId) {
        case 'BEG':
          // BEG*00*SA*{PO Number}**{Date YYYYMMDD}
          currentOrderId = elements[3] || '';
          if (elements[5]) {
            currentOrderDate = parseEdiDate(elements[5]);
          }
          break;

        case 'PO1':
          // PO1*{Line}*{Qty}*{Unit}*{Price}*{PriceUnit}**IB*{ISBN}
          lineNumber++;
          const qty = parseInt(elements[2], 10);
          const price = parseFloat(elements[4]);

          // Find ISBN in elements (typically after IB qualifier)
          let isbn = '';
          for (let i = 0; i < elements.length - 1; i++) {
            if (elements[i] === 'IB' || elements[i] === 'EN') {
              isbn = elements[i + 1];
              break;
            }
          }

          if (isbn && !isNaN(qty) && !isNaN(price)) {
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
              raw: segment
            });
          }
          break;
      }
    } catch (err) {
      errors.push({
        line: lineNumber,
        message: err instanceof Error ? err.message : 'Parse error',
        raw: segment
      });
    }
  }

  return {
    success: orders.length > 0 || errors.length === 0,
    orders,
    errors,
    format: 'edi',
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

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return { success: false, orders: [], errors: [{ line: 0, message: 'No data rows' }], format: 'delimited' };
  }

  // Detect delimiter
  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  // Parse header
  const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const orderIdCol = findColumn(headers, ['order_id', 'orderid', 'po_number', 'ponumber', 'po']);
  const isbnCol = findColumn(headers, ['isbn', 'isbn13', 'isbn_13', 'ean']);
  const qtyCol = findColumn(headers, ['quantity', 'qty', 'units']);
  const priceCol = findColumn(headers, ['unit_price', 'unitprice', 'price']);
  const dateCol = findColumn(headers, ['order_date', 'orderdate', 'date']);

  if (isbnCol === -1) {
    return { success: false, orders: [], errors: [{ line: 1, message: 'ISBN column not found in header' }], format: 'delimited' };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseDelimitedLine(line, delimiter);

    try {
      const isbn = normalizeIsbn(values[isbnCol] || '');
      const quantity = parseInt(values[qtyCol] || '1', 10);
      const unitPrice = parseFloat(values[priceCol] || '0');
      const orderId = values[orderIdCol] || `${fileName}-${i}`;
      const orderDate = dateCol !== -1 ? parseFlexibleDate(values[dateCol]) : new Date();

      if (isbn && !isNaN(quantity) && quantity > 0) {
        orders.push({
          orderId,
          isbn,
          quantity,
          unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
          orderDate,
          lineNumber: i,
          rawLine: line,
        });
      } else {
        errors.push({ line: i + 1, message: 'Invalid row: missing or invalid ISBN/quantity', raw: line });
      }
    } catch (err) {
      errors.push({ line: i + 1, message: err instanceof Error ? err.message : 'Parse error', raw: line });
    }
  }

  return {
    success: orders.length > 0,
    orders,
    errors,
    format: 'delimited',
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
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
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
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try MM/DD/YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => parseInt(p, 10));
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
 */
export function normalizeIsbn(isbn: string): string {
  // Remove all non-digit characters except X (for ISBN-10 check digit)
  let normalized = isbn.replace(/[^0-9X]/gi, '').toUpperCase();

  // If ISBN-10, convert to ISBN-13
  if (normalized.length === 10) {
    normalized = convertIsbn10To13(normalized);
  }

  return normalized;
}

function convertIsbn10To13(isbn10: string): string {
  // Prepend 978 and recalculate check digit
  const isbn12 = '978' + isbn10.substring(0, 9);

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return isbn12 + checkDigit;
}
```

### Inngest Job: Order Ingestion

Create `src/inngest/ingram-orders.ts`:

```typescript
/**
 * Inngest: Ingram Order Ingestion Background Job
 *
 * Story 16.3 - Ingest Ingram Order Data
 *
 * Processing Steps:
 * 1. Create import record with 'pending' status
 * 2. Get credentials and connect to Ingram FTP
 * 3. List new order files since last successful import
 * 4. Download and parse each file
 * 5. Match ISBNs to titles
 * 6. Create sales transactions for matched orders
 * 7. Track unmatched ISBNs and duplicates
 * 8. Update import record with results
 */

import { inngest } from "./client";
import { adminDb } from "@/db";
import { channelFeeds, FEED_STATUS, FEED_TYPE } from "@/db/schema/channel-feeds";
import { channelCredentials, CHANNEL_TYPES, CHANNEL_STATUS } from "@/db/schema/channel-credentials";
import { sales } from "@/db/schema/sales";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { eq, and, or, sql } from "drizzle-orm";
import { decryptCredentials } from "@/lib/channel-encryption";
import {
  listIngramOrderFiles,
  downloadIngramOrderFile
} from "@/modules/channels/adapters/ingram/ftp-client";
import {
  parseIngramOrderFile,
  normalizeIsbn,
  type IngramOrderRecord
} from "@/modules/channels/adapters/ingram/order-parser";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import Decimal from "decimal.js";

interface IngramOrdersEventData {
  tenantId: string;
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

interface ImportMetadata {
  filesProcessed: number;
  ordersCreated: number;
  unmatchedIsbns: { isbn: string; orderId: string; quantity: number }[];
  duplicatesSkipped: number;
  parseErrors: { file: string; line: number; message: string }[];
}

export const ingramOrders = inngest.createFunction(
  {
    id: "ingram-orders",
    retries: 3,
  },
  { event: "channel/ingram.orders" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy, userId } = event.data as IngramOrdersEventData;

    // Step 1: Create import record
    const importId = await step.run("create-import-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType: FEED_TYPE.IMPORT,
          triggeredBy,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    const metadata: ImportMetadata = {
      filesProcessed: 0,
      ordersCreated: 0,
      unmatchedIsbns: [],
      duplicatesSkipped: 0,
      parseErrors: [],
    };

    try {
      // Step 2: Get credentials
      const credentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM)
          ),
        });

        if (!cred) throw new Error("Ingram credentials not configured");
        if (cred.status !== CHANNEL_STATUS.ACTIVE) throw new Error("Ingram connection is not active");

        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Step 3: Get last successful import time
      const lastImport = await step.run("get-last-import", async () => {
        const last = await adminDb.query.channelFeeds.findFirst({
          where: and(
            eq(channelFeeds.tenantId, tenantId),
            eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
            eq(channelFeeds.feedType, FEED_TYPE.IMPORT),
            eq(channelFeeds.status, FEED_STATUS.SUCCESS)
          ),
          orderBy: (feeds, { desc }) => [desc(feeds.completedAt)],
        });
        return last?.completedAt || null;
      });

      // Step 4: List order files
      const orderFiles = await step.run("list-order-files", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING }) // Using 'generating' for "downloading"
          .where(eq(channelFeeds.id, importId));

        return listIngramOrderFiles(credentials, lastImport || undefined);
      });

      if (orderFiles.length === 0) {
        await step.run("mark-skipped", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SKIPPED,
              productCount: 0,
              completedAt: new Date(),
              metadata: { ...metadata, reason: "No new order files" },
            })
            .where(eq(channelFeeds.id, importId));
        });

        return {
          success: true,
          skipped: true,
          reason: "No new order files",
          importId,
        };
      }

      // Step 5: Get system user for sales creation
      const systemUserId = await step.run("get-system-user", async () => {
        // Use tenant owner as the created_by user
        const owner = await adminDb.query.users.findFirst({
          where: and(
            eq(users.tenant_id, tenantId),
            eq(users.role, "owner")
          ),
        });
        if (!owner) throw new Error("Tenant owner not found");
        return owner.id;
      });

      // Step 6: Build ISBN to title_id map
      const isbnMap = await step.run("build-isbn-map", async () => {
        const tenantTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
          columns: { id: true, isbn: true, ebook_isbn: true, audiobook_isbn: true },
        });

        const map = new Map<string, { id: string; format: "physical" | "ebook" | "audiobook" }>();
        for (const title of tenantTitles) {
          if (title.isbn) {
            map.set(normalizeIsbn(title.isbn), { id: title.id, format: "physical" });
          }
          if (title.ebook_isbn) {
            map.set(normalizeIsbn(title.ebook_isbn), { id: title.id, format: "ebook" });
          }
          if (title.audiobook_isbn) {
            map.set(normalizeIsbn(title.audiobook_isbn), { id: title.id, format: "audiobook" });
          }
        }
        return map;
      });

      // Step 7: Process each file
      for (const file of orderFiles) {
        const fileResult = await step.run(`process-file-${file.name}`, async () => {
          const tempDir = os.tmpdir();
          const localPath = path.join(tempDir, file.name);

          try {
            // Download file
            const downloadResult = await downloadIngramOrderFile(credentials, file.name, localPath);
            if (!downloadResult.success) {
              metadata.parseErrors.push({ file: file.name, line: 0, message: downloadResult.message });
              return { ordersCreated: 0 };
            }

            // Read and parse file
            const content = await fs.readFile(localPath, "utf-8");
            const parseResult = parseIngramOrderFile(content, file.name);

            // Track parse errors
            for (const error of parseResult.errors) {
              metadata.parseErrors.push({ file: file.name, line: error.line, message: error.message });
            }

            // Process orders
            let ordersCreated = 0;
            for (const order of parseResult.orders) {
              // Match ISBN to title FIRST (needed for accurate duplicate check)
              const titleMatch = isbnMap.get(order.isbn);
              if (!titleMatch) {
                metadata.unmatchedIsbns.push({
                  isbn: order.isbn,
                  orderId: order.orderId,
                  quantity: order.quantity,
                });
                continue;
              }

              // Check for duplicate (includes title_id for accuracy)
              const existingDuplicate = await checkDuplicate(tenantId, order, titleMatch.id);
              if (existingDuplicate) {
                metadata.duplicatesSkipped++;
                continue;
              }

              // Create sales transaction
              const totalAmount = new Decimal(order.unitPrice).times(order.quantity).toFixed(2);

              await adminDb.insert(sales).values({
                tenant_id: tenantId,
                title_id: titleMatch.id,
                format: titleMatch.format,
                quantity: order.quantity,
                unit_price: order.unitPrice.toFixed(2),
                total_amount: totalAmount,
                sale_date: order.orderDate.toISOString().split("T")[0],
                channel: "distributor", // Ingram is a distributor channel
                created_by_user_id: systemUserId,
              });

              ordersCreated++;
            }

            metadata.filesProcessed++;
            return { ordersCreated };
          } finally {
            // Cleanup temp file
            try {
              await fs.unlink(localPath);
            } catch {
              // Ignore cleanup errors
            }
          }
        });

        metadata.ordersCreated += fileResult.ordersCreated;
      }

      // Step 8: Update import record with success
      await step.run("mark-success", async () => {
        await adminDb
          .update(channelFeeds)
          .set({
            status: FEED_STATUS.SUCCESS,
            productCount: metadata.ordersCreated,
            completedAt: new Date(),
            metadata,
          })
          .where(eq(channelFeeds.id, importId));
      });

      return {
        success: true,
        importId,
        ...metadata,
      };

    } catch (error) {
      // Mark import as failed
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
          metadata,
        })
        .where(eq(channelFeeds.id, importId));

      throw error; // Re-throw for Inngest retry
    }
  }
);

/**
 * Check if this order was already imported
 * Deduplication key: tenant_id + title_id + sale_date + quantity + channel
 */
async function checkDuplicate(
  tenantId: string,
  order: IngramOrderRecord,
  titleId: string
): Promise<boolean> {
  // Check for existing sale with same title, date, quantity, and channel
  // This prevents duplicate imports while allowing same-day orders for different titles
  const existingSale = await adminDb.query.sales.findFirst({
    where: and(
      eq(sales.tenant_id, tenantId),
      eq(sales.title_id, titleId),
      eq(sales.sale_date, order.orderDate.toISOString().split("T")[0]),
      eq(sales.quantity, order.quantity),
      eq(sales.channel, "distributor")
    ),
  });

  // Note: For even more robust deduplication, consider:
  // 1. Adding ingram_order_id column to sales table
  // 2. Tracking processed order IDs in channel_feeds metadata
  // 3. Using a separate ingram_orders tracking table

  return !!existingSale;
}
```

### Add Event Type to Inngest Client

Update `src/inngest/client.ts`:

```typescript
export interface InngestEvents {
  // ... existing events

  /**
   * Ingram order ingestion event
   * Story 16.3: Ingest Ingram Order Data
   */
  "channel/ingram.orders": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
}
```

### Update Scheduler

Update `src/inngest/ingram-feed-scheduler.ts` to also trigger order ingestion:

```typescript
// In the ingramFeedScheduler function, after triggering feed:

// Also trigger order ingestion for active connections
if (result.shouldTrigger || connection.metadata?.enableOrderImport) {
  await step.sendEvent(`trigger-orders-${connection.tenantId}`, {
    name: "channel/ingram.orders",
    data: {
      tenantId: connection.tenantId,
      triggeredBy: "schedule",
    },
  });
}
```

### Register Inngest Function

Update `src/inngest/functions.ts`:

```typescript
import { ingramOrders } from "./ingram-orders";

export const functions = [
  // ... existing functions
  ingramOrders,
];
```

### Server Action for Manual Trigger

Add to `src/modules/channels/adapters/ingram/actions.ts`:

```typescript
/**
 * Trigger manual Ingram order import
 * AC7: Manual trigger capability
 */
export async function triggerIngramOrderImport(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Role check - only owner/admin can trigger imports
    if (user.role !== "owner" && user.role !== "admin") {
      return { success: false, message: "Only owners and admins can trigger order imports" };
    }

    // Check Ingram is configured
    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id!),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM)
      ),
    });

    if (!credentials) {
      return { success: false, message: "Ingram is not configured" };
    }

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.orders",
      data: {
        tenantId: user.tenant_id!,
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Order import started" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to trigger import",
    };
  }
}
```

### UI: Import History Component

Create `src/modules/channels/adapters/ingram/components/ingram-import-history.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { ChannelFeed } from "@/db/schema/channel-feeds";

interface IngramImportHistoryProps {
  imports: ChannelFeed[];
  onTriggerImport: () => Promise<void>;
  isImporting: boolean;
}

export function IngramImportHistory({
  imports,
  onTriggerImport,
  isImporting
}: IngramImportHistoryProps) {
  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    pending: "secondary",
    generating: "secondary",
    failed: "destructive",
    skipped: "outline",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Order Imports</CardTitle>
        <Button onClick={onTriggerImport} disabled={isImporting} variant="outline">
          {isImporting ? "Importing..." : "Import Now"}
        </Button>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <p className="text-muted-foreground">No order imports yet.</p>
        ) : (
          <div className="space-y-3">
            {imports.map((imp) => {
              const meta = imp.metadata as {
                filesProcessed?: number;
                ordersCreated?: number;
                unmatchedIsbns?: { isbn: string }[];
                duplicatesSkipped?: number;
              } | null;

              return (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[imp.status]}>
                        {imp.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {imp.triggeredBy === "schedule" ? "Scheduled" : "Manual"}
                      </span>
                    </div>
                    <p className="text-sm">
                      {imp.createdAt
                        ? formatDistanceToNow(new Date(imp.createdAt), {
                            addSuffix: true,
                          })
                        : "Unknown time"}
                    </p>
                    {imp.errorMessage && (
                      <p className="text-sm text-destructive">{imp.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p>{meta?.ordersCreated ?? imp.productCount ?? 0} orders created</p>
                    {meta?.unmatchedIsbns && meta.unmatchedIsbns.length > 0 && (
                      <p className="text-amber-600">
                        {meta.unmatchedIsbns.length} unmatched
                      </p>
                    )}
                    {meta?.duplicatesSkipped && meta.duplicatesSkipped > 0 && (
                      <p className="text-muted-foreground">
                        {meta.duplicatesSkipped} duplicates skipped
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Query for Import History

Add to `src/modules/channels/adapters/ingram/queries.ts`:

```typescript
import { channelFeeds, FEED_TYPE } from "@/db/schema/channel-feeds";
import { CHANNEL_TYPES } from "@/db/schema/channel-credentials";

/**
 * Get order import history for tenant
 * Story 16.3 - AC7: Import history tracking
 */
export async function getIngramImportHistory(limit = 50) {
  const { userId } = await auth();
  if (!userId) return [];

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) return [];

  return db.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
      eq(channelFeeds.feedType, FEED_TYPE.IMPORT)
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}
```

### Schema Update: Add IMPORT Feed Type

Update `src/db/schema/channel-feeds.ts` to add the import feed type:

```typescript
export const FEED_TYPE = {
  FULL: "full",
  DELTA: "delta",
  IMPORT: "import", // Add for order imports
} as const;
```

Then use `FEED_TYPE.IMPORT` instead of string literal in the Inngest job.

### Project Structure Notes

- Order parser: `src/modules/channels/adapters/ingram/order-parser.ts`
- Inngest job: `src/inngest/ingram-orders.ts`
- FTP extensions: `src/modules/channels/adapters/ingram/ftp-client.ts`
- UI component: `src/modules/channels/adapters/ingram/components/ingram-import-history.tsx`
- Update page: `src/app/(dashboard)/settings/integrations/ingram/page.tsx`

### Security Requirements

1. **Role check** - Only owner/admin can trigger manual imports
2. **Tenant isolation** - RLS on channel_feeds, sales use tenant_id from adminDb context
3. **Credential security** - Never log decrypted FTP credentials
4. **Temp file cleanup** - Always delete downloaded order files after processing
5. **Input validation** - Validate all parsed order data before creating sales

### Edge Cases to Handle

1. **Empty order files** - Skip with status "skipped"
2. **Malformed files** - Log errors, continue processing valid records
3. **Missing ISBNs** - Track in unmatchedIsbns array for review
4. **Duplicate orders** - Skip silently with counter
5. **FTP connection failures** - Retry via Inngest, mark failed if exhausted
6. **Missing tenant owner** - Fail import (can't create sales without created_by)
7. **Price = 0** - Allow (some orders may be complimentary/review copies)

### References

- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/architecture.md - ADR-011: Channel Adapter Pattern]
- [Source: docs/epics.md - Story 16.3: Ingest Ingram Order Data]
- [Source: src/inngest/ingram-feed.ts - Inngest job pattern]
- [Source: src/modules/channels/adapters/ingram/ftp-client.ts - FTP client]
- [Source: src/db/schema/sales.ts - Sales schema]
- [Source: docs/sprint-artifacts/16-2-schedule-automated-onix-feeds-to-ingram.md - Previous story patterns]

## Test Scenarios

### Unit Tests (`tests/unit/ingram-order-parser.test.ts`)
- Parse EDI X12 850 format correctly
- Parse delimited CSV format correctly
- Parse delimited TSV format correctly
- Handle empty files gracefully
- Handle malformed EDI segments
- Normalize ISBN-10 to ISBN-13
- Handle quoted fields in CSV
- Detect column headers case-insensitively

### Unit Tests (`tests/unit/ingram-orders-job.test.ts`)
- Create sales transactions from valid orders
- Skip duplicate orders
- Track unmatched ISBNs
- Handle FTP connection errors
- Handle empty file list (skip)
- Match ISBNs across physical/ebook/audiobook formats

### Integration Tests (mocked FTP)
- Full order ingestion flow
- Multiple files in single run
- Partial file failure doesn't stop batch
- Import history recorded correctly
- Sales channel set to 'distributor'

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations > Ingram
- [ ] See Order Imports section
- [ ] Click "Import Now" button
- [ ] See progress/pending status
- [ ] See success with order count
- [ ] See unmatched ISBNs if any
- [ ] Verify sales created in Sales module
- [ ] Verify sales have channel='distributor'
- [ ] Verify sales have correct quantities and prices

## Dev Agent Record

### Context Reference

This story implements the inbound data flow from Ingram, completing the bi-directional integration:
- Outbound: Stories 16.1, 16.2 (ONIX feeds to Ingram)
- Inbound: Story 16.3 (order data from Ingram)

The `channel_feeds` table with feedType='import' tracks order ingestion separately from ONIX feed exports.

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- Use EDI X12 850 parser for Ingram's standard purchase order format
- Fallback to delimited parser for flat file exports
- Match ISBNs against all formats (physical, ebook, audiobook)
- Use tenant owner as created_by_user_id for imported sales
- Track unmatched ISBNs in metadata for manual review
- Duplicate detection based on order ID + ISBN + date

### File List

New files:
- `src/modules/channels/adapters/ingram/order-parser.ts` - EDI X12 850 and CSV/TSV parser with ISBN normalization
- `src/inngest/ingram-orders.ts` - Inngest background job for order ingestion
- `src/modules/channels/adapters/ingram/components/ingram-import-history.tsx` - Import history UI with unmatched ISBN display
- `tests/unit/ingram-order-parser.test.ts` - 31 parser unit tests
- `tests/unit/ingram-orders-job.test.ts` - 29 job logic unit tests

Modified files:
- `src/db/schema/channel-feeds.ts` - Add IMPORT to FEED_TYPE constant
- `src/modules/channels/adapters/ingram/ftp-client.ts` - Add listIngramOrderFiles, downloadIngramOrderFile
- `src/inngest/client.ts` - Add channel/ingram.orders event type
- `src/inngest/functions.ts` - Register ingramOrders function
- `src/inngest/ingram-feed-scheduler.ts` - Add hourly order import trigger for all active connections
- `src/modules/channels/adapters/ingram/actions.ts` - Add triggerIngramOrderImport server action
- `src/modules/channels/adapters/ingram/queries.ts` - Add getIngramImportHistory query
- `src/app/(dashboard)/settings/integrations/ingram/page.tsx` - Add IngramImportHistory component

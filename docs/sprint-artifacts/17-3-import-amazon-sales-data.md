# Story 17.3: Import Amazon Sales Data

Status: done

## Story

**As a** publisher,
**I want** to import sales from Amazon,
**So that** royalties include Amazon sales without manual data entry.

## Context

This story builds on Story 17.1 (Amazon Account Connection) and Story 17.2 (Automated ONIX Feeds) to complete the two-way data flow with Amazon. Publishers send catalog metadata to Amazon via ONIX feeds; now they receive sales data back via the Amazon SP-API Reports API.

### Dependencies
- Story 17.1 (Configure Amazon Account Connection) - Complete
- Story 17.2 (Schedule Automated ONIX Feeds) - In Review
- Epic 3 (Sales & Returns Processing) - Complete (provides sales schema)
- Story 16.3 (Ingest Ingram Order Data) - Complete (provides import pattern)

### Business Value
- Amazon represents ~50% of US book sales - critical for accurate royalty calculations
- Eliminates manual export/import of Amazon sales reports
- Ensures sales data is captured in near real-time
- Provides accurate royalty calculation basis across all channels
- Reduces data entry errors and lag time

### Amazon Reports API Overview

Amazon SP-API Reports API provides access to sales reports:
- Reference: https://developer-docs.amazon.com/sp-api/docs/reports-api-v2021-06-30-reference
- Report types: `GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL` (all orders)
- Alternative: `GET_XML_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL` (XML format)

**Reports API Flow:**
1. POST `/reports/2021-06-30/reports` - Create report request
2. Poll GET `/reports/2021-06-30/reports/{reportId}` - Check processing status
3. GET `/reports/2021-06-30/documents/{reportDocumentId}` - Get download URL
4. Download and parse report content

### Key Differences from Ingram (Story 16.3)

| Aspect | Ingram | Amazon |
|--------|--------|--------|
| Transport | FTPS file download | HTTP API (SP-API Reports) |
| Report Format | EDI X12 850 / CSV | CSV (flat file) |
| Authentication | Username/Password | AWS Signature V4 |
| Data Delivery | Files appear on FTP | Request → Poll → Download |
| Order ID | Ingram PO number | Amazon Order ID |
| Price Source | In order file | In sales report |

## Acceptance Criteria

### AC1: Request Amazon Sales Reports
- **Given** I have Amazon configured and connected
- **When** the sales import job runs
- **Then** system requests a sales report via SP-API Reports endpoint
- **And** report type is `GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL`
- **And** date range is from last successful import to current date
- **And** marketplace ID matches configured marketplace

### AC2: Poll for Report Completion
- **Given** a sales report is requested
- **When** Amazon processes the report
- **Then** system polls for completion status (every 30 seconds, max 10 minutes)
- **And** handles DONE, CANCELLED, and FATAL statuses appropriately
- **And** retrieves report document ID when processing completes

### AC3: Download and Parse Sales Report
- **Given** report processing is complete
- **When** system downloads the report
- **Then** CSV content is downloaded from pre-signed S3 URL
- **And** each row is parsed to extract: Order ID, ASIN, ISBN, quantity, price, order date
- **And** parsing errors are logged with line number
- **And** partial failures don't stop processing of valid records

### AC4: Create Sales Transactions
- **Given** valid sales records are parsed
- **When** system processes each sale
- **Then** a sales transaction is created in the `sales` table
- **And** transaction includes: tenant_id, title_id, format, quantity, unit_price, total_amount, sale_date, channel='amazon'
- **And** `created_by_user_id` is set to the tenant owner
- **And** transaction timestamp reflects the Amazon order date

### AC5: Match Sales to Titles by ISBN
- **Given** a sale contains an ISBN (extracted from SKU field)
- **When** system looks up the title
- **Then** system finds the matching title by ISBN-13 in the tenant's catalog
- **And** ISBN matching is case-insensitive and handles hyphens/formatting
- **And** matched sales proceed to transaction creation
- **And** Note: ASIN-based matching requires Story 17.4 completion first

### AC6: Flag Unmatched ISBNs for Review
- **Given** a sale has an ISBN that doesn't match any title
- **When** system processes the sale
- **Then** sale is logged as "unmatched" with ISBN, ASIN, and sale details
- **And** unmatched sales are visible in import history metadata
- **And** system continues processing remaining sales (don't fail batch)
- **And** unmatched count is tracked in the import record

### AC7: Detect and Skip Duplicate Sales
- **Given** a sale has already been imported
- **When** system checks for duplicates
- **Then** system skips the duplicate sale
- **And** duplicate is logged but not counted as error
- **And** deduplication is based on: tenant_id + title_id + sale_date + quantity + channel='amazon'

### AC8: Scheduled Import Job
- **Given** Amazon is configured for a tenant
- **When** the hourly scheduler runs
- **Then** system triggers sales import for tenants with active Amazon connections
- **And** import runs with 3 retries on failure
- **And** import history is recorded in `channel_feeds` table with feedType='import'

### AC9: Manual Import Trigger
- **Given** I have Amazon configured
- **When** I click "Import Sales Now" button
- **Then** system triggers sales import immediately
- **And** I see progress indicator during import
- **And** I receive success/failure notification on completion

## Tasks

- [ ] Task 0 (AC: 4): Add 'amazon' to sales channel enum (PREREQUISITE)
  - [ ] Update `salesChannelValues` in `src/db/schema/sales.ts` to include `"amazon"`
  - [ ] Create database migration to add 'amazon' to channel CHECK constraint
  - [ ] Run migration before proceeding with other tasks

- [ ] Task 1 (AC: 1, 2): Create Amazon Reports API client
  - [ ] Implement createReport for requesting sales reports
  - [ ] Implement getReportStatus for polling
  - [ ] Implement getReportDocument for download URL
  - [ ] Use AWS Signature V4 from api-client.ts

- [ ] Task 2 (AC: 3): Create Amazon sales report parser
  - [ ] Parse CSV format with header detection
  - [ ] Extract Order ID, ASIN, ISBN, quantity, price, date
  - [ ] Handle missing/malformed fields gracefully
  - [ ] Normalize ISBNs (reuse normalizeIsbn from Ingram)

- [ ] Task 3 (AC: 4, 5, 6, 7): Create Inngest job for sales import
  - [ ] Create import record with 'pending' status
  - [ ] Request report and poll for completion
  - [ ] Download and parse report content
  - [ ] Match ISBNs to titles (batch query to avoid N+1)
  - [ ] Create sales transactions with duplicate detection
  - [ ] Track unmatched ISBNs and errors

- [ ] Task 4 (AC: 8): Create/update Amazon sales scheduler
  - [ ] Add sales import trigger to amazon-feed-scheduler.ts
  - [ ] Run import for active Amazon connections hourly
  - [ ] Respect schedule configuration (if specific time preferred)

- [ ] Task 5 (AC: 9): Implement manual import trigger with UI
  - [ ] Add triggerAmazonSalesImport server action
  - [ ] Add "Import Sales Now" button to Amazon settings page
  - [ ] Show progress indicator during import

- [ ] Task 6 (AC: 1-9): Build import history UI component
  - [ ] Create AmazonSalesHistory component (follow IngramImportHistory pattern)
  - [ ] Show import status, counts, unmatched ISBNs
  - [ ] Add to Amazon settings page

- [ ] Task 7 (AC: 1-9): Write comprehensive tests
  - [ ] Unit tests for Reports API client
  - [ ] Unit tests for CSV parser
  - [ ] Unit tests for Inngest job logic
  - [ ] Integration tests (mocked API)

## Dev Notes

### PREREQUISITE: Schema Migration Required

**BEFORE implementing any other tasks**, you must add 'amazon' to the sales channel enum:

```typescript
// src/db/schema/sales.ts - Update salesChannelValues:
export const salesChannelValues = [
  "retail",
  "wholesale",
  "direct",
  "distributor",
  "amazon",  // ADD THIS
] as const;
```

Then create a migration to add the value to the database CHECK constraint.

### CRITICAL: Reuse Existing Patterns

**DO NOT** create new patterns. This project has established conventions:

1. **Channel Feeds Table**: Reuse `channel_feeds` with `channel: 'amazon'`, `feedType: 'import'`
2. **Inngest Jobs**: Follow `src/inngest/ingram-orders.ts` pattern exactly
3. **AWS Signature V4**: Reuse `signRequest()` from `src/modules/channels/adapters/amazon/api-client.ts`
4. **Sales Creation**: Follow pattern from `src/inngest/ingram-orders.ts`
5. **ISBN Normalization**: Reuse `normalizeIsbn()` from Ingram order-parser
6. **UI Components**: Follow `src/modules/channels/adapters/ingram/components/ingram-import-history.tsx` pattern
7. **CSV Parsing Helpers**: Import `findColumn`, `parseDelimitedLine` from Ingram order-parser if possible

### ALREADY EXISTS - Do Not Recreate

The following already exist in the codebase from Stories 17.1 and 17.2:

1. **`CHANNEL_TYPES.AMAZON`** - Defined in `src/db/schema/channel-credentials.ts`
2. **Amazon adapter structure** - `src/modules/channels/adapters/amazon/`
3. **AWS Signature V4 signing** - `signRequest()` exported from `api-client.ts`
4. **`getEndpointForRegion()`** - Exported from `api-client.ts`
5. **AmazonStoredCredentials type** - Defined in `schema.ts`
6. **Amazon Inngest events** - `channel/amazon.feed` in `src/inngest/client.ts`
7. **Amazon feed scheduler** - `src/inngest/amazon-feed-scheduler.ts`

### Amazon SP-API Reports Endpoint

Reference: https://developer-docs.amazon.com/sp-api/docs/reports-api-v2021-06-30-reference

**Step 1: Create Report**
```typescript
POST /reports/2021-06-30/reports
Content-Type: application/json

{
  "reportType": "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
  "marketplaceIds": ["ATVPDKIKX0DER"],  // From stored credentials
  "dataStartTime": "2024-01-01T00:00:00Z",
  "dataEndTime": "2024-01-31T23:59:59Z"
}

Response:
{
  "reportId": "ID323"
}
```

**Step 2: Poll for Status**
```typescript
GET /reports/2021-06-30/reports/{reportId}

Response:
{
  "reportId": "ID323",
  "reportType": "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
  "processingStatus": "DONE" | "IN_PROGRESS" | "IN_QUEUE" | "CANCELLED" | "FATAL",
  "reportDocumentId": "amzn1.tortuga.4.na.xxxxxxxx"  // Only when DONE
}
```

**Step 3: Get Report Document**
```typescript
GET /reports/2021-06-30/documents/{reportDocumentId}

Response:
{
  "reportDocumentId": "amzn1.tortuga.4.na.xxxxxxxx",
  "url": "https://tortuga-prod-na.s3.amazonaws.com/...",  // Pre-signed download URL
  "compressionAlgorithm": "GZIP"  // May need decompression
}
```

**Step 4: Download Report**
```typescript
GET {url from step 3}
// Returns CSV content (may be gzipped)
```

### Amazon Reports API Client

Create `src/modules/channels/adapters/amazon/reports-api-client.ts`:

```typescript
/**
 * Amazon SP-API Reports Client
 *
 * Story 17.3 - Import Amazon Sales Data
 *
 * Uses AWS Signature V4 for authentication (from api-client.ts)
 */

import { signRequest, getEndpointForRegion } from "./api-client";
import type { AmazonStoredCredentials } from "./schema";
import { gunzipSync } from "node:zlib";

export interface CreateReportResult {
  reportId: string;
}

export interface ReportStatus {
  reportId: string;
  reportType: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL";
  reportDocumentId?: string;
  processingStartTime?: string;
  processingEndTime?: string;
}

export interface ReportDocument {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: "GZIP";
}

/**
 * Request a sales report for the specified date range
 */
export async function createReport(
  credentials: AmazonStoredCredentials,
  startDate: Date,
  endDate: Date
): Promise<CreateReportResult> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = "/reports/2021-06-30/reports";
  const url = new URL(`${endpoint}${path}`);

  const body = JSON.stringify({
    reportType: "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
    marketplaceIds: [credentials.marketplaceId],
    dataStartTime: startDate.toISOString(),
    dataEndTime: endDate.toISOString(),
  });

  // Sign and send request using existing pattern
  // ... implementation following feeds-api-client.ts pattern
}

/**
 * Get report processing status
 */
export async function getReportStatus(
  credentials: AmazonStoredCredentials,
  reportId: string
): Promise<ReportStatus> {
  // GET /reports/2021-06-30/reports/{reportId}
}

/**
 * Get report document download URL
 */
export async function getReportDocument(
  credentials: AmazonStoredCredentials,
  reportDocumentId: string
): Promise<ReportDocument> {
  // GET /reports/2021-06-30/documents/{reportDocumentId}
}

/**
 * Download report content from pre-signed URL
 * Handles GZIP decompression if needed
 */
export async function downloadReportContent(
  document: ReportDocument
): Promise<string> {
  const response = await fetch(document.url);
  const buffer = await response.arrayBuffer();

  if (document.compressionAlgorithm === "GZIP") {
    return gunzipSync(Buffer.from(buffer)).toString("utf-8");
  }

  return Buffer.from(buffer).toString("utf-8");
}

/**
 * Poll for report completion with timeout
 */
export async function pollReportCompletion(
  credentials: AmazonStoredCredentials,
  reportId: string,
  maxWaitMs: number = 600000, // 10 minutes
  pollIntervalMs: number = 30000 // 30 seconds
): Promise<ReportStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getReportStatus(credentials, reportId);

    if (status.processingStatus === "DONE" ||
        status.processingStatus === "CANCELLED" ||
        status.processingStatus === "FATAL") {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Report processing timed out");
}
```

### Amazon Sales Report Parser

Create `src/modules/channels/adapters/amazon/sales-parser.ts`:

```typescript
/**
 * Amazon Sales Report Parser
 *
 * Story 17.3 - Import Amazon Sales Data
 *
 * Parses Amazon flat file sales reports (CSV format)
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
  orderId: string;          // amazon-order-id
  purchaseDate: Date;       // purchase-date
  asin: string;             // asin
  isbn: string;             // Extracted from sku or asin lookup
  quantity: number;         // quantity-purchased
  itemPrice: number;        // item-price (total for line item)
  unitPrice: number;        // Calculated: itemPrice / quantity
  sku: string;              // sku (may contain ISBN)
  productName: string;      // product-name
  lineNumber: number;       // For error tracking
  rawLine?: string;         // Original line for debugging
}

export interface ParseResult {
  success: boolean;
  sales: AmazonSaleRecord[];
  errors: { line: number; message: string; raw?: string }[];
}

/**
 * Parse Amazon sales report CSV content
 */
export function parseAmazonSalesReport(content: string): ParseResult {
  const sales: AmazonSaleRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return { success: false, sales: [], errors: [{ line: 0, message: 'No data rows' }] };
  }

  // Detect delimiter (tab-separated for Amazon flat files)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  // Parse header
  const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const orderIdCol = findColumn(headers, ['amazon-order-id', 'order-id', 'orderid']);
  const dateCol = findColumn(headers, ['purchase-date', 'purchasedate', 'order-date']);
  const asinCol = findColumn(headers, ['asin']);
  const skuCol = findColumn(headers, ['sku', 'seller-sku']);
  const qtyCol = findColumn(headers, ['quantity-purchased', 'quantity', 'qty']);
  const priceCol = findColumn(headers, ['item-price', 'itemprice', 'price']);
  const nameCol = findColumn(headers, ['product-name', 'productname', 'title']);

  if (orderIdCol === -1 || dateCol === -1) {
    return {
      success: false,
      sales: [],
      errors: [{ line: 1, message: 'Required columns (order-id, date) not found' }]
    };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseDelimitedLine(line, delimiter);

    try {
      const orderId = values[orderIdCol] || '';
      const purchaseDate = parseFlexibleDate(values[dateCol] || '');
      const asin = values[asinCol] || '';
      const sku = values[skuCol] || '';
      const quantity = parseInt(values[qtyCol] || '1', 10);
      const itemPrice = parseFloat(values[priceCol] || '0');
      const productName = values[nameCol] || '';

      // Try to extract ISBN from SKU (common practice: publishers use ISBN as SKU)
      let isbn = '';
      if (sku && /^\d{10,13}$/.test(sku.replace(/-/g, ''))) {
        isbn = normalizeIsbn(sku);
      }

      if (orderId && !isNaN(quantity) && quantity > 0) {
        sales.push({
          orderId,
          purchaseDate,
          asin,
          isbn,
          quantity,
          itemPrice: isNaN(itemPrice) ? 0 : itemPrice,
          unitPrice: isNaN(itemPrice) || quantity === 0 ? 0 : itemPrice / quantity,
          sku,
          productName,
          lineNumber: i,
          rawLine: line,
        });
      } else {
        errors.push({ line: i + 1, message: 'Invalid row: missing order ID or quantity', raw: line });
      }
    } catch (err) {
      errors.push({ line: i + 1, message: err instanceof Error ? err.message : 'Parse error', raw: line });
    }
  }

  return {
    success: sales.length > 0,
    sales,
    errors,
  };
}

// Helper functions (reuse from Ingram parser or define here)
function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
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

function parseFlexibleDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Amazon uses ISO format: 2024-01-15T10:30:00+00:00
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return new Date();
}
```

### Inngest Event Definition

Add to `src/inngest/client.ts`:

```typescript
export interface InngestEvents {
  // ... existing events

  /**
   * Amazon sales import event
   * Story 17.3: Import Amazon Sales Data
   */
  "channel/amazon.sales-import": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
      // Optional date range override (defaults to last import to now)
      startDate?: string; // ISO date
      endDate?: string;   // ISO date
    };
  };
}
```

### Inngest Job: Amazon Sales Import

Create `src/inngest/amazon-sales-import.ts`:

```typescript
/**
 * Inngest: Amazon Sales Import Background Job
 *
 * Story 17.3 - Import Amazon Sales Data
 *
 * Processing Steps:
 * 1. Create import record with 'pending' status
 * 2. Get Amazon credentials from channel_credentials
 * 3. Request sales report via SP-API Reports
 * 4. Poll for report completion
 * 5. Download and parse report content
 * 6. Match ISBNs/ASINs to titles
 * 7. Create sales transactions with duplicate detection
 * 8. Update import record with results
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 */

import { inngest } from "./client";
import { adminDb } from "@/db";
import { channelFeeds, FEED_STATUS, FEED_TYPE } from "@/db/schema/channel-feeds";
import { channelCredentials, CHANNEL_TYPES, CHANNEL_STATUS } from "@/db/schema/channel-credentials";
import { sales } from "@/db/schema/sales";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { eq, and } from "drizzle-orm";
import { decryptCredentials } from "@/lib/channel-encryption";
import {
  createReport,
  getReportDocument,
  downloadReportContent,
} from "@/modules/channels/adapters/amazon/reports-api-client";
import {
  parseAmazonSalesReport,
  type AmazonSaleRecord,
} from "@/modules/channels/adapters/amazon/sales-parser";
import { normalizeIsbn } from "@/modules/channels/adapters/ingram/order-parser";
import Decimal from "decimal.js";

interface AmazonSalesImportEventData {
  tenantId: string;
  triggeredBy: "schedule" | "manual";
  userId?: string;
  startDate?: string;
  endDate?: string;
}

interface ImportMetadata {
  reportId?: string;
  rowsProcessed: number;
  salesCreated: number;
  unmatchedRecords: { isbn: string; asin: string; orderId: string; quantity: number }[];
  duplicatesSkipped: number;
  parseErrors: { line: number; message: string }[];
}

export const amazonSalesImport = inngest.createFunction(
  {
    id: "amazon-sales-import",
    retries: 3,
  },
  { event: "channel/amazon.sales-import" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy, startDate, endDate } = event.data as AmazonSalesImportEventData;

    // Step 1: Create import record
    const importId = await step.run("create-import-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.AMAZON,
          status: FEED_STATUS.PENDING,
          feedType: FEED_TYPE.IMPORT,
          triggeredBy,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    const metadata: ImportMetadata = {
      rowsProcessed: 0,
      salesCreated: 0,
      unmatchedRecords: [],
      duplicatesSkipped: 0,
      parseErrors: [],
    };

    try {
      // Step 2: Get credentials
      const credentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON)
          ),
        });

        if (!cred) throw new Error("Amazon credentials not configured");
        if (cred.status !== CHANNEL_STATUS.ACTIVE)
          throw new Error("Amazon connection is not active");

        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Step 3: Get last successful import time
      const lastImport = await step.run("get-last-import", async () => {
        const last = await adminDb.query.channelFeeds.findFirst({
          where: and(
            eq(channelFeeds.tenantId, tenantId),
            eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
            eq(channelFeeds.feedType, FEED_TYPE.IMPORT),
            eq(channelFeeds.status, FEED_STATUS.SUCCESS)
          ),
          orderBy: (feeds, { desc }) => [desc(feeds.completedAt)],
        });
        return last?.completedAt || null;
      });

      // Step 4: Calculate date range
      const reportStartDate = startDate
        ? new Date(startDate)
        : (lastImport ? new Date(lastImport) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Default: 30 days
      const reportEndDate = endDate ? new Date(endDate) : new Date();

      // Step 5: Request sales report
      const reportId = await step.run("request-report", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, importId));

        const result = await createReport(credentials, reportStartDate, reportEndDate);
        return result.reportId;
      });

      metadata.reportId = reportId;

      // Step 6: Poll for report completion using step.sleep for better Inngest handling
      const reportStatus = await step.run("poll-initial-status", async () => {
        const { getReportStatus } = await import("@/modules/channels/adapters/amazon/reports-api-client");
        return getReportStatus(credentials, reportId);
      });

      let finalStatus = reportStatus;
      let pollAttempts = 0;
      const maxAttempts = 20; // 10 minutes at 30 second intervals

      while (finalStatus.processingStatus === "IN_PROGRESS" || finalStatus.processingStatus === "IN_QUEUE") {
        if (pollAttempts >= maxAttempts) {
          throw new Error("Report processing timed out after 10 minutes");
        }
        await step.sleep(`poll-wait-${pollAttempts}`, "30 seconds");
        finalStatus = await step.run(`poll-status-${pollAttempts}`, async () => {
          const { getReportStatus } = await import("@/modules/channels/adapters/amazon/reports-api-client");
          return getReportStatus(credentials, reportId);
        });
        pollAttempts++;
      }

      if (finalStatus.processingStatus === "CANCELLED" || finalStatus.processingStatus === "FATAL") {
        throw new Error(`Report processing failed: ${finalStatus.processingStatus}`);
      }

      if (!finalStatus.reportDocumentId) {
        throw new Error("Report completed but no document ID returned");
      }

      // Step 7: Download report content
      const reportContent = await step.run("download-report", async () => {
        const document = await getReportDocument(credentials, finalStatus.reportDocumentId!);
        return downloadReportContent(document);
      });

      // Step 8: Parse report
      const parseResult = await step.run("parse-report", async () => {
        return parseAmazonSalesReport(reportContent);
      });

      metadata.parseErrors = parseResult.errors;
      metadata.rowsProcessed = parseResult.sales.length;

      if (parseResult.sales.length === 0) {
        await step.run("mark-skipped", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SKIPPED,
              productCount: 0,
              completedAt: new Date(),
              metadata: { ...metadata, reason: "No sales in report" },
            })
            .where(eq(channelFeeds.id, importId));
        });

        return {
          success: true,
          skipped: true,
          reason: "No sales in report",
          importId,
        };
      }

      // Step 9: Get system user for sales creation
      const systemUserId = await step.run("get-system-user", async () => {
        const owner = await adminDb.query.users.findFirst({
          where: and(eq(users.tenant_id, tenantId), eq(users.role, "owner")),
        });
        if (!owner) throw new Error("Tenant owner not found");
        return owner.id;
      });

      // Step 10: Build ISBN map for matching
      // Note: ASIN matching requires Story 17.4 - only ISBN matching for now
      const isbnMapRaw = await step.run("build-isbn-map", async () => {
        const tenantTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
          columns: { id: true, isbn: true, eisbn: true },
        });

        const entries: [string, { id: string; format: "physical" | "ebook" }][] = [];
        for (const title of tenantTitles) {
          if (title.isbn) {
            entries.push([normalizeIsbn(title.isbn), { id: title.id, format: "physical" }]);
          }
          if (title.eisbn) {
            entries.push([normalizeIsbn(title.eisbn), { id: title.id, format: "ebook" }]);
          }
        }
        return entries;
      });

      const isbnMap = new Map(isbnMapRaw);

      // Step 11: Batch fetch existing sales for duplicate detection
      const existingSalesSet = await step.run("get-existing-sales", async () => {
        const existingSales = await adminDb.query.sales.findMany({
          where: and(
            eq(sales.tenant_id, tenantId),
            eq(sales.channel, "amazon")
          ),
          columns: {
            title_id: true,
            sale_date: true,
            quantity: true,
          },
        });

        return existingSales.map(sale => `${sale.title_id}|${sale.sale_date}|${sale.quantity}`);
      });

      const dupeSet = new Set(existingSalesSet);

      // Step 12: Process sales records
      // Note: ISBN matching only - ASIN matching requires Story 17.4
      const processResult = await step.run("process-sales", async () => {
        let salesCreated = 0;
        const unmatchedRecords: ImportMetadata["unmatchedRecords"] = [];
        let duplicatesSkipped = 0;

        for (const sale of parseResult.sales) {
          // Match by ISBN extracted from SKU field
          // ASIN-based matching will be added in Story 17.4
          const titleMatch = sale.isbn ? isbnMap.get(sale.isbn) : undefined;

          if (!titleMatch) {
            unmatchedRecords.push({
              isbn: sale.isbn || '',
              asin: sale.asin,
              orderId: sale.orderId,
              quantity: sale.quantity,
            });
            continue;
          }

          // Check for duplicate
          const saleDateStr = sale.purchaseDate.toISOString().split("T")[0];
          const dupeKey = `${titleMatch.id}|${saleDateStr}|${sale.quantity}`;

          if (dupeSet.has(dupeKey)) {
            duplicatesSkipped++;
            continue;
          }

          // Create sales transaction
          const totalAmount = new Decimal(sale.itemPrice).toFixed(2);
          const unitPrice = new Decimal(sale.unitPrice).toFixed(2);

          await adminDb.insert(sales).values({
            tenant_id: tenantId,
            title_id: titleMatch.id,
            format: titleMatch.format,
            quantity: sale.quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            sale_date: saleDateStr,
            channel: "amazon",
            created_by_user_id: systemUserId,
          });

          dupeSet.add(dupeKey);
          salesCreated++;
        }

        return { salesCreated, unmatchedRecords, duplicatesSkipped };
      });

      metadata.salesCreated = processResult.salesCreated;
      metadata.unmatchedRecords = processResult.unmatchedRecords;
      metadata.duplicatesSkipped = processResult.duplicatesSkipped;

      // Step 13: Update import record with success
      await step.run("mark-success", async () => {
        await adminDb
          .update(channelFeeds)
          .set({
            status: FEED_STATUS.SUCCESS,
            productCount: metadata.salesCreated,
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
```

### Update Amazon Feed Scheduler

Update `src/inngest/amazon-feed-scheduler.ts` to also trigger sales import:

```typescript
// After existing feed trigger logic, add:

// Also trigger sales import for active connections
await step.sendEvent(`trigger-sales-import-${connection.tenantId}`, {
  name: "channel/amazon.sales-import",
  data: {
    tenantId: connection.tenantId,
    triggeredBy: "schedule",
  },
});
```

### Server Actions

Add to `src/modules/channels/adapters/amazon/actions.ts`:

```typescript
/**
 * Trigger manual Amazon sales import
 * AC9: Manual Import Trigger
 */
export async function triggerAmazonSalesImport(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Role check - only owner/admin can trigger imports
    if (user.role !== "owner" && user.role !== "admin") {
      return { success: false, message: "Only owners and admins can trigger sales imports" };
    }

    // Check Amazon is configured
    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id!),
        eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON)
      ),
    });

    if (!credentials) {
      return { success: false, message: "Amazon is not configured" };
    }

    if (credentials.status !== CHANNEL_STATUS.ACTIVE) {
      return { success: false, message: "Amazon connection is not active" };
    }

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/amazon.sales-import",
      data: {
        tenantId: user.tenant_id!,
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Sales import started" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to trigger import",
    };
  }
}
```

### Queries

Add to `src/modules/channels/adapters/amazon/queries.ts`:

```typescript
/**
 * Get sales import history for tenant
 * Story 17.3 - AC8: Import history tracking
 */
export async function getAmazonSalesImportHistory(limit = 50) {
  const { userId } = await auth();
  if (!userId) return [];

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) return [];

  return db.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
      eq(channelFeeds.feedType, FEED_TYPE.IMPORT)
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}
```

### UI Component

Create `src/modules/channels/adapters/amazon/components/amazon-sales-history.tsx`:
- Follow `IngramImportHistory` pattern from Story 16.3
- Show import status, sales count, unmatched records
- Add "Import Sales Now" button

### Project Structure Notes

```
src/modules/channels/adapters/amazon/
├── actions.ts                    # Add: triggerAmazonSalesImport
├── api-client.ts                 # From Story 17.1
├── feeds-api-client.ts           # From Story 17.2
├── reports-api-client.ts         # NEW: Reports API operations
├── sales-parser.ts               # NEW: CSV sales report parser
├── queries.ts                    # Add: getAmazonSalesImportHistory
├── schema.ts                     # From Story 17.1
├── types.ts                      # Add: AmazonSaleRecord, ImportMetadata types
└── components/
    ├── amazon-settings-form.tsx  # From Story 17.1
    ├── amazon-feed-schedule.tsx  # From Story 17.2
    ├── amazon-feed-history.tsx   # From Story 17.2
    ├── amazon-sales-history.tsx  # NEW: Sales import history
    └── index.ts                  # Add export
```

### Security Requirements

1. **AWS Signature V4** - All SP-API requests must be signed
2. **Role check** - Only owner/admin can trigger manual imports
3. **Tenant isolation** - RLS on channel_feeds, sales use tenant_id from adminDb context
4. **Credential security** - Never log decrypted credentials
5. **Pre-signed URL security** - Download URLs are time-limited
6. **Rate limiting** - Prevent spam on manual import trigger

### Edge Cases to Handle

1. **Empty reports** - Skip with status "skipped"
2. **Report processing timeout** - Fail after 10 minutes of polling
3. **Missing ISBNs** - Track in unmatchedRecords for review
4. **Duplicate sales** - Skip silently with counter
5. **API rate limits** - Inngest retry handles with backoff
6. **Missing tenant owner** - Fail import (can't create sales without created_by)
7. **Price = 0** - Allow (some orders may be free promotions)
8. **GZIP compression** - Handle compressed report downloads

### ASIN-ISBN Linking Note

**IMPORTANT:** Story 17.3 supports ISBN-only matching. ASIN-based matching requires Story 17.4.

Amazon sales reports include ASIN but may not include ISBN. Publishers typically:
1. Use ISBN as their SKU, which appears in the report
2. Store ASIN mapping in title metadata (Story 17.4 - not yet implemented)
3. Require manual mapping via UI for unmatched ASINs (Story 17.4)

**For Story 17.3, we support:**
- ISBN extraction from SKU field only
- Tracking unmatched records (with ASIN) for manual resolution in Story 17.4

**NOT in scope for Story 17.3:**
- ASIN-based title matching (requires `titles.asin` column from Story 17.4)
- Amazon Product API for ASIN lookup (Story 17.4)

Unmatched records will include the ASIN for use when Story 17.4 is implemented.

### References

- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/architecture.md - ADR-011: Channel Adapter Pattern]
- [Source: docs/epics.md - Story 17.3: Import Amazon Sales Data]
- [Source: docs/sprint-artifacts/16-3-ingest-ingram-order-data.md - Import pattern reference]
- [Source: docs/sprint-artifacts/17-2-schedule-automated-onix-feeds-to-amazon.md - Amazon API patterns]
- [Source: src/inngest/ingram-orders.ts - Inngest import job pattern]
- [Source: src/modules/channels/adapters/amazon/api-client.ts - AWS Signature V4]
- [Source: src/modules/channels/adapters/amazon/feeds-api-client.ts - SP-API patterns]
- [Amazon SP-API Reports Reference](https://developer-docs.amazon.com/sp-api/docs/reports-api-v2021-06-30-reference)

## Test Scenarios

### Unit Tests (`tests/unit/amazon-reports-api-client.test.ts`)
- createReport returns report ID
- getReportStatus parses all status values
- getReportDocument returns download URL and compression info
- downloadReportContent handles plain text
- downloadReportContent handles GZIP decompression
- pollReportCompletion times out correctly
- AWS Signature V4 headers correct for Reports API

### Unit Tests (`tests/unit/amazon-sales-parser.test.ts`)
- Parse tab-separated flat file correctly
- Parse comma-separated CSV correctly
- Handle empty reports gracefully
- Extract ISBN from SKU field
- Handle quoted fields
- Detect column headers case-insensitively
- Calculate unit price from item price and quantity
- Parse ISO date format correctly

### Unit Tests (`tests/unit/amazon-sales-import-job.test.ts`)
- Create sales transactions from valid records
- Skip duplicate sales
- Track unmatched ISBNs/ASINs
- Handle report processing timeout
- Handle CANCELLED/FATAL report status
- Match titles by ISBN and ASIN

### Integration Tests (mocked API)
- Full sales import flow
- Report request and polling
- Duplicate detection across imports
- Sales channel set to 'amazon'
- Import history recorded correctly

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations > Amazon
- [ ] See Sales Imports section (when connected)
- [ ] Click "Import Sales Now" button
- [ ] See progress/pending status
- [ ] See success with sales count
- [ ] See unmatched records if any
- [ ] Verify sales created in Sales module
- [ ] Verify sales have channel='amazon'
- [ ] Verify sales have correct quantities and prices
- [ ] Verify scheduled import runs hourly

## Dev Agent Record

### Context Reference

This story implements the inbound data flow from Amazon, completing the bi-directional integration:
- Outbound: Stories 17.1, 17.2 (Account connection and ONIX feeds to Amazon)
- Inbound: Story 17.3 (sales data from Amazon via Reports API)

Key implementation notes from previous stories:
- AWS Signature V4 signing is exported from `api-client.ts`
- SP-API patterns established in `feeds-api-client.ts`
- Inngest job patterns from `amazon-feed.ts`
- Import tracking in `channel_feeds` table with feedType='import'

The `channel_feeds` table with feedType='import' and channel='amazon' tracks sales imports separately from ONIX feed exports.

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- **PREREQUISITE:** Add 'amazon' to salesChannelValues before implementation
- Use Amazon SP-API Reports API for sales data access
- Report type: GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL
- Handle GZIP-compressed report downloads
- Match by ISBN (from SKU field) only - ASIN matching requires Story 17.4
- Track unmatched records (with ASIN) for manual resolution in Story 17.4
- Use tenant owner as created_by_user_id for imported sales
- Duplicate detection based on tenant_id + title_id + sale_date + quantity + channel='amazon'
- Follow Ingram import patterns from Story 16.3

### File List

New files:
- `src/modules/channels/adapters/amazon/reports-api-client.ts` - SP-API Reports operations
- `src/modules/channels/adapters/amazon/sales-parser.ts` - CSV sales report parser
- `src/modules/channels/adapters/amazon/components/amazon-sales-history.tsx` - Sales import history UI
- `src/inngest/amazon-sales-import.ts` - Inngest background job for sales import
- `tests/unit/amazon-reports-api-client.test.ts` - Reports API tests
- `tests/unit/amazon-sales-parser.test.ts` - Parser tests
- `tests/unit/amazon-sales-import-job.test.ts` - Import job tests

Modified files:
- `src/db/schema/sales.ts` - **PREREQUISITE:** Add 'amazon' to salesChannelValues
- `src/inngest/client.ts` - Add channel/amazon.sales-import event type
- `src/inngest/functions.ts` - Register amazonSalesImport function
- `src/inngest/amazon-feed-scheduler.ts` - Add hourly sales import trigger
- `src/modules/channels/adapters/amazon/actions.ts` - Add triggerAmazonSalesImport
- `src/modules/channels/adapters/amazon/queries.ts` - Add getAmazonSalesImportHistory
- `src/modules/channels/adapters/amazon/components/index.ts` - Export AmazonSalesHistory
- `src/app/(dashboard)/settings/integrations/amazon/page.tsx` - Add AmazonSalesHistory component

Database migration:
- Add migration to update sales channel CHECK constraint to include 'amazon'

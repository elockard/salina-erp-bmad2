# Story 16.4: Sync Inventory Status with Ingram

Status: done

## Story

**As a** publisher,
**I want** inventory status synced with Ingram,
**So that** availability is accurate across channels.

## Context

This story completes the bidirectional Ingram integration by adding inventory synchronization. When a publisher updates a title's availability status (e.g., marking it out of print), Ingram must receive this update to prevent overselling or incorrect catalog listings.

### Dependencies
- Story 16.1 (Configure Ingram Account Connection) - Complete
- Story 16.2 (Schedule Automated ONIX Feeds) - Complete (provides feed infrastructure)
- Epic 14 (ONIX Core) - Complete (provides ONIX builder)

### Business Value
- Prevents overselling by keeping Ingram inventory accurate
- Reduces manual status updates across multiple channels
- Enables rapid response to supply chain changes
- Maintains data consistency between publisher catalog and distribution

### ONIX Codelist 65 (ProductAvailability) Mapping

The title `publication_status` field maps to ONIX Codelist 65 values:

| publication_status | Codelist 65 Code | Meaning |
|-------------------|------------------|---------|
| draft | 10 | Not yet available |
| pending | 10 | Not yet available |
| published | 20 | Available |
| out_of_print | 40 | Not available |

## Acceptance Criteria

### AC1: Dynamic ProductAvailability in ONIX Export
- **Given** a title has a publication_status
- **When** ONIX feed is generated
- **Then** ProductAvailability element reflects the title's status using Codelist 65
- **And** draft/pending titles map to code 10 (Not yet available)
- **And** published titles map to code 20 (Available)
- **And** out_of_print titles map to code 40 (Not available)

### AC2: Automatic Status Sync on Title Update
- **Given** I update a title's publication_status
- **When** the update is saved
- **Then** the title is flagged for next scheduled Ingram feed
- **And** delta feeds automatically include status-changed titles

### AC3: Manual Immediate Status Push
- **Given** I need to urgently update Ingram
- **When** I click "Sync Inventory Now" on the Ingram settings page
- **Then** system generates and uploads an inventory-only ONIX feed
- **And** only titles with status changes since last sync are included
- **And** I see progress indicator and success/failure notification

### AC4: Import Ingram Inventory Snapshot
- **Given** Ingram provides inventory data files
- **When** the inventory import job runs
- **Then** system downloads files from `/outbound/inventory/` directory
- **And** system parses inventory status for each ISBN
- **And** mismatched statuses are flagged for review (not auto-updated)
- **And** import history is visible in the UI

### AC5: Inventory Sync History
- **Given** inventory syncs have occurred
- **When** I view the Ingram integration page
- **Then** I see inventory sync history separate from regular feeds
- **And** each entry shows: timestamp, direction (push/pull), status count, errors

### AC6: Status Mismatch Alerts
- **Given** Ingram inventory import finds mismatches
- **When** import completes
- **Then** mismatched ISBNs are listed in the import record metadata
- **And** admin can review and decide whether to update local or push to Ingram

## Tasks

- [x] Task 1 (AC: 1): Update ONIXMessageBuilder to use dynamic ProductAvailability based on title status
- [x] Task 2 (AC: 1): Create Codelist 65 mapping utility function
- [x] Task 3 (AC: 2): Ensure title updates trigger delta feed inclusion (already covered by updated_at)
- [x] Task 4 (AC: 3): Add "inventory_sync" feed type to channel_feeds schema
- [x] Task 5 (AC: 3): Create triggerIngramInventorySync server action
- [x] Task 6 (AC: 3): Build inventory sync UI component with manual trigger button
- [x] Task 7 (AC: 4): Extend FTP client with listIngramInventoryFiles, downloadIngramInventoryFile
- [x] Task 8 (AC: 4): Create Ingram inventory file parser
- [x] Task 9 (AC: 4): Create Inngest job for inventory import
- [x] Task 10 (AC: 5, 6): Build inventory sync history UI with mismatch display
- [x] Task 11 (AC: 1-6): Write comprehensive tests

## Dev Notes

### CRITICAL: Reuse Existing Patterns

**DO NOT** create new patterns. This project has established conventions:

1. **Inngest Jobs**: See `src/inngest/ingram-feed.ts` for the exact job pattern
2. **FTP Client**: Extend `src/modules/channels/adapters/ingram/ftp-client.ts`
3. **adminDb**: Use `adminDb` for background jobs (no RLS session context)
4. **Channel Feeds**: Track sync in `channel_feeds` table with feedType='inventory_sync' or 'inventory_import'
5. **Server Actions**: Follow pattern from `src/modules/channels/adapters/ingram/actions.ts`

### Task 1: Update ONIXMessageBuilder for Dynamic ProductAvailability

Update `src/modules/onix/builder/message-builder.ts` to accept and use title status:

```typescript
/**
 * Map publication status to ONIX Codelist 65 ProductAvailability codes
 *
 * Story 16.4 - AC1: Dynamic ProductAvailability in ONIX Export
 *
 * Codelist 65 Reference:
 * - 10: Not yet available
 * - 20: Available
 * - 40: Not available (e.g., out of print)
 */
export function getProductAvailabilityCode(publicationStatus: string | null): string {
  switch (publicationStatus) {
    case "draft":
    case "pending":
      return "10"; // Not yet available
    case "published":
      return "20"; // Available
    case "out_of_print":
      return "40"; // Not available
    default:
      return "20"; // Default to available for unknown status
  }
}
```

Update `buildProductSupply()` method in `ONIXMessageBuilder`:

```typescript
/**
 * Build ProductSupply (Block 6)
 *
 * Story 16.4: Now uses dynamic ProductAvailability based on title status
 */
private buildProductSupply(title: TitleWithAuthors): string {
  const currency = this.tenant.default_currency || "USD";
  const availabilityCode = getProductAvailabilityCode(title.publication_status);

  return `    <ProductSupply>
      <Market>
        <Territory>
          <CountriesIncluded>US</CountriesIncluded>
        </Territory>
      </Market>
      <SupplyDetail>
        <Supplier>
          <SupplierRole>01</SupplierRole>
          <SupplierName>${escapeXML(this.tenant.name)}</SupplierName>
        </Supplier>
        <ProductAvailability>${availabilityCode}</ProductAvailability>
        <Price>
          <PriceType>01</PriceType>
          <PriceAmount>0.00</PriceAmount>
          <CurrencyCode>${currency}</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>`;
}
```

Update `buildProduct()` to pass the title to `buildProductSupply()`:

```typescript
private buildProduct(title: TitleWithAuthors): string {
  // ... existing code ...
  const productSupply = this.buildProductSupply(title); // Pass title instead of no args
  // ... existing code ...
}
```

### Task 4: Add Feed Types to Schema

Update `src/db/schema/channel-feeds.ts`:

```typescript
// Feed type constants
export const FEED_TYPE = {
  FULL: "full",
  DELTA: "delta",
  IMPORT: "import",
  INVENTORY_SYNC: "inventory_sync",     // Story 16.4: Outbound inventory status push
  INVENTORY_IMPORT: "inventory_import", // Story 16.4: Inbound inventory snapshot
} as const;
```

### Task 5: Server Action for Manual Inventory Sync

Add to `src/modules/channels/adapters/ingram/actions.ts`:

```typescript
/**
 * Trigger manual Ingram inventory sync
 *
 * Story 16.4 - AC3: Manual Immediate Status Push
 * Generates and uploads an inventory-focused ONIX feed with all titles
 */
export async function triggerIngramInventorySync(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check Ingram is configured
    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
      ),
    });

    if (!credentials) {
      return { success: false, message: "Ingram is not configured" };
    }

    // Trigger Inngest job with inventory_sync type
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.inventory-sync",
      data: {
        tenantId: user.tenant_id,
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Inventory sync started" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to trigger sync",
    };
  }
}

/**
 * Trigger manual Ingram inventory import
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 */
export async function triggerIngramInventoryImport(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
      ),
    });

    if (!credentials) {
      return { success: false, message: "Ingram is not configured" };
    }

    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.inventory-import",
      data: {
        tenantId: user.tenant_id,
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Inventory import started" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to trigger import",
    };
  }
}
```

### Task 7: FTP Client Extension

Add to `src/modules/channels/adapters/ingram/ftp-client.ts`:

```typescript
/**
 * List files in Ingram's outbound inventory directory
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 */
export async function listIngramInventoryFiles(
  credentials: IngramCredentials,
  since?: Date
): Promise<{ name: string; modifiedAt: Date; size: number }[]> {
  const client = new Client(30000);

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    const files = await client.list("/outbound/inventory/");

    return files
      .filter(f => f.type === 1) // Regular files only
      .filter(f => !since || (f.modifiedAt && f.modifiedAt > since))
      .map(f => ({
        name: f.name,
        modifiedAt: f.modifiedAt || new Date(),
        size: f.size,
      }));
  } finally {
    client.close();
  }
}

/**
 * Download a file from Ingram's outbound inventory directory
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 */
export async function downloadIngramInventoryFile(
  credentials: IngramCredentials,
  fileName: string,
  localPath: string
): Promise<ConnectionTestResult> {
  const client = new Client(60000);

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    await client.downloadTo(localPath, `/outbound/inventory/${fileName}`);

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

### Task 8: Inventory File Parser

Create `src/modules/channels/adapters/ingram/inventory-parser.ts`:

```typescript
/**
 * Ingram Inventory File Parser
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 *
 * Parses Ingram inventory status files (CSV/TSV format) to compare
 * with local catalog and identify mismatches.
 */

export interface IngramInventoryRecord {
  isbn: string;
  availabilityCode: string; // Codelist 65 code from Ingram
  quantityOnHand?: number;
  lastUpdated?: Date;
  rawLine?: string;
}

export interface InventoryParseResult {
  success: boolean;
  records: IngramInventoryRecord[];
  errors: { line: number; message: string; raw?: string }[];
  format: 'csv' | 'tsv' | 'unknown';
}

/**
 * Parse Ingram inventory file content
 */
export function parseIngramInventoryFile(content: string, fileName: string): InventoryParseResult {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return { success: false, records: [], errors: [{ line: 0, message: 'No data rows' }], format: 'unknown' };
  }

  // Detect delimiter
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const format = delimiter === '\t' ? 'tsv' : 'csv';

  // Parse header
  const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const isbnCol = findColumn(headers, ['isbn', 'isbn13', 'ean', 'product_id']);
  const statusCol = findColumn(headers, ['availability', 'status', 'availability_code', 'product_availability']);
  const qtyCol = findColumn(headers, ['quantity', 'qty', 'on_hand', 'quantity_on_hand']);
  const dateCol = findColumn(headers, ['last_updated', 'updated', 'date']);

  if (isbnCol === -1) {
    return { success: false, records: [], errors: [{ line: 1, message: 'ISBN column not found' }], format };
  }

  const records: IngramInventoryRecord[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseDelimitedLine(line, delimiter);

    try {
      const isbn = normalizeIsbn(values[isbnCol] || '');
      const availabilityCode = statusCol !== -1 ? values[statusCol]?.trim() || '20' : '20';
      const quantityOnHand = qtyCol !== -1 ? parseInt(values[qtyCol], 10) : undefined;
      const lastUpdated = dateCol !== -1 && values[dateCol] ? new Date(values[dateCol]) : undefined;

      if (isbn) {
        records.push({
          isbn,
          availabilityCode,
          quantityOnHand: isNaN(quantityOnHand || 0) ? undefined : quantityOnHand,
          lastUpdated,
          rawLine: line,
        });
      } else {
        errors.push({ line: i + 1, message: 'Missing ISBN', raw: line });
      }
    } catch (err) {
      errors.push({ line: i + 1, message: err instanceof Error ? err.message : 'Parse error', raw: line });
    }
  }

  return {
    success: records.length > 0,
    records,
    errors,
    format,
  };
}

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

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9X]/gi, '').toUpperCase();
}

/**
 * Compare Ingram inventory with local catalog
 * Returns mismatches where Ingram status differs from local publication_status
 */
export function compareInventoryStatus(
  ingramRecords: IngramInventoryRecord[],
  localTitles: { isbn: string; publication_status: string }[]
): {
  matched: { isbn: string; localStatus: string; ingramCode: string }[];
  mismatched: { isbn: string; localStatus: string; ingramCode: string; localExpectedCode: string }[];
  ingramOnly: { isbn: string; ingramCode: string }[];
  localOnly: { isbn: string; localStatus: string }[];
} {
  const localByIsbn = new Map(localTitles.map(t => [normalizeIsbn(t.isbn), t]));
  const ingramByIsbn = new Map(ingramRecords.map(r => [r.isbn, r]));

  const matched: { isbn: string; localStatus: string; ingramCode: string }[] = [];
  const mismatched: { isbn: string; localStatus: string; ingramCode: string; localExpectedCode: string }[] = [];
  const ingramOnly: { isbn: string; ingramCode: string }[] = [];
  const localOnly: { isbn: string; localStatus: string }[] = [];

  // Check Ingram records against local
  for (const [isbn, ingramRecord] of ingramByIsbn) {
    const localTitle = localByIsbn.get(isbn);
    if (!localTitle) {
      ingramOnly.push({ isbn, ingramCode: ingramRecord.availabilityCode });
      continue;
    }

    const localExpectedCode = getExpectedCodeFromStatus(localTitle.publication_status);
    if (ingramRecord.availabilityCode === localExpectedCode) {
      matched.push({ isbn, localStatus: localTitle.publication_status, ingramCode: ingramRecord.availabilityCode });
    } else {
      mismatched.push({
        isbn,
        localStatus: localTitle.publication_status,
        ingramCode: ingramRecord.availabilityCode,
        localExpectedCode,
      });
    }
  }

  // Find local-only titles
  for (const [isbn, localTitle] of localByIsbn) {
    if (!ingramByIsbn.has(isbn)) {
      localOnly.push({ isbn, localStatus: localTitle.publication_status });
    }
  }

  return { matched, mismatched, ingramOnly, localOnly };
}

function getExpectedCodeFromStatus(status: string): string {
  switch (status) {
    case 'draft':
    case 'pending':
      return '10';
    case 'published':
      return '20';
    case 'out_of_print':
      return '40';
    default:
      return '20';
  }
}
```

### Task 9: Inngest Job for Inventory Sync

Create `src/inngest/ingram-inventory.ts`:

```typescript
/**
 * Inngest: Ingram Inventory Sync Background Jobs
 *
 * Story 16.4 - Sync Inventory Status with Ingram
 *
 * Two jobs:
 * 1. ingram-inventory-sync: Push inventory status to Ingram (AC3)
 * 2. ingram-inventory-import: Import inventory snapshot from Ingram (AC4)
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import {
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import { channelFeeds, FEED_STATUS, FEED_TYPE } from "@/db/schema/channel-feeds";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { decryptCredentials } from "@/lib/channel-encryption";
import {
  uploadToIngram,
  listIngramInventoryFiles,
  downloadIngramInventoryFile,
} from "@/modules/channels/adapters/ingram/ftp-client";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import {
  getTitleWithAuthorsAdmin,
  type TitleWithAuthors,
} from "@/modules/title-authors/queries";
import {
  parseIngramInventoryFile,
  compareInventoryStatus,
} from "@/modules/channels/adapters/ingram/inventory-parser";
import { inngest } from "./client";

// ============================================================================
// INVENTORY SYNC (PUSH TO INGRAM)
// ============================================================================

interface InventorySyncEventData {
  tenantId: string;
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

/**
 * Inventory Sync Job - Push inventory status to Ingram
 *
 * Story 16.4 - AC3: Manual Immediate Status Push
 */
export const ingramInventorySync = inngest.createFunction(
  {
    id: "ingram-inventory-sync",
    retries: 3,
  },
  { event: "channel/ingram.inventory-sync" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy } = event.data as InventorySyncEventData;

    // Create feed record
    const feedId = await step.run("create-feed-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType: FEED_TYPE.INVENTORY_SYNC,
          triggeredBy,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    try {
      // Get credentials
      const credentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
          ),
        });
        if (!cred) throw new Error("Ingram credentials not configured");
        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Get tenant
      const tenant = await step.run("get-tenant", async () => {
        const t = await adminDb.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });
        if (!t) throw new Error("Tenant not found");
        return t;
      });

      // Get all titles with ISBNs
      const titlesToSync = await step.run("get-titles", async () => {
        const allTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
        });

        const titlesWithIsbn = allTitles.filter(t => t.isbn);

        const titlesWithAuthors: TitleWithAuthors[] = [];
        for (const title of titlesWithIsbn) {
          const titleWithAuthors = await getTitleWithAuthorsAdmin(title.id, tenantId);
          if (titleWithAuthors) {
            titlesWithAuthors.push(titleWithAuthors);
          }
        }

        return titlesWithAuthors;
      });

      if (titlesToSync.length === 0) {
        await step.run("mark-skipped", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SKIPPED,
              productCount: 0,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, feedId));
        });

        return { success: true, skipped: true, reason: "No titles with ISBNs" };
      }

      // Generate ONIX with updated availability
      const { xml, fileName } = await step.run("generate-onix", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, feedId));

        const builder = new ONIXMessageBuilder(
          tenantId,
          {
            id: tenant.id,
            name: tenant.name,
            email: null,
            subdomain: tenant.subdomain,
            default_currency: tenant.default_currency || "USD",
          },
          "3.0",
        );

        for (const title of titlesToSync as unknown as TitleWithAuthors[]) {
          builder.addTitle(title);
        }

        const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
        const fileName = `${tenant.subdomain}_inventory_${timestamp}.xml`;

        return { xml: builder.toXML(), fileName };
      });

      // Write temp file
      const tempFilePath = await step.run("write-temp-file", async () => {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, xml, "utf-8");
        return filePath;
      });

      // Upload to Ingram
      const uploadResult = await step.run("upload-to-ingram", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, feedId));
        return await uploadToIngram(credentials, tempFilePath, fileName);
      });

      // Get file size
      const fileSize = await step.run("get-file-size", async () => {
        const stats = await fs.stat(tempFilePath).catch(() => null);
        return stats?.size || xml.length;
      });

      // Cleanup
      await step.run("cleanup", async () => {
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      });

      // Update feed record
      if (uploadResult.success) {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              productCount: titlesToSync.length,
              fileSize,
              fileName,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, feedId));
        });

        return { success: true, feedId, productCount: titlesToSync.length };
      } else {
        throw new Error(uploadResult.message);
      }
    } catch (error) {
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, feedId));

      throw error;
    }
  }
);

// ============================================================================
// INVENTORY IMPORT (PULL FROM INGRAM)
// ============================================================================

interface InventoryImportEventData {
  tenantId: string;
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

interface InventoryImportMetadata {
  filesProcessed: number;
  recordsProcessed: number;
  matched: number;
  mismatched: number;
  ingramOnly: number;
  localOnly: number;
  mismatchDetails: { isbn: string; localStatus: string; ingramCode: string }[];
  parseErrors: { file: string; line: number; message: string }[];
}

/**
 * Inventory Import Job - Pull inventory snapshot from Ingram
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 */
export const ingramInventoryImport = inngest.createFunction(
  {
    id: "ingram-inventory-import",
    retries: 3,
  },
  { event: "channel/ingram.inventory-import" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy } = event.data as InventoryImportEventData;

    // Create import record
    const importId = await step.run("create-import-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType: FEED_TYPE.INVENTORY_IMPORT,
          triggeredBy,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    const metadata: InventoryImportMetadata = {
      filesProcessed: 0,
      recordsProcessed: 0,
      matched: 0,
      mismatched: 0,
      ingramOnly: 0,
      localOnly: 0,
      mismatchDetails: [],
      parseErrors: [],
    };

    try {
      // Get credentials
      const credentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
          ),
        });
        if (!cred) throw new Error("Ingram credentials not configured");
        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Get last successful import time
      const lastImport = await step.run("get-last-import", async () => {
        const last = await adminDb.query.channelFeeds.findFirst({
          where: and(
            eq(channelFeeds.tenantId, tenantId),
            eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
            eq(channelFeeds.feedType, FEED_TYPE.INVENTORY_IMPORT),
            eq(channelFeeds.status, FEED_STATUS.SUCCESS),
          ),
          orderBy: (feeds, { desc }) => [desc(feeds.completedAt)],
        });
        return last?.completedAt || null;
      });

      // List inventory files
      const inventoryFiles = await step.run("list-inventory-files", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, importId));

        return listIngramInventoryFiles(credentials, lastImport || undefined);
      });

      if (inventoryFiles.length === 0) {
        await step.run("mark-skipped", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SKIPPED,
              productCount: 0,
              completedAt: new Date(),
              metadata: { ...metadata, reason: "No new inventory files" },
            })
            .where(eq(channelFeeds.id, importId));
        });

        return { success: true, skipped: true, reason: "No new inventory files" };
      }

      // Get local titles for comparison
      const localTitles = await step.run("get-local-titles", async () => {
        const allTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
          columns: { isbn: true, publication_status: true },
        });
        return allTitles.filter(t => t.isbn).map(t => ({
          isbn: t.isbn!,
          publication_status: t.publication_status,
        }));
      });

      // Process each file
      for (const file of inventoryFiles) {
        await step.run(`process-file-${file.name}`, async () => {
          const tempDir = os.tmpdir();
          const localPath = path.join(tempDir, file.name);

          try {
            // Download file
            const downloadResult = await downloadIngramInventoryFile(credentials, file.name, localPath);
            if (!downloadResult.success) {
              metadata.parseErrors.push({ file: file.name, line: 0, message: downloadResult.message });
              return;
            }

            // Read and parse
            const content = await fs.readFile(localPath, "utf-8");
            const parseResult = parseIngramInventoryFile(content, file.name);

            // Track parse errors
            for (const error of parseResult.errors) {
              metadata.parseErrors.push({ file: file.name, line: error.line, message: error.message });
            }

            // Compare with local catalog
            const comparison = compareInventoryStatus(parseResult.records, localTitles);

            metadata.filesProcessed++;
            metadata.recordsProcessed += parseResult.records.length;
            metadata.matched += comparison.matched.length;
            metadata.mismatched += comparison.mismatched.length;
            metadata.ingramOnly += comparison.ingramOnly.length;
            metadata.localOnly += comparison.localOnly.length;

            // Store mismatch details (limit to 100 for UI)
            for (const mismatch of comparison.mismatched.slice(0, 100 - metadata.mismatchDetails.length)) {
              metadata.mismatchDetails.push({
                isbn: mismatch.isbn,
                localStatus: mismatch.localStatus,
                ingramCode: mismatch.ingramCode,
              });
            }
          } finally {
            // Cleanup temp file
            try {
              await fs.unlink(localPath);
            } catch {
              // Ignore cleanup errors
            }
          }
        });
      }

      // Mark success
      await step.run("mark-success", async () => {
        await adminDb
          .update(channelFeeds)
          .set({
            status: FEED_STATUS.SUCCESS,
            productCount: metadata.recordsProcessed,
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
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
          metadata,
        })
        .where(eq(channelFeeds.id, importId));

      throw error;
    }
  }
);
```

### Task 9: Register Inngest Functions

Update `src/inngest/client.ts` to add event types:

```typescript
export interface InngestEvents {
  // ... existing events

  /**
   * Ingram inventory sync event (push to Ingram)
   * Story 16.4: Sync Inventory Status with Ingram
   */
  "channel/ingram.inventory-sync": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };

  /**
   * Ingram inventory import event (pull from Ingram)
   * Story 16.4: Sync Inventory Status with Ingram
   */
  "channel/ingram.inventory-import": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
}
```

Update `src/inngest/functions.ts`:

```typescript
import { ingramInventorySync, ingramInventoryImport } from "./ingram-inventory";

export const functions = [
  // ... existing functions
  ingramInventorySync,
  ingramInventoryImport,
];
```

### Task 10: Inventory Sync History UI Component

Create `src/modules/channels/adapters/ingram/components/ingram-inventory-history.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { ChannelFeed } from "@/db/schema/channel-feeds";

interface IngramInventoryHistoryProps {
  syncs: ChannelFeed[];
  imports: ChannelFeed[];
  onTriggerSync: () => Promise<void>;
  onTriggerImport: () => Promise<void>;
  isSyncing: boolean;
  isImporting: boolean;
}

export function IngramInventoryHistory({
  syncs,
  imports,
  onTriggerSync,
  onTriggerImport,
  isSyncing,
  isImporting,
}: IngramInventoryHistoryProps) {
  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    pending: "secondary",
    generating: "secondary",
    uploading: "secondary",
    failed: "destructive",
    skipped: "outline",
  };

  return (
    <div className="space-y-6">
      {/* Inventory Sync (Push) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory Sync (Push to Ingram)</CardTitle>
          <Button onClick={onTriggerSync} disabled={isSyncing} variant="outline">
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </CardHeader>
        <CardContent>
          {syncs.length === 0 ? (
            <p className="text-muted-foreground">No inventory syncs yet.</p>
          ) : (
            <div className="space-y-3">
              {syncs.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[sync.status]}>
                        {sync.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {sync.triggeredBy === "schedule" ? "Scheduled" : "Manual"}
                      </span>
                    </div>
                    <p className="text-sm">
                      {sync.createdAt
                        ? formatDistanceToNow(new Date(sync.createdAt), { addSuffix: true })
                        : "Unknown time"}
                    </p>
                    {sync.errorMessage && (
                      <p className="text-sm text-destructive">{sync.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p>{sync.productCount ?? 0} titles synced</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Import (Pull) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory Import (Pull from Ingram)</CardTitle>
          <Button onClick={onTriggerImport} disabled={isImporting} variant="outline">
            {isImporting ? "Importing..." : "Import Now"}
          </Button>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-muted-foreground">No inventory imports yet.</p>
          ) : (
            <div className="space-y-3">
              {imports.map((imp) => {
                const meta = imp.metadata as {
                  matched?: number;
                  mismatched?: number;
                  mismatchDetails?: { isbn: string; localStatus: string; ingramCode: string }[];
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
                          ? formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true })
                          : "Unknown time"}
                      </p>
                      {imp.errorMessage && (
                        <p className="text-sm text-destructive">{imp.errorMessage}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p>{meta?.matched ?? 0} matched</p>
                      {meta?.mismatched && meta.mismatched > 0 && (
                        <p className="text-amber-600">
                          {meta.mismatched} mismatched
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
    </div>
  );
}
```

### Task 10: Query for Inventory History

Add to `src/modules/channels/adapters/ingram/queries.ts`:

```typescript
import { FEED_TYPE } from "@/db/schema/channel-feeds";

/**
 * Get inventory sync history (push to Ingram)
 * Story 16.4 - AC5: Inventory Sync History
 */
export async function getIngramInventorySyncHistory(limit = 20) {
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
      eq(channelFeeds.feedType, FEED_TYPE.INVENTORY_SYNC),
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}

/**
 * Get inventory import history (pull from Ingram)
 * Story 16.4 - AC5: Inventory Sync History
 */
export async function getIngramInventoryImportHistory(limit = 20) {
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
      eq(channelFeeds.feedType, FEED_TYPE.INVENTORY_IMPORT),
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}
```

### Project Structure Notes

- Codelist 65 mapping: `src/modules/onix/builder/message-builder.ts` (new export function)
- Inventory parser: `src/modules/channels/adapters/ingram/inventory-parser.ts`
- Inngest jobs: `src/inngest/ingram-inventory.ts`
- UI components: `src/modules/channels/adapters/ingram/components/ingram-inventory-history.tsx`
- Update page: `src/app/(dashboard)/settings/integrations/ingram/page.tsx`

### Security Requirements

1. **Role check** - Only owner/admin can trigger inventory syncs
2. **Tenant isolation** - RLS on channel_feeds, titles use tenant_id from adminDb context
3. **Credential security** - Never log decrypted FTP credentials
4. **Temp file cleanup** - Always delete downloaded files after processing
5. **No auto-updates** - Mismatches are flagged for review, not auto-corrected (AC6)

### References

- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/architecture.md - ADR-011: Channel Adapter Pattern]
- [Source: docs/epics.md - Story 16.4: Sync Inventory Status with Ingram]
- [Source: src/inngest/ingram-feed.ts - Inngest job pattern]
- [Source: src/modules/onix/builder/message-builder.ts - ONIX builder]
- [Source: src/db/schema/titles.ts - publication_status field]
- [Source: docs/sprint-artifacts/16-2-schedule-automated-onix-feeds-to-ingram.md]
- [Source: docs/sprint-artifacts/16-3-ingest-ingram-order-data.md]

## Test Scenarios

### Unit Tests (`tests/unit/onix-product-availability.test.ts`)
- getProductAvailabilityCode returns "10" for draft
- getProductAvailabilityCode returns "10" for pending
- getProductAvailabilityCode returns "20" for published
- getProductAvailabilityCode returns "40" for out_of_print
- getProductAvailabilityCode returns "20" for unknown/null status
- ONIXMessageBuilder generates correct ProductAvailability in Block 6

### Unit Tests (`tests/unit/ingram-inventory-parser.test.ts`)
- Parse CSV inventory file correctly
- Parse TSV inventory file correctly
- Handle missing ISBN column
- Handle missing availability column (default to 20)
- Normalize ISBNs with hyphens
- compareInventoryStatus identifies matches correctly
- compareInventoryStatus identifies mismatches correctly
- compareInventoryStatus handles Ingram-only records
- compareInventoryStatus handles local-only records

### Unit Tests (`tests/unit/ingram-inventory-job.test.ts`)
- Inventory sync generates ONIX with correct availability codes
- Inventory sync uploads to correct FTP path
- Inventory import downloads files from correct directory
- Inventory import parses and compares correctly
- Inventory import tracks mismatches in metadata
- Inventory import limits mismatch details to 100

### Integration Tests (mocked FTP)
- Full inventory sync flow
- Full inventory import flow
- Sync with empty catalog (skipped)
- Import with no new files (skipped)

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations > Ingram
- [ ] See "Inventory Sync" section
- [ ] Click "Sync Now" button
- [ ] See progress/pending status
- [ ] See success with title count
- [ ] Click "Import Now" button
- [ ] See import progress
- [ ] See matched/mismatched counts
- [ ] Verify mismatches are displayed (if any)
- [ ] Change a title's publication_status
- [ ] Trigger inventory sync
- [ ] Verify ONIX contains correct ProductAvailability code

## Dev Agent Record

### Context Reference

This story completes the bidirectional inventory synchronization with Ingram:
- Outbound: Push inventory status changes to Ingram via ONIX
- Inbound: Import inventory snapshots for comparison (no auto-update)

The dynamic ProductAvailability feature benefits all ONIX exports, not just Ingram.

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- Use Codelist 65 for ProductAvailability mapping (10, 20, 40)
- Update ONIXMessageBuilder.buildProductSupply to accept title parameter
- Create new export function getProductAvailabilityCode for reusability
- Inventory import compares but does NOT auto-update local status (AC6)
- Mismatch details limited to 100 in metadata for UI performance
- Two new feed types: inventory_sync, inventory_import

### File List

New files:
- `src/modules/channels/adapters/ingram/inventory-parser.ts` - Inventory file parser with comparison
- `src/inngest/ingram-inventory.ts` - Inventory sync and import Inngest jobs
- `src/modules/channels/adapters/ingram/components/ingram-inventory-history.tsx` - Inventory sync history UI
- `tests/unit/onix-product-availability.test.ts` - ProductAvailability mapping tests
- `tests/unit/ingram-inventory-parser.test.ts` - Inventory parser tests
- `tests/unit/ingram-inventory-job.test.ts` - Inngest job tests

Modified files:
- `src/modules/onix/builder/message-builder.ts` - Add getProductAvailabilityCode, update buildProductSupply
- `src/db/schema/channel-feeds.ts` - Add INVENTORY_SYNC, INVENTORY_IMPORT feed types
- `src/modules/channels/adapters/ingram/ftp-client.ts` - Add listIngramInventoryFiles, downloadIngramInventoryFile
- `src/modules/channels/adapters/ingram/actions.ts` - Add triggerIngramInventorySync, triggerIngramInventoryImport
- `src/modules/channels/adapters/ingram/queries.ts` - Add getIngramInventorySyncHistory, getIngramInventoryImportHistory
- `src/inngest/client.ts` - Add inventory event types
- `src/inngest/functions.ts` - Register inventory functions
- `src/app/(dashboard)/settings/integrations/ingram/page.tsx` - Add IngramInventoryHistory component

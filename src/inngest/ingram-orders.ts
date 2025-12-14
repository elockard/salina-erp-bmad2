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
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 * where there's no authenticated session for PostgreSQL RLS policies.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import {
  CHANNEL_STATUS,
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import {
  channelFeeds,
  FEED_STATUS,
  FEED_TYPE,
} from "@/db/schema/channel-feeds";
import { sales } from "@/db/schema/sales";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { decryptCredentials } from "@/lib/channel-encryption";
import {
  downloadIngramOrderFile,
  listIngramOrderFiles,
} from "@/modules/channels/adapters/ingram/ftp-client";
import {
  type IngramOrderRecord,
  normalizeIsbn,
  parseIngramOrderFile,
} from "@/modules/channels/adapters/ingram/order-parser";
import { inngest } from "./client";

/**
 * Event payload for Ingram order ingestion
 */
interface IngramOrdersEventData {
  tenantId: string;
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

/**
 * Metadata stored with import record
 */
interface ImportMetadata {
  filesProcessed: number;
  ordersCreated: number;
  unmatchedIsbns: { isbn: string; orderId: string; quantity: number }[];
  duplicatesSkipped: number;
  parseErrors: { file: string; line: number; message: string }[];
}

/**
 * Ingram Order Ingestion Background Job
 *
 * AC1: Downloads order files from Ingram FTP /outbound/orders/
 * AC2: Parses EDI X12 850 and delimited file formats
 * AC3: Creates sales transactions for matched orders
 * AC4: Matches ISBNs to titles (physical and ebook)
 * AC5: Tracks unmatched ISBNs in metadata
 * AC6: Detects and skips duplicate orders
 * AC7: Retries 3 times on failure, records history in channel_feeds
 */
export const ingramOrders = inngest.createFunction(
  {
    id: "ingram-orders",
    retries: 3,
  },
  { event: "channel/ingram.orders" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy } = event.data as IngramOrdersEventData;

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
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
          ),
        });

        if (!cred) throw new Error("Ingram credentials not configured");
        if (cred.status !== CHANNEL_STATUS.ACTIVE)
          throw new Error("Ingram connection is not active");

        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Step 3: Get last successful import time
      const lastImport = await step.run("get-last-import", async () => {
        const last = await adminDb.query.channelFeeds.findFirst({
          where: and(
            eq(channelFeeds.tenantId, tenantId),
            eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
            eq(channelFeeds.feedType, FEED_TYPE.IMPORT),
            eq(channelFeeds.status, FEED_STATUS.SUCCESS),
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

        // lastImport is serialized as ISO string from step.run, convert back to Date
        const sinceDate = lastImport ? new Date(lastImport) : undefined;
        return listIngramOrderFiles(credentials, sinceDate);
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

      // Step 5: Get system user for sales creation (tenant owner)
      const systemUserId = await step.run("get-system-user", async () => {
        const owner = await adminDb.query.users.findFirst({
          where: and(eq(users.tenant_id, tenantId), eq(users.role, "owner")),
        });
        if (!owner) throw new Error("Tenant owner not found");
        return owner.id;
      });

      // Step 6: Build ISBN to title_id map
      // Maps normalized ISBN -> { id, format }
      const isbnMapRaw = await step.run("build-isbn-map", async () => {
        const tenantTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
          columns: { id: true, isbn: true, eisbn: true },
        });

        // Build map entries as array for JSON serialization
        const entries: [
          string,
          { id: string; format: "physical" | "ebook" },
        ][] = [];
        for (const title of tenantTitles) {
          if (title.isbn) {
            entries.push([
              normalizeIsbn(title.isbn),
              { id: title.id, format: "physical" },
            ]);
          }
          if (title.eisbn) {
            entries.push([
              normalizeIsbn(title.eisbn),
              { id: title.id, format: "ebook" },
            ]);
          }
        }
        return entries;
      });

      // Convert back to Map for processing
      const isbnMap = new Map(isbnMapRaw);

      // Step 7: Process each file
      for (const file of orderFiles) {
        const fileResult = await step.run(
          `process-file-${file.name}`,
          async () => {
            const tempDir = os.tmpdir();
            const localPath = path.join(tempDir, file.name);

            try {
              // Download file
              const downloadResult = await downloadIngramOrderFile(
                credentials,
                file.name,
                localPath,
              );
              if (!downloadResult.success) {
                metadata.parseErrors.push({
                  file: file.name,
                  line: 0,
                  message: downloadResult.message,
                });
                return { ordersCreated: 0 };
              }

              // Read and parse file
              const content = await fs.readFile(localPath, "utf-8");
              const parseResult = parseIngramOrderFile(content, file.name);

              // Track parse errors
              for (const error of parseResult.errors) {
                metadata.parseErrors.push({
                  file: file.name,
                  line: error.line,
                  message: error.message,
                });
              }

              // First pass: match ISBNs and collect date range for batch duplicate check
              const matchedOrders: {
                order: IngramOrderRecord;
                titleMatch: { id: string; format: "physical" | "ebook" };
              }[] = [];
              let minDate: Date | null = null;
              let maxDate: Date | null = null;

              for (const order of parseResult.orders) {
                const titleMatch = isbnMap.get(order.isbn);
                if (!titleMatch) {
                  // AC5: Track unmatched ISBNs
                  metadata.unmatchedIsbns.push({
                    isbn: order.isbn,
                    orderId: order.orderId,
                    quantity: order.quantity,
                  });
                  continue;
                }
                matchedOrders.push({ order, titleMatch });
                // Track date range for batch query
                if (!minDate || order.orderDate < minDate)
                  minDate = order.orderDate;
                if (!maxDate || order.orderDate > maxDate)
                  maxDate = order.orderDate;
              }

              // AC6: Batch fetch existing sales for duplicate detection (avoids N+1)
              const existingSalesSet = new Set<string>();
              if (matchedOrders.length > 0 && minDate && maxDate) {
                const existingSales = await adminDb.query.sales.findMany({
                  where: and(
                    eq(sales.tenant_id, tenantId),
                    eq(sales.channel, "distributor"),
                  ),
                  columns: {
                    title_id: true,
                    sale_date: true,
                    quantity: true,
                  },
                });
                // Build deduplication set: "title_id|date|quantity"
                for (const sale of existingSales) {
                  existingSalesSet.add(
                    `${sale.title_id}|${sale.sale_date}|${sale.quantity}`,
                  );
                }
              }

              // Process matched orders with O(1) duplicate lookup
              let ordersCreated = 0;
              for (const { order, titleMatch } of matchedOrders) {
                const saleDateStr = order.orderDate.toISOString().split("T")[0];
                const dupeKey = `${titleMatch.id}|${saleDateStr}|${order.quantity}`;

                if (existingSalesSet.has(dupeKey)) {
                  metadata.duplicatesSkipped++;
                  continue;
                }

                // AC3: Create sales transaction
                const totalAmount = new Decimal(order.unitPrice)
                  .times(order.quantity)
                  .toFixed(2);

                await adminDb.insert(sales).values({
                  tenant_id: tenantId,
                  title_id: titleMatch.id,
                  format: titleMatch.format,
                  quantity: order.quantity,
                  unit_price: order.unitPrice.toFixed(2),
                  total_amount: totalAmount,
                  sale_date: saleDateStr,
                  channel: "distributor", // Ingram is a distributor channel
                  created_by_user_id: systemUserId,
                });

                // Add to set to prevent duplicates within same file
                existingSalesSet.add(dupeKey);
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
          },
        );

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
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
          metadata,
        })
        .where(eq(channelFeeds.id, importId));

      throw error; // Re-throw for Inngest retry
    }
  },
);

// Note: Duplicate checking is done via batch query in the file processing step
// to avoid N+1 query pattern. See existingSalesSet usage in process-file step.

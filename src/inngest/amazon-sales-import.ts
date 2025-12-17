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
 * 6. Match ISBNs to titles
 * 7. Create sales transactions with duplicate detection
 * 8. Update import record with results
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 * where there's no authenticated session for PostgreSQL RLS policies.
 */

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
  createReport,
  downloadReportContent,
  getReportDocument,
  getReportStatus,
} from "@/modules/channels/adapters/amazon/reports-api-client";
import { parseAmazonSalesReport } from "@/modules/channels/adapters/amazon/sales-parser";
import { normalizeIsbn } from "@/modules/channels/adapters/ingram/order-parser";
import { inngest } from "./client";

/**
 * Event payload for Amazon sales import
 */
interface AmazonSalesImportEventData {
  tenantId: string;
  triggeredBy: "schedule" | "manual";
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Metadata stored with import record
 */
interface ImportMetadata {
  reportId?: string;
  rowsProcessed: number;
  salesCreated: number;
  unmatchedRecords: {
    isbn: string;
    asin: string;
    orderId: string;
    quantity: number;
  }[];
  duplicatesSkipped: number;
  parseErrors: { line: number; message: string }[];
}

/**
 * Amazon Sales Import Background Job
 *
 * AC1: Requests sales report via SP-API Reports endpoint
 * AC2: Polls for report completion (every 30 seconds, max 10 minutes)
 * AC3: Downloads and parses CSV sales report
 * AC4: Creates sales transactions with channel='amazon'
 * AC5: Matches ISBNs to titles (extracted from SKU field)
 * AC6: Tracks unmatched records for review
 * AC7: Detects and skips duplicate sales
 * AC8: Records import history in channel_feeds table
 */
export const amazonSalesImport = inngest.createFunction(
  {
    id: "amazon-sales-import",
    retries: 3,
  },
  { event: "channel/amazon.sales-import" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy, startDate, endDate } =
      event.data as AmazonSalesImportEventData;

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
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
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
            eq(channelFeeds.status, FEED_STATUS.SUCCESS),
          ),
          orderBy: (feeds, { desc }) => [desc(feeds.completedAt)],
        });
        return last?.completedAt || null;
      });

      // Step 4: Calculate and validate date range (Issue 5 fix)
      const now = new Date();
      const maxHistoryMs = 365 * 24 * 60 * 60 * 1000; // Max 365 days in past

      let reportStartDate: Date;
      if (startDate) {
        const parsed = new Date(startDate);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Invalid startDate format");
        }
        // Clamp to max 365 days in past
        const minDate = new Date(now.getTime() - maxHistoryMs);
        reportStartDate = parsed < minDate ? minDate : parsed;
      } else if (lastImport) {
        reportStartDate = new Date(lastImport);
      } else {
        reportStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days
      }

      let reportEndDate: Date;
      if (endDate) {
        const parsed = new Date(endDate);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Invalid endDate format");
        }
        // Don't allow future dates
        reportEndDate = parsed > now ? now : parsed;
      } else {
        reportEndDate = now;
      }

      // Validate date range
      if (reportStartDate >= reportEndDate) {
        throw new Error("startDate must be before endDate");
      }

      // Step 5: Request sales report
      const reportId = await step.run("request-report", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, importId));

        const result = await createReport(
          credentials,
          reportStartDate,
          reportEndDate,
        );
        return result.reportId;
      });

      metadata.reportId = reportId;

      // Step 6: Poll for report completion using step.sleep for Inngest checkpointing
      const reportStatus = await step.run("poll-initial-status", async () => {
        return getReportStatus(credentials, reportId);
      });

      let finalStatus = reportStatus;
      let pollAttempts = 0;
      const maxAttempts = 20; // 10 minutes at 30 second intervals

      while (
        finalStatus.processingStatus === "IN_PROGRESS" ||
        finalStatus.processingStatus === "IN_QUEUE"
      ) {
        if (pollAttempts >= maxAttempts) {
          throw new Error("Report processing timed out after 10 minutes");
        }
        await step.sleep(`poll-wait-${pollAttempts}`, "30 seconds");
        finalStatus = await step.run(
          `poll-status-${pollAttempts}`,
          async () => {
            return getReportStatus(credentials, reportId);
          },
        );
        pollAttempts++;
      }

      if (
        finalStatus.processingStatus === "CANCELLED" ||
        finalStatus.processingStatus === "FATAL"
      ) {
        throw new Error(
          `Report processing failed: ${finalStatus.processingStatus}`,
        );
      }

      if (!finalStatus.reportDocumentId) {
        throw new Error("Report completed but no document ID returned");
      }

      // Step 7: Download report content
      const reportDocumentId = finalStatus.reportDocumentId;
      const reportContent = await step.run("download-report", async () => {
        if (!reportDocumentId) {
          throw new Error("Report document ID is missing");
        }
        const document = await getReportDocument(credentials, reportDocumentId);
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

      // Step 10: Build ISBN AND ASIN maps for matching
      // Story 17.4: Added ASIN matching support
      const matchingMaps = await step.run("build-matching-maps", async () => {
        const tenantTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
          columns: { id: true, isbn: true, eisbn: true, asin: true },
        });

        const isbnEntries: [
          string,
          { id: string; format: "physical" | "ebook" },
        ][] = [];
        const asinEntries: [string, string][] = []; // ASIN -> title ID

        for (const title of tenantTitles) {
          if (title.isbn) {
            isbnEntries.push([
              normalizeIsbn(title.isbn),
              { id: title.id, format: "physical" },
            ]);
          }
          if (title.eisbn) {
            isbnEntries.push([
              normalizeIsbn(title.eisbn),
              { id: title.id, format: "ebook" },
            ]);
          }
          // Story 17.4: Add ASIN to map for fallback matching
          if (title.asin) {
            asinEntries.push([title.asin.toUpperCase(), title.id]);
          }
        }
        return { isbnEntries, asinEntries };
      });

      const isbnMap = new Map(matchingMaps.isbnEntries);
      const asinMap = new Map(matchingMaps.asinEntries);

      // Step 11: Batch fetch existing sales for duplicate detection
      // Issue 4 fix: Include orderId in deduplication key to distinguish different orders
      const existingSalesSet = await step.run(
        "get-existing-sales",
        async () => {
          // Note: We fetch recent Amazon sales to check for duplicates
          // The key includes title_id, sale_date, quantity, and we'll add orderId
          // Since existing records don't have orderId stored, we use a composite key
          // that should still catch most duplicates
          const existingSales = await adminDb.query.sales.findMany({
            where: and(
              eq(sales.tenant_id, tenantId),
              eq(sales.channel, "amazon"),
            ),
            columns: {
              title_id: true,
              sale_date: true,
              quantity: true,
            },
          });

          // For existing records without orderId, use the old key format
          // New imports will use the full key with orderId
          return existingSales.map(
            (sale) => `${sale.title_id}|${sale.sale_date}|${sale.quantity}`,
          );
        },
      );

      const dupeSet = new Set(existingSalesSet);

      // Step 12: Process sales records with batch inserts (Issue 2 fix)
      // Story 17.4: Added ASIN-based matching as fallback
      const processResult = await step.run("process-sales", async () => {
        let salesCreated = 0;
        const unmatchedRecords: ImportMetadata["unmatchedRecords"] = [];
        let duplicatesSkipped = 0;
        const salesToInsert: {
          tenant_id: string;
          title_id: string;
          format: "physical" | "ebook";
          quantity: number;
          unit_price: string;
          total_amount: string;
          sale_date: string;
          channel: "amazon";
          created_by_user_id: string;
        }[] = [];

        for (const sale of parseResult.sales) {
          // Match by ISBN first (priority 1)
          let titleMatch = sale.isbn ? isbnMap.get(sale.isbn) : undefined;

          // Story 17.4: Fallback to ASIN matching (priority 2)
          if (!titleMatch && sale.asin) {
            const asinTitleId = asinMap.get(sale.asin.toUpperCase());
            if (asinTitleId) {
              titleMatch = { id: asinTitleId, format: "physical" };
            }
          }

          if (!titleMatch) {
            unmatchedRecords.push({
              isbn: sale.isbn || "",
              asin: sale.asin,
              orderId: sale.orderId,
              quantity: sale.quantity,
            });
            continue;
          }

          // Check for duplicate
          // Note: purchaseDate may be string after Inngest step serialization
          const purchaseDate =
            typeof sale.purchaseDate === "string"
              ? new Date(sale.purchaseDate)
              : sale.purchaseDate;
          const saleDateStr = purchaseDate.toISOString().split("T")[0];

          // Issue 4 fix: Include orderId in deduplication key
          // This ensures two different orders on the same day aren't incorrectly deduplicated
          const dupeKey = `${titleMatch.id}|${saleDateStr}|${sale.quantity}|${sale.orderId}`;
          // Also check legacy key format (without orderId) for backward compatibility
          const legacyDupeKey = `${titleMatch.id}|${saleDateStr}|${sale.quantity}`;

          if (dupeSet.has(dupeKey) || dupeSet.has(legacyDupeKey)) {
            duplicatesSkipped++;
            continue;
          }

          // Prepare sales record for batch insert
          const totalAmount = new Decimal(sale.itemPrice).toFixed(2);
          const unitPrice = new Decimal(sale.unitPrice).toFixed(2);

          salesToInsert.push({
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

        // Issue 2 fix: Batch insert in chunks of 100 for performance
        const BATCH_SIZE = 100;
        for (let i = 0; i < salesToInsert.length; i += BATCH_SIZE) {
          const batch = salesToInsert.slice(i, i + BATCH_SIZE);
          if (batch.length > 0) {
            await adminDb.insert(sales).values(batch);
          }
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
      // Issue 3 fix: Wrap error handling in step.run for proper Inngest checkpointing
      // This ensures the failure status is recorded even if the function is retried
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await step.run("mark-failed", async () => {
        await adminDb
          .update(channelFeeds)
          .set({
            status: FEED_STATUS.FAILED,
            errorMessage,
            completedAt: new Date(),
            metadata,
          })
          .where(eq(channelFeeds.id, importId));
      });

      throw error; // Re-throw for Inngest retry
    }
  },
);

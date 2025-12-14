/**
 * Inngest: Ingram Inventory Sync Background Jobs
 *
 * Story 16.4 - Sync Inventory Status with Ingram
 *
 * Two jobs:
 * 1. ingram-inventory-sync: Push inventory status to Ingram (AC3)
 * 2. ingram-inventory-import: Import inventory snapshot from Ingram (AC4)
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 * where there's no authenticated session for PostgreSQL RLS policies.
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
import {
  channelFeeds,
  FEED_STATUS,
  FEED_TYPE,
} from "@/db/schema/channel-feeds";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { decryptCredentials } from "@/lib/channel-encryption";
import {
  downloadIngramInventoryFile,
  listIngramInventoryFiles,
  uploadToIngram,
} from "@/modules/channels/adapters/ingram/ftp-client";
import {
  compareInventoryStatus,
  parseIngramInventoryFile,
} from "@/modules/channels/adapters/ingram/inventory-parser";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import {
  getTitleWithAuthorsAdmin,
  type TitleWithAuthors,
} from "@/modules/title-authors/queries";
import { inngest } from "./client";

// ============================================================================
// INVENTORY SYNC (PUSH TO INGRAM) - AC3
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
 * Generates ONIX with current ProductAvailability codes and uploads to Ingram
 */
export const ingramInventorySync = inngest.createFunction(
  {
    id: "ingram-inventory-sync",
    retries: 3,
  },
  { event: "channel/ingram.inventory-sync" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy } = event.data as InventorySyncEventData;

    // Step 1: Create feed record
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
      // Step 2: Get credentials
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

      // Step 3: Get tenant
      const tenant = await step.run("get-tenant", async () => {
        const t = await adminDb.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });
        if (!t) throw new Error("Tenant not found");
        return t;
      });

      // Step 4: Get all titles with ISBNs
      const titlesToSync = await step.run("get-titles", async () => {
        const allTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
        });

        const titlesWithIsbn = allTitles.filter((t) => t.isbn);

        const titlesWithAuthors: TitleWithAuthors[] = [];
        for (const title of titlesWithIsbn) {
          const titleWithAuthors = await getTitleWithAuthorsAdmin(
            title.id,
            tenantId,
          );
          if (titleWithAuthors) {
            titlesWithAuthors.push(titleWithAuthors);
          }
        }

        return titlesWithAuthors;
      });

      // Step 5: Check if we have titles
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

      // Step 6: Generate ONIX with updated availability
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
          "3.0", // Ingram prefers ONIX 3.0
        );

        // Inngest serializes step returns through JSON, so cast is safe
        for (const title of titlesToSync as unknown as TitleWithAuthors[]) {
          builder.addTitle(title);
        }

        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .slice(0, 15);
        const fileName = `${tenant.subdomain}_inventory_${timestamp}.xml`;

        return { xml: builder.toXML(), fileName };
      });

      // Step 7: Write temp file
      const tempFilePath = await step.run("write-temp-file", async () => {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, xml, "utf-8");
        return filePath;
      });

      // Step 8: Upload to Ingram
      const uploadResult = await step.run("upload-to-ingram", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, feedId));
        return await uploadToIngram(credentials, tempFilePath, fileName);
      });

      // Step 9: Get file size
      const fileSize = await step.run("get-file-size", async () => {
        const stats = await fs.stat(tempFilePath).catch(() => null);
        return stats?.size || xml.length;
      });

      // Step 10: Cleanup
      await step.run("cleanup", async () => {
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      });

      // Step 11: Update feed record
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
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, feedId));

      throw error;
    }
  },
);

// ============================================================================
// INVENTORY IMPORT (PULL FROM INGRAM) - AC4
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
 * Downloads inventory files, parses them, and compares with local catalog
 * Mismatches are flagged for review (NOT auto-updated per AC6)
 */
export const ingramInventoryImport = inngest.createFunction(
  {
    id: "ingram-inventory-import",
    retries: 3,
  },
  { event: "channel/ingram.inventory-import" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy } = event.data as InventoryImportEventData;

    // Initialize metadata
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

    // Step 1: Create import record
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
        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Step 3: Get last successful import time
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

      // Step 4: List inventory files
      const inventoryFiles = await step.run(
        "list-inventory-files",
        async () => {
          await adminDb
            .update(channelFeeds)
            .set({ status: FEED_STATUS.GENERATING })
            .where(eq(channelFeeds.id, importId));

          // Inngest serializes step returns through JSON, so Date becomes string
          const sinceDate = lastImport
            ? new Date(lastImport as unknown as string)
            : undefined;

          return listIngramInventoryFiles(credentials, sinceDate);
        },
      );

      // Step 5: Check if we have files
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

        return {
          success: true,
          skipped: true,
          reason: "No new inventory files",
        };
      }

      // Step 6: Get local titles for comparison
      const localTitles = await step.run("get-local-titles", async () => {
        const allTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
          columns: { isbn: true, publication_status: true },
        });
        return allTitles
          .filter((t): t is typeof t & { isbn: string } => Boolean(t.isbn))
          .map((t) => ({
            isbn: t.isbn,
            publication_status: t.publication_status,
          }));
      });

      // Step 7: Process each file
      for (const file of inventoryFiles) {
        await step.run(`process-file-${file.name}`, async () => {
          const tempDir = os.tmpdir();
          const localPath = path.join(tempDir, file.name);

          try {
            // Download file
            const downloadResult = await downloadIngramInventoryFile(
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
              return;
            }

            // Read and parse
            const content = await fs.readFile(localPath, "utf-8");
            const parseResult = parseIngramInventoryFile(content, file.name);

            // Track parse errors
            for (const error of parseResult.errors) {
              metadata.parseErrors.push({
                file: file.name,
                line: error.line,
                message: error.message,
              });
            }

            // Compare with local catalog
            const comparison = compareInventoryStatus(
              parseResult.records,
              localTitles,
            );

            metadata.filesProcessed++;
            metadata.recordsProcessed += parseResult.records.length;
            metadata.matched += comparison.matched.length;
            metadata.mismatched += comparison.mismatched.length;
            metadata.ingramOnly += comparison.ingramOnly.length;
            metadata.localOnly += comparison.localOnly.length;

            // Store mismatch details (limit to 100 for UI performance)
            for (const mismatch of comparison.mismatched.slice(
              0,
              100 - metadata.mismatchDetails.length,
            )) {
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

      // Step 8: Mark success
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
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
          metadata,
        })
        .where(eq(channelFeeds.id, importId));

      throw error;
    }
  },
);

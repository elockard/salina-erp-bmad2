/**
 * Inngest: Ingram ONIX Feed Background Job
 *
 * Story 16.2 - Schedule Automated ONIX Feeds to Ingram
 *
 * Processing Steps:
 * 1. Create feed record with 'pending' status
 * 2. Get tenant's titles (all or changed-only based on feedType)
 * 3. Generate ONIX 3.0 XML using ONIXMessageBuilder
 * 4. Write to temp file
 * 5. Upload to Ingram via FTPS
 * 6. Update feed record with success/failure
 * 7. Clean up temp file
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
import { channelFeeds, FEED_STATUS } from "@/db/schema/channel-feeds";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { decryptCredentials } from "@/lib/channel-encryption";
import { uploadToIngram } from "@/modules/channels/adapters/ingram/ftp-client";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import {
  getTitleWithAuthorsAdmin,
  type TitleWithAuthors,
} from "@/modules/title-authors/queries";
import { inngest } from "./client";

/**
 * Event payload for Ingram feed generation
 */
interface IngramFeedEventData {
  tenantId: string;
  feedType: "full" | "delta";
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

/**
 * Ingram Feed Background Job
 *
 * AC2: Generates ONIX 3.0 format (Ingram's preferred)
 * AC3: Uploads via FTPS with 60-second timeout and retry
 * AC6: Supports delta feeds (changed titles only)
 * AC7: 3 retries with exponential backoff, persistent failures update channel status to 'error'
 */
export const ingramFeed = inngest.createFunction(
  {
    id: "ingram-feed",
    retries: 3,
    onFailure: async ({ event }) => {
      // AC7: "persistent failures update channel status to 'error'"
      // This callback runs only after all retries are exhausted
      // Note: Inngest's onFailure event types require explicit casting through unknown
      const tenantId = (event.data as unknown as { tenantId: string }).tenantId;

      await adminDb
        .update(channelCredentials)
        .set({
          status: "error",
          lastConnectionStatus: "Feed delivery failed after multiple retries",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
          ),
        );
    },
  },
  { event: "channel/ingram.feed" },
  async ({ event, step }) => {
    const { tenantId, feedType, triggeredBy } =
      event.data as IngramFeedEventData;

    // Step 1: Create feed record
    const feedId = await step.run("create-feed-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType,
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

      // Step 3: Get tenant info
      const tenant = await step.run("get-tenant", async () => {
        const t = await adminDb.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });
        if (!t) throw new Error("Tenant not found");
        return t;
      });

      // Step 4: Get titles to include
      const titlesToExport = await step.run("get-titles", async () => {
        // Get last successful feed for delta calculation
        let lastSuccessfulFeed = null;
        if (feedType === "delta") {
          lastSuccessfulFeed = await adminDb.query.channelFeeds.findFirst({
            where: and(
              eq(channelFeeds.tenantId, tenantId),
              eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
              eq(channelFeeds.status, FEED_STATUS.SUCCESS),
            ),
            orderBy: (feeds, { desc }) => [desc(feeds.completedAt)],
          });
        }

        // Get all tenant titles
        const allTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
        });

        // Filter for delta if needed (AC6: Changed titles only)
        let filteredTitles = allTitles;
        if (feedType === "delta" && lastSuccessfulFeed?.completedAt) {
          const lastFeedTime = lastSuccessfulFeed.completedAt;
          filteredTitles = allTitles.filter(
            (t) => t.updated_at && new Date(t.updated_at) > lastFeedTime,
          );
        }

        // Only include titles with ISBNs (required for ONIX)
        filteredTitles = filteredTitles.filter((t) => t.isbn);

        // Fetch authors for each title using admin function
        const titlesWithAuthors = [];
        for (const title of filteredTitles) {
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

      // Step 5: Check if we have titles to export
      if (titlesToExport.length === 0) {
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

        return {
          success: true,
          skipped: true,
          reason:
            feedType === "delta"
              ? "No titles changed since last feed"
              : "No titles with ISBNs to export",
          feedId,
        };
      }

      // Step 6: Generate ONIX XML (AC2: ONIX 3.0 format)
      const { xml, fileName } = await step.run("generate-onix", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, feedId));

        // Use ONIX 3.0 for Ingram (per AC2)
        const builder = new ONIXMessageBuilder(
          tenantId,
          {
            id: tenant.id,
            name: tenant.name,
            email: null, // Tenant doesn't have email field
            subdomain: tenant.subdomain,
            default_currency: tenant.default_currency || "USD",
          },
          "3.0",
        );

        // Note: Inngest serializes step returns through JSON, so Date fields become strings.
        // The ONIXMessageBuilder doesn't use the date fields, so this cast is safe.
        for (const title of titlesToExport as unknown as TitleWithAuthors[]) {
          builder.addTitle(title);
        }

        // Generate filename with timestamp (AC2 format)
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .slice(0, 15);
        const fileName = `${tenant.subdomain}_onix30_${timestamp}.xml`;

        return { xml: builder.toXML(), fileName };
      });

      // Story 16.5: Store XML content for preview/retry functionality
      await step.run("store-feed-content", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ feedContent: xml })
          .where(eq(channelFeeds.id, feedId));
      });

      // Step 7: Write temp file
      const tempFilePath = await step.run("write-temp-file", async () => {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, xml, "utf-8");
        return filePath;
      });

      // Step 8: Upload to Ingram (AC3: FTPS upload)
      const uploadResult = await step.run("upload-to-ingram", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, feedId));

        return await uploadToIngram(credentials, tempFilePath, fileName);
      });

      // Step 9: Get file size BEFORE cleanup
      const fileSize = await step.run("get-file-size", async () => {
        const stats = await fs.stat(tempFilePath).catch(() => null);
        return stats?.size || xml.length;
      });

      // Step 10: Clean up temp file
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
              productCount: titlesToExport.length,
              fileSize,
              fileName,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, feedId));
        });

        return {
          success: true,
          feedId,
          productCount: titlesToExport.length,
          fileName,
        };
      } else {
        throw new Error(uploadResult.message);
      }
    } catch (error) {
      // Mark feed as failed
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, feedId));

      throw error; // Re-throw for Inngest retry (AC7)
    }
  },
);

/**
 * Ingram Feed Retry Job
 *
 * Story 16.5 - AC4: Retry Failed Feeds
 * Re-attempts upload using stored XML content from original feed.
 */
export const ingramFeedRetry = inngest.createFunction(
  {
    id: "ingram-feed-retry",
    retries: 2,
  },
  { event: "channel/ingram.feed-retry" },
  async ({ event, step }) => {
    const { tenantId, originalFeedId } = event.data as {
      tenantId: string;
      originalFeedId: string;
      userId?: string;
    };

    // Get original feed with content
    const originalFeed = await step.run("get-original-feed", async () => {
      return adminDb.query.channelFeeds.findFirst({
        where: and(
          eq(channelFeeds.id, originalFeedId),
          eq(channelFeeds.tenantId, tenantId),
        ),
      });
    });

    if (!originalFeed?.feedContent) {
      throw new Error("Original feed content not found");
    }

    // Capture feed content - validated above so safe to use in closures
    const feedContent = originalFeed.feedContent;

    // Create new retry feed record
    const retryFeedId = await step.run("create-retry-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType: originalFeed.feedType,
          triggeredBy: "manual",
          productCount: originalFeed.productCount,
          feedContent,
          fileName: originalFeed.fileName,
          retryOf: originalFeedId,
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

      // Write temp file
      const tempFilePath = await step.run("write-temp-file", async () => {
        const tempDir = os.tmpdir();
        const filePath = path.join(
          tempDir,
          originalFeed.fileName || `retry-${retryFeedId}.xml`,
        );
        await fs.writeFile(filePath, feedContent, "utf-8");
        return filePath;
      });

      // Upload to Ingram
      const uploadResult = await step.run("upload-to-ingram", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, retryFeedId));
        return await uploadToIngram(
          credentials,
          tempFilePath,
          originalFeed.fileName || `retry-${retryFeedId}.xml`,
        );
      });

      // Get file size
      const fileSize = await step.run("get-file-size", async () => {
        const stats = await fs.stat(tempFilePath).catch(() => null);
        return stats?.size || feedContent.length;
      });

      // Cleanup temp file
      await step.run("cleanup", async () => {
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      });

      if (uploadResult.success) {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              fileSize,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, retryFeedId));
        });

        return { success: true, retryFeedId };
      } else {
        throw new Error(uploadResult.message);
      }
    } catch (error) {
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Retry failed",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, retryFeedId));

      throw error;
    }
  },
);

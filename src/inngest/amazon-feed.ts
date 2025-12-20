/**
 * Inngest: Amazon ONIX Feed Background Job
 *
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 *
 * Processing Steps:
 * 1. Create feed record with 'pending' status
 * 2. Get tenant's titles (all or changed-only based on feedType)
 * 3. Generate ONIX 3.1 XML using ONIXMessageBuilder
 * 4. Create feed document (get pre-signed S3 URL)
 * 5. Upload ONIX XML to S3
 * 6. Create feed submission
 * 7. Poll for completion status
 * 8. Update feed record with success/failure
 *
 * Key Differences from Ingram (Story 16.2):
 * - Uses SP-API Feeds (HTTP) instead of FTPS
 * - Uses ONIX 3.1 instead of 3.0
 * - Multi-step process with status polling
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 * where there's no authenticated session for PostgreSQL RLS policies.
 */

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
import { webhookEvents } from "@/modules/api/webhooks/dispatcher";
import {
  type AmazonCredentials,
  getRegionForMarketplace,
} from "@/modules/channels/adapters/amazon/api-client";
import {
  createFeed,
  createFeedDocument,
  getFeedStatus,
  uploadFeedContent,
} from "@/modules/channels/adapters/amazon/feeds-api-client";
import type { AmazonStoredCredentials } from "@/modules/channels/adapters/amazon/schema";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import {
  getTitlesWithAuthorsAdminBatch,
  type TitleWithAuthors,
} from "@/modules/title-authors/queries";
import { inngest } from "./client";
import { createFeedNotificationAdmin } from "./notification-helpers";

/**
 * Event payload for Amazon feed generation
 */
interface AmazonFeedEventData {
  tenantId: string;
  feedType: "full" | "delta";
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

/**
 * Amazon Feed Background Job
 *
 * AC2: Generates ONIX 3.1 format (Amazon's supported)
 * AC3: Uploads via SP-API Feeds with 60-second timeout and retry
 * AC5: Polls for completion status (every 30 seconds, max 10 minutes)
 * AC6: Supports delta feeds (changed titles only)
 * AC7: 3 retries with exponential backoff, persistent failures update channel status to 'error'
 */
export const amazonFeed = inngest.createFunction(
  {
    id: "amazon-feed",
    retries: 3,
    onFailure: async ({ event }) => {
      // AC7: "persistent failures update channel status to 'error'"
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
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
          ),
        );
    },
  },
  { event: "channel/amazon.feed" },
  async ({ event, step }) => {
    const { tenantId, feedType, triggeredBy } =
      event.data as AmazonFeedEventData;

    // Step 1: Create feed record
    const feedId = await step.run("create-feed-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.AMAZON,
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
      const storedCredentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
          ),
        });

        if (!cred) throw new Error("Amazon credentials not configured");

        return JSON.parse(
          decryptCredentials(cred.credentials),
        ) as AmazonStoredCredentials;
      });

      // Build API credentials from stored credentials
      const apiCredentials: AmazonCredentials = {
        accessKeyId: storedCredentials.accessKeyId,
        secretAccessKey: storedCredentials.secretAccessKey,
        marketplaceId: storedCredentials.marketplaceId,
        region: getRegionForMarketplace(storedCredentials.marketplaceCode),
      };

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
        // Get last successful feed for delta calculation (AC6)
        let lastSuccessfulFeed = null;
        if (feedType === "delta") {
          lastSuccessfulFeed = await adminDb.query.channelFeeds.findFirst({
            where: and(
              eq(channelFeeds.tenantId, tenantId),
              eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
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

        // Batch fetch authors for all titles (Story 17.2: avoid N+1 query)
        const titleIds = filteredTitles.map((t) => t.id);
        const titlesWithAuthors = await getTitlesWithAuthorsAdminBatch(
          titleIds,
          tenantId,
        );

        return titlesWithAuthors;
      });

      // Step 5: Check if we have titles to export (AC6)
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

      // Step 6: Generate ONIX 3.1 XML (AC2)
      const { xml, fileName } = await step.run("generate-onix", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, feedId));

        // Use ONIX 3.1 for Amazon (per AC2)
        // NOTE: AC2 mentions "ASIN mapping if available" - ASIN is assigned BY Amazon
        // after product submission, not provided by publishers. Including ASIN in
        // subsequent feeds would require: (1) an ASIN field on titles table,
        // (2) parsing feed results to capture returned ASINs. This is out of scope
        // for Story 17.2 and would be a separate enhancement.
        const builder = new ONIXMessageBuilder(
          tenantId,
          {
            id: tenant.id,
            name: tenant.name,
            email: null,
            subdomain: tenant.subdomain,
            default_currency: tenant.default_currency || "USD",
          },
          "3.1", // Amazon uses ONIX 3.1
        );

        // Note: Inngest serializes step returns through JSON, so Date fields become strings.
        for (const title of titlesToExport as unknown as TitleWithAuthors[]) {
          builder.addTitle(title);
        }

        // Generate filename with timestamp (AC2 format)
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .slice(0, 15);
        const fileName = `${tenant.subdomain}_onix31_amazon_${timestamp}.xml`;

        return { xml: builder.toXML(), fileName };
      });

      // Store XML content for preview/retry functionality
      await step.run("store-feed-content", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ feedContent: xml, fileName })
          .where(eq(channelFeeds.id, feedId));
      });

      // Step 7: Create feed document (get pre-signed upload URL)
      const feedDocument = await step.run("create-feed-document", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, feedId));

        return await createFeedDocument(apiCredentials);
      });

      // Step 8: Upload ONIX XML to S3 (AC3)
      const uploadResult = await step.run("upload-to-s3", async () => {
        return await uploadFeedContent(feedDocument.url, xml);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "S3 upload failed");
      }

      // Step 9: Create feed submission
      const feedSubmission = await step.run("create-feed", async () => {
        return await createFeed(apiCredentials, feedDocument.feedDocumentId);
      });

      // Store Amazon feed ID in metadata
      await step.run("store-amazon-feed-id", async () => {
        const existingFeed = await adminDb.query.channelFeeds.findFirst({
          where: eq(channelFeeds.id, feedId),
        });
        const existingMetadata =
          (existingFeed?.metadata as Record<string, unknown>) || {};

        await adminDb
          .update(channelFeeds)
          .set({
            metadata: {
              ...existingMetadata,
              amazonFeedId: feedSubmission.feedId,
              feedDocumentId: feedDocument.feedDocumentId,
            },
          })
          .where(eq(channelFeeds.id, feedId));
      });

      // Step 10: Poll for completion status (AC5)
      // Use step.sleep for proper Inngest checkpointing during long waits
      let feedStatus = await step.run("get-initial-status", async () => {
        return await getFeedStatus(apiCredentials, feedSubmission.feedId);
      });

      let pollAttempts = 0;
      const maxPollAttempts = 20; // 10 minutes at 30 second intervals

      while (
        (feedStatus.processingStatus === "IN_PROGRESS" ||
          feedStatus.processingStatus === "IN_QUEUE") &&
        pollAttempts < maxPollAttempts
      ) {
        // AC5: Poll every 30 seconds
        await step.sleep(`poll-wait-${pollAttempts}`, "30 seconds");

        feedStatus = await step.run(`poll-status-${pollAttempts}`, async () => {
          return await getFeedStatus(apiCredentials, feedSubmission.feedId);
        });

        pollAttempts++;
      }

      // Check final status
      if (feedStatus.processingStatus === "DONE") {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              productCount: titlesToExport.length,
              fileSize: xml.length,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, feedId));
        });

        // Fire-and-forget webhook dispatch (Story 15.5)
        webhookEvents
          .onixExported(tenantId, {
            id: feedId,
            channel: "amazon",
            format: "ONIX 3.1",
            titleCount: titlesToExport.length,
            fileName,
          })
          .catch(() => {}); // Ignore errors

        // Create success notification (Story 20.2)
        await step.run("create-success-notification", async () => {
          await createFeedNotificationAdmin(tenantId, {
            success: true,
            channel: "Amazon",
            productCount: titlesToExport.length,
            feedId,
          });
        });

        return {
          success: true,
          feedId,
          amazonFeedId: feedSubmission.feedId,
          productCount: titlesToExport.length,
          fileName,
        };
      } else if (
        feedStatus.processingStatus === "FATAL" ||
        feedStatus.processingStatus === "CANCELLED"
      ) {
        const errorMessage = `Amazon feed processing ${feedStatus.processingStatus}`;
        throw new Error(errorMessage);
      } else {
        // Timed out waiting for processing
        throw new Error("Feed processing timed out after 10 minutes");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Mark feed as failed
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, feedId));

      // Create failure notification (Story 20.2)
      await createFeedNotificationAdmin(tenantId, {
        success: false,
        channel: "Amazon",
        productCount: 0,
        feedId,
        errorMessage,
      });

      throw error; // Re-throw for Inngest retry (AC7)
    }
  },
);

/**
 * Amazon Feed Retry Job
 *
 * Story 17.5 - AC4: Retry Failed Feeds
 * Re-attempts upload using stored XML content from original feed.
 *
 * CRITICAL: Must follow same multi-step flow as main amazonFeed:
 * 1. createFeedDocument - Get pre-signed S3 URL
 * 2. uploadFeedContent - Upload XML to S3
 * 3. createFeed - Submit to Amazon
 * 4. getFeedStatus - Poll for completion
 */
export const amazonFeedRetry = inngest.createFunction(
  {
    id: "amazon-feed-retry",
    retries: 2,
    // Note: Intentionally no onFailure handler (unlike main amazonFeed).
    // Retry failures don't indicate channel misconfiguration - they're
    // user-initiated attempts on already-failed feeds. The feed record
    // status is updated to 'failed' in the catch block below.
  },
  { event: "channel/amazon.feed-retry" },
  async ({ event, step }) => {
    const { tenantId, originalFeedId } = event.data as {
      tenantId: string;
      originalFeedId: string;
      userId?: string;
    };

    // Step 1: Get original feed with content
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

    // Capture feed content for closures
    const feedContent = originalFeed.feedContent;
    const fileName = originalFeed.fileName || `retry-${originalFeedId}.xml`;

    // Step 2: Create new retry feed record
    const retryFeedId = await step.run("create-retry-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.AMAZON,
          status: FEED_STATUS.PENDING,
          feedType: originalFeed.feedType,
          triggeredBy: "manual",
          productCount: originalFeed.productCount,
          feedContent,
          fileName,
          retryOf: originalFeedId,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    try {
      // Step 3: Get credentials
      const storedCredentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
          ),
        });
        if (!cred) throw new Error("Amazon credentials not configured");
        return JSON.parse(
          decryptCredentials(cred.credentials),
        ) as AmazonStoredCredentials;
      });

      // Build API credentials
      const apiCredentials: AmazonCredentials = {
        accessKeyId: storedCredentials.accessKeyId,
        secretAccessKey: storedCredentials.secretAccessKey,
        marketplaceId: storedCredentials.marketplaceId,
        region: getRegionForMarketplace(storedCredentials.marketplaceCode),
      };

      // Step 4: Create feed document (get pre-signed S3 URL)
      const feedDocument = await step.run("create-feed-document", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, retryFeedId));

        return await createFeedDocument(apiCredentials);
      });

      // Step 5: Upload XML to S3
      const uploadResult = await step.run("upload-to-s3", async () => {
        return await uploadFeedContent(feedDocument.url, feedContent);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "S3 upload failed");
      }

      // Step 6: Create feed submission
      const feedSubmission = await step.run("create-feed", async () => {
        return await createFeed(apiCredentials, feedDocument.feedDocumentId);
      });

      // Store Amazon feed ID in metadata
      await step.run("store-amazon-feed-id", async () => {
        await adminDb
          .update(channelFeeds)
          .set({
            metadata: {
              ...((originalFeed.metadata as Record<string, unknown>) || {}),
              amazonFeedId: feedSubmission.feedId,
              feedDocumentId: feedDocument.feedDocumentId,
              retryOf: originalFeedId,
            },
          })
          .where(eq(channelFeeds.id, retryFeedId));
      });

      // Step 7: Poll for completion status (same as main amazonFeed)
      let feedStatus = await step.run("get-initial-status", async () => {
        return await getFeedStatus(apiCredentials, feedSubmission.feedId);
      });

      let pollAttempts = 0;
      const maxPollAttempts = 20; // 10 minutes at 30 second intervals

      while (
        (feedStatus.processingStatus === "IN_PROGRESS" ||
          feedStatus.processingStatus === "IN_QUEUE") &&
        pollAttempts < maxPollAttempts
      ) {
        await step.sleep(`poll-wait-${pollAttempts}`, "30 seconds");

        feedStatus = await step.run(`poll-status-${pollAttempts}`, async () => {
          return await getFeedStatus(apiCredentials, feedSubmission.feedId);
        });

        pollAttempts++;
      }

      // Step 8: Handle final status
      if (feedStatus.processingStatus === "DONE") {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              fileSize: feedContent.length,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, retryFeedId));
        });

        // Create success notification (Story 20.2)
        await createFeedNotificationAdmin(tenantId, {
          success: true,
          channel: "Amazon",
          productCount: originalFeed.productCount || 0,
          feedId: retryFeedId,
        });

        return {
          success: true,
          retryFeedId,
          amazonFeedId: feedSubmission.feedId,
        };
      } else if (
        feedStatus.processingStatus === "FATAL" ||
        feedStatus.processingStatus === "CANCELLED"
      ) {
        throw new Error(
          `Amazon feed processing ${feedStatus.processingStatus}`,
        );
      } else {
        throw new Error("Feed processing timed out after 10 minutes");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Retry failed";

      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, retryFeedId));

      // Create failure notification (Story 20.2)
      await createFeedNotificationAdmin(tenantId, {
        success: false,
        channel: "Amazon",
        productCount: 0,
        feedId: retryFeedId,
        errorMessage,
      });

      throw error;
    }
  },
);

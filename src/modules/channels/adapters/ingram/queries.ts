import { auth } from "@clerk/nextjs/server";
import { and, eq, gte } from "drizzle-orm";
import { adminDb } from "@/db";
import { users } from "@/db/schema";
import {
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import { channelFeeds, FEED_TYPE } from "@/db/schema/channel-feeds";
import type { IngramSchedule, IngramStatus } from "./types";

/**
 * Ingram Channel Queries
 *
 * Story 16.1 - Configure Ingram Account Connection
 */

/**
 * Get the current Ingram integration status for the current tenant
 *
 * @returns IngramStatus or null if not configured
 */
export async function getIngramStatus(): Promise<IngramStatus | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Get user's tenant
  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    return null;
  }

  const credential = await adminDb.query.channelCredentials.findFirst({
    where: and(
      eq(channelCredentials.tenantId, user.tenant_id),
      eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
    ),
  });

  if (!credential) {
    return null;
  }

  return {
    connected: credential.status === "active",
    lastTest: credential.lastConnectionTest,
    lastStatus: credential.lastConnectionStatus,
  };
}

/**
 * Check if Ingram is configured for the current tenant
 *
 * @returns boolean indicating if Ingram credentials exist
 */
export async function isIngramConfigured(): Promise<boolean> {
  const status = await getIngramStatus();
  return status !== null;
}

/**
 * Get the current feed schedule for Ingram
 *
 * Story 16.2 - AC1: Feed Schedule Configuration
 * @returns IngramSchedule or null if not configured
 */
export async function getIngramSchedule(): Promise<IngramSchedule | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    return null;
  }

  const credential = await adminDb.query.channelCredentials.findFirst({
    where: and(
      eq(channelCredentials.tenantId, user.tenant_id),
      eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
    ),
  });

  if (!credential?.metadata) {
    return null;
  }

  const metadata = credential.metadata as { schedule?: IngramSchedule };
  return metadata.schedule || null;
}

/**
 * Get feed history for Ingram channel
 *
 * Story 16.2 - AC5: Feed History
 * Returns feeds from the last 90 days per AC5 requirement.
 * @returns Array of channel feeds for display
 */
export async function getIngramFeedHistory(limit = 50) {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }

  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    return [];
  }

  // AC5: "history shows last 90 days"
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return adminDb.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
      gte(channelFeeds.createdAt, ninetyDaysAgo),
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}

/**
 * Get order import history for tenant
 *
 * Story 16.3 - AC5: Flag Unmatched ISBNs for Review
 * AC7: Ingestion history recorded in channel_feeds
 *
 * Returns imports (feedType='import') from the last 90 days.
 * @returns Array of import feeds with metadata including unmatched ISBNs
 */
export async function getIngramImportHistory(limit = 50) {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }

  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    return [];
  }

  // Get imports from the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return adminDb.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
      eq(channelFeeds.feedType, FEED_TYPE.IMPORT),
      gte(channelFeeds.createdAt, ninetyDaysAgo),
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}

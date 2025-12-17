import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminDb } from "@/db";
import { users } from "@/db/schema";
import {
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import { channelFeeds } from "@/db/schema/channel-feeds";
import { decryptCredentials } from "@/lib/channel-encryption";
import type { AmazonStoredCredentials } from "./schema";
import type { AmazonSchedule, AmazonStatus } from "./types";

/**
 * Schema for validating stored schedule data from JSONB
 * Ensures corrupted metadata doesn't cause runtime errors
 */
const scheduleSchema = z.object({
  frequency: z.enum(["disabled", "daily", "weekly"]),
  hour: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6).optional(),
  feedType: z.enum(["full", "delta"]),
});

/**
 * Amazon Channel Queries
 *
 * Story 17.1 - Configure Amazon Account Connection
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 */

/**
 * Get the current Amazon integration status for the current tenant
 *
 * Story 17.1 - AC6: Edit and Disconnect
 * @returns AmazonStatus or null if not configured
 */
export async function getAmazonStatus(): Promise<AmazonStatus | null> {
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
      eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
    ),
  });

  if (!credential) {
    return null;
  }

  // Decrypt to get programType, marketplace, and accessKeyId for display/edit form
  let programType: string | undefined;
  let marketplace: string | undefined;
  let accessKeyId: string | undefined;

  try {
    const decrypted = decryptCredentials(credential.credentials);
    const creds = JSON.parse(decrypted) as AmazonStoredCredentials;
    programType = creds.programType;
    marketplace = creds.marketplaceCode;
    accessKeyId = creds.accessKeyId; // For pre-populating edit form (AC6)
  } catch {
    // If decrypt fails, still return connected status
  }

  return {
    connected: credential.status === "active",
    programType,
    marketplace,
    accessKeyId,
    lastTest: credential.lastConnectionTest,
    lastStatus: credential.lastConnectionStatus,
  };
}

/**
 * Get the current feed schedule configuration
 *
 * Story 17.2 - AC1: Feed Schedule Configuration
 * @returns AmazonSchedule or null if not configured
 */
export async function getAmazonSchedule(): Promise<AmazonSchedule | null> {
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
      eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
    ),
  });

  if (!credential?.metadata) {
    return null;
  }

  const metadata = credential.metadata as Record<string, unknown>;
  const rawSchedule = metadata.schedule;

  if (!rawSchedule) {
    return null;
  }

  // Validate schedule data to prevent runtime errors from corrupted metadata
  const result = scheduleSchema.safeParse(rawSchedule);
  if (!result.success) {
    console.warn("Invalid Amazon schedule in metadata:", result.error.message);
    return null;
  }

  return result.data;
}

/**
 * Get feed history for the current tenant (ONIX feed exports)
 *
 * Story 17.2 - AC5: Feed Status Polling
 * Story 17.2 - Task 6: Build feed history UI component
 *
 * @param limit Maximum number of feed records to return (default 50)
 * @returns Array of feed records (feedType 'full' or 'delta', excluding imports)
 */
export async function getAmazonFeedHistory(limit = 50) {
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

  const { FEED_TYPE } = await import("@/db/schema/channel-feeds");
  const { or } = await import("drizzle-orm");

  // ONIX feeds are either 'full' or 'delta' type, not 'import'
  const feeds = await adminDb.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
      or(
        eq(channelFeeds.feedType, FEED_TYPE.FULL),
        eq(channelFeeds.feedType, FEED_TYPE.DELTA),
      ),
    ),
    orderBy: desc(channelFeeds.createdAt),
    limit,
  });

  return feeds;
}

/**
 * Get sales import history for the current tenant
 *
 * Story 17.3 - AC8: Import History Tracking
 *
 * @param limit Maximum number of import records to return (default 50)
 * @returns Array of import records
 */
export async function getAmazonSalesImportHistory(limit = 50) {
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

  const { FEED_TYPE } = await import("@/db/schema/channel-feeds");

  const imports = await adminDb.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
      eq(channelFeeds.feedType, FEED_TYPE.IMPORT),
    ),
    orderBy: desc(channelFeeds.createdAt),
    limit,
  });

  return imports;
}

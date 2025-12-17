"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  CHANNEL_STATUS,
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import {
  decryptCredentials,
  encryptCredentials,
} from "@/lib/channel-encryption";
import { getRegionForMarketplace, testAmazonConnection } from "./api-client";
import {
  AMAZON_MARKETPLACES,
  type AmazonCredentialsInput,
  type AmazonMarketplaceCode,
  type AmazonStoredCredentials,
  amazonCredentialsSchema,
} from "./schema";

/**
 * Amazon Channel Server Actions
 *
 * Story 17.1 - Configure Amazon Account Connection
 */

/**
 * Get authenticated user with tenant context
 */
async function getAuthenticatedUserWithTenant() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) throw new Error("No tenant context");
  if (!["owner", "admin"].includes(user.role)) {
    throw new Error("Only owner/admin can manage integrations");
  }

  return user;
}

/**
 * Test Amazon API connection
 *
 * Story 17.1 - AC3: Connection Testing
 */
export async function testAmazonConnectionAction(
  input: AmazonCredentialsInput,
): Promise<{ success: boolean; message: string; sellerName?: string }> {
  try {
    await getAuthenticatedUserWithTenant();

    const validation = amazonCredentialsSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: "Invalid credentials format" };
    }

    const marketplace =
      AMAZON_MARKETPLACES[input.marketplace as AmazonMarketplaceCode];
    const region = getRegionForMarketplace(
      input.marketplace as AmazonMarketplaceCode,
    );

    return await testAmazonConnection({
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
      marketplaceId: marketplace.id,
      region,
    });
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Test failed",
    };
  }
}

/**
 * Save Amazon credentials
 *
 * Story 17.1 - AC4, AC5: Credential Validation and Secure Storage
 *
 * CRITICAL: Follows Ingram pattern for credential updates.
 * When secretAccessKey is empty on update, keeps existing value from DB.
 */
export async function saveAmazonCredentials(
  input: AmazonCredentialsInput,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check for existing credentials first
    const existing = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
      ),
    });

    // Determine if this is an update with blank secret (AC6 - Edit pattern)
    const isUpdate = !!existing;
    const secretProvided =
      input.secretAccessKey && input.secretAccessKey.length > 0;

    // Build final credentials - merge existing secret if updating with blank
    let finalSecretAccessKey: string;

    if (isUpdate && !secretProvided) {
      // Updating without new secret - use existing (follows Ingram pattern)
      const existingDecrypted = decryptCredentials(existing.credentials);
      const existingCreds = JSON.parse(
        existingDecrypted,
      ) as AmazonStoredCredentials;
      finalSecretAccessKey = existingCreds.secretAccessKey;
    } else if (!isUpdate && !secretProvided) {
      // New credentials but no secret - validation error
      return {
        success: false,
        message: "Secret Access Key is required for new connections",
      };
    } else {
      // New credentials or update with new secret
      finalSecretAccessKey = input.secretAccessKey;
    }

    // Build final input with resolved secret
    const finalInput = { ...input, secretAccessKey: finalSecretAccessKey };

    const validation = amazonCredentialsSchema.safeParse(finalInput);
    if (!validation.success) {
      return {
        success: false,
        message: `Validation failed: ${validation.error.message}`,
      };
    }

    // Test connection before saving (AC3)
    const testResult = await testAmazonConnectionAction(finalInput);
    if (!testResult.success) {
      return {
        success: false,
        message: `Connection test failed: ${testResult.message}`,
      };
    }

    const marketplace =
      AMAZON_MARKETPLACES[input.marketplace as AmazonMarketplaceCode];
    const storedCredentials: AmazonStoredCredentials = {
      programType: finalInput.programType,
      accessKeyId: finalInput.accessKeyId,
      secretAccessKey: finalSecretAccessKey,
      marketplaceId: marketplace.id,
      marketplaceCode: finalInput.marketplace as AmazonMarketplaceCode,
      lwaClientId: finalInput.lwaClientId,
      lwaClientSecret: finalInput.lwaClientSecret,
      refreshToken: finalInput.refreshToken,
    };

    const encryptedCredentials = encryptCredentials(
      JSON.stringify(storedCredentials),
    );
    const now = new Date();

    if (existing) {
      await db
        .update(channelCredentials)
        .set({
          credentials: encryptedCredentials,
          status: CHANNEL_STATUS.ACTIVE,
          lastConnectionTest: now,
          lastConnectionStatus: "Connection successful",
          updatedAt: now,
        })
        .where(eq(channelCredentials.id, existing.id));
    } else {
      await db.insert(channelCredentials).values({
        tenantId: user.tenant_id,
        channel: CHANNEL_TYPES.AMAZON,
        credentials: encryptedCredentials,
        status: CHANNEL_STATUS.ACTIVE,
        lastConnectionTest: now,
        lastConnectionStatus: "Connection successful",
      });
    }

    revalidatePath("/settings/integrations");
    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Credentials saved successfully" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save credentials",
    };
  }
}

/**
 * Disconnect Amazon integration
 *
 * Story 17.1 - AC6: Edit and Disconnect
 */
export async function disconnectAmazon(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    await db
      .delete(channelCredentials)
      .where(
        and(
          eq(channelCredentials.tenantId, user.tenant_id),
          eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
        ),
      );

    revalidatePath("/settings/integrations");
    revalidatePath("/settings/integrations/amazon");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to disconnect",
    };
  }
}

/**
 * Save feed schedule configuration
 *
 * Story 17.2 - AC1: Feed Schedule Configuration
 * Stores schedule in channelCredentials.metadata JSONB field
 */
export async function saveAmazonSchedule(schedule: {
  frequency: "disabled" | "daily" | "weekly";
  hour: number;
  dayOfWeek?: number;
  feedType: "full" | "delta";
}): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Find existing Amazon credentials
    const existing = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
      ),
    });

    if (!existing) {
      return { success: false, message: "Amazon is not configured" };
    }

    // Get existing metadata and merge with new schedule
    const existingMetadata =
      (existing.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      schedule: {
        frequency: schedule.frequency,
        hour: schedule.hour,
        ...(schedule.frequency === "weekly" && {
          dayOfWeek: schedule.dayOfWeek,
        }),
        feedType: schedule.feedType,
      },
    };

    // Update metadata with schedule
    await db
      .update(channelCredentials)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(channelCredentials.id, existing.id));

    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Schedule saved" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save schedule",
    };
  }
}

/**
 * Trigger manual Amazon feed
 *
 * Story 17.2 - AC4: Manual Feed Trigger
 * Sends Inngest event to generate and upload ONIX feed immediately
 *
 * Rate limited: Only one feed per minute per tenant to prevent API abuse
 */
export async function triggerAmazonFeed(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check Amazon is configured
    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
      ),
    });

    if (!credentials) {
      return { success: false, message: "Amazon is not configured" };
    }

    // Rate limiting: Check for recent pending/in-progress feeds (1 minute cooldown)
    const { channelFeeds } = await import("@/db/schema/channel-feeds");
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentFeed = await db.query.channelFeeds.findFirst({
      where: and(
        eq(channelFeeds.tenantId, user.tenant_id),
        eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
        sql`${channelFeeds.createdAt} > ${oneMinuteAgo}`,
      ),
    });

    if (recentFeed) {
      return {
        success: false,
        message: "Please wait at least 1 minute between feed requests",
      };
    }

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/amazon.feed",
      data: {
        tenantId: user.tenant_id,
        feedType: "full", // Manual triggers send all titles
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Feed generation started" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to trigger feed",
    };
  }
}

/**
 * Trigger manual Amazon sales import
 *
 * Story 17.3 - AC9: Manual Import Trigger
 * Sends Inngest event to import sales data from Amazon immediately
 *
 * Rate limited: Only one import per minute per tenant to prevent API abuse
 */
export async function triggerAmazonSalesImport(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check Amazon is configured
    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
      ),
    });

    if (!credentials) {
      return { success: false, message: "Amazon is not configured" };
    }

    if (credentials.status !== CHANNEL_STATUS.ACTIVE) {
      return { success: false, message: "Amazon connection is not active" };
    }

    // Rate limiting: Check for recent pending/in-progress imports (1 minute cooldown)
    const { channelFeeds, FEED_TYPE } = await import(
      "@/db/schema/channel-feeds"
    );
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentImport = await db.query.channelFeeds.findFirst({
      where: and(
        eq(channelFeeds.tenantId, user.tenant_id),
        eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
        eq(channelFeeds.feedType, FEED_TYPE.IMPORT),
        sql`${channelFeeds.createdAt} > ${oneMinuteAgo}`,
      ),
    });

    if (recentImport) {
      return {
        success: false,
        message: "Please wait at least 1 minute between import requests",
      };
    }

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/amazon.sales-import",
      data: {
        tenantId: user.tenant_id,
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Sales import started" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to trigger import",
    };
  }
}

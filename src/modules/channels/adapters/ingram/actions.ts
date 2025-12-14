"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
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
import { ingramCredentialsSchema } from "./schema";
import type { ConnectionTestResult, IngramCredentials } from "./types";

/**
 * Input type for save action - password can be empty string for updates
 */
interface SaveIngramCredentialsInput {
  host: string;
  username: string;
  password: string; // Can be empty string for updates
  port: number;
}

/**
 * Ingram Channel Actions
 *
 * Story 16.1 - Configure Ingram Account Connection
 * Server actions for credential management
 */

/**
 * Helper to get authenticated user with tenant
 */
async function getAuthenticatedUserWithTenant() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.tenant_id) {
    throw new Error("No tenant associated with user");
  }

  // Check role - only owner/admin can manage integrations
  if (user.role !== "owner" && user.role !== "admin") {
    throw new Error("Insufficient permissions - owner or admin role required");
  }

  // Return with tenant_id guaranteed non-null (validated above)
  return { ...user, tenant_id: user.tenant_id };
}

/**
 * Test connection to Ingram FTPS server
 *
 * AC2: Connection Testing
 * - Attempts FTPS connection
 * - 10-second timeout
 * - Returns success/failure with message
 */
export async function testIngramConnectionAction(
  credentials: IngramCredentials,
): Promise<ConnectionTestResult> {
  // Validate credentials first
  const validation = ingramCredentialsSchema.safeParse(credentials);
  if (!validation.success) {
    return {
      success: false,
      message: `Invalid credentials: ${validation.error.message}`,
    };
  }

  // Import dynamically to avoid issues if basic-ftp is not installed
  try {
    const { testIngramConnection } = await import("./ftp-client");
    return await testIngramConnection(credentials);
  } catch (error) {
    // If basic-ftp is not installed or connection fails
    if (
      error instanceof Error &&
      error.message.includes("Cannot find module")
    ) {
      return {
        success: false,
        message: "FTP client not available. Run: pnpm add basic-ftp@^5.0.0",
      };
    }
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

/**
 * Save Ingram credentials
 *
 * AC1, AC3, AC4, AC5: Credential Configuration, Validation, Secure Storage, Edit
 * - Validates required fields
 * - Tests connection before saving
 * - Encrypts credentials at rest
 * - Supports updating without re-entering password (AC5)
 */
export async function saveIngramCredentials(
  input: SaveIngramCredentialsInput,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check for existing credentials first
    const existing = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
      ),
    });

    // Determine if this is an update with blank password (AC5)
    const isUpdate = !!existing;
    const passwordProvided = input.password && input.password.length > 0;

    // Build final credentials - merge existing password if updating with blank password
    let finalCredentials: IngramCredentials;

    if (isUpdate && !passwordProvided) {
      // Updating without new password - use existing password (AC5)
      const existingDecrypted = decryptCredentials(existing.credentials);
      const existingCreds = JSON.parse(existingDecrypted) as IngramCredentials;

      finalCredentials = {
        host: input.host,
        username: input.username,
        password: existingCreds.password, // Keep existing password
        port: input.port,
      };
    } else if (!isUpdate && !passwordProvided) {
      // New credentials but no password - validation error
      return {
        success: false,
        message: "Password is required for new connections",
      };
    } else {
      // New credentials or update with new password
      finalCredentials = {
        host: input.host,
        username: input.username,
        password: input.password,
        port: input.port,
      };
    }

    // Validate final credentials (must have password at this point)
    const validation = ingramCredentialsSchema.safeParse(finalCredentials);
    if (!validation.success) {
      return {
        success: false,
        message: `Validation failed: ${validation.error.message}`,
      };
    }

    // Test connection before saving (AC3)
    const testResult = await testIngramConnectionAction(finalCredentials);
    if (!testResult.success) {
      return {
        success: false,
        message: `Connection test failed: ${testResult.message}`,
      };
    }

    // Encrypt credentials (AC4)
    const encryptedCredentials = encryptCredentials(
      JSON.stringify(finalCredentials),
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
        channel: CHANNEL_TYPES.INGRAM,
        credentials: encryptedCredentials,
        status: CHANNEL_STATUS.ACTIVE,
        lastConnectionTest: now,
        lastConnectionStatus: "Connection successful",
      });
    }

    revalidatePath("/settings/integrations");
    revalidatePath("/settings/integrations/ingram");

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
 * Disconnect Ingram integration
 *
 * AC5: Edit and Disconnect
 * - Removes credentials from database
 */
export async function disconnectIngram(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    await db
      .delete(channelCredentials)
      .where(
        and(
          eq(channelCredentials.tenantId, user.tenant_id),
          eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
        ),
      );

    revalidatePath("/settings/integrations");
    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Disconnected from Ingram" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to disconnect",
    };
  }
}

/**
 * Get decrypted credentials (for internal use only)
 * Used by feed scheduler to connect to Ingram
 */
export async function getDecryptedIngramCredentials(): Promise<IngramCredentials | null> {
  const user = await getAuthenticatedUserWithTenant();

  const credential = await db.query.channelCredentials.findFirst({
    where: and(
      eq(channelCredentials.tenantId, user.tenant_id),
      eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
    ),
  });

  if (!credential) {
    return null;
  }

  const decrypted = decryptCredentials(credential.credentials);
  return JSON.parse(decrypted) as IngramCredentials;
}

/**
 * Save feed schedule configuration
 *
 * Story 16.2 - AC1: Feed Schedule Configuration
 * Stores schedule in channelCredentials.metadata JSONB field
 */
export async function saveIngramSchedule(schedule: {
  frequency: "disabled" | "daily" | "weekly";
  hour: number;
  dayOfWeek?: number;
  feedType: "full" | "delta";
}): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Find existing Ingram credentials
    const existing = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
      ),
    });

    if (!existing) {
      return { success: false, message: "Ingram is not configured" };
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

    revalidatePath("/settings/integrations/ingram");

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
 * Trigger manual Ingram feed
 *
 * Story 16.2 - AC4: Manual Feed Trigger
 * Sends Inngest event to generate and upload ONIX feed immediately
 */
export async function triggerIngramFeed(): Promise<{
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

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.feed",
      data: {
        tenantId: user.tenant_id,
        feedType: "full", // Manual triggers send all titles
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

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
 * Trigger manual Ingram order import
 *
 * Story 16.3 - AC7: Manual Import Trigger
 * Sends Inngest event to download and process order files immediately
 */
export async function triggerIngramOrderImport(): Promise<{
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

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.orders",
      data: {
        tenantId: user.tenant_id,
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Order import started" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to trigger import",
    };
  }
}

"use server";

/**
 * Notification Preferences Server Actions
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Server actions for saving and fetching notification preferences.
 */

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
  notificationPreferences,
} from "@/db/schema/notification-preferences";
import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { getUserPreferences } from "./queries";
import type { FetchPreferencesResponse } from "./types";

/**
 * Schema for preference input validation.
 */
const preferenceSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES as unknown as [string, ...string[]]),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

const savePreferencesInputSchema = z.object({
  preferences: z.array(preferenceSchema),
});

export type SavePreferencesInput = z.infer<typeof savePreferencesInputSchema>;

/**
 * Fetch user's notification preferences.
 * AC 20.3.2: Current preferences loaded from database.
 */
export async function fetchUserPreferences(): Promise<
  ActionResult<FetchPreferencesResponse>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const preferences = await getUserPreferences(user.id);

    return {
      success: true,
      data: { preferences },
    };
  } catch (error) {
    console.error("fetchUserPreferences error:", error);
    return {
      success: false,
      error: "Failed to fetch notification preferences",
    };
  }
}

/**
 * Save user's notification preferences.
 * AC 20.3.4: Preferences persisted to database.
 * AC 20.3.8: Per-user preference storage.
 */
export async function saveNotificationPreferences(
  input: SavePreferencesInput,
): Promise<ActionResult<{ saved: number }>> {
  try {
    // Validate input
    const validated = savePreferencesInputSchema.parse(input);

    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const db = await getDb();

    // Delete existing preferences for this user
    await db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id));

    // Insert new preferences
    if (validated.preferences.length > 0) {
      await db.insert(notificationPreferences).values(
        validated.preferences.map((pref) => ({
          tenantId,
          userId: user.id,
          notificationType: pref.type as NotificationType,
          inAppEnabled: pref.inAppEnabled,
          emailEnabled: pref.emailEnabled,
        })),
      );
    }

    revalidatePath("/settings/notifications");

    return {
      success: true,
      data: { saved: validated.preferences.length },
    };
  } catch (error) {
    console.error("saveNotificationPreferences error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return {
      success: false,
      error: "Failed to save notification preferences",
    };
  }
}

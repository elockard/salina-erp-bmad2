/**
 * Notification Preferences Queries
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Database queries for notification preferences.
 * Used by both HTTP context (Server Actions) and background jobs (Inngest).
 */

import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import {
  type NotificationType,
  notificationPreferences,
} from "@/db/schema/notification-preferences";
import { users } from "@/db/schema/users";
import { getDb } from "@/lib/auth";
import { DEFAULT_PREFERENCES, getDefaultPreference } from "../constants";
import type { UserPreference } from "./types";

/**
 * Get all preferences for a user (HTTP context).
 * Returns saved preferences merged with defaults for unsaved types.
 * AC 20.3.2: Current preferences loaded from database.
 */
export async function getUserPreferences(
  userId: string,
): Promise<UserPreference[]> {
  const db = await getDb();

  const saved = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  // Build map of saved preferences
  const savedMap = new Map(saved.map((p) => [p.notificationType, p]));

  // Merge with defaults - return all notification types with effective values
  return DEFAULT_PREFERENCES.map((defaultPref) => {
    const saved = savedMap.get(defaultPref.type);
    return {
      type: defaultPref.type,
      inAppEnabled: saved?.inAppEnabled ?? defaultPref.defaultInApp,
      emailEnabled: saved?.emailEnabled ?? defaultPref.defaultEmail,
    };
  });
}

/**
 * Get single preference for a user and notification type (HTTP context).
 * Returns null if no preference saved (caller should use default).
 */
export async function getUserNotificationPreference(
  userId: string,
  type: NotificationType,
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean } | null> {
  const db = await getDb();

  const [preference] = await db
    .select({
      inAppEnabled: notificationPreferences.inAppEnabled,
      emailEnabled: notificationPreferences.emailEnabled,
    })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, type),
      ),
    )
    .limit(1);

  return preference ?? null;
}

/**
 * Get effective preference for a user (saved or default).
 * Convenience function that handles the null case.
 */
export async function getEffectiveUserPreference(
  userId: string,
  type: NotificationType,
): Promise<{ inApp: boolean; email: boolean }> {
  const saved = await getUserNotificationPreference(userId, type);
  const defaultPref = getDefaultPreference(type);

  return {
    inApp: saved?.inAppEnabled ?? defaultPref.defaultInApp,
    email: saved?.emailEnabled ?? defaultPref.defaultEmail,
  };
}

/**
 * Get all users in a tenant with email enabled for a notification type (Admin context).
 * Used by Inngest jobs to send emails to qualifying users.
 * AC 20.3.6: Email delivery based on preferences.
 */
export async function getUsersWithEmailPreference(
  tenantId: string,
  type: NotificationType,
): Promise<Array<{ id: string; email: string }>> {
  const defaultPref = getDefaultPreference(type);

  // If default email is ON, we need to find users WITHOUT email disabled
  // If default email is OFF, we need to find users WITH email enabled
  if (defaultPref.defaultEmail) {
    // Default is ON - get all users EXCEPT those who explicitly disabled email
    const usersWithEmailDisabled = await adminDb
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.tenantId, tenantId),
          eq(notificationPreferences.notificationType, type),
          eq(notificationPreferences.emailEnabled, false),
        ),
      );

    const disabledUserIds = new Set(
      usersWithEmailDisabled.map((u) => u.userId),
    );

    // Get all tenant users not in the disabled set
    const allUsers = await adminDb
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.tenant_id, tenantId));

    return allUsers
      .filter(
        (u): u is typeof u & { email: string } =>
          !disabledUserIds.has(u.id) && !!u.email,
      )
      .map((u) => ({ id: u.id, email: u.email }));
  }

  // Default is OFF - get users who explicitly enabled email
  const usersWithEmailEnabled = await adminDb
    .select({ userId: notificationPreferences.userId })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.tenantId, tenantId),
        eq(notificationPreferences.notificationType, type),
        eq(notificationPreferences.emailEnabled, true),
      ),
    );

  if (usersWithEmailEnabled.length === 0) {
    return [];
  }

  // Get user emails for those with email enabled
  const userIds = usersWithEmailEnabled.map((u) => u.userId);
  const usersWithEmails = await adminDb
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.tenant_id, tenantId));

  return usersWithEmails
    .filter(
      (u): u is typeof u & { email: string } =>
        userIds.includes(u.id) && !!u.email,
    )
    .map((u) => ({ id: u.id, email: u.email }));
}

/**
 * Check if in-app notifications are enabled for a user/type.
 * Used for query-time filtering of tenant-wide notifications.
 * AC 20.3.7: In-app preference enforcement.
 */
export async function isInAppEnabled(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const pref = await getEffectiveUserPreference(userId, type);
  return pref.inApp;
}

/**
 * Get all in-app preferences for a user as a Map (batch operation).
 * Used to avoid N+1 queries when filtering multiple notifications.
 * Returns Map<NotificationType, boolean> where true = in-app enabled.
 */
export async function getUserInAppPreferencesMap(
  userId: string,
): Promise<Map<NotificationType, boolean>> {
  const preferences = await getUserPreferences(userId);
  return new Map(preferences.map((p) => [p.type, p.inAppEnabled]));
}

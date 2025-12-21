/**
 * Author Notifications Queries
 *
 * Story 21.4 - FR185: Production Milestone Notifications
 *
 * Database queries for author notification preferences.
 * Uses adminDb for background job access (no HTTP context required).
 */

import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { authorNotificationPreferences } from "@/db/schema/author-notification-preferences";
import type { AuthorMilestonePreferences } from "./types";

/**
 * Default preferences - all stages notify, email enabled.
 * Applied when no preference record exists or values are null.
 */
const DEFAULTS = {
  notifyEditing: true,
  notifyDesign: true,
  notifyProof: true,
  notifyPrintReady: true,
  notifyComplete: true,
  emailEnabled: true,
} as const;

/**
 * Get author milestone preferences with defaults applied.
 * Returns null if no preferences exist (caller should use global defaults).
 *
 * @param contactId - The contact ID (author)
 * @param tenantId - The tenant ID
 * @returns Preferences with nulls resolved to defaults, or null if no record
 */
export async function getAuthorMilestonePreferences(
  contactId: string,
  tenantId: string,
): Promise<AuthorMilestonePreferences | null> {
  const [pref] = await adminDb
    .select()
    .from(authorNotificationPreferences)
    .where(
      and(
        eq(authorNotificationPreferences.contactId, contactId),
        eq(authorNotificationPreferences.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!pref) {
    return null;
  }

  // Resolve nulls to defaults
  return {
    contactId: pref.contactId,
    tenantId: pref.tenantId,
    notifyEditing: pref.notifyEditing ?? DEFAULTS.notifyEditing,
    notifyDesign: pref.notifyDesign ?? DEFAULTS.notifyDesign,
    notifyProof: pref.notifyProof ?? DEFAULTS.notifyProof,
    notifyPrintReady: pref.notifyPrintReady ?? DEFAULTS.notifyPrintReady,
    notifyComplete: pref.notifyComplete ?? DEFAULTS.notifyComplete,
    emailEnabled: pref.emailEnabled ?? DEFAULTS.emailEnabled,
  };
}

/**
 * Get effective preferences for an author.
 * Returns defaults if no preferences exist.
 *
 * @param contactId - The contact ID (author)
 * @param tenantId - The tenant ID
 * @returns Preferences (never null - uses defaults if no record)
 */
export async function getEffectiveAuthorPreferences(
  contactId: string,
  tenantId: string,
): Promise<AuthorMilestonePreferences> {
  const prefs = await getAuthorMilestonePreferences(contactId, tenantId);

  if (prefs) {
    return prefs;
  }

  // Return defaults
  return {
    contactId,
    tenantId,
    ...DEFAULTS,
  };
}

/**
 * Notification Constants
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Default notification preferences configuration.
 * Each notification type has configurable in-app and email settings.
 */

import type { NotificationType } from "@/db/schema/notifications";

/**
 * Default preference configuration for each notification type.
 * Used when user hasn't explicitly saved preferences.
 */
export interface DefaultPreference {
  type: NotificationType;
  label: string;
  description: string;
  defaultInApp: boolean;
  defaultEmail: boolean;
}

/**
 * Default preferences for all notification types.
 * AC 20.3.5: New users see these defaults (not persisted until user saves).
 *
 * Email defaults follow criticality:
 * - Critical events (failures, required actions): email ON
 * - Informational events (success, complete): email OFF
 */
export const DEFAULT_PREFERENCES: DefaultPreference[] = [
  {
    type: "feed_success",
    label: "Feed Delivered",
    description: "When an ONIX feed is successfully sent to a channel",
    defaultInApp: true,
    defaultEmail: false,
  },
  {
    type: "feed_failed",
    label: "Feed Failed",
    description: "When an ONIX feed fails to deliver",
    defaultInApp: true,
    defaultEmail: true, // Critical - email default ON
  },
  {
    type: "action_pending_return",
    label: "Return Pending",
    description: "When a return request needs approval",
    defaultInApp: true,
    defaultEmail: true, // Action required - email default ON
  },
  {
    type: "action_low_isbn",
    label: "Low ISBN Inventory",
    description: "When ISBN pool falls below threshold",
    defaultInApp: true,
    defaultEmail: false,
  },
  {
    type: "system_announcement",
    label: "System Announcement",
    description: "Important platform announcements and updates",
    defaultInApp: true,
    defaultEmail: true, // Important - email default ON
  },
  {
    type: "import_complete",
    label: "Import Complete",
    description: "When a CSV import finishes processing",
    defaultInApp: true,
    defaultEmail: false,
  },
  {
    type: "manuscript_submitted",
    label: "Manuscript Submitted",
    description: "When an author submits a new manuscript",
    defaultInApp: true,
    defaultEmail: true, // Action required - email default ON
  },
];

/**
 * Get default preference for a specific notification type.
 */
export function getDefaultPreference(
  type: NotificationType,
): DefaultPreference {
  const pref = DEFAULT_PREFERENCES.find((p) => p.type === type);
  if (!pref) {
    // Fallback for unknown types - safe defaults
    return {
      type,
      label: type,
      description: "",
      defaultInApp: true,
      defaultEmail: false,
    };
  }
  return pref;
}

/**
 * Get effective preference (saved or default).
 * AC 20.3.5: Returns defaults if user hasn't saved preferences.
 */
export function getEffectivePreference(
  savedInApp: boolean | null | undefined,
  savedEmail: boolean | null | undefined,
  type: NotificationType,
): { inApp: boolean; email: boolean } {
  const defaultPref = getDefaultPreference(type);
  return {
    inApp: savedInApp ?? defaultPref.defaultInApp,
    email: savedEmail ?? defaultPref.defaultEmail,
  };
}

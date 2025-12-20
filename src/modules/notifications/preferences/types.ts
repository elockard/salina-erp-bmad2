/**
 * Notification Preferences Types
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import type { NotificationType } from "@/db/schema/notifications";

/**
 * User preference for a single notification type.
 */
export interface UserPreference {
  type: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

/**
 * Form data for saving preferences.
 */
export interface PreferencesFormData {
  preferences: UserPreference[];
}

/**
 * Response from fetching user preferences.
 */
export interface FetchPreferencesResponse {
  preferences: UserPreference[];
}

/**
 * Input for saving preferences action.
 */
export interface SavePreferencesInput {
  preferences: UserPreference[];
}

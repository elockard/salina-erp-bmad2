/**
 * Author Notifications Types
 *
 * Story 21.4 - FR185: Production Milestone Notifications
 *
 * TypeScript interfaces for author notification preferences.
 */

import type { WorkflowStage } from "@/modules/production/schema";

/**
 * Author milestone notification preferences with resolved defaults.
 * All null values are resolved to true (notify by default).
 */
export interface AuthorMilestonePreferences {
  contactId: string;
  tenantId: string;
  // Per-stage preferences (resolved - never null)
  notifyEditing: boolean;
  notifyDesign: boolean;
  notifyProof: boolean;
  notifyPrintReady: boolean;
  notifyComplete: boolean;
  // Email toggle
  emailEnabled: boolean;
}

/**
 * Raw preferences from database (may have null values).
 */
export interface RawAuthorMilestonePreferences {
  id: string;
  contactId: string;
  tenantId: string;
  notifyEditing: boolean | null;
  notifyDesign: boolean | null;
  notifyProof: boolean | null;
  notifyPrintReady: boolean | null;
  notifyComplete: boolean | null;
  emailEnabled: boolean | null;
}

/**
 * Input for updating author milestone preferences.
 */
export interface UpdateMilestonePreferencesInput {
  notifyEditing?: boolean;
  notifyDesign?: boolean;
  notifyProof?: boolean;
  notifyPrintReady?: boolean;
  notifyComplete?: boolean;
  emailEnabled?: boolean;
}

/**
 * Check if a notification should be sent for a specific stage.
 * Returns true for stages that should trigger notifications.
 * manuscript_received never triggers notifications (it's the initial state).
 */
export function shouldNotifyForStage(
  prefs: AuthorMilestonePreferences | null,
  stage: WorkflowStage,
): boolean {
  // No prefs = all defaults = all enabled
  if (!prefs) return stage !== "manuscript_received";

  switch (stage) {
    case "editing":
      return prefs.notifyEditing;
    case "design":
      return prefs.notifyDesign;
    case "proof":
      return prefs.notifyProof;
    case "print_ready":
      return prefs.notifyPrintReady;
    case "complete":
      return prefs.notifyComplete;
    case "manuscript_received":
      return false; // Never notify for initial stage
    default:
      return false;
  }
}

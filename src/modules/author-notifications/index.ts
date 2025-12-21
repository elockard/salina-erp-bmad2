/**
 * Author Notifications Module
 *
 * Story 21.4 - FR185: Production Milestone Notifications
 *
 * Handles author notification preferences for production milestone events.
 */

// Re-export specific items from actions to avoid duplicate export conflict
export {
  fetchAuthorMilestonePreferences,
  updateMilestonePreferences,
} from "./actions";
export * from "./queries";
export * from "./types";

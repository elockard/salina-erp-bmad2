/**
 * Notifications module
 * Story 20.2: Build Notifications Center
 *
 * Re-exports for clean module imports
 */

// Actions
export {
  deleteOldNotifications,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./actions";
// Components
export {
  NotificationBell,
  NotificationEmpty,
  NotificationItem,
  NotificationPanel,
} from "./components";
// Hooks
export { notificationKeys, useNotifications, useUnreadCount } from "./hooks";

// Queries
export {
  getNotificationById,
  getNotifications,
  getUnreadCount,
  hasRecentNotificationOfType,
} from "./queries";
export type {
  AnnouncementNotificationInput,
  CreateNotificationInput,
  FeedNotificationInput,
  ImportCompleteNotificationInput,
  LowIsbnNotificationInput,
  MarkAsReadInput,
  ReturnNotificationInput,
} from "./schema";
// Schemas
export {
  announcementNotificationSchema,
  createNotificationSchema,
  feedNotificationSchema,
  importCompleteNotificationSchema,
  lowIsbnNotificationSchema,
  markAsReadSchema,
  returnNotificationSchema,
} from "./schema";
// Service functions (for use in Inngest jobs)
export {
  createAnnouncementNotification,
  createFeedNotification,
  createImportCompleteNotification,
  createLowIsbnNotification,
  createReturnNotification,
} from "./service";
// Types
export type {
  AnnouncementNotificationMetadata,
  FeedNotificationMetadata,
  ImportNotificationMetadata,
  IsbnNotificationMetadata,
  MarkAsReadResult,
  Notification,
  NotificationsResponse,
  NotificationType,
  ReturnNotificationMetadata,
} from "./types";

/**
 * Notifications module types
 * Story 20.2: Build Notifications Center
 */

import type { Notification as DbNotification } from "@/db/schema/notifications";

export type { NotificationType } from "@/db/schema/notifications";

/**
 * Notification with computed properties for display
 */
export interface Notification extends DbNotification {
  isRead: boolean;
}

/**
 * Notification list response from queries
 */
export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
}

/**
 * Result of marking notifications as read
 */
export interface MarkAsReadResult {
  success: boolean;
  markedCount: number;
}

/**
 * Notification metadata types for different notification types
 */
export interface FeedNotificationMetadata {
  feedId: string;
  channel: string;
  productCount: number;
  errorMessage?: string;
}

export interface ReturnNotificationMetadata {
  returnId: string;
  returnNumber: string;
}

export interface IsbnNotificationMetadata {
  threshold: number;
  currentCount: number;
}

export interface ImportNotificationMetadata {
  importId: string;
  recordCount: number;
  filename?: string;
}

export interface AnnouncementNotificationMetadata {
  externalLink?: string;
}

/**
 * Story 21.4: Production Milestone Notifications
 * Metadata for production stage transition notifications sent to authors
 */
export interface ProductionMilestoneNotificationMetadata {
  titleId: string;
  titleName: string;
  projectId: string;
  previousStage: string;
  newStage: string;
}

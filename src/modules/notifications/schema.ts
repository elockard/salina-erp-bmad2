/**
 * Notifications module Zod schemas
 * Story 20.2: Build Notifications Center
 */

import { z } from "zod";
import { NOTIFICATION_TYPES } from "@/db/schema/notifications";

/**
 * Schema for marking a notification as read
 */
export const markAsReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
});
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

/**
 * Schema for creating a notification (internal use)
 */
export const createNotificationSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  userId: z.string().uuid("Invalid user ID").optional().nullable(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1).max(100, "Title must be 100 characters or less"),
  description: z.string().max(500).optional().nullable(),
  link: z.string().url().max(255).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

/**
 * Schema for feed notification creation
 */
export const feedNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  success: z.boolean(),
  channel: z.string(),
  productCount: z.number().int().min(0),
  feedId: z.string().uuid(),
  errorMessage: z.string().optional(),
});
export type FeedNotificationInput = z.infer<typeof feedNotificationSchema>;

/**
 * Schema for return notification creation
 */
export const returnNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  returnId: z.string().uuid(),
  returnNumber: z.string(),
});
export type ReturnNotificationInput = z.infer<typeof returnNotificationSchema>;

/**
 * Schema for low ISBN notification creation
 */
export const lowIsbnNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  threshold: z.number().int().min(0),
  currentCount: z.number().int().min(0),
});
export type LowIsbnNotificationInput = z.infer<
  typeof lowIsbnNotificationSchema
>;

/**
 * Schema for import complete notification creation
 */
export const importCompleteNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  importId: z.string().uuid(),
  recordCount: z.number().int().min(0),
  filename: z.string().optional(),
});
export type ImportCompleteNotificationInput = z.infer<
  typeof importCompleteNotificationSchema
>;

/**
 * Schema for announcement notification creation
 */
export const announcementNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  link: z.string().url().optional(),
});
export type AnnouncementNotificationInput = z.infer<
  typeof announcementNotificationSchema
>;

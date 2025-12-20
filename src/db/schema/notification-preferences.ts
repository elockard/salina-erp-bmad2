/**
 * Notification Preferences Schema
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Stores per-user notification preferences by type and channel.
 * Each user can configure in-app and email preferences for each notification type.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { NOTIFICATION_TYPES, type NotificationType } from "./notifications";
import { tenants } from "./tenants";
import { users } from "./users";

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationType: varchar("notification_type", { length: 50 })
      .notNull()
      .$type<NotificationType>(),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(false),
  },
  (table) => ({
    // Each user can have one preference per notification type
    userTypeUnique: unique("notification_preferences_user_type_unique").on(
      table.userId,
      table.notificationType,
    ),
    // Index for fetching all preferences for a user
    userIdx: index("notification_preferences_user_idx").on(table.userId),
    // Index for tenant-wide queries (e.g., finding users with email enabled)
    tenantTypeIdx: index("notification_preferences_tenant_type_idx").on(
      table.tenantId,
      table.notificationType,
    ),
  }),
);

// Re-export NOTIFICATION_TYPES and NotificationType for convenience
export { NOTIFICATION_TYPES, type NotificationType };

// Type exports
export type NotificationPreference = InferSelectModel<
  typeof notificationPreferences
>;
export type InsertNotificationPreference = InferInsertModel<
  typeof notificationPreferences
>;

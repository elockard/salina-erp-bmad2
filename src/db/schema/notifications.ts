/**
 * Notifications Schema
 *
 * Story 20.2 - FR177: Build Notifications Center
 *
 * Tracks user notifications for feed delivery status, system alerts, and action items.
 * Supports both tenant-wide and user-specific notifications with read tracking.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

// Notification type enum
export const NOTIFICATION_TYPES = [
  "feed_success",
  "feed_failed",
  "action_pending_return",
  "action_low_isbn",
  "system_announcement",
  "import_complete",
  "manuscript_submitted", // Story 21.3: Upload Manuscript Files
  "production_milestone", // Story 21.4: Production Milestone Notifications
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Nullable: null = all users in tenant, specific ID = individual user
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),

    // Notification content
    type: varchar("type", { length: 50 }).notNull().$type<NotificationType>(),
    title: varchar("title", { length: 100 }).notNull(),
    description: text("description"),
    link: varchar("link", { length: 255 }),

    // Additional context (return_id, feed_id, etc.)
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Read tracking
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),

    // Lifecycle
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index("notifications_tenant_idx").on(table.tenantId),
    userIdx: index("notifications_user_idx").on(table.tenantId, table.userId),
    unreadIdx: index("notifications_unread_idx").on(
      table.tenantId,
      table.readAt,
    ),
    createdIdx: index("notifications_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
  }),
);

// Type exports
export type Notification = InferSelectModel<typeof notifications>;
export type InsertNotification = InferInsertModel<typeof notifications>;

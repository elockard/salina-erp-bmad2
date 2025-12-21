/**
 * Author Notification Preferences Schema
 *
 * Story 21.4 - FR185: Production Milestone Notifications
 *
 * Stores per-author notification preferences for production stage milestones.
 * Authors can configure which stages trigger notifications and whether
 * to receive email notifications.
 *
 * This is separate from the main notification_preferences table because:
 * 1. Per-CONTACT identity: Authors are contacts with portal access, not just users
 * 2. Per-STAGE granularity: Need to toggle individual production stages, not just notification type
 * 3. Portal-specific: These preferences only apply to author portal users
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { tenants } from "./tenants";

export const authorNotificationPreferences = pgTable(
  "author_notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    // Per-stage toggles - null means use default (true = notify)
    notifyEditing: boolean("notify_editing"),
    notifyDesign: boolean("notify_design"),
    notifyProof: boolean("notify_proof"),
    notifyPrintReady: boolean("notify_print_ready"),
    notifyComplete: boolean("notify_complete"),

    // Master email toggle - whether to send email notifications
    emailEnabled: boolean("email_enabled").default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Each contact can have only one preference record per tenant
    contactUnique: uniqueIndex("author_notif_prefs_contact_unique").on(
      table.tenantId,
      table.contactId,
    ),
  }),
);

// Type exports
export type AuthorNotificationPreference = InferSelectModel<
  typeof authorNotificationPreferences
>;
export type InsertAuthorNotificationPreference = InferInsertModel<
  typeof authorNotificationPreferences
>;

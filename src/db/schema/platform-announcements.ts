/**
 * Platform Announcements Schema
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC-13.8.1: Platform admin can create announcements with message, type, dates, target roles
 *
 * This is a PLATFORM-LEVEL table (not tenant-scoped):
 * - Uses adminDb for all operations (no RLS)
 * - No tenant_id - announcements affect all tenants
 * - Supports markdown messages, date scheduling, and role targeting
 */

import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Announcement type enumeration
 * - info: General information (blue, dismissible)
 * - warning: Warning/caution (amber, dismissible)
 * - critical: Critical/urgent (red, NOT dismissible)
 */
export type AnnouncementTypeEnum = "info" | "warning" | "critical";

/**
 * Platform Announcements table
 *
 * Stores platform-wide announcements that display as banners
 * on all tenant dashboards and portals.
 */
export const platformAnnouncements = pgTable(
  "platform_announcements",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Announcement message content (supports markdown) */
    message: text("message").notNull(),

    /**
     * Announcement severity type
     * - info: General information
     * - warning: Warning/caution
     * - critical: Critical/urgent (cannot be dismissed)
     */
    type: varchar("type", { length: 20 })
      .notNull()
      .$type<AnnouncementTypeEnum>(),

    /** When the announcement becomes visible (UTC) */
    starts_at: timestamp("starts_at", { withTimezone: true }).notNull(),

    /** When the announcement expires (UTC, null = no expiration) */
    ends_at: timestamp("ends_at", { withTimezone: true }),

    /**
     * Target user roles (null = all users)
     * Array of role names: ["owner", "admin", "editor", "finance", "author"]
     */
    target_roles: text("target_roles").array(),

    /** Whether the announcement is currently active */
    is_active: boolean("is_active").notNull().default(true),

    /** Timestamp when created (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Email of the admin who created the announcement */
    created_by_admin_email: varchar("created_by_admin_email", {
      length: 255,
    }).notNull(),

    /** Timestamp when last updated (UTC, auto-generated) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Email of the admin who last updated the announcement */
    updated_by_admin_email: varchar("updated_by_admin_email", { length: 255 }),
  },
  (table) => ({
    /** Index for active announcements query (filter by active + date range) */
    activeStartsAtIdx: index("platform_announcements_active_starts_at_idx").on(
      table.is_active,
      table.starts_at,
    ),

    /** Index for type-based sorting/filtering */
    typeIdx: index("platform_announcements_type_idx").on(table.type),

    /** Index for created_at for management list ordering */
    createdAtIdx: index("platform_announcements_created_at_idx").on(
      table.created_at,
    ),
  }),
);

/**
 * TypeScript type for platform_announcements SELECT queries
 */
export type PlatformAnnouncementRecord =
  typeof platformAnnouncements.$inferSelect;

/**
 * TypeScript type for platform_announcements INSERT operations
 */
export type InsertPlatformAnnouncement =
  typeof platformAnnouncements.$inferInsert;

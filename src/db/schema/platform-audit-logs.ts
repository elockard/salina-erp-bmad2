/**
 * Platform Audit Logs Schema
 *
 * Story 13.1: Implement Platform Administrator Authentication
 * AC-13.1.7: Platform admin authentication events are logged to platform audit trail
 *
 * This is a SEPARATE table from tenant audit_logs because:
 * - Platform admin operates OUTSIDE tenant context
 * - No tenant_id foreign key required
 * - Different access patterns and queries
 *
 * Architecture:
 * - Uses adminDb for inserts (no RLS)
 * - Append-only (no UPDATE/DELETE)
 * - Fire-and-forget logging pattern
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Platform Audit Logs table
 *
 * Tracks all platform administrator actions for compliance and security.
 * Unlike tenant audit_logs, this has no tenant_id since platform admins
 * operate outside tenant boundaries.
 */
export const platformAuditLogs = pgTable(
  "platform_audit_logs",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Email of the admin who performed the action */
    admin_email: text("admin_email").notNull(),

    /** Clerk user ID of the admin */
    admin_clerk_id: text("admin_clerk_id").notNull(),

    /**
     * Type of action performed
     * Examples: 'access', 'forbidden', 'view_tenant', 'suspend_tenant', etc.
     */
    action: text("action").notNull(),

    /** Route or resource being accessed */
    route: text("route").notNull(),

    /** Additional context stored as JSONB */
    metadata: jsonb("metadata"),

    /** Timestamp when the event occurred (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Composite index for admin activity queries (filter by admin, sort by time) */
    adminEmailCreatedAtIdx: index(
      "platform_audit_logs_admin_email_created_at_idx",
    ).on(table.admin_email, table.created_at),

    /** Index on action for security analysis filtering */
    actionIdx: index("platform_audit_logs_action_idx").on(table.action),

    /** Index on created_at for time-range queries */
    createdAtIdx: index("platform_audit_logs_created_at_idx").on(
      table.created_at,
    ),
  }),
);

/**
 * TypeScript type for platform_audit_logs SELECT queries
 */
export type PlatformAuditLog = typeof platformAuditLogs.$inferSelect;

/**
 * TypeScript type for platform_audit_logs INSERT operations
 */
export type InsertPlatformAuditLog = typeof platformAuditLogs.$inferInsert;

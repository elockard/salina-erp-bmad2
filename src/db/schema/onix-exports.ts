/**
 * ONIX Exports Schema
 *
 * Database schema for tracking ONIX export history.
 * Stores export metadata and full XML for audit trail.
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 3: Create ONIX export database schema
 * FR: FR135, FR142
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 */

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Export status values
 * - success: Export completed without errors
 * - validation_error: XML generated but failed validation (future Story 14.2)
 * - failed: Export failed due to error
 */
export const onixExportStatusValues = [
  "success",
  "validation_error",
  "failed",
] as const;

export type OnixExportStatus = (typeof onixExportStatusValues)[number];

/**
 * ONIX Exports table - Tracks export history with full XML
 *
 * Primary use cases:
 * - Audit trail for ONIX exports
 * - Replay capability for failed channel deliveries
 * - Export history view for publishers
 *
 * Business Rules:
 * - One row per export operation (single or batch)
 * - XML content stored for audit and replay
 * - title_ids tracks which titles were included
 */
export const onixExports = pgTable(
  "onix_exports",
  {
    /** Unique identifier for the export (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Array of title IDs included in this export */
    title_ids: uuid("title_ids").array().notNull(),

    /** When the export was created */
    export_date: timestamp("export_date", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Full ONIX XML content for audit/replay */
    xml_content: text("xml_content").notNull(),

    /** Number of Product elements in the export */
    product_count: integer("product_count").notNull(),

    /** Export status */
    status: text("status", {
      enum: onixExportStatusValues,
    }).notNull(),

    /** Error message if status is failed or validation_error */
    error_message: text("error_message"),

    /** User who initiated the export */
    created_by: uuid("created_by").references(() => users.id),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance and RLS */
    tenantIdIdx: index("onix_exports_tenant_id_idx").on(table.tenant_id),

    /** Index on export_date for chronological queries */
    exportDateIdx: index("onix_exports_export_date_idx").on(table.export_date),

    /** Index on status for filtering by export status */
    statusIdx: index("onix_exports_status_idx").on(table.status),
  }),
);

/**
 * TypeScript type for onix_exports SELECT queries (read operations)
 */
export type OnixExport = typeof onixExports.$inferSelect;

/**
 * TypeScript type for onix_exports INSERT operations (create operations)
 */
export type InsertOnixExport = typeof onixExports.$inferInsert;

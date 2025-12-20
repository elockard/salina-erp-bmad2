/**
 * CSV Exports Schema
 *
 * Database schema for tracking CSV export history.
 * Stores export metadata for audit trail and async export downloads.
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 3: Create export tracking schema
 *
 * FR173: Publisher can export catalog data to CSV for external analysis
 *
 * Pattern from: src/db/schema/csv-imports.ts
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ExportFilters } from "@/modules/import-export/types";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Export status values
 * - pending: Export requested but not yet started
 * - processing: Export in progress (background job running)
 * - completed: Export finished successfully
 * - failed: Export failed
 */
export const csvExportStatusValues = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type CsvExportStatus = (typeof csvExportStatusValues)[number];

/**
 * Export type values
 * - titles: Title catalog export
 * - contacts: Contact/author export
 * - sales: Sales data export
 */
export const csvExportTypeValues = ["titles", "contacts", "sales"] as const;

export type CsvExportType = (typeof csvExportTypeValues)[number];

/**
 * CSV Exports table - Tracks export history
 *
 * Primary use cases:
 * - Async export download (background job creates file, user downloads later)
 * - Audit trail for CSV exports
 * - Export history view for publishers
 *
 * Business Rules:
 * - One row per export operation
 * - Async exports store file_url with presigned S3 URL
 * - Presigned URLs expire after 24 hours (expires_at)
 * - Filters are stored for audit purposes
 */
export const csvExports = pgTable(
  "csv_exports",
  {
    /** Unique identifier for the export (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Type of export (titles, contacts, sales) */
    export_type: text("export_type", {
      enum: csvExportTypeValues,
    }).notNull(),

    /** Filename for download (includes timestamp) */
    filename: text("filename").notNull(),

    /** Filters applied to this export (for audit) */
    filters: jsonb("filters").$type<ExportFilters>(),

    /** Number of rows exported */
    row_count: integer("row_count"),

    /** File size in bytes */
    file_size: integer("file_size"),

    /** S3 presigned URL for download (async exports) */
    file_url: text("file_url"),

    /** Export status */
    status: text("status", {
      enum: csvExportStatusValues,
    })
      .notNull()
      .default("pending"),

    /** Error message if status is failed */
    error_message: text("error_message"),

    /** User who requested the export */
    requested_by: uuid("requested_by").references(() => users.id),

    /** When the export was created */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** When processing started */
    started_at: timestamp("started_at", { withTimezone: true }),

    /** When the export completed */
    completed_at: timestamp("completed_at", { withTimezone: true }),

    /** When the presigned URL expires */
    expires_at: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance and RLS */
    tenantIdIdx: index("csv_exports_tenant_id_idx").on(table.tenant_id),

    /** Index on status for filtering by export status */
    statusIdx: index("csv_exports_status_idx").on(table.status),

    /** Index on created_at for chronological queries */
    createdAtIdx: index("csv_exports_created_at_idx").on(table.created_at),

    /** Composite index for tenant + date queries (common pattern) */
    tenantCreatedIdx: index("csv_exports_tenant_created_idx").on(
      table.tenant_id,
      table.created_at,
    ),

    /** Index on export_type for filtering */
    exportTypeIdx: index("csv_exports_export_type_idx").on(table.export_type),
  }),
);

/**
 * TypeScript type for csv_exports SELECT queries (read operations)
 */
export type CsvExport = typeof csvExports.$inferSelect;

/**
 * TypeScript type for csv_exports INSERT operations (create operations)
 */
export type InsertCsvExport = typeof csvExports.$inferInsert;

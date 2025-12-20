/**
 * Production Projects Schema
 *
 * Database schema for production pipeline projects.
 * Tracks manuscript-to-print workflow for titles.
 *
 * Story: 18.1 - Create Production Projects
 * Epic: Epic 18 - Production Pipeline
 * FR: FR161 - Publisher can create production projects for titles
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * Soft Delete Pattern:
 * - deletedAt timestamp for soft deletes
 * - Queries filter isNull(deletedAt) by default
 */

import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Production project status enum
 * AC-18.1.2: Status is one of: draft, in-progress, completed, cancelled
 */
export const productionStatusEnum = pgEnum("production_status", [
  "draft",
  "in-progress",
  "completed",
  "cancelled",
]);

/**
 * Production status type
 */
export type ProductionStatus =
  | "draft"
  | "in-progress"
  | "completed"
  | "cancelled";

/**
 * Production Projects table
 * AC-18.1.1: Create production project by selecting title, setting target date
 * AC-18.1.3: Upload manuscript file (stored in S3)
 * AC-18.1.6: Multi-tenant isolation with RLS
 */
export const productionProjects = pgTable(
  "production_projects",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants - enforces multi-tenant isolation */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Foreign key to titles - the title being produced */
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),

    /** Target publication date */
    targetPublicationDate: date("target_publication_date"),

    /** Current project status */
    status: productionStatusEnum("status").default("draft").notNull(),

    /** Manuscript file S3 key */
    manuscriptFileKey: text("manuscript_file_key"),

    /** Original manuscript filename */
    manuscriptFileName: varchar("manuscript_file_name", { length: 255 }),

    /** Manuscript file size in bytes (stored as text for large files) */
    manuscriptFileSize: text("manuscript_file_size"),

    /** When manuscript was uploaded */
    manuscriptUploadedAt: timestamp("manuscript_uploaded_at", {
      withTimezone: true,
    }),

    /** Project notes */
    notes: text("notes"),

    /** Created timestamp */
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** Updated timestamp */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** Soft delete timestamp */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    /** User who created the project */
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /** User who last updated the project */
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    /** Index on tenant_id for RLS and filtering */
    tenantIdIdx: index("production_projects_tenant_id_idx").on(table.tenantId),

    /** Index on title_id for lookups */
    titleIdIdx: index("production_projects_title_id_idx").on(table.titleId),

    /** Index on status for filtering */
    statusIdx: index("production_projects_status_idx").on(table.status),

    /** Index on target date for sorting */
    targetDateIdx: index("production_projects_target_date_idx").on(
      table.targetPublicationDate,
    ),
  }),
);

/**
 * TypeScript type for production_projects SELECT queries
 */
export type ProductionProject = typeof productionProjects.$inferSelect;

/**
 * TypeScript type for production_projects INSERT operations
 */
export type ProductionProjectInsert = typeof productionProjects.$inferInsert;

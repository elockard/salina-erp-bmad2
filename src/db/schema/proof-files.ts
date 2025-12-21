/**
 * Proof Files Schema
 *
 * Database schema for production proof file versioning.
 * Tracks proof iterations (v1, v2, v3, etc.) with notes and audit trail.
 *
 * Story: 18.4 - Upload and Manage Proof Files
 * Epic: Epic 18 - Production Pipeline
 * FR: FR164 - Publisher can upload and manage proof files with version tracking
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * Soft Delete Pattern:
 * - deletedAt timestamp for soft deletes
 * - Queries filter isNull(deletedAt) by default
 * - S3 files are NOT deleted for compliance (retained in storage)
 */

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productionProjects } from "./production-projects";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Proof Files table
 * AC-18.4.1: Upload proof file with version tracking
 * AC-18.4.2: Version history with notes
 * AC-18.4.6: Soft delete pattern - S3 files retained for compliance
 */
export const proofFiles = pgTable(
  "proof_files",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants - enforces multi-tenant isolation */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Foreign key to production_projects */
    projectId: uuid("project_id")
      .notNull()
      .references(() => productionProjects.id, { onDelete: "cascade" }),

    /**
     * Version number (1, 2, 3, etc.) - auto-incremented per project
     * CRITICAL: Versions are strictly incrementing and never reused
     * If v1, v2, v3 exist and v2 is deleted, next upload is v4, not v3
     */
    version: integer("version").notNull(),

    /** S3 object key for the proof file */
    fileKey: text("file_key").notNull(),

    /** Original filename */
    fileName: varchar("file_name", { length: 255 }).notNull(),

    /** File size in bytes (stored as text for large files) */
    fileSize: text("file_size").notNull(),

    /** MIME type (should be application/pdf) */
    mimeType: varchar("mime_type", { length: 100 }).notNull(),

    /** Notes describing this version (e.g., "Fixed typos on page 42") */
    notes: text("notes"),

    /** Upload timestamp */
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** User who uploaded this version */
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    /** Soft delete timestamp */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    /** User who deleted this version */
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    /** Index on tenant_id for RLS and filtering */
    tenantIdIdx: index("proof_files_tenant_id_idx").on(table.tenantId),

    /** Index on project_id for lookups */
    projectIdIdx: index("proof_files_project_id_idx").on(table.projectId),

    /** Composite index for version lookup within project */
    projectVersionIdx: index("proof_files_project_version_idx").on(
      table.projectId,
      table.version,
    ),
  }),
);

/**
 * TypeScript type for proof_files SELECT queries
 */
export type ProofFile = typeof proofFiles.$inferSelect;

/**
 * TypeScript type for proof_files INSERT operations
 */
export type ProofFileInsert = typeof proofFiles.$inferInsert;

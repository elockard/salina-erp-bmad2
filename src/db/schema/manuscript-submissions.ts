/**
 * Manuscript Submissions Schema
 *
 * Database schema for manuscript submissions from authors.
 * Authors upload manuscripts through the portal, which creates production project drafts.
 *
 * Story: 21.3 - Upload Manuscript Files
 * Epic: Epic 21 - Author Portal Expansion
 * FR: FR184 - Author can upload manuscript files directly through the portal
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * Flow:
 * 1. Author uploads manuscript file through portal
 * 2. Submission created with status 'pending_review'
 * 3. Editor reviews and accepts/rejects
 * 4. On acceptance, production project is created and linked
 */

import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { contacts } from "./contacts";
import { productionProjects } from "./production-projects";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Submission Status Enum
 * Story 21.3: AC-6 - Submission status tracking
 */
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending_review", // Awaiting editor review
  "accepted", // Accepted, ready for production
  "rejected", // Rejected with notes
  "in_production", // Production project created
]);

export type SubmissionStatus = (typeof submissionStatusEnum.enumValues)[number];

/** Submission status display labels */
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending_review: "Pending Review",
  accepted: "Accepted",
  rejected: "Rejected",
  in_production: "In Production",
};

/**
 * Manuscript Submissions table
 * AC-21.3.3: Associate manuscript with title
 * AC-21.3.4: Create draft production project
 * AC-21.3.6: View submission history with status
 */
export const manuscriptSubmissions = pgTable(
  "manuscript_submissions",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id").notNull(),

    /** Foreign key to contacts - the author submitting the manuscript */
    contact_id: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    /**
     * Foreign key to titles - optional for new title submissions
     * Null if author is submitting for a new title not yet in system
     */
    title_id: uuid("title_id").references(() => titles.id, {
      onDelete: "set null",
    }),

    // File info
    /** Original filename */
    file_name: varchar("file_name", { length: 255 }).notNull(),

    /** S3 object key for the manuscript file */
    s3_key: varchar("s3_key", { length: 500 }).notNull(),

    /** MIME type (application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document) */
    content_type: varchar("content_type", { length: 100 }).notNull(),

    /** File size in bytes */
    file_size: integer("file_size").notNull(),

    // Submission details
    /** Author's notes about the submission */
    notes: text("notes"),

    /** Submission status */
    status: submissionStatusEnum("status").notNull().default("pending_review"),

    // Timestamps
    /** Creation timestamp */
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** Last update timestamp */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Review fields
    /** User who reviewed this submission */
    reviewed_by: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /** When the submission was reviewed */
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),

    /** Editor's review notes (feedback for author) */
    review_notes: text("review_notes"),

    /**
     * Foreign key to production_projects - linked when status becomes 'in_production'
     * Set when editor accepts the submission and creates a production project
     */
    production_project_id: uuid("production_project_id").references(
      () => productionProjects.id,
      { onDelete: "set null" },
    ),
  },
  (table) => ({
    /** Composite index on tenant_id and contact_id for author's submissions list */
    tenantContactIdx: index("manuscript_submissions_tenant_contact_idx").on(
      table.tenant_id,
      table.contact_id,
    ),

    /** Composite index on tenant_id and status for filtering by status */
    tenantStatusIdx: index("manuscript_submissions_tenant_status_idx").on(
      table.tenant_id,
      table.status,
    ),
  }),
);

/**
 * TypeScript type for manuscript_submissions SELECT queries
 */
export type ManuscriptSubmission = typeof manuscriptSubmissions.$inferSelect;

/**
 * TypeScript type for manuscript_submissions INSERT operations
 */
export type ManuscriptSubmissionInsert =
  typeof manuscriptSubmissions.$inferInsert;

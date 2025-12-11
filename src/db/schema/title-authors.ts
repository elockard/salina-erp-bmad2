/**
 * Title Authors Schema
 *
 * Database schema for title-author junction table with ownership percentages.
 * Enables multiple authors per title for co-authored books with royalty splits.
 *
 * Related FRs: FR111 (Multiple authors per title with ownership percentages)
 *              FR118 (Co-author relationship history for audit)
 * Epic: Epic 10 - Advanced Royalty Features
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 *
 * Multi-Tenant Isolation:
 * - Inherits tenant isolation via FK to titles (which has RLS)
 * - Queries through titles -> title_authors are tenant-scoped
 * - No separate RLS policy needed on title_authors
 *
 * Business Rules:
 * - Each title can have multiple authors
 * - Each author's ownership_percentage must be between 1 and 100
 * - Sum of all ownership_percentage for a title must equal 100% (validated at app level)
 * - One author per title can be marked as is_primary (for display/sorting)
 * - A contact can only appear once per title (unique constraint)
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Title Authors table - Junction table for title-author relationships
 *
 * Primary use cases:
 * - Enable multiple authors per title (co-authored books)
 * - Track ownership percentage for royalty splitting
 * - Designate primary author for display purposes
 * - Audit trail via created_at/updated_at timestamps
 *
 * Business Rules:
 * - ownership_percentage: 1-100 (inclusive), must sum to 100% per title
 * - is_primary: Only one author per title should be primary
 * - Unique constraint prevents same contact appearing twice on a title
 */
export const titleAuthors = pgTable(
  "title_authors",
  {
    /** Unique identifier for the title-author relationship (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Foreign key to titles table
     * ON DELETE CASCADE - deleting a title removes all its author entries
     */
    title_id: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),

    /**
     * Foreign key to contacts table (author role)
     * ON DELETE RESTRICT - cannot delete a contact that is an author on a title
     */
    contact_id: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),

    /**
     * Ownership percentage for royalty splitting
     * DECIMAL(5,2) allows values from 0.01 to 999.99
     * CHECK constraint enforces 1-100 range
     * All authors' percentages for a title must sum to 100% (app-level validation)
     */
    ownership_percentage: decimal("ownership_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),

    /**
     * Indicates if this is the primary author (for display/sorting)
     * Only one author per title should be primary
     * Single-author titles automatically have is_primary = true
     */
    is_primary: boolean("is_primary").notNull().default(false),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Last update timestamp (UTC)
     * Defaults to now() on INSERT.
     * AUTO-UPDATED via database trigger `title_authors_updated_at_trigger`
     * (see migration SQL for trigger definition)
     */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** User who created this entry (optional, for audit trail) */
    created_by: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    /** Index on title_id for efficient queries by title */
    titleIdIdx: index("title_authors_title_id_idx").on(table.title_id),

    /** Index on contact_id for efficient queries by author */
    contactIdIdx: index("title_authors_contact_id_idx").on(table.contact_id),

    /**
     * Unique constraint on (title_id, contact_id)
     * Prevents same author appearing twice on a title
     * Index automatically created via unique constraint
     */
    titleContactUnique: unique("title_authors_title_contact_unique").on(
      table.title_id,
      table.contact_id,
    ),

    /**
     * CHECK constraint: ownership_percentage must be between 1 and 100
     * Note: Sum-to-100% validation is done at application level
     */
    ownershipPercentageValid: check(
      "title_authors_ownership_percentage_valid",
      sql`ownership_percentage >= 1 AND ownership_percentage <= 100`,
    ),
  }),
);

/**
 * TypeScript type for title_authors SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type TitleAuthor = typeof titleAuthors.$inferSelect;

/**
 * TypeScript type for title_authors INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertTitleAuthor = typeof titleAuthors.$inferInsert;

/**
 * Titles Schema
 *
 * Database schema for title management in the Salina ERP system.
 * Titles are managed at the tenant level with multi-tenant isolation via RLS.
 * Supports multiple formats: physical books (ISBN), ebooks (eISBN), audiobooks (future).
 *
 * Related FRs: FR14-FR23 (Title and ISBN Management)
 * Epic: Epic 2 - Author & Title Catalog Management
 * Story: 2.4 - Create Title Database Schema and Multi-Format Support
 *
 * Architecture References:
 * - architecture.md lines 1591-1611 (Titles table specification)
 * - tech-spec-epic-2.md lines 111-138 (Story 2.4 Title Schema)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * Multi-Format Architecture:
 * - Physical Books: Uses `isbn` field (ISBN-13 format)
 * - Ebooks: Uses `eisbn` field (ISBN-13 format)
 * - Audiobooks: Deferred to post-MVP (additional field/table needed)
 *
 * ISBN Global Uniqueness:
 * - ISBNs are industry-standard identifiers issued by official agencies
 * - Unique constraint enforced at database level across ALL tenants
 * - A single ISBN should never be assigned to multiple titles/publishers
 */

import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authors } from "./authors";
import { contacts } from "./contacts";
import { tenants } from "./tenants";

/**
 * Publication status values for titles
 * - draft: Initial state, title being prepared
 * - pending: Awaiting publication approval
 * - published: Currently available for sale
 * - out_of_print: No longer in active publication
 */
export const publicationStatusValues = [
  "draft",
  "pending",
  "published",
  "out_of_print",
] as const;

export type PublicationStatus = (typeof publicationStatusValues)[number];

/**
 * Titles table - Stores title information for catalog management
 *
 * Primary use cases:
 * - Title catalog management (metadata, status tracking)
 * - Multi-format ISBN tracking (physical, ebook)
 * - Author-title relationship management
 * - Publication lifecycle tracking
 * - Audit trail via created_at/updated_at timestamps
 */
export const titles = pgTable(
  "titles",
  {
    /** Unique identifier for the title (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to authors table - every title must have an author
     * No cascade delete - titles preserve when author is soft-deleted
     * @deprecated Use contact_id instead. Kept for migration rollback capability.
     */
    author_id: uuid("author_id")
      .notNull()
      .references(() => authors.id),

    /**
     * Foreign key to contacts table - links title to contact with author role
     * Added in Story 7.3: Migrate Authors to Contacts
     * Nullable initially for migration, then NOT NULL after population
     */
    contact_id: uuid("contact_id").references(() => contacts.id),

    /** Title of the work (required) */
    title: text("title").notNull(),

    /** Subtitle of the work (optional) */
    subtitle: text("subtitle"),

    /** Genre classification (optional) */
    genre: text("genre"),

    /** Word count of the work (optional) */
    word_count: integer("word_count"),

    /**
     * Publication status - tracks title through publication lifecycle
     * Enforced via text enum at database level
     * Valid values: draft, pending, published, out_of_print
     */
    publication_status: text("publication_status", {
      enum: publicationStatusValues,
    })
      .notNull()
      .default("draft"),

    /**
     * ISBN-13 for physical book format (nullable until assigned)
     * Globally unique across ALL tenants - industry standard identifier
     * Assigned from ISBN pool (Story 2.9)
     */
    isbn: text("isbn"),

    /**
     * ISBN-13 for ebook format (nullable until assigned)
     * Globally unique across ALL tenants - industry standard identifier
     * Assigned from ISBN pool (Story 2.9)
     *
     * @deprecated Story 7.6: ISBN type distinction removed. Use `isbn` field instead.
     * ISBNs are format-agnostic. Kept for migration rollback capability.
     */
    eisbn: text("eisbn"),

    /** Publication date (optional) */
    publication_date: date("publication_date"),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Last update timestamp (UTC, auto-updated on changes) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for RLS filtering and foreign key join performance */
    tenantIdIdx: index("titles_tenant_id_idx").on(table.tenant_id),

    /** Index on publication_status for status filtering */
    statusIdx: index("titles_publication_status_idx").on(
      table.publication_status,
    ),

    /** Index on author_id for author lookups */
    authorIdx: index("titles_author_id_idx").on(table.author_id),

    /**
     * Unique constraint on isbn - globally unique across ALL tenants
     * Index automatically created via unique constraint
     */
    isbnUnique: unique("titles_isbn_unique").on(table.isbn),

    /**
     * Unique constraint on eisbn - globally unique across ALL tenants
     * Index automatically created via unique constraint
     */
    eisbnUnique: unique("titles_eisbn_unique").on(table.eisbn),
  }),
);

/**
 * TypeScript type for SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Title = typeof titles.$inferSelect;

/**
 * TypeScript type for INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertTitle = typeof titles.$inferInsert;

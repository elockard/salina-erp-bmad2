/**
 * Statements Schema
 *
 * Database schema for royalty statements with PDF storage references.
 * Statements are generated from royalty calculations and delivered to authors.
 *
 * Related ACs: AC-5.1.1 through AC-5.1.6 (Statements Schema)
 * Epic: Epic 5 - Royalty Statements & Author Portal
 * Story: 5.1 - Create Statements Database Schema and PDF Storage
 *
 * Architecture References:
 * - tech-spec-epic-5.md (Data Models and Contracts)
 * - architecture.md (Multi-tenant RLS patterns)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * RLS Policies (defined in separate migration):
 * - tenant_isolation: USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
 * - author_portal_access: FOR SELECT USING (author_id matches portal user's linked author)
 *
 * JSONB Storage Pattern:
 * - calculations field stores complete royalty breakdown for audit and display
 * - TypeScript interface defined in src/modules/statements/types.ts
 */

import {
  date,
  decimal,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authors } from "./authors";
import { contacts } from "./contacts";
import { contracts } from "./contracts";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Statement status values
 * - draft: Statement generated but not yet sent
 * - sent: Statement emailed to author
 * - failed: Email delivery failed
 */
export const statementStatusValues = ["draft", "sent", "failed"] as const;

export type StatementStatus = (typeof statementStatusValues)[number];

/**
 * Statements table - Royalty statements for authors
 *
 * Each statement represents a royalty calculation for a specific period,
 * author, and contract. Statements include full calculation breakdown,
 * PDF storage reference, and email delivery tracking.
 *
 * Primary use cases:
 * - Recording royalty calculation results
 * - Tracking PDF generation and S3 storage
 * - Email delivery status tracking
 * - Author portal statement access
 *
 * AC-5.1.1: All 16 columns per spec
 * AC-5.1.3: Foreign keys to authors, contracts, users enforced
 * AC-5.1.6: Indexes on tenant_id, author_id, period columns, status
 */
export const statements = pgTable(
  "statements",
  {
    /** Unique identifier for the statement (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to authors table - the author receiving this statement
     * ON DELETE RESTRICT - cannot delete an author with statements
     * @deprecated Use contact_id instead. Kept for migration rollback capability.
     */
    author_id: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),

    /**
     * Foreign key to contacts table - links statement to contact with author role
     * Added in Story 7.3: Migrate Authors to Contacts
     * Nullable initially for migration, then NOT NULL after population
     */
    contact_id: uuid("contact_id").references(() => contacts.id, {
      onDelete: "restrict",
    }),

    /**
     * Foreign key to contracts table - the contract for this statement
     * ON DELETE RESTRICT - cannot delete a contract with statements
     */
    contract_id: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),

    /** Start date of the royalty period (inclusive) */
    period_start: date("period_start", { mode: "date" }).notNull(),

    /** End date of the royalty period (inclusive) */
    period_end: date("period_end", { mode: "date" }).notNull(),

    /**
     * Total royalty earned before recoupment (DECIMAL(10,2))
     * Gross royalty amount from calculation
     */
    total_royalty_earned: decimal("total_royalty_earned", {
      precision: 10,
      scale: 2,
    }).notNull(),

    /**
     * Amount deducted for advance recoupment (DECIMAL(10,2))
     * Portion of royalty applied to advance payback
     */
    recoupment: decimal("recoupment", { precision: 10, scale: 2 }).notNull(),

    /**
     * Net amount payable to author (DECIMAL(10,2))
     * total_royalty_earned - recoupment
     */
    net_payable: decimal("net_payable", { precision: 10, scale: 2 }).notNull(),

    /**
     * Full calculation breakdown stored as JSONB
     * Structure defined by StatementCalculations interface
     * AC-5.1.2: Contains period, formatBreakdowns, tierBreakdowns,
     * returnsDeduction, grossRoyalty, advanceRecoupment, netPayable
     */
    calculations: jsonb("calculations").notNull(),

    /**
     * S3 object key for the PDF statement
     * Pattern: statements/{tenant_id}/{statement_id}.pdf
     * Nullable: null before PDF generation
     */
    pdf_s3_key: text("pdf_s3_key"),

    /**
     * Statement status
     * Default: draft
     * Valid values: draft, sent, failed
     */
    status: text("status").notNull().default("draft"),

    /**
     * Timestamp when email was successfully sent
     * Nullable: null if not yet sent or failed
     */
    email_sent_at: timestamp("email_sent_at", { withTimezone: true }),

    /**
     * Foreign key to users table - user who generated this statement
     * Tracks who initiated the statement generation
     */
    generated_by_user_id: uuid("generated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Last update timestamp (UTC, auto-updated) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for RLS enforcement and foreign key join performance */
    tenantIdIdx: index("statements_tenant_id_idx").on(table.tenant_id),

    /** Index on author_id for author portal queries */
    authorIdIdx: index("statements_author_id_idx").on(table.author_id),

    /** Composite index on period columns for period filtering */
    periodIdx: index("statements_period_idx").on(
      table.period_start,
      table.period_end,
    ),

    /** Index on status for queue management */
    statusIdx: index("statements_status_idx").on(table.status),
  }),
);

/**
 * TypeScript type for statements SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Statement = typeof statements.$inferSelect;

/**
 * TypeScript type for statements INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertStatement = typeof statements.$inferInsert;

/**
 * Audit Logs Schema
 *
 * Database schema for compliance audit logging. Logs all data modifications
 * across the application for audit trail and security visibility.
 *
 * Related ACs: AC-6.5.1 through AC-6.5.10 (Audit Logging)
 * Epic: Epic 6 - Reporting, Audit & Compliance
 * Story: 6.5 - Implement Audit Logging for Compliance
 *
 * Architecture References:
 * - tech-spec-epic-6.md (Data Models and Contracts)
 * - architecture.md (Multi-tenant RLS patterns)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * Design Principles:
 * - APPEND-ONLY: No UPDATE/DELETE operations exposed
 * - NON-BLOCKING: Async insertion (fire-and-forget pattern)
 * - SENSITIVE DATA: Tax IDs masked to show only last 4 digits
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Audit action type values
 * - CREATE: Resource was created
 * - UPDATE: Resource was modified
 * - DELETE: Resource was deleted
 * - APPROVE: Resource was approved (e.g., return approval)
 * - REJECT: Resource was rejected (e.g., return rejection)
 * - VIEW: Resource was accessed (for sensitive data auditing)
 */
export const auditActionTypeValues = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "VIEW",
] as const;

export type AuditActionType = (typeof auditActionTypeValues)[number];

/**
 * Audit resource type values
 * Represents the types of resources that can be audited
 */
export const auditResourceTypeValues = [
  "author",
  "title",
  "sale",
  "return",
  "statement",
  "contract",
  "user",
  "contact",
  "isbn_prefix",
  "invoice",
  "payment",
  "form_1099",
] as const;

export type AuditResourceType = (typeof auditResourceTypeValues)[number];

/**
 * Audit status values
 * - success: Audit event logged successfully
 * - failure: The audited operation failed
 */
export const auditStatusValues = ["success", "failure"] as const;

export type AuditStatus = (typeof auditStatusValues)[number];

/**
 * Audit Logs table - Compliance audit trail
 *
 * Each audit log entry represents a data modification event in the system.
 * Audit logs are append-only and should never be updated or deleted.
 *
 * Primary use cases:
 * - Compliance auditing for financial transactions
 * - Security incident investigation
 * - User activity tracking
 * - Change history for regulatory requirements
 *
 * AC-6.5.1: audit_logs table created with schema per tech-spec
 * AC-6.5.10: Async logging that doesn't block user operations
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    /** Unique identifier for the audit log entry (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to users table - the user who performed the action
     * Nullable: system actions may not have an associated user
     */
    user_id: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * Type of action performed
     * Values: CREATE, UPDATE, DELETE, APPROVE, REJECT, VIEW
     */
    action_type: text("action_type").notNull(),

    /**
     * Type of resource that was modified
     * Values: author, title, sale, return, statement, contract, user
     */
    resource_type: text("resource_type").notNull(),

    /**
     * UUID of the specific resource that was modified
     * Nullable: some actions may not have a specific resource ID
     */
    resource_id: uuid("resource_id"),

    /**
     * Before/after state for UPDATE actions stored as JSONB
     * Structure: { before?: Record<string, unknown>, after?: Record<string, unknown> }
     * For CREATE: only 'after' populated
     * For DELETE: only 'before' populated
     * For UPDATE: both populated
     * Sensitive data (e.g., tax_id) should be masked
     */
    changes: jsonb("changes"),

    /**
     * Additional context stored as JSONB
     * May include: IP address, user agent, request ID, etc.
     */
    metadata: jsonb("metadata"),

    /**
     * Status of the audited operation
     * Default: success
     * Values: success, failure
     */
    status: text("status").notNull().default("success"),

    /** Timestamp when the audit event occurred (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for RLS enforcement and tenant filtering (CRITICAL: FIRST filter) */
    tenantIdIdx: index("audit_logs_tenant_id_idx").on(table.tenant_id),

    /** Index on user_id for filtering by user */
    userIdIdx: index("audit_logs_user_id_idx").on(table.user_id),

    /** Index on resource_type for filtering by resource type */
    resourceTypeIdx: index("audit_logs_resource_type_idx").on(
      table.resource_type,
    ),

    /** Index on created_at for date range filtering and sorting */
    createdAtIdx: index("audit_logs_created_at_idx").on(table.created_at),
  }),
);

/**
 * TypeScript type for audit_logs SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type AuditLog = typeof auditLogs.$inferSelect;

/**
 * TypeScript type for audit_logs INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertAuditLog = typeof auditLogs.$inferInsert;

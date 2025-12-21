/**
 * Production Tasks Schema
 *
 * Database schema for production pipeline tasks.
 * Tracks individual tasks within production projects.
 *
 * Story: 18.2 - Assign Production Tasks to Vendors
 * Epic: Epic 18 - Production Pipeline
 * FR: FR162 - Publisher can assign production tasks to vendors with due dates
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
import { contacts } from "./contacts";
import { productionProjects } from "./production-projects";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Production task type enum
 * AC-18.2.1: Task type is one of: editing, design, proofing, printing, other
 */
export const productionTaskTypeEnum = pgEnum("production_task_type", [
  "editing",
  "design",
  "proofing",
  "printing",
  "other",
]);

/**
 * Production task type
 */
export type ProductionTaskType =
  | "editing"
  | "design"
  | "proofing"
  | "printing"
  | "other";

/**
 * Production task status enum
 * AC-18.2.2: Status is one of: pending, in-progress, completed, cancelled
 */
export const productionTaskStatusEnum = pgEnum("production_task_status", [
  "pending",
  "in-progress",
  "completed",
  "cancelled",
]);

/**
 * Production task status type
 */
export type ProductionTaskStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "cancelled";

/**
 * Production Tasks table
 * AC-18.2.1: Create task with type, name, optional vendor, optional due date
 * AC-18.2.2: Status tracking with valid transitions
 * AC-18.2.3: Vendor must be contact with vendor role
 * AC-18.2.6: Soft delete with deletedAt timestamp
 */
export const productionTasks = pgTable(
  "production_tasks",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants - enforces multi-tenant isolation */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Foreign key to production project */
    projectId: uuid("project_id")
      .notNull()
      .references(() => productionProjects.id, { onDelete: "cascade" }),

    /** Task name */
    name: varchar("name", { length: 255 }).notNull(),

    /** Task description */
    description: text("description"),

    /** Task type */
    taskType: productionTaskTypeEnum("task_type").notNull(),

    /** Current task status */
    status: productionTaskStatusEnum("status").default("pending").notNull(),

    /** Optional vendor contact (must have vendor role) */
    vendorId: uuid("vendor_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    /** Optional due date */
    dueDate: date("due_date"),

    /** Additional notes */
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

    /** User who created the task */
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /** User who last updated the task */
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    /** Index on tenant_id for RLS and filtering */
    tenantIdIdx: index("production_tasks_tenant_id_idx").on(table.tenantId),

    /** Index on project_id for task lookups by project */
    projectIdIdx: index("production_tasks_project_id_idx").on(table.projectId),

    /** Index on vendor_id for vendor task lookups */
    vendorIdIdx: index("production_tasks_vendor_id_idx").on(table.vendorId),

    /** Index on status for filtering */
    statusIdx: index("production_tasks_status_idx").on(table.status),

    /** Index on due_date for sorting */
    dueDateIdx: index("production_tasks_due_date_idx").on(table.dueDate),
  }),
);

/**
 * TypeScript type for production_tasks SELECT queries
 */
export type ProductionTask = typeof productionTasks.$inferSelect;

/**
 * TypeScript type for production_tasks INSERT operations
 */
export type ProductionTaskInsert = typeof productionTasks.$inferInsert;

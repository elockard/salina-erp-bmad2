import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Onboarding status enum values
 * Story 20.1: Build Onboarding Wizard
 */
export const onboardingStatusEnum = [
  "not_started",
  "in_progress",
  "completed",
  "dismissed",
] as const;
export type OnboardingStatus = (typeof onboardingStatusEnum)[number];

/**
 * Steps completed record type
 * Keys are step numbers (1-5), values are completion status
 */
export type StepsCompleted = Record<string, boolean | "skipped">;

/**
 * Step data record type
 * Temporary data storage for incomplete wizard steps
 */
export type StepData = Record<string, unknown>;

/**
 * Onboarding progress table
 * Tracks tenant onboarding wizard state
 * Story 20.1: Build Onboarding Wizard
 *
 * AC 20.1.9: Skip and Return Later - persists progress across sessions
 * AC 20.1.10: Onboarding Completion - tracks completed/dismissed status
 * AC 20.1.12: Persistence Across Sessions - all state preserved
 */
export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Status: not_started, in_progress, completed, dismissed
    status: varchar("status", { length: 20 }).notNull().default("not_started"),
    // Current step (1-5)
    current_step: integer("current_step").notNull().default(1),
    // Steps completed: {"1": true, "2": "skipped", "3": false}
    steps_completed: jsonb("steps_completed")
      .notNull()
      .default({})
      .$type<StepsCompleted>(),
    // Temporary data for incomplete steps
    step_data: jsonb("step_data").notNull().default({}).$type<StepData>(),
    // Timestamps for tracking
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    dismissed_at: timestamp("dismissed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Each tenant can only have one onboarding progress record
    uniqTenant: unique("onboarding_progress_tenant_unique").on(table.tenant_id),
  }),
);

// Type exports
export type OnboardingProgress = InferSelectModel<typeof onboardingProgress>;
export type InsertOnboardingProgress = InferInsertModel<
  typeof onboardingProgress
>;

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Channel Credentials Schema
 *
 * Story 16.1 - AC4: Secure Storage
 * Stores encrypted credentials for distribution channel integrations (Ingram, Amazon, etc.)
 *
 * Security:
 * - credentials field contains AES-256-GCM encrypted JSON blob
 * - RLS enforces tenant isolation at database level
 * - Only owner/admin roles can access via application layer
 */
export const channelCredentials = pgTable(
  "channel_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // 'ingram', 'amazon', etc.
    credentials: text("credentials").notNull(), // encrypted JSON blob
    metadata: jsonb("metadata"), // Schedule config, non-sensitive settings (Story 16.2)
    status: text("status").notNull().default("active"), // 'active', 'error', 'disconnected'
    lastConnectionTest: timestamp("last_connection_test", {
      mode: "date",
      withTimezone: true,
    }),
    lastConnectionStatus: text("last_connection_status"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueTenantChannel: unique().on(table.tenantId, table.channel),
  }),
);

// Type exports
export type ChannelCredential = InferSelectModel<typeof channelCredentials>;
export type InsertChannelCredential = InferInsertModel<
  typeof channelCredentials
>;

// Channel type constants
export const CHANNEL_TYPES = {
  INGRAM: "ingram",
  AMAZON: "amazon",
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

// Status type constants
export const CHANNEL_STATUS = {
  ACTIVE: "active",
  ERROR: "error",
  DISCONNECTED: "disconnected",
} as const;

export type ChannelStatus =
  (typeof CHANNEL_STATUS)[keyof typeof CHANNEL_STATUS];

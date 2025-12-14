/**
 * Channel Feeds Schema
 *
 * Story 16.2 - Task 1: Create channel_feeds database schema
 * AC5: Feed History - Tracks all ONIX feed deliveries to distribution channels
 *
 * Stores feed records with status progression:
 * pending → generating → uploading → success/failed/skipped
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const channelFeeds = pgTable("channel_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // 'ingram', 'amazon'
  status: text("status").notNull().default("pending"), // 'pending', 'generating', 'uploading', 'success', 'failed', 'skipped'
  productCount: integer("product_count"),
  fileSize: integer("file_size"), // bytes
  fileName: text("file_name"),
  feedType: text("feed_type").notNull(), // 'full', 'delta'
  triggeredBy: text("triggered_by").notNull(), // 'schedule', 'manual'
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // { schedule_frequency, onix_version, etc. }
  // Story 16.5: XML content storage for preview and retry functionality
  feedContent: text("feed_content"), // Stores ONIX XML for preview/retry
  retryOf: uuid("retry_of"), // References original feed when this is a retry
  startedAt: timestamp("started_at", { mode: "date", withTimezone: true }),
  completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Type exports
export type ChannelFeed = InferSelectModel<typeof channelFeeds>;
export type InsertChannelFeed = InferInsertModel<typeof channelFeeds>;

// Feed status constants (AC5: status values)
export const FEED_STATUS = {
  PENDING: "pending",
  GENERATING: "generating",
  UPLOADING: "uploading",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export type FeedStatus = (typeof FEED_STATUS)[keyof typeof FEED_STATUS];

// Feed type constants (AC6: full vs delta, Story 16.3: import, Story 16.4: inventory)
export const FEED_TYPE = {
  FULL: "full",
  DELTA: "delta",
  IMPORT: "import", // Story 16.3: Order imports from channels
  INVENTORY_SYNC: "inventory_sync", // Story 16.4: Outbound inventory status push
  INVENTORY_IMPORT: "inventory_import", // Story 16.4: Inbound inventory snapshot
} as const;

export type FeedType = (typeof FEED_TYPE)[keyof typeof FEED_TYPE];

// Trigger type constants (AC1: schedule, AC4: manual)
export const TRIGGER_TYPE = {
  SCHEDULE: "schedule",
  MANUAL: "manual",
} as const;

export type TriggerType = (typeof TRIGGER_TYPE)[keyof typeof TRIGGER_TYPE];

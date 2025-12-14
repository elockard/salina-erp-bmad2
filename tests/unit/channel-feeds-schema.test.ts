/**
 * Channel Feeds Schema Tests
 *
 * Story 16.2 - Task 1: Create channel_feeds database schema
 * AC5: Feed History - Tests feed record structure and constraints
 */

import { describe, expect, it } from "vitest";
import {
  type ChannelFeed,
  channelFeeds,
  FEED_STATUS,
  FEED_TYPE,
  type InsertChannelFeed,
  TRIGGER_TYPE,
} from "@/db/schema/channel-feeds";

describe("Channel Feeds Schema", () => {
  describe("Schema Structure", () => {
    it("should have all required columns", () => {
      // Verify schema exports exist
      expect(channelFeeds).toBeDefined();

      // Check column names exist on the table
      const columnNames = Object.keys(channelFeeds);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("tenantId");
      expect(columnNames).toContain("channel");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("productCount");
      expect(columnNames).toContain("fileSize");
      expect(columnNames).toContain("fileName");
      expect(columnNames).toContain("feedType");
      expect(columnNames).toContain("triggeredBy");
      expect(columnNames).toContain("errorMessage");
      expect(columnNames).toContain("metadata");
      expect(columnNames).toContain("startedAt");
      expect(columnNames).toContain("completedAt");
      expect(columnNames).toContain("createdAt");
    });
  });

  describe("FEED_STATUS Constants", () => {
    it("should define all feed statuses per AC5", () => {
      expect(FEED_STATUS.PENDING).toBe("pending");
      expect(FEED_STATUS.GENERATING).toBe("generating");
      expect(FEED_STATUS.UPLOADING).toBe("uploading");
      expect(FEED_STATUS.SUCCESS).toBe("success");
      expect(FEED_STATUS.FAILED).toBe("failed");
      expect(FEED_STATUS.SKIPPED).toBe("skipped");
    });
  });

  describe("FEED_TYPE Constants", () => {
    it("should define feed types for AC6", () => {
      expect(FEED_TYPE.FULL).toBe("full");
      expect(FEED_TYPE.DELTA).toBe("delta");
    });
  });

  describe("TRIGGER_TYPE Constants", () => {
    it("should define trigger types for AC1 and AC4", () => {
      expect(TRIGGER_TYPE.SCHEDULE).toBe("schedule");
      expect(TRIGGER_TYPE.MANUAL).toBe("manual");
    });
  });

  describe("Type Exports", () => {
    it("should export ChannelFeed select type", () => {
      // Type assertion - if this compiles, the type exists
      const feed: Partial<ChannelFeed> = {
        id: "test-id",
        channel: "ingram",
        status: "pending",
      };
      expect(feed.id).toBe("test-id");
    });

    it("should export InsertChannelFeed type", () => {
      // Type assertion - if this compiles, the type exists
      const insert: Partial<InsertChannelFeed> = {
        tenantId: "tenant-id",
        channel: "ingram",
        feedType: "full",
        triggeredBy: "manual",
      };
      expect(insert.tenantId).toBe("tenant-id");
    });
  });
});

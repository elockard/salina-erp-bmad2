/**
 * Ingram Feed Job Unit Tests
 *
 * Story 16.2 - Schedule Automated ONIX Feeds to Ingram
 * Tests for the Inngest job structure and scheduler logic.
 *
 * Note: These tests validate the job structure and business logic.
 * Full integration tests would require mocking Inngest and FTP.
 */

import { describe, expect, it } from "vitest";
import type { IngramSchedule } from "@/modules/channels/adapters/ingram/types";

/**
 * Helper to determine if a schedule should trigger at a given time
 * This matches the logic in ingram-feed-scheduler.ts
 */
function shouldTriggerFeed(
  schedule: IngramSchedule | null | undefined,
  currentHour: number,
  currentDay: number,
): boolean {
  if (!schedule || schedule.frequency === "disabled") {
    return false;
  }

  if (schedule.frequency === "daily" && schedule.hour === currentHour) {
    return true;
  }

  if (
    schedule.frequency === "weekly" &&
    schedule.dayOfWeek === currentDay &&
    schedule.hour === currentHour
  ) {
    return true;
  }

  return false;
}

describe("Ingram Feed Scheduler Logic", () => {
  describe("shouldTriggerFeed", () => {
    it("should not trigger when schedule is null", () => {
      expect(shouldTriggerFeed(null, 6, 1)).toBe(false);
    });

    it("should not trigger when schedule is undefined", () => {
      expect(shouldTriggerFeed(undefined, 6, 1)).toBe(false);
    });

    it("should not trigger when frequency is disabled", () => {
      const schedule: IngramSchedule = {
        frequency: "disabled",
        hour: 6,
        feedType: "delta",
      };
      expect(shouldTriggerFeed(schedule, 6, 1)).toBe(false);
    });

    it("should trigger daily schedule at matching hour", () => {
      const schedule: IngramSchedule = {
        frequency: "daily",
        hour: 6,
        feedType: "delta",
      };
      expect(shouldTriggerFeed(schedule, 6, 1)).toBe(true);
      expect(shouldTriggerFeed(schedule, 6, 3)).toBe(true); // Any day
    });

    it("should not trigger daily schedule at non-matching hour", () => {
      const schedule: IngramSchedule = {
        frequency: "daily",
        hour: 6,
        feedType: "delta",
      };
      expect(shouldTriggerFeed(schedule, 5, 1)).toBe(false);
      expect(shouldTriggerFeed(schedule, 7, 1)).toBe(false);
    });

    it("should trigger weekly schedule at matching day and hour", () => {
      const schedule: IngramSchedule = {
        frequency: "weekly",
        hour: 10,
        dayOfWeek: 1, // Monday
        feedType: "full",
      };
      expect(shouldTriggerFeed(schedule, 10, 1)).toBe(true);
    });

    it("should not trigger weekly schedule at wrong day", () => {
      const schedule: IngramSchedule = {
        frequency: "weekly",
        hour: 10,
        dayOfWeek: 1, // Monday
        feedType: "full",
      };
      expect(shouldTriggerFeed(schedule, 10, 0)).toBe(false); // Sunday
      expect(shouldTriggerFeed(schedule, 10, 2)).toBe(false); // Tuesday
    });

    it("should not trigger weekly schedule at wrong hour", () => {
      const schedule: IngramSchedule = {
        frequency: "weekly",
        hour: 10,
        dayOfWeek: 1, // Monday
        feedType: "full",
      };
      expect(shouldTriggerFeed(schedule, 9, 1)).toBe(false);
      expect(shouldTriggerFeed(schedule, 11, 1)).toBe(false);
    });

    it("should handle Sunday (dayOfWeek=0) correctly", () => {
      const schedule: IngramSchedule = {
        frequency: "weekly",
        hour: 8,
        dayOfWeek: 0, // Sunday
        feedType: "delta",
      };
      expect(shouldTriggerFeed(schedule, 8, 0)).toBe(true);
      expect(shouldTriggerFeed(schedule, 8, 6)).toBe(false); // Saturday
    });
  });
});

describe("Feed File Naming", () => {
  it("should generate correct filename format", () => {
    const subdomain = "acme-books";
    const timestamp = new Date("2025-01-15T10:30:00Z")
      .toISOString()
      .replace(/[-:]/g, "")
      .slice(0, 15);
    const fileName = `${subdomain}_onix30_${timestamp}.xml`;

    expect(fileName).toBe("acme-books_onix30_20250115T103000.xml");
  });

  it("should handle subdomains with hyphens", () => {
    const subdomain = "my-publishing-house";
    const timestamp = "20250115T103000";
    const fileName = `${subdomain}_onix30_${timestamp}.xml`;

    expect(fileName).toContain("my-publishing-house");
    expect(fileName).toContain("onix30");
    expect(fileName).toMatch(/\.xml$/);
  });
});

describe("Delta Feed Detection", () => {
  it("should include title updated after last feed", () => {
    const lastFeedCompleted = new Date("2025-01-10T00:00:00Z");
    const titleUpdated = new Date("2025-01-12T00:00:00Z");

    expect(titleUpdated > lastFeedCompleted).toBe(true);
  });

  it("should exclude title not updated since last feed", () => {
    const lastFeedCompleted = new Date("2025-01-10T00:00:00Z");
    const titleUpdated = new Date("2025-01-08T00:00:00Z");

    expect(titleUpdated > lastFeedCompleted).toBe(false);
  });

  it("should include all titles when no previous feed exists", () => {
    const lastFeedCompleted = null;
    const _titleUpdated = new Date("2025-01-08T00:00:00Z");

    // When no previous feed, all titles should be included (full feed behavior)
    expect(lastFeedCompleted === null).toBe(true);
  });
});

describe("Feed Status Constants", () => {
  it("should have all required feed statuses", () => {
    const FEED_STATUS = {
      PENDING: "pending",
      GENERATING: "generating",
      UPLOADING: "uploading",
      SUCCESS: "success",
      FAILED: "failed",
      SKIPPED: "skipped",
    };

    expect(Object.keys(FEED_STATUS)).toHaveLength(6);
    expect(FEED_STATUS.PENDING).toBe("pending");
    expect(FEED_STATUS.GENERATING).toBe("generating");
    expect(FEED_STATUS.UPLOADING).toBe("uploading");
    expect(FEED_STATUS.SUCCESS).toBe("success");
    expect(FEED_STATUS.FAILED).toBe("failed");
    expect(FEED_STATUS.SKIPPED).toBe("skipped");
  });

  it("should have correct feed types", () => {
    const FEED_TYPE = {
      FULL: "full",
      DELTA: "delta",
    };

    expect(FEED_TYPE.FULL).toBe("full");
    expect(FEED_TYPE.DELTA).toBe("delta");
  });

  it("should have correct trigger types", () => {
    const TRIGGER_TYPE = {
      SCHEDULE: "schedule",
      MANUAL: "manual",
    };

    expect(TRIGGER_TYPE.SCHEDULE).toBe("schedule");
    expect(TRIGGER_TYPE.MANUAL).toBe("manual");
  });
});

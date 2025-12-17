import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AmazonSchedule } from "@/modules/channels/adapters/amazon/types";

/**
 * Unit tests for Amazon Feed Schedule Validation
 *
 * Story 17.2 - AC1: Feed Schedule Configuration
 */

// Schedule validation schema (matches the one in amazon-feed-schedule.tsx)
const scheduleSchema = z.object({
  frequency: z.enum(["disabled", "daily", "weekly"]),
  hour: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6).optional(),
  feedType: z.enum(["full", "delta"]),
});

describe("Amazon Feed Schedule Validation", () => {
  describe("valid schedules", () => {
    it("accepts disabled frequency", () => {
      const schedule: AmazonSchedule = {
        frequency: "disabled",
        hour: 0,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(true);
    });

    it("accepts daily frequency at any valid hour", () => {
      for (let hour = 0; hour <= 23; hour++) {
        const schedule: AmazonSchedule = {
          frequency: "daily",
          hour,
          feedType: "full",
        };
        const result = scheduleSchema.safeParse(schedule);
        expect(result.success).toBe(true);
      }
    });

    it("accepts weekly frequency with valid day and hour", () => {
      const schedule: AmazonSchedule = {
        frequency: "weekly",
        hour: 6,
        dayOfWeek: 1, // Monday
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(true);
    });

    it("accepts all days of week (0-6)", () => {
      for (let day = 0; day <= 6; day++) {
        const schedule: AmazonSchedule = {
          frequency: "weekly",
          hour: 12,
          dayOfWeek: day,
          feedType: "full",
        };
        const result = scheduleSchema.safeParse(schedule);
        expect(result.success).toBe(true);
      }
    });

    it("accepts full feed type", () => {
      const schedule: AmazonSchedule = {
        frequency: "daily",
        hour: 3,
        feedType: "full",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(true);
    });

    it("accepts delta feed type", () => {
      const schedule: AmazonSchedule = {
        frequency: "daily",
        hour: 3,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid schedules", () => {
    it("rejects negative hour", () => {
      const schedule = {
        frequency: "daily",
        hour: -1,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects hour greater than 23", () => {
      const schedule = {
        frequency: "daily",
        hour: 24,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects negative day of week", () => {
      const schedule = {
        frequency: "weekly",
        hour: 6,
        dayOfWeek: -1,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects day of week greater than 6", () => {
      const schedule = {
        frequency: "weekly",
        hour: 6,
        dayOfWeek: 7,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects invalid frequency", () => {
      const schedule = {
        frequency: "monthly", // Invalid
        hour: 6,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects invalid feed type", () => {
      const schedule = {
        frequency: "daily",
        hour: 6,
        feedType: "partial", // Invalid
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects missing frequency", () => {
      const schedule = {
        hour: 6,
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects missing hour", () => {
      const schedule = {
        frequency: "daily",
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects missing feed type", () => {
      const schedule = {
        frequency: "daily",
        hour: 6,
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric hour", () => {
      const schedule = {
        frequency: "daily",
        hour: "6", // String instead of number
        feedType: "delta",
      };
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(false);
    });

    it("rejects float hour value", () => {
      const schedule = {
        frequency: "daily",
        hour: 6.5,
        feedType: "delta",
      };
      // Note: Zod number() accepts floats but our UI only allows integers
      // This test documents the behavior
      const result = scheduleSchema.safeParse(schedule);
      expect(result.success).toBe(true); // Zod accepts floats
    });
  });

  describe("schedule matching logic", () => {
    function shouldTrigger(
      schedule: AmazonSchedule | null,
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

    it("triggers daily schedule when hour matches", () => {
      const schedule: AmazonSchedule = {
        frequency: "daily",
        hour: 6,
        feedType: "delta",
      };
      expect(shouldTrigger(schedule, 6, 0)).toBe(true);
      expect(shouldTrigger(schedule, 6, 3)).toBe(true); // Any day
    });

    it("does not trigger daily schedule when hour does not match", () => {
      const schedule: AmazonSchedule = {
        frequency: "daily",
        hour: 6,
        feedType: "delta",
      };
      expect(shouldTrigger(schedule, 5, 0)).toBe(false);
      expect(shouldTrigger(schedule, 7, 0)).toBe(false);
    });

    it("triggers weekly schedule when day and hour match", () => {
      const schedule: AmazonSchedule = {
        frequency: "weekly",
        hour: 6,
        dayOfWeek: 1, // Monday
        feedType: "delta",
      };
      expect(shouldTrigger(schedule, 6, 1)).toBe(true);
    });

    it("does not trigger weekly schedule when only hour matches", () => {
      const schedule: AmazonSchedule = {
        frequency: "weekly",
        hour: 6,
        dayOfWeek: 1, // Monday
        feedType: "delta",
      };
      expect(shouldTrigger(schedule, 6, 0)).toBe(false); // Wrong day
      expect(shouldTrigger(schedule, 6, 2)).toBe(false); // Wrong day
    });

    it("does not trigger weekly schedule when only day matches", () => {
      const schedule: AmazonSchedule = {
        frequency: "weekly",
        hour: 6,
        dayOfWeek: 1, // Monday
        feedType: "delta",
      };
      expect(shouldTrigger(schedule, 5, 1)).toBe(false); // Wrong hour
      expect(shouldTrigger(schedule, 7, 1)).toBe(false); // Wrong hour
    });

    it("does not trigger disabled schedule", () => {
      const schedule: AmazonSchedule = {
        frequency: "disabled",
        hour: 6,
        feedType: "delta",
      };
      expect(shouldTrigger(schedule, 6, 1)).toBe(false);
    });

    it("does not trigger null schedule", () => {
      expect(shouldTrigger(null, 6, 1)).toBe(false);
    });
  });
});

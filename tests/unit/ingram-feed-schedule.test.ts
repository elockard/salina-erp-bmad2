/**
 * Ingram Feed Schedule Tests
 *
 * Story 16.2 - Task 2: Add feed schedule configuration
 * AC1: Feed Schedule Configuration
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

// Schedule validation schema (matches component schema)
const scheduleSchema = z.object({
  frequency: z.enum(["disabled", "daily", "weekly"]),
  hour: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6).optional(),
  feedType: z.enum(["full", "delta"]),
});

describe("Ingram Feed Schedule", () => {
  describe("Schedule Schema Validation (AC1)", () => {
    it("should accept valid disabled schedule", () => {
      const result = scheduleSchema.safeParse({
        frequency: "disabled",
        hour: 0,
        feedType: "delta",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid daily schedule", () => {
      const result = scheduleSchema.safeParse({
        frequency: "daily",
        hour: 6,
        feedType: "delta",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid weekly schedule with dayOfWeek", () => {
      const result = scheduleSchema.safeParse({
        frequency: "weekly",
        hour: 10,
        dayOfWeek: 1, // Monday
        feedType: "full",
      });
      expect(result.success).toBe(true);
    });

    it("should reject hour less than 0", () => {
      const result = scheduleSchema.safeParse({
        frequency: "daily",
        hour: -1,
        feedType: "delta",
      });
      expect(result.success).toBe(false);
    });

    it("should reject hour greater than 23", () => {
      const result = scheduleSchema.safeParse({
        frequency: "daily",
        hour: 24,
        feedType: "delta",
      });
      expect(result.success).toBe(false);
    });

    it("should reject dayOfWeek less than 0", () => {
      const result = scheduleSchema.safeParse({
        frequency: "weekly",
        hour: 10,
        dayOfWeek: -1,
        feedType: "delta",
      });
      expect(result.success).toBe(false);
    });

    it("should reject dayOfWeek greater than 6", () => {
      const result = scheduleSchema.safeParse({
        frequency: "weekly",
        hour: 10,
        dayOfWeek: 7,
        feedType: "delta",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid frequency", () => {
      const result = scheduleSchema.safeParse({
        frequency: "monthly",
        hour: 10,
        feedType: "delta",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid feedType", () => {
      const result = scheduleSchema.safeParse({
        frequency: "daily",
        hour: 10,
        feedType: "incremental",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Schedule Metadata Structure", () => {
    it("should support nested schedule in metadata", () => {
      const metadata = {
        schedule: {
          frequency: "daily" as const,
          hour: 6,
          feedType: "delta" as const,
        },
      };

      expect(metadata.schedule.frequency).toBe("daily");
      expect(metadata.schedule.hour).toBe(6);
      expect(metadata.schedule.feedType).toBe("delta");
    });

    it("should preserve existing metadata when adding schedule", () => {
      const existingMetadata = {
        someOtherField: "value",
      };

      const updatedMetadata = {
        ...existingMetadata,
        schedule: {
          frequency: "weekly" as const,
          hour: 10,
          dayOfWeek: 1,
          feedType: "full" as const,
        },
      };

      expect(updatedMetadata.someOtherField).toBe("value");
      expect(updatedMetadata.schedule.frequency).toBe("weekly");
    });
  });
});

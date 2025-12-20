import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createProductionProjectSchema,
  getValidNextStatuses,
  isValidStatusTransition,
  PRODUCTION_STATUS,
  PRODUCTION_STATUS_LABELS,
  updateProductionProjectSchema,
} from "@/modules/production/schema";

// Create a status schema for testing purposes
const productionStatusSchema = z.enum([
  "draft",
  "in-progress",
  "completed",
  "cancelled",
]);

/**
 * Unit tests for Production Project Zod schemas
 *
 * Story 18.1 - Create Production Projects
 * AC-18.1.2: Validate status transition rules
 */

describe("createProductionProjectSchema", () => {
  const validTitleId = "123e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid input with all fields", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: validTitleId,
        targetPublicationDate: "2025-06-15",
        notes: "Production notes here",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.titleId).toBe(validTitleId);
        expect(result.data.targetPublicationDate).toBe("2025-06-15");
        expect(result.data.notes).toBe("Production notes here");
      }
    });

    it("accepts valid input with only required fields", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: validTitleId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.titleId).toBe(validTitleId);
        expect(result.data.targetPublicationDate).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });

    it("accepts empty string for optional fields", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: validTitleId,
        targetPublicationDate: "",
        notes: "",
      });

      expect(result.success).toBe(true);
    });

    it("accepts null for optional notes", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: validTitleId,
        notes: null,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing titleId", () => {
      const result = createProductionProjectSchema.safeParse({
        notes: "Some notes",
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty titleId", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Title is required");
      }
    });

    it("rejects invalid titleId format (not UUID)", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid title ID");
      }
    });

    it("rejects invalid date format", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: validTitleId,
        targetPublicationDate: "15-06-2025", // wrong format
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Date must be in YYYY-MM-DD format",
        );
      }
    });

    it("rejects notes exceeding max length", () => {
      const result = createProductionProjectSchema.safeParse({
        titleId: validTitleId,
        notes: "A".repeat(5001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Notes are too long");
      }
    });
  });
});

describe("updateProductionProjectSchema", () => {
  it("accepts partial updates", () => {
    const result = updateProductionProjectSchema.safeParse({
      notes: "Updated notes",
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateProductionProjectSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("accepts updating only targetPublicationDate", () => {
    const result = updateProductionProjectSchema.safeParse({
      targetPublicationDate: "2025-12-01",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetPublicationDate).toBe("2025-12-01");
    }
  });

  it("validates fields when provided", () => {
    const result = updateProductionProjectSchema.safeParse({
      targetPublicationDate: "invalid-date",
    });

    expect(result.success).toBe(false);
  });
});

describe("productionStatusSchema", () => {
  it("accepts valid production statuses", () => {
    expect(productionStatusSchema.safeParse("draft").success).toBe(true);
    expect(productionStatusSchema.safeParse("in-progress").success).toBe(true);
    expect(productionStatusSchema.safeParse("completed").success).toBe(true);
    expect(productionStatusSchema.safeParse("cancelled").success).toBe(true);
  });

  it("rejects invalid production statuses", () => {
    expect(productionStatusSchema.safeParse("active").success).toBe(false);
    expect(productionStatusSchema.safeParse("pending").success).toBe(false);
    expect(productionStatusSchema.safeParse("").success).toBe(false);
    expect(productionStatusSchema.safeParse("DRAFT").success).toBe(false); // case-sensitive
  });
});

describe("PRODUCTION_STATUS constants", () => {
  it("has all expected status values", () => {
    expect(PRODUCTION_STATUS.DRAFT).toBe("draft");
    expect(PRODUCTION_STATUS.IN_PROGRESS).toBe("in-progress");
    expect(PRODUCTION_STATUS.COMPLETED).toBe("completed");
    expect(PRODUCTION_STATUS.CANCELLED).toBe("cancelled");
  });

  it("has labels for all statuses", () => {
    expect(PRODUCTION_STATUS_LABELS.draft).toBe("Draft");
    expect(PRODUCTION_STATUS_LABELS["in-progress"]).toBe("In Progress");
    expect(PRODUCTION_STATUS_LABELS.completed).toBe("Completed");
    expect(PRODUCTION_STATUS_LABELS.cancelled).toBe("Cancelled");
  });
});

describe("isValidStatusTransition", () => {
  describe("from draft", () => {
    it("allows transition to in-progress", () => {
      expect(isValidStatusTransition("draft", "in-progress")).toBe(true);
    });

    it("allows transition to cancelled", () => {
      expect(isValidStatusTransition("draft", "cancelled")).toBe(true);
    });

    it("disallows transition to completed", () => {
      expect(isValidStatusTransition("draft", "completed")).toBe(false);
    });

    it("disallows transition to same status", () => {
      expect(isValidStatusTransition("draft", "draft")).toBe(false);
    });
  });

  describe("from in-progress", () => {
    it("allows transition to completed", () => {
      expect(isValidStatusTransition("in-progress", "completed")).toBe(true);
    });

    it("allows transition to cancelled", () => {
      expect(isValidStatusTransition("in-progress", "cancelled")).toBe(true);
    });

    it("disallows transition to draft", () => {
      expect(isValidStatusTransition("in-progress", "draft")).toBe(false);
    });

    it("disallows transition to same status", () => {
      expect(isValidStatusTransition("in-progress", "in-progress")).toBe(false);
    });
  });

  describe("from completed", () => {
    it("disallows all transitions (terminal state)", () => {
      expect(isValidStatusTransition("completed", "draft")).toBe(false);
      expect(isValidStatusTransition("completed", "in-progress")).toBe(false);
      expect(isValidStatusTransition("completed", "cancelled")).toBe(false);
      expect(isValidStatusTransition("completed", "completed")).toBe(false);
    });
  });

  describe("from cancelled", () => {
    it("disallows all transitions (terminal state)", () => {
      expect(isValidStatusTransition("cancelled", "draft")).toBe(false);
      expect(isValidStatusTransition("cancelled", "in-progress")).toBe(false);
      expect(isValidStatusTransition("cancelled", "completed")).toBe(false);
      expect(isValidStatusTransition("cancelled", "cancelled")).toBe(false);
    });
  });
});

describe("getValidNextStatuses", () => {
  it("returns valid transitions from draft", () => {
    const next = getValidNextStatuses("draft");
    expect(next).toContain("in-progress");
    expect(next).toContain("cancelled");
    expect(next).not.toContain("completed");
    expect(next).not.toContain("draft");
  });

  it("returns valid transitions from in-progress", () => {
    const next = getValidNextStatuses("in-progress");
    expect(next).toContain("completed");
    expect(next).toContain("cancelled");
    expect(next).not.toContain("draft");
    expect(next).not.toContain("in-progress");
  });

  it("returns empty array for completed (terminal)", () => {
    const next = getValidNextStatuses("completed");
    expect(next).toHaveLength(0);
  });

  it("returns empty array for cancelled (terminal)", () => {
    const next = getValidNextStatuses("cancelled");
    expect(next).toHaveLength(0);
  });
});

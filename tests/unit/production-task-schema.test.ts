import { describe, expect, it } from "vitest";
import {
  createProductionTaskSchema,
  getValidNextTaskStatuses,
  isValidTaskStatusTransition,
  TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  updateProductionTaskSchema,
} from "@/modules/production/schema";

/**
 * Unit tests for Production Task Zod schemas
 *
 * Story 18.2 - Assign Production Tasks to Vendors
 * AC-18.2.1: Validate task creation inputs
 * AC-18.2.2: Validate status transition rules
 */

describe("createProductionTaskSchema", () => {
  const validProjectId = "123e4567-e89b-12d3-a456-426614174000";
  const validVendorId = "223e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid input with all fields", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Copy Editing",
        description: "Edit manuscript for grammar and style",
        taskType: "editing",
        vendorId: validVendorId,
        dueDate: "2025-06-15",
        notes: "Priority task",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectId).toBe(validProjectId);
        expect(result.data.name).toBe("Copy Editing");
        expect(result.data.taskType).toBe("editing");
      }
    });

    it("accepts valid input with only required fields", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Cover Design",
        taskType: "design",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Cover Design");
        expect(result.data.vendorId).toBeUndefined();
        expect(result.data.dueDate).toBeUndefined();
      }
    });

    it("accepts all valid task types", () => {
      for (const taskType of TASK_TYPES) {
        const result = createProductionTaskSchema.safeParse({
          projectId: validProjectId,
          name: "Test Task",
          taskType,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts null for optional fields", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Test Task",
        taskType: "proofing",
        vendorId: null,
        dueDate: null,
        notes: null,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing projectId", () => {
      const result = createProductionTaskSchema.safeParse({
        name: "Test Task",
        taskType: "editing",
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing name", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        taskType: "editing",
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "",
        taskType: "editing",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Name is required");
      }
    });

    it("rejects name exceeding max length", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "A".repeat(256),
        taskType: "editing",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Name too long");
      }
    });

    it("rejects missing taskType", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Test Task",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid taskType", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Test Task",
        taskType: "invalid-type",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid projectId format", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: "not-a-uuid",
        name: "Test Task",
        taskType: "editing",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid project ID");
      }
    });

    it("rejects invalid vendorId format", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Test Task",
        taskType: "editing",
        vendorId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid vendor ID");
      }
    });

    it("rejects notes exceeding max length", () => {
      const result = createProductionTaskSchema.safeParse({
        projectId: validProjectId,
        name: "Test Task",
        taskType: "editing",
        notes: "A".repeat(5001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Notes too long");
      }
    });
  });
});

describe("updateProductionTaskSchema", () => {
  it("accepts partial updates", () => {
    const result = updateProductionTaskSchema.safeParse({
      name: "Updated Task Name",
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateProductionTaskSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("accepts updating only taskType", () => {
    const result = updateProductionTaskSchema.safeParse({
      taskType: "printing",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taskType).toBe("printing");
    }
  });

  it("validates fields when provided", () => {
    const result = updateProductionTaskSchema.safeParse({
      taskType: "invalid-type",
    });

    expect(result.success).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    const result = updateProductionTaskSchema.safeParse({
      vendorId: null,
      dueDate: null,
      notes: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("TASK_TYPES constants", () => {
  it("has all expected task type values", () => {
    expect(TASK_TYPES).toContain("editing");
    expect(TASK_TYPES).toContain("design");
    expect(TASK_TYPES).toContain("proofing");
    expect(TASK_TYPES).toContain("printing");
    expect(TASK_TYPES).toContain("other");
  });

  it("has labels for all task types", () => {
    expect(TASK_TYPE_LABELS.editing).toBe("Editing");
    expect(TASK_TYPE_LABELS.design).toBe("Design");
    expect(TASK_TYPE_LABELS.proofing).toBe("Proofing");
    expect(TASK_TYPE_LABELS.printing).toBe("Printing");
    expect(TASK_TYPE_LABELS.other).toBe("Other");
  });
});

describe("TASK_STATUS constants", () => {
  it("has all expected status values", () => {
    expect(TASK_STATUS.PENDING).toBe("pending");
    expect(TASK_STATUS.IN_PROGRESS).toBe("in-progress");
    expect(TASK_STATUS.COMPLETED).toBe("completed");
    expect(TASK_STATUS.CANCELLED).toBe("cancelled");
  });

  it("has labels for all statuses", () => {
    expect(TASK_STATUS_LABELS.pending).toBe("Pending");
    expect(TASK_STATUS_LABELS["in-progress"]).toBe("In Progress");
    expect(TASK_STATUS_LABELS.completed).toBe("Completed");
    expect(TASK_STATUS_LABELS.cancelled).toBe("Cancelled");
  });
});

describe("isValidTaskStatusTransition", () => {
  describe("from pending", () => {
    it("allows transition to in-progress", () => {
      expect(isValidTaskStatusTransition("pending", "in-progress")).toBe(true);
    });

    it("allows transition to cancelled", () => {
      expect(isValidTaskStatusTransition("pending", "cancelled")).toBe(true);
    });

    it("disallows transition to completed", () => {
      expect(isValidTaskStatusTransition("pending", "completed")).toBe(false);
    });

    it("disallows transition to same status", () => {
      expect(isValidTaskStatusTransition("pending", "pending")).toBe(false);
    });
  });

  describe("from in-progress", () => {
    it("allows transition to completed", () => {
      expect(isValidTaskStatusTransition("in-progress", "completed")).toBe(
        true,
      );
    });

    it("allows transition to cancelled", () => {
      expect(isValidTaskStatusTransition("in-progress", "cancelled")).toBe(
        true,
      );
    });

    it("disallows transition to pending", () => {
      expect(isValidTaskStatusTransition("in-progress", "pending")).toBe(false);
    });

    it("disallows transition to same status", () => {
      expect(isValidTaskStatusTransition("in-progress", "in-progress")).toBe(
        false,
      );
    });
  });

  describe("from completed", () => {
    it("disallows all transitions (terminal state)", () => {
      expect(isValidTaskStatusTransition("completed", "pending")).toBe(false);
      expect(isValidTaskStatusTransition("completed", "in-progress")).toBe(
        false,
      );
      expect(isValidTaskStatusTransition("completed", "cancelled")).toBe(false);
      expect(isValidTaskStatusTransition("completed", "completed")).toBe(false);
    });
  });

  describe("from cancelled", () => {
    it("disallows all transitions (terminal state)", () => {
      expect(isValidTaskStatusTransition("cancelled", "pending")).toBe(false);
      expect(isValidTaskStatusTransition("cancelled", "in-progress")).toBe(
        false,
      );
      expect(isValidTaskStatusTransition("cancelled", "completed")).toBe(false);
      expect(isValidTaskStatusTransition("cancelled", "cancelled")).toBe(false);
    });
  });
});

describe("getValidNextTaskStatuses", () => {
  it("returns valid transitions from pending", () => {
    const next = getValidNextTaskStatuses("pending");
    expect(next).toContain("in-progress");
    expect(next).toContain("cancelled");
    expect(next).not.toContain("completed");
    expect(next).not.toContain("pending");
  });

  it("returns valid transitions from in-progress", () => {
    const next = getValidNextTaskStatuses("in-progress");
    expect(next).toContain("completed");
    expect(next).toContain("cancelled");
    expect(next).not.toContain("pending");
    expect(next).not.toContain("in-progress");
  });

  it("returns empty array for completed (terminal)", () => {
    const next = getValidNextTaskStatuses("completed");
    expect(next).toHaveLength(0);
  });

  it("returns empty array for cancelled (terminal)", () => {
    const next = getValidNextTaskStatuses("cancelled");
    expect(next).toHaveLength(0);
  });
});

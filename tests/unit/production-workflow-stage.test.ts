import { describe, expect, it } from "vitest";
import {
  isValidWorkflowTransition,
  WORKFLOW_STAGE_LABELS,
  WORKFLOW_STAGES,
  type WorkflowStage,
  type WorkflowStageHistoryEntry,
} from "@/modules/production/schema";

/**
 * Unit tests for Production Workflow Stage validation
 *
 * Story 18.3 - Track Production Workflow Stages
 * AC-18.3.2: Workflow stages validation
 * AC-18.3.3: Adjacent stage transition validation
 * AC-18.3.4: Workflow stage history structure
 */

describe("WORKFLOW_STAGES constants", () => {
  it("has all expected workflow stage values", () => {
    expect(WORKFLOW_STAGES).toContain("manuscript_received");
    expect(WORKFLOW_STAGES).toContain("editing");
    expect(WORKFLOW_STAGES).toContain("design");
    expect(WORKFLOW_STAGES).toContain("proof");
    expect(WORKFLOW_STAGES).toContain("print_ready");
    expect(WORKFLOW_STAGES).toContain("complete");
  });

  it("has exactly 6 stages", () => {
    expect(WORKFLOW_STAGES.length).toBe(6);
  });

  it("has stages in correct order", () => {
    expect(WORKFLOW_STAGES[0]).toBe("manuscript_received");
    expect(WORKFLOW_STAGES[1]).toBe("editing");
    expect(WORKFLOW_STAGES[2]).toBe("design");
    expect(WORKFLOW_STAGES[3]).toBe("proof");
    expect(WORKFLOW_STAGES[4]).toBe("print_ready");
    expect(WORKFLOW_STAGES[5]).toBe("complete");
  });
});

describe("WORKFLOW_STAGE_LABELS", () => {
  it("has labels for all workflow stages", () => {
    expect(WORKFLOW_STAGE_LABELS.manuscript_received).toBe(
      "Manuscript Received",
    );
    expect(WORKFLOW_STAGE_LABELS.editing).toBe("Editing");
    expect(WORKFLOW_STAGE_LABELS.design).toBe("Design");
    expect(WORKFLOW_STAGE_LABELS.proof).toBe("Proof");
    expect(WORKFLOW_STAGE_LABELS.print_ready).toBe("Print Ready");
    expect(WORKFLOW_STAGE_LABELS.complete).toBe("Complete");
  });

  it("has a label for every stage in WORKFLOW_STAGES", () => {
    for (const stage of WORKFLOW_STAGES) {
      expect(WORKFLOW_STAGE_LABELS[stage]).toBeDefined();
      expect(typeof WORKFLOW_STAGE_LABELS[stage]).toBe("string");
    }
  });
});

describe("isValidWorkflowTransition", () => {
  describe("forward transitions (AC-18.3.3)", () => {
    it("allows manuscript_received to editing", () => {
      expect(isValidWorkflowTransition("manuscript_received", "editing")).toBe(
        true,
      );
    });

    it("allows editing to design", () => {
      expect(isValidWorkflowTransition("editing", "design")).toBe(true);
    });

    it("allows design to proof", () => {
      expect(isValidWorkflowTransition("design", "proof")).toBe(true);
    });

    it("allows proof to print_ready", () => {
      expect(isValidWorkflowTransition("proof", "print_ready")).toBe(true);
    });

    it("allows print_ready to complete", () => {
      expect(isValidWorkflowTransition("print_ready", "complete")).toBe(true);
    });
  });

  describe("backward transitions (AC-18.3.3)", () => {
    it("allows editing to manuscript_received", () => {
      expect(isValidWorkflowTransition("editing", "manuscript_received")).toBe(
        true,
      );
    });

    it("allows design to editing", () => {
      expect(isValidWorkflowTransition("design", "editing")).toBe(true);
    });

    it("allows proof to design", () => {
      expect(isValidWorkflowTransition("proof", "design")).toBe(true);
    });

    it("allows print_ready to proof", () => {
      expect(isValidWorkflowTransition("print_ready", "proof")).toBe(true);
    });

    it("allows complete to print_ready", () => {
      expect(isValidWorkflowTransition("complete", "print_ready")).toBe(true);
    });
  });

  describe("skipping stages (AC-18.3.3: not allowed)", () => {
    it("disallows manuscript_received to design (skip editing)", () => {
      expect(isValidWorkflowTransition("manuscript_received", "design")).toBe(
        false,
      );
    });

    it("disallows manuscript_received to proof (skip 2 stages)", () => {
      expect(isValidWorkflowTransition("manuscript_received", "proof")).toBe(
        false,
      );
    });

    it("disallows manuscript_received to complete (skip all)", () => {
      expect(isValidWorkflowTransition("manuscript_received", "complete")).toBe(
        false,
      );
    });

    it("disallows editing to proof (skip design)", () => {
      expect(isValidWorkflowTransition("editing", "proof")).toBe(false);
    });

    it("disallows editing to complete (skip 3 stages)", () => {
      expect(isValidWorkflowTransition("editing", "complete")).toBe(false);
    });

    it("disallows design to print_ready (skip proof)", () => {
      expect(isValidWorkflowTransition("design", "print_ready")).toBe(false);
    });

    it("disallows proof to complete (skip print_ready)", () => {
      expect(isValidWorkflowTransition("proof", "complete")).toBe(false);
    });
  });

  describe("same stage transitions (not allowed)", () => {
    it("disallows manuscript_received to manuscript_received", () => {
      expect(
        isValidWorkflowTransition("manuscript_received", "manuscript_received"),
      ).toBe(false);
    });

    it("disallows editing to editing", () => {
      expect(isValidWorkflowTransition("editing", "editing")).toBe(false);
    });

    it("disallows design to design", () => {
      expect(isValidWorkflowTransition("design", "design")).toBe(false);
    });

    it("disallows proof to proof", () => {
      expect(isValidWorkflowTransition("proof", "proof")).toBe(false);
    });

    it("disallows print_ready to print_ready", () => {
      expect(isValidWorkflowTransition("print_ready", "print_ready")).toBe(
        false,
      );
    });

    it("disallows complete to complete", () => {
      expect(isValidWorkflowTransition("complete", "complete")).toBe(false);
    });
  });

  describe("all adjacent transitions", () => {
    it("allows all forward adjacent transitions", () => {
      const stages = WORKFLOW_STAGES;
      for (let i = 0; i < stages.length - 1; i++) {
        expect(isValidWorkflowTransition(stages[i], stages[i + 1])).toBe(true);
      }
    });

    it("allows all backward adjacent transitions", () => {
      const stages = WORKFLOW_STAGES;
      for (let i = 1; i < stages.length; i++) {
        expect(isValidWorkflowTransition(stages[i], stages[i - 1])).toBe(true);
      }
    });

    it("disallows all non-adjacent transitions", () => {
      const stages = WORKFLOW_STAGES;
      for (let i = 0; i < stages.length; i++) {
        for (let j = 0; j < stages.length; j++) {
          const diff = Math.abs(i - j);
          if (diff > 1) {
            expect(isValidWorkflowTransition(stages[i], stages[j])).toBe(false);
          }
        }
      }
    });
  });
});

describe("WorkflowStageHistoryEntry type (AC-18.3.4)", () => {
  it("has required fields", () => {
    const entry: WorkflowStageHistoryEntry = {
      from: "manuscript_received",
      to: "editing",
      timestamp: "2025-01-15T10:30:00Z",
      userId: "123e4567-e89b-12d3-a456-426614174000",
    };

    expect(entry.from).toBe("manuscript_received");
    expect(entry.to).toBe("editing");
    expect(entry.timestamp).toBe("2025-01-15T10:30:00Z");
    expect(entry.userId).toBeDefined();
  });

  it("from and to fields accept all workflow stages", () => {
    for (const fromStage of WORKFLOW_STAGES) {
      for (const toStage of WORKFLOW_STAGES) {
        const entry: WorkflowStageHistoryEntry = {
          from: fromStage,
          to: toStage,
          timestamp: new Date().toISOString(),
          userId: "test-user-id",
        };

        expect(entry.from).toBe(fromStage);
        expect(entry.to).toBe(toStage);
      }
    }
  });

  it("timestamp should be ISO format string", () => {
    const entry: WorkflowStageHistoryEntry = {
      from: "editing",
      to: "design",
      timestamp: new Date().toISOString(),
      userId: "user-123",
    };

    // Verify timestamp parses to valid date
    const date = new Date(entry.timestamp);
    expect(date.toString()).not.toBe("Invalid Date");
  });
});

describe("WorkflowStage type", () => {
  it("only allows valid stage values", () => {
    // TypeScript will enforce this at compile time
    // This test documents the valid values
    const validStages: WorkflowStage[] = [
      "manuscript_received",
      "editing",
      "design",
      "proof",
      "print_ready",
      "complete",
    ];

    for (const stage of validStages) {
      expect(WORKFLOW_STAGES).toContain(stage);
    }
  });
});

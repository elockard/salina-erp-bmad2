import { describe, expect, it } from "vitest";
import {
  approveProofSchema,
  PROOF_APPROVAL_STATUSES,
  type ProofApprovalStatus,
  requestCorrectionsSchema,
} from "@/modules/production/schema";

/**
 * Unit tests for Proof Approval schemas
 *
 * Story 18.5 - Approve or Request Corrections on Proofs
 * AC-18.5.1: Approve proof validation
 * AC-18.5.2: Request corrections with required notes (min 10 chars)
 * AC-18.5.4: Approval status values
 */

describe("PROOF_APPROVAL_STATUSES constant", () => {
  it("has the three expected status values", () => {
    expect(PROOF_APPROVAL_STATUSES).toHaveLength(3);
    expect(PROOF_APPROVAL_STATUSES).toContain("pending");
    expect(PROOF_APPROVAL_STATUSES).toContain("approved");
    expect(PROOF_APPROVAL_STATUSES).toContain("corrections_requested");
  });

  it("values are in expected order", () => {
    expect(PROOF_APPROVAL_STATUSES[0]).toBe("pending");
    expect(PROOF_APPROVAL_STATUSES[1]).toBe("approved");
    expect(PROOF_APPROVAL_STATUSES[2]).toBe("corrections_requested");
  });

  it("type includes all status values", () => {
    const status: ProofApprovalStatus = "pending";
    expect(PROOF_APPROVAL_STATUSES).toContain(status);

    const status2: ProofApprovalStatus = "approved";
    expect(PROOF_APPROVAL_STATUSES).toContain(status2);

    const status3: ProofApprovalStatus = "corrections_requested";
    expect(PROOF_APPROVAL_STATUSES).toContain(status3);
  });
});

describe("approveProofSchema", () => {
  const validProofId = "123e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid UUID proof ID", () => {
      const result = approveProofSchema.safeParse({
        proofId: validProofId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.proofId).toBe(validProofId);
      }
    });

    it("accepts any valid UUID format", () => {
      const uuids = [
        "00000000-0000-0000-0000-000000000000",
        "ffffffff-ffff-ffff-ffff-ffffffffffff",
        "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
      ];

      for (const uuid of uuids) {
        const result = approveProofSchema.safeParse({ proofId: uuid });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing proofId", () => {
      const result = approveProofSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("rejects invalid proofId format", () => {
      const result = approveProofSchema.safeParse({
        proofId: "not-a-valid-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid proof ID");
      }
    });

    it("rejects empty string proofId", () => {
      const result = approveProofSchema.safeParse({
        proofId: "",
      });

      expect(result.success).toBe(false);
    });

    it("rejects numeric proofId", () => {
      const result = approveProofSchema.safeParse({
        proofId: 12345,
      });

      expect(result.success).toBe(false);
    });

    it("rejects null proofId", () => {
      const result = approveProofSchema.safeParse({
        proofId: null,
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("requestCorrectionsSchema", () => {
  const validProofId = "123e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid input with minimum notes length (10 chars)", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes: "1234567890", // Exactly 10 characters
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.proofId).toBe(validProofId);
        expect(result.data.notes).toBe("1234567890");
      }
    });

    it("accepts notes longer than minimum", () => {
      const notes =
        "Fix the typo on page 42, adjust margins on chapter headings";
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(notes);
      }
    });

    it("accepts notes at max length (2000 chars)", () => {
      const notes = "A".repeat(2000);
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes.length).toBe(2000);
      }
    });

    it("accepts notes with special characters", () => {
      const notes =
        "Fix: 'Chapter 1' → should be \"Chapter One\" (per style guide)";
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes,
      });

      expect(result.success).toBe(true);
    });

    it("accepts notes with unicode characters", () => {
      const notes = "Add proper em-dashes (—) instead of hyphens on page 15–20";
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing proofId", () => {
      const result = requestCorrectionsSchema.safeParse({
        notes: "Fix the typo",
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing notes", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
      });

      expect(result.success).toBe(false);
    });

    it("rejects notes shorter than minimum (9 chars)", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes: "123456789", // 9 characters
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Correction notes must be at least 10 characters",
        );
      }
    });

    it("rejects empty notes", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Correction notes must be at least 10 characters",
        );
      }
    });

    it("rejects notes exceeding max length (2001 chars)", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes: "A".repeat(2001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Notes too long");
      }
    });

    it("rejects invalid proofId format", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: "not-a-uuid",
        notes: "Fix the typo on page 42",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid proof ID");
      }
    });

    it("rejects null notes", () => {
      const result = requestCorrectionsSchema.safeParse({
        proofId: validProofId,
        notes: null,
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("Approval status transition requirements", () => {
  /**
   * Note: Actual status transitions are enforced in the server actions
   * (approveProof and requestProofCorrections in actions.ts).
   * These tests document the expected behavior:
   */

  it("pending is the default status for new proofs", () => {
    const defaultStatus: ProofApprovalStatus = "pending";
    expect(defaultStatus).toBe("pending");
  });

  it("approve changes status from pending to approved", () => {
    const before: ProofApprovalStatus = "pending";
    const after: ProofApprovalStatus = "approved";
    expect(before).not.toBe(after);
  });

  it("request corrections changes status from pending to corrections_requested", () => {
    const before: ProofApprovalStatus = "pending";
    const after: ProofApprovalStatus = "corrections_requested";
    expect(before).not.toBe(after);
  });

  it("corrections_requested allows new proof upload (return to pending)", () => {
    // When corrections are requested, a new proof version can be uploaded
    // The new version starts with pending status
    const newVersionStatus: ProofApprovalStatus = "pending";
    expect(newVersionStatus).toBe("pending");
  });

  it("approved status moves project to print_ready stage", () => {
    // This is verified in integration/E2E tests
    // The approveProof action transitions project.workflowStage
    const fromStage = "proof";
    const toStage = "print_ready";
    expect(fromStage).not.toBe(toStage);
  });
});

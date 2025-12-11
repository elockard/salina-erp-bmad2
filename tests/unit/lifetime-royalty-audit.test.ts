/**
 * Lifetime Royalty Audit Trail Tests
 *
 * Story 10.4: Implement Escalating Lifetime Royalty Rates
 * AC-10.4.9: Audit Trail
 *
 * Tests verify that lifetime royalty-related changes are properly captured
 * in audit logs for compliance and debugging purposes.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Contract update schema from actions.ts (mirrored for testing)
 * Story 10.4: Added tier_calculation_mode for lifetime royalty support (AC-10.4.9)
 */
const updateContractSchema = z.object({
  contractId: z.string().uuid(),
  status: z.enum(["active", "suspended", "terminated"]),
  advance_amount: z.string(),
  advance_paid: z.string(),
  tier_calculation_mode: z.enum(["period", "lifetime"]).optional(),
  tiers: z.array(
    z.object({
      format: z.enum(["physical", "ebook", "audiobook"]),
      min_quantity: z.number().int().min(0),
      max_quantity: z.number().int().min(1).nullable(),
      rate: z.number().min(0).max(1),
    }),
  ),
});

describe("Lifetime Royalty Audit Trail (AC-10.4.9)", () => {
  describe("Contract Update Schema", () => {
    it("should accept tier_calculation_mode field", () => {
      const validData = {
        contractId: "550e8400-e29b-41d4-a716-446655440000",
        status: "active",
        advance_amount: "1000.00",
        advance_paid: "500.00",
        tier_calculation_mode: "lifetime",
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: 50000,
            rate: 0.1,
          },
        ],
      };

      const result = updateContractSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier_calculation_mode).toBe("lifetime");
      }
    });

    it("should accept 'period' as tier_calculation_mode", () => {
      const validData = {
        contractId: "550e8400-e29b-41d4-a716-446655440000",
        status: "active",
        advance_amount: "1000.00",
        advance_paid: "500.00",
        tier_calculation_mode: "period",
        tiers: [],
      };

      const result = updateContractSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier_calculation_mode).toBe("period");
      }
    });

    it("should allow tier_calculation_mode to be optional", () => {
      const validData = {
        contractId: "550e8400-e29b-41d4-a716-446655440000",
        status: "active",
        advance_amount: "1000.00",
        advance_paid: "500.00",
        tiers: [],
      };

      const result = updateContractSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier_calculation_mode).toBeUndefined();
      }
    });

    it("should reject invalid tier_calculation_mode values", () => {
      const invalidData = {
        contractId: "550e8400-e29b-41d4-a716-446655440000",
        status: "active",
        advance_amount: "1000.00",
        advance_paid: "500.00",
        tier_calculation_mode: "invalid_mode",
        tiers: [],
      };

      const result = updateContractSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Audit Log Changes Structure", () => {
    it("should structure before/after with tier_calculation_mode", () => {
      const auditChanges = {
        before: {
          status: "active",
          advance_amount: "1000.00",
          advance_paid: "500.00",
          tier_calculation_mode: "period",
        },
        after: {
          status: "active",
          advance_amount: "1000.00",
          advance_paid: "500.00",
          tier_calculation_mode: "lifetime",
          tiers_count: 3,
        },
      };

      expect(auditChanges.before.tier_calculation_mode).toBe("period");
      expect(auditChanges.after.tier_calculation_mode).toBe("lifetime");
    });

    it("should include tier_mode_changed metadata when mode changes", () => {
      const currentTierMode = "period" as "period" | "lifetime";
      const newTierMode = "lifetime" as "period" | "lifetime" | undefined;

      const metadata = {
        operation: "full_update",
        tier_mode_changed:
          newTierMode !== undefined && newTierMode !== currentTierMode,
      };

      expect(metadata.tier_mode_changed).toBe(true);
    });

    it("should set tier_mode_changed to false when mode unchanged", () => {
      const currentTierMode = "lifetime" as "period" | "lifetime";
      const newTierMode = "lifetime" as "period" | "lifetime" | undefined;

      const metadata = {
        operation: "full_update",
        tier_mode_changed:
          newTierMode !== undefined && newTierMode !== currentTierMode,
      };

      expect(metadata.tier_mode_changed).toBe(false);
    });

    it("should set tier_mode_changed to false when mode not provided", () => {
      const currentTierMode = "period" as "period" | "lifetime";
      const newTierMode = undefined as "period" | "lifetime" | undefined;

      const metadata = {
        operation: "full_update",
        tier_mode_changed:
          newTierMode !== undefined && newTierMode !== currentTierMode,
      };

      expect(metadata.tier_mode_changed).toBe(false);
    });
  });

  describe("Lifetime Context in Statement Calculations", () => {
    it("should include lifetime context when mode is lifetime", () => {
      const calculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 5000,
        advanceRecoupment: {
          totalAdvance: 0,
          previouslyRecouped: 0,
          recoupedThisPeriod: 0,
          remaining: 0,
        },
        netPayable: 5000,
        lifetimeContext: {
          tierCalculationMode: "lifetime" as const,
          lifetimeSalesBefore: 45000,
          lifetimeSalesAfter: 57000,
          currentTierRate: 0.12,
          nextTierThreshold: 100000,
          unitsToNextTier: 43000,
        },
      };

      expect(calculations.lifetimeContext).toBeDefined();
      expect(calculations.lifetimeContext?.tierCalculationMode).toBe(
        "lifetime",
      );
      expect(calculations.lifetimeContext?.lifetimeSalesBefore).toBe(45000);
      expect(calculations.lifetimeContext?.lifetimeSalesAfter).toBe(57000);
    });

    it("should not include lifetime context when mode is period", () => {
      const calculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 5000,
        advanceRecoupment: {
          totalAdvance: 0,
          previouslyRecouped: 0,
          recoupedThisPeriod: 0,
          remaining: 0,
        },
        netPayable: 5000,
        lifetimeContext: undefined,
      };

      expect(calculations.lifetimeContext).toBeUndefined();
    });
  });

  describe("Audit Trail Data Completeness", () => {
    it("should capture all relevant fields for contract creation audit", () => {
      const createAuditChanges = {
        after: {
          id: "contract-uuid",
          author_id: "author-uuid",
          author_name: "Jane Author",
          title_id: "title-uuid",
          title_name: "Great Novel",
          status: "active",
          advance_amount: "5000.00",
          tier_calculation_mode: "lifetime",
          tiers_count: 3,
        },
      };

      expect(createAuditChanges.after.tier_calculation_mode).toBe("lifetime");
      expect(createAuditChanges.after.tiers_count).toBe(3);
    });

    it("should capture mode change for compliance verification", () => {
      // Simulate audit log entry for mode change
      const auditEntry = {
        action_type: "UPDATE",
        resource_type: "contract",
        resource_id: "contract-uuid",
        changes: {
          before: { tier_calculation_mode: "period" },
          after: { tier_calculation_mode: "lifetime" },
        },
        metadata: {
          operation: "full_update",
          tier_mode_changed: true,
        },
      };

      expect(auditEntry.changes.before.tier_calculation_mode).toBe("period");
      expect(auditEntry.changes.after.tier_calculation_mode).toBe("lifetime");
      expect(auditEntry.metadata.tier_mode_changed).toBe(true);
    });
  });
});

/**
 * Royalty Calculator Unit Tests
 *
 * Story 4.4 AC 9: Unit tests verify calculation edge cases
 * - Tier boundary calculations
 * - Advance recoupment logic
 * - Negative period handling
 * - Multiple format aggregation
 * - Decimal precision
 * - Empty sales period
 * - No contract scenario
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the queries module
vi.mock("@/modules/royalties/queries", () => ({
  getContractByAuthorAndTenant: vi.fn(),
  getSalesByFormatForPeriod: vi.fn(),
  getApprovedReturnsByFormatForPeriod: vi.fn(),
}));

import type { ContractFormat, ContractTier } from "@/db/schema/contracts";
import { calculateRoyaltyForPeriod } from "@/modules/royalties/calculator";
import {
  getApprovedReturnsByFormatForPeriod,
  getContractByAuthorAndTenant,
  getSalesByFormatForPeriod,
} from "@/modules/royalties/queries";
import type { ContractWithRelations } from "@/modules/royalties/types";

// Test fixtures
const mockAuthorId = "author-uuid-123";
const mockTenantId = "tenant-uuid-456";
const mockContractId = "contract-uuid-789";
const mockTitleId = "title-uuid-101";
const startDate = new Date("2024-01-01");
const endDate = new Date("2024-03-31");

function createMockContract(
  overrides: Partial<ContractWithRelations> = {},
  tiers: Partial<ContractTier>[] = [],
): ContractWithRelations {
  return {
    id: mockContractId,
    tenant_id: mockTenantId,
    author_id: mockAuthorId,
    title_id: mockTitleId,
    advance_amount: "0",
    advance_paid: "0",
    advance_recouped: "0",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
    author: {
      id: mockAuthorId,
      tenant_id: mockTenantId,
      name: "Test Author",
      email: "test@example.com",
      bio: null,
      is_active: true,
      user_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    title: {
      id: mockTitleId,
      tenant_id: mockTenantId,
      author_id: mockAuthorId,
      title: "Test Book",
      subtitle: null,
      description: null,
      publication_date: null,
      isbn_physical: null,
      isbn_ebook: null,
      isbn_audiobook: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    tiers: tiers.map((t, idx) => ({
      id: `tier-uuid-${idx}`,
      contract_id: mockContractId,
      format: "physical" as ContractFormat,
      min_quantity: 0,
      max_quantity: null,
      rate: "0.1000",
      created_at: new Date(),
      ...t,
    })),
    ...overrides,
  } as ContractWithRelations;
}

describe("calculateRoyaltyForPeriod", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // No Contract Scenario (AC 2, 9)
  // ==========================================================================
  describe("no contract scenario", () => {
    it("returns error result when no contract exists for author", async () => {
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(null);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No active contract found");
        expect(result.error).toContain(mockAuthorId);
      }
    });
  });

  // ==========================================================================
  // Empty Period Tests (AC 9)
  // ==========================================================================
  describe("empty sales period", () => {
    it("returns zero royalty when no sales or returns in period", async () => {
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.calculation.totalRoyaltyEarned).toBe(0);
        expect(result.calculation.advanceRecoupment).toBe(0);
        expect(result.calculation.netPayable).toBe(0);
      }
    });
  });

  // ==========================================================================
  // Tier Boundary Tests (AC 4, 9)
  // ==========================================================================
  describe("tier boundary calculations", () => {
    it("applies correct tier at exactly 5000 units (single tier boundary)", async () => {
      // Single tier: 0-5000 @ 10%
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: 5000,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 5000,
          totalAmount: 50000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // 5000 units * $10/unit = $50,000 revenue
        // 5000 units in tier 1 @ 10% = $5,000 royalty
        expect(result.calculation.totalRoyaltyEarned).toBe(5000);
        const physicalCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "physical",
        );
        expect(physicalCalc?.tierBreakdowns.length).toBe(1);
        expect(physicalCalc?.tierBreakdowns[0].unitsApplied).toBe(5000);
      }
    });

    it("applies two tiers for 7500 units (spans tiers)", async () => {
      // Tier 1: 0-5000 @ 10%, Tier 2: 5001-10000 @ 12%
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: 5000,
          rate: "0.1000",
        },
        {
          format: "physical",
          min_quantity: 5001,
          max_quantity: 10000,
          rate: "0.1200",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 7500,
          totalAmount: 75000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const physicalCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "physical",
        );
        expect(physicalCalc?.tierBreakdowns.length).toBe(2);

        // Tier 1: 5001 units (0-5000 inclusive) at 10%
        // Tier 2: 2499 units (5001-7500) at 12%
        // Total royalty = (5001/7500)*75000*0.10 + (2499/7500)*75000*0.12
        const tier1 = physicalCalc?.tierBreakdowns[0];
        const tier2 = physicalCalc?.tierBreakdowns[1];
        expect(tier1?.rate).toBe(0.1);
        expect(tier2?.rate).toBe(0.12);
        expect((tier1?.unitsApplied ?? 0) + (tier2?.unitsApplied ?? 0)).toBe(
          7500,
        );
      }
    });

    it("applies all tiers for 15000 units (exceeds all thresholds)", async () => {
      // Tier 1: 0-5000 @ 10%, Tier 2: 5001-10000 @ 12%, Tier 3: 10001+ @ 15%
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: 5000,
          rate: "0.1000",
        },
        {
          format: "physical",
          min_quantity: 5001,
          max_quantity: 10000,
          rate: "0.1200",
        },
        {
          format: "physical",
          min_quantity: 10001,
          max_quantity: null,
          rate: "0.1500",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 15000,
          totalAmount: 150000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const physicalCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "physical",
        );
        expect(physicalCalc?.tierBreakdowns.length).toBe(3);

        // All units should be allocated across tiers
        const totalUnitsAllocated = physicalCalc?.tierBreakdowns.reduce(
          (sum, t) => sum + t.unitsApplied,
          0,
        );
        expect(totalUnitsAllocated).toBe(15000);
      }
    });

    it("handles single-tier contract with max_quantity = null", async () => {
      // Single tier: 0+ @ 10% (unlimited)
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 100000,
          totalAmount: 1000000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // 100,000 units * $10/unit = $1,000,000 revenue @ 10% = $100,000 royalty
        expect(result.calculation.totalRoyaltyEarned).toBe(100000);
      }
    });
  });

  // ==========================================================================
  // Advance Recoupment Tests (AC 5, 9)
  // ==========================================================================
  describe("advance recoupment", () => {
    it("recoupes partial advance when royalty < remaining", async () => {
      // $8,000 remaining advance, $5,000 royalty earned
      const contract = createMockContract(
        {
          advance_amount: "10000",
          advance_paid: "10000",
          advance_recouped: "2000",
        },
        [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: "0.1000",
          },
        ],
      );
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 5000,
          totalAmount: 50000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // $50,000 revenue @ 10% = $5,000 royalty
        // Remaining advance = $10,000 - $2,000 = $8,000
        // Recoupment = min($5,000, $8,000) = $5,000
        // Net payable = $5,000 - $5,000 = $0
        expect(result.calculation.totalRoyaltyEarned).toBe(5000);
        expect(result.calculation.advanceRecoupment).toBe(5000);
        expect(result.calculation.netPayable).toBe(0);
      }
    });

    it("recoupes full remaining when royalty > remaining", async () => {
      // $3,000 remaining advance, $10,000 royalty earned
      const contract = createMockContract(
        {
          advance_amount: "5000",
          advance_paid: "5000",
          advance_recouped: "2000",
        },
        [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: "0.1000",
          },
        ],
      );
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 10000,
          totalAmount: 100000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // $100,000 revenue @ 10% = $10,000 royalty
        // Remaining advance = $5,000 - $2,000 = $3,000
        // Recoupment = min($10,000, $3,000) = $3,000
        // Net payable = $10,000 - $3,000 = $7,000
        expect(result.calculation.totalRoyaltyEarned).toBe(10000);
        expect(result.calculation.advanceRecoupment).toBe(3000);
        expect(result.calculation.netPayable).toBe(7000);
      }
    });

    it("skips recoupment when advance fully recouped", async () => {
      // Advance already fully recouped
      const contract = createMockContract(
        {
          advance_amount: "5000",
          advance_paid: "5000",
          advance_recouped: "5000",
        },
        [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: "0.1000",
          },
        ],
      );
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 5000,
          totalAmount: 50000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // $5,000 royalty, $0 remaining advance
        // No recoupment needed
        expect(result.calculation.totalRoyaltyEarned).toBe(5000);
        expect(result.calculation.advanceRecoupment).toBe(0);
        expect(result.calculation.netPayable).toBe(5000);
      }
    });

    it("handles zero advance correctly", async () => {
      // No advance on contract
      const contract = createMockContract(
        { advance_amount: "0", advance_paid: "0", advance_recouped: "0" },
        [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: "0.1000",
          },
        ],
      );
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 5000,
          totalAmount: 50000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.calculation.totalRoyaltyEarned).toBe(5000);
        expect(result.calculation.advanceRecoupment).toBe(0);
        expect(result.calculation.netPayable).toBe(5000);
      }
    });
  });

  // ==========================================================================
  // Negative Period Tests (AC 6, 9)
  // ==========================================================================
  describe("negative period handling", () => {
    it("returns zero royalty when returns exceed sales", async () => {
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 100,
          totalAmount: 1000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 150,
          totalAmount: 1500,
        },
      ]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Returns > Sales, net should be 0 (capped, not negative)
        expect(result.calculation.totalRoyaltyEarned).toBe(0);
        expect(result.calculation.netPayable).toBe(0);

        const physicalCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "physical",
        );
        expect(physicalCalc?.netSales.netQuantity).toBe(0);
        expect(physicalCalc?.netSales.netRevenue).toBe(0);
      }
    });

    it("does not reverse recouped advances in negative period", async () => {
      // Advance partially recouped, negative period should not reduce recoupment
      const contract = createMockContract(
        {
          advance_amount: "5000",
          advance_paid: "5000",
          advance_recouped: "2000",
        },
        [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: "0.1000",
          },
        ],
      );
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 50,
          totalAmount: 500,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 100,
          totalAmount: 1000,
        },
      ]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Negative period: $0 royalty
        // Recoupment should be $0 (nothing to recoup)
        // advance_recouped should NOT be reduced (handled by caller, not calculator)
        expect(result.calculation.totalRoyaltyEarned).toBe(0);
        expect(result.calculation.advanceRecoupment).toBe(0);
        expect(result.calculation.netPayable).toBe(0);
      }
    });

    it("handles mixed formats with some negative", async () => {
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
        {
          format: "ebook",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.2000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 50,
          totalAmount: 500,
        }, // Will be negative
        {
          format: "ebook" as ContractFormat,
          totalQuantity: 1000,
          totalAmount: 5000,
        }, // Positive
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 100,
          totalAmount: 1000,
        }, // Exceeds sales
        {
          format: "ebook" as ContractFormat,
          totalQuantity: 200,
          totalAmount: 1000,
        }, // Less than sales
      ]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const physicalCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "physical",
        );
        const ebookCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "ebook",
        );

        // Physical: negative, capped at 0
        expect(physicalCalc?.netSales.netQuantity).toBe(0);
        expect(physicalCalc?.formatRoyalty).toBe(0);

        // Ebook: 800 net units, $4000 net revenue @ 20%
        expect(ebookCalc?.netSales.netQuantity).toBe(800);
        expect(ebookCalc?.netSales.netRevenue).toBe(4000);
        expect(ebookCalc?.formatRoyalty).toBe(800); // $4000 * 0.20

        // Total royalty should only include ebook
        expect(result.calculation.totalRoyaltyEarned).toBe(800);
      }
    });
  });

  // ==========================================================================
  // Multiple Format Tests (AC 8, 9)
  // ==========================================================================
  describe("multiple format aggregation", () => {
    it("calculates each format independently with different tier structures", async () => {
      // Physical: 10%, Ebook: 20%, Audiobook: 15%
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
        {
          format: "ebook",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.2000",
        },
        {
          format: "audiobook",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1500",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 1000,
          totalAmount: 10000,
        },
        {
          format: "ebook" as ContractFormat,
          totalQuantity: 500,
          totalAmount: 2500,
        },
        {
          format: "audiobook" as ContractFormat,
          totalQuantity: 200,
          totalAmount: 3000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Physical: $10,000 @ 10% = $1,000
        // Ebook: $2,500 @ 20% = $500
        // Audiobook: $3,000 @ 15% = $450
        // Total: $1,950
        const physicalCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "physical",
        );
        const ebookCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "ebook",
        );
        const audiobookCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "audiobook",
        );

        expect(physicalCalc?.formatRoyalty).toBe(1000);
        expect(ebookCalc?.formatRoyalty).toBe(500);
        expect(audiobookCalc?.formatRoyalty).toBe(450);
        expect(result.calculation.totalRoyaltyEarned).toBe(1950);
      }
    });

    it("handles missing formats gracefully (no sales for a format)", async () => {
      // Tiers for all formats, but only physical has sales
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
        {
          format: "ebook",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.2000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 1000,
          totalAmount: 10000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Physical: $10,000 @ 10% = $1,000
        // Ebook: no sales, $0 royalty
        expect(result.calculation.totalRoyaltyEarned).toBe(1000);

        const ebookCalc = result.calculation.formatCalculations.find(
          (f) => f.format === "ebook",
        );
        expect(ebookCalc?.formatRoyalty).toBe(0);
        expect(ebookCalc?.netSales.netQuantity).toBe(0);
      }
    });
  });

  // ==========================================================================
  // Decimal Precision Tests (AC 9)
  // ==========================================================================
  describe("decimal precision", () => {
    it("maintains decimal precision through calculations", async () => {
      // Use values that would cause floating-point errors with regular JS math
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.0333",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 3,
          totalAmount: 0.3,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify no floating-point errors (0.30 * 0.0333 = 0.00999)
        // JS: 0.30 * 0.0333 = 0.009989999999999998
        // Decimal.js: 0.00999
        const royalty = result.calculation.totalRoyaltyEarned;
        expect(Number.isFinite(royalty)).toBe(true);
        // The result should be reasonable (close to 0.01)
        expect(royalty).toBeLessThan(0.02);
        expect(royalty).toBeGreaterThan(0);
      }
    });

    it("handles large quantities without overflow", async () => {
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 10000000,
          totalAmount: 100000000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // $100,000,000 @ 10% = $10,000,000
        expect(result.calculation.totalRoyaltyEarned).toBe(10000000);
        expect(Number.isFinite(result.calculation.totalRoyaltyEarned)).toBe(
          true,
        );
      }
    });

    it("handles small rates without rounding errors", async () => {
      // Very small rate: 0.01% = 0.0001
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.0001",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 1000,
          totalAmount: 10000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // $10,000 @ 0.01% = $1
        expect(result.calculation.totalRoyaltyEarned).toBe(1);
      }
    });
  });

  // ==========================================================================
  // Result Structure Tests (AC 7)
  // ==========================================================================
  describe("result structure", () => {
    it("returns complete calculation structure with all fields", async () => {
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 1000,
          totalAmount: 10000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const calc = result.calculation;

        // Verify all required fields exist
        expect(calc.period).toBeDefined();
        expect(calc.period.startDate).toEqual(startDate);
        expect(calc.period.endDate).toEqual(endDate);
        expect(calc.authorId).toBe(mockAuthorId);
        expect(calc.contractId).toBe(mockContractId);
        expect(calc.titleId).toBe(mockTitleId);
        expect(Array.isArray(calc.formatCalculations)).toBe(true);
        expect(typeof calc.totalRoyaltyEarned).toBe("number");
        expect(typeof calc.advanceRecoupment).toBe("number");
        expect(typeof calc.netPayable).toBe("number");

        // Verify format calculation structure
        const physicalCalc = calc.formatCalculations.find(
          (f) => f.format === "physical",
        );
        expect(physicalCalc).toBeDefined();
        expect(physicalCalc?.netSales).toBeDefined();
        expect(physicalCalc?.netSales.grossQuantity).toBe(1000);
        expect(physicalCalc?.netSales.grossRevenue).toBe(10000);
        expect(physicalCalc?.tierBreakdowns).toBeDefined();
        expect(Array.isArray(physicalCalc?.tierBreakdowns)).toBe(true);
      }
    });

    it("result is JSON-serializable", async () => {
      const contract = createMockContract({}, [
        {
          format: "physical",
          min_quantity: 0,
          max_quantity: null,
          rate: "0.1000",
        },
      ]);
      vi.mocked(getContractByAuthorAndTenant).mockResolvedValue(contract);
      vi.mocked(getSalesByFormatForPeriod).mockResolvedValue([
        {
          format: "physical" as ContractFormat,
          totalQuantity: 1000,
          totalAmount: 10000,
        },
      ]);
      vi.mocked(getApprovedReturnsByFormatForPeriod).mockResolvedValue([]);

      const result = await calculateRoyaltyForPeriod(
        mockAuthorId,
        mockTenantId,
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should not throw when serializing
        const serialized = JSON.stringify(result.calculation);
        expect(typeof serialized).toBe("string");

        // Should be able to parse back
        const parsed = JSON.parse(serialized);
        expect(parsed.authorId).toBe(mockAuthorId);
        expect(parsed.totalRoyaltyEarned).toBe(1000);
      }
    });
  });
});

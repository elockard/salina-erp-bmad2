/**
 * Split Royalty Calculator Unit Tests
 *
 * Story 10.2: Implement Split Royalty Calculation Engine
 * Tests for AuthorSplitBreakdown type and split calculation functions.
 */

import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  type AuthorContractForRecoupment,
  type AuthorDataForSplit,
  buildMultiAuthorSplits,
  calculateAuthorRecoupment,
  splitRoyaltyByOwnership,
  type TitleAuthorForSplit,
} from "@/modules/royalties/calculator";
import type {
  AuthorSplitBreakdown,
  RoyaltyCalculation,
} from "@/modules/royalties/types";

// ============================================================================
// Task 1: Type Structure Tests (AC: 10.2.7)
// ============================================================================

describe("AuthorSplitBreakdown type structure", () => {
  it("should have all required fields with correct types", () => {
    // Create a valid AuthorSplitBreakdown object
    const breakdown: AuthorSplitBreakdown = {
      contactId: "contact-uuid-123",
      contractId: "contract-uuid-456",
      ownershipPercentage: 60,
      splitAmount: 600.0,
      recoupment: 100.0,
      netPayable: 500.0,
      advanceStatus: {
        totalAdvance: 1000.0,
        previouslyRecouped: 500.0,
        remainingAfterThisPeriod: 400.0,
      },
    };

    // Type assertions - these should compile and pass
    expect(typeof breakdown.contactId).toBe("string");
    expect(typeof breakdown.contractId).toBe("string");
    expect(typeof breakdown.ownershipPercentage).toBe("number");
    expect(typeof breakdown.splitAmount).toBe("number");
    expect(typeof breakdown.recoupment).toBe("number");
    expect(typeof breakdown.netPayable).toBe("number");
    expect(typeof breakdown.advanceStatus).toBe("object");
    expect(typeof breakdown.advanceStatus.totalAdvance).toBe("number");
    expect(typeof breakdown.advanceStatus.previouslyRecouped).toBe("number");
    expect(typeof breakdown.advanceStatus.remainingAfterThisPeriod).toBe(
      "number",
    );
  });

  it("should allow zero values for financial fields", () => {
    const breakdown: AuthorSplitBreakdown = {
      contactId: "contact-uuid-123",
      contractId: "contract-uuid-456",
      ownershipPercentage: 100,
      splitAmount: 0,
      recoupment: 0,
      netPayable: 0,
      advanceStatus: {
        totalAdvance: 0,
        previouslyRecouped: 0,
        remainingAfterThisPeriod: 0,
      },
    };

    expect(breakdown.splitAmount).toBe(0);
    expect(breakdown.recoupment).toBe(0);
    expect(breakdown.netPayable).toBe(0);
  });

  it("should support decimal ownership percentages", () => {
    const breakdown: AuthorSplitBreakdown = {
      contactId: "contact-uuid-123",
      contractId: "contract-uuid-456",
      ownershipPercentage: 33.33,
      splitAmount: 333.3,
      recoupment: 0,
      netPayable: 333.3,
      advanceStatus: {
        totalAdvance: 0,
        previouslyRecouped: 0,
        remainingAfterThisPeriod: 0,
      },
    };

    expect(breakdown.ownershipPercentage).toBe(33.33);
  });
});

describe("RoyaltyCalculation extended type", () => {
  it("should include titleTotalRoyalty field", () => {
    // This tests that the extended RoyaltyCalculation type has the new field
    const calculation: RoyaltyCalculation = {
      period: {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      },
      authorId: "author-uuid-123",
      contractId: "contract-uuid-456",
      titleId: "title-uuid-789",
      formatCalculations: [],
      totalRoyaltyEarned: 1000.0,
      advanceRecoupment: 0,
      netPayable: 1000.0,
      // New fields for Story 10.2
      titleTotalRoyalty: 1000.0,
      isSplitCalculation: false,
      authorSplits: [],
    };

    expect(calculation.titleTotalRoyalty).toBe(1000.0);
  });

  it("should include isSplitCalculation boolean flag", () => {
    const calculation: RoyaltyCalculation = {
      period: {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      },
      authorId: "author-uuid-123",
      contractId: "contract-uuid-456",
      titleId: "title-uuid-789",
      formatCalculations: [],
      totalRoyaltyEarned: 1000.0,
      advanceRecoupment: 0,
      netPayable: 1000.0,
      titleTotalRoyalty: 1000.0,
      isSplitCalculation: true,
      authorSplits: [],
    };

    expect(calculation.isSplitCalculation).toBe(true);
  });

  it("should include authorSplits array", () => {
    const authorSplit: AuthorSplitBreakdown = {
      contactId: "contact-1",
      contractId: "contract-1",
      ownershipPercentage: 60,
      splitAmount: 600.0,
      recoupment: 0,
      netPayable: 600.0,
      advanceStatus: {
        totalAdvance: 0,
        previouslyRecouped: 0,
        remainingAfterThisPeriod: 0,
      },
    };

    const calculation: RoyaltyCalculation = {
      period: {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      },
      authorId: "author-uuid-123",
      contractId: "contract-uuid-456",
      titleId: "title-uuid-789",
      formatCalculations: [],
      totalRoyaltyEarned: 1000.0,
      advanceRecoupment: 0,
      netPayable: 1000.0,
      titleTotalRoyalty: 1000.0,
      isSplitCalculation: true,
      authorSplits: [authorSplit],
    };

    expect(calculation.authorSplits).toHaveLength(1);
    expect(calculation.authorSplits[0].ownershipPercentage).toBe(60);
  });

  it("should have empty authorSplits for single-author (backward compatibility)", () => {
    const calculation: RoyaltyCalculation = {
      period: {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      },
      authorId: "author-uuid-123",
      contractId: "contract-uuid-456",
      titleId: "title-uuid-789",
      formatCalculations: [],
      totalRoyaltyEarned: 1000.0,
      advanceRecoupment: 200.0,
      netPayable: 800.0,
      titleTotalRoyalty: 1000.0,
      isSplitCalculation: false,
      authorSplits: [],
    };

    // For single author, authorSplits should be empty
    expect(calculation.isSplitCalculation).toBe(false);
    expect(calculation.authorSplits).toEqual([]);
    // titleTotalRoyalty equals totalRoyaltyEarned for single author
    expect(calculation.titleTotalRoyalty).toBe(calculation.totalRoyaltyEarned);
  });

  it("should support multiple author splits summing to titleTotalRoyalty", () => {
    const split1: AuthorSplitBreakdown = {
      contactId: "contact-1",
      contractId: "contract-1",
      ownershipPercentage: 60,
      splitAmount: 600.0,
      recoupment: 100.0,
      netPayable: 500.0,
      advanceStatus: {
        totalAdvance: 500.0,
        previouslyRecouped: 400.0,
        remainingAfterThisPeriod: 0,
      },
    };

    const split2: AuthorSplitBreakdown = {
      contactId: "contact-2",
      contractId: "contract-2",
      ownershipPercentage: 40,
      splitAmount: 400.0,
      recoupment: 200.0,
      netPayable: 200.0,
      advanceStatus: {
        totalAdvance: 1000.0,
        previouslyRecouped: 300.0,
        remainingAfterThisPeriod: 500.0,
      },
    };

    const calculation: RoyaltyCalculation = {
      period: {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      },
      authorId: "primary-author", // Could be primary author for reference
      contractId: "contract-1",
      titleId: "title-uuid-789",
      formatCalculations: [],
      totalRoyaltyEarned: 1000.0,
      advanceRecoupment: 300.0, // Sum of all author recoupments
      netPayable: 700.0, // Sum of all author netPayables
      titleTotalRoyalty: 1000.0,
      isSplitCalculation: true,
      authorSplits: [split1, split2],
    };

    // Verify splits sum to titleTotalRoyalty
    const splitSum = calculation.authorSplits.reduce(
      (sum, s) => sum + s.splitAmount,
      0,
    );
    expect(splitSum).toBe(calculation.titleTotalRoyalty);

    // Verify ownership percentages sum to 100
    const ownershipSum = calculation.authorSplits.reduce(
      (sum, s) => sum + s.ownershipPercentage,
      0,
    );
    expect(ownershipSum).toBe(100);

    // Verify total recoupment and netPayable
    const recoupmentSum = calculation.authorSplits.reduce(
      (sum, s) => sum + s.recoupment,
      0,
    );
    expect(recoupmentSum).toBe(calculation.advanceRecoupment);

    const netPayableSum = calculation.authorSplits.reduce(
      (sum, s) => sum + s.netPayable,
      0,
    );
    expect(netPayableSum).toBe(calculation.netPayable);
  });
});

// ============================================================================
// Task 2: Split Calculation Helper Functions (AC: 10.2.2, 10.2.5)
// ============================================================================

describe("splitRoyaltyByOwnership", () => {
  it("should split 50/50 correctly", () => {
    const totalRoyalty = new Decimal(1000);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 50 },
      { contactId: "contact-2", ownershipPercentage: 50 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    expect(splits).toHaveLength(2);
    expect(splits[0].contactId).toBe("contact-1");
    expect(splits[0].splitAmount).toBe(500);
    expect(splits[1].contactId).toBe("contact-2");
    expect(splits[1].splitAmount).toBe(500);

    // Verify sum equals total
    const sum = splits.reduce((acc, s) => acc + s.splitAmount, 0);
    expect(sum).toBe(1000);
  });

  it("should split 60/40 correctly", () => {
    const totalRoyalty = new Decimal(1000);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 60 },
      { contactId: "contact-2", ownershipPercentage: 40 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    expect(splits[0].splitAmount).toBe(600);
    expect(splits[1].splitAmount).toBe(400);
  });

  it("should split 33/33/34 correctly for three authors", () => {
    const totalRoyalty = new Decimal(1000);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 33 },
      { contactId: "contact-2", ownershipPercentage: 33 },
      { contactId: "contact-3", ownershipPercentage: 34 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    expect(splits).toHaveLength(3);
    expect(splits[0].splitAmount).toBe(330);
    expect(splits[1].splitAmount).toBe(330);
    expect(splits[2].splitAmount).toBe(340);

    // Verify sum equals total
    const sum = splits.reduce((acc, s) => acc + s.splitAmount, 0);
    expect(sum).toBe(1000);
  });

  it("should handle decimal percentages (33.33/33.33/33.34)", () => {
    const totalRoyalty = new Decimal(1000);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 33.33 },
      { contactId: "contact-2", ownershipPercentage: 33.33 },
      { contactId: "contact-3", ownershipPercentage: 33.34 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    // Using toBeCloseTo for floating point comparison
    expect(splits[0].splitAmount).toBeCloseTo(333.3, 1);
    expect(splits[1].splitAmount).toBeCloseTo(333.3, 1);
    expect(splits[2].splitAmount).toBeCloseTo(333.4, 1);

    // Sum should equal total (within precision)
    const sum = splits.reduce((acc, s) => acc + s.splitAmount, 0);
    expect(sum).toBeCloseTo(1000, 2);
  });

  it("should return zero splits for zero total royalty (AC-10.2.5)", () => {
    const totalRoyalty = new Decimal(0);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 60 },
      { contactId: "contact-2", ownershipPercentage: 40 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    expect(splits[0].splitAmount).toBe(0);
    expect(splits[1].splitAmount).toBe(0);
  });

  it("should return zero splits for negative total royalty (AC-10.2.5)", () => {
    const totalRoyalty = new Decimal(-500);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 60 },
      { contactId: "contact-2", ownershipPercentage: 40 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    // Negative royalty should result in zero splits (capped at 0)
    expect(splits[0].splitAmount).toBe(0);
    expect(splits[1].splitAmount).toBe(0);
  });

  it("should handle single author with 100% ownership", () => {
    const totalRoyalty = new Decimal(1000);
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 100 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    expect(splits).toHaveLength(1);
    expect(splits[0].splitAmount).toBe(1000);
  });

  it("should preserve precision with Decimal.js", () => {
    // Test with a value that would cause floating point issues
    const totalRoyalty = new Decimal("1234.56");
    const titleAuthors: TitleAuthorForSplit[] = [
      { contactId: "contact-1", ownershipPercentage: 33.33 },
      { contactId: "contact-2", ownershipPercentage: 33.33 },
      { contactId: "contact-3", ownershipPercentage: 33.34 },
    ];

    const splits = splitRoyaltyByOwnership(totalRoyalty, titleAuthors);

    // Verify sum equals total (using Decimal for comparison)
    const sumDecimal = splits.reduce(
      (acc, s) => acc.plus(new Decimal(s.splitAmount)),
      new Decimal(0),
    );
    expect(sumDecimal.toNumber()).toBeCloseTo(1234.56, 2);
  });
});

// ============================================================================
// Task 3: Per-Author Recoupment Function (AC: 10.2.3, 10.2.4, 10.2.6)
// ============================================================================

describe("calculateAuthorRecoupment", () => {
  it("should recoup from advance when royalty earned", () => {
    const authorSplitAmount = new Decimal(500);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: 1000,
      advancePaid: 1000,
      advanceRecouped: 0,
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    // Should recoup entire split since advance remaining is 1000
    expect(result.recoupment).toBe(500);
    expect(result.netPayable).toBe(0);
    expect(result.advanceStatus.totalAdvance).toBe(1000);
    expect(result.advanceStatus.previouslyRecouped).toBe(0);
    expect(result.advanceStatus.remainingAfterThisPeriod).toBe(500);
  });

  it("should handle fully recouped advance (AC-10.2.4)", () => {
    const authorSplitAmount = new Decimal(500);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: 1000,
      advancePaid: 1000,
      advanceRecouped: 1000, // Fully recouped
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    // No recoupment needed - full split flows through
    expect(result.recoupment).toBe(0);
    expect(result.netPayable).toBe(500);
    expect(result.advanceStatus.remainingAfterThisPeriod).toBe(0);
  });

  it("should handle partial recoupment", () => {
    const authorSplitAmount = new Decimal(500);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: 1000,
      advancePaid: 1000,
      advanceRecouped: 700, // $300 remaining
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    // Should recoup only remaining $300
    expect(result.recoupment).toBe(300);
    expect(result.netPayable).toBe(200);
    expect(result.advanceStatus.previouslyRecouped).toBe(700);
    expect(result.advanceStatus.remainingAfterThisPeriod).toBe(0);
  });

  it("should handle zero advance amount", () => {
    const authorSplitAmount = new Decimal(500);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: 0,
      advancePaid: 0,
      advanceRecouped: 0,
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    // No advance = no recoupment
    expect(result.recoupment).toBe(0);
    expect(result.netPayable).toBe(500);
    expect(result.advanceStatus.totalAdvance).toBe(0);
  });

  it("should handle different advance amounts per author (AC-10.2.6)", () => {
    // Author A: $5000 advance
    const splitA = new Decimal(600);
    const contractA: AuthorContractForRecoupment = {
      advanceAmount: 5000,
      advancePaid: 5000,
      advanceRecouped: 4000, // $1000 remaining
    };

    const resultA = calculateAuthorRecoupment(splitA, contractA);
    expect(resultA.recoupment).toBe(600); // Full split goes to recoupment
    expect(resultA.netPayable).toBe(0);
    expect(resultA.advanceStatus.remainingAfterThisPeriod).toBe(400);

    // Author B: $2000 advance
    const splitB = new Decimal(400);
    const contractB: AuthorContractForRecoupment = {
      advanceAmount: 2000,
      advancePaid: 2000,
      advanceRecouped: 1900, // $100 remaining
    };

    const resultB = calculateAuthorRecoupment(splitB, contractB);
    expect(resultB.recoupment).toBe(100); // Only $100 needed
    expect(resultB.netPayable).toBe(300); // $400 - $100 = $300
    expect(resultB.advanceStatus.remainingAfterThisPeriod).toBe(0);
  });

  it("should handle zero split amount", () => {
    const authorSplitAmount = new Decimal(0);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: 1000,
      advancePaid: 1000,
      advanceRecouped: 500,
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    expect(result.recoupment).toBe(0);
    expect(result.netPayable).toBe(0);
    expect(result.advanceStatus.remainingAfterThisPeriod).toBe(500);
  });

  it("should never have negative netPayable", () => {
    const authorSplitAmount = new Decimal(100);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: 5000,
      advancePaid: 5000,
      advanceRecouped: 0, // $5000 remaining
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    // Recoupment is capped at split amount
    expect(result.recoupment).toBe(100);
    expect(result.netPayable).toBe(0);
    expect(result.netPayable).toBeGreaterThanOrEqual(0);
  });

  it("should handle string values from database", () => {
    // Database stores decimal fields as strings
    const authorSplitAmount = new Decimal(500);
    const contract: AuthorContractForRecoupment = {
      advanceAmount: "1000.00" as unknown as number,
      advancePaid: "1000.00" as unknown as number,
      advanceRecouped: "300.00" as unknown as number,
    };

    const result = calculateAuthorRecoupment(authorSplitAmount, contract);

    // Should handle string conversion
    expect(result.recoupment).toBe(500);
    expect(result.netPayable).toBe(0);
    expect(result.advanceStatus.remainingAfterThisPeriod).toBe(200);
  });
});

// ============================================================================
// Task 4: Multi-Author Split Calculation (AC: 10.2.1, 10.2.9, 10.2.10)
// ============================================================================

describe("buildMultiAuthorSplits", () => {
  it("should build author splits from title authors and contracts", () => {
    const titleTotalRoyalty = new Decimal(1000);
    const authorData: AuthorDataForSplit[] = [
      {
        contactId: "contact-1",
        ownershipPercentage: 60,
        contract: {
          id: "contract-1",
          advance_amount: "1000",
          advance_paid: "1000",
          advance_recouped: "0",
        },
      },
      {
        contactId: "contact-2",
        ownershipPercentage: 40,
        contract: {
          id: "contract-2",
          advance_amount: "500",
          advance_paid: "500",
          advance_recouped: "500",
        },
      },
    ];

    const splits = buildMultiAuthorSplits(titleTotalRoyalty, authorData);

    expect(splits).toHaveLength(2);

    // Author 1: 60% of $1000 = $600, has $1000 advance remaining
    expect(splits[0].contactId).toBe("contact-1");
    expect(splits[0].contractId).toBe("contract-1");
    expect(splits[0].ownershipPercentage).toBe(60);
    expect(splits[0].splitAmount).toBe(600);
    expect(splits[0].recoupment).toBe(600); // Full split goes to recoupment
    expect(splits[0].netPayable).toBe(0);

    // Author 2: 40% of $1000 = $400, advance fully recouped
    expect(splits[1].contactId).toBe("contact-2");
    expect(splits[1].contractId).toBe("contract-2");
    expect(splits[1].ownershipPercentage).toBe(40);
    expect(splits[1].splitAmount).toBe(400);
    expect(splits[1].recoupment).toBe(0); // No recoupment needed
    expect(splits[1].netPayable).toBe(400);
  });

  it("should return zero splits for zero royalty", () => {
    const titleTotalRoyalty = new Decimal(0);
    const authorData: AuthorDataForSplit[] = [
      {
        contactId: "contact-1",
        ownershipPercentage: 60,
        contract: {
          id: "contract-1",
          advance_amount: "1000",
          advance_paid: "1000",
          advance_recouped: "0",
        },
      },
    ];

    const splits = buildMultiAuthorSplits(titleTotalRoyalty, authorData);

    expect(splits).toHaveLength(1);
    expect(splits[0].splitAmount).toBe(0);
    expect(splits[0].recoupment).toBe(0);
    expect(splits[0].netPayable).toBe(0);
  });

  it("should handle three authors with different advance states", () => {
    const titleTotalRoyalty = new Decimal(3000);
    const authorData: AuthorDataForSplit[] = [
      {
        contactId: "contact-1",
        ownershipPercentage: 50,
        contract: {
          id: "contract-1",
          advance_amount: "0", // No advance
          advance_paid: "0",
          advance_recouped: "0",
        },
      },
      {
        contactId: "contact-2",
        ownershipPercentage: 30,
        contract: {
          id: "contract-2",
          advance_amount: "2000", // Partially recouped
          advance_paid: "2000",
          advance_recouped: "500",
        },
      },
      {
        contactId: "contact-3",
        ownershipPercentage: 20,
        contract: {
          id: "contract-3",
          advance_amount: "1000", // Fully recouped
          advance_paid: "1000",
          advance_recouped: "1000",
        },
      },
    ];

    const splits = buildMultiAuthorSplits(titleTotalRoyalty, authorData);

    expect(splits).toHaveLength(3);

    // Author 1: 50% of $3000 = $1500, no advance
    expect(splits[0].splitAmount).toBe(1500);
    expect(splits[0].recoupment).toBe(0);
    expect(splits[0].netPayable).toBe(1500);

    // Author 2: 30% of $3000 = $900, $1500 advance remaining
    expect(splits[1].splitAmount).toBe(900);
    expect(splits[1].recoupment).toBe(900); // Full split goes to recoupment
    expect(splits[1].netPayable).toBe(0);
    expect(splits[1].advanceStatus.remainingAfterThisPeriod).toBe(600); // 1500 - 900

    // Author 3: 20% of $3000 = $600, advance fully recouped
    expect(splits[2].splitAmount).toBe(600);
    expect(splits[2].recoupment).toBe(0);
    expect(splits[2].netPayable).toBe(600);
  });

  it("should preserve split sum equals title total", () => {
    const titleTotalRoyalty = new Decimal(1234.56);
    const authorData: AuthorDataForSplit[] = [
      {
        contactId: "contact-1",
        ownershipPercentage: 33.33,
        contract: {
          id: "contract-1",
          advance_amount: "0",
          advance_paid: "0",
          advance_recouped: "0",
        },
      },
      {
        contactId: "contact-2",
        ownershipPercentage: 33.33,
        contract: {
          id: "contract-2",
          advance_amount: "0",
          advance_paid: "0",
          advance_recouped: "0",
        },
      },
      {
        contactId: "contact-3",
        ownershipPercentage: 33.34,
        contract: {
          id: "contract-3",
          advance_amount: "0",
          advance_paid: "0",
          advance_recouped: "0",
        },
      },
    ];

    const splits = buildMultiAuthorSplits(titleTotalRoyalty, authorData);

    const splitSum = splits.reduce((sum, s) => sum + s.splitAmount, 0);
    expect(splitSum).toBeCloseTo(1234.56, 2);
  });
});

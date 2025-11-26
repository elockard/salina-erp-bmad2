import { describe, expect, it } from "vitest";
import {
  detectDuplicates,
  normalizeIsbn13,
  validateIsbn13,
  validateIsbn13Checksum,
} from "@/modules/isbn/utils";

/**
 * Unit tests for ISBN-13 validation utilities
 *
 * Story 2.7 - AC 5: Each ISBN validated with ISBN-13 checksum algorithm
 *
 * Test ISBNs used:
 * - 9780306406157 - Valid (The Elements of Style - known valid ISBN)
 * - 9780140449136 - Valid (The Odyssey - known valid ISBN)
 * - 9780201633610 - Valid (Design Patterns - known valid ISBN)
 * - 9781234567890 - Valid checksum (test ISBN)
 * - 9780306406158 - Invalid (wrong check digit - should be 7, not 8)
 * - 9791234567896 - Valid (979 prefix test)
 */

describe("normalizeIsbn13", () => {
  it("returns digits unchanged when no formatting", () => {
    expect(normalizeIsbn13("9780306406157")).toBe("9780306406157");
  });

  it("removes hyphens", () => {
    expect(normalizeIsbn13("978-0-306-40615-7")).toBe("9780306406157");
  });

  it("removes spaces", () => {
    expect(normalizeIsbn13("978 0 306 40615 7")).toBe("9780306406157");
  });

  it("removes mixed hyphens and spaces", () => {
    expect(normalizeIsbn13("978-0 306-40615 7")).toBe("9780306406157");
  });

  it("handles empty string", () => {
    expect(normalizeIsbn13("")).toBe("");
  });
});

describe("validateIsbn13Checksum", () => {
  describe("valid checksums", () => {
    it("validates 9780306406157 (The Elements of Style)", () => {
      expect(validateIsbn13Checksum("9780306406157")).toBe(true);
    });

    it("validates 9780140449136 (The Odyssey)", () => {
      expect(validateIsbn13Checksum("9780140449136")).toBe(true);
    });

    it("validates 9780201633610 (Design Patterns)", () => {
      expect(validateIsbn13Checksum("9780201633610")).toBe(true);
    });

    it("validates 9781234567897 (test ISBN with valid checksum)", () => {
      // Checksum calculation for 978123456789?:
      // (9*1 + 7*3 + 8*1 + 1*3 + 2*1 + 3*3 + 4*1 + 5*3 + 6*1 + 7*3 + 8*1 + 9*3) = 125
      // Check digit = (10 - (125 % 10)) % 10 = (10 - 5) % 10 = 5
      // Actually let me verify: 9+21+8+3+2+9+4+15+6+21+8+27 = 133
      // Check digit = (10 - 3) % 10 = 7
      expect(validateIsbn13Checksum("9781234567897")).toBe(true);
    });

    it("validates 9791234567896 (979 prefix)", () => {
      // 9*1 + 7*3 + 9*1 + 1*3 + 2*1 + 3*3 + 4*1 + 5*3 + 6*1 + 7*3 + 8*1 + 9*3
      // = 9 + 21 + 9 + 3 + 2 + 9 + 4 + 15 + 6 + 21 + 8 + 27 = 134
      // Check digit = (10 - 4) % 10 = 6
      expect(validateIsbn13Checksum("9791234567896")).toBe(true);
    });

    it("validates ISBN with hyphens", () => {
      expect(validateIsbn13Checksum("978-0-306-40615-7")).toBe(true);
    });

    it("validates ISBN with spaces", () => {
      expect(validateIsbn13Checksum("978 0 306 40615 7")).toBe(true);
    });
  });

  describe("invalid checksums", () => {
    it("rejects 9780306406158 (wrong check digit)", () => {
      // Should be 7, not 8
      expect(validateIsbn13Checksum("9780306406158")).toBe(false);
    });

    it("rejects 9780306406150 (wrong check digit)", () => {
      // Should be 7, not 0
      expect(validateIsbn13Checksum("9780306406150")).toBe(false);
    });

    it("rejects 9781234567890 (wrong check digit)", () => {
      // Should be 7, not 0
      expect(validateIsbn13Checksum("9781234567890")).toBe(false);
    });
  });

  describe("invalid format", () => {
    it("rejects too short", () => {
      expect(validateIsbn13Checksum("978030640615")).toBe(false);
    });

    it("rejects too long", () => {
      expect(validateIsbn13Checksum("97803064061577")).toBe(false);
    });

    it("rejects non-numeric", () => {
      expect(validateIsbn13Checksum("978030640615X")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateIsbn13Checksum("")).toBe(false);
    });
  });
});

describe("validateIsbn13", () => {
  describe("valid ISBNs", () => {
    it("accepts valid ISBN-13 with 978 prefix", () => {
      const result = validateIsbn13("9780306406157");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("accepts valid ISBN-13 with 979 prefix", () => {
      const result = validateIsbn13("9791234567896");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("accepts valid ISBN-13 with hyphens", () => {
      const result = validateIsbn13("978-0-306-40615-7");
      expect(result.valid).toBe(true);
    });

    it("accepts valid ISBN-13 with spaces", () => {
      const result = validateIsbn13("978 0 306 40615 7");
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid format", () => {
    it("rejects empty string", () => {
      const result = validateIsbn13("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("ISBN is required");
    });

    it("rejects whitespace-only", () => {
      const result = validateIsbn13("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("ISBN is required");
    });

    it("rejects wrong length (too short)", () => {
      const result = validateIsbn13("978030640615");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid length");
      expect(result.error).toContain("12 digits");
    });

    it("rejects wrong length (too long)", () => {
      const result = validateIsbn13("97803064061577");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid length");
      expect(result.error).toContain("14 digits");
    });

    it("rejects non-numeric characters", () => {
      const result = validateIsbn13("978030640615X");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("only digits");
    });
  });

  describe("invalid prefix", () => {
    it("rejects prefix not starting with 978 or 979", () => {
      const result = validateIsbn13("9770306406157");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid prefix");
      expect(result.error).toContain("978 or 979");
    });

    it("rejects 980 prefix", () => {
      const result = validateIsbn13("9801234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid prefix");
    });
  });

  describe("invalid checksum", () => {
    it("rejects valid format but wrong check digit", () => {
      const result = validateIsbn13("9780306406158");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid checksum");
    });

    it("provides specific error for checksum failure", () => {
      const result = validateIsbn13("9781234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid checksum: check digit does not match");
    });
  });
});

describe("detectDuplicates", () => {
  it("returns empty array when no duplicates", () => {
    const isbns = ["9780306406157", "9780140449136", "9780201633610"];
    const result = detectDuplicates(isbns);
    expect(result).toEqual([]);
  });

  it("detects single duplicate pair", () => {
    const isbns = ["9780306406157", "9780140449136", "9780306406157"];
    const result = detectDuplicates(isbns);
    expect(result).toHaveLength(1);
    expect(result[0].isbn).toBe("9780306406157");
    expect(result[0].rows).toEqual([1, 3]);
  });

  it("detects multiple duplicate pairs", () => {
    const isbns = [
      "9780306406157",
      "9780140449136",
      "9780306406157",
      "9780140449136",
    ];
    const result = detectDuplicates(isbns);
    expect(result).toHaveLength(2);
  });

  it("detects triple occurrence", () => {
    const isbns = [
      "9780306406157",
      "9780306406157",
      "9780140449136",
      "9780306406157",
    ];
    const result = detectDuplicates(isbns);
    expect(result).toHaveLength(1);
    expect(result[0].rows).toEqual([1, 2, 4]);
  });

  it("normalizes ISBNs before comparison (hyphens)", () => {
    const isbns = ["9780306406157", "978-0-306-40615-7"];
    const result = detectDuplicates(isbns);
    expect(result).toHaveLength(1);
    expect(result[0].rows).toEqual([1, 2]);
  });

  it("normalizes ISBNs before comparison (spaces)", () => {
    const isbns = ["9780306406157", "978 0 306 40615 7"];
    const result = detectDuplicates(isbns);
    expect(result).toHaveLength(1);
    expect(result[0].rows).toEqual([1, 2]);
  });

  it("returns empty array for empty input", () => {
    const result = detectDuplicates([]);
    expect(result).toEqual([]);
  });

  it("returns empty array for single ISBN", () => {
    const result = detectDuplicates(["9780306406157"]);
    expect(result).toEqual([]);
  });
});

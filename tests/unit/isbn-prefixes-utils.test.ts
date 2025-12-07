/**
 * ISBN Prefixes Utils Unit Tests
 *
 * Tests for ISBN prefix utility functions.
 * Story 7.4: Implement Publisher ISBN Prefix System
 * AC-7.4: ISBN generation, validation, and formatting utilities
 */

import { describe, expect, test } from "vitest";
import {
  calculateAvailablePercentage,
  calculateIsbn13CheckDigit,
  formatBlockSize,
  formatPrefix,
  generateIsbn13,
  getMaxBlockSizeForPrefix,
  validateBlockSizeForPrefix,
  validateIsbnPrefix,
} from "@/modules/isbn-prefixes/utils";

describe("calculateIsbn13CheckDigit", () => {
  describe("valid calculations", () => {
    test("calculates check digit for 978030640615", () => {
      // Known ISBN: 9780306406157 (The Elements of Style)
      expect(calculateIsbn13CheckDigit("978030640615")).toBe(7);
    });

    test("calculates check digit for 978014044913", () => {
      // Known ISBN: 9780140449136 (The Odyssey)
      expect(calculateIsbn13CheckDigit("978014044913")).toBe(6);
    });

    test("calculates check digit for 978020163361", () => {
      // Known ISBN: 9780201633610 (Design Patterns)
      expect(calculateIsbn13CheckDigit("978020163361")).toBe(0);
    });

    test("calculates check digit for 978123456789", () => {
      // 9+21+8+3+2+9+4+15+6+21+8+27 = 133
      // (10 - (133 % 10)) % 10 = (10 - 3) % 10 = 7
      expect(calculateIsbn13CheckDigit("978123456789")).toBe(7);
    });

    test("calculates check digit for 979123456789", () => {
      // 9+21+9+3+2+9+4+15+6+21+8+27 = 134
      // (10 - (134 % 10)) % 10 = (10 - 4) % 10 = 6
      expect(calculateIsbn13CheckDigit("979123456789")).toBe(6);
    });
  });

  describe("error handling", () => {
    test("throws error for input less than 12 digits", () => {
      expect(() => calculateIsbn13CheckDigit("97812345678")).toThrow(
        "Input must be exactly 12 digits",
      );
    });

    test("throws error for input more than 12 digits", () => {
      expect(() => calculateIsbn13CheckDigit("9781234567890")).toThrow(
        "Input must be exactly 12 digits",
      );
    });

    test("throws error for non-numeric input", () => {
      expect(() => calculateIsbn13CheckDigit("97812345678X")).toThrow(
        "Input must be exactly 12 digits",
      );
    });

    test("throws error for empty string", () => {
      expect(() => calculateIsbn13CheckDigit("")).toThrow(
        "Input must be exactly 12 digits",
      );
    });
  });
});

describe("generateIsbn13", () => {
  describe("valid generation", () => {
    test("generates ISBN from short prefix with title ID 0", () => {
      // 978-1-234567 (10 digits) + 00 (2 digits) + check = 13 digits
      const isbn = generateIsbn13("9781234567", 0);
      expect(isbn).toHaveLength(13);
      expect(isbn).toMatch(/^978123456700\d$/);
    });

    test("generates ISBN from short prefix with title ID 99", () => {
      const isbn = generateIsbn13("9781234567", 99);
      expect(isbn).toHaveLength(13);
      expect(isbn).toMatch(/^978123456799\d$/);
    });

    test("generates ISBN from longer prefix", () => {
      // 978-1-2345678 (11 digits) + 0 (1 digit) + check = 13 digits
      const isbn = generateIsbn13("97812345678", 0);
      expect(isbn).toHaveLength(13);
      expect(isbn).toMatch(/^978123456780\d$/);
    });

    test("handles prefix with hyphens", () => {
      const isbn = generateIsbn13("978-1-234567", 0);
      expect(isbn).toHaveLength(13);
      expect(isbn.startsWith("978123456700")).toBe(true);
    });

    test("handles prefix with spaces", () => {
      const isbn = generateIsbn13("978 1 234567", 0);
      expect(isbn).toHaveLength(13);
      expect(isbn.startsWith("978123456700")).toBe(true);
    });

    test("generated ISBN has valid check digit", () => {
      const isbn = generateIsbn13("9781234567", 0);
      // Verify check digit is valid
      const first12 = isbn.slice(0, 12);
      const checkDigit = Number.parseInt(isbn[12], 10);
      expect(calculateIsbn13CheckDigit(first12)).toBe(checkDigit);
    });
  });

  describe("error handling", () => {
    test("throws error for prefix that is too long", () => {
      expect(() => generateIsbn13("978123456789", 0)).toThrow(
        "Prefix is too long",
      );
    });

    test("throws error for title ID out of range (negative)", () => {
      expect(() => generateIsbn13("9781234567", -1)).toThrow("out of range");
    });

    test("throws error for title ID out of range (too high)", () => {
      // With 10-digit prefix, max title ID is 99
      expect(() => generateIsbn13("9781234567", 100)).toThrow("out of range");
    });
  });
});

describe("getMaxBlockSizeForPrefix", () => {
  test("returns 100 for 10-digit prefix", () => {
    expect(getMaxBlockSizeForPrefix("9781234567")).toBe(100);
  });

  test("returns 10 for 11-digit prefix", () => {
    expect(getMaxBlockSizeForPrefix("97812345678")).toBe(10);
  });

  test("returns 1000 for 9-digit prefix", () => {
    expect(getMaxBlockSizeForPrefix("978123456")).toBe(1000);
  });

  test("returns 10000 for 8-digit prefix", () => {
    expect(getMaxBlockSizeForPrefix("97812345")).toBe(10000);
  });

  test("returns 100000 for 7-digit prefix", () => {
    expect(getMaxBlockSizeForPrefix("9781234")).toBe(100000);
  });

  test("returns 0 for 12-digit prefix (invalid)", () => {
    expect(getMaxBlockSizeForPrefix("978123456789")).toBe(0);
  });

  test("handles prefix with hyphens", () => {
    expect(getMaxBlockSizeForPrefix("978-1-234567")).toBe(100);
  });
});

describe("validateBlockSizeForPrefix", () => {
  test("returns true for valid block size", () => {
    expect(validateBlockSizeForPrefix("9781234567", 100)).toBe(true);
    expect(validateBlockSizeForPrefix("9781234567", 10)).toBe(true);
  });

  test("returns false for block size exceeding max", () => {
    expect(validateBlockSizeForPrefix("9781234567", 1000)).toBe(false);
  });

  test("handles edge case of exact max size", () => {
    expect(validateBlockSizeForPrefix("9781234567", 100)).toBe(true);
  });
});

describe("validateIsbnPrefix", () => {
  describe("valid prefixes", () => {
    test("validates 10-digit 978 prefix", () => {
      const result = validateIsbnPrefix("9781234567");
      expect(result.valid).toBe(true);
      expect(result.normalizedPrefix).toBe("9781234567");
      expect(result.titleIdDigits).toBe(2);
      expect(result.maxBlockSize).toBe(100);
    });

    test("validates 10-digit 979 prefix", () => {
      const result = validateIsbnPrefix("9791234567");
      expect(result.valid).toBe(true);
      expect(result.normalizedPrefix).toBe("9791234567");
    });

    test("validates 7-digit prefix", () => {
      const result = validateIsbnPrefix("9781234");
      expect(result.valid).toBe(true);
      expect(result.titleIdDigits).toBe(5);
      expect(result.maxBlockSize).toBe(100000);
    });

    test("validates prefix with hyphens", () => {
      const result = validateIsbnPrefix("978-1-234567");
      expect(result.valid).toBe(true);
      expect(result.normalizedPrefix).toBe("9781234567");
    });

    test("validates prefix with spaces", () => {
      const result = validateIsbnPrefix("978 1 234567");
      expect(result.valid).toBe(true);
      expect(result.normalizedPrefix).toBe("9781234567");
    });
  });

  describe("invalid prefixes", () => {
    test("rejects prefix shorter than 7 digits", () => {
      const result = validateIsbnPrefix("978123");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least 7 digits");
    });

    test("rejects prefix longer than 12 digits", () => {
      const result = validateIsbnPrefix("9781234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot exceed 12 digits");
    });

    test("rejects prefix with non-digit characters", () => {
      const result = validateIsbnPrefix("978123456X");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("only digits");
    });

    test("rejects prefix not starting with 978 or 979", () => {
      const result = validateIsbnPrefix("9771234567");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("978 or 979");
    });

    test("rejects prefix starting with 980", () => {
      const result = validateIsbnPrefix("9801234567");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("978 or 979");
    });
  });
});

describe("formatBlockSize", () => {
  test("formats 10 as '10'", () => {
    expect(formatBlockSize(10)).toBe("10");
  });

  test("formats 100 as '100'", () => {
    expect(formatBlockSize(100)).toBe("100");
  });

  test("formats 1000 as '1K'", () => {
    expect(formatBlockSize(1000)).toBe("1K");
  });

  test("formats 10000 as '10K'", () => {
    expect(formatBlockSize(10000)).toBe("10K");
  });

  test("formats 100000 as '100K'", () => {
    expect(formatBlockSize(100000)).toBe("100K");
  });

  test("formats 1000000 as '1M'", () => {
    expect(formatBlockSize(1000000)).toBe("1M");
  });
});

describe("formatPrefix", () => {
  test("formats 10-digit prefix with hyphen", () => {
    expect(formatPrefix("9781234567")).toBe("978-1234567");
  });

  test("formats 7-digit prefix with hyphen", () => {
    expect(formatPrefix("9781234")).toBe("978-1234");
  });

  test("handles prefix that already has hyphens", () => {
    expect(formatPrefix("978-1-234567")).toBe("978-1234567");
  });

  test("returns short prefix unchanged", () => {
    expect(formatPrefix("978")).toBe("978");
  });
});

describe("calculateAvailablePercentage", () => {
  test("calculates 100% when all available", () => {
    expect(calculateAvailablePercentage(100, 100)).toBe(100);
  });

  test("calculates 0% when none available", () => {
    expect(calculateAvailablePercentage(0, 100)).toBe(0);
  });

  test("calculates 50% correctly", () => {
    expect(calculateAvailablePercentage(50, 100)).toBe(50);
  });

  test("rounds to nearest integer", () => {
    expect(calculateAvailablePercentage(33, 100)).toBe(33);
    expect(calculateAvailablePercentage(1, 3)).toBe(33);
    expect(calculateAvailablePercentage(2, 3)).toBe(67);
  });

  test("handles zero total", () => {
    expect(calculateAvailablePercentage(0, 0)).toBe(0);
  });

  test("handles large numbers", () => {
    expect(calculateAvailablePercentage(80000, 100000)).toBe(80);
  });
});

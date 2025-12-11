/**
 * Unit tests for TIN Validation Utilities
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.3: TIN Format Validation
 *
 * Tests verify:
 * - SSN format validation (XXX-XX-XXXX)
 * - EIN format validation (XX-XXXXXXX)
 * - Auto-formatting functions
 * - Masking functions for display
 * - Last 4 digit extraction
 */

import { describe, expect, it } from "vitest";
import {
  extractLastFour,
  formatEIN,
  formatSSN,
  maskTIN,
  validateEIN,
  validateSSN,
  validateTIN,
} from "@/lib/tin-validation";

describe("TIN Validation Utilities (AC-11.1.3)", () => {
  describe("validateSSN", () => {
    describe("valid SSN formats", () => {
      it("validates standard SSN format (XXX-XX-XXXX)", () => {
        expect(validateSSN("123-45-6789")).toBe(true);
      });

      it("validates SSN with leading zeros", () => {
        expect(validateSSN("001-02-0034")).toBe(true);
      });

      it("validates SSN with all same digits", () => {
        expect(validateSSN("111-11-1111")).toBe(true);
      });

      it("validates SSN at boundary values", () => {
        expect(validateSSN("000-00-0000")).toBe(true);
        expect(validateSSN("999-99-9999")).toBe(true);
      });
    });

    describe("invalid SSN formats", () => {
      it("rejects SSN without dashes", () => {
        expect(validateSSN("123456789")).toBe(false);
      });

      it("rejects SSN with spaces instead of dashes", () => {
        expect(validateSSN("123 45 6789")).toBe(false);
      });

      it("rejects SSN with wrong dash positions", () => {
        expect(validateSSN("12-345-6789")).toBe(false);
        expect(validateSSN("1234-5-6789")).toBe(false);
      });

      it("rejects SSN with too few digits", () => {
        expect(validateSSN("12-34-5678")).toBe(false);
        expect(validateSSN("123-4-6789")).toBe(false);
      });

      it("rejects SSN with too many digits", () => {
        expect(validateSSN("1234-56-78901")).toBe(false);
      });

      it("rejects SSN with letters", () => {
        expect(validateSSN("12A-45-6789")).toBe(false);
        expect(validateSSN("ABC-DE-FGHI")).toBe(false);
      });

      it("rejects empty string", () => {
        expect(validateSSN("")).toBe(false);
      });

      it("rejects null/undefined-like values", () => {
        expect(validateSSN("null")).toBe(false);
        expect(validateSSN("undefined")).toBe(false);
      });
    });
  });

  describe("validateEIN", () => {
    describe("valid EIN formats", () => {
      it("validates standard EIN format (XX-XXXXXXX)", () => {
        expect(validateEIN("12-3456789")).toBe(true);
      });

      it("validates EIN with leading zeros", () => {
        expect(validateEIN("01-0234567")).toBe(true);
      });

      it("validates EIN with all same digits", () => {
        expect(validateEIN("11-1111111")).toBe(true);
      });

      it("validates EIN at boundary values", () => {
        expect(validateEIN("00-0000000")).toBe(true);
        expect(validateEIN("99-9999999")).toBe(true);
      });
    });

    describe("invalid EIN formats", () => {
      it("rejects EIN without dash", () => {
        expect(validateEIN("123456789")).toBe(false);
      });

      it("rejects EIN with wrong dash position", () => {
        expect(validateEIN("123-456789")).toBe(false);
        expect(validateEIN("1-23456789")).toBe(false);
      });

      it("rejects EIN with too few digits", () => {
        expect(validateEIN("1-2345678")).toBe(false);
        expect(validateEIN("12-345678")).toBe(false);
      });

      it("rejects EIN with too many digits", () => {
        expect(validateEIN("123-45678901")).toBe(false);
      });

      it("rejects EIN with letters", () => {
        expect(validateEIN("1A-3456789")).toBe(false);
      });

      it("rejects empty string", () => {
        expect(validateEIN("")).toBe(false);
      });
    });
  });

  describe("validateTIN", () => {
    it("validates SSN when type is ssn", () => {
      expect(validateTIN("123-45-6789", "ssn")).toBe(true);
      expect(validateTIN("12-3456789", "ssn")).toBe(false);
    });

    it("validates EIN when type is ein", () => {
      expect(validateTIN("12-3456789", "ein")).toBe(true);
      expect(validateTIN("123-45-6789", "ein")).toBe(false);
    });
  });

  describe("formatSSN", () => {
    it("formats raw digits to SSN format", () => {
      expect(formatSSN("123456789")).toBe("123-45-6789");
    });

    it("formats partial input progressively", () => {
      expect(formatSSN("1")).toBe("1");
      expect(formatSSN("12")).toBe("12");
      expect(formatSSN("123")).toBe("123");
      expect(formatSSN("1234")).toBe("123-4");
      expect(formatSSN("12345")).toBe("123-45");
      expect(formatSSN("123456")).toBe("123-45-6");
      expect(formatSSN("1234567")).toBe("123-45-67");
      expect(formatSSN("12345678")).toBe("123-45-678");
      expect(formatSSN("123456789")).toBe("123-45-6789");
    });

    it("strips non-digit characters", () => {
      expect(formatSSN("123-45-6789")).toBe("123-45-6789");
      expect(formatSSN("123 45 6789")).toBe("123-45-6789");
      expect(formatSSN("(123) 45-6789")).toBe("123-45-6789");
    });

    it("truncates to 9 digits", () => {
      expect(formatSSN("12345678901234")).toBe("123-45-6789");
    });

    it("handles empty string", () => {
      expect(formatSSN("")).toBe("");
    });

    it("handles pasted value with dashes", () => {
      expect(formatSSN("123-45-6789")).toBe("123-45-6789");
    });
  });

  describe("formatEIN", () => {
    it("formats raw digits to EIN format", () => {
      expect(formatEIN("123456789")).toBe("12-3456789");
    });

    it("formats partial input progressively", () => {
      expect(formatEIN("1")).toBe("1");
      expect(formatEIN("12")).toBe("12");
      expect(formatEIN("123")).toBe("12-3");
      expect(formatEIN("1234")).toBe("12-34");
      expect(formatEIN("12345")).toBe("12-345");
      expect(formatEIN("123456")).toBe("12-3456");
      expect(formatEIN("1234567")).toBe("12-34567");
      expect(formatEIN("12345678")).toBe("12-345678");
      expect(formatEIN("123456789")).toBe("12-3456789");
    });

    it("strips non-digit characters", () => {
      expect(formatEIN("12-3456789")).toBe("12-3456789");
      expect(formatEIN("12 3456789")).toBe("12-3456789");
    });

    it("truncates to 9 digits", () => {
      expect(formatEIN("12345678901234")).toBe("12-3456789");
    });

    it("handles empty string", () => {
      expect(formatEIN("")).toBe("");
    });

    it("handles pasted value with dash", () => {
      expect(formatEIN("12-3456789")).toBe("12-3456789");
    });
  });

  describe("maskTIN", () => {
    describe("SSN masking", () => {
      it("masks SSN showing only last 4 digits", () => {
        expect(maskTIN("6789", "ssn")).toBe("***-**-6789");
      });

      it("handles last 4 with leading zeros", () => {
        expect(maskTIN("0123", "ssn")).toBe("***-**-0123");
      });
    });

    describe("EIN masking", () => {
      it("masks EIN showing only last 4 digits", () => {
        expect(maskTIN("6789", "ein")).toBe("**-***6789");
      });

      it("handles last 4 with leading zeros", () => {
        expect(maskTIN("0123", "ein")).toBe("**-***0123");
      });
    });

    it("handles empty last four", () => {
      expect(maskTIN("", "ssn")).toBe("***-**-");
      expect(maskTIN("", "ein")).toBe("**-***");
    });
  });

  describe("extractLastFour", () => {
    it("extracts last 4 from formatted SSN", () => {
      expect(extractLastFour("123-45-6789")).toBe("6789");
    });

    it("extracts last 4 from formatted EIN", () => {
      expect(extractLastFour("12-3456789")).toBe("6789");
    });

    it("extracts last 4 from unformatted digits", () => {
      expect(extractLastFour("123456789")).toBe("6789");
    });

    it("handles short input", () => {
      expect(extractLastFour("123")).toBe("123");
      expect(extractLastFour("12")).toBe("12");
      expect(extractLastFour("1")).toBe("1");
    });

    it("handles empty string", () => {
      expect(extractLastFour("")).toBe("");
    });

    it("strips non-digits before extracting", () => {
      expect(extractLastFour("123-45-6789")).toBe("6789");
    });
  });
});

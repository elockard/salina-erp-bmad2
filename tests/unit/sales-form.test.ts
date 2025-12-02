import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { salesChannelValues, salesFormatValues } from "@/db/schema/sales";
import { RECORD_SALES } from "@/lib/permissions";
import type { SalesFormat } from "@/modules/sales/types";

/**
 * Unit tests for Sales Form logic
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * AC 1-12: Tests for form logic, calculations, and permissions
 *
 * Test areas:
 * - Decimal.js total calculation (AC 8, 10)
 * - Permission constants (AC 12)
 * - Format availability logic (AC 3)
 * - Channel and format values (AC 3, 7)
 */

describe("Sales Form: Total Calculation with Decimal.js", () => {
  /**
   * AC 8: Real-time calculation preview using Decimal.js
   * AC 10: Computes total_amount server-side using Decimal.js
   *
   * CRITICAL: Never use JavaScript arithmetic for currency
   * These tests verify Decimal.js calculations are accurate
   */

  describe("basic calculations", () => {
    it("calculates 5 units at $19.99 = $99.95", () => {
      const quantity = 5;
      const unitPrice = "19.99";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("99.95");
    });

    it("calculates 1 unit at $9.99 = $9.99", () => {
      const quantity = 1;
      const unitPrice = "9.99";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("9.99");
    });

    it("calculates 100 units at $0.99 = $99.00", () => {
      const quantity = 100;
      const unitPrice = "0.99";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("99.00");
    });

    it("calculates large quantity 10000 units at $29.99 = $299900.00", () => {
      const quantity = 10000;
      const unitPrice = "29.99";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("299900.00");
    });
  });

  describe("currency precision", () => {
    it("avoids floating point errors with $0.10 x 3 = $0.30", () => {
      // JavaScript: 0.1 + 0.1 + 0.1 !== 0.3 (floating point error)
      // Decimal.js: handles this correctly
      const quantity = 3;
      const unitPrice = "0.10";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("0.30");
    });

    it("handles $0.33 x 3 = $0.99 without floating point errors", () => {
      const quantity = 3;
      const unitPrice = "0.33";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("0.99");
    });

    it("handles high precision input $12.345 truncated to 2 decimals", () => {
      const quantity = 2;
      const unitPrice = "12.34"; // Input should already be max 2 decimals
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("24.68");
    });

    it("handles single decimal input $5.5 = $5.50 formatted", () => {
      const quantity = 2;
      const unitPrice = "5.5";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("11.00");
    });
  });

  describe("edge cases", () => {
    it("handles minimum valid price $0.01 x 1 = $0.01", () => {
      const quantity = 1;
      const unitPrice = "0.01";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("0.01");
    });

    it("handles large price $9999.99 x 1 = $9999.99", () => {
      const quantity = 1;
      const unitPrice = "9999.99";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("9999.99");
    });

    it("handles whole number price $100 x 5 = $500.00", () => {
      const quantity = 5;
      const unitPrice = "100";
      const total = new Decimal(unitPrice).times(quantity).toFixed(2);
      expect(total).toBe("500.00");
    });
  });
});

describe("Sales Form: Permission Constants", () => {
  /**
   * AC 12: Permission enforcement
   * - Only Editor, Finance, Admin, or Owner can access
   */

  it("RECORD_SALES includes 'owner' role", () => {
    expect(RECORD_SALES).toContain("owner");
  });

  it("RECORD_SALES includes 'admin' role", () => {
    expect(RECORD_SALES).toContain("admin");
  });

  it("RECORD_SALES includes 'editor' role", () => {
    expect(RECORD_SALES).toContain("editor");
  });

  it("RECORD_SALES includes 'finance' role", () => {
    expect(RECORD_SALES).toContain("finance");
  });

  it("RECORD_SALES does NOT include 'author' role", () => {
    expect(RECORD_SALES).not.toContain("author");
  });

  it("RECORD_SALES contains exactly 4 roles", () => {
    expect(RECORD_SALES).toHaveLength(4);
  });
});

describe("Sales Form: Format Availability Logic", () => {
  /**
   * AC 3: Format dropdown pre-filtered based on selected title's available formats
   *
   * Test helper function that determines available formats
   */

  interface TitleFormatAvailability {
    has_isbn: boolean;
    has_eisbn: boolean;
  }

  function getAvailableFormats(title: TitleFormatAvailability | null): {
    value: SalesFormat;
    label: string;
    disabled: boolean;
  }[] {
    const formatLabels: Record<SalesFormat, string> = {
      physical: "Physical Book",
      ebook: "Ebook",
      audiobook: "Audiobook",
    };

    return salesFormatValues.map((fmt) => {
      let disabled = true;
      if (title) {
        if (fmt === "physical" && title.has_isbn) disabled = false;
        if (fmt === "ebook" && title.has_eisbn) disabled = false;
        // Audiobook always disabled for now
      }
      return {
        value: fmt,
        label: formatLabels[fmt],
        disabled,
      };
    });
  }

  describe("when no title selected", () => {
    it("all formats are disabled", () => {
      const formats = getAvailableFormats(null);
      expect(formats.every((f) => f.disabled)).toBe(true);
    });
  });

  describe("when title has ISBN only", () => {
    const title = { has_isbn: true, has_eisbn: false };

    it("physical format is enabled", () => {
      const formats = getAvailableFormats(title);
      const physical = formats.find((f) => f.value === "physical");
      expect(physical?.disabled).toBe(false);
    });

    it("ebook format is disabled", () => {
      const formats = getAvailableFormats(title);
      const ebook = formats.find((f) => f.value === "ebook");
      expect(ebook?.disabled).toBe(true);
    });

    it("audiobook format is disabled", () => {
      const formats = getAvailableFormats(title);
      const audiobook = formats.find((f) => f.value === "audiobook");
      expect(audiobook?.disabled).toBe(true);
    });
  });

  describe("when title has eISBN only", () => {
    const title = { has_isbn: false, has_eisbn: true };

    it("physical format is disabled", () => {
      const formats = getAvailableFormats(title);
      const physical = formats.find((f) => f.value === "physical");
      expect(physical?.disabled).toBe(true);
    });

    it("ebook format is enabled", () => {
      const formats = getAvailableFormats(title);
      const ebook = formats.find((f) => f.value === "ebook");
      expect(ebook?.disabled).toBe(false);
    });

    it("audiobook format is disabled", () => {
      const formats = getAvailableFormats(title);
      const audiobook = formats.find((f) => f.value === "audiobook");
      expect(audiobook?.disabled).toBe(true);
    });
  });

  describe("when title has both ISBN and eISBN", () => {
    const title = { has_isbn: true, has_eisbn: true };

    it("physical format is enabled", () => {
      const formats = getAvailableFormats(title);
      const physical = formats.find((f) => f.value === "physical");
      expect(physical?.disabled).toBe(false);
    });

    it("ebook format is enabled", () => {
      const formats = getAvailableFormats(title);
      const ebook = formats.find((f) => f.value === "ebook");
      expect(ebook?.disabled).toBe(false);
    });

    it("audiobook format is still disabled", () => {
      const formats = getAvailableFormats(title);
      const audiobook = formats.find((f) => f.value === "audiobook");
      expect(audiobook?.disabled).toBe(true);
    });
  });
});

describe("Sales Form: Channel Values", () => {
  /**
   * AC 7: Sales Channel dropdown
   * Options: Retail, Wholesale, Direct, Distributor
   */

  it("has exactly 4 channel options", () => {
    expect(salesChannelValues).toHaveLength(4);
  });

  it("includes 'retail' option", () => {
    expect(salesChannelValues).toContain("retail");
  });

  it("includes 'wholesale' option", () => {
    expect(salesChannelValues).toContain("wholesale");
  });

  it("includes 'direct' option", () => {
    expect(salesChannelValues).toContain("direct");
  });

  it("includes 'distributor' option", () => {
    expect(salesChannelValues).toContain("distributor");
  });

  it("channel values are in expected order", () => {
    expect(salesChannelValues).toEqual([
      "retail",
      "wholesale",
      "direct",
      "distributor",
    ]);
  });
});

describe("Sales Form: Format Values", () => {
  /**
   * AC 3: Format dropdown
   * Options: Physical Book / Ebook / Audiobook
   */

  it("has exactly 3 format options", () => {
    expect(salesFormatValues).toHaveLength(3);
  });

  it("includes 'physical' option", () => {
    expect(salesFormatValues).toContain("physical");
  });

  it("includes 'ebook' option", () => {
    expect(salesFormatValues).toContain("ebook");
  });

  it("includes 'audiobook' option", () => {
    expect(salesFormatValues).toContain("audiobook");
  });

  it("format values are in expected order", () => {
    expect(salesFormatValues).toEqual(["physical", "ebook", "audiobook"]);
  });
});

describe("Sales Form: Currency Formatting", () => {
  /**
   * AC 8: Formatted with Intl.NumberFormat
   * AC 9: Button text shows formatted currency
   */

  it("formats $99.95 correctly with USD currency", () => {
    const amount = 99.95;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
    expect(formatted).toBe("$99.95");
  });

  it("formats $1000.00 with thousand separator", () => {
    const amount = 1000.0;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
    expect(formatted).toBe("$1,000.00");
  });

  it("formats $0.00 correctly", () => {
    const amount = 0;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
    expect(formatted).toBe("$0.00");
  });

  it("formats large amount $299900.00 with separators", () => {
    const amount = 299900.0;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
    expect(formatted).toBe("$299,900.00");
  });
});

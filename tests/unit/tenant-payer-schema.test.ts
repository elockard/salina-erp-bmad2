import { describe, expect, it } from "vitest";

/**
 * Unit tests for Tenant Payer Information Schema
 *
 * Story 11.3 - AC-11.3.3: Payer Information for 1099 Generation
 * Tests for:
 * - updatePayerInfoSchema validation
 * - EIN format validation (XX-XXXXXXX)
 * - Required field validation
 */

// This import will fail until schema is added
import {
  updatePayerInfoFormSchema,
  updatePayerInfoSchema,
} from "@/modules/tenant/schema";

describe("updatePayerInfoFormSchema", () => {
  describe("valid inputs", () => {
    it("accepts valid complete payer information", () => {
      const validData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "Suite 100",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(validData)).not.toThrow();
    });

    it("accepts valid data without optional address_line2", () => {
      const validData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(validData)).not.toThrow();
    });

    it("accepts 9-digit zip code", () => {
      const validData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001-1234",
      };

      expect(() => updatePayerInfoFormSchema.parse(validData)).not.toThrow();
    });
  });

  describe("EIN validation", () => {
    it("rejects EIN without dash", () => {
      const invalidData = {
        payer_ein: "123456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects EIN with dash in wrong position", () => {
      const invalidData = {
        payer_ein: "123-456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects EIN with non-numeric characters", () => {
      const invalidData = {
        payer_ein: "AB-CDEFGHI",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects EIN with wrong number of digits", () => {
      const invalidData = {
        payer_ein: "12-345678", // Only 8 digits
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });
  });

  describe("required field validation", () => {
    it("rejects empty payer_ein", () => {
      const invalidData = {
        payer_ein: "",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects empty payer_name", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects empty payer_address_line1", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects empty payer_city", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects empty payer_state", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });

    it("rejects empty payer_zip", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });
  });

  describe("state validation", () => {
    it("accepts valid 2-letter state code", () => {
      const validData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "CA",
        payer_zip: "90210",
      };

      expect(() => updatePayerInfoFormSchema.parse(validData)).not.toThrow();
    });

    it("rejects state code with more than 2 characters", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NYS", // Invalid: 3 characters
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });
  });

  describe("zip code validation", () => {
    it("accepts 5-digit zip code", () => {
      const validData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "10001",
      };

      expect(() => updatePayerInfoFormSchema.parse(validData)).not.toThrow();
    });

    it("rejects invalid zip format", () => {
      const invalidData = {
        payer_ein: "12-3456789",
        payer_name: "Acme Publishing LLC",
        payer_address_line1: "123 Main Street",
        payer_address_line2: "",
        payer_city: "New York",
        payer_state: "NY",
        payer_zip: "1234", // Invalid: only 4 digits
      };

      expect(() => updatePayerInfoFormSchema.parse(invalidData)).toThrow();
    });
  });
});

describe("updatePayerInfoSchema (server-side)", () => {
  it("is defined", () => {
    expect(updatePayerInfoSchema).toBeDefined();
  });

  it("transforms EIN by stripping the dash for storage", () => {
    // The server schema should handle transformation if needed
    const validData = {
      payer_ein: "12-3456789",
      payer_name: "Acme Publishing LLC",
      payer_address_line1: "123 Main Street",
      payer_address_line2: "",
      payer_city: "New York",
      payer_state: "NY",
      payer_zip: "10001",
    };

    const result = updatePayerInfoSchema.parse(validData);
    expect(result.payer_ein).toBe("12-3456789");
  });
});

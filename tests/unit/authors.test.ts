import { describe, expect, it } from "vitest";
import {
  createAuthorSchema,
  paymentMethodEnum,
  updateAuthorSchema,
} from "@/modules/authors/schema";

/**
 * Unit tests for Author Zod schemas
 *
 * Story 2.2 - AC 16: Form validation uses Zod schema with inline error messages
 */

describe("createAuthorSchema", () => {
  describe("valid inputs", () => {
    it("accepts valid input with all fields", () => {
      const result = createAuthorSchema.safeParse({
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "(555) 123-4567",
        address: "123 Main St, City, ST 12345",
        tax_id: "123-45-6789",
        payment_method: "direct_deposit",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Alice Johnson");
        expect(result.data.email).toBe("alice@example.com");
        expect(result.data.payment_method).toBe("direct_deposit");
      }
    });

    it("accepts valid input with only required fields", () => {
      const result = createAuthorSchema.safeParse({
        name: "Bob Smith",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Bob Smith");
        expect(result.data.email).toBeUndefined();
      }
    });

    it("accepts empty string for optional email", () => {
      const result = createAuthorSchema.safeParse({
        name: "Carol White",
        email: "",
      });

      expect(result.success).toBe(true);
    });

    it("accepts all valid payment methods", () => {
      const methods = ["direct_deposit", "check", "wire_transfer"] as const;

      for (const method of methods) {
        const result = createAuthorSchema.safeParse({
          name: "Test Author",
          payment_method: method,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.payment_method).toBe(method);
        }
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing name", () => {
      const result = createAuthorSchema.safeParse({
        email: "test@example.com",
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createAuthorSchema.safeParse({
        name: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Name is required");
      }
    });

    it("rejects name exceeding max length", () => {
      const result = createAuthorSchema.safeParse({
        name: "A".repeat(256),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Name is too long");
      }
    });

    it("rejects invalid email format", () => {
      const result = createAuthorSchema.safeParse({
        name: "Test Author",
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid email format");
      }
    });

    it("rejects invalid payment method", () => {
      const result = createAuthorSchema.safeParse({
        name: "Test Author",
        payment_method: "cash",
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("updateAuthorSchema", () => {
  it("accepts partial updates", () => {
    const result = updateAuthorSchema.safeParse({
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateAuthorSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("validates fields when provided", () => {
    const result = updateAuthorSchema.safeParse({
      email: "invalid-email",
    });

    expect(result.success).toBe(false);
  });
});

describe("paymentMethodEnum", () => {
  it("accepts valid payment methods", () => {
    expect(paymentMethodEnum.safeParse("direct_deposit").success).toBe(true);
    expect(paymentMethodEnum.safeParse("check").success).toBe(true);
    expect(paymentMethodEnum.safeParse("wire_transfer").success).toBe(true);
  });

  it("rejects invalid payment methods", () => {
    expect(paymentMethodEnum.safeParse("cash").success).toBe(false);
    expect(paymentMethodEnum.safeParse("bitcoin").success).toBe(false);
    expect(paymentMethodEnum.safeParse("").success).toBe(false);
  });
});

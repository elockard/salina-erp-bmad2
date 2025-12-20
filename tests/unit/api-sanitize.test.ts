/**
 * API Sanitize Utilities Tests
 *
 * Story 15.2 - Task 1: Contact field sanitization
 */

import { describe, expect, it } from "vitest";
import {
  CONTACT_SENSITIVE_FIELDS,
  sanitizeContact,
} from "@/modules/api/utils/sanitize";

describe("API Sanitize Utilities", () => {
  describe("CONTACT_SENSITIVE_FIELDS", () => {
    it("includes all expected sensitive fields", () => {
      expect(CONTACT_SENSITIVE_FIELDS).toContain("tax_id");
      expect(CONTACT_SENSITIVE_FIELDS).toContain("tin_encrypted");
      expect(CONTACT_SENSITIVE_FIELDS).toContain("tin_type");
      expect(CONTACT_SENSITIVE_FIELDS).toContain("tin_last_four");
      expect(CONTACT_SENSITIVE_FIELDS).toContain("payment_info");
      expect(CONTACT_SENSITIVE_FIELDS).toContain("w9_received");
      expect(CONTACT_SENSITIVE_FIELDS).toContain("w9_received_date");
    });
  });

  describe("sanitizeContact", () => {
    it("removes all sensitive fields from contact", () => {
      const contact = {
        id: "123",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        tax_id: "123-45-6789",
        tin_encrypted: "encrypted_data",
        tin_type: "ssn",
        tin_last_four: "6789",
        payment_info: { bank: "Chase" },
        w9_received: true,
        w9_received_date: new Date(),
      };

      const sanitized = sanitizeContact(contact);

      expect(sanitized.id).toBe("123");
      expect(sanitized.first_name).toBe("John");
      expect(sanitized.last_name).toBe("Doe");
      expect(sanitized.email).toBe("john@example.com");

      expect(sanitized).not.toHaveProperty("tax_id");
      expect(sanitized).not.toHaveProperty("tin_encrypted");
      expect(sanitized).not.toHaveProperty("tin_type");
      expect(sanitized).not.toHaveProperty("tin_last_four");
      expect(sanitized).not.toHaveProperty("payment_info");
      expect(sanitized).not.toHaveProperty("w9_received");
      expect(sanitized).not.toHaveProperty("w9_received_date");
    });

    it("preserves non-sensitive fields", () => {
      const contact = {
        id: "123",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
        phone: "555-1234",
        address_line1: "123 Main St",
        city: "New York",
        state: "NY",
        postal_code: "10001",
        country: "USA",
        status: "active",
        created_at: new Date("2024-01-15"),
        updated_at: new Date("2024-01-20"),
      };

      const sanitized = sanitizeContact(contact);

      expect(sanitized.id).toBe("123");
      expect(sanitized.first_name).toBe("Jane");
      expect(sanitized.last_name).toBe("Smith");
      expect(sanitized.email).toBe("jane@example.com");
      expect(sanitized.phone).toBe("555-1234");
      expect(sanitized.address_line1).toBe("123 Main St");
      expect(sanitized.city).toBe("New York");
      expect(sanitized.state).toBe("NY");
      expect(sanitized.postal_code).toBe("10001");
      expect(sanitized.country).toBe("USA");
      expect(sanitized.status).toBe("active");
    });

    it("does not modify original object", () => {
      const contact = {
        id: "123",
        first_name: "John",
        tax_id: "123-45-6789",
      };

      sanitizeContact(contact);

      expect(contact.tax_id).toBe("123-45-6789");
    });

    it("handles contact with no sensitive fields", () => {
      const contact = {
        id: "123",
        first_name: "John",
        last_name: "Doe",
      };

      const sanitized = sanitizeContact(contact);

      expect(sanitized).toEqual(contact);
    });

    it("handles contact with null/undefined sensitive fields", () => {
      const contact = {
        id: "123",
        first_name: "John",
        tax_id: null,
        tin_encrypted: undefined,
        payment_info: null,
      };

      const sanitized = sanitizeContact(contact);

      expect(sanitized).not.toHaveProperty("tax_id");
      expect(sanitized).not.toHaveProperty("tin_encrypted");
      expect(sanitized).not.toHaveProperty("payment_info");
    });
  });
});

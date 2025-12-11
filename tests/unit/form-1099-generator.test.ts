import { describe, expect, it } from "vitest";

/**
 * Unit tests for Form 1099 Generator Service
 *
 * Story 11.3 - AC-11.3.5: 1099-MISC PDF generation
 */

import {
  generate1099S3Key,
  generateForm1099PDF,
  parse1099S3Key,
} from "@/modules/form-1099/generator";
import type { Form1099PDFData } from "@/modules/form-1099/types";

// Mock data
const mockFormData: Form1099PDFData = {
  form_id: "550e8400-e29b-41d4-a716-446655440000",
  tax_year: 2024,
  amount: "1500.00",
  payer: {
    name: "Acme Publishing LLC",
    ein_last_four: "6789",
    address_line1: "123 Main Street",
    address_line2: "Suite 100",
    city: "New York",
    state: "NY",
    zip: "10001",
  },
  recipient: {
    id: "contact-123",
    name: "Jane Author",
    tin_last_four: "1234",
    tin_type: "ssn",
    address_line1: "456 Oak Avenue",
    address_line2: null,
    city: "Los Angeles",
    state: "CA",
    zip: "90001",
  },
};

describe("generateForm1099PDF", () => {
  it("generates a PDF buffer", async () => {
    const buffer = await generateForm1099PDF(mockFormData);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("generates valid PDF header bytes", async () => {
    const buffer = await generateForm1099PDF(mockFormData);

    // PDF files start with %PDF-
    const header = buffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("generates different PDFs for different data", async () => {
    const buffer1 = await generateForm1099PDF(mockFormData);
    const buffer2 = await generateForm1099PDF({
      ...mockFormData,
      amount: "2000.00",
    });

    // Buffers should be different (different content)
    expect(buffer1.equals(buffer2)).toBe(false);
  });
});

describe("generate1099S3Key", () => {
  it("generates correct S3 key format", () => {
    const tenantId = "tenant-123-uuid";
    const taxYear = 2024;
    const formId = "form-456-uuid";

    const key = generate1099S3Key(tenantId, taxYear, formId);

    expect(key).toBe("1099/tenant-123-uuid/2024/form-456-uuid.pdf");
  });

  it("handles different tax years", () => {
    const key2023 = generate1099S3Key("tenant", 2023, "form");
    const key2025 = generate1099S3Key("tenant", 2025, "form");

    expect(key2023).toContain("/2023/");
    expect(key2025).toContain("/2025/");
  });

  it("generates unique keys for different forms", () => {
    const key1 = generate1099S3Key("tenant", 2024, "form-1");
    const key2 = generate1099S3Key("tenant", 2024, "form-2");

    expect(key1).not.toBe(key2);
  });
});

describe("parse1099S3Key", () => {
  it("parses valid S3 key", () => {
    const key = "1099/tenant-123-uuid/2024/form-456-uuid.pdf";
    const parsed = parse1099S3Key(key);

    expect(parsed).not.toBeNull();
    expect(parsed?.tenantId).toBe("tenant-123-uuid");
    expect(parsed?.taxYear).toBe(2024);
    expect(parsed?.formId).toBe("form-456-uuid");
  });

  it("parses key with UUID format", () => {
    const key =
      "1099/550e8400-e29b-41d4-a716-446655440000/2024/660e8400-e29b-41d4-a716-446655440001.pdf";
    const parsed = parse1099S3Key(key);

    expect(parsed).not.toBeNull();
    expect(parsed?.tenantId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed?.taxYear).toBe(2024);
    expect(parsed?.formId).toBe("660e8400-e29b-41d4-a716-446655440001");
  });

  it("returns null for invalid format - missing prefix", () => {
    const key = "tenant-123/2024/form-456.pdf";
    const parsed = parse1099S3Key(key);

    expect(parsed).toBeNull();
  });

  it("returns null for invalid format - wrong extension", () => {
    const key = "1099/tenant-123/2024/form-456.txt";
    const parsed = parse1099S3Key(key);

    expect(parsed).toBeNull();
  });

  it("returns null for invalid format - invalid year", () => {
    const key = "1099/tenant-123/abcd/form-456.pdf";
    const parsed = parse1099S3Key(key);

    expect(parsed).toBeNull();
  });

  it("roundtrip: generate then parse", () => {
    const tenantId = "550e8400-e29b-41d4-a716-446655440000";
    const taxYear = 2024;
    const formId = "660e8400-e29b-41d4-a716-446655440001";

    const key = generate1099S3Key(tenantId, taxYear, formId);
    const parsed = parse1099S3Key(key);

    expect(parsed).not.toBeNull();
    expect(parsed?.tenantId).toBe(tenantId);
    expect(parsed?.taxYear).toBe(taxYear);
    expect(parsed?.formId).toBe(formId);
  });
});

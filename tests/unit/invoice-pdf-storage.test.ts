/**
 * Invoice PDF Storage Unit Tests
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 13: Unit Tests
 *
 * Tests:
 * - S3 key generation with proper pattern
 * - Key format validation
 * - Tenant/invoice ID handling
 */

import { describe, expect, it } from "vitest";
import { generateInvoiceS3Key } from "@/modules/invoices/storage";

describe("generateInvoiceS3Key", () => {
  it("generates key with correct pattern invoices/{tenant_id}/{invoice_id}.pdf", () => {
    const tenantId = "tenant-123";
    const invoiceId = "invoice-456";

    const key = generateInvoiceS3Key(tenantId, invoiceId);

    expect(key).toBe("invoices/tenant-123/invoice-456.pdf");
  });

  it("includes tenant_id in the path", () => {
    const tenantId = "550e8400-e29b-41d4-a716-446655440000";
    const invoiceId = "inv-001";

    const key = generateInvoiceS3Key(tenantId, invoiceId);

    expect(key).toContain(tenantId);
  });

  it("includes invoice_id in the filename", () => {
    const tenantId = "tenant-1";
    const invoiceId = "550e8400-e29b-41d4-a716-446655440001";

    const key = generateInvoiceS3Key(tenantId, invoiceId);

    expect(key).toContain(invoiceId);
  });

  it("ends with .pdf extension", () => {
    const key = generateInvoiceS3Key("tenant-1", "invoice-1");

    expect(key).toMatch(/\.pdf$/);
  });

  it("starts with invoices/ prefix", () => {
    const key = generateInvoiceS3Key("tenant-1", "invoice-1");

    expect(key).toMatch(/^invoices\//);
  });

  it("handles UUID-style tenant and invoice IDs", () => {
    const tenantId = "550e8400-e29b-41d4-a716-446655440000";
    const invoiceId = "660e9511-f39c-52e5-b827-557766551111";

    const key = generateInvoiceS3Key(tenantId, invoiceId);

    expect(key).toBe(`invoices/${tenantId}/${invoiceId}.pdf`);
  });

  it("handles hyphenated IDs correctly", () => {
    const tenantId = "my-test-tenant";
    const invoiceId = "my-test-invoice";

    const key = generateInvoiceS3Key(tenantId, invoiceId);

    expect(key).toBe("invoices/my-test-tenant/my-test-invoice.pdf");
  });
});

describe("S3 key format validation", () => {
  it("produces valid S3 key format (no leading slashes)", () => {
    const key = generateInvoiceS3Key("tenant", "invoice");

    expect(key).not.toMatch(/^\//);
  });

  it("produces valid S3 key format (no double slashes)", () => {
    const key = generateInvoiceS3Key("tenant", "invoice");

    expect(key).not.toContain("//");
  });

  it("uses forward slashes as path separators", () => {
    const key = generateInvoiceS3Key("tenant", "invoice");

    expect(key.split("/")).toHaveLength(3); // invoices, tenant_id, invoice_id.pdf
  });
});

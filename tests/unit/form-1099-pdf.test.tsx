import { renderToString } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for Form 1099-MISC PDF Template
 *
 * Story 11.3 - AC-11.3.5: 1099-MISC PDF format following IRS specifications
 */

import { Form1099PDF } from "@/modules/form-1099/pdf/form-1099-pdf";
import type { Form1099PDFData } from "@/modules/form-1099/types";

// Mock data for testing
const mockForm1099Data: Form1099PDFData = {
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

describe("Form1099PDF component", () => {
  it("is defined and exports correctly", () => {
    expect(Form1099PDF).toBeDefined();
    expect(typeof Form1099PDF).toBe("function");
  });

  it("renders without throwing", async () => {
    await expect(
      renderToString(<Form1099PDF data={mockForm1099Data} />),
    ).resolves.toBeDefined();
  });

  it("renders with EIN recipient type", async () => {
    const einRecipientData: Form1099PDFData = {
      ...mockForm1099Data,
      recipient: {
        ...mockForm1099Data.recipient,
        tin_type: "ein",
        tin_last_four: "5678",
      },
    };

    await expect(
      renderToString(<Form1099PDF data={einRecipientData} />),
    ).resolves.toBeDefined();
  });

  it("renders with address line 2 for payer", async () => {
    const withPayerLine2: Form1099PDFData = {
      ...mockForm1099Data,
      payer: {
        ...mockForm1099Data.payer,
        address_line2: "Building A",
      },
    };

    await expect(
      renderToString(<Form1099PDF data={withPayerLine2} />),
    ).resolves.toBeDefined();
  });

  it("renders with address line 2 for recipient", async () => {
    const withRecipientLine2: Form1099PDFData = {
      ...mockForm1099Data,
      recipient: {
        ...mockForm1099Data.recipient,
        address_line2: "Apt 456",
      },
    };

    await expect(
      renderToString(<Form1099PDF data={withRecipientLine2} />),
    ).resolves.toBeDefined();
  });

  it("handles large amounts correctly", async () => {
    const largeAmountData: Form1099PDFData = {
      ...mockForm1099Data,
      amount: "999999.99",
    };

    await expect(
      renderToString(<Form1099PDF data={largeAmountData} />),
    ).resolves.toBeDefined();
  });

  it("handles minimum threshold amount", async () => {
    const minThresholdData: Form1099PDFData = {
      ...mockForm1099Data,
      amount: "600.00",
    };

    await expect(
      renderToString(<Form1099PDF data={minThresholdData} />),
    ).resolves.toBeDefined();
  });

  it("renders different tax years", async () => {
    const taxYear2023: Form1099PDFData = {
      ...mockForm1099Data,
      tax_year: 2023,
    };

    const taxYear2025: Form1099PDFData = {
      ...mockForm1099Data,
      tax_year: 2025,
    };

    await expect(
      renderToString(<Form1099PDF data={taxYear2023} />),
    ).resolves.toBeDefined();

    await expect(
      renderToString(<Form1099PDF data={taxYear2025} />),
    ).resolves.toBeDefined();
  });
});

describe("Form1099PDFData type", () => {
  it("requires all required fields", () => {
    const validData: Form1099PDFData = {
      form_id: "test-id",
      tax_year: 2024,
      amount: "1000.00",
      payer: {
        name: "Test Payer",
        ein_last_four: "1234",
        address_line1: "123 Test St",
        address_line2: null,
        city: "Test City",
        state: "TX",
        zip: "12345",
      },
      recipient: {
        id: "recipient-id",
        name: "Test Recipient",
        tin_last_four: "5678",
        tin_type: "ssn",
        address_line1: "456 Test Ave",
        address_line2: null,
        city: "Test Town",
        state: "CA",
        zip: "67890",
      },
    };

    expect(validData.form_id).toBe("test-id");
    expect(validData.tax_year).toBe(2024);
    expect(validData.amount).toBe("1000.00");
    expect(validData.payer.name).toBe("Test Payer");
    expect(validData.recipient.name).toBe("Test Recipient");
  });

  it("supports both SSN and EIN tin_type values", () => {
    const ssnType: Form1099PDFData["recipient"]["tin_type"] = "ssn";
    const einType: Form1099PDFData["recipient"]["tin_type"] = "ein";

    expect(ssnType).toBe("ssn");
    expect(einType).toBe("ein");
  });
});

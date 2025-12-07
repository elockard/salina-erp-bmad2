/**
 * Invoice PDF Types Unit Tests
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 13: Unit Tests
 *
 * Tests:
 * - InvoicePDFData type structure
 * - PDFGenerationResult type handling
 * - Type inference and validation
 */

import { describe, expect, it } from "vitest";
import type {
  InvoicePDFData,
  PDFGenerationResult,
  InvoiceWithPDFDetails,
} from "@/modules/invoices/types";

describe("InvoicePDFData type", () => {
  it("includes all required fields for PDF generation", () => {
    const pdfData: InvoicePDFData = {
      invoiceId: "inv-001",
      invoiceNumber: "INV-20251207-0001",
      invoiceDate: new Date("2025-12-07"),
      dueDate: new Date("2026-01-06"),
      company: {
        name: "Test Company",
        address: "123 Main St",
      },
      customer: {
        name: "John Doe",
        email: "john@example.com",
      },
      billToAddress: {
        line1: "456 Customer St",
        city: "Anytown",
        state: "CA",
        postal_code: "90210",
      },
      shipToAddress: null,
      lineItems: [
        {
          lineNumber: 1,
          itemCode: "BOOK-001",
          description: "Test Book",
          quantity: "10.00",
          unitPrice: "25.00",
          amount: "250.00",
        },
      ],
      subtotal: "250.00",
      taxRate: "8.25%",
      taxAmount: "20.63",
      shippingCost: "10.00",
      total: "280.63",
      paymentTerms: "Net 30",
      notes: "Thank you for your business",
    };

    expect(pdfData.invoiceId).toBe("inv-001");
    expect(pdfData.invoiceNumber).toBe("INV-20251207-0001");
    expect(pdfData.company.name).toBe("Test Company");
    expect(pdfData.customer.name).toBe("John Doe");
    expect(pdfData.lineItems).toHaveLength(1);
    expect(pdfData.total).toBe("280.63");
  });

  it("supports null ship_to_address", () => {
    const pdfData: InvoicePDFData = {
      invoiceId: "inv-001",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      dueDate: new Date(),
      company: { name: "Company", address: null },
      customer: { name: "Customer", email: null },
      billToAddress: { line1: "Address" },
      shipToAddress: null,
      lineItems: [],
      subtotal: "0.00",
      taxRate: "0%",
      taxAmount: "0.00",
      shippingCost: "0.00",
      total: "0.00",
      paymentTerms: "Due on Receipt",
      notes: null,
    };

    expect(pdfData.shipToAddress).toBeNull();
  });

  it("supports null notes", () => {
    const pdfData: InvoicePDFData = {
      invoiceId: "inv-001",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      dueDate: new Date(),
      company: { name: "Company", address: null },
      customer: { name: "Customer", email: null },
      billToAddress: { line1: "Address" },
      shipToAddress: null,
      lineItems: [],
      subtotal: "0.00",
      taxRate: "0%",
      taxAmount: "0.00",
      shippingCost: "0.00",
      total: "0.00",
      paymentTerms: "Net 30",
      notes: null,
    };

    expect(pdfData.notes).toBeNull();
  });

  it("supports multiple line items", () => {
    const pdfData: InvoicePDFData = {
      invoiceId: "inv-001",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      dueDate: new Date(),
      company: { name: "Company", address: null },
      customer: { name: "Customer", email: null },
      billToAddress: { line1: "Address" },
      shipToAddress: null,
      lineItems: [
        {
          lineNumber: 1,
          itemCode: "ITEM-001",
          description: "First Item",
          quantity: "5.00",
          unitPrice: "10.00",
          amount: "50.00",
        },
        {
          lineNumber: 2,
          itemCode: "ITEM-002",
          description: "Second Item",
          quantity: "3.00",
          unitPrice: "20.00",
          amount: "60.00",
        },
        {
          lineNumber: 3,
          itemCode: null,
          description: "Third Item (no code)",
          quantity: "1.00",
          unitPrice: "30.00",
          amount: "30.00",
        },
      ],
      subtotal: "140.00",
      taxRate: "10%",
      taxAmount: "14.00",
      shippingCost: "0.00",
      total: "154.00",
      paymentTerms: "Net 60",
      notes: null,
    };

    expect(pdfData.lineItems).toHaveLength(3);
    expect(pdfData.lineItems[2].itemCode).toBeNull();
  });
});

describe("PDFGenerationResult type", () => {
  it("represents successful generation with s3Key", () => {
    const successResult: PDFGenerationResult = {
      success: true,
      s3Key: "invoices/tenant-1/invoice-1.pdf",
    };

    expect(successResult.success).toBe(true);
    expect(successResult.s3Key).toBe("invoices/tenant-1/invoice-1.pdf");
    expect(successResult.error).toBeUndefined();
  });

  it("represents failed generation with error", () => {
    const failureResult: PDFGenerationResult = {
      success: false,
      error: "Failed to render PDF: out of memory",
    };

    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toBe("Failed to render PDF: out of memory");
    expect(failureResult.s3Key).toBeUndefined();
  });

  it("success result has optional error field as undefined", () => {
    const result: PDFGenerationResult = {
      success: true,
      s3Key: "some/key.pdf",
    };

    expect(result.error).toBeUndefined();
  });

  it("failure result has optional s3Key field as undefined", () => {
    const result: PDFGenerationResult = {
      success: false,
      error: "Some error",
    };

    expect(result.s3Key).toBeUndefined();
  });
});

describe("InvoiceWithPDFDetails type", () => {
  it("extends Invoice with pdf_s3_key and sent_at fields", () => {
    const invoice: InvoiceWithPDFDetails = {
      id: "inv-001",
      tenant_id: "tenant-001",
      invoice_number: "INV-001",
      customer_id: "cust-001",
      invoice_date: new Date(),
      due_date: new Date(),
      status: "sent",
      bill_to_address: {},
      ship_to_address: null,
      po_number: null,
      payment_terms: "net_30",
      custom_terms_days: null,
      shipping_method: null,
      shipping_cost: "0.00",
      subtotal: "100.00",
      tax_rate: "0.0825",
      tax_amount: "8.25",
      total: "108.25",
      amount_paid: "0.00",
      balance_due: "108.25",
      currency: "USD",
      notes: null,
      internal_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      pdf_s3_key: "invoices/tenant-001/inv-001.pdf",
      sent_at: new Date("2025-12-07T10:00:00Z"),
    };

    expect(invoice.pdf_s3_key).toBe("invoices/tenant-001/inv-001.pdf");
    expect(invoice.sent_at).toBeInstanceOf(Date);
  });

  it("supports null pdf_s3_key for draft invoices", () => {
    const invoice: InvoiceWithPDFDetails = {
      id: "inv-001",
      tenant_id: "tenant-001",
      invoice_number: "INV-001",
      customer_id: "cust-001",
      invoice_date: new Date(),
      due_date: new Date(),
      status: "draft",
      bill_to_address: {},
      ship_to_address: null,
      po_number: null,
      payment_terms: "net_30",
      custom_terms_days: null,
      shipping_method: null,
      shipping_cost: "0.00",
      subtotal: "100.00",
      tax_rate: "0.0825",
      tax_amount: "8.25",
      total: "108.25",
      amount_paid: "0.00",
      balance_due: "108.25",
      currency: "USD",
      notes: null,
      internal_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      pdf_s3_key: null,
      sent_at: null,
    };

    expect(invoice.pdf_s3_key).toBeNull();
    expect(invoice.sent_at).toBeNull();
  });
});

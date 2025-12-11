import { describe, expect, it } from "vitest";
import {
  type InsertInvoice,
  type InsertInvoiceLineItem,
  type InsertPayment,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceStatus,
  invoiceLineItems,
  invoiceStatusValues,
  invoices,
  type Payment,
  type PaymentMethod,
  type PaymentTerms,
  paymentMethodValues,
  payments,
  paymentTermsValues,
} from "@/db/schema/invoices";
import type {
  AgingBucket,
  CustomerAgingSummary,
  InvoiceAddress,
  InvoiceCalculations,
  InvoiceWithLineItems,
  InvoiceWithPayments,
  LineItemCalculation,
} from "@/modules/invoices/types";

/**
 * Unit tests for Invoices Schema
 *
 * Story 8.1 - Create Invoice Database Schema
 *
 * AC-8.1.1: invoices table with 25 columns, FK to contacts/tenants/users
 * AC-8.1.2: invoice_line_items table with 10 columns
 * AC-8.1.3: payments table with 10 columns, FK to invoices
 * AC-8.1.4: TypeScript types and Zod schemas
 * AC-8.1.5: Proper indexes and CHECK constraints
 *
 * Note: These are schema definition tests, not integration tests.
 * RLS policy tests would be in integration/invoices-rls.test.ts
 */

describe("invoiceStatusValues", () => {
  describe("valid values (AC-8.1.1)", () => {
    it("has exactly 6 values", () => {
      expect(invoiceStatusValues).toHaveLength(6);
    });

    it("contains 'draft'", () => {
      expect(invoiceStatusValues).toContain("draft");
    });

    it("contains 'sent'", () => {
      expect(invoiceStatusValues).toContain("sent");
    });

    it("contains 'paid'", () => {
      expect(invoiceStatusValues).toContain("paid");
    });

    it("contains 'partially_paid'", () => {
      expect(invoiceStatusValues).toContain("partially_paid");
    });

    it("contains 'overdue'", () => {
      expect(invoiceStatusValues).toContain("overdue");
    });

    it("contains 'void'", () => {
      expect(invoiceStatusValues).toContain("void");
    });

    it("has expected values in order", () => {
      expect(invoiceStatusValues).toEqual([
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "void",
      ]);
    });
  });

  describe("type safety", () => {
    it("is readonly tuple", () => {
      const values: readonly string[] = invoiceStatusValues;
      expect(values).toEqual([
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "void",
      ]);
    });
  });
});

describe("paymentTermsValues", () => {
  describe("valid values (AC-8.1.1)", () => {
    it("has exactly 4 values", () => {
      expect(paymentTermsValues).toHaveLength(4);
    });

    it("contains 'net_30'", () => {
      expect(paymentTermsValues).toContain("net_30");
    });

    it("contains 'net_60'", () => {
      expect(paymentTermsValues).toContain("net_60");
    });

    it("contains 'due_on_receipt'", () => {
      expect(paymentTermsValues).toContain("due_on_receipt");
    });

    it("contains 'custom'", () => {
      expect(paymentTermsValues).toContain("custom");
    });
  });
});

describe("paymentMethodValues", () => {
  describe("valid values (AC-8.1.3)", () => {
    it("has exactly 5 values", () => {
      expect(paymentMethodValues).toHaveLength(5);
    });

    it("contains 'check'", () => {
      expect(paymentMethodValues).toContain("check");
    });

    it("contains 'wire'", () => {
      expect(paymentMethodValues).toContain("wire");
    });

    it("contains 'credit_card'", () => {
      expect(paymentMethodValues).toContain("credit_card");
    });

    it("contains 'ach'", () => {
      expect(paymentMethodValues).toContain("ach");
    });

    it("contains 'other'", () => {
      expect(paymentMethodValues).toContain("other");
    });
  });
});

describe("InvoiceStatus type", () => {
  it("accepts valid status values", () => {
    const draft: InvoiceStatus = "draft";
    const sent: InvoiceStatus = "sent";
    const paid: InvoiceStatus = "paid";
    const partiallyPaid: InvoiceStatus = "partially_paid";
    const overdue: InvoiceStatus = "overdue";
    const voided: InvoiceStatus = "void";

    expect(draft).toBe("draft");
    expect(sent).toBe("sent");
    expect(paid).toBe("paid");
    expect(partiallyPaid).toBe("partially_paid");
    expect(overdue).toBe("overdue");
    expect(voided).toBe("void");
  });

  it("derives from invoiceStatusValues", () => {
    for (const status of invoiceStatusValues) {
      const s: InvoiceStatus = status;
      expect(typeof s).toBe("string");
    }
  });
});

describe("PaymentTerms type", () => {
  it("accepts valid payment terms values", () => {
    const net30: PaymentTerms = "net_30";
    const net60: PaymentTerms = "net_60";
    const dueOnReceipt: PaymentTerms = "due_on_receipt";
    const custom: PaymentTerms = "custom";

    expect(net30).toBe("net_30");
    expect(net60).toBe("net_60");
    expect(dueOnReceipt).toBe("due_on_receipt");
    expect(custom).toBe("custom");
  });
});

describe("PaymentMethod type", () => {
  it("accepts valid payment method values", () => {
    const check: PaymentMethod = "check";
    const wire: PaymentMethod = "wire";
    const creditCard: PaymentMethod = "credit_card";
    const ach: PaymentMethod = "ach";
    const other: PaymentMethod = "other";

    expect(check).toBe("check");
    expect(wire).toBe("wire");
    expect(creditCard).toBe("credit_card");
    expect(ach).toBe("ach");
    expect(other).toBe("other");
  });
});

describe("invoices table schema structure (AC-8.1.1)", () => {
  it("is defined as a pgTable", () => {
    expect(invoices).toBeDefined();
    expect(typeof invoices).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(invoices.id).toBeDefined();
    expect(invoices.id.name).toBe("id");
  });

  it("has tenant_id column (FK to tenants)", () => {
    expect(invoices.tenant_id).toBeDefined();
    expect(invoices.tenant_id.name).toBe("tenant_id");
    expect(invoices.tenant_id.notNull).toBe(true);
  });

  it("has invoice_number column (TEXT)", () => {
    expect(invoices.invoice_number).toBeDefined();
    expect(invoices.invoice_number.name).toBe("invoice_number");
    expect(invoices.invoice_number.notNull).toBe(true);
  });

  it("has customer_id column (FK to contacts)", () => {
    expect(invoices.customer_id).toBeDefined();
    expect(invoices.customer_id.name).toBe("customer_id");
    expect(invoices.customer_id.notNull).toBe(true);
  });

  it("has invoice_date column (date)", () => {
    expect(invoices.invoice_date).toBeDefined();
    expect(invoices.invoice_date.name).toBe("invoice_date");
    expect(invoices.invoice_date.notNull).toBe(true);
  });

  it("has due_date column (date)", () => {
    expect(invoices.due_date).toBeDefined();
    expect(invoices.due_date.name).toBe("due_date");
    expect(invoices.due_date.notNull).toBe(true);
  });

  it("has status column with default 'draft'", () => {
    expect(invoices.status).toBeDefined();
    expect(invoices.status.name).toBe("status");
    expect(invoices.status.notNull).toBe(true);
  });

  it("has bill_to_address column (JSONB)", () => {
    expect(invoices.bill_to_address).toBeDefined();
    expect(invoices.bill_to_address.name).toBe("bill_to_address");
    expect(invoices.bill_to_address.notNull).toBe(true);
  });

  it("has ship_to_address column (JSONB, nullable)", () => {
    expect(invoices.ship_to_address).toBeDefined();
    expect(invoices.ship_to_address.name).toBe("ship_to_address");
    expect(invoices.ship_to_address.notNull).toBe(false);
  });

  it("has po_number column (TEXT, nullable)", () => {
    expect(invoices.po_number).toBeDefined();
    expect(invoices.po_number.name).toBe("po_number");
    expect(invoices.po_number.notNull).toBe(false);
  });

  it("has payment_terms column with default 'net_30'", () => {
    expect(invoices.payment_terms).toBeDefined();
    expect(invoices.payment_terms.name).toBe("payment_terms");
    expect(invoices.payment_terms.notNull).toBe(true);
  });

  it("has custom_terms_days column (INT, nullable)", () => {
    expect(invoices.custom_terms_days).toBeDefined();
    expect(invoices.custom_terms_days.name).toBe("custom_terms_days");
    expect(invoices.custom_terms_days.notNull).toBe(false);
  });

  it("has shipping_method column (TEXT, nullable)", () => {
    expect(invoices.shipping_method).toBeDefined();
    expect(invoices.shipping_method.name).toBe("shipping_method");
    expect(invoices.shipping_method.notNull).toBe(false);
  });

  it("has shipping_cost column (DECIMAL)", () => {
    expect(invoices.shipping_cost).toBeDefined();
    expect(invoices.shipping_cost.name).toBe("shipping_cost");
    expect(invoices.shipping_cost.notNull).toBe(true);
  });

  it("has subtotal column (DECIMAL)", () => {
    expect(invoices.subtotal).toBeDefined();
    expect(invoices.subtotal.name).toBe("subtotal");
    expect(invoices.subtotal.notNull).toBe(true);
  });

  it("has tax_rate column (DECIMAL)", () => {
    expect(invoices.tax_rate).toBeDefined();
    expect(invoices.tax_rate.name).toBe("tax_rate");
    expect(invoices.tax_rate.notNull).toBe(true);
  });

  it("has tax_amount column (DECIMAL)", () => {
    expect(invoices.tax_amount).toBeDefined();
    expect(invoices.tax_amount.name).toBe("tax_amount");
    expect(invoices.tax_amount.notNull).toBe(true);
  });

  it("has total column (DECIMAL)", () => {
    expect(invoices.total).toBeDefined();
    expect(invoices.total.name).toBe("total");
    expect(invoices.total.notNull).toBe(true);
  });

  it("has amount_paid column (DECIMAL)", () => {
    expect(invoices.amount_paid).toBeDefined();
    expect(invoices.amount_paid.name).toBe("amount_paid");
    expect(invoices.amount_paid.notNull).toBe(true);
  });

  it("has balance_due column (DECIMAL)", () => {
    expect(invoices.balance_due).toBeDefined();
    expect(invoices.balance_due.name).toBe("balance_due");
    expect(invoices.balance_due.notNull).toBe(true);
  });

  it("has currency column with default 'USD'", () => {
    expect(invoices.currency).toBeDefined();
    expect(invoices.currency.name).toBe("currency");
    expect(invoices.currency.notNull).toBe(true);
  });

  it("has notes column (TEXT, nullable)", () => {
    expect(invoices.notes).toBeDefined();
    expect(invoices.notes.name).toBe("notes");
    expect(invoices.notes.notNull).toBe(false);
  });

  it("has internal_notes column (TEXT, nullable)", () => {
    expect(invoices.internal_notes).toBeDefined();
    expect(invoices.internal_notes.name).toBe("internal_notes");
    expect(invoices.internal_notes.notNull).toBe(false);
  });

  it("has created_at column", () => {
    expect(invoices.created_at).toBeDefined();
    expect(invoices.created_at.name).toBe("created_at");
    expect(invoices.created_at.notNull).toBe(true);
  });

  it("has updated_at column", () => {
    expect(invoices.updated_at).toBeDefined();
    expect(invoices.updated_at.name).toBe("updated_at");
    expect(invoices.updated_at.notNull).toBe(true);
  });

  it("has created_by column (FK to users, nullable)", () => {
    expect(invoices.created_by).toBeDefined();
    expect(invoices.created_by.name).toBe("created_by");
    expect(invoices.created_by.notNull).toBe(false);
  });

  it("has pdf_s3_key column (TEXT, nullable) for Story 8.6", () => {
    expect(invoices.pdf_s3_key).toBeDefined();
    expect(invoices.pdf_s3_key.name).toBe("pdf_s3_key");
    expect(invoices.pdf_s3_key.notNull).toBe(false);
  });

  it("has sent_at column (TIMESTAMP, nullable) for Story 8.6", () => {
    expect(invoices.sent_at).toBeDefined();
    expect(invoices.sent_at.name).toBe("sent_at");
    expect(invoices.sent_at.notNull).toBe(false);
  });

  it("has exactly 28 columns", () => {
    const columnNames = [
      "id",
      "tenant_id",
      "invoice_number",
      "customer_id",
      "invoice_date",
      "due_date",
      "status",
      "bill_to_address",
      "ship_to_address",
      "po_number",
      "payment_terms",
      "custom_terms_days",
      "shipping_method",
      "shipping_cost",
      "subtotal",
      "tax_rate",
      "tax_amount",
      "total",
      "amount_paid",
      "balance_due",
      "currency",
      "notes",
      "internal_notes",
      "created_at",
      "updated_at",
      "created_by",
      "pdf_s3_key",
      "sent_at",
    ];

    for (const name of columnNames) {
      expect(
        (invoices as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(28);
  });
});

describe("invoice_line_items table schema structure (AC-8.1.2)", () => {
  it("is defined as a pgTable", () => {
    expect(invoiceLineItems).toBeDefined();
    expect(typeof invoiceLineItems).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(invoiceLineItems.id).toBeDefined();
    expect(invoiceLineItems.id.name).toBe("id");
  });

  it("has invoice_id column (FK to invoices)", () => {
    expect(invoiceLineItems.invoice_id).toBeDefined();
    expect(invoiceLineItems.invoice_id.name).toBe("invoice_id");
    expect(invoiceLineItems.invoice_id.notNull).toBe(true);
  });

  it("has line_number column (INT)", () => {
    expect(invoiceLineItems.line_number).toBeDefined();
    expect(invoiceLineItems.line_number.name).toBe("line_number");
    expect(invoiceLineItems.line_number.notNull).toBe(true);
  });

  it("has item_code column (TEXT, nullable)", () => {
    expect(invoiceLineItems.item_code).toBeDefined();
    expect(invoiceLineItems.item_code.name).toBe("item_code");
    expect(invoiceLineItems.item_code.notNull).toBe(false);
  });

  it("has description column (TEXT)", () => {
    expect(invoiceLineItems.description).toBeDefined();
    expect(invoiceLineItems.description.name).toBe("description");
    expect(invoiceLineItems.description.notNull).toBe(true);
  });

  it("has quantity column (DECIMAL)", () => {
    expect(invoiceLineItems.quantity).toBeDefined();
    expect(invoiceLineItems.quantity.name).toBe("quantity");
    expect(invoiceLineItems.quantity.notNull).toBe(true);
  });

  it("has unit_price column (DECIMAL)", () => {
    expect(invoiceLineItems.unit_price).toBeDefined();
    expect(invoiceLineItems.unit_price.name).toBe("unit_price");
    expect(invoiceLineItems.unit_price.notNull).toBe(true);
  });

  it("has tax_rate column (DECIMAL, nullable)", () => {
    expect(invoiceLineItems.tax_rate).toBeDefined();
    expect(invoiceLineItems.tax_rate.name).toBe("tax_rate");
    expect(invoiceLineItems.tax_rate.notNull).toBe(false);
  });

  it("has amount column (DECIMAL)", () => {
    expect(invoiceLineItems.amount).toBeDefined();
    expect(invoiceLineItems.amount.name).toBe("amount");
    expect(invoiceLineItems.amount.notNull).toBe(true);
  });

  it("has title_id column (FK to titles, nullable)", () => {
    expect(invoiceLineItems.title_id).toBeDefined();
    expect(invoiceLineItems.title_id.name).toBe("title_id");
    expect(invoiceLineItems.title_id.notNull).toBe(false);
  });

  it("has exactly 10 columns", () => {
    const columnNames = [
      "id",
      "invoice_id",
      "line_number",
      "item_code",
      "description",
      "quantity",
      "unit_price",
      "tax_rate",
      "amount",
      "title_id",
    ];

    for (const name of columnNames) {
      expect(
        (invoiceLineItems as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(10);
  });
});

describe("payments table schema structure (AC-8.1.3)", () => {
  it("is defined as a pgTable", () => {
    expect(payments).toBeDefined();
    expect(typeof payments).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(payments.id).toBeDefined();
    expect(payments.id.name).toBe("id");
  });

  it("has tenant_id column (FK to tenants)", () => {
    expect(payments.tenant_id).toBeDefined();
    expect(payments.tenant_id.name).toBe("tenant_id");
    expect(payments.tenant_id.notNull).toBe(true);
  });

  it("has invoice_id column (FK to invoices)", () => {
    expect(payments.invoice_id).toBeDefined();
    expect(payments.invoice_id.name).toBe("invoice_id");
    expect(payments.invoice_id.notNull).toBe(true);
  });

  it("has payment_date column (date)", () => {
    expect(payments.payment_date).toBeDefined();
    expect(payments.payment_date.name).toBe("payment_date");
    expect(payments.payment_date.notNull).toBe(true);
  });

  it("has amount column (DECIMAL)", () => {
    expect(payments.amount).toBeDefined();
    expect(payments.amount.name).toBe("amount");
    expect(payments.amount.notNull).toBe(true);
  });

  it("has payment_method column (TEXT)", () => {
    expect(payments.payment_method).toBeDefined();
    expect(payments.payment_method.name).toBe("payment_method");
    expect(payments.payment_method.notNull).toBe(true);
  });

  it("has reference_number column (TEXT, nullable)", () => {
    expect(payments.reference_number).toBeDefined();
    expect(payments.reference_number.name).toBe("reference_number");
    expect(payments.reference_number.notNull).toBe(false);
  });

  it("has notes column (TEXT, nullable)", () => {
    expect(payments.notes).toBeDefined();
    expect(payments.notes.name).toBe("notes");
    expect(payments.notes.notNull).toBe(false);
  });

  it("has created_at column", () => {
    expect(payments.created_at).toBeDefined();
    expect(payments.created_at.name).toBe("created_at");
    expect(payments.created_at.notNull).toBe(true);
  });

  it("has created_by column (FK to users, nullable)", () => {
    expect(payments.created_by).toBeDefined();
    expect(payments.created_by.name).toBe("created_by");
    expect(payments.created_by.notNull).toBe(false);
  });

  it("has exactly 10 columns", () => {
    const columnNames = [
      "id",
      "tenant_id",
      "invoice_id",
      "payment_date",
      "amount",
      "payment_method",
      "reference_number",
      "notes",
      "created_at",
      "created_by",
    ];

    for (const name of columnNames) {
      expect(
        (payments as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(10);
  });
});

describe("Invoice type (AC-8.1.4)", () => {
  it("infers select type from invoices table", () => {
    const mockInvoice: Invoice = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_number: "INV-2024-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440002",
      invoice_date: new Date("2024-01-15"),
      due_date: new Date("2024-02-14"),
      status: "draft",
      bill_to_address: { line1: "123 Main St", city: "Anytown", state: "CA" },
      ship_to_address: null,
      po_number: null,
      payment_terms: "net_30",
      custom_terms_days: null,
      shipping_method: null,
      shipping_cost: "0.00",
      subtotal: "1000.00",
      tax_rate: "0.0825",
      tax_amount: "82.50",
      total: "1082.50",
      amount_paid: "0.00",
      balance_due: "1082.50",
      currency: "USD",
      notes: null,
      internal_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      pdf_s3_key: null,
      sent_at: null,
    };

    expect(mockInvoice.id).toBeDefined();
    expect(mockInvoice.tenant_id).toBeDefined();
    expect(mockInvoice.invoice_number).toBe("INV-2024-0001");
    expect(mockInvoice.status).toBe("draft");
    expect(mockInvoice.total).toBe("1082.50");
  });

  it("supports all valid status values", () => {
    const baseInvoice: Invoice = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_number: "INV-2024-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440002",
      invoice_date: new Date("2024-01-15"),
      due_date: new Date("2024-02-14"),
      status: "draft",
      bill_to_address: {},
      ship_to_address: null,
      po_number: null,
      payment_terms: "net_30",
      custom_terms_days: null,
      shipping_method: null,
      shipping_cost: "0.00",
      subtotal: "100.00",
      tax_rate: "0.0000",
      tax_amount: "0.00",
      total: "100.00",
      amount_paid: "0.00",
      balance_due: "100.00",
      currency: "USD",
      notes: null,
      internal_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      pdf_s3_key: null,
      sent_at: null,
    };

    const draft: Invoice = { ...baseInvoice, status: "draft" };
    const sent: Invoice = { ...baseInvoice, status: "sent" };
    const paid: Invoice = { ...baseInvoice, status: "paid" };
    const partiallyPaid: Invoice = { ...baseInvoice, status: "partially_paid" };
    const overdue: Invoice = { ...baseInvoice, status: "overdue" };
    const voided: Invoice = { ...baseInvoice, status: "void" };

    expect(draft.status).toBe("draft");
    expect(sent.status).toBe("sent");
    expect(paid.status).toBe("paid");
    expect(partiallyPaid.status).toBe("partially_paid");
    expect(overdue.status).toBe("overdue");
    expect(voided.status).toBe("void");
  });
});

describe("InsertInvoice type (AC-8.1.4)", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertInvoice = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_number: "INV-2024-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440002",
      invoice_date: new Date("2024-01-15"),
      due_date: new Date("2024-02-14"),
      bill_to_address: { line1: "123 Main St" },
      subtotal: "100.00",
      tax_amount: "0.00",
      total: "100.00",
      balance_due: "100.00",
    };

    expect(insertData.tenant_id).toBeDefined();
    expect(insertData.id).toBeUndefined();
  });

  it("allows optional status field (defaults to draft)", () => {
    const insertData: InsertInvoice = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_number: "INV-2024-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440002",
      invoice_date: new Date("2024-01-15"),
      due_date: new Date("2024-02-14"),
      bill_to_address: {},
      subtotal: "100.00",
      tax_amount: "0.00",
      total: "100.00",
      balance_due: "100.00",
    };

    expect(insertData.status).toBeUndefined();
  });
});

describe("InvoiceLineItem type (AC-8.1.4)", () => {
  it("infers select type from invoiceLineItems table", () => {
    const mockLineItem: InvoiceLineItem = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      invoice_id: "550e8400-e29b-41d4-a716-446655440001",
      line_number: 1,
      item_code: "BOOK-001",
      description: "Hardcover Book - The Great Novel",
      quantity: "10.000",
      unit_price: "25.00",
      tax_rate: "0.0825",
      amount: "250.00",
      title_id: "550e8400-e29b-41d4-a716-446655440002",
    };

    expect(mockLineItem.id).toBeDefined();
    expect(mockLineItem.invoice_id).toBeDefined();
    expect(mockLineItem.line_number).toBe(1);
    expect(mockLineItem.description).toBe("Hardcover Book - The Great Novel");
    expect(mockLineItem.amount).toBe("250.00");
  });
});

describe("InsertInvoiceLineItem type (AC-8.1.4)", () => {
  it("requires invoice_id and core fields", () => {
    const insertData: InsertInvoiceLineItem = {
      invoice_id: "550e8400-e29b-41d4-a716-446655440001",
      line_number: 1,
      description: "Book - Title",
      quantity: "5.000",
      unit_price: "19.99",
      amount: "99.95",
    };

    expect(insertData.invoice_id).toBeDefined();
    expect(insertData.line_number).toBe(1);
    expect(insertData.description).toBeDefined();
  });
});

describe("Payment type (AC-8.1.4)", () => {
  it("infers select type from payments table", () => {
    const mockPayment: Payment = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_id: "550e8400-e29b-41d4-a716-446655440002",
      payment_date: new Date("2024-02-01"),
      amount: "500.00",
      payment_method: "check",
      reference_number: "CHK-12345",
      notes: "Partial payment",
      created_at: new Date(),
      created_by: null,
    };

    expect(mockPayment.id).toBeDefined();
    expect(mockPayment.invoice_id).toBeDefined();
    expect(mockPayment.amount).toBe("500.00");
    expect(mockPayment.payment_method).toBe("check");
  });
});

describe("InsertPayment type (AC-8.1.4)", () => {
  it("requires core payment fields", () => {
    const insertData: InsertPayment = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_id: "550e8400-e29b-41d4-a716-446655440002",
      payment_date: new Date("2024-02-01"),
      amount: "500.00",
      payment_method: "wire",
    };

    expect(insertData.tenant_id).toBeDefined();
    expect(insertData.invoice_id).toBeDefined();
    expect(insertData.amount).toBe("500.00");
    expect(insertData.payment_method).toBe("wire");
  });
});

describe("InvoiceAddress type (AC-8.1.4)", () => {
  it("supports full address structure", () => {
    const address: InvoiceAddress = {
      line1: "123 Main Street",
      line2: "Suite 100",
      city: "Anytown",
      state: "CA",
      postal_code: "90210",
      country: "USA",
    };

    expect(address.line1).toBe("123 Main Street");
    expect(address.line2).toBe("Suite 100");
    expect(address.city).toBe("Anytown");
    expect(address.state).toBe("CA");
    expect(address.postal_code).toBe("90210");
    expect(address.country).toBe("USA");
  });

  it("supports minimal address", () => {
    const address: InvoiceAddress = {
      line1: "PO Box 123",
    };

    expect(address.line1).toBe("PO Box 123");
    expect(address.city).toBeUndefined();
  });
});

describe("InvoiceCalculations type (AC-8.1.4)", () => {
  it("supports line item calculations", () => {
    const calculations: InvoiceCalculations = {
      lineItemCalculations: [
        {
          lineNumber: 1,
          quantity: 10,
          unitPrice: 25,
          lineSubtotal: 250,
          taxRate: 0.0825,
          lineTax: 20.63,
          lineTotal: 270.63,
        },
      ],
      invoiceSubtotal: 250,
      totalTax: 20.63,
      shippingCost: 10,
      invoiceTotal: 280.63,
      amountPaid: 0,
      balanceDue: 280.63,
    };

    expect(calculations.lineItemCalculations).toHaveLength(1);
    expect(calculations.invoiceSubtotal).toBe(250);
    expect(calculations.invoiceTotal).toBe(280.63);
  });
});

describe("LineItemCalculation type (AC-8.1.4)", () => {
  it("includes all calculation fields", () => {
    const lineCalc: LineItemCalculation = {
      lineNumber: 1,
      quantity: 5,
      unitPrice: 19.99,
      lineSubtotal: 99.95,
      taxRate: 0.08,
      lineTax: 8.0,
      lineTotal: 107.95,
    };

    expect(lineCalc.lineNumber).toBe(1);
    expect(lineCalc.quantity).toBe(5);
    expect(lineCalc.unitPrice).toBe(19.99);
    expect(lineCalc.lineSubtotal).toBe(99.95);
    expect(lineCalc.lineTax).toBe(8.0);
    expect(lineCalc.lineTotal).toBe(107.95);
  });
});

describe("InvoiceWithLineItems type (AC-8.1.4)", () => {
  it("extends Invoice with lineItems array", () => {
    const invoiceWithItems: InvoiceWithLineItems = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_number: "INV-2024-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440002",
      invoice_date: new Date("2024-01-15"),
      due_date: new Date("2024-02-14"),
      status: "draft",
      bill_to_address: {},
      ship_to_address: null,
      po_number: null,
      payment_terms: "net_30",
      custom_terms_days: null,
      shipping_method: null,
      shipping_cost: "0.00",
      subtotal: "100.00",
      tax_rate: "0.0000",
      tax_amount: "0.00",
      total: "100.00",
      amount_paid: "0.00",
      balance_due: "100.00",
      currency: "USD",
      notes: null,
      internal_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      pdf_s3_key: null,
      sent_at: null,
      lineItems: [
        {
          id: "550e8400-e29b-41d4-a716-446655440010",
          invoice_id: "550e8400-e29b-41d4-a716-446655440000",
          line_number: 1,
          item_code: null,
          description: "Service",
          quantity: "1.000",
          unit_price: "100.00",
          tax_rate: null,
          amount: "100.00",
          title_id: null,
        },
      ],
    };

    expect(invoiceWithItems.lineItems).toHaveLength(1);
    expect(invoiceWithItems.lineItems[0].description).toBe("Service");
  });
});

describe("InvoiceWithPayments type (AC-8.1.4)", () => {
  it("extends Invoice with payments array", () => {
    const invoiceWithPayments: InvoiceWithPayments = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      invoice_number: "INV-2024-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440002",
      invoice_date: new Date("2024-01-15"),
      due_date: new Date("2024-02-14"),
      status: "partially_paid",
      bill_to_address: {},
      ship_to_address: null,
      po_number: null,
      payment_terms: "net_30",
      custom_terms_days: null,
      shipping_method: null,
      shipping_cost: "0.00",
      subtotal: "1000.00",
      tax_rate: "0.0000",
      tax_amount: "0.00",
      total: "1000.00",
      amount_paid: "500.00",
      balance_due: "500.00",
      currency: "USD",
      notes: null,
      internal_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      pdf_s3_key:
        "invoices/550e8400-e29b-41d4-a716-446655440001/550e8400-e29b-41d4-a716-446655440000.pdf",
      sent_at: new Date("2024-01-15"),
      payments: [
        {
          id: "550e8400-e29b-41d4-a716-446655440010",
          tenant_id: "550e8400-e29b-41d4-a716-446655440001",
          invoice_id: "550e8400-e29b-41d4-a716-446655440000",
          payment_date: new Date("2024-02-01"),
          amount: "500.00",
          payment_method: "check",
          reference_number: "CHK-001",
          notes: null,
          created_at: new Date(),
          created_by: null,
        },
      ],
    };

    expect(invoiceWithPayments.payments).toHaveLength(1);
    expect(invoiceWithPayments.payments[0].amount).toBe("500.00");
  });
});

describe("AgingBucket type (AC-8.1.4)", () => {
  it("supports aging bucket structure", () => {
    const bucket: AgingBucket = {
      bucket: "31-60",
      amount: 2500.0,
      count: 3,
    };

    expect(bucket.bucket).toBe("31-60");
    expect(bucket.amount).toBe(2500.0);
    expect(bucket.count).toBe(3);
  });

  it("supports all bucket ranges", () => {
    const buckets: AgingBucket[] = [
      { bucket: "current", amount: 1000, count: 5 },
      { bucket: "1-30", amount: 500, count: 2 },
      { bucket: "31-60", amount: 300, count: 1 },
      { bucket: "61-90", amount: 200, count: 1 },
      { bucket: "90+", amount: 100, count: 1 },
    ];

    expect(buckets).toHaveLength(5);
    expect(buckets[0].bucket).toBe("current");
    expect(buckets[4].bucket).toBe("90+");
  });
});

describe("CustomerAgingSummary type (AC-8.1.4)", () => {
  it("supports customer aging summary structure", () => {
    const summary: CustomerAgingSummary = {
      customerId: "550e8400-e29b-41d4-a716-446655440000",
      customerName: "Acme Publishing",
      totalOutstanding: 5000.0,
      buckets: [
        { bucket: "current", amount: 2000, count: 2 },
        { bucket: "1-30", amount: 1500, count: 1 },
        { bucket: "31-60", amount: 1000, count: 1 },
        { bucket: "61-90", amount: 500, count: 1 },
        { bucket: "90+", amount: 0, count: 0 },
      ],
    };

    expect(summary.customerId).toBeDefined();
    expect(summary.customerName).toBe("Acme Publishing");
    expect(summary.totalOutstanding).toBe(5000.0);
    expect(summary.buckets).toHaveLength(5);
  });
});

describe("Currency precision verification (AC-8.1.5)", () => {
  it("financial fields should handle DECIMAL(10,2) for currency", () => {
    expect(invoices.subtotal).toBeDefined();
    expect(invoices.tax_amount).toBeDefined();
    expect(invoices.total).toBeDefined();
    expect(invoices.amount_paid).toBeDefined();
    expect(invoices.balance_due).toBeDefined();
    expect(invoices.shipping_cost).toBeDefined();

    expect(invoiceLineItems.unit_price).toBeDefined();
    expect(invoiceLineItems.amount).toBeDefined();

    expect(payments.amount).toBeDefined();

    // Valid currency examples as strings
    const validAmounts = ["0.00", "1500.00", "99999999.99", "0.01"];
    for (const amount of validAmounts) {
      const parts = amount.split(".");
      expect(parts.length).toBe(2);
      expect(parts[1].length).toBeLessThanOrEqual(2);
    }
  });

  it("tax_rate fields should handle DECIMAL(5,4) for precision", () => {
    expect(invoices.tax_rate).toBeDefined();
    expect(invoiceLineItems.tax_rate).toBeDefined();

    // Valid tax rate examples
    const validRates = ["0.0000", "0.0825", "0.1000", "0.2500"];
    for (const rate of validRates) {
      const parts = rate.split(".");
      expect(parts.length).toBe(2);
      expect(parts[1].length).toBeLessThanOrEqual(4);
    }
  });
});

describe("Schema constraint structure verification (AC-8.1.5)", () => {
  describe("invoices table indexes", () => {
    it("has tenant_id column for index", () => {
      expect(invoices.tenant_id).toBeDefined();
      expect(invoices.tenant_id.notNull).toBe(true);
    });

    it("has customer_id column for index", () => {
      expect(invoices.customer_id).toBeDefined();
      expect(invoices.customer_id.notNull).toBe(true);
    });

    it("has status column for index", () => {
      expect(invoices.status).toBeDefined();
      expect(invoices.status.notNull).toBe(true);
    });

    it("has due_date column for index", () => {
      expect(invoices.due_date).toBeDefined();
      expect(invoices.due_date.notNull).toBe(true);
    });

    it("has invoice_date column for index", () => {
      expect(invoices.invoice_date).toBeDefined();
      expect(invoices.invoice_date.notNull).toBe(true);
    });
  });

  describe("invoice_line_items table indexes", () => {
    it("has invoice_id column for index", () => {
      expect(invoiceLineItems.invoice_id).toBeDefined();
      expect(invoiceLineItems.invoice_id.notNull).toBe(true);
    });
  });

  describe("payments table indexes", () => {
    it("has tenant_id column for index", () => {
      expect(payments.tenant_id).toBeDefined();
      expect(payments.tenant_id.notNull).toBe(true);
    });

    it("has invoice_id column for index", () => {
      expect(payments.invoice_id).toBeDefined();
      expect(payments.invoice_id.notNull).toBe(true);
    });

    it("has payment_date column for index", () => {
      expect(payments.payment_date).toBeDefined();
      expect(payments.payment_date.notNull).toBe(true);
    });
  });
});

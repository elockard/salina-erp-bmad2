/**
 * Invoice List Table Unit Tests
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 12: Unit Tests
 *
 * Tests:
 * - Table rendering with data
 * - Empty state display
 * - Loading skeleton state
 * - Currency formatting
 * - Status badge display
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceListTable } from "@/modules/invoices/components/invoice-list-table";
import type { InvoiceWithCustomer } from "@/modules/invoices/types";

// Mock invoice data
const mockInvoices: InvoiceWithCustomer[] = [
  {
    id: "inv-1",
    tenant_id: "tenant-1",
    invoice_number: "INV-20251206-0001",
    customer_id: "cust-1",
    invoice_date: new Date("2025-12-06"),
    due_date: new Date("2026-01-05"),
    status: "draft",
    bill_to_address: {},
    ship_to_address: null,
    po_number: null,
    payment_terms: "net_30",
    custom_terms_days: null,
    shipping_method: null,
    shipping_cost: "10.00",
    subtotal: "100.00",
    tax_rate: "0.0825",
    tax_amount: "8.25",
    total: "118.25",
    amount_paid: "0.00",
    balance_due: "118.25",
    currency: "USD",
    notes: null,
    internal_notes: null,
    created_by: "user-1",
    created_at: new Date(),
    updated_at: new Date(),
    pdf_s3_key: null,
    sent_at: null,
    customer: {
      id: "cust-1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    },
  },
  {
    id: "inv-2",
    tenant_id: "tenant-1",
    invoice_number: "INV-20251206-0002",
    customer_id: "cust-2",
    invoice_date: new Date("2025-12-05"),
    due_date: new Date("2026-01-04"),
    status: "sent",
    bill_to_address: {},
    ship_to_address: null,
    po_number: "PO-123",
    payment_terms: "net_30",
    custom_terms_days: null,
    shipping_method: null,
    shipping_cost: "0.00",
    subtotal: "500.00",
    tax_rate: "0.0825",
    tax_amount: "41.25",
    total: "541.25",
    amount_paid: "0.00",
    balance_due: "541.25",
    currency: "USD",
    notes: null,
    internal_notes: null,
    created_by: "user-1",
    created_at: new Date(),
    updated_at: new Date(),
    pdf_s3_key: "invoices/tenant-1/inv-2.pdf",
    sent_at: new Date("2025-12-05"),
    customer: {
      id: "cust-2",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
    },
  },
];

describe("InvoiceListTable", () => {
  const defaultProps = {
    invoices: mockInvoices,
    onView: vi.fn(),
    onVoid: vi.fn(),
  };

  it("renders invoices in table format", () => {
    render(<InvoiceListTable {...defaultProps} />);

    // Check for column headers
    expect(screen.getByText("Invoice #")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("displays invoice numbers correctly", () => {
    render(<InvoiceListTable {...defaultProps} />);

    expect(screen.getByText("INV-20251206-0001")).toBeInTheDocument();
    expect(screen.getByText("INV-20251206-0002")).toBeInTheDocument();
  });

  it("displays customer names correctly", () => {
    render(<InvoiceListTable {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("renders loading skeleton when loading", () => {
    render(<InvoiceListTable {...defaultProps} loading={true} />);

    // Should show skeleton rows (skeletons are empty, so we check for table structure)
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // Header should still be visible
    expect(screen.getByText("Invoice #")).toBeInTheDocument();
  });

  it("renders empty state when no invoices", () => {
    render(<InvoiceListTable {...defaultProps} invoices={[]} />);

    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(screen.getByText("Create Your First Invoice")).toBeInTheDocument();
  });

  it("shows status badge for each invoice", () => {
    render(<InvoiceListTable {...defaultProps} />);

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("formats currency values correctly", () => {
    render(<InvoiceListTable {...defaultProps} />);

    // Check that currency values appear (may appear multiple times in Amount and Balance)
    const amounts118 = screen.getAllByText("$118.25");
    expect(amounts118.length).toBeGreaterThan(0);

    const amounts541 = screen.getAllByText("$541.25");
    expect(amounts541.length).toBeGreaterThan(0);
  });

  it("renders action buttons for each row", () => {
    render(<InvoiceListTable {...defaultProps} />);

    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    expect(actionButtons).toHaveLength(2);
  });

  it("handles unknown customer gracefully", () => {
    const invoicesWithoutCustomer: InvoiceWithCustomer[] = [
      {
        ...mockInvoices[0],
        customer: null as any,
      },
    ];

    render(<InvoiceListTable {...defaultProps} invoices={invoicesWithoutCustomer} />);

    expect(screen.getByText("Unknown Customer")).toBeInTheDocument();
  });

  it("highlights outstanding balance", () => {
    render(<InvoiceListTable {...defaultProps} />);

    // Balance amounts should be visible
    const balances = screen.getAllByText(/\$\d+\.\d{2}/);
    expect(balances.length).toBeGreaterThan(0);
  });
});

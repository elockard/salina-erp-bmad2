/**
 * Invoice Status Badge Unit Tests
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 1: Create Invoice Status Badge Component (AC: 8.3.1)
 *
 * Tests status badge rendering for all 6 invoice statuses:
 * - draft: gray
 * - sent: blue
 * - paid: green
 * - partially_paid: yellow
 * - overdue: red
 * - void: muted
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceStatusBadge } from "@/modules/invoices/components/invoice-status-badge";
import type { InvoiceStatusType } from "@/modules/invoices/types";

describe("InvoiceStatusBadge", () => {
  const statusTestCases: Array<{
    status: InvoiceStatusType;
    expectedLabel: string;
    expectedColorClass: string;
  }> = [
    {
      status: "draft",
      expectedLabel: "Draft",
      expectedColorClass: "bg-gray-50",
    },
    {
      status: "sent",
      expectedLabel: "Sent",
      expectedColorClass: "bg-blue-50",
    },
    {
      status: "paid",
      expectedLabel: "Paid",
      expectedColorClass: "bg-green-50",
    },
    {
      status: "partially_paid",
      expectedLabel: "Partially Paid",
      expectedColorClass: "bg-yellow-50",
    },
    {
      status: "overdue",
      expectedLabel: "Overdue",
      expectedColorClass: "bg-red-50",
    },
    {
      status: "void",
      expectedLabel: "Void",
      expectedColorClass: "bg-gray-100",
    },
  ];

  it.each(statusTestCases)(
    "renders $status status with correct label and color",
    ({ status, expectedLabel, expectedColorClass }) => {
      render(<InvoiceStatusBadge status={status} />);

      const badge = screen.getByText(expectedLabel);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedColorClass);
    }
  );

  it("applies additional className when provided", () => {
    render(<InvoiceStatusBadge status="draft" className="custom-class" />);

    const badge = screen.getByText("Draft");
    expect(badge).toHaveClass("custom-class");
  });

  it("falls back to draft styling for unknown status", () => {
    // Type assertion to test fallback behavior
    render(<InvoiceStatusBadge status={"unknown" as InvoiceStatusType} />);

    const badge = screen.getByText("Draft");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-gray-50");
  });

  it("renders with outline variant", () => {
    render(<InvoiceStatusBadge status="paid" />);

    const badge = screen.getByText("Paid");
    // Badge component uses outline variant which sets border
    expect(badge).toHaveClass("border-green-200");
  });
});

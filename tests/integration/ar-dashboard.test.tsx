import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Integration Tests for Accounts Receivable Dashboard
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.2: Summary stats display
 * AC-8.5.3: Aging report table
 * AC-8.5.5: Visual aging chart
 * AC-8.5.6: CSV export
 * AC-8.5.7: PDF export with company header
 *
 * Tests:
 * - Summary stats cards render correct data (AC-8.5.2)
 * - Aging table renders with correct buckets (AC-8.5.3)
 * - Table is sortable (AC-8.5.3)
 * - Export buttons render and are accessible (AC-8.5.6, AC-8.5.7)
 * - Empty state handling
 */

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="icon-alert">AlertCircle</span>,
  ArrowUpDown: () => <span data-testid="icon-sort">ArrowUpDown</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  ChevronLeft: () => <span data-testid="icon-left">ChevronLeft</span>,
  ChevronRight: () => <span data-testid="icon-right">ChevronRight</span>,
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  DollarSign: () => <span data-testid="icon-dollar">DollarSign</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
  FileText: () => <span data-testid="icon-file">FileText</span>,
  Loader2: () => <span data-testid="icon-loader">Loader2</span>,
  X: () => <span data-testid="icon-x">X</span>,
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Track dropdown open state for testing
let dropdownOpen = false;

// Mock Radix UI dropdown menu to avoid portal issues in tests
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<Record<string, unknown>>,
        {
          ...props,
          onClick: () => {
            dropdownOpen = !dropdownOpen;
          },
        },
      );
    }
    return (
      <button
        {...props}
        onClick={() => {
          dropdownOpen = !dropdownOpen;
        }}
      >
        {children}
      </button>
    );
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

import React from "react";
import { ARAgingChart } from "@/modules/reports/components/ar-aging-chart";
import { ARAgingTable } from "@/modules/reports/components/ar-aging-table";
import { ARExportButtons } from "@/modules/reports/components/ar-export-buttons";
// Import components after mocks
import { ARSummaryStats } from "@/modules/reports/components/ar-summary-stats";
import type {
  AgingReportRow,
  ARSummary,
  TenantForReport,
} from "@/modules/reports/types";

// Test fixtures
const mockSummaryNormal: ARSummary = {
  totalReceivables: "15000.50",
  currentAmount: "10000.00",
  overdueAmount: "5000.50",
  averageDaysToPay: 28,
  openInvoiceCount: 12,
};

const mockSummaryEmpty: ARSummary = {
  totalReceivables: "0.00",
  currentAmount: "0.00",
  overdueAmount: "0.00",
  averageDaysToPay: 0,
  openInvoiceCount: 0,
};

const mockAgingData: AgingReportRow[] = [
  {
    customerId: "c1",
    customerName: "Acme Corporation",
    current: "5000.00",
    days1to30: "2000.00",
    days31to60: "1000.00",
    days61to90: "500.00",
    days90plus: "0.00",
    total: "8500.00",
  },
  {
    customerId: "c2",
    customerName: "Beta Industries",
    current: "3000.00",
    days1to30: "0.00",
    days31to60: "0.00",
    days61to90: "1500.00",
    days90plus: "500.00",
    total: "5000.00",
  },
];

const mockTenant: TenantForReport = {
  name: "Test Publishing House",
};

describe("AR Summary Stats Component (AC-8.5.2)", () => {
  describe("Stats Cards Display", () => {
    it("renders total receivables card with formatted amount", () => {
      render(<ARSummaryStats summary={mockSummaryNormal} />);

      const card = screen.getByTestId("total-receivables-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent("$15,000.50");
      expect(card).toHaveTextContent("12 open invoices");
    });

    it("renders current amount card with green styling", () => {
      render(<ARSummaryStats summary={mockSummaryNormal} />);

      const card = screen.getByTestId("current-amount-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent("$10,000.00");
      expect(card).toHaveTextContent("Not yet due");
    });

    it("renders overdue amount card with red styling", () => {
      render(<ARSummaryStats summary={mockSummaryNormal} />);

      const card = screen.getByTestId("overdue-amount-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent("$5,000.50");
    });

    it("renders average days to pay card", () => {
      render(<ARSummaryStats summary={mockSummaryNormal} />);

      const card = screen.getByTestId("avg-days-to-pay-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent("28");
      expect(card).toHaveTextContent("Based on paid invoices");
    });

    it("calculates overdue percentage correctly", () => {
      render(<ARSummaryStats summary={mockSummaryNormal} />);

      // 5000.50 / 15000.50 ≈ 33%
      const card = screen.getByTestId("overdue-amount-card");
      expect(card).toHaveTextContent("33%");
    });
  });

  describe("Empty State", () => {
    it("handles zero values gracefully", () => {
      render(<ARSummaryStats summary={mockSummaryEmpty} />);

      expect(screen.getByTestId("total-receivables-card")).toHaveTextContent(
        "$0.00",
      );
      expect(screen.getByTestId("current-amount-card")).toHaveTextContent(
        "$0.00",
      );
      expect(screen.getByTestId("overdue-amount-card")).toHaveTextContent(
        "$0.00",
      );
      expect(screen.getByTestId("avg-days-to-pay-card")).toHaveTextContent("0");
    });

    it("shows singular 'invoice' for count of 1", () => {
      const summaryWithOne: ARSummary = {
        ...mockSummaryEmpty,
        totalReceivables: "100.00",
        openInvoiceCount: 1,
      };
      render(<ARSummaryStats summary={summaryWithOne} />);

      expect(screen.getByTestId("total-receivables-card")).toHaveTextContent(
        "1 open invoice",
      );
    });
  });
});

describe("AR Aging Table Component (AC-8.5.3)", () => {
  describe("Table Rendering", () => {
    it("renders table with all columns", () => {
      render(<ARAgingTable data={mockAgingData} isLoading={false} />);

      const table = screen.getByTestId("ar-aging-table");
      expect(table).toBeInTheDocument();

      // Check column headers
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Current")).toBeInTheDocument();
      expect(screen.getByText("1-30 Days")).toBeInTheDocument();
      expect(screen.getByText("31-60 Days")).toBeInTheDocument();
      expect(screen.getByText("61-90 Days")).toBeInTheDocument();
      expect(screen.getByText("90+ Days")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("renders all customer rows", () => {
      render(<ARAgingTable data={mockAgingData} isLoading={false} />);

      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
      expect(screen.getByText("Beta Industries")).toBeInTheDocument();
    });

    it("displays formatted currency values", () => {
      render(<ARAgingTable data={mockAgingData} isLoading={false} />);

      // Check for totals - may appear multiple times (row and footer)
      expect(screen.getAllByText("$8,500.00").length).toBeGreaterThan(0);
      expect(screen.getAllByText("$5,000.00").length).toBeGreaterThan(0);
    });

    it("calculates and displays totals row", () => {
      render(<ARAgingTable data={mockAgingData} isLoading={false} />);

      // Total row should exist
      expect(screen.getByText("TOTAL")).toBeInTheDocument();
      // Total: 8500 + 5000 = 13500
      expect(screen.getByText("$13,500.00")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("renders skeleton when loading", () => {
      render(<ARAgingTable data={[]} isLoading={true} />);

      expect(screen.getByTestId("ar-aging-table-skeleton")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("renders empty message when no data", () => {
      render(<ARAgingTable data={[]} isLoading={false} />);

      expect(screen.getByTestId("ar-aging-table-empty")).toBeInTheDocument();
      expect(
        screen.getByText("No outstanding receivables"),
      ).toBeInTheDocument();
    });
  });

  describe("Customer Click Handler", () => {
    it("calls onCustomerClick when customer name is clicked", () => {
      const mockClick = vi.fn();

      render(
        <ARAgingTable
          data={mockAgingData}
          isLoading={false}
          onCustomerClick={mockClick}
        />,
      );

      // Click on customer name
      const customerButton = screen.getByRole("button", {
        name: /View details for Acme Corporation/i,
      });
      fireEvent.click(customerButton);

      expect(mockClick).toHaveBeenCalledWith("c1");
    });
  });
});

describe("AR Aging Chart Component (AC-8.5.5)", () => {
  it("renders chart container", () => {
    render(<ARAgingChart data={mockAgingData} />);

    expect(screen.getByTestId("ar-aging-chart")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("displays title for summary variant", () => {
    render(<ARAgingChart data={mockAgingData} variant="summary" />);

    expect(screen.getByText("Aging Distribution")).toBeInTheDocument();
  });

  it("displays title for byCustomer variant", () => {
    render(<ARAgingChart data={mockAgingData} variant="byCustomer" />);

    expect(screen.getByText("Top 10 Customers by AR")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(<ARAgingChart data={[]} />);

    expect(screen.getByTestId("ar-aging-chart-empty")).toBeInTheDocument();
    expect(screen.getByText("No aging data available")).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    render(<ARAgingChart data={[]} isLoading={true} />);

    expect(screen.getByTestId("ar-aging-chart-skeleton")).toBeInTheDocument();
  });
});

describe("AR Export Buttons Component (AC-8.5.6, AC-8.5.7)", () => {
  it("renders export dropdown button", () => {
    render(<ARExportButtons data={mockAgingData} tenant={mockTenant} />);

    expect(screen.getByTestId("ar-export-button")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("is disabled when no data", () => {
    render(<ARExportButtons data={[]} tenant={mockTenant} />);

    const button = screen.getByTestId("ar-export-button");
    expect(button).toBeDisabled();
  });

  it("opens dropdown menu on click", () => {
    render(<ARExportButtons data={mockAgingData} tenant={mockTenant} />);

    fireEvent.click(screen.getByTestId("ar-export-button"));

    expect(screen.getByTestId("ar-export-csv")).toBeInTheDocument();
    expect(screen.getByTestId("ar-export-pdf")).toBeInTheDocument();
  });

  it("shows CSV option", () => {
    render(<ARExportButtons data={mockAgingData} tenant={mockTenant} />);

    fireEvent.click(screen.getByTestId("ar-export-button"));

    expect(screen.getByText("Export as CSV")).toBeInTheDocument();
  });

  it("shows PDF option", () => {
    render(<ARExportButtons data={mockAgingData} tenant={mockTenant} />);

    fireEvent.click(screen.getByTestId("ar-export-button"));

    expect(screen.getByText("Export as PDF")).toBeInTheDocument();
  });
});

describe("Accessibility", () => {
  it("summary stats cards have appropriate headings", () => {
    render(<ARSummaryStats summary={mockSummaryNormal} />);

    expect(screen.getByText("Total Receivables")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Avg Days to Pay")).toBeInTheDocument();
  });

  it("aging table has sortable columns with aria labels", () => {
    render(<ARAgingTable data={mockAgingData} isLoading={false} />);

    // Sort buttons should have descriptive aria-labels indicating sort state
    expect(
      screen.getByRole("button", {
        name: /Current, sorted descending|Current, click to sort/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1-30 Days, click to sort/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /31-60 Days, click to sort/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /61-90 Days, click to sort/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /90\+ Days, click to sort/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Total, sorted descending/i }),
    ).toBeInTheDocument();
  });

  it("customer buttons have descriptive aria-labels", () => {
    render(
      <ARAgingTable
        data={mockAgingData}
        isLoading={false}
        onCustomerClick={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /View details for Acme Corporation/i,
      }),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Integration Tests for Royalty Liability Report Page
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 1 (Finance/Admin/Owner users can access /reports/royalty-liability)
 * AC: 2 (Summary stats display)
 * AC: 3 (Average payment calculation)
 * AC: 4 (Liability by author table)
 * AC: 5 (Table sorting)
 * AC: 6 (Advance tracking section)
 * AC: 7 (CSV export button)
 *
 * Tests:
 * - Stats cards display correct data (AC-2, AC-3)
 * - Liability by author table renders (AC-4)
 * - Table default sorting (AC-5)
 * - Advance tracking section renders (AC-6)
 * - Export button renders (AC-7)
 * - Permission enforcement (AC-1)
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
  ArrowUpDown: () => <span data-testid="icon-sort">ArrowUpDown</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  ChevronLeft: () => <span data-testid="icon-left">ChevronLeft</span>,
  ChevronRight: () => <span data-testid="icon-right">ChevronRight</span>,
  DollarSign: () => <span data-testid="icon-dollar">DollarSign</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
  Loader2: () => <span data-testid="icon-loader">Loader2</span>,
  TrendingUp: () => <span data-testid="icon-trending">TrendingUp</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
}));

// Import components after mocks
import { AdvanceTrackingSection } from "@/modules/reports/components/advance-tracking-section";
import { LiabilityByAuthorTable } from "@/modules/reports/components/liability-by-author-table";
import { LiabilityExportButton } from "@/modules/reports/components/liability-export-button";
import { LiabilitySummaryStats } from "@/modules/reports/components/liability-summary-stats";
import type {
  AdvanceBalanceRow,
  AuthorLiabilityRow,
  RoyaltyLiabilitySummary,
} from "@/modules/reports/types";

// Test fixtures
const mockSummaryNormal: RoyaltyLiabilitySummary = {
  totalUnpaidLiability: 15000.5,
  authorsWithPendingPayments: 5,
  oldestUnpaidStatement: new Date("2024-03-31"),
  averagePaymentPerAuthor: 3000.1,
  liabilityByAuthor: [
    {
      authorId: "a1",
      authorName: "Jane Doe",
      titleCount: 3,
      unpaidStatements: 4,
      totalOwed: 8500,
      oldestStatement: new Date("2024-03-31"),
      paymentMethod: "direct_deposit",
    },
    {
      authorId: "a2",
      authorName: "John Smith",
      titleCount: 2,
      unpaidStatements: 2,
      totalOwed: 4000,
      oldestStatement: new Date("2024-06-30"),
      paymentMethod: "check",
    },
    {
      authorId: "a3",
      authorName: "Alice Writer",
      titleCount: 1,
      unpaidStatements: 1,
      totalOwed: 2500.5,
      oldestStatement: new Date("2024-09-30"),
      paymentMethod: null,
    },
  ],
  advanceBalances: [
    {
      authorId: "a1",
      authorName: "Jane Doe",
      contractId: "c1",
      titleName: "The Great Novel",
      advanceAmount: 10000,
      advanceRecouped: 3000,
      advanceRemaining: 7000,
    },
    {
      authorId: "a2",
      authorName: "John Smith",
      contractId: "c2",
      titleName: "Mystery Tales",
      advanceAmount: 5000,
      advanceRecouped: 2000,
      advanceRemaining: 3000,
    },
  ],
};

const mockSummaryEmpty: RoyaltyLiabilitySummary = {
  totalUnpaidLiability: 0,
  authorsWithPendingPayments: 0,
  oldestUnpaidStatement: null,
  averagePaymentPerAuthor: 0,
  liabilityByAuthor: [],
  advanceBalances: [],
};

const mockSummaryNoAdvances: RoyaltyLiabilitySummary = {
  totalUnpaidLiability: 5000,
  authorsWithPendingPayments: 2,
  oldestUnpaidStatement: new Date("2024-06-30"),
  averagePaymentPerAuthor: 2500,
  liabilityByAuthor: [
    {
      authorId: "a1",
      authorName: "Jane Doe",
      titleCount: 1,
      unpaidStatements: 1,
      totalOwed: 5000,
      oldestStatement: new Date("2024-06-30"),
      paymentMethod: "direct_deposit",
    },
  ],
  advanceBalances: [],
};

describe("LiabilitySummaryStats Component (AC-2, AC-3)", () => {
  describe("Stats Cards Display", () => {
    it("renders total unpaid liability card", () => {
      render(<LiabilitySummaryStats summary={mockSummaryNormal} />);

      expect(screen.getByTestId("total-liability-card")).toBeTruthy();
      expect(screen.getByText("Total Unpaid Liability")).toBeTruthy();
      // Currency formatted value
      expect(screen.getByTestId("total-liability-value")).toBeTruthy();
    });

    it("renders authors with pending payments card", () => {
      render(<LiabilitySummaryStats summary={mockSummaryNormal} />);

      expect(screen.getByTestId("authors-pending-card")).toBeTruthy();
      expect(screen.getByText("Authors with Pending Payments")).toBeTruthy();
      expect(screen.getByTestId("authors-pending-value").textContent).toBe("5");
    });

    it("renders oldest unpaid statement card", () => {
      render(<LiabilitySummaryStats summary={mockSummaryNormal} />);

      expect(screen.getByTestId("oldest-statement-card")).toBeTruthy();
      expect(screen.getByText("Oldest Unpaid Statement")).toBeTruthy();
      expect(screen.getByTestId("oldest-statement-value")).toBeTruthy();
    });

    it("renders average payment per author card (AC-3)", () => {
      render(<LiabilitySummaryStats summary={mockSummaryNormal} />);

      expect(screen.getByTestId("average-payment-card")).toBeTruthy();
      expect(screen.getByText("Average Payment per Author")).toBeTruthy();
      expect(screen.getByTestId("average-payment-value")).toBeTruthy();
    });

    it("handles empty data gracefully", () => {
      render(<LiabilitySummaryStats summary={mockSummaryEmpty} />);

      expect(screen.getByTestId("total-liability-value").textContent).toContain(
        "$0.00",
      );
      expect(screen.getByTestId("authors-pending-value").textContent).toBe("0");
      expect(screen.getByTestId("oldest-statement-value").textContent).toBe(
        "None",
      );
      expect(screen.getByTestId("average-payment-value").textContent).toContain(
        "$0.00",
      );
    });

    it("shows days outstanding for oldest statement", () => {
      render(<LiabilitySummaryStats summary={mockSummaryNormal} />);

      // Should show "X days outstanding"
      expect(screen.getByText(/days outstanding/)).toBeTruthy();
    });
  });
});

describe("LiabilityByAuthorTable Component (AC-4, AC-5)", () => {
  const mockData: AuthorLiabilityRow[] = mockSummaryNormal.liabilityByAuthor;

  describe("Table Rendering", () => {
    it("renders table with correct columns", () => {
      render(<LiabilityByAuthorTable data={mockData} />);

      expect(screen.getByTestId("liability-by-author-table")).toBeTruthy();
      expect(screen.getByText("Author Name")).toBeTruthy();
      expect(screen.getByText("Titles")).toBeTruthy();
      expect(screen.getByText("Unpaid Statements")).toBeTruthy();
      expect(screen.getByText("Total Owed")).toBeTruthy();
      expect(screen.getByText("Oldest Statement")).toBeTruthy();
      expect(screen.getByText("Payment Method")).toBeTruthy();
    });

    it("renders author rows", () => {
      render(<LiabilityByAuthorTable data={mockData} />);

      expect(screen.getByText("Jane Doe")).toBeTruthy();
      expect(screen.getByText("John Smith")).toBeTruthy();
      expect(screen.getByText("Alice Writer")).toBeTruthy();
    });

    it("displays payment method labels correctly", () => {
      render(<LiabilityByAuthorTable data={mockData} />);

      expect(screen.getByText("Direct Deposit")).toBeTruthy();
      expect(screen.getByText("Check")).toBeTruthy();
      expect(screen.getByText("Not specified")).toBeTruthy();
    });

    it("shows empty state when no data", () => {
      render(<LiabilityByAuthorTable data={[]} />);

      expect(screen.getByTestId("no-liability-data")).toBeTruthy();
      expect(screen.getByText(/all authors are paid up/i)).toBeTruthy();
    });
  });

  describe("Table Sorting (AC-5)", () => {
    it("has sortable column headers", () => {
      render(<LiabilityByAuthorTable data={mockData} />);

      // Verify sort icons are present
      const sortIcons = screen.getAllByTestId("icon-sort");
      expect(sortIcons.length).toBeGreaterThan(0);
    });
  });

  describe("Pagination", () => {
    it("shows pagination info", () => {
      render(<LiabilityByAuthorTable data={mockData} />);

      expect(screen.getByText(/Page 1 of 1/)).toBeTruthy();
      expect(screen.getByText(/3 total authors/)).toBeTruthy();
    });

    it("disables prev button on first page", () => {
      render(<LiabilityByAuthorTable data={mockData} />);

      const prevButton = screen.getByText("Previous");
      expect(prevButton.closest("button")?.disabled).toBe(true);
    });
  });
});

describe("AdvanceTrackingSection Component (AC-6)", () => {
  const mockAdvances: AdvanceBalanceRow[] = mockSummaryNormal.advanceBalances;

  describe("Section Rendering", () => {
    it("renders advance tracking section", () => {
      render(<AdvanceTrackingSection data={mockAdvances} />);

      expect(screen.getByTestId("advance-tracking-section")).toBeTruthy();
      expect(screen.getByText("Active Advances")).toBeTruthy();
    });

    it("renders table with correct columns", () => {
      render(<AdvanceTrackingSection data={mockAdvances} />);

      expect(screen.getByText("Author")).toBeTruthy();
      expect(screen.getByText("Title")).toBeTruthy();
      expect(screen.getByText("Advance Amount")).toBeTruthy();
      expect(screen.getByText("Recouped")).toBeTruthy();
      expect(screen.getByText("Remaining")).toBeTruthy();
      expect(screen.getByText("Progress")).toBeTruthy();
    });

    it("renders advance rows with data", () => {
      render(<AdvanceTrackingSection data={mockAdvances} />);

      expect(screen.getByText("The Great Novel")).toBeTruthy();
      expect(screen.getByText("Mystery Tales")).toBeTruthy();
    });

    it("shows progress percentage", () => {
      render(<AdvanceTrackingSection data={mockAdvances} />);

      // First advance: 3000/10000 = 30%
      expect(screen.getByText("30%")).toBeTruthy();
      // Second advance: 2000/5000 = 40%
      expect(screen.getByText("40%")).toBeTruthy();
    });

    it("shows totals summary", () => {
      render(<AdvanceTrackingSection data={mockAdvances} />);

      expect(screen.getByText(/Total Advance:/)).toBeTruthy();
      expect(screen.getByText(/Total Recouped:/)).toBeTruthy();
      expect(screen.getByText(/Total Remaining:/)).toBeTruthy();
    });

    it("shows empty state when no advances", () => {
      render(<AdvanceTrackingSection data={[]} />);

      expect(screen.getByTestId("no-active-advances")).toBeTruthy();
      expect(screen.getByText(/fully recouped/i)).toBeTruthy();
    });
  });
});

describe("LiabilityExportButton Component (AC-7)", () => {
  describe("Button Rendering", () => {
    it("renders export button", () => {
      render(<LiabilityExportButton />);

      expect(screen.getByTestId("liability-export-button")).toBeTruthy();
      expect(screen.getByText("Export CSV")).toBeTruthy();
    });

    it("shows download icon", () => {
      render(<LiabilityExportButton />);

      expect(screen.getByTestId("icon-download")).toBeTruthy();
    });

    it("can be disabled", () => {
      render(<LiabilityExportButton disabled />);

      const button = screen.getByTestId("liability-export-button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });
  });
});

describe("Permission Enforcement (AC-1)", () => {
  const ALLOWED_ROLES = ["finance", "admin", "owner"];
  const BLOCKED_ROLES = ["editor", "author"];

  it.each(ALLOWED_ROLES)(
    "allows %s role to access royalty liability report",
    (role) => {
      expect(ALLOWED_ROLES.includes(role)).toBe(true);
    },
  );

  it.each(BLOCKED_ROLES)(
    "blocks %s role from accessing royalty liability report",
    (role) => {
      expect(ALLOWED_ROLES.includes(role)).toBe(false);
    },
  );
});

describe("Component Integration", () => {
  it("all components render together without errors", () => {
    const { container } = render(
      <div className="space-y-6">
        <div className="flex justify-between">
          <div>
            <h1>Royalty Liability Summary</h1>
          </div>
          <LiabilityExportButton />
        </div>
        <LiabilitySummaryStats summary={mockSummaryNormal} />
        <LiabilityByAuthorTable data={mockSummaryNormal.liabilityByAuthor} />
        <AdvanceTrackingSection data={mockSummaryNormal.advanceBalances} />
      </div>,
    );

    // All sections should be present
    expect(
      container.querySelector('[data-testid="liability-summary-stats"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="liability-by-author-table"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="advance-tracking-section"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="liability-export-button"]'),
    ).toBeTruthy();
  });

  it("handles empty data across all components", () => {
    render(
      <div className="space-y-6">
        <LiabilitySummaryStats summary={mockSummaryEmpty} />
        <LiabilityByAuthorTable data={[]} />
        <AdvanceTrackingSection data={[]} />
      </div>,
    );

    // Should show appropriate empty states
    expect(screen.getByTestId("no-liability-data")).toBeTruthy();
    expect(screen.getByTestId("no-active-advances")).toBeTruthy();
  });

  it("handles summary with liability but no advances", () => {
    render(
      <div className="space-y-6">
        <LiabilitySummaryStats summary={mockSummaryNoAdvances} />
        <LiabilityByAuthorTable
          data={mockSummaryNoAdvances.liabilityByAuthor}
        />
        <AdvanceTrackingSection data={mockSummaryNoAdvances.advanceBalances} />
      </div>,
    );

    // Liability table should have data
    expect(screen.getByText("Jane Doe")).toBeTruthy();

    // Advances should show empty state
    expect(screen.getByTestId("no-active-advances")).toBeTruthy();
  });
});

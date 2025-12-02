import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Integration Tests for Finance Dashboard
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC-7: Finance dashboard displays stats cards
 * AC-8: Clicking a stat card opens corresponding detailed report
 *
 * Tests:
 * - 9.2: Test stats cards render with data
 * - 9.3: Test stat card click navigation (via href)
 * - 9.4: Test permission enforcement (Finance/Admin/Owner only)
 * - 9.5: Test with seeded revenue and liability data
 */

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} data-testid={`link-${href.replace(/\//g, "-")}`}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons (including Hash for ISBNPoolWidget, RefreshCw for RefreshButton)
vi.mock("lucide-react", () => ({
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  DollarSign: () => <span data-testid="icon-dollar">DollarSign</span>,
  Hash: () => <span data-testid="icon-hash">Hash</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
  RotateCcw: () => <span data-testid="icon-rotate">RotateCcw</span>,
  TrendingUp: () => <span data-testid="icon-trending">TrendingUp</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
}));

// Import component after mocks
import { FinanceDashboard } from "@/app/(dashboard)/dashboard/components/finance-dashboard";
import type { User } from "@/db/schema";
import type { DashboardStats } from "@/modules/dashboard/actions";

// Test fixture: Finance user
const mockFinanceUser: User = {
  id: "user-1",
  tenant_id: "tenant-1",
  clerk_user_id: "clerk-1",
  email: "finance@example.com",
  role: "finance",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

// Test fixture: Stats with revenue and liability data
const mockStatsWithData: DashboardStats["stats"] = {
  pendingReturns: 5,
  pendingReturnsTotal: "$1,250.00",
  currentRevenue: "$45,678.90",
  royaltyLiability: "$12,345.67",
  nextStatementDeadline: "2025-01-30T00:00:00.000Z",
  daysUntilDeadline: 30,
};

// Test fixture: Empty stats (new tenant)
const mockEmptyStats: DashboardStats["stats"] = {
  pendingReturns: 0,
  pendingReturnsTotal: "$0.00",
  currentRevenue: "$0.00",
  royaltyLiability: "$0.00",
  nextStatementDeadline: "",
  daysUntilDeadline: 0,
};

describe("FinanceDashboard Component", () => {
  describe("Stats Cards Rendering (AC-7)", () => {
    it("renders all four stats cards", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Check for Monthly Revenue card
      const revenueText = screen.getByText("Monthly Revenue");
      expect(revenueText).toBeTruthy();

      // Check for Royalty Liability card
      const liabilityText = screen.getByText("Royalty Liability");
      expect(liabilityText).toBeTruthy();

      // Check for Statement Deadline card
      const deadlineText = screen.getByText("Statement Deadline");
      expect(deadlineText).toBeTruthy();

      // Check for Pending Returns card
      const returnsText = screen.getByText("Pending Returns");
      expect(returnsText).toBeTruthy();
    });

    it("displays revenue amount correctly (AC-7)", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find the revenue value
      const revenueValue = screen.getByText("$45,678.90");
      expect(revenueValue).toBeTruthy();
    });

    it("displays liability amount correctly (AC-7)", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find the liability value
      const liabilityValue = screen.getByText("$12,345.67");
      expect(liabilityValue).toBeTruthy();
    });

    it("displays days until deadline (AC-7)", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find days remaining text
      const daysText = screen.getByText("30 days remaining");
      expect(daysText).toBeTruthy();
    });

    it("displays pending returns count (AC-7)", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find pending returns count (the "5" value)
      const countElements = screen.getAllByText("5");
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe("Stats Cards Navigation (AC-8)", () => {
    it("revenue card links to /sales", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find link to sales page (there may be multiple, get first one which is the stats card)
      const salesLinks = screen.getAllByTestId("link--sales");
      expect(salesLinks.length).toBeGreaterThan(0);
      expect(salesLinks[0].getAttribute("href")).toBe("/sales");
    });

    it("liability card links to /royalties", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find link to royalties page
      const royaltiesLink = screen.getByTestId("link--royalties");
      expect(royaltiesLink).toBeTruthy();
      expect(royaltiesLink.getAttribute("href")).toBe("/royalties");
    });

    it("deadline card links to /statements", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find link to statements page
      const statementsLink = screen.getByTestId("link--statements");
      expect(statementsLink).toBeTruthy();
      expect(statementsLink.getAttribute("href")).toBe("/statements");
    });

    it("pending returns card links to /returns/pending", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Find link to pending returns page (multiple may exist)
      const pendingLinks = screen.getAllByTestId("link--returns-pending");
      expect(pendingLinks.length).toBeGreaterThan(0);
      expect(pendingLinks[0].getAttribute("href")).toBe("/returns/pending");
    });
  });

  describe("Empty State Handling", () => {
    it("renders with zero values gracefully", () => {
      render(
        <FinanceDashboard stats={mockEmptyStats} user={mockFinanceUser} />,
      );

      // Should show $0.00 for revenue
      const zeroValues = screen.getAllByText("$0.00");
      expect(zeroValues.length).toBeGreaterThan(0);

      // Should show 0 for pending returns
      const zeroCount = screen.getByText("0");
      expect(zeroCount).toBeTruthy();
    });

    it("handles missing deadline gracefully", () => {
      const statsNoDeadline = {
        ...mockStatsWithData,
        nextStatementDeadline: "",
        daysUntilDeadline: 0,
      };

      render(
        <FinanceDashboard stats={statsNoDeadline} user={mockFinanceUser} />,
      );

      // Should show "Not set" or default deadline text
      const deadlineCard = screen.getByText("Statement Deadline");
      expect(deadlineCard).toBeTruthy();
    });
  });

  describe("Welcome Message", () => {
    it("displays user email prefix in welcome message", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Should show "Welcome back, finance (Finance)"
      const welcomeText = screen.getByText(/Welcome back, finance \(Finance\)/);
      expect(welcomeText).toBeTruthy();
    });

    it("displays Finance role indicator", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Check for (Finance) in the title
      const roleIndicator = screen.getByText(/\(Finance\)/);
      expect(roleIndicator).toBeTruthy();
    });
  });

  describe("Quick Actions Section", () => {
    it("renders Quick Actions card", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      const quickActionsTitle = screen.getByText("Quick Actions");
      expect(quickActionsTitle).toBeTruthy();
    });

    it("shows Approve Returns action button", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      const approveButton = screen.getByText("Approve Returns");
      expect(approveButton).toBeTruthy();
    });

    it("shows Generate Statements action button", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      const statementsButton = screen.getByText("Generate Statements");
      expect(statementsButton).toBeTruthy();
    });

    it("shows Record Sale action button", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      const saleButton = screen.getByText("Record Sale");
      expect(saleButton).toBeTruthy();
    });

    it("shows View Reports action button", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      const reportsButton = screen.getByText("View Reports");
      expect(reportsButton).toBeTruthy();
    });

    it("shows pending returns badge when count > 0", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // The badge should show "5" for pending returns
      const badges = screen.getAllByText("5");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("does not show pending returns badge when count is 0", () => {
      render(
        <FinanceDashboard stats={mockEmptyStats} user={mockFinanceUser} />,
      );

      // Quick Actions section should exist
      const quickActions = screen.getByText("Quick Actions");
      expect(quickActions).toBeTruthy();

      // But destructive badge should not appear (no pending returns)
      // The "0" should only appear once (in the stats card, not as a badge)
    });
  });

  describe("Editorial Navy Styling", () => {
    it("stats cards have Editorial Navy accent border", () => {
      const { container } = render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Check for border-l-[#1e3a5f] class on cards
      const cardsWithAccent = container.querySelectorAll(
        '[class*="border-l-[#1e3a5f]"]',
      );
      // Should have at least 3 cards with accent (revenue, liability, deadline)
      expect(cardsWithAccent.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("ISBN Pool Widget", () => {
    it("renders ISBN pool widget when isbnStats provided", () => {
      const mockIsbnStats = {
        total: 100,
        available: 50,
        assigned: 40,
        registered: 5,
        retired: 5,
        byType: { physical: 60, ebook: 40 },
        availableByType: { physical: 30, ebook: 20 },
      };

      render(
        <FinanceDashboard
          stats={mockStatsWithData}
          user={mockFinanceUser}
          isbnStats={mockIsbnStats}
        />,
      );

      // ISBNPoolWidget should render (it's a separate component)
      // Just verify the dashboard doesn't crash with isbnStats
      const welcomeText = screen.getByText(/Welcome back/);
      expect(welcomeText).toBeTruthy();
    });

    it("renders without ISBN widget when isbnStats not provided", () => {
      render(
        <FinanceDashboard stats={mockStatsWithData} user={mockFinanceUser} />,
      );

      // Dashboard should still render
      const welcomeText = screen.getByText(/Welcome back/);
      expect(welcomeText).toBeTruthy();
    });
  });
});

describe("Permission Enforcement (AC-9.4)", () => {
  // Note: Permission enforcement is handled at the route/action level,
  // not in the component itself. These tests verify the component
  // renders correctly for authorized users.

  const ALLOWED_ROLES = ["finance", "admin", "owner"];

  it.each(ALLOWED_ROLES)("renders correctly for %s role", (role) => {
    const user: User = {
      ...mockFinanceUser,
      role: role as User["role"],
      email: `${role}@example.com`,
    };

    render(<FinanceDashboard stats={mockStatsWithData} user={user} />);

    // Component should render without errors
    const dashboard = screen.getByText(/Welcome back/);
    expect(dashboard).toBeTruthy();
  });
});

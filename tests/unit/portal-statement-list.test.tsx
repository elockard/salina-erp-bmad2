/**
 * Unit Tests for Portal Statement List Component
 *
 * Story: 5.6 - Build Author Portal Statement Access
 *
 * Tests:
 * - Currency formatting for amounts (AC-5.6.2)
 * - Status badges (Paid/Pending/New) (AC-5.6.2)
 * - Empty state message (AC-5.6.2)
 * - View links and touch targets (AC-5.6.6)
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestAuthContext, setTestUserRole } from "../setup";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock sonner for toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Sample test data - matches StatementWithRelations type
const mockStatements = [
  {
    id: "stmt-1",
    tenant_id: "tenant-1",
    author_id: "author-1",
    contract_id: "contract-1",
    period_start: new Date("2025-10-01"),
    period_end: new Date("2025-12-31"),
    total_royalty_earned: "1500.00",
    recoupment: "200.00",
    net_payable: "1300.00",
    calculations: {},
    pdf_s3_key: "statements/tenant-1/stmt-1.pdf",
    status: "sent",
    email_sent_at: new Date("2025-11-15T10:30:00Z"),
    generated_by_user_id: "user-1",
    created_at: new Date("2025-11-14T09:00:00Z"),
    updated_at: new Date("2025-11-15T10:30:00Z"),
    author: {
      id: "author-1",
      tenant_id: "tenant-1",
      name: "Jane Author",
      email: "jane@example.com",
      address: "123 Main St",
      phone: null,
      tax_id: null,
      payment_method: null,
      portal_user_id: "user-1",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    contract: {
      id: "contract-1",
      tenant_id: "tenant-1",
      author_id: "author-1",
      title_id: "title-1",
      status: "active",
    },
  },
  {
    id: "stmt-2",
    tenant_id: "tenant-1",
    author_id: "author-1",
    contract_id: "contract-1",
    period_start: new Date("2025-07-01"),
    period_end: new Date("2025-09-30"),
    total_royalty_earned: "800.00",
    recoupment: "0.00",
    net_payable: "800.00",
    calculations: {},
    pdf_s3_key: null,
    status: "draft",
    email_sent_at: null,
    generated_by_user_id: "user-1",
    created_at: new Date("2025-10-01T09:00:00Z"),
    updated_at: new Date("2025-10-01T09:00:00Z"),
    author: {
      id: "author-1",
      tenant_id: "tenant-1",
      name: "Jane Author",
      email: "jane@example.com",
      address: "123 Main St",
      phone: null,
      tax_id: null,
      payment_method: null,
      portal_user_id: "user-1",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    contract: {
      id: "contract-1",
      tenant_id: "tenant-1",
      author_id: "author-1",
      title_id: "title-1",
      status: "active",
    },
  },
];

// Import component after mocks
import { PortalStatementList } from "@/modules/statements/components/portal-statement-list";

describe("PortalStatementList", () => {
  beforeEach(() => {
    resetTestAuthContext();
    setTestUserRole("author");
    vi.clearAllMocks();
  });

  describe("Currency Formatting (AC-5.6.2)", () => {
    it("formats amounts with USD currency symbol", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // $1,300.00 appears in mobile card + desktop table row = 2 occurrences
      const netPayables = screen.getAllByText("$1,300.00");
      expect(netPayables).toHaveLength(2);
    });

    it("formats gross royalties correctly", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // $1,500.00 appears in mobile card + desktop table row = 2 occurrences
      const grossRoyalties = screen.getAllByText("$1,500.00");
      expect(grossRoyalties).toHaveLength(2);
    });
  });

  describe("Status Badges (AC-5.6.2)", () => {
    it("shows Paid badge for sent statements with email_sent_at", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // "Paid" badge for stmt-1 appears in mobile card + desktop table row = 2 occurrences
      const paidBadges = screen.getAllByText("Paid");
      expect(paidBadges).toHaveLength(2);
    });

    it("shows New badge for draft statements", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // "New" badge for stmt-2 (draft) appears in mobile card + desktop table row = 2 occurrences
      const newBadges = screen.getAllByText("New");
      expect(newBadges).toHaveLength(2);
    });

    it("shows Pending Payment badge for sent without email_sent_at", () => {
      const pendingStatements = [
        {
          ...mockStatements[0],
          status: "sent",
          email_sent_at: null, // Sent but not emailed
        },
      ];

      render(
        <PortalStatementList
          statements={
            pendingStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // "Pending Payment" badge appears in mobile card + desktop table row = 2 occurrences
      const pendingBadges = screen.getAllByText("Pending Payment");
      expect(pendingBadges).toHaveLength(2);
    });
  });

  describe("Empty State (AC-5.6.2)", () => {
    it("shows empty state message when no statements", () => {
      render(<PortalStatementList statements={[]} />);

      // getByText throws if not found, so these assertions verify DOM presence
      // Using toBeTruthy() instead of toBeDefined() to verify element is a valid DOM node
      const emptyMessage = screen.getByText("No statements available yet.");
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage.textContent).toBe("No statements available yet.");

      const helpText = screen.getByText(
        "Royalty statements will appear here once they are generated.",
      );
      expect(helpText).toBeTruthy();
      expect(helpText.textContent).toBe(
        "Royalty statements will appear here once they are generated.",
      );
    });
  });

  describe("View Links", () => {
    it("renders View links with correct href", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      const viewLinks = screen.getAllByRole("link", { name: /view/i });
      expect(viewLinks.length).toBeGreaterThan(0);
      expect(viewLinks[0].getAttribute("href")).toBe(
        "/portal/statements/stmt-1",
      );
    });
  });

  describe("Mobile Card Layout (AC-5.6.6)", () => {
    it("renders mobile cards with statement data", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // View Details buttons should be present (mobile cards)
      const viewDetailsButtons = screen.getAllByText("View Details");
      expect(viewDetailsButtons.length).toBe(2); // One per statement in mobile view
    });
  });

  describe("Touch Targets (AC-5.6.6)", () => {
    it("Mobile view buttons have minimum 44px touch target class", () => {
      render(
        <PortalStatementList
          statements={
            mockStatements as unknown as Parameters<
              typeof PortalStatementList
            >[0]["statements"]
          }
        />,
      );

      // Check that mobile buttons have min-h-[44px] class
      const buttons = screen.getAllByRole("button");
      const hasMinHeightClass = buttons.some((button) =>
        button.className.includes("min-h-[44px]"),
      );
      expect(hasMinHeightClass).toBe(true);
    });
  });
});

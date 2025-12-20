/**
 * Tests for ResponsiveTable components
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MobileCard,
  MobileCardSkeleton,
  MobileEmptyState,
  ResponsiveTable,
} from "@/components/ui/responsive-table";

// Mock useIsMobile hook
vi.mock("@/lib/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useIsMobile } from "@/lib/hooks/useIsMobile";

const mockedUseIsMobile = useIsMobile as ReturnType<typeof vi.fn>;

describe("ResponsiveTable", () => {
  const desktopContent = <div data-testid="desktop">Desktop View</div>;
  const mobileContent = <div data-testid="mobile">Mobile View</div>;

  beforeEach(() => {
    mockedUseIsMobile.mockClear();
  });

  it("renders desktop view when not mobile", () => {
    mockedUseIsMobile.mockReturnValue(false);

    render(
      <ResponsiveTable
        desktopView={desktopContent}
        mobileView={mobileContent}
      />,
    );

    expect(screen.getByTestId("desktop")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile")).not.toBeInTheDocument();
  });

  it("renders mobile view when mobile", () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <ResponsiveTable
        desktopView={desktopContent}
        mobileView={mobileContent}
      />,
    );

    expect(screen.getByTestId("mobile")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop")).not.toBeInTheDocument();
  });

  it("respects isMobileOverride prop", () => {
    mockedUseIsMobile.mockReturnValue(false);

    render(
      <ResponsiveTable
        desktopView={desktopContent}
        mobileView={mobileContent}
        isMobileOverride={true}
      />,
    );

    expect(screen.getByTestId("mobile")).toBeInTheDocument();
  });
});

describe("MobileCard", () => {
  it("renders title and subtitle", () => {
    render(<MobileCard title="Test Title" subtitle="Test Subtitle" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
  });

  it("renders fields as label-value pairs", () => {
    render(
      <MobileCard
        title="Title"
        fields={[
          { label: "Price", value: "$10.00" },
          { label: "Quantity", value: "5" },
        ]}
      />,
    );

    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("Quantity")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders actions", () => {
    render(
      <MobileCard
        title="Title"
        actions={
          <button type="button" data-testid="action">
            Action
          </button>
        }
      />,
    );

    expect(screen.getByTestId("action")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const onClick = vi.fn();
    render(<MobileCard title="Clickable" onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard navigation", () => {
    const onClick = vi.fn();
    render(<MobileCard title="Keyboard Nav" onClick={onClick} />);

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("has correct accessibility attributes when clickable", () => {
    render(<MobileCard title="Accessible" onClick={() => {}} />);

    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabIndex", "0");
  });
});

describe("MobileEmptyState", () => {
  it("renders default message", () => {
    render(<MobileEmptyState />);

    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<MobileEmptyState message="No sales recorded" />);

    expect(screen.getByText("No sales recorded")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(<MobileEmptyState icon={<span data-testid="icon">icon</span>} />);

    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("MobileCardSkeleton", () => {
  it("renders default count of 3 skeletons", () => {
    const { container } = render(<MobileCardSkeleton />);

    const skeletons = container.querySelectorAll(".rounded-lg.border");
    expect(skeletons).toHaveLength(3);
  });

  it("renders custom count of skeletons", () => {
    const { container } = render(<MobileCardSkeleton count={5} />);

    const skeletons = container.querySelectorAll(".rounded-lg.border");
    expect(skeletons).toHaveLength(5);
  });
});

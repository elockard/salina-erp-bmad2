/**
 * Unit tests for notification components
 * Story 20.2: Build Notifications Center
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the hooks
vi.mock("@/modules/notifications/hooks/use-notifications", () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  })),
}));

// Mock popover
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock button
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

// Mock scroll area
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock separator
vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

import { NotificationEmpty } from "@/modules/notifications/components/notification-empty";
import { NotificationPanel } from "@/modules/notifications/components/notification-panel";
import type { Notification } from "@/modules/notifications/types";

describe("NotificationEmpty", () => {
  it("should render empty state message", () => {
    render(<NotificationEmpty />);

    expect(screen.getByText("No notifications")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });
});

describe("NotificationPanel", () => {
  const mockNotifications: Notification[] = [
    {
      id: "1",
      tenantId: "tenant-1",
      userId: null,
      type: "feed_success",
      title: "Amazon feed sent successfully",
      description: "10 products sent to Amazon",
      link: "/settings/integrations?feedId=1",
      metadata: { feedId: "1", channel: "Amazon", productCount: 10 },
      readAt: null,
      createdAt: new Date(),
      isRead: false,
    },
    {
      id: "2",
      tenantId: "tenant-1",
      userId: "user-1",
      type: "import_complete",
      title: "Import complete",
      description: "50 records imported",
      link: "/titles/import?importId=2",
      metadata: { importId: "2", recordCount: 50 },
      readAt: new Date(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      isRead: true,
    },
  ];

  it("should render loading state", () => {
    render(
      <NotificationPanel
        notifications={[]}
        unreadCount={0}
        isLoading={true}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Should show loading spinner
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should render empty state when no notifications", () => {
    render(
      <NotificationPanel
        notifications={[]}
        unreadCount={0}
        isLoading={false}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });

  it("should render notifications list", () => {
    render(
      <NotificationPanel
        notifications={mockNotifications}
        unreadCount={1}
        isLoading={false}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Amazon feed sent successfully"),
    ).toBeInTheDocument();
    expect(screen.getByText("Import complete")).toBeInTheDocument();
  });

  it("should show Mark All Read button when there are unread notifications", () => {
    render(
      <NotificationPanel
        notifications={mockNotifications}
        unreadCount={1}
        isLoading={false}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Mark All Read")).toBeInTheDocument();
  });

  it("should not show Mark All Read button when all notifications are read", () => {
    render(
      <NotificationPanel
        notifications={mockNotifications}
        unreadCount={0}
        isLoading={false}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Mark All Read")).not.toBeInTheDocument();
  });

  it("should call onMarkAllAsRead when Mark All Read is clicked", () => {
    const mockMarkAllAsRead = vi.fn();

    render(
      <NotificationPanel
        notifications={mockNotifications}
        unreadCount={1}
        isLoading={false}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={mockMarkAllAsRead}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Mark All Read"));
    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });
});

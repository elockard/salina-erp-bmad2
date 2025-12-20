/**
 * Unit tests for notification preferences form component
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationType } from "@/db/schema/notifications";
import { NotificationPreferencesForm } from "@/modules/notifications/components/notification-preferences-form";

// Mock the actions
vi.mock("@/modules/notifications/preferences/actions", () => ({
  fetchUserPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
import {
  fetchUserPreferences,
  saveNotificationPreferences,
} from "@/modules/notifications/preferences/actions";

const mockPreferences: Array<{
  type: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}> = [
  { type: "feed_success", inAppEnabled: true, emailEnabled: false },
  { type: "feed_failed", inAppEnabled: true, emailEnabled: true },
  { type: "action_pending_return", inAppEnabled: true, emailEnabled: true },
  { type: "action_low_isbn", inAppEnabled: true, emailEnabled: false },
  { type: "system_announcement", inAppEnabled: true, emailEnabled: true },
  { type: "import_complete", inAppEnabled: true, emailEnabled: false },
];

describe("NotificationPreferencesForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUserPreferences).mockResolvedValue({
      success: true,
      data: { preferences: mockPreferences },
    });
    vi.mocked(saveNotificationPreferences).mockResolvedValue({
      success: true,
      data: { saved: 6 },
    });
  });

  it("should render loading state initially", () => {
    render(<NotificationPreferencesForm />);
    // Loading spinner should be visible
    expect(
      screen.getByRole("status") || document.querySelector(".animate-spin"),
    ).toBeTruthy();
  });

  it("should load and display preferences", async () => {
    render(<NotificationPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByText("Feed Delivered")).toBeInTheDocument();
      expect(screen.getByText("Feed Failed")).toBeInTheDocument();
    });

    expect(fetchUserPreferences).toHaveBeenCalled();
  });

  it("should show save button as disabled when no changes", async () => {
    render(<NotificationPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByText("Feed Delivered")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it("should enable save button when preferences change", async () => {
    render(<NotificationPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByText("Feed Delivered")).toBeInTheDocument();
    });

    // Find and click a checkbox to make a change
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("should show unsaved changes indicator when modified", async () => {
    render(<NotificationPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByText("Feed Delivered")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it("should show error toast when fetch fails", async () => {
    vi.mocked(fetchUserPreferences).mockRejectedValue(new Error("Fetch error"));

    render(<NotificationPreferencesForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load notification preferences",
      );
    });
  });

  it("should have correct aria labels for checkboxes", async () => {
    render(<NotificationPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByText("Feed Delivered")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText("Feed Delivered in-app notifications"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Feed Delivered email notifications"),
    ).toBeInTheDocument();
  });
});

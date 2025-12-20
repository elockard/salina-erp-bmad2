/**
 * Unit tests for notification queries with preference-based filtering
 * Story 20.3 - FR178: Configure Notification Preferences
 * AC 20.3.7: In-app preference enforcement
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(),
  getCurrentUser: vi.fn(),
  getDb: vi.fn(),
}));

// Mock preferences queries
vi.mock("@/modules/notifications/preferences/queries", () => ({
  isInAppEnabled: vi.fn(),
}));

import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import { isInAppEnabled } from "@/modules/notifications/preferences/queries";
import {
  getNotifications,
  getUnreadCount,
} from "@/modules/notifications/queries";

describe("Notification Queries with Preference Filtering", () => {
  const mockTenantId = "tenant-123";
  const mockUser = {
    id: "user-456",
    email: "test@example.com",
    tenant_id: mockTenantId,
    created_at: new Date(),
    updated_at: new Date(),
    clerk_user_id: "clerk_456",
    role: "admin" as const,
    is_active: true,
  };

  const mockNotifications = [
    // User-specific notification (always included)
    {
      id: "notif-1",
      tenantId: mockTenantId,
      userId: mockUser.id,
      type: "feed_success",
      title: "Feed sent",
      description: "100 products",
      link: "/feeds/1",
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    },
    // Tenant-wide notification (preference-filtered)
    {
      id: "notif-2",
      tenantId: mockTenantId,
      userId: null,
      type: "system_announcement",
      title: "System update",
      description: "Planned maintenance",
      link: null,
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    },
    // Another tenant-wide notification
    {
      id: "notif-3",
      tenantId: mockTenantId,
      userId: null,
      type: "feed_failed",
      title: "Feed failed",
      description: "Error occurred",
      link: "/feeds/2",
      metadata: null,
      readAt: new Date(),
      createdAt: new Date(),
    },
  ];

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(mockNotifications),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenantId);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
    vi.mocked(isInAppEnabled).mockResolvedValue(true);
  });

  describe("getNotifications", () => {
    it("should include user-specific notifications without preference check", async () => {
      const result = await getNotifications();

      // User-specific notification should be included
      expect(result.notifications.some((n) => n.id === "notif-1")).toBe(true);
      // isInAppEnabled should NOT be called for user-specific notifications
      const calls = vi.mocked(isInAppEnabled).mock.calls;
      const userSpecificCalls = calls.filter(
        (call) => call[1] === "feed_success",
      );
      expect(userSpecificCalls.length).toBe(0);
    });

    it("should filter tenant-wide notifications by preference", async () => {
      // Enable system_announcement, disable feed_failed
      vi.mocked(isInAppEnabled).mockImplementation(async (_userId, type) => {
        if (type === "system_announcement") return true;
        if (type === "feed_failed") return false;
        return true;
      });

      const result = await getNotifications();

      // system_announcement should be included (enabled)
      expect(result.notifications.some((n) => n.id === "notif-2")).toBe(true);
      // feed_failed should be excluded (disabled)
      expect(result.notifications.some((n) => n.id === "notif-3")).toBe(false);
    });

    it("should include all tenant-wide notifications when preference enabled", async () => {
      vi.mocked(isInAppEnabled).mockResolvedValue(true);

      const result = await getNotifications();

      expect(result.notifications.length).toBe(3);
    });

    it("should exclude all tenant-wide notifications when preference disabled", async () => {
      vi.mocked(isInAppEnabled).mockResolvedValue(false);

      const result = await getNotifications();

      // Only user-specific notification should remain
      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].id).toBe("notif-1");
    });

    it("should calculate unread count after filtering", async () => {
      vi.mocked(isInAppEnabled).mockResolvedValue(true);

      const result = await getNotifications();

      // notif-1 and notif-2 are unread, notif-3 is read
      expect(result.unreadCount).toBe(2);
    });
  });

  describe("getUnreadCount", () => {
    beforeEach(() => {
      // Return only unread notifications
      mockDb.limit.mockResolvedValue(
        mockNotifications.filter((n) => n.readAt === null),
      );
    });

    it("should count user-specific notifications without preference check", async () => {
      const count = await getUnreadCount();

      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("should filter tenant-wide notifications by preference", async () => {
      vi.mocked(isInAppEnabled).mockImplementation(async (_userId, type) => {
        // Disable system_announcement
        return type !== "system_announcement";
      });

      const count = await getUnreadCount();

      // Only user-specific notification counted
      expect(count).toBe(1);
    });

    it("should return 0 when all notifications are filtered out", async () => {
      // Return only tenant-wide notifications
      mockDb.limit.mockResolvedValue([mockNotifications[1]]);
      vi.mocked(isInAppEnabled).mockResolvedValue(false);

      const count = await getUnreadCount();

      expect(count).toBe(0);
    });
  });

  describe("preference isolation", () => {
    it("should check preferences for correct user", async () => {
      await getNotifications();

      // isInAppEnabled should be called with the current user's ID
      const calls = vi.mocked(isInAppEnabled).mock.calls;
      for (const call of calls) {
        expect(call[0]).toBe(mockUser.id);
      }
    });

    it("should include all tenant-wide when no user context", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await getNotifications();

      // All notifications should be included when no user
      expect(result.notifications.length).toBe(3);
      // isInAppEnabled should not be called
      expect(isInAppEnabled).not.toHaveBeenCalled();
    });
  });
});

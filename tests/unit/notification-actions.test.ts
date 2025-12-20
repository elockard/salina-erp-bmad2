/**
 * Unit tests for notification actions
 * Story 20.2: Build Notifications Center
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/auth", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
  getCurrentTenantId: vi.fn(() => Promise.resolve("tenant-123")),
  getCurrentUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", email: "test@example.com" }),
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db/schema/notifications", () => ({
  notifications: {
    id: "id",
    tenantId: "tenantId",
    userId: "userId",
    type: "type",
    title: "title",
    description: "description",
    link: "link",
    metadata: "metadata",
    readAt: "readAt",
    createdAt: "createdAt",
  },
}));

vi.mock("@/modules/notifications/queries", () => ({
  getNotifications: vi.fn(() =>
    Promise.resolve({
      notifications: [
        {
          id: "1",
          tenantId: "tenant-123",
          type: "feed_success",
          title: "Test",
          isRead: false,
        },
      ],
      unreadCount: 1,
      totalCount: 1,
    }),
  ),
  getUnreadCount: vi.fn(() => Promise.resolve(1)),
}));

import {
  fetchNotifications,
  fetchUnreadCount,
} from "@/modules/notifications/actions";

describe("notification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchNotifications", () => {
    it("should return notifications on success", async () => {
      const result = await fetchNotifications();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifications).toHaveLength(1);
        expect(result.data.unreadCount).toBe(1);
      }
    });
  });

  describe("fetchUnreadCount", () => {
    it("should return unread count on success", async () => {
      const result = await fetchUnreadCount();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }
    });
  });
});

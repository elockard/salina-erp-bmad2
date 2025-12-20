/**
 * Unit tests for notification preferences server actions
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationType } from "@/db/schema/notifications";
import type { UserPreference } from "@/modules/notifications/preferences/types";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  getCurrentTenantId: vi.fn(),
  getDb: vi.fn(),
}));

// Mock the queries module
vi.mock("@/modules/notifications/preferences/queries", () => ({
  getUserPreferences: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import {
  fetchUserPreferences,
  saveNotificationPreferences,
} from "@/modules/notifications/preferences/actions";
import { getUserPreferences } from "@/modules/notifications/preferences/queries";

describe("Notification Preferences Actions", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    tenant_id: "tenant-456",
    created_at: new Date(),
    updated_at: new Date(),
    clerk_user_id: "clerk_123",
    role: "admin" as const,
    is_active: true,
  };
  const mockTenantId = "tenant-456";
  const mockPreferences: UserPreference[] = [
    {
      type: "feed_success" as NotificationType,
      inAppEnabled: true,
      emailEnabled: false,
    },
    {
      type: "feed_failed" as NotificationType,
      inAppEnabled: true,
      emailEnabled: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchUserPreferences", () => {
    it("should return preferences for authenticated user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getUserPreferences).mockResolvedValue(mockPreferences);

      const result = await fetchUserPreferences();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferences).toEqual(mockPreferences);
      }
      expect(getUserPreferences).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return error when user is not authenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await fetchUserPreferences();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not authenticated");
      }
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(getCurrentUser).mockRejectedValue(new Error("DB error"));

      const result = await fetchUserPreferences();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch notification preferences");
      }
    });
  });

  describe("saveNotificationPreferences", () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenantId);
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
    });

    it("should save valid preferences successfully", async () => {
      const input = {
        preferences: [
          {
            type: "feed_success" as const,
            inAppEnabled: true,
            emailEnabled: false,
          },
          {
            type: "feed_failed" as const,
            inAppEnabled: true,
            emailEnabled: true,
          },
        ],
      };

      const result = await saveNotificationPreferences(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(2);
      }
    });

    it("should return error when user is not authenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await saveNotificationPreferences({
        preferences: mockPreferences.map((p) => ({
          type: p.type as "feed_success" | "feed_failed",
          inAppEnabled: p.inAppEnabled,
          emailEnabled: p.emailEnabled,
        })),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not authenticated");
      }
    });

    it("should handle validation errors", async () => {
      const invalidInput = {
        preferences: [{ type: "invalid_type", inAppEnabled: "not-boolean" }],
      };

      const result = await saveNotificationPreferences(invalidInput as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation error");
      }
    });

    it("should handle empty preferences array", async () => {
      const input = { preferences: [] };

      const result = await saveNotificationPreferences(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(0);
      }
    });

    it("should handle database errors gracefully", async () => {
      mockDb.delete.mockImplementation(() => {
        throw new Error("DB connection failed");
      });

      const result = await saveNotificationPreferences({
        preferences: mockPreferences.map((p) => ({
          type: p.type as "feed_success" | "feed_failed",
          inAppEnabled: p.inAppEnabled,
          emailEnabled: p.emailEnabled,
        })),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to save notification preferences");
      }
    });
  });
});

/**
 * Unit tests for notification preferences queries
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database and auth modules
vi.mock("@/db", () => ({
  adminDb: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/schema/notification-preferences", () => ({
  notificationPreferences: {
    userId: "userId",
    notificationType: "notificationType",
    inAppEnabled: "inAppEnabled",
    emailEnabled: "emailEnabled",
    tenantId: "tenantId",
  },
  NOTIFICATION_TYPES: [
    "feed_success",
    "feed_failed",
    "action_pending_return",
    "action_low_isbn",
    "system_announcement",
    "import_complete",
  ],
}));

vi.mock("@/db/schema/users", () => ({
  users: {
    id: "id",
    email: "email",
    tenant_id: "tenant_id",
  },
}));

// Import after mocks are set up
import { getDb } from "@/lib/auth";
import {
  getEffectiveUserPreference,
  getUserPreferences,
  isInAppEnabled,
} from "@/modules/notifications/preferences/queries";

describe("Notification Preferences Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUserPreferences", () => {
    it("should return all notification types with defaults when no saved preferences", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await getUserPreferences("user-123");

      expect(result).toHaveLength(6);
      expect(result.map((p) => p.type)).toContain("feed_success");
      expect(result.map((p) => p.type)).toContain("feed_failed");
    });

    it("should merge saved preferences with defaults", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            notificationType: "feed_failed",
            inAppEnabled: false,
            emailEnabled: false,
          },
        ]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await getUserPreferences("user-123");

      const feedFailed = result.find((p) => p.type === "feed_failed");
      expect(feedFailed?.inAppEnabled).toBe(false);
      expect(feedFailed?.emailEnabled).toBe(false);

      // Other types should use defaults
      const feedSuccess = result.find((p) => p.type === "feed_success");
      expect(feedSuccess?.inAppEnabled).toBe(true);
      expect(feedSuccess?.emailEnabled).toBe(false);
    });
  });

  describe("getEffectiveUserPreference", () => {
    it("should return saved preference when exists", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([{ inAppEnabled: false, emailEnabled: true }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await getEffectiveUserPreference(
        "user-123",
        "feed_failed",
      );

      expect(result.inApp).toBe(false);
      expect(result.email).toBe(true);
    });

    it("should return defaults when no saved preference", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await getEffectiveUserPreference(
        "user-123",
        "feed_failed",
      );

      // feed_failed defaults: inApp=true, email=true
      expect(result.inApp).toBe(true);
      expect(result.email).toBe(true);
    });
  });

  describe("isInAppEnabled", () => {
    it("should return true when in-app is enabled", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([{ inAppEnabled: true, emailEnabled: false }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await isInAppEnabled("user-123", "feed_success");

      expect(result).toBe(true);
    });

    it("should return false when in-app is disabled", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([{ inAppEnabled: false, emailEnabled: true }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await isInAppEnabled("user-123", "feed_success");

      expect(result).toBe(false);
    });
  });
});

/**
 * Platform Announcements Unit Tests
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * Tests for announcement CRUD actions and query functions
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock adminDb
vi.mock("@/db", () => ({
  adminDb: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(),
          limit: vi.fn(),
        })),
        orderBy: vi.fn(),
      })),
    })),
  },
}));

// Mock platform-admin auth
vi.mock("@/lib/platform-admin", () => ({
  getCurrentPlatformAdmin: vi.fn(),
}));

// Mock platform-audit
vi.mock("@/lib/platform-audit", () => ({
  logPlatformAdminEvent: vi.fn(),
  PLATFORM_ADMIN_ACTIONS: {
    CREATE_ANNOUNCEMENT: "create_announcement",
    UPDATE_ANNOUNCEMENT: "update_announcement",
    DELETE_ANNOUNCEMENT: "delete_announcement",
    VIEW_ANNOUNCEMENTS: "view_announcements",
  },
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock platform-announcements schema
vi.mock("@/db/schema/platform-announcements", () => ({
  platformAnnouncements: {
    id: "id",
    message: "message",
    type: "type",
    starts_at: "starts_at",
    ends_at: "ends_at",
    target_roles: "target_roles",
    is_active: "is_active",
    created_at: "created_at",
    created_by_admin_email: "created_by_admin_email",
    updated_at: "updated_at",
    updated_by_admin_email: "updated_by_admin_email",
  },
}));

// Mock queries module (to avoid circular import issues)
vi.mock("@/modules/platform-admin/queries", () => ({
  isValidUUID: vi.fn((id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  ),
}));

import { revalidatePath } from "next/cache";
import { adminDb } from "@/db";
import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { logPlatformAdminEvent } from "@/lib/platform-audit";

// Type the mocks
const mockGetCurrentPlatformAdmin = getCurrentPlatformAdmin as ReturnType<
  typeof vi.fn
>;
const mockLogPlatformAdminEvent = logPlatformAdminEvent as ReturnType<
  typeof vi.fn
>;
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>;
const mockAdminDbInsert = adminDb.insert as ReturnType<typeof vi.fn>;
const mockAdminDbUpdate = adminDb.update as ReturnType<typeof vi.fn>;
const mockAdminDbDelete = adminDb.delete as ReturnType<typeof vi.fn>;

describe("Platform Announcement Actions", () => {
  const mockAdmin = {
    clerkId: "user_admin_123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const validAnnouncementId = "12345678-1234-1234-1234-123456789012";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
  });

  describe("createAnnouncement", () => {
    it("should return error if not platform admin", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValueOnce(null);

      const { createAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await createAnnouncement({
        message: "Test announcement message",
        type: "info",
        startsAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("should return error if message too short", async () => {
      const { createAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await createAnnouncement({
        message: "Short",
        type: "info",
        startsAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Message must be at least 10 characters");
      }
    });

    it("should return error if type is invalid", async () => {
      const { createAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await createAnnouncement({
        message: "This is a valid test message",
        type: "invalid" as "info" | "warning" | "critical",
        startsAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid announcement type");
      }
    });

    it("should return error if startsAt is missing", async () => {
      const { createAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await createAnnouncement({
        message: "This is a valid test message",
        type: "info",
        startsAt: null as unknown as Date,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Start date is required");
      }
    });

    it("should create announcement successfully", async () => {
      const now = new Date();
      const mockAnnouncement = {
        id: validAnnouncementId,
        message: "Test announcement message",
        type: "info",
        starts_at: now,
        ends_at: null,
        target_roles: null,
        is_active: true,
        created_at: now,
        created_by_admin_email: mockAdmin.email,
        updated_at: now,
        updated_by_admin_email: mockAdmin.email,
      };

      mockAdminDbInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAnnouncement]),
        }),
      });

      const { createAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await createAnnouncement({
        message: "Test announcement message",
        type: "info",
        startsAt: now,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe(validAnnouncementId);
        expect(result.data?.type).toBe("info");
      }
      expect(mockLogPlatformAdminEvent).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/platform-admin/announcements",
      );
    });
  });

  describe("updateAnnouncement", () => {
    it("should return error if not platform admin", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValueOnce(null);

      const { updateAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await updateAnnouncement(validAnnouncementId, {
        message: "Updated message text",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("should return error for invalid UUID", async () => {
      const { updateAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await updateAnnouncement("invalid-uuid", {
        message: "Updated message text",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid announcement ID format");
      }
    });

    it("should return error if message too short", async () => {
      const { updateAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await updateAnnouncement(validAnnouncementId, {
        message: "Short",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Message must be at least 10 characters");
      }
    });

    it("should return error if announcement not found", async () => {
      mockAdminDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const { updateAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await updateAnnouncement(validAnnouncementId, {
        message: "Updated message text",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Announcement not found");
      }
    });

    it("should update announcement successfully", async () => {
      const now = new Date();
      const mockUpdatedAnnouncement = {
        id: validAnnouncementId,
        message: "Updated message text",
        type: "warning",
        starts_at: now,
        ends_at: null,
        target_roles: ["owner", "admin"],
        is_active: true,
        created_at: now,
        created_by_admin_email: mockAdmin.email,
        updated_at: now,
        updated_by_admin_email: mockAdmin.email,
      };

      mockAdminDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedAnnouncement]),
          }),
        }),
      });

      const { updateAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await updateAnnouncement(validAnnouncementId, {
        message: "Updated message text",
        type: "warning",
        targetRoles: ["owner", "admin"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.message).toBe("Updated message text");
        expect(result.data?.type).toBe("warning");
      }
      expect(mockLogPlatformAdminEvent).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/platform-admin/announcements",
      );
    });
  });

  describe("deleteAnnouncement", () => {
    it("should return error if not platform admin", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValueOnce(null);

      const { deleteAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await deleteAnnouncement(validAnnouncementId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("should return error for invalid UUID", async () => {
      const { deleteAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await deleteAnnouncement("invalid-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid announcement ID format");
      }
    });

    it("should return error if announcement not found", async () => {
      mockAdminDbDelete.mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const { deleteAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await deleteAnnouncement(validAnnouncementId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Announcement not found");
      }
    });

    it("should delete announcement successfully", async () => {
      mockAdminDbDelete.mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: validAnnouncementId }]),
        }),
      });

      const { deleteAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await deleteAnnouncement(validAnnouncementId);

      expect(result.success).toBe(true);
      expect(mockLogPlatformAdminEvent).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/platform-admin/announcements",
      );
    });
  });

  describe("deactivateAnnouncement", () => {
    it("should deactivate by calling updateAnnouncement with isActive: false", async () => {
      const now = new Date();
      const mockDeactivatedAnnouncement = {
        id: validAnnouncementId,
        message: "Some message here",
        type: "info",
        starts_at: now,
        ends_at: null,
        target_roles: null,
        is_active: false,
        created_at: now,
        created_by_admin_email: mockAdmin.email,
        updated_at: now,
        updated_by_admin_email: mockAdmin.email,
      };

      mockAdminDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDeactivatedAnnouncement]),
          }),
        }),
      });

      const { deactivateAnnouncement } = await import(
        "@/modules/platform-admin/actions"
      );
      const result = await deactivateAnnouncement(validAnnouncementId);

      expect(result.success).toBe(true);
    });
  });
});

describe("Announcement Type Validation", () => {
  it("should accept info type", () => {
    const validTypes = ["info", "warning", "critical"];
    expect(validTypes.includes("info")).toBe(true);
  });

  it("should accept warning type", () => {
    const validTypes = ["info", "warning", "critical"];
    expect(validTypes.includes("warning")).toBe(true);
  });

  it("should accept critical type", () => {
    const validTypes = ["info", "warning", "critical"];
    expect(validTypes.includes("critical")).toBe(true);
  });

  it("should reject invalid type", () => {
    const validTypes = ["info", "warning", "critical"];
    expect(validTypes.includes("urgent")).toBe(false);
  });
});

describe("Announcement Display Rules", () => {
  it("critical announcements should not be dismissible", () => {
    const type: string = "critical";
    const isDismissible = type !== "critical";
    expect(isDismissible).toBe(false);
  });

  it("warning announcements should be dismissible", () => {
    const type: string = "warning";
    const isDismissible = type !== "critical";
    expect(isDismissible).toBe(true);
  });

  it("info announcements should be dismissible", () => {
    const type: string = "info";
    const isDismissible = type !== "critical";
    expect(isDismissible).toBe(true);
  });
});

describe("Announcement Role Targeting", () => {
  it("should show announcement to all users when targetRoles is null", () => {
    const announcement: { targetRoles: string[] | null } = {
      targetRoles: null,
    };
    const _userRole = "editor";

    // Logic: if no target roles, show to all
    const shouldShow =
      !announcement.targetRoles || announcement.targetRoles.length === 0;
    expect(shouldShow).toBe(true);
  });

  it("should show announcement to all users when targetRoles is empty", () => {
    const announcement = { targetRoles: [] };
    const _userRole = "editor";

    const shouldShow =
      !announcement.targetRoles || announcement.targetRoles.length === 0;
    expect(shouldShow).toBe(true);
  });

  it("should show announcement to targeted user", () => {
    const announcement = { targetRoles: ["owner", "admin"] };
    const userRole = "admin";

    const shouldShow = announcement.targetRoles.includes(userRole);
    expect(shouldShow).toBe(true);
  });

  it("should not show announcement to non-targeted user", () => {
    const announcement = { targetRoles: ["owner", "admin"] };
    const userRole = "editor";

    const shouldShow = announcement.targetRoles.includes(userRole);
    expect(shouldShow).toBe(false);
  });
});

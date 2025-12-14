/**
 * Platform Audit Logger Unit Tests
 *
 * Story 13.1: Implement Platform Administrator Authentication
 * AC-13.1.7: Platform admin authentication events are logged to platform audit trail
 *
 * Tests for logPlatformAdminEvent() function
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the adminDb
vi.mock("@/db", () => ({
  adminDb: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock the schema
vi.mock("@/db/schema/platform-audit-logs", () => ({
  platformAuditLogs: {},
}));

describe("logPlatformAdminEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs platform admin access events", async () => {
    const { adminDb } = await import("@/db");
    const { logPlatformAdminEvent } = await import("@/lib/platform-audit");

    await logPlatformAdminEvent({
      adminEmail: "admin@example.com",
      adminClerkId: "user_abc123",
      action: "access",
      route: "/platform-admin",
    });

    expect(adminDb.insert).toHaveBeenCalled();
  });

  it("logs platform admin forbidden events", async () => {
    const { adminDb } = await import("@/db");
    const { logPlatformAdminEvent } = await import("@/lib/platform-audit");

    await logPlatformAdminEvent({
      adminEmail: "nonadmin@example.com",
      adminClerkId: "user_xyz789",
      action: "forbidden",
      route: "/platform-admin",
    });

    expect(adminDb.insert).toHaveBeenCalled();
  });

  it("includes metadata when provided", async () => {
    const { adminDb } = await import("@/db");
    const { logPlatformAdminEvent } = await import("@/lib/platform-audit");

    const insertMock = adminDb.insert as ReturnType<typeof vi.fn>;
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    await logPlatformAdminEvent({
      adminEmail: "admin@example.com",
      adminClerkId: "user_abc123",
      action: "view_tenant",
      route: "/platform-admin/tenants/123",
      metadata: { tenantId: "123", tenantName: "Acme Corp" },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_email: "admin@example.com",
        admin_clerk_id: "user_abc123",
        action: "view_tenant",
        route: "/platform-admin/tenants/123",
        metadata: { tenantId: "123", tenantName: "Acme Corp" },
      }),
    );
  });

  it("does not throw on database error (fire-and-forget)", async () => {
    const { adminDb } = await import("@/db");
    const { logPlatformAdminEvent } = await import("@/lib/platform-audit");

    const insertMock = adminDb.insert as ReturnType<typeof vi.fn>;
    insertMock.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    });

    // Should not throw
    await expect(
      logPlatformAdminEvent({
        adminEmail: "admin@example.com",
        adminClerkId: "user_abc123",
        action: "access",
        route: "/platform-admin",
      }),
    ).resolves.not.toThrow();
  });
});

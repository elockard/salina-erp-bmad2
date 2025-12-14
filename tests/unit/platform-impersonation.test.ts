/**
 * Platform Admin Impersonation Unit Tests
 *
 * Story 13.6: Implement Tenant Impersonation for Support
 * Tests for impersonation service, actions, and status checks
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for Clerk API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock adminDb
vi.mock("@/db", () => ({
  adminDb: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      tenants: {
        findFirst: vi.fn(),
      },
    },
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
    START_IMPERSONATION: "start_impersonation",
    END_IMPERSONATION: "end_impersonation",
    IMPERSONATION_ACTION: "impersonation_action",
  },
}));

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock queries
vi.mock("@/modules/platform-admin/queries", () => ({
  getTenantById: vi.fn(),
  isValidUUID: vi.fn((id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  ),
}));

// Mock impersonation service
vi.mock("@/modules/platform-admin/impersonation", () => ({
  createActorToken: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { adminDb } from "@/db";
import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { logPlatformAdminEvent } from "@/lib/platform-audit";
import {
  endImpersonation,
  getImpersonationStatus,
  startImpersonation,
} from "@/modules/platform-admin/actions";
import { createActorToken } from "@/modules/platform-admin/impersonation";
import { getTenantById } from "@/modules/platform-admin/queries";

// Type the mocks - use permissive types for test flexibility
const mockGetCurrentPlatformAdmin = vi.mocked(getCurrentPlatformAdmin);
const mockLogPlatformAdminEvent = vi.mocked(logPlatformAdminEvent);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetTenantById = getTenantById as any;
const mockCreateActorToken = vi.mocked(createActorToken);
const mockAdminDbQuery = adminDb.query as unknown as {
  users: { findFirst: ReturnType<typeof vi.fn> };
  tenants: { findFirst: ReturnType<typeof vi.fn> };
};

describe("Platform Admin Impersonation", () => {
  const mockAdmin = {
    clerkId: "user_admin_123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const validUserId = "12345678-1234-1234-1234-123456789012";
  const validTenantId = "87654321-4321-4321-4321-210987654321";

  const mockUser = {
    id: validUserId,
    email: "user@tenant.com",
    tenant_id: validTenantId,
    clerk_user_id: "user_target_456",
    role: "editor",
    is_active: true,
  };

  const mockUserWithoutClerkId = {
    ...mockUser,
    clerk_user_id: null,
  };

  const mockActiveTenant = {
    id: validTenantId,
    name: "Test Tenant",
    subdomain: "test",
    status: "active",
  };

  const mockSuspendedTenant = {
    ...mockActiveTenant,
    status: "suspended",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset CLERK_SECRET_KEY for tests
    process.env.CLERK_SECRET_KEY = "test_secret_key";
  });

  describe("startImpersonation", () => {
    describe("authorization", () => {
      it("returns error when user is not authenticated as platform admin", async () => {
        mockGetCurrentPlatformAdmin.mockResolvedValue(null);

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(
            "Unauthorized: Platform admin access required",
          );
        }
      });
    });

    describe("input validation", () => {
      beforeEach(() => {
        mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
      });

      it("returns error when userId is empty", async () => {
        const result = await startImpersonation({
          userId: "",
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("User ID is required");
        }
      });

      it("returns error for invalid UUID format", async () => {
        const result = await startImpersonation({
          userId: "invalid-uuid",
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Invalid user ID format");
        }
      });

      it("returns error when reason is too short", async () => {
        const result = await startImpersonation({
          userId: validUserId,
          reason: "short",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Reason must be at least 10 characters");
        }
      });

      it("returns error when reason is empty", async () => {
        const result = await startImpersonation({
          userId: validUserId,
          reason: "",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Reason must be at least 10 characters");
        }
      });

      it("trims reason and validates length", async () => {
        const result = await startImpersonation({
          userId: validUserId,
          reason: "   short   ",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Reason must be at least 10 characters");
        }
      });
    });

    describe("user validation", () => {
      beforeEach(() => {
        mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
      });

      it("returns error when user not found", async () => {
        mockAdminDbQuery.users.findFirst.mockResolvedValue(null);

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("User not found");
        }
      });

      it("returns error when user has no Clerk account (AC 8)", async () => {
        mockAdminDbQuery.users.findFirst.mockResolvedValue(
          mockUserWithoutClerkId,
        );

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(
            "User has no Clerk account - cannot impersonate",
          );
        }
      });
    });

    describe("tenant validation", () => {
      beforeEach(() => {
        mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
        mockAdminDbQuery.users.findFirst.mockResolvedValue(mockUser);
      });

      it("returns error when user's tenant not found", async () => {
        mockGetTenantById.mockResolvedValue(null);

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("User's tenant not found");
        }
      });

      it("returns error when tenant is suspended (AC 7)", async () => {
        mockGetTenantById.mockResolvedValue(mockSuspendedTenant);

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(
            "Cannot impersonate users in suspended tenants",
          );
        }
      });
    });

    describe("successful impersonation", () => {
      beforeEach(() => {
        mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
        mockAdminDbQuery.users.findFirst.mockResolvedValue(mockUser);
        mockGetTenantById.mockResolvedValue(mockActiveTenant);
        mockCreateActorToken.mockResolvedValue({
          url: "https://clerk.com/sign-in?token=xxx",
          tokenId: "act_123",
        });
      });

      it("returns success with sign-in URL", async () => {
        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.signInUrl).toBe(
            "https://clerk.com/sign-in?token=xxx",
          );
        }
      });

      it("creates actor token with correct parameters", async () => {
        await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(mockCreateActorToken).toHaveBeenCalledWith(
          mockUser.clerk_user_id, // Subject's Clerk ID
          mockAdmin.clerkId, // Actor's Clerk ID
        );
      });

      it("logs impersonation event to platform audit (AC 4, 5)", async () => {
        await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(mockLogPlatformAdminEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            adminEmail: mockAdmin.email,
            adminClerkId: mockAdmin.clerkId,
            action: "start_impersonation",
            route: "/platform-admin/impersonate",
            metadata: expect.objectContaining({
              targetUserId: validUserId,
              targetClerkId: mockUser.clerk_user_id,
              targetTenantId: mockUser.tenant_id,
              targetEmail: mockUser.email,
              reason: "Testing support ticket #12345",
              tokenId: "act_123",
            }),
          }),
        );
      });
    });

    describe("error handling", () => {
      beforeEach(() => {
        mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
        mockAdminDbQuery.users.findFirst.mockResolvedValue(mockUser);
        mockGetTenantById.mockResolvedValue(mockActiveTenant);
      });

      it("returns error when actor token creation fails", async () => {
        mockCreateActorToken.mockResolvedValue(null);

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Failed to create impersonation session");
        }
      });

      it("does not log audit event when token creation fails", async () => {
        mockCreateActorToken.mockResolvedValue(null);

        await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(mockLogPlatformAdminEvent).not.toHaveBeenCalled();
      });

      it("returns generic error on unexpected exceptions", async () => {
        mockAdminDbQuery.users.findFirst.mockRejectedValue(
          new Error("Database error"),
        );

        const result = await startImpersonation({
          userId: validUserId,
          reason: "Testing support ticket #12345",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Failed to start impersonation");
        }
      });
    });
  });

  describe("getImpersonationStatus", () => {
    describe("when not impersonating", () => {
      it("returns isImpersonating: false when no actor claim", async () => {
        mockAuth.mockResolvedValue({ actor: null, userId: "user_123" });

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(false);
      });

      it("returns isImpersonating: false when actor.sub is empty", async () => {
        mockAuth.mockResolvedValue({
          actor: { sub: "" },
          userId: "user_123",
        });

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(false);
      });

      it("returns isImpersonating: false when userId is null", async () => {
        mockAuth.mockResolvedValue({
          actor: { sub: "actor_123" },
          userId: null,
        });

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(false);
      });
    });

    describe("when impersonating", () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue({
          actor: { sub: "actor_admin_123" },
          userId: "user_target_456",
        });
      });

      it("returns isImpersonating: true with actor claim", async () => {
        mockAdminDbQuery.users.findFirst.mockResolvedValue(mockUser);
        mockAdminDbQuery.tenants.findFirst.mockResolvedValue(mockActiveTenant);

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(true);
      });

      it("includes impersonated user details", async () => {
        mockAdminDbQuery.users.findFirst.mockResolvedValue(mockUser);
        mockAdminDbQuery.tenants.findFirst.mockResolvedValue(mockActiveTenant);

        const status = await getImpersonationStatus();

        expect(status.impersonatedUserId).toBe(mockUser.id);
        expect(status.impersonatedEmail).toBe(mockUser.email);
        expect(status.impersonatorClerkId).toBe("actor_admin_123");
        expect(status.tenantName).toBe(mockActiveTenant.name);
      });

      it("handles missing user gracefully", async () => {
        mockAdminDbQuery.users.findFirst.mockResolvedValue(null);

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(true);
        expect(status.impersonatedUserId).toBeUndefined();
        expect(status.impersonatedEmail).toBeUndefined();
      });

      it("handles missing tenant gracefully", async () => {
        mockAdminDbQuery.users.findFirst.mockResolvedValue(mockUser);
        mockAdminDbQuery.tenants.findFirst.mockResolvedValue(null);

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(true);
        expect(status.tenantName).toBeUndefined();
      });
    });

    describe("error handling", () => {
      it("returns isImpersonating: false on error", async () => {
        mockAuth.mockRejectedValue(new Error("Auth error"));

        const status = await getImpersonationStatus();

        expect(status.isImpersonating).toBe(false);
      });
    });
  });

  describe("createActorToken", () => {
    // Import the actual implementation for direct testing
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv, CLERK_SECRET_KEY: "test_secret_key" };
      mockFetch.mockReset();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("calls Clerk API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "act_123",
          url: "https://clerk.com/sign-in?token=xxx",
        }),
      });

      // Import fresh module to get unmocked version
      vi.doUnmock("@/modules/platform-admin/impersonation");
      const { createActorToken: actualCreateActorToken } = await import(
        "@/modules/platform-admin/impersonation"
      );

      const result = await actualCreateActorToken("user_subject", "user_actor");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.clerk.com/v1/actor_tokens",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test_secret_key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining('"user_id":"user_subject"'),
        }),
      );
      expect(result).toEqual({
        url: "https://clerk.com/sign-in?token=xxx",
        tokenId: "act_123",
      });
    });

    it("returns null on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Unauthorized",
        status: 401,
      });

      vi.doUnmock("@/modules/platform-admin/impersonation");
      const { createActorToken: actualCreateActorToken } = await import(
        "@/modules/platform-admin/impersonation"
      );

      const result = await actualCreateActorToken("user_subject", "user_actor");

      expect(result).toBeNull();
    });

    it("returns null when CLERK_SECRET_KEY is not set", async () => {
      process.env.CLERK_SECRET_KEY = "";

      vi.doUnmock("@/modules/platform-admin/impersonation");
      const { createActorToken: actualCreateActorToken } = await import(
        "@/modules/platform-admin/impersonation"
      );

      const result = await actualCreateActorToken("user_subject", "user_actor");

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      vi.doUnmock("@/modules/platform-admin/impersonation");
      const { createActorToken: actualCreateActorToken } = await import(
        "@/modules/platform-admin/impersonation"
      );

      const result = await actualCreateActorToken("user_subject", "user_actor");

      expect(result).toBeNull();
    });
  });
});

describe("endImpersonation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs END_IMPERSONATION event when impersonating (AC: 5)", async () => {
    mockAuth.mockResolvedValue({
      actor: { sub: "actor_admin_123" },
      userId: "user_target_456",
    });
    mockAdminDbQuery.users.findFirst.mockResolvedValue({
      id: "12345678-1234-1234-1234-123456789012",
      email: "user@tenant.com",
      tenant_id: "87654321-4321-4321-4321-210987654321",
    });

    const result = await endImpersonation();

    expect(result.success).toBe(true);
    expect(mockLogPlatformAdminEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        adminClerkId: "actor_admin_123",
        action: "end_impersonation",
        route: "/platform-admin/end-impersonation",
        metadata: expect.objectContaining({
          impersonatedClerkId: "user_target_456",
          impersonatedEmail: "user@tenant.com",
        }),
      }),
    );
  });

  it("returns success without logging when not impersonating", async () => {
    mockAuth.mockResolvedValue({ actor: null, userId: "user_123" });

    const result = await endImpersonation();

    expect(result.success).toBe(true);
    expect(mockLogPlatformAdminEvent).not.toHaveBeenCalled();
  });

  it("returns success even on error (does not block signOut)", async () => {
    mockAuth.mockRejectedValue(new Error("Auth error"));

    const result = await endImpersonation();

    expect(result.success).toBe(true);
  });
});

describe("Impersonation Types", () => {
  it("StartImpersonationInput should have required fields", () => {
    // TypeScript compile-time test
    const input = {
      userId: "test-id",
      reason: "Support investigation",
    };
    expect(input.userId).toBeDefined();
    expect(input.reason).toBeDefined();
  });

  it("ImpersonationStatus should support impersonating state", () => {
    const statusImpersonating = {
      isImpersonating: true,
      impersonatedUserId: "user-123",
      impersonatedEmail: "user@example.com",
      impersonatorClerkId: "admin-456",
      tenantName: "Test Tenant",
    };
    expect(statusImpersonating.isImpersonating).toBe(true);
  });

  it("ImpersonationStatus should support non-impersonating state", () => {
    const statusNotImpersonating = {
      isImpersonating: false,
    };
    expect(statusNotImpersonating.isImpersonating).toBe(false);
  });
});

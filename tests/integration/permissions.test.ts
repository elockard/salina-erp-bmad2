import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";
import type { ActionResult } from "@/lib/types";

// Unmock @/lib/auth to test the real implementation
// The global setup.ts mocks it for integration tests, but this test
// needs to test the actual auth module behavior with mocked dependencies
vi.unmock("@/lib/auth");

import { requirePermission } from "@/lib/auth";

// Mock dependencies
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/db", () => ({
  getAuthenticatedDb: vi.fn(),
}));

// Import mocked modules for typing
import { currentUser as mockCurrentUser } from "@clerk/nextjs/server";
import { headers as mockHeaders } from "next/headers";
import { getAuthenticatedDb as mockGetAuthenticatedDb } from "@/db";

/**
 * Options for setupAuthMocks helper
 */
interface SetupAuthMocksOptions {
  /** If true, omits the x-tenant-id header to test missing tenant scenarios */
  missingTenantId?: boolean;
}

/**
 * Helper to setup auth mocks for a given user
 * Reduces repetitive mock setup across tests
 */
function setupAuthMocks(user: User | null, options: SetupAuthMocksOptions = {}) {
  if (user) {
    (mockCurrentUser as Mock).mockResolvedValue({
      id: user.clerk_user_id,
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") {
          return options.missingTenantId ? null : user.tenant_id;
        }
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(user),
        },
      },
    });
  } else {
    (mockCurrentUser as Mock).mockResolvedValue(null);
  }
}

/**
 * Example Server Action with permission check
 * Simulates a protected operation that requires owner or admin role
 */
async function protectedAction(data: string): Promise<ActionResult<string>> {
  try {
    // Permission check BEFORE business logic
    await requirePermission(["owner", "admin"]);

    // Business logic (only executed if permission check passes)
    return {
      success: true,
      data: `Protected operation completed: ${data}`,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to perform this action",
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

describe("Permission Enforcement in Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows authorized user (owner) to execute action", async () => {
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "owner@example.com",
      role: "owner",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockUser);

    const result = await protectedAction("test data");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Protected operation completed: test data");
    }
  });

  it("allows authorized user (admin) to execute action", async () => {
    const mockUser: User = {
      id: "user-456",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_456",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockUser);

    const result = await protectedAction("test data");

    expect(result.success).toBe(true);
  });

  it("returns 403 error for unauthorized user (editor)", async () => {
    const mockUser: User = {
      id: "user-789",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_789",
      email: "editor@example.com",
      role: "editor",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockUser);

    const result = await protectedAction("test data");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "You don't have permission to perform this action",
      );
    }
  });

  it("returns 403 error for unauthenticated user", async () => {
    setupAuthMocks(null);

    const result = await protectedAction("test data");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "You don't have permission to perform this action",
      );
    }
  });

  it("returns error when tenant-id header is missing", async () => {
    const mockUser: User = {
      id: "user-no-tenant",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "user@example.com",
      role: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Setup with missing tenant-id header
    setupAuthMocks(mockUser, { missingTenantId: true });

    const result = await protectedAction("test data");

    // Missing tenant-id triggers an error (either permission or unexpected)
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns 403 error for inactive user", async () => {
    const mockUser: User = {
      id: "user-inactive",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_inactive",
      email: "inactive@example.com",
      role: "owner",
      is_active: false, // Inactive user should be denied
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockUser);

    const result = await protectedAction("test data");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "You don't have permission to perform this action",
      );
    }
  });

  it("does NOT execute business logic when permission check fails", async () => {
    const mockUser: User = {
      id: "user-789",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_789",
      email: "finance@example.com",
      role: "finance",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockUser);

    const result = await protectedAction("test data");

    // Business logic should NOT have executed
    expect(result.success).toBe(false);
    if (!result.success) {
      // Error message confirms permission check failed BEFORE business logic
      expect(result.error).toBe(
        "You don't have permission to perform this action",
      );
    }
  });
});

describe("Permission Matrix Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces MANAGE_USERS permission (owner, admin only)", async () => {
    const mockOwner: User = {
      id: "user-owner",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_owner",
      email: "owner@example.com",
      role: "owner",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockOwner);

    // Owner should be able to execute
    await expect(
      requirePermission(["owner", "admin"]),
    ).resolves.toBeUndefined();
  });

  it("denies MANAGE_USERS permission for editor", async () => {
    const mockEditor: User = {
      id: "user-editor",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_editor",
      email: "editor@example.com",
      role: "editor",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupAuthMocks(mockEditor);

    // Editor should be denied
    await expect(requirePermission(["owner", "admin"])).rejects.toThrow(
      "UNAUTHORIZED",
    );
  });
});

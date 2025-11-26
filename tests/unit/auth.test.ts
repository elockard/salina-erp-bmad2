import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";
import { getCurrentUser, hasPermission, requirePermission } from "@/lib/auth";

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

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user object when authenticated and found in database", async () => {
    // Mock Clerk authentication
    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    });

    // Mock headers
    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    // Mock database query
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "test@example.com",
      role: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    const result = await getCurrentUser();
    expect(result).toEqual(mockUser);
    expect(result?.role).toBe("admin");
  });

  it("returns null when user is not authenticated", async () => {
    (mockCurrentUser as Mock).mockResolvedValue(null);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns null when user not found in database", async () => {
    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_456",
      emailAddresses: [{ emailAddress: "notfound@example.com" }],
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});

describe("hasPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when user has one of the allowed roles", async () => {
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    const result = await hasPermission(["owner", "admin"]);
    expect(result).toBe(true);
  });

  it("returns false when user role is not in allowed roles", async () => {
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "editor@example.com",
      role: "editor",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    const result = await hasPermission(["owner", "admin"]);
    expect(result).toBe(false);
  });

  it("returns false when user is not authenticated", async () => {
    (mockCurrentUser as Mock).mockResolvedValue(null);

    const result = await hasPermission(["owner", "admin"]);
    expect(result).toBe(false);
  });

  it("returns false when user is inactive", async () => {
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "inactive@example.com",
      role: "admin",
      is_active: false, // Inactive user
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    const result = await hasPermission(["owner", "admin"]);
    expect(result).toBe(false);
  });

  it("returns false when allowed roles array is empty", async () => {
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    const result = await hasPermission([]);
    expect(result).toBe(false);
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw error when user has permission", async () => {
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

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    await expect(
      requirePermission(["owner", "admin"]),
    ).resolves.toBeUndefined();
  });

  it('throws error with message "UNAUTHORIZED" when user lacks permission', async () => {
    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "editor@example.com",
      role: "editor",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    await expect(requirePermission(["owner", "admin"])).rejects.toThrow(
      "UNAUTHORIZED",
    );
  });

  it('throws error with message "UNAUTHORIZED" when user is not authenticated', async () => {
    (mockCurrentUser as Mock).mockResolvedValue(null);

    await expect(requirePermission(["owner", "admin"])).rejects.toThrow(
      "UNAUTHORIZED",
    );
  });

  it("logs permission denial with user context when permission check fails", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // No-op
    });

    const mockUser: User = {
      id: "user-123",
      tenant_id: "tenant-123",
      clerk_user_id: "clerk_123",
      email: "finance@example.com",
      role: "finance",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (mockCurrentUser as Mock).mockResolvedValue({
      id: "clerk_123",
    });

    (mockHeaders as Mock).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-tenant-id") return "tenant-123";
        if (key === "x-clerk-jwt") return "mock-jwt-token";
        return null;
      }),
    });

    (mockGetAuthenticatedDb as Mock).mockResolvedValue({
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
        },
      },
    });

    await expect(requirePermission(["owner", "admin"])).rejects.toThrow(
      "UNAUTHORIZED",
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Permission denied",
      expect.objectContaining({
        userId: "user-123",
        role: "finance",
        isActive: true,
        allowedRoles: ["owner", "admin"],
      }),
    );

    consoleWarnSpy.mockRestore();
  });
});

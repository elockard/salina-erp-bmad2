import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  deactivateUser,
  getUsers,
  inviteUser,
  reactivateUser,
  updateUserRole,
} from "@/modules/users/actions";

// Create shared mock instances using vi.hoisted so they're the same across all calls
const mockFindMany = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockTenantsFindFirst = vi.hoisted(() => vi.fn());
const mockSelectResult = vi.hoisted(() => vi.fn());
const mockFromResult = vi.hoisted(() => vi.fn());
const mockWhereResult = vi.hoisted(() => vi.fn());
const mockReturning = vi.hoisted(() => vi.fn());
const mockValues = vi.hoisted(() => vi.fn(() => ({ returning: mockReturning })));
const mockInsert = vi.hoisted(() => vi.fn(() => ({ values: mockValues })));
const mockSetResult = vi.hoisted(() => vi.fn());
const mockUpdateWhere = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockRequirePermission = vi.hoisted(() => vi.fn());
const mockGetCurrentTenantId = vi.hoisted(() =>
  vi.fn(() => Promise.resolve("test-tenant-id")),
);
const mockGetCurrentUser = vi.hoisted(() => vi.fn());

// Setup the chainable mock structure
mockSelectResult.mockReturnValue({
  from: mockFromResult,
});
mockFromResult.mockReturnValue({
  where: mockWhereResult,
});
// Default to returning count of 0
mockWhereResult.mockResolvedValue([{ count: 0 }]);

mockUpdate.mockReturnValue({
  set: mockSetResult,
});
mockSetResult.mockReturnValue({
  where: mockUpdateWhere,
});
mockUpdateWhere.mockReturnValue({
  returning: mockReturning,
});

// Create shared db instance
const mockDbInstance = vi.hoisted(() => ({
  query: {
    users: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
    },
    tenants: {
      findFirst: mockTenantsFindFirst,
    },
  },
  select: mockSelectResult,
  insert: mockInsert,
  update: mockUpdate,
}));

// Mock dependencies with shared instances
vi.mock("@/lib/auth", () => ({
  requirePermission: mockRequirePermission,
  getCurrentTenantId: mockGetCurrentTenantId,
  getCurrentUser: mockGetCurrentUser,
  getDb: vi.fn(() => Promise.resolve(mockDbInstance)),
}));

vi.mock("@/db/schema/users", () => ({
  users: {
    id: "id",
    tenant_id: "tenant_id",
    email: "email",
    role: "role",
    is_active: "is_active",
    created_at: "created_at",
  },
}));

vi.mock("@/db/schema/tenants", () => ({
  tenants: {
    id: "id",
    subdomain: "subdomain",
  },
}));

// Mock Clerk client for invitation tests
const mockCreateInvitation = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(() =>
    Promise.resolve({
      invitations: {
        createInvitation: mockCreateInvitation,
      },
    }),
  ),
}));

// Don't mock drizzle-orm as it breaks the schema imports
// The db mock handles the query results directly

/**
 * Integration tests for user management Server Actions
 * Tests require authenticated session context and database access
 */

describe("User Management Actions", () => {
  const mockUser = {
    id: "user-1",
    tenant_id: "test-tenant-id",
    clerk_user_id: "clerk_123",
    email: "editor@example.com",
    role: "editor",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockOwnerUser = {
    id: "user-owner",
    tenant_id: "test-tenant-id",
    clerk_user_id: "clerk_owner",
    email: "owner@example.com",
    role: "owner",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCurrentUser = {
    id: "user-current",
    tenant_id: "test-tenant-id",
    clerk_user_id: "clerk_current",
    email: "current@example.com",
    role: "admin",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(mockCurrentUser);
    mockFindMany.mockResolvedValue([]);
    mockWhereResult.mockResolvedValue([{ count: 0 }]);
    // Reset Clerk invitation mock to prevent state leakage between tests
    mockCreateInvitation.mockResolvedValue({ id: "default-invitation" });
  });

  describe("getUsers", () => {
    test("returns users for current tenant with pagination", async () => {
      mockFindMany.mockResolvedValue([mockUser]);
      mockWhereResult.mockResolvedValue([{ count: 1 }]);

      const result = await getUsers({ page: 1, pageSize: 20 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.users).toBeInstanceOf(Array);
        expect(result.data.total).toBeGreaterThanOrEqual(0);
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
      // Verify database was queried
      expect(mockFindMany).toHaveBeenCalled();
    });

    test("filters users by role", async () => {
      mockFindMany.mockResolvedValue([mockOwnerUser]);
      mockWhereResult.mockResolvedValue([{ count: 1 }]);

      const result = await getUsers({ roleFilter: "owner" });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.users.forEach((user) => {
          expect(user.role).toBe("owner");
        });
      }
    });

    test("searches users by email", async () => {
      const testUser = { ...mockUser, email: "test@example.com" };
      mockFindMany.mockResolvedValue([testUser]);
      mockWhereResult.mockResolvedValue([{ count: 1 }]);

      const result = await getUsers({ searchQuery: "test@" });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.users.forEach((user) => {
          expect(user.email.toLowerCase()).toContain("test@");
        });
      }
    });
  });

  describe("inviteUser", () => {
    test("creates pending user and sends invitation", async () => {
      const newUser = {
        id: "new-user-id",
        tenant_id: "test-tenant-id",
        clerk_user_id: "",
        email: "newuser@example.com",
        role: "editor",
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockTenant = {
        id: "test-tenant-id",
        subdomain: "testcompany",
      };

      mockFindFirst.mockResolvedValue(null); // No existing user
      mockTenantsFindFirst.mockResolvedValue(mockTenant); // Tenant lookup for redirect URL
      mockCreateInvitation.mockResolvedValue({ id: "invitation-123" }); // Clerk invitation
      mockReturning.mockResolvedValue([newUser]);

      const result = await inviteUser({
        email: "newuser@example.com",
        role: "editor",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("newuser@example.com");
        expect(result.data.role).toBe("editor");
        expect(result.data.is_active).toBe(false);
        expect(result.data.clerk_user_id).toBe("");
      }
      // Verify database insert was called
      expect(mockInsert).toHaveBeenCalled();
    });

    test("rejects duplicate email", async () => {
      // Existing user found
      mockFindFirst.mockResolvedValue(mockUser);

      const result = await inviteUser({
        email: "duplicate@example.com",
        role: "admin",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already exists");
      }
    });

    test("validates email format", async () => {
      const result = await inviteUser({
        email: "invalid-email",
        role: "editor",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("updateUserRole", () => {
    test("updates user role successfully", async () => {
      mockFindFirst.mockResolvedValue(mockUser);
      mockReturning.mockResolvedValue([{ ...mockUser, role: "finance" }]);

      const result = await updateUserRole(mockUser.id, "finance");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("finance");
      }
      // Verify database update was called
      expect(mockUpdate).toHaveBeenCalled();
    });

    test("prevents owner from demoting themselves", async () => {
      // Current user is owner trying to demote themselves
      const ownerAsCurrent = { ...mockOwnerUser };
      mockGetCurrentUser.mockResolvedValue(ownerAsCurrent);
      mockFindFirst.mockResolvedValue(ownerAsCurrent);

      const result = await updateUserRole(ownerAsCurrent.id, "editor");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("cannot remove your own owner role");
      }
    });
  });

  describe("deactivateUser", () => {
    test("deactivates user successfully", async () => {
      mockFindFirst.mockResolvedValue(mockUser);
      mockReturning.mockResolvedValue([{ ...mockUser, is_active: false }]);

      const result = await deactivateUser(mockUser.id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(false);
      }
      // Verify database update was called
      expect(mockUpdate).toHaveBeenCalled();
    });

    test("prevents deactivating self", async () => {
      // Current user tries to deactivate themselves
      mockGetCurrentUser.mockResolvedValue(mockCurrentUser);
      mockFindFirst.mockResolvedValue(mockCurrentUser);

      const result = await deactivateUser(mockCurrentUser.id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("cannot deactivate your own account");
      }
    });
  });

  describe("reactivateUser", () => {
    test("reactivates deactivated user", async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockFindFirst.mockResolvedValue(inactiveUser);
      mockReturning.mockResolvedValue([{ ...inactiveUser, is_active: true }]);

      const result = await reactivateUser(inactiveUser.id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true);
      }
      // Verify database update was called
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

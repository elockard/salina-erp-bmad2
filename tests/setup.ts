import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { config } from "dotenv";
import { afterEach, beforeEach, vi } from "vitest";

// Load environment variables from .env for integration tests
config();

/**
 * User role type
 */
type TestUserRole = "owner" | "admin" | "editor" | "finance" | "author";

/**
 * Test Auth Context
 *
 * Configurable auth state for integration tests.
 * Tests can modify these values to simulate different user roles and tenants.
 */
export const testAuthContext: {
  tenantId: string;
  user: {
    id: string;
    tenant_id: string;
    clerk_user_id: string;
    email: string;
    role: TestUserRole;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  };
} = {
  tenantId: "00000000-0000-0000-0000-000000000001",
  user: {
    id: "00000000-0000-0000-0000-000000000002",
    tenant_id: "00000000-0000-0000-0000-000000000001",
    clerk_user_id: "clerk_test_user_123",
    email: "test@example.com",
    role: "admin",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
};

/**
 * Helper to set test user role
 * @param role - The role to set for the test user
 */
export function setTestUserRole(
  role: "owner" | "admin" | "editor" | "finance" | "author",
): void {
  testAuthContext.user.role = role;
}

/**
 * Helper to set test tenant ID
 * @param tenantId - The tenant ID to use for tests
 */
export function setTestTenantId(tenantId: string): void {
  testAuthContext.tenantId = tenantId;
  testAuthContext.user.tenant_id = tenantId;
}

/**
 * Helper to set custom test user
 * @param user - Partial user object to merge with defaults
 */
export function setTestUser(user: Partial<typeof testAuthContext.user>): void {
  Object.assign(testAuthContext.user, user);
}

/**
 * Reset auth context to defaults
 */
export function resetTestAuthContext(): void {
  testAuthContext.tenantId = "00000000-0000-0000-0000-000000000001";
  testAuthContext.user = {
    id: "00000000-0000-0000-0000-000000000002",
    tenant_id: "00000000-0000-0000-0000-000000000001",
    clerk_user_id: "clerk_test_user_123",
    email: "test@example.com",
    role: "admin",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetTestAuthContext();
});

// Setup global test environment
beforeEach(() => {
  // Environment is already set to test by vitest
});

// Mock Next.js modules that don't work in test environment
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock next/cache for server action revalidation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers for server-side header access
vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: (name: string) => {
      if (name === "x-tenant-id") return testAuthContext.tenantId;
      if (name === "x-clerk-jwt") return "mock-jwt-token";
      return null;
    },
  })),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock Clerk server-side auth
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(() =>
    Promise.resolve({
      id: testAuthContext.user.clerk_user_id,
      emailAddresses: [{ emailAddress: testAuthContext.user.email }],
    }),
  ),
  auth: vi.fn(() => ({
    userId: testAuthContext.user.clerk_user_id,
    sessionId: "test-session-id",
    getToken: vi.fn(() => Promise.resolve("mock-jwt-token")),
  })),
}));

/**
 * Mock @/lib/auth module
 *
 * Provides comprehensive mocking for all auth utility functions.
 * Uses testAuthContext for configurable test state.
 */
vi.mock("@/lib/auth", () => ({
  /**
   * Returns the current test tenant ID
   */
  getCurrentTenantId: vi.fn(() => Promise.resolve(testAuthContext.tenantId)),

  /**
   * Returns the current test user
   */
  getCurrentUser: vi.fn(() => Promise.resolve(testAuthContext.user)),

  /**
   * Checks if user has one of the allowed roles
   */
  checkPermission: vi.fn((allowedRoles: string[]) =>
    Promise.resolve(allowedRoles.includes(testAuthContext.user.role)),
  ),

  /**
   * Checks if user has permission and is active
   */
  hasPermission: vi.fn((allowedRoles: string[]) =>
    Promise.resolve(
      testAuthContext.user.is_active &&
        allowedRoles.includes(testAuthContext.user.role),
    ),
  ),

  /**
   * Requires user to have one of the allowed roles
   * Throws "UNAUTHORIZED" if permission denied
   */
  requirePermission: vi.fn((allowedRoles: string[]) => {
    if (!testAuthContext.user.is_active) {
      return Promise.reject(new Error("UNAUTHORIZED"));
    }
    if (!allowedRoles.includes(testAuthContext.user.role)) {
      return Promise.reject(new Error("UNAUTHORIZED"));
    }
    return Promise.resolve();
  }),

  /**
   * Returns a mock database client
   * Note: For actual database tests, use real DB connection
   */
  getDb: vi.fn(() =>
    Promise.resolve({
      query: {
        users: { findFirst: vi.fn(), findMany: vi.fn() },
        tenants: { findFirst: vi.fn(), findMany: vi.fn() },
        authors: { findFirst: vi.fn(), findMany: vi.fn() },
        titles: { findFirst: vi.fn(), findMany: vi.fn() },
        sales: { findFirst: vi.fn(), findMany: vi.fn() },
        returns: { findFirst: vi.fn(), findMany: vi.fn() },
      },
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(() => Promise.resolve([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }),
  ),
}));

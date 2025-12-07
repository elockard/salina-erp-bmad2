/**
 * ISBN Prefixes Actions Unit Tests
 *
 * Unit tests for ISBN prefix server actions.
 * Story 7.4: Implement Publisher ISBN Prefix System
 *
 * Note: These tests focus on validation and permission errors
 * which can be tested without complex database mocking.
 * Integration tests cover the full create/delete flows.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock modules before importing actions
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(),
  getCurrentUser: vi.fn(),
  getDb: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/isbn-prefixes/queries", () => ({
  checkPrefixExists: vi.fn(),
}));

import { getCurrentTenantId, getCurrentUser, getDb, requirePermission } from "@/lib/auth";
import { checkPrefixExists } from "@/modules/isbn-prefixes/queries";

// Mock data
const mockTenantId = "tenant-123";
const mockUserId = "user-123";
const mockUser = {
  id: mockUserId,
  email: "test@example.com",
  tenant_id: mockTenantId,
  clerk_user_id: "clerk_123",
  role: "admin" as const,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("ISBN Prefixes Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenantId);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(checkPrefixExists).mockResolvedValue(false);
  });

  describe("createIsbnPrefix", () => {
    test("validates prefix must start with 978 or 979", async () => {
      const { createIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      // Story 7.6: Removed type field - ISBNs are unified
      const result = await createIsbnPrefix({
        prefix: "9771234567",
        block_size: 100,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("978 or 979");
      }
    });

    test("validates prefix length", async () => {
      const { createIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      // Story 7.6: Removed type field - ISBNs are unified
      const result = await createIsbnPrefix({
        prefix: "978123", // Too short - needs 7-12 digits
        block_size: 100,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("7-12 digits");
      }
    });

    test("validates prefix contains only digits", async () => {
      const { createIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      // Story 7.6: Removed type field - ISBNs are unified
      const result = await createIsbnPrefix({
        prefix: "978123456X",
        block_size: 100,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("only digits");
      }
    });

    test("returns error when unauthorized", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const { createIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      // Story 7.6: Removed type field - ISBNs are unified
      const result = await createIsbnPrefix({
        prefix: "9781234567",
        block_size: 100,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    test("rejects duplicate prefix", async () => {
      vi.mocked(checkPrefixExists).mockResolvedValue(true);

      const { createIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      // Story 7.6: Removed type field - ISBNs are unified
      const result = await createIsbnPrefix({
        prefix: "9781234567",
        block_size: 100,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already registered");
      }
    });
  });

  describe("deleteIsbnPrefix", () => {
    test("validates UUID format", async () => {
      const { deleteIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      const result = await deleteIsbnPrefix("invalid-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid prefix ID");
      }
    });

    test("returns error when prefix not found", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { deleteIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      const result = await deleteIsbnPrefix("550e8400-e29b-41d4-a716-446655440000");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    test("prevents deletion when ISBNs are assigned", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue({
              id: "550e8400-e29b-41d4-a716-446655440000",
              tenant_id: mockTenantId,
              prefix: "9781234567",
              assigned_count: 5,
              generation_status: "completed",
            }),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { deleteIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      const result = await deleteIsbnPrefix("550e8400-e29b-41d4-a716-446655440000");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("assigned");
      }
    });

    test("prevents deletion during generation", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue({
              id: "550e8400-e29b-41d4-a716-446655440000",
              tenant_id: mockTenantId,
              prefix: "9781234567",
              assigned_count: 0,
              generation_status: "generating",
            }),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { deleteIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      const result = await deleteIsbnPrefix("550e8400-e29b-41d4-a716-446655440000");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("generation");
      }
    });

    test("returns error when unauthorized", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const { deleteIsbnPrefix } = await import("@/modules/isbn-prefixes/actions");

      const result = await deleteIsbnPrefix("550e8400-e29b-41d4-a716-446655440000");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });
  });
});

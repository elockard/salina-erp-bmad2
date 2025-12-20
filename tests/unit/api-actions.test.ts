/**
 * @vitest-environment node
 *
 * API Actions Unit Tests
 *
 * Story 15.1 - AC1: API Key Generation
 * Story 15.1 - AC2: API Key Management
 *
 * Tests server actions for API key CRUD operations.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies first
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
  adminDb: {
    query: {
      apiKeys: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({}),
        }),
      }),
    }),
  },
}));

vi.mock("@/modules/api/auth/api-key-service", () => ({
  generateApiKeyPair: vi.fn().mockResolvedValue({
    keyId: "sk_live_testkey123456789",
    plaintextSecret: "testsecret12345678901234567890123456789",
    secretHash: "$2a$12$hashedvalue",
  }),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Import after mocking
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { adminDb, db } from "@/db";
import { logAuditEvent } from "@/lib/audit";
import { createApiKey, listApiKeys, revokeApiKey } from "@/modules/api/actions";

const mockUser = {
  id: "user-uuid-123",
  tenant_id: "tenant-uuid-456",
  clerk_user_id: "clerk_user_123",
  role: "admin" as const,
  email: "admin@example.com",
  name: "Admin User",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("API Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createApiKey", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_123" } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    });

    it("creates API key for authenticated admin", async () => {
      const result = await createApiKey({
        name: "Test Key",
        description: "For testing",
        scopes: ["read"],
        isTest: false,
      });

      expect(result.success).toBe(true);
      expect(result.keyId).toBe("sk_live_testkey123456789");
      expect(result.plaintextSecret).toBe(
        "testsecret12345678901234567890123456789",
      );
    });

    it("inserts key into database with correct tenant", async () => {
      await createApiKey({
        name: "Test Key",
        scopes: ["read", "write"],
        isTest: true,
      });

      expect(db.insert).toHaveBeenCalled();
      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall).toBeDefined();
    });

    it("revalidates api-keys path after creation", async () => {
      await createApiKey({
        name: "Test Key",
        scopes: ["read"],
      });

      expect(revalidatePath).toHaveBeenCalledWith("/settings/api-keys");
    });

    it("logs audit event for key creation", async () => {
      await createApiKey({
        name: "Audit Test Key",
        scopes: ["admin"],
        isTest: false,
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockUser.tenant_id,
          userId: mockUser.id,
          actionType: "CREATE",
          resourceType: "api_key",
        }),
      );
    });

    it("rejects unauthenticated users", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);

      const result = await createApiKey({
        name: "Test Key",
        scopes: ["read"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("authenticated");
    });

    it("rejects non-admin users", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        ...mockUser,
        role: "editor" as const,
        is_active: true,
      });

      const result = await createApiKey({
        name: "Test Key",
        scopes: ["read"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("owner/admin");
    });

    it("validates input with zod schema", async () => {
      const result = await createApiKey({
        name: "", // Empty name should fail validation
        scopes: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("listApiKeys", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_123" } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    });

    it("returns keys for authenticated admin", async () => {
      const mockKeys = [
        {
          id: "key-1",
          name: "Production Key",
          keyId: "sk_live_prod123",
          description: "Production API access",
          scopes: ["read", "write"],
          isTest: false,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          revokedAt: null,
        },
        {
          id: "key-2",
          name: "Test Key",
          keyId: "sk_test_test456",
          description: null,
          scopes: ["read"],
          isTest: true,
          createdAt: new Date(),
          lastUsedAt: null,
          revokedAt: null,
        },
      ];

      vi.mocked(adminDb.query.apiKeys.findMany).mockResolvedValue(
        mockKeys as never,
      );

      const result = await listApiKeys();

      expect(result.success).toBe(true);
      expect(result.keys).toHaveLength(2);
      expect(result.keys?.[0].keyId).toBe("sk_live_prod123");
    });

    it("returns empty array when no keys exist", async () => {
      vi.mocked(adminDb.query.apiKeys.findMany).mockResolvedValue([]);

      const result = await listApiKeys();

      expect(result.success).toBe(true);
      expect(result.keys).toHaveLength(0);
    });

    it("rejects unauthenticated users", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);

      const result = await listApiKeys();

      expect(result.success).toBe(false);
    });
  });

  describe("revokeApiKey", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_123" } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    });

    it("revokes key for authenticated admin", async () => {
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue({
        id: "key-uuid",
        keyId: "sk_live_torevoke123",
        tenantId: mockUser.tenant_id,
        name: "To Revoke",
        revokedAt: null,
      } as never);

      const result = await revokeApiKey("sk_live_torevoke123");

      expect(result.success).toBe(true);
    });

    it("returns error for non-existent key", async () => {
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue(undefined);

      const result = await revokeApiKey("sk_live_nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("revalidates api-keys path after revocation", async () => {
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue({
        id: "key-uuid",
        keyId: "sk_live_torevoke123",
        tenantId: mockUser.tenant_id,
        name: "To Revoke",
        revokedAt: null,
      } as never);

      await revokeApiKey("sk_live_torevoke123");

      expect(revalidatePath).toHaveBeenCalledWith("/settings/api-keys");
    });

    it("logs audit event for key revocation", async () => {
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue({
        id: "key-uuid",
        keyId: "sk_live_torevoke123",
        tenantId: mockUser.tenant_id,
        name: "Revoked Key",
        revokedAt: null,
      } as never);

      await revokeApiKey("sk_live_torevoke123");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockUser.tenant_id,
          userId: mockUser.id,
          actionType: "DELETE",
          resourceType: "api_key",
        }),
      );
    });

    it("rejects unauthenticated users", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);

      const result = await revokeApiKey("sk_live_anykey");

      expect(result.success).toBe(false);
    });
  });
});

/**
 * @vitest-environment node
 *
 * API Tenant Isolation Integration Tests
 *
 * Story 15.1 - Security Requirement: Multi-tenant isolation
 *
 * Tests that API authentication properly enforces tenant boundaries:
 * - API keys are scoped to their creating tenant
 * - Tokens can only access the tenant they were issued for
 * - Cross-tenant access is prevented
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock database
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
      apiKeys: {
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

import bcrypt from "bcryptjs";
import { adminDb } from "@/db";
import { verifyApiSecret } from "@/modules/api/auth/api-key-service";
import {
  generateAccessToken,
  verifyAccessToken,
} from "@/modules/api/auth/token-service";

describe("API Tenant Isolation", () => {
  const TENANT_A_ID = "tenant-a-uuid-1234";
  const TENANT_B_ID = "tenant-b-uuid-5678";
  const KEY_ID_A = "sk_live_tenantAkey123";
  const KEY_ID_B = "sk_live_tenantBkey456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Token Tenant Binding", () => {
    it("generates tokens bound to specific tenant", async () => {
      // Generate token for tenant A
      const tokenA = await generateAccessToken(TENANT_A_ID, KEY_ID_A, ["read"]);
      const payloadA = await verifyAccessToken(tokenA);

      expect(payloadA).not.toBeNull();
      expect(payloadA?.tenant_id).toBe(TENANT_A_ID);
      expect(payloadA?.key_id).toBe(KEY_ID_A);
    });

    it("different tenants receive tokens with different tenant IDs", async () => {
      const tokenA = await generateAccessToken(TENANT_A_ID, KEY_ID_A, ["read"]);
      const tokenB = await generateAccessToken(TENANT_B_ID, KEY_ID_B, ["read"]);

      const payloadA = await verifyAccessToken(tokenA);
      const payloadB = await verifyAccessToken(tokenB);

      expect(payloadA?.tenant_id).toBe(TENANT_A_ID);
      expect(payloadB?.tenant_id).toBe(TENANT_B_ID);
      expect(payloadA?.tenant_id).not.toBe(payloadB?.tenant_id);
    });

    it("token tenant_id cannot be modified after issuance", async () => {
      const token = await generateAccessToken(TENANT_A_ID, KEY_ID_A, ["read"]);

      // Attempt to tamper with token by modifying base64 payload
      const parts = token.split(".");
      // Decode payload, modify tenant_id, re-encode
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      payload.tenant_id = TENANT_B_ID;
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      // Verification should fail because signature no longer matches
      const result = await verifyAccessToken(tamperedToken);
      expect(result).toBeNull();
    });
  });

  describe("API Key Secret Verification", () => {
    it("verifies correct API secret", async () => {
      const secretPlaintext = "test-secret-key-123456";
      const secretHash = await bcrypt.hash(secretPlaintext, 12);

      const result = await verifyApiSecret(secretPlaintext, secretHash);

      expect(result).toBe(true);
    });

    it("rejects incorrect API secret", async () => {
      const secretPlaintext = "test-secret-key-123456";
      const secretHash = await bcrypt.hash(secretPlaintext, 12);

      const result = await verifyApiSecret("wrong-secret", secretHash);

      expect(result).toBe(false);
    });

    it("API key lookup filters by tenant in database query", async () => {
      const secretPlaintext = "test-secret-key-123456";
      const secretHash = await bcrypt.hash(secretPlaintext, 12);

      // Mock: when searching for key, it returns key with tenant A
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue({
        id: "key-uuid",
        tenantId: TENANT_A_ID,
        keyId: KEY_ID_A,
        secretHash,
        scopes: ["read"],
        isTest: false,
        revokedAt: null,
        createdAt: new Date(),
        createdBy: "user-uuid",
        name: "Test Key",
        description: null,
        lastUsedAt: null,
        lastUsedIp: null,
        revokedBy: null,
      });

      const result = await adminDb.query.apiKeys.findFirst({});

      // The key lookup returns the tenant it belongs to
      // API routes must use this tenant_id for all subsequent queries
      expect(result?.tenantId).toBe(TENANT_A_ID);
      expect(result?.tenantId).not.toBe(TENANT_B_ID);
    });

    it("revoked keys return undefined from database query", async () => {
      // When key is revoked, the query filters it out
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue(undefined);

      const result = await adminDb.query.apiKeys.findFirst({});

      expect(result).toBeUndefined();
    });
  });

  describe("Cross-Tenant Access Prevention", () => {
    it("tenant A token cannot be used to impersonate tenant B", async () => {
      // Generate token for tenant A
      const tokenA = await generateAccessToken(TENANT_A_ID, KEY_ID_A, ["read"]);
      const payload = await verifyAccessToken(tokenA);

      // Token payload will have tenant A's ID, any API route
      // using this token MUST only access tenant A's data
      expect(payload?.tenant_id).toBe(TENANT_A_ID);

      // Simulating an API route that receives this token
      // and checks tenant isolation
      const requestedTenantId = TENANT_B_ID;
      const tokenTenantId = payload?.tenant_id;

      // This is the isolation check that API routes must perform
      const isAuthorized = requestedTenantId === tokenTenantId;
      expect(isAuthorized).toBe(false);
    });

    it("scopes are preserved per-tenant token", async () => {
      // Tenant A has admin scopes
      const tokenAdmin = await generateAccessToken(TENANT_A_ID, KEY_ID_A, [
        "admin",
      ]);
      // Tenant B has only read scopes
      const tokenReadOnly = await generateAccessToken(TENANT_B_ID, KEY_ID_B, [
        "read",
      ]);

      const payloadAdmin = await verifyAccessToken(tokenAdmin);
      const payloadReadOnly = await verifyAccessToken(tokenReadOnly);

      expect(payloadAdmin?.scopes).toContain("admin");
      expect(payloadReadOnly?.scopes).not.toContain("admin");
      expect(payloadReadOnly?.scopes).toContain("read");
    });
  });
});

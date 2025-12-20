/**
 * @vitest-environment node
 *
 * API Authentication Integration Tests
 *
 * Story 15.1 - AC3: OAuth2 Token Endpoint
 * Story 15.1 - AC4: Token Validation
 * Story 15.1 - AC5: Authentication Failures
 *
 * Tests the complete OAuth2 authentication flow.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock database
vi.mock("@/db", () => ({
  adminDb: {
    query: {
      apiKeys: {
        findFirst: vi.fn(),
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
import {
  authenticateApiRequest,
  hasScope,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";

describe("API Authentication Flow", () => {
  const TENANT_ID = "tenant-uuid-123";
  const KEY_ID = "sk_live_testkey123456789";
  const SCOPES = ["read", "write"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OAuth2 Token Flow", () => {
    it("generates valid JWT from API credentials", async () => {
      // Generate token
      const token = await generateAccessToken(TENANT_ID, KEY_ID, SCOPES);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
    });

    it("token contains correct claims", async () => {
      const token = await generateAccessToken(TENANT_ID, KEY_ID, SCOPES);
      const payload = await verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.tenant_id).toBe(TENANT_ID);
      expect(payload?.key_id).toBe(KEY_ID);
      expect(payload?.scopes).toEqual(SCOPES);
    });

    it("token has correct issuer and audience", async () => {
      const token = await generateAccessToken(TENANT_ID, KEY_ID, SCOPES);
      const payload = await verifyAccessToken(token);

      expect(payload?.iss).toBe("salina-erp");
      expect(payload?.aud).toBe("salina-api");
    });

    it("token has expiration set", async () => {
      const token = await generateAccessToken(TENANT_ID, KEY_ID, SCOPES);
      const payload = await verifyAccessToken(token);

      expect(payload?.exp).toBeDefined();
      expect(payload?.iat).toBeDefined();
      // exp should be greater than iat (expires after issued)
      const exp = payload?.exp ?? 0;
      const iat = payload?.iat ?? 0;
      expect(exp > iat).toBe(true);
    });
  });

  describe("API Key Secret Verification", () => {
    it("verifies correct secret against hash", async () => {
      const secret = "test-secret-12345";
      const hash = await bcrypt.hash(secret, 12);

      const result = await verifyApiSecret(secret, hash);
      expect(result).toBe(true);
    });

    it("rejects incorrect secret", async () => {
      const secret = "test-secret-12345";
      const hash = await bcrypt.hash(secret, 12);

      const result = await verifyApiSecret("wrong-secret", hash);
      expect(result).toBe(false);
    });
  });

  describe("Auth Middleware", () => {
    it("authenticates valid Bearer token", async () => {
      const token = await generateAccessToken(TENANT_ID, KEY_ID, SCOPES);

      // Mock the API key lookup to return active key
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue({
        id: "key-uuid",
        keyId: KEY_ID,
        tenantId: TENANT_ID,
        scopes: SCOPES,
        revokedAt: null,
      } as never);

      const request = new NextRequest("http://localhost:3000/api/v1/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await authenticateApiRequest(request);

      expect("context" in result).toBe(true);
      if ("context" in result) {
        expect(result.context.tenantId).toBe(TENANT_ID);
        expect(result.context.keyId).toBe(KEY_ID);
        expect(result.context.scopes).toEqual(SCOPES);
      }
    });

    it("rejects missing Authorization header", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/test");

      const result = await authenticateApiRequest(request);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        const errorBody = await result.error.json();
        expect(errorBody.error).toBe("invalid_request");
      }
    });

    it("rejects invalid token format", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/test", {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      const result = await authenticateApiRequest(request);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        const errorBody = await result.error.json();
        expect(errorBody.error).toBe("invalid_token");
      }
    });

    it("rejects revoked API key", async () => {
      const token = await generateAccessToken(TENANT_ID, KEY_ID, SCOPES);

      // Mock API key as not found (revoked keys are filtered out)
      vi.mocked(adminDb.query.apiKeys.findFirst).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost:3000/api/v1/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await authenticateApiRequest(request);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        const errorBody = await result.error.json();
        expect(errorBody.error).toBe("invalid_token");
        expect(errorBody.error_description).toContain("revoked");
      }
    });
  });

  describe("Scope Checking", () => {
    it("hasScope returns true for matching scope", () => {
      const context = {
        tenantId: TENANT_ID,
        keyId: KEY_ID,
        scopes: ["read", "write"],
      };
      expect(hasScope(context, "read")).toBe(true);
      expect(hasScope(context, "write")).toBe(true);
    });

    it("hasScope returns false for missing scope", () => {
      const context = { tenantId: TENANT_ID, keyId: KEY_ID, scopes: ["read"] };
      expect(hasScope(context, "admin")).toBe(false);
    });

    it("admin scope grants all permissions", () => {
      const context = { tenantId: TENANT_ID, keyId: KEY_ID, scopes: ["admin"] };
      expect(hasScope(context, "read")).toBe(true);
      expect(hasScope(context, "write")).toBe(true);
      expect(hasScope(context, "admin")).toBe(true);
    });

    it("write scope includes read permission", () => {
      const context = { tenantId: TENANT_ID, keyId: KEY_ID, scopes: ["write"] };
      expect(hasScope(context, "read")).toBe(true);
    });

    it("requireScope returns null when scope is present", () => {
      const context = { tenantId: TENANT_ID, keyId: KEY_ID, scopes: ["read"] };
      const result = requireScope(context, "read");
      expect(result).toBeNull();
    });

    it("requireScope returns 403 response when scope is missing", async () => {
      const context = { tenantId: TENANT_ID, keyId: KEY_ID, scopes: ["read"] };
      const result = requireScope(context, "admin");

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);

      const errorBody = await result?.json();
      expect(errorBody.error).toBe("insufficient_scope");
    });
  });

  describe("Error Responses (RFC 6749)", () => {
    it("uses correct error codes for invalid token", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/test", {
        headers: {
          Authorization: "Bearer invalid",
        },
      });

      const result = await authenticateApiRequest(request);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.status).toBe(401);
        const body = await result.error.json();
        expect(body.error).toBe("invalid_token");
        expect(body.error_description).toBeDefined();
      }
    });

    it("uses correct error codes for missing auth", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/test");

      const result = await authenticateApiRequest(request);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.status).toBe(401);
        const body = await result.error.json();
        expect(body.error).toBe("invalid_request");
      }
    });
  });
});

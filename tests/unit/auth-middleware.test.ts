/**
 * Auth Middleware Unit Tests
 *
 * Story 15.1 - AC4: Token Validation
 * Story 15.1 - AC5: Authentication Failures
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import {
  type ApiContext,
  hasScope,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";

// Note: authenticateApiRequest requires database mocking, tested in integration tests

describe("Auth Middleware", () => {
  describe("hasScope", () => {
    it("should return true when context has exact scope", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["read"],
      };

      expect(hasScope(context, "read")).toBe(true);
    });

    it("should return false when context lacks scope", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["read"],
      };

      expect(hasScope(context, "write")).toBe(false);
      expect(hasScope(context, "admin")).toBe(false);
    });

    it("should grant all permissions with admin scope", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["admin"],
      };

      expect(hasScope(context, "read")).toBe(true);
      expect(hasScope(context, "write")).toBe(true);
      expect(hasScope(context, "admin")).toBe(true);
    });

    it("should grant read permission with write scope", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["write"],
      };

      expect(hasScope(context, "read")).toBe(true);
      expect(hasScope(context, "write")).toBe(true);
      expect(hasScope(context, "admin")).toBe(false);
    });

    it("should handle multiple scopes", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["read", "write"],
      };

      expect(hasScope(context, "read")).toBe(true);
      expect(hasScope(context, "write")).toBe(true);
      expect(hasScope(context, "admin")).toBe(false);
    });

    it("should handle empty scopes", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: [],
      };

      expect(hasScope(context, "read")).toBe(false);
      expect(hasScope(context, "write")).toBe(false);
      expect(hasScope(context, "admin")).toBe(false);
    });
  });

  describe("requireScope", () => {
    it("should return null when scope is sufficient", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["read"],
      };

      const response = requireScope(context, "read");
      expect(response).toBeNull();
    });

    it("should return 403 response when scope is insufficient", async () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["read"],
      };

      const response = requireScope(context, "admin");

      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);

      const body = await response?.json();
      expect(body.error).toBe("insufficient_scope");
      expect(body.error_description).toContain("admin");
    });

    it("should return null for admin context with any scope", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["admin"],
      };

      expect(requireScope(context, "read")).toBeNull();
      expect(requireScope(context, "write")).toBeNull();
      expect(requireScope(context, "admin")).toBeNull();
    });

    it("should return null for write context with read requirement", () => {
      const context: ApiContext = {
        tenantId: "tenant-123",
        keyId: "sk_live_test",
        scopes: ["write"],
      };

      expect(requireScope(context, "read")).toBeNull();
    });
  });
});

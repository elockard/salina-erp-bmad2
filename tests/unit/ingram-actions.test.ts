/**
 * Ingram Actions Unit Tests
 *
 * Story 16.1 - Configure Ingram Account Connection
 * Tests for server actions: save, test, disconnect
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before imports
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      channelCredentials: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/channel-encryption", () => ({
  encryptCredentials: vi.fn((data: string) => `encrypted:${data}`),
  decryptCredentials: vi.fn((data: string) => data.replace("encrypted:", "")),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the ftp-client module
vi.mock("@/modules/channels/adapters/ingram/ftp-client", () => ({
  testIngramConnection: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  decryptCredentials,
  encryptCredentials,
} from "@/lib/channel-encryption";
// Import after mocks
import {
  disconnectIngram,
  getDecryptedIngramCredentials,
  saveIngramCredentials,
  testIngramConnectionAction,
} from "@/modules/channels/adapters/ingram/actions";
import { testIngramConnection } from "@/modules/channels/adapters/ingram/ftp-client";

describe("Ingram Actions", () => {
  const mockUserId = "clerk_user_123";
  const mockTenantId = "tenant_uuid_123";

  const mockUser = {
    id: "user_uuid_123",
    clerk_user_id: mockUserId,
    tenant_id: mockTenantId,
    role: "owner" as const,
  };

  const validCredentials = {
    host: "ftps.ingramcontent.com",
    username: "testuser",
    password: "testpass",
    port: 990,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default auth mock
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    // Default user query mock
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

    // Default FTP test mock (success)
    vi.mocked(testIngramConnection).mockResolvedValue({
      success: true,
      message: "Connection successful",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("testIngramConnectionAction", () => {
    it("should return success for valid connection", async () => {
      const result = await testIngramConnectionAction(validCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Connection successful");
      expect(testIngramConnection).toHaveBeenCalledWith(validCredentials);
    });

    it("should return error for invalid credentials schema", async () => {
      const invalidCredentials = {
        host: "", // Invalid: empty
        username: "testuser",
        password: "testpass",
        port: 990,
      };

      const result = await testIngramConnectionAction(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid credentials");
    });

    it("should return error for invalid port", async () => {
      const invalidCredentials = {
        host: "ftps.example.com",
        username: "testuser",
        password: "testpass",
        port: 0, // Invalid
      };

      const result = await testIngramConnectionAction(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid credentials");
    });

    it("should handle FTP connection failure", async () => {
      vi.mocked(testIngramConnection).mockResolvedValue({
        success: false,
        message: "Authentication failed",
      });

      const result = await testIngramConnectionAction(validCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Authentication failed");
    });

    it("should handle missing FTP module gracefully", async () => {
      vi.mocked(testIngramConnection).mockImplementation(() => {
        throw new Error("Cannot find module 'basic-ftp'");
      });

      const result = await testIngramConnectionAction(validCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain("FTP client not available");
    });
  });

  describe("saveIngramCredentials", () => {
    describe("AC4: Role-based access control", () => {
      it("should reject unauthenticated users", async () => {
        vi.mocked(auth).mockResolvedValue({ userId: null } as any);

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(false);
        expect(result.message).toBe("Not authenticated");
      });

      it("should reject users without tenant", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          ...mockUser,
          tenant_id: null,
        } as any);

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(false);
        expect(result.message).toBe("No tenant associated with user");
      });

      it("should reject editor role", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          ...mockUser,
          role: "editor",
        } as any);

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(false);
        expect(result.message).toContain("Insufficient permissions");
      });

      it("should reject finance role", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          ...mockUser,
          role: "finance",
        } as any);

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(false);
        expect(result.message).toContain("Insufficient permissions");
      });

      it("should allow owner role", async () => {
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(true);
      });

      it("should allow admin role", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          ...mockUser,
          role: "admin",
        } as any);
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(true);
      });
    });

    describe("AC3: Connection test before save", () => {
      it("should not save if connection test fails", async () => {
        vi.mocked(testIngramConnection).mockResolvedValue({
          success: false,
          message: "Connection refused",
        });
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(false);
        expect(result.message).toContain("Connection test failed");
        expect(db.insert).not.toHaveBeenCalled();
      });

      it("should save if connection test succeeds", async () => {
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(true);
        expect(db.insert).toHaveBeenCalled();
      });
    });

    describe("AC4: Encryption", () => {
      it("should encrypt credentials before storage", async () => {
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        await saveIngramCredentials(validCredentials);

        expect(encryptCredentials).toHaveBeenCalledWith(
          JSON.stringify(validCredentials),
        );
      });
    });

    describe("AC5: Edit credentials", () => {
      it("should update existing credentials", async () => {
        const existingCreds = {
          id: "cred_uuid_123",
          tenantId: mockTenantId,
          channel: "ingram",
          credentials: `encrypted:${JSON.stringify(validCredentials)}`,
          status: "active",
        };

        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          existingCreds as any,
        );

        const result = await saveIngramCredentials(validCredentials);

        expect(result.success).toBe(true);
        expect(db.update).toHaveBeenCalled();
        expect(db.insert).not.toHaveBeenCalled();
      });

      it("should allow updating without new password (AC5)", async () => {
        const existingPassword = "existing_secret_pass";
        const existingCreds = {
          id: "cred_uuid_123",
          tenantId: mockTenantId,
          channel: "ingram",
          credentials: `encrypted:${JSON.stringify({
            ...validCredentials,
            password: existingPassword,
          })}`,
          status: "active",
        };

        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          existingCreds as any,
        );

        // Update with blank password - should use existing
        const result = await saveIngramCredentials({
          host: "new.host.com",
          username: "newuser",
          password: "", // Empty - should use existing
          port: 21,
        });

        expect(result.success).toBe(true);
        // Verify the connection test was called with the existing password
        expect(testIngramConnection).toHaveBeenCalledWith(
          expect.objectContaining({
            password: existingPassword, // Should use existing password
          }),
        );
      });

      it("should require password for new connections", async () => {
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        const result = await saveIngramCredentials({
          host: "ftps.example.com",
          username: "testuser",
          password: "", // Empty - not allowed for new
          port: 990,
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Password is required");
      });
    });

    describe("Path revalidation", () => {
      it("should revalidate integration paths after save", async () => {
        vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
          undefined,
        );

        await saveIngramCredentials(validCredentials);

        expect(revalidatePath).toHaveBeenCalledWith("/settings/integrations");
        expect(revalidatePath).toHaveBeenCalledWith(
          "/settings/integrations/ingram",
        );
      });
    });
  });

  describe("disconnectIngram", () => {
    describe("AC5: Disconnect functionality", () => {
      it("should delete credentials on disconnect", async () => {
        const result = await disconnectIngram();

        expect(result.success).toBe(true);
        expect(result.message).toBe("Disconnected from Ingram");
        expect(db.delete).toHaveBeenCalled();
      });

      it("should require owner/admin role", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          ...mockUser,
          role: "editor",
        } as any);

        const result = await disconnectIngram();

        expect(result.success).toBe(false);
        expect(result.message).toContain("Insufficient permissions");
      });

      it("should revalidate paths after disconnect", async () => {
        await disconnectIngram();

        expect(revalidatePath).toHaveBeenCalledWith("/settings/integrations");
        expect(revalidatePath).toHaveBeenCalledWith(
          "/settings/integrations/ingram",
        );
      });
    });
  });

  describe("getDecryptedIngramCredentials", () => {
    it("should return decrypted credentials", async () => {
      const storedCreds = {
        id: "cred_uuid_123",
        tenantId: mockTenantId,
        channel: "ingram",
        credentials: `encrypted:${JSON.stringify(validCredentials)}`,
        status: "active",
      };

      vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
        storedCreds as any,
      );

      const result = await getDecryptedIngramCredentials();

      expect(result).toEqual(validCredentials);
      expect(decryptCredentials).toHaveBeenCalled();
    });

    it("should return null if no credentials exist", async () => {
      vi.mocked(db.query.channelCredentials.findFirst).mockResolvedValue(
        undefined,
      );

      const result = await getDecryptedIngramCredentials();

      expect(result).toBeNull();
    });

    it("should require owner/admin role", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        ...mockUser,
        role: "editor",
      } as any);

      await expect(getDecryptedIngramCredentials()).rejects.toThrow(
        "Insufficient permissions",
      );
    });
  });
});

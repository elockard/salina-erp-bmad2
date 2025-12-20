/**
 * Unit tests for notifications service
 * Story 20.2: Build Notifications Center
 */

import { describe, expect, it, vi } from "vitest";

// Mock the database and auth
vi.mock("@/lib/auth", () => ({
  getDb: vi.fn(),
  getCurrentTenantId: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/db/schema/notifications", () => ({
  notifications: {
    id: "id",
    tenantId: "tenantId",
    userId: "userId",
    type: "type",
    title: "title",
    description: "description",
    link: "link",
    metadata: "metadata",
    readAt: "readAt",
    createdAt: "createdAt",
  },
}));

import {
  announcementNotificationSchema,
  feedNotificationSchema,
  importCompleteNotificationSchema,
  lowIsbnNotificationSchema,
  returnNotificationSchema,
} from "@/modules/notifications/schema";

describe("notifications schemas", () => {
  describe("feedNotificationSchema", () => {
    it("should validate valid feed notification input", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        success: true,
        channel: "Amazon",
        productCount: 10,
        feedId: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = feedNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept optional error message", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        success: false,
        channel: "Ingram",
        productCount: 0,
        feedId: "550e8400-e29b-41d4-a716-446655440001",
        errorMessage: "Connection timeout",
      };

      const result = feedNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.errorMessage).toBe("Connection timeout");
      }
    });

    it("should reject invalid UUID", () => {
      const input = {
        tenantId: "invalid-uuid",
        success: true,
        channel: "Amazon",
        productCount: 10,
        feedId: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = feedNotificationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative product count", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        success: true,
        channel: "Amazon",
        productCount: -1,
        feedId: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = feedNotificationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("returnNotificationSchema", () => {
    it("should validate valid return notification input", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        returnId: "550e8400-e29b-41d4-a716-446655440001",
        returnNumber: "RTN-2024-0001",
      };

      const result = returnNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("lowIsbnNotificationSchema", () => {
    it("should validate valid ISBN alert input", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        threshold: 10,
        currentCount: 5,
      };

      const result = lowIsbnNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject negative counts", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        threshold: -1,
        currentCount: 5,
      };

      const result = lowIsbnNotificationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("importCompleteNotificationSchema", () => {
    it("should validate valid import notification", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        importId: "550e8400-e29b-41d4-a716-446655440001",
        recordCount: 100,
        filename: "titles.csv",
      };

      const result = importCompleteNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should work without optional filename", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        importId: "550e8400-e29b-41d4-a716-446655440001",
        recordCount: 100,
      };

      const result = importCompleteNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("announcementNotificationSchema", () => {
    it("should validate valid announcement input", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        title: "System Maintenance",
        description: "Scheduled maintenance on Saturday",
        link: "https://status.example.com",
      };

      const result = announcementNotificationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject title over 100 characters", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        title: "a".repeat(101),
      };

      const result = announcementNotificationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL", () => {
      const input = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Test",
        link: "not-a-url",
      };

      const result = announcementNotificationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

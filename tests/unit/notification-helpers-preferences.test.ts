/**
 * Unit tests for Inngest notification helpers with preference-based email dispatch
 * Story 20.3 - FR178: Configure Notification Preferences
 * AC 20.3.6: Email delivery based on preferences
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock adminDb
vi.mock("@/db", () => ({
  adminDb: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock preferences queries
vi.mock("@/modules/notifications/preferences/queries", () => ({
  getUsersWithEmailPreference: vi.fn(),
}));

// Mock email service
vi.mock("@/modules/notifications/email/notification-email-service", () => ({
  sendNotificationEmailBatch: vi.fn(),
}));

import { adminDb } from "@/db";
import {
  createFeedNotificationAdmin,
  createImportNotificationAdmin,
  createLowIsbnNotificationAdmin,
} from "@/inngest/notification-helpers";
import { sendNotificationEmailBatch } from "@/modules/notifications/email/notification-email-service";
import { getUsersWithEmailPreference } from "@/modules/notifications/preferences/queries";

describe("Notification Helpers with Preferences", () => {
  const mockTenantId = "tenant-123";
  const mockUsersWithEmail = [
    { id: "user-1", email: "user1@example.com" },
    { id: "user-2", email: "user2@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUsersWithEmailPreference).mockResolvedValue(
      mockUsersWithEmail,
    );
    vi.mocked(sendNotificationEmailBatch).mockResolvedValue({
      sent: 2,
      failed: 0,
      skipped: 0,
      errors: [],
    });
  });

  describe("createFeedNotificationAdmin", () => {
    it("should create notification and send emails for feed_success", async () => {
      await createFeedNotificationAdmin(mockTenantId, {
        success: true,
        channel: "Amazon",
        productCount: 100,
        feedId: "feed-123",
      });

      expect(adminDb.insert).toHaveBeenCalled();
      expect(getUsersWithEmailPreference).toHaveBeenCalledWith(
        mockTenantId,
        "feed_success",
      );
      expect(sendNotificationEmailBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ to: "user1@example.com" }),
          expect.objectContaining({ to: "user2@example.com" }),
        ]),
      );
    });

    it("should create notification and send emails for feed_failed", async () => {
      await createFeedNotificationAdmin(mockTenantId, {
        success: false,
        channel: "Ingram",
        productCount: 50,
        feedId: "feed-456",
        errorMessage: "Connection timeout",
      });

      expect(adminDb.insert).toHaveBeenCalled();
      expect(getUsersWithEmailPreference).toHaveBeenCalledWith(
        mockTenantId,
        "feed_failed",
      );
      expect(sendNotificationEmailBatch).toHaveBeenCalled();
    });

    it("should not send emails when no users have email enabled", async () => {
      vi.mocked(getUsersWithEmailPreference).mockResolvedValue([]);

      await createFeedNotificationAdmin(mockTenantId, {
        success: true,
        channel: "Amazon",
        productCount: 25,
        feedId: "feed-789",
      });

      expect(adminDb.insert).toHaveBeenCalled();
      expect(sendNotificationEmailBatch).not.toHaveBeenCalled();
    });
  });

  describe("createImportNotificationAdmin", () => {
    it("should create notification and send emails for import_complete", async () => {
      await createImportNotificationAdmin(mockTenantId, {
        importId: "import-123",
        recordCount: 500,
        filename: "catalog.csv",
      });

      expect(adminDb.insert).toHaveBeenCalled();
      expect(getUsersWithEmailPreference).toHaveBeenCalledWith(
        mockTenantId,
        "import_complete",
      );
      expect(sendNotificationEmailBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: "Import complete",
            description: expect.stringContaining("500 records"),
          }),
        ]),
      );
    });

    it("should handle import without filename", async () => {
      await createImportNotificationAdmin(mockTenantId, {
        importId: "import-456",
        recordCount: 100,
      });

      expect(adminDb.insert).toHaveBeenCalled();
      expect(sendNotificationEmailBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.stringContaining("successfully"),
          }),
        ]),
      );
    });
  });

  describe("createLowIsbnNotificationAdmin", () => {
    it("should create notification and send emails for action_low_isbn", async () => {
      await createLowIsbnNotificationAdmin(mockTenantId, {
        threshold: 50,
        currentCount: 10,
      });

      expect(adminDb.insert).toHaveBeenCalled();
      expect(getUsersWithEmailPreference).toHaveBeenCalledWith(
        mockTenantId,
        "action_low_isbn",
      );
      expect(sendNotificationEmailBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: "Low ISBN inventory",
            description: expect.stringContaining("10 ISBNs remaining"),
          }),
        ]),
      );
    });

    it("should include threshold in description", async () => {
      await createLowIsbnNotificationAdmin(mockTenantId, {
        threshold: 100,
        currentCount: 25,
      });

      expect(sendNotificationEmailBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.stringContaining("threshold: 100"),
          }),
        ]),
      );
    });
  });
});

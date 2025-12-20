/**
 * Unit tests for notification email service
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the email module
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  getDefaultFromEmail: vi.fn().mockReturnValue("notifications@salina.dev"),
}));

// Mock the email template
vi.mock("@/modules/notifications/email/notification-email-template", () => ({
  renderNotificationEmail: vi.fn().mockResolvedValue("<html>Test Email</html>"),
}));

import { sendEmail } from "@/lib/email";
import {
  sendNotificationEmail,
  sendNotificationEmailBatch,
} from "@/modules/notifications/email/notification-email-service";

describe("Notification Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendNotificationEmail", () => {
    it("should send email with correct parameters", async () => {
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const result = await sendNotificationEmail({
        to: "user@example.com",
        title: "Test Notification",
        description: "This is a test notification",
        link: "/test",
        recipientName: "Test User",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
      expect(sendEmail).toHaveBeenCalledWith({
        from: "notifications@salina.dev",
        to: "user@example.com",
        subject: "Test Notification",
        html: "<html>Test Email</html>",
        tags: [{ name: "type", value: "notification" }],
      });
    });

    it("should return error when email fails", async () => {
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "SMTP error",
      });

      const result = await sendNotificationEmail({
        to: "user@example.com",
        title: "Test",
        description: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP error");
    });

    it("should handle exceptions gracefully", async () => {
      vi.mocked(sendEmail).mockRejectedValue(new Error("Network error"));

      const result = await sendNotificationEmail({
        to: "user@example.com",
        title: "Test",
        description: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("sendNotificationEmailBatch", () => {
    it("should send emails to multiple recipients", async () => {
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const result = await sendNotificationEmailBatch([
        { to: "user1@example.com", title: "Test 1", description: "Desc 1" },
        { to: "user2@example.com", title: "Test 2", description: "Desc 2" },
      ]);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(sendEmail).toHaveBeenCalledTimes(2);
    });

    it("should track failed emails", async () => {
      vi.mocked(sendEmail)
        .mockResolvedValueOnce({ success: true, messageId: "msg-1" })
        .mockResolvedValueOnce({ success: false, error: "Failed" });

      const result = await sendNotificationEmailBatch([
        { to: "user1@example.com", title: "Test 1", description: "Desc 1" },
        { to: "user2@example.com", title: "Test 2", description: "Desc 2" },
      ]);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain("user2@example.com: Failed");
    });

    it("should limit batch to 10 emails", async () => {
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const inputs = Array.from({ length: 15 }, (_, i) => ({
        to: `user${i}@example.com`,
        title: `Test ${i}`,
        description: `Desc ${i}`,
      }));

      const result = await sendNotificationEmailBatch(inputs);

      expect(result.sent).toBe(10);
      expect(sendEmail).toHaveBeenCalledTimes(10);
    });
  });
});

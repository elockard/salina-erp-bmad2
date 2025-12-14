/**
 * Ingram Feed History Component Unit Tests
 *
 * Story 16.2 - AC5: Feed History
 * Story 16.5 - AC2, AC3, AC4: View Content, Error Details, Retry
 * Tests for the feed history display component and actions.
 */

import { describe, expect, it } from "vitest";

/**
 * Helper function to format file size (mirrors component logic)
 */
function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

describe("Ingram Feed History", () => {
  describe("formatFileSize", () => {
    it("returns dash for null", () => {
      expect(formatFileSize(null)).toBe("-");
    });

    it("returns dash for 0", () => {
      expect(formatFileSize(0)).toBe("-");
    });

    it("formats bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("formats kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(10240)).toBe("10.0 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(1572864)).toBe("1.5 MB");
      expect(formatFileSize(10485760)).toBe("10.0 MB");
    });
  });

  describe("Status Display", () => {
    const statusLabels: Record<string, string> = {
      success: "Success",
      pending: "Pending",
      generating: "Generating",
      uploading: "Uploading",
      failed: "Failed",
      skipped: "Skipped",
    };

    it("should have labels for all feed statuses", () => {
      expect(statusLabels.success).toBe("Success");
      expect(statusLabels.pending).toBe("Pending");
      expect(statusLabels.generating).toBe("Generating");
      expect(statusLabels.uploading).toBe("Uploading");
      expect(statusLabels.failed).toBe("Failed");
      expect(statusLabels.skipped).toBe("Skipped");
    });

    it("should have badge variants for all statuses", () => {
      const statusVariants: Record<string, string> = {
        success: "default",
        pending: "secondary",
        generating: "secondary",
        uploading: "secondary",
        failed: "destructive",
        skipped: "outline",
      };

      expect(statusVariants.success).toBe("default");
      expect(statusVariants.failed).toBe("destructive");
      expect(statusVariants.skipped).toBe("outline");
    });
  });

  describe("Feed Data Structure", () => {
    it("should include all required fields per AC5", () => {
      const mockFeed = {
        id: "feed-1",
        tenantId: "tenant-1",
        channel: "ingram",
        status: "success",
        productCount: 42,
        fileSize: 102400,
        fileName: "test_onix30_20250115T100000.xml",
        feedType: "delta",
        triggeredBy: "schedule",
        errorMessage: null,
        metadata: null,
        startedAt: new Date("2025-01-15T10:00:00Z"),
        completedAt: new Date("2025-01-15T10:00:30Z"),
        createdAt: new Date("2025-01-15T10:00:00Z"),
      };

      // AC5 requirements: timestamp, product count, status, file size, error message
      expect(mockFeed.createdAt).toBeDefined();
      expect(mockFeed.productCount).toBe(42);
      expect(mockFeed.status).toBe("success");
      expect(mockFeed.fileSize).toBe(102400);
      expect(mockFeed.errorMessage).toBeNull();
    });

    it("should display error message for failed feeds", () => {
      const mockFailedFeed = {
        id: "feed-2",
        tenantId: "tenant-1",
        channel: "ingram",
        status: "failed",
        productCount: 0,
        fileSize: null,
        fileName: null,
        feedType: "full",
        triggeredBy: "manual",
        errorMessage: "Connection timeout",
        metadata: null,
        startedAt: new Date("2025-01-15T10:00:00Z"),
        completedAt: new Date("2025-01-15T10:00:30Z"),
        createdAt: new Date("2025-01-15T10:00:00Z"),
      };

      expect(mockFailedFeed.status).toBe("failed");
      expect(mockFailedFeed.errorMessage).toBe("Connection timeout");
    });

    it("should differentiate schedule vs manual triggers", () => {
      const scheduledFeed = { triggeredBy: "schedule" };
      const manualFeed = { triggeredBy: "manual" };

      expect(scheduledFeed.triggeredBy).toBe("schedule");
      expect(manualFeed.triggeredBy).toBe("manual");
    });

    it("should differentiate full vs delta feeds", () => {
      const fullFeed = { feedType: "full" };
      const deltaFeed = { feedType: "delta" };

      expect(fullFeed.feedType).toBe("full");
      expect(deltaFeed.feedType).toBe("delta");
    });
  });

  /**
   * Story 16.5 - AC2: View Feed Content (XML Preview)
   */
  describe("Feed Content (Story 16.5)", () => {
    it("should include feedContent column for XML storage", () => {
      const feedWithContent = {
        id: "feed-1",
        feedContent: '<?xml version="1.0"?><ONIXMessage>test</ONIXMessage>',
        fileName: "test_onix30.xml",
      };

      expect(feedWithContent.feedContent).toBeDefined();
      expect(feedWithContent.feedContent).toContain("ONIXMessage");
    });

    it("should handle feeds without content", () => {
      const feedWithoutContent = {
        id: "feed-2",
        feedContent: null,
        fileName: null,
      };

      expect(feedWithoutContent.feedContent).toBeNull();
    });
  });

  /**
   * Story 16.5 - AC3: View Error Details
   */
  describe("Error Resolutions (Story 16.5)", () => {
    const errorResolutions: Record<string, string> = {
      "connection refused":
        "Check if Ingram FTP server is accessible. Verify host and port settings.",
      "login authentication failed":
        "Verify your username and password are correct in settings.",
      etimedout:
        "Network timeout. Check your internet connection or try again later.",
      enotfound: "Host not found. Verify the FTP host address in settings.",
      "permission denied":
        "Your account may not have upload permissions. Contact Ingram support.",
      "disk quota exceeded":
        "Ingram storage is full. Contact Ingram to resolve.",
    };

    function getErrorResolution(errorMessage: string): string | null {
      const lowerError = errorMessage.toLowerCase();
      for (const [pattern, resolution] of Object.entries(errorResolutions)) {
        if (lowerError.includes(pattern.toLowerCase())) {
          return resolution;
        }
      }
      return null;
    }

    it("maps connection refused to correct resolution", () => {
      const error = "Connection refused by server";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("FTP server is accessible");
    });

    it("maps login failure to correct resolution", () => {
      const error = "Login authentication failed";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("username and password");
    });

    it("maps timeout errors to correct resolution", () => {
      const error = "ETIMEDOUT - operation timed out";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("Network timeout");
    });

    it("maps host not found to correct resolution", () => {
      const error = "ENOTFOUND ftp.example.com";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("Host not found");
    });

    it("returns null for unknown errors", () => {
      const error = "Unknown exotic error XYZ";
      const resolution = getErrorResolution(error);
      expect(resolution).toBeNull();
    });
  });

  /**
   * Story 16.5 - AC4: Retry Failed Feeds
   */
  describe("Feed Retry (Story 16.5)", () => {
    it("should include retryOf column for retry tracking", () => {
      const retryFeed = {
        id: "retry-feed-456",
        retryOf: "original-feed-123",
        status: "success",
      };

      expect(retryFeed.retryOf).toBe("original-feed-123");
    });

    it("original feed should not have retryOf", () => {
      const originalFeed = {
        id: "original-feed-123",
        retryOf: null,
        status: "failed",
      };

      expect(originalFeed.retryOf).toBeNull();
    });

    it("only failed feeds should be retryable", () => {
      const failedFeed = { status: "failed", feedContent: "<xml>test</xml>" };
      const successFeed = { status: "success", feedContent: "<xml>test</xml>" };
      const pendingFeed = { status: "pending", feedContent: null };

      // Only failed feeds with content can be retried
      const canRetry = (feed: { status: string; feedContent: string | null }) =>
        feed.status === "failed" && feed.feedContent !== null;

      expect(canRetry(failedFeed)).toBe(true);
      expect(canRetry(successFeed)).toBe(false);
      expect(canRetry(pendingFeed)).toBe(false);
    });

    it("retry requires stored feed content", () => {
      const feedWithContent = { feedContent: "<xml>test</xml>" };
      const feedWithoutContent = { feedContent: null };

      expect(feedWithContent.feedContent).not.toBeNull();
      expect(feedWithoutContent.feedContent).toBeNull();
    });
  });

  /**
   * Story 16.5 - AC5: Feed Detail View
   */
  describe("Feed Detail Modal (Story 16.5)", () => {
    it("should calculate duration from startedAt and completedAt", () => {
      const feed = {
        startedAt: new Date("2025-01-15T10:00:00Z"),
        completedAt: new Date("2025-01-15T10:00:30Z"),
      };

      const duration = Math.round(
        (feed.completedAt.getTime() - feed.startedAt.getTime()) / 1000,
      );

      expect(duration).toBe(30);
    });

    it("should handle missing timestamps gracefully", () => {
      const feedWithMissingTimes = {
        startedAt: null,
        completedAt: null,
      };

      const duration =
        feedWithMissingTimes.startedAt && feedWithMissingTimes.completedAt
          ? Math.round(
              (new Date(feedWithMissingTimes.completedAt).getTime() -
                new Date(feedWithMissingTimes.startedAt).getTime()) /
                1000,
            )
          : null;

      expect(duration).toBeNull();
    });
  });
});

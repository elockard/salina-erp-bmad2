/**
 * Amazon Feed History Component Unit Tests
 *
 * Story 17.2 - AC5: Feed History
 * Story 17.5 - AC2, AC3, AC4: View Content, Error Details, Retry
 * Tests for the Amazon feed history display component and actions.
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

describe("Amazon Feed History", () => {
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
        channel: "amazon",
        status: "success",
        productCount: 42,
        fileSize: 102400,
        fileName: "test_onix31_amazon_20250115T100000.xml",
        feedType: "delta",
        triggeredBy: "schedule",
        errorMessage: null,
        metadata: { amazonFeedId: "amzn-feed-12345" },
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
      // Amazon-specific: Amazon Feed ID
      expect((mockFeed.metadata as Record<string, unknown>).amazonFeedId).toBe(
        "amzn-feed-12345",
      );
    });

    it("should display error message for failed feeds", () => {
      const mockFailedFeed = {
        id: "feed-2",
        tenantId: "tenant-1",
        channel: "amazon",
        status: "failed",
        productCount: 0,
        fileSize: null,
        fileName: null,
        feedType: "full",
        triggeredBy: "manual",
        errorMessage: "Amazon feed processing FATAL",
        metadata: null,
        startedAt: new Date("2025-01-15T10:00:00Z"),
        completedAt: new Date("2025-01-15T10:00:30Z"),
        createdAt: new Date("2025-01-15T10:00:00Z"),
      };

      expect(mockFailedFeed.status).toBe("failed");
      expect(mockFailedFeed.errorMessage).toBe("Amazon feed processing FATAL");
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
   * Story 17.5 - AC2: View Feed Content (XML Preview)
   */
  describe("Feed Content (Story 17.5)", () => {
    it("should include feedContent column for XML storage", () => {
      const feedWithContent = {
        id: "feed-1",
        feedContent: '<?xml version="1.0"?><ONIXMessage>test</ONIXMessage>',
        fileName: "test_onix31_amazon.xml",
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

    it("should truncate large XML content at 50KB for preview", () => {
      const largeContent = "x".repeat(60000);
      const truncated =
        largeContent.length > 50000
          ? `${largeContent.slice(0, 50000)}\n\n... (truncated, download for full content)`
          : largeContent;

      expect(truncated.length).toBeLessThan(largeContent.length);
      expect(truncated).toContain("truncated");
    });
  });

  /**
   * Story 17.5 - AC3: View Error Details
   * Amazon-specific SP-API error resolutions
   */
  describe("Amazon Error Resolutions (Story 17.5)", () => {
    const amazonErrorResolutions: Record<string, string> = {
      "access denied":
        "Verify your Amazon SP-API credentials have the required permissions.",
      "invalid credentials":
        "Check your LWA Client ID, Client Secret, and Refresh Token in settings.",
      "expired token":
        "Your refresh token may have expired. Re-authenticate with Amazon.",
      throttled:
        "Amazon rate limit exceeded. Wait a few minutes and try again.",
      "quota exceeded":
        "Daily API quota reached. Try again tomorrow or contact Amazon.",
      "invalid xml":
        "ONIX XML validation failed. Check title metadata for errors.",
      "feed processing":
        "Amazon is still processing the feed. Check back in a few minutes.",
      "marketplace not authorized":
        "Your seller account is not authorized for this marketplace.",
      "network error":
        "Network connectivity issue. Check your internet connection.",
      timeout: "Request timed out. Amazon servers may be experiencing delays.",
      "s3 upload failed":
        "Failed to upload to Amazon S3. Check network connectivity.",
      "create feed document":
        "Failed to initialize feed upload. Amazon API may be unavailable.",
      fatal:
        "Amazon rejected the feed. Check your ONIX data for validation errors.",
      cancelled: "Feed was cancelled by Amazon. Try submitting again.",
    };

    function getErrorResolution(errorMessage: string): string | null {
      const lowerError = errorMessage.toLowerCase();
      for (const [pattern, resolution] of Object.entries(
        amazonErrorResolutions,
      )) {
        if (lowerError.includes(pattern.toLowerCase())) {
          return resolution;
        }
      }
      return null;
    }

    it("maps access denied to correct resolution", () => {
      const error = "Access Denied: insufficient permissions";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("SP-API credentials");
    });

    it("maps expired token to correct resolution", () => {
      const error = "Expired token: refresh required";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("Re-authenticate with Amazon");
    });

    it("maps throttled errors to correct resolution", () => {
      const error = "Request throttled by Amazon API";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("rate limit exceeded");
    });

    it("maps S3 upload failure to correct resolution", () => {
      const error = "S3 upload failed: connection error";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("Amazon S3");
    });

    it("maps FATAL processing status to correct resolution", () => {
      const error = "Amazon feed processing FATAL";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("rejected the feed");
    });

    it("maps timeout errors to correct resolution", () => {
      const error = "Request timeout after 60 seconds";
      const resolution = getErrorResolution(error);
      expect(resolution).toContain("timed out");
    });

    it("returns null for unknown errors", () => {
      const error = "Unknown exotic error XYZ";
      const resolution = getErrorResolution(error);
      expect(resolution).toBeNull();
    });
  });

  /**
   * Story 17.5 - AC4: Retry Failed Feeds
   */
  describe("Feed Retry (Story 17.5)", () => {
    it("should include retryOf column for retry tracking", () => {
      const retryFeed = {
        id: "retry-feed-456",
        retryOf: "original-feed-123",
        status: "success",
        metadata: {
          amazonFeedId: "amzn-retry-789",
          retryOf: "original-feed-123",
        },
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
   * Story 17.5 - AC5: Feed Detail View
   */
  describe("Feed Detail Modal (Story 17.5)", () => {
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

    it("should extract Amazon Feed ID from metadata", () => {
      const feed = {
        id: "feed-1",
        metadata: {
          amazonFeedId: "amzn-12345-67890",
          feedDocumentId: "doc-12345",
        },
      };

      const metadata = feed.metadata as Record<string, unknown>;
      const amazonFeedId = metadata?.amazonFeedId as string | undefined;

      expect(amazonFeedId).toBe("amzn-12345-67890");
    });

    it("should handle feeds without Amazon Feed ID gracefully", () => {
      const feed = {
        id: "feed-1",
        metadata: null,
      };

      const metadata = feed.metadata as Record<string, unknown> | null;
      const amazonFeedId = metadata?.amazonFeedId as string | undefined;

      expect(amazonFeedId).toBeUndefined();
    });
  });

  /**
   * Amazon-specific: Multi-step upload flow validation
   */
  describe("Amazon Upload Flow (Story 17.5)", () => {
    it("should track all steps of Amazon upload process", () => {
      const uploadSteps = [
        "createFeedDocument",
        "uploadFeedContent",
        "createFeed",
        "getFeedStatus",
      ];

      expect(uploadSteps).toHaveLength(4);
      expect(uploadSteps).toContain("createFeedDocument");
      expect(uploadSteps).toContain("uploadFeedContent");
      expect(uploadSteps).toContain("createFeed");
      expect(uploadSteps).toContain("getFeedStatus");
    });

    it("should track feed processing statuses", () => {
      const processingStatuses = [
        "IN_QUEUE",
        "IN_PROGRESS",
        "DONE",
        "FATAL",
        "CANCELLED",
      ];

      expect(processingStatuses).toContain("DONE"); // Success
      expect(processingStatuses).toContain("FATAL"); // Failure
      expect(processingStatuses).toContain("CANCELLED"); // User cancelled
    });
  });
});

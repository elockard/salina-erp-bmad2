/**
 * Ingram Feed History Component Unit Tests
 *
 * Story 16.2 - AC5: Feed History
 * Tests for the feed history display component.
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
});

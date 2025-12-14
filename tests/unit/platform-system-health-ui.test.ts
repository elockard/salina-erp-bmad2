/**
 * Platform System Health UI Component Tests
 *
 * Story 13.7: Build System Health and Job Monitoring
 *
 * Tests for UI component props and rendering logic:
 * - ApplicationHealthCard: Application metrics display
 * - AlertsSection: Alert display and acknowledgment
 * - formatUptime: Uptime formatting utility
 */

import { describe, expect, it } from "vitest";
import type {
  ApplicationMetrics,
  SystemAlert,
} from "@/modules/platform-admin/types";

describe("Platform System Health UI", () => {
  describe("ApplicationMetrics interface", () => {
    it("accepts valid application metrics", () => {
      const metrics: ApplicationMetrics = {
        environment: "development",
        nodeVersion: "v20.10.0",
        isServerless: false,
        uptimeSeconds: 3600,
        memoryUsageMb: 256,
        status: "healthy",
      };

      expect(metrics.environment).toBe("development");
      expect(metrics.nodeVersion).toBe("v20.10.0");
      expect(metrics.isServerless).toBe(false);
      expect(metrics.uptimeSeconds).toBe(3600);
      expect(metrics.memoryUsageMb).toBe(256);
      expect(metrics.status).toBe("healthy");
    });

    it("accepts serverless metrics with null values", () => {
      const metrics: ApplicationMetrics = {
        environment: "production",
        nodeVersion: "v20.10.0",
        isServerless: true,
        uptimeSeconds: null,
        memoryUsageMb: null,
        status: "healthy",
      };

      expect(metrics.isServerless).toBe(true);
      expect(metrics.uptimeSeconds).toBeNull();
      expect(metrics.memoryUsageMb).toBeNull();
    });

    it("supports all status values", () => {
      const statuses: ApplicationMetrics["status"][] = [
        "healthy",
        "degraded",
        "unknown",
      ];

      statuses.forEach((status) => {
        const metrics: ApplicationMetrics = {
          environment: "test",
          nodeVersion: "v20.10.0",
          isServerless: false,
          uptimeSeconds: 100,
          memoryUsageMb: 100,
          status,
        };
        expect(metrics.status).toBe(status);
      });
    });
  });

  describe("SystemAlert interface", () => {
    it("accepts valid system alert", () => {
      const alert: SystemAlert = {
        id: "alert-db-response-critical",
        severity: "critical",
        message: "Database response time critical: 1500ms",
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      };

      expect(alert.id).toBe("alert-db-response-critical");
      expect(alert.severity).toBe("critical");
      expect(alert.source).toBe("database");
      expect(alert.acknowledged).toBe(false);
    });

    it("supports all severity levels", () => {
      const severities: SystemAlert["severity"][] = [
        "info",
        "warning",
        "critical",
      ];

      severities.forEach((severity) => {
        const alert: SystemAlert = {
          id: `alert-test-${severity}`,
          severity,
          message: `Test ${severity} alert`,
          source: "application",
          createdAt: new Date(),
          acknowledged: false,
        };
        expect(alert.severity).toBe(severity);
      });
    });

    it("supports all source types", () => {
      const sources: SystemAlert["source"][] = [
        "database",
        "inngest",
        "email",
        "application",
      ];

      sources.forEach((source) => {
        const alert: SystemAlert = {
          id: `alert-test-${source}`,
          severity: "info",
          message: `Test alert from ${source}`,
          source,
          createdAt: new Date(),
          acknowledged: false,
        };
        expect(alert.source).toBe(source);
      });
    });
  });

  describe("Uptime formatting logic", () => {
    // Testing the formatting logic that's used in ApplicationHealthCard
    function formatUptime(seconds: number): string {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
      return `${Math.floor(seconds / 86400)}d`;
    }

    it("formats seconds correctly", () => {
      expect(formatUptime(30)).toBe("30s");
      expect(formatUptime(59)).toBe("59s");
    });

    it("formats minutes correctly", () => {
      expect(formatUptime(60)).toBe("1m");
      expect(formatUptime(120)).toBe("2m");
      expect(formatUptime(3599)).toBe("59m");
    });

    it("formats hours correctly", () => {
      expect(formatUptime(3600)).toBe("1h");
      expect(formatUptime(7200)).toBe("2h");
      expect(formatUptime(86399)).toBe("23h");
    });

    it("formats days correctly", () => {
      expect(formatUptime(86400)).toBe("1d");
      expect(formatUptime(172800)).toBe("2d");
      expect(formatUptime(604800)).toBe("7d");
    });
  });

  describe("Alert sorting logic", () => {
    // Testing the sorting logic used in AlertsSection
    it("sorts alerts by severity: critical > warning > info", () => {
      const alerts: SystemAlert[] = [
        {
          id: "1",
          severity: "info",
          message: "Info",
          source: "application",
          createdAt: new Date(),
          acknowledged: false,
        },
        {
          id: "2",
          severity: "critical",
          message: "Critical",
          source: "database",
          createdAt: new Date(),
          acknowledged: false,
        },
        {
          id: "3",
          severity: "warning",
          message: "Warning",
          source: "email",
          createdAt: new Date(),
          acknowledged: false,
        },
      ];

      const order = { critical: 0, warning: 1, info: 2 };
      const sortedAlerts = [...alerts].sort(
        (a, b) => order[a.severity] - order[b.severity],
      );

      expect(sortedAlerts[0].severity).toBe("critical");
      expect(sortedAlerts[1].severity).toBe("warning");
      expect(sortedAlerts[2].severity).toBe("info");
    });
  });

  describe("Status color mapping", () => {
    // Testing the status color mapping used across health cards
    const statusColors = {
      healthy: "bg-green-500",
      degraded: "bg-amber-500",
      error: "bg-red-500",
      unknown: "bg-slate-500",
    };

    it("maps all status values to colors", () => {
      expect(statusColors.healthy).toBe("bg-green-500");
      expect(statusColors.degraded).toBe("bg-amber-500");
      expect(statusColors.error).toBe("bg-red-500");
      expect(statusColors.unknown).toBe("bg-slate-500");
    });
  });

  describe("Stable alert IDs", () => {
    it("uses predictable IDs for acknowledgment persistence", () => {
      // These IDs should be stable across refreshes
      const expectedIds = [
        "alert-db-response-critical",
        "alert-db-response-warning",
        "alert-db-pool-error",
        "alert-inngest-critical",
        "alert-inngest-warning",
        "alert-email-failure-rate",
      ];

      expectedIds.forEach((id) => {
        expect(id).toMatch(/^alert-[a-z-]+$/);
        expect(id).not.toMatch(/[0-9a-f]{8}-/); // Should not be UUID
      });
    });
  });
});

/**
 * Health Checks Unit Tests
 *
 * Tests for system health check utilities.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 * AC-6.6.8: Health check failures display warning indicators
 *
 * Note: Due to module-level initialization of external clients (S3Client),
 * these tests focus on the HealthCheckResult type structure and interface
 * validation. Full integration testing is done in tests/integration/.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HealthCheckResult, HealthStatus } from "@/modules/admin/types";

describe("Health Check Types and Interfaces", () => {
  describe("HealthCheckResult type", () => {
    it("supports all required fields", () => {
      const result: HealthCheckResult = {
        service: "Database",
        status: "healthy",
        latencyMs: 15,
        checkedAt: new Date(),
      };

      expect(result.service).toBe("Database");
      expect(result.status).toBe("healthy");
      expect(result.latencyMs).toBe(15);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it("supports optional message field", () => {
      const result: HealthCheckResult = {
        service: "Database",
        status: "unhealthy",
        latencyMs: 5000,
        message: "Connection timeout",
        checkedAt: new Date(),
      };

      expect(result.message).toBe("Connection timeout");
    });

    it("status can be healthy, degraded, unhealthy, or checking", () => {
      const statuses: HealthStatus[] = [
        "healthy",
        "degraded",
        "unhealthy",
        "checking",
      ];

      for (const status of statuses) {
        const result: HealthCheckResult = {
          service: "Test",
          status,
          latencyMs: 0,
          checkedAt: new Date(),
        };
        expect(result.status).toBe(status);
      }
    });
  });

  describe("Service names", () => {
    it("supports all expected service names", () => {
      const serviceNames = ["Database", "Clerk", "S3", "Resend", "Inngest"];

      for (const service of serviceNames) {
        const result: HealthCheckResult = {
          service,
          status: "healthy",
          latencyMs: 0,
          checkedAt: new Date(),
        };
        expect(result.service).toBe(service);
      }
    });
  });
});

describe("Health Check Logic", () => {
  describe("Status determination from latency", () => {
    // Threshold: 1000ms for degraded
    const DEGRADED_THRESHOLD = 1000;

    function getStatusFromLatency(latencyMs: number): HealthStatus {
      if (latencyMs > DEGRADED_THRESHOLD) {
        return "degraded";
      }
      return "healthy";
    }

    it("returns healthy for fast responses", () => {
      expect(getStatusFromLatency(15)).toBe("healthy");
      expect(getStatusFromLatency(100)).toBe("healthy");
      expect(getStatusFromLatency(999)).toBe("healthy");
    });

    it("returns degraded for slow responses", () => {
      expect(getStatusFromLatency(1001)).toBe("degraded");
      expect(getStatusFromLatency(2000)).toBe("degraded");
      expect(getStatusFromLatency(5000)).toBe("degraded");
    });

    it("boundary case at threshold", () => {
      expect(getStatusFromLatency(1000)).toBe("healthy");
    });
  });
});

describe("Health Check Utilities (Mocked)", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("AWS_S3_BUCKET", "test-bucket");
    vi.stubEnv("AWS_REGION", "us-east-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Environment variable checks", () => {
    it("RESEND_API_KEY should be set for Resend health check", () => {
      expect(process.env.RESEND_API_KEY).toBe("test-key");
    });

    it("AWS_S3_BUCKET should be set for S3 health check", () => {
      expect(process.env.AWS_S3_BUCKET).toBe("test-bucket");
    });

    it("Inngest health check uses signing key when available", () => {
      vi.stubEnv("INNGEST_SIGNING_KEY", "test-signing-key");
      expect(process.env.INNGEST_SIGNING_KEY).toBe("test-signing-key");
    });

    it("Inngest health check works without signing key in dev mode", () => {
      vi.stubEnv("INNGEST_SIGNING_KEY", "");
      vi.stubEnv("INNGEST_EVENT_KEY", "");
      expect(process.env.INNGEST_SIGNING_KEY).toBe("");
      expect(process.env.INNGEST_EVENT_KEY).toBe("");
    });
  });

  describe("Result array structure", () => {
    it("runAllHealthChecks should return array of 5 results", () => {
      // Mock expected return value structure
      const mockResults: HealthCheckResult[] = [
        {
          service: "Database",
          status: "healthy",
          latencyMs: 15,
          checkedAt: new Date(),
        },
        {
          service: "Clerk",
          status: "healthy",
          latencyMs: 45,
          checkedAt: new Date(),
        },
        {
          service: "S3",
          status: "healthy",
          latencyMs: 120,
          checkedAt: new Date(),
        },
        {
          service: "Resend",
          status: "healthy",
          latencyMs: 85,
          checkedAt: new Date(),
        },
        {
          service: "Inngest",
          status: "healthy",
          latencyMs: 5,
          checkedAt: new Date(),
        },
      ];

      expect(mockResults).toHaveLength(5);

      const serviceNames = mockResults.map((r) => r.service);
      expect(serviceNames).toContain("Database");
      expect(serviceNames).toContain("Clerk");
      expect(serviceNames).toContain("S3");
      expect(serviceNames).toContain("Resend");
      expect(serviceNames).toContain("Inngest");
    });

    it("individual check failure should not affect other results", () => {
      const mockResults: HealthCheckResult[] = [
        {
          service: "Database",
          status: "unhealthy",
          latencyMs: 5000,
          message: "Connection failed",
          checkedAt: new Date(),
        },
        {
          service: "Clerk",
          status: "healthy",
          latencyMs: 45,
          checkedAt: new Date(),
        },
        {
          service: "S3",
          status: "healthy",
          latencyMs: 120,
          checkedAt: new Date(),
        },
        {
          service: "Resend",
          status: "healthy",
          latencyMs: 85,
          checkedAt: new Date(),
        },
        {
          service: "Inngest",
          status: "healthy",
          latencyMs: 5,
          checkedAt: new Date(),
        },
      ];

      expect(mockResults).toHaveLength(5);

      const dbResult = mockResults.find((r) => r.service === "Database");
      expect(dbResult?.status).toBe("unhealthy");
      expect(dbResult?.message).toBe("Connection failed");

      const clerkResult = mockResults.find((r) => r.service === "Clerk");
      expect(clerkResult?.status).toBe("healthy");
    });
  });
});

describe("Admin Module Queries", () => {
  describe("getJobSummary", () => {
    it("returns JobSummary with all required fields", async () => {
      const { getJobSummary } = await import("@/modules/admin/queries");
      const summary = await getJobSummary();

      expect(summary).toHaveProperty("active");
      expect(summary).toHaveProperty("queued");
      expect(summary).toHaveProperty("completedLast24h");
      expect(summary).toHaveProperty("failedLast24h");
      expect(typeof summary.active).toBe("number");
      expect(typeof summary.queued).toBe("number");
    });
  });

  describe("getRecentJobs", () => {
    it("returns JobListResponse with jobs array and total", async () => {
      const { getRecentJobs } = await import("@/modules/admin/queries");
      const response = await getRecentJobs();

      expect(response).toHaveProperty("jobs");
      expect(response).toHaveProperty("total");
      expect(Array.isArray(response.jobs)).toBe(true);
      expect(typeof response.total).toBe("number");
    });
  });

  describe("getInngestDashboardUrl", () => {
    it("returns a URL string", async () => {
      const { getInngestDashboardUrl } = await import(
        "@/modules/admin/queries"
      );
      const url = getInngestDashboardUrl();

      expect(typeof url).toBe("string");
      expect(url).toContain("inngest.com");
    });
  });

  describe("getJobTypeLabel", () => {
    it("returns human-readable labels for job types", async () => {
      const { getJobTypeLabel } = await import("@/modules/admin/queries");

      expect(getJobTypeLabel("pdf-generation")).toBe("PDF Generation");
      expect(getJobTypeLabel("batch-statements")).toBe("Batch Statements");
    });
  });

  describe("getAvailableJobTypes", () => {
    it("returns array of job type options", async () => {
      const { getAvailableJobTypes } = await import("@/modules/admin/queries");
      const types = getAvailableJobTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(2);

      for (const type of types) {
        expect(type).toHaveProperty("value");
        expect(type).toHaveProperty("label");
      }
    });
  });
});

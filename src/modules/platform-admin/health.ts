/**
 * Platform Admin Health Check Utilities
 *
 * Story 13.5: Build Platform Analytics Dashboard (AC: 5)
 * Story 13.7: Build System Health and Job Monitoring (AC: 2) - Extended with detailed metrics
 *
 * Provides health status checks for platform services:
 * - Database: Active check via SELECT 1 with response time measurement
 * - Inngest: Dashboard URL only (no API health endpoint available)
 * - Resend: Dashboard URL only (no API health endpoint available)
 *
 * Future enhancement: Add actual health checks for Inngest/Resend when APIs available.
 */

import { sql } from "drizzle-orm";

import { adminDb } from "@/db";
import type { DatabaseMetrics } from "./types";

/**
 * Get detailed database health metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 2)
 *
 * @returns DatabaseMetrics including connection info, size, and response time
 */
export async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  const start = Date.now();

  try {
    // Basic connectivity check
    await adminDb.execute(sql`SELECT 1`);
    const responseTimeMs = Date.now() - start;

    // Get connection stats from pg_stat_database
    const connStats = await adminDb.execute(sql`
      SELECT numbackends as active_connections
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    // Get database size
    const sizeResult = await adminDb.execute(sql`
      SELECT pg_database_size(current_database()) as size_bytes
    `);

    const activeConnections = Number(
      (connStats.rows[0] as { active_connections?: number })
        ?.active_connections ?? 0,
    );
    const sizeBytes = Number(
      (sizeResult.rows[0] as { size_bytes?: number })?.size_bytes ?? 0,
    );

    return {
      connectionPoolStatus:
        responseTimeMs < 100
          ? "healthy"
          : responseTimeMs < 500
            ? "degraded"
            : "error",
      activeConnections,
      idleConnections: 0, // Neon doesn't expose this
      databaseSizeMb: Math.round(sizeBytes / (1024 * 1024)),
      responseTimeMs,
    };
  } catch {
    return {
      connectionPoolStatus: "error",
      activeConnections: 0,
      idleConnections: 0,
      databaseSizeMb: 0,
      responseTimeMs: Date.now() - start,
    };
  }
}

/**
 * Check database health with response time
 * Story 13.5: Build Platform Analytics Dashboard (AC: 5)
 *
 * Note: Now uses getDatabaseMetrics internally for consistent behavior.
 *
 * @returns Health status and response time in milliseconds
 */
export async function getDatabaseHealthStatus(): Promise<{
  status: "healthy" | "degraded" | "error";
  responseTimeMs: number;
}> {
  const metrics = await getDatabaseMetrics();
  return {
    status: metrics.connectionPoolStatus,
    responseTimeMs: metrics.responseTimeMs,
  };
}

/**
 * Get Inngest background job system status
 *
 * Note: Direct health check not available - returns dashboard URL for manual verification
 *
 * @returns Status (unknown) and dashboard URL
 */
export function getInngestHealthStatus(): {
  status: "healthy" | "unknown";
  dashboardUrl: string;
} {
  return {
    status: "unknown",
    dashboardUrl:
      process.env.INNGEST_DASHBOARD_URL ?? "https://app.inngest.com",
  };
}

/**
 * Get Resend email service status
 *
 * Note: Direct health check not available - returns dashboard URL for manual verification
 *
 * @returns Status (unknown) and dashboard URL
 */
export function getEmailServiceStatus(): {
  status: "healthy" | "unknown";
  dashboardUrl: string;
} {
  return {
    status: "unknown",
    dashboardUrl: "https://resend.com/overview",
  };
}

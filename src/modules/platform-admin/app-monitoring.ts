/**
 * Platform Admin Application Monitoring
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 4)
 *
 * Provides application-level health metrics.
 * Note: In serverless environments (Vercel/Next.js), many process-level
 * metrics are not meaningful or accessible.
 */

import type { ApplicationMetrics } from "./types";

/**
 * Detect if running in serverless environment
 */
function isServerlessEnvironment(): boolean {
  // Vercel, AWS Lambda, and other serverless platforms set specific env vars
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  );
}

/**
 * Get application health metrics
 *
 * Note: Memory usage and uptime are only meaningful in long-running processes.
 * In serverless environments, each request may be a fresh instance.
 *
 * @returns ApplicationMetrics with available runtime information
 */
export function getApplicationMetrics(): ApplicationMetrics {
  const isServerless = isServerlessEnvironment();

  // In serverless, these values are per-request and not meaningful for monitoring
  let memoryUsageMb: number | null = null;
  let uptimeSeconds: number | null = null;

  if (!isServerless) {
    try {
      const memUsage = process.memoryUsage();
      memoryUsageMb = Math.round(memUsage.heapUsed / (1024 * 1024));
      uptimeSeconds = Math.round(process.uptime());
    } catch {
      // Memory/uptime not available
    }
  }

  return {
    environment: process.env.NODE_ENV ?? "unknown",
    nodeVersion: process.version,
    isServerless,
    uptimeSeconds,
    memoryUsageMb,
    status: "healthy", // App is running if this code executes
  };
}

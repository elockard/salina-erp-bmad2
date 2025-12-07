/**
 * Audit Logging Utility
 *
 * Provides async, non-blocking audit logging for compliance tracking.
 * All data modifications should be logged through this function.
 *
 * Story 6.5: Implement Audit Logging for Compliance
 * AC-6.5.2: logAuditEvent() function available for all Server Actions
 * AC-6.5.10: Async logging that doesn't block user operations
 *
 * Design Principles:
 * - FIRE AND FORGET: Don't await in calling code path
 * - ERROR RESILIENCE: Failures don't throw to caller
 * - SENSITIVE DATA: Tax IDs masked to show only last 4 digits
 * - APPEND-ONLY: Logs are never updated or deleted
 */

import { adminDb } from "@/db";
import {
  type AuditActionType,
  type AuditResourceType,
  auditLogs,
} from "@/db/schema/audit-logs";

/**
 * Parameters for logging an audit event
 */
export interface AuditEventParams {
  /** Tenant ID (required for multi-tenant isolation) */
  tenantId: string;
  /** User ID who performed the action (null for system actions) */
  userId: string | null;
  /** Type of action: CREATE, UPDATE, DELETE, APPROVE, REJECT, VIEW */
  actionType: AuditActionType;
  /** Type of resource: author, title, sale, return, statement, contract, user */
  resourceType: AuditResourceType;
  /** UUID of the specific resource (optional) */
  resourceId?: string;
  /** Before/after state for tracking changes */
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  /** Additional context (IP, user agent, etc.) */
  metadata?: Record<string, unknown>;
  /** Status of the operation: success or failure */
  status?: "success" | "failure";
}

/**
 * Fields that contain sensitive data and should be masked
 */
const SENSITIVE_FIELDS = ["tax_id", "taxId", "ssn", "ein"] as const;

/**
 * Masks sensitive data in an object
 * Tax IDs and similar fields show only last 4 digits
 *
 * @param data - Object to mask sensitive fields in
 * @returns New object with sensitive fields masked
 */
function maskSensitiveData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const masked = { ...data };

  for (const field of SENSITIVE_FIELDS) {
    if (field in masked && typeof masked[field] === "string") {
      const value = masked[field] as string;
      // Keep only last 4 characters, mask the rest
      if (value.length > 4) {
        masked[field] = `***-**-${value.slice(-4)}`;
      } else {
        masked[field] = "****";
      }
    }
  }

  // Recursively mask nested objects
  for (const key of Object.keys(masked)) {
    if (
      masked[key] &&
      typeof masked[key] === "object" &&
      !Array.isArray(masked[key])
    ) {
      masked[key] = maskSensitiveData(masked[key] as Record<string, unknown>);
    }
  }

  return masked;
}

/**
 * Logs an audit event asynchronously (non-blocking)
 *
 * IMPORTANT: This function is designed to be fire-and-forget.
 * Do NOT await it in the calling code path - audit failures
 * should never block or fail the parent operation.
 *
 * Usage:
 * ```typescript
 * // Fire and forget - don't await
 * logAuditEvent({
 *   tenantId: tenant.id,
 *   userId: user.id,
 *   actionType: "CREATE",
 *   resourceType: "sale",
 *   resourceId: newSale.id,
 *   changes: { after: newSale },
 * });
 * ```
 *
 * @param params - Audit event parameters
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    // Mask sensitive data in changes
    const maskedChanges = params.changes
      ? {
          before: maskSensitiveData(params.changes.before),
          after: maskSensitiveData(params.changes.after),
        }
      : undefined;

    // Use adminDb for audit logging - bypasses RLS since audit logs
    // are written by server actions that have already verified permissions
    await adminDb.insert(auditLogs).values({
      tenant_id: params.tenantId,
      user_id: params.userId,
      action_type: params.actionType,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      changes: maskedChanges,
      metadata: params.metadata,
      status: params.status ?? "success",
    });
  } catch (error) {
    // Log error but don't throw - audit failure shouldn't fail the parent operation
    console.error("[Audit] Failed to log audit event:", {
      error: error instanceof Error ? error.message : String(error),
      params: {
        tenantId: params.tenantId,
        actionType: params.actionType,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      },
    });
  }
}

// Re-export types for convenience
export type { AuditActionType, AuditResourceType };

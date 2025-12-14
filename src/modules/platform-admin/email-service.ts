/**
 * Platform Admin Email Service
 *
 * Provides fire-and-forget email sending for platform admin notifications.
 *
 * Story: 13.4 - Implement Tenant Suspension and Reactivation
 * Task 6: Create Email Service Functions
 * AC-13.4.9: Suspension/reactivation events trigger notification to tenant owner
 *
 * Design Principles:
 * - FIRE AND FORGET: Email failures do NOT fail the main action
 * - ERROR RESILIENCE: All errors are logged but never thrown
 * - NON-BLOCKING: Caller should not await these functions
 */

import { getDefaultFromEmail, sendEmail } from "@/lib/email";
import { renderTenantReactivatedEmail } from "./emails/tenant-reactivated";
import { renderTenantSuspendedEmail } from "./emails/tenant-suspended";

/**
 * Parameters for sending tenant suspended notification
 */
export interface SendTenantSuspendedEmailParams {
  /** Recipient email address */
  to: string;
  /** Tenant/organization name */
  tenantName: string;
  /** Reason for suspension */
  reason: string;
  /** Date suspended */
  suspendedAt: Date;
}

/**
 * Parameters for sending tenant reactivated notification
 */
export interface SendTenantReactivatedEmailParams {
  /** Recipient email address */
  to: string;
  /** Tenant/organization name */
  tenantName: string;
  /** Date reactivated */
  reactivatedAt: Date;
}

/**
 * Send tenant suspension notification email
 *
 * FIRE AND FORGET - errors are logged but don't throw.
 * Do NOT await this function in the calling code path.
 *
 * @param params - Email parameters
 */
export async function sendTenantSuspendedEmail(
  params: SendTenantSuspendedEmailParams,
): Promise<void> {
  try {
    const html = await renderTenantSuspendedEmail({
      tenantName: params.tenantName,
      reason: params.reason,
      suspendedAt: params.suspendedAt,
    });

    await sendEmail({
      from: getDefaultFromEmail(),
      to: params.to,
      subject: `Account Suspended - ${params.tenantName}`,
      html,
    });

    console.log(
      `[PlatformAdmin] Suspension email sent to ${params.to} for tenant ${params.tenantName}`,
    );
  } catch (error) {
    // Log but don't throw - email failure shouldn't fail the main action
    console.error("[PlatformAdmin] Failed to send suspension email:", error);
  }
}

/**
 * Send tenant reactivation notification email
 *
 * FIRE AND FORGET - errors are logged but don't throw.
 * Do NOT await this function in the calling code path.
 *
 * @param params - Email parameters
 */
export async function sendTenantReactivatedEmail(
  params: SendTenantReactivatedEmailParams,
): Promise<void> {
  try {
    const html = await renderTenantReactivatedEmail({
      tenantName: params.tenantName,
      reactivatedAt: params.reactivatedAt,
    });

    await sendEmail({
      from: getDefaultFromEmail(),
      to: params.to,
      subject: `Account Reactivated - ${params.tenantName}`,
      html,
    });

    console.log(
      `[PlatformAdmin] Reactivation email sent to ${params.to} for tenant ${params.tenantName}`,
    );
  } catch (error) {
    // Log but don't throw - email failure shouldn't fail the main action
    console.error("[PlatformAdmin] Failed to send reactivation email:", error);
  }
}

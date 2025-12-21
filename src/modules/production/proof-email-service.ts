/**
 * Proof Email Service
 *
 * Handles sending proof-related emails to vendors.
 * Used when corrections are requested on proof versions.
 *
 * Story: 18.5 - Approve or Request Corrections on Proofs
 * AC-18.5.3: Email notification to vendor when corrections requested
 */

import { eq } from "drizzle-orm";

import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { productionProjects } from "@/db/schema/production-projects";
import { proofFiles } from "@/db/schema/proof-files";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { getDefaultFromEmail, sendEmail } from "@/lib/email";

import {
  generateCorrectionEmailSubject,
  type ProofCorrectionEmailProps,
  renderProofCorrectionEmail,
} from "./proof-correction-email";

/**
 * Result from sending a proof email
 */
export interface ProofEmailResult {
  /** Whether email was sent successfully */
  success: boolean;
  /** Resend message ID (on success) */
  messageId?: string;
  /** Error message (on failure) */
  error?: string;
  /** Warning message (when success but with caveats, e.g., no vendor) */
  warning?: string;
}

/**
 * Parameters for sending a proof correction email
 */
export interface SendProofCorrectionEmailParams {
  /** Proof file ID */
  proofId: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** User ID who requested the correction */
  requestedByUserId: string;
  /** Correction notes to include in email */
  correctionNotes: string;
}

/**
 * Find vendor for a production project
 *
 * Looks for proofing task vendor, falls back to any vendor on the project
 */
async function findProjectVendor(projectId: string): Promise<{
  id: string;
  name: string;
  email: string;
} | null> {
  // Look for a proofing or design task with a vendor assigned (exclude deleted tasks)
  const taskWithVendor = await adminDb.query.productionTasks.findFirst({
    where: (tasks, { eq, and, isNotNull, isNull }) =>
      and(
        eq(tasks.projectId, projectId),
        isNotNull(tasks.vendorId),
        isNull(tasks.deletedAt),
      ),
  });

  if (!taskWithVendor?.vendorId) {
    return null;
  }

  const vendor = await adminDb.query.contacts.findFirst({
    where: eq(contacts.id, taskWithVendor.vendorId),
  });

  if (!vendor || !vendor.email) {
    return null;
  }

  return {
    id: vendor.id,
    name: `${vendor.first_name} ${vendor.last_name}`.trim(),
    email: vendor.email,
  };
}

/**
 * Send a proof correction request email to a vendor
 *
 * Fetches all necessary data (proof, project, vendor, tenant) and sends
 * an email notification to the vendor with correction instructions.
 *
 * AC-18.5.3: Email includes correction notes, project info, proof version
 *
 * @param params - Email parameters
 * @returns Result with messageId on success, error on failure
 */
export async function sendProofCorrectionEmail(
  params: SendProofCorrectionEmailParams,
): Promise<ProofEmailResult> {
  const { proofId, tenantId, requestedByUserId, correctionNotes } = params;

  try {
    // Step 1: Fetch proof
    const proof = await adminDb.query.proofFiles.findFirst({
      where: eq(proofFiles.id, proofId),
    });

    if (!proof) {
      return {
        success: false,
        error: `Proof not found: ${proofId}`,
      };
    }

    if (proof.tenantId !== tenantId) {
      return {
        success: false,
        error: "Proof does not belong to tenant",
      };
    }

    // Step 2: Fetch project and title
    const project = await adminDb.query.productionProjects.findFirst({
      where: eq(productionProjects.id, proof.projectId),
    });

    if (!project) {
      return {
        success: false,
        error: `Project not found: ${proof.projectId}`,
      };
    }

    const title = await adminDb.query.titles.findFirst({
      where: eq(titles.id, project.titleId),
    });

    const projectTitle = title?.title || "Unknown Title";

    // Step 3: Find vendor to notify
    const vendor = await findProjectVendor(proof.projectId);

    if (!vendor) {
      // No vendor to notify - this is not an error, just skip
      console.log(
        `[ProofEmail] No vendor found for project ${proof.projectId}, skipping email`,
      );
      return {
        success: true,
        warning: "No vendor assigned to project tasks",
      };
    }

    // Step 4: Fetch tenant for publisher name
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return {
        success: false,
        error: `Tenant not found: ${tenantId}`,
      };
    }

    // Step 5: Fetch requester info
    // Note: users table only has email, not first_name/last_name
    const requester = await adminDb.query.users.findFirst({
      where: eq(users.id, requestedByUserId),
    });

    // Use email prefix or fallback to "Publisher" for requester name
    const requestedBy = requester?.email?.split("@")[0] || "Publisher";

    // Step 6: Prepare email template data
    const templateProps: ProofCorrectionEmailProps = {
      vendorName: vendor.name,
      projectTitle,
      proofVersion: proof.version,
      correctionNotes,
      publisherName: tenant.name,
      requestedBy,
    };

    // Step 7: Render email HTML
    const html = await renderProofCorrectionEmail(templateProps);
    const subject = generateCorrectionEmailSubject(projectTitle, proof.version);

    // Step 8: Send via Resend
    const emailResult = await sendEmail({
      from: getDefaultFromEmail(),
      to: vendor.email,
      subject,
      html,
      tags: [
        { name: "type", value: "proof-correction" },
        { name: "tenant", value: tenantId },
        { name: "proof", value: proofId },
      ],
    });

    if (!emailResult.success) {
      console.error(
        `[ProofEmail] Failed to send correction for proof ${proofId}:`,
        emailResult.error,
      );
      return {
        success: false,
        error: emailResult.error,
      };
    }

    console.log(
      `[ProofEmail] Sent correction request for proof ${proofId} to ${vendor.email}: ${emailResult.messageId}`,
    );

    return {
      success: true,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email service error";
    console.error(
      `[ProofEmail] Error sending correction for ${proofId}:`,
      error,
    );
    return {
      success: false,
      error: message,
    };
  }
}

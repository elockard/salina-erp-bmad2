"use server";

/**
 * Manuscript Submission Server Actions
 *
 * Server-side actions for manuscript submission operations.
 * Authors upload manuscripts through the portal.
 *
 * Story: 21.3 - Upload Manuscript Files
 * AC-21.3.1: Upload interface accepts Word/PDF
 * AC-21.3.3: Associate with author's title
 * AC-21.3.4: Create draft production project
 *
 * Security: Verifies author context and title access
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { adminDb, db } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { manuscriptSubmissions } from "@/db/schema/manuscript-submissions";
import { notifications } from "@/db/schema/notifications";
import { users } from "@/db/schema/users";
import { getCurrentUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/modules/notifications/email/notification-email-service";
import { getEffectiveUserPreference } from "@/modules/notifications/preferences/queries";
import {
  MANUSCRIPT_ALLOWED_TYPES,
  MANUSCRIPT_MAX_SIZE,
  validateManuscriptFile,
} from "@/modules/production/storage";

import { verifyTitleAccess } from "./queries";

/**
 * Action result type for manuscript operations
 */
export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * S3 client singleton
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

/**
 * S3 bucket name from environment
 */
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "salina-erp-production";

/**
 * Get authenticated author's contact ID
 *
 * Verifies user is an author and returns their associated contact ID.
 */
async function getAuthorContext(): Promise<{
  contactId: string;
  tenantId: string;
  userId: string;
} | null> {
  const user = await getCurrentUser();

  if (!user || user.role !== "author") {
    return null;
  }

  // Get the contact linked to this portal user
  const contact = await adminDb.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
  });

  if (!contact) {
    return null;
  }

  return {
    contactId: contact.id,
    tenantId: user.tenant_id,
    userId: user.id,
  };
}

/**
 * Generate S3 key for manuscript submission
 * Pattern: manuscripts/{tenant_id}/{contact_id}/{timestamp}-{filename}
 */
function generateSubmissionS3Key(
  tenantId: string,
  contactId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `manuscripts/${tenantId}/${contactId}/${timestamp}-${sanitizedName}`;
}

/**
 * Upload manuscript file to S3
 */
async function uploadSubmissionToS3(
  buffer: Buffer,
  tenantId: string,
  contactId: string,
  fileName: string,
  contentType: string,
): Promise<{ key: string; fileName: string; fileSize: number }> {
  const s3Key = generateSubmissionS3Key(tenantId, contactId, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      "tenant-id": tenantId,
      "contact-id": contactId,
      "original-name": fileName,
      "uploaded-at": new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return {
      key: s3Key,
      fileName,
      fileSize: buffer.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error";
    console.error(
      `[S3] Manuscript submission upload failed for contact ${contactId}:`,
      message,
    );
    throw new Error(`Failed to upload manuscript to S3: ${message}`);
  }
}

/**
 * Notify editors/admins of new manuscript submission
 *
 * Story 21.3: AC-21.3.5 - Two-layer notification (in-app + email)
 *
 * Creates in-app notifications and sends emails respecting user preferences.
 *
 * @param submissionId - The submission ID
 * @param authorName - The author's display name
 * @param fileName - The manuscript file name
 * @param tenantId - The tenant ID
 */
async function notifyEditorsOfNewSubmission(
  submissionId: string,
  authorName: string,
  fileName: string,
  tenantId: string,
): Promise<void> {
  try {
    // Find all editors/admins for this tenant
    const editorsAndAdmins = await adminDb
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.tenant_id, tenantId),
          inArray(users.role, ["owner", "admin", "editor"]),
        ),
      );

    if (editorsAndAdmins.length === 0) {
      console.warn(
        `[notifyEditorsOfNewSubmission] No editors/admins found for tenant ${tenantId}`,
      );
      return;
    }

    const notificationType = "manuscript_submitted";
    const title = "New Manuscript Submission";
    const description = `${authorName} submitted a manuscript: ${fileName}`;
    const link = `/production/submissions/${submissionId}`;

    // Process each editor/admin respecting their preferences
    for (const recipient of editorsAndAdmins) {
      // Get user's notification preferences
      const prefs = await getEffectiveUserPreference(
        recipient.id,
        notificationType,
      );

      // Create in-app notification if enabled
      if (prefs.inApp) {
        await db.insert(notifications).values({
          tenantId: tenantId,
          userId: recipient.id,
          type: notificationType,
          title: title,
          description: description,
          link: link,
          metadata: {
            submissionId,
            authorName,
            fileName,
          },
        });
      }

      // Send email if enabled
      if (prefs.email && recipient.email) {
        await sendNotificationEmail({
          to: recipient.email,
          title: title,
          description: description,
          link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
          linkText: "Review Submission",
        });
      }
    }

    console.log(
      `[notifyEditorsOfNewSubmission] Notified ${editorsAndAdmins.length} editors/admins`,
    );
  } catch (error) {
    // Log but don't fail the main operation
    console.error(
      "[notifyEditorsOfNewSubmission] Failed to send notifications:",
      error,
    );
  }
}

/**
 * Upload manuscript submission
 *
 * Story 21.3: AC-21.3.1, AC-21.3.3, AC-21.3.4
 *
 * @param formData - Form data containing file, titleId (optional), and notes
 * @returns ActionResult with submission ID on success
 */
export async function uploadManuscriptSubmission(
  formData: FormData,
): Promise<ActionResult<{ submissionId: string }>> {
  try {
    const authorContext = await getAuthorContext();

    if (!authorContext) {
      return { success: false, error: "Unauthorized" };
    }

    // Extract file from FormData
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type and size (reuse from production/storage.ts)
    try {
      validateManuscriptFile(file);
    } catch (validationError) {
      return {
        success: false,
        error:
          validationError instanceof Error
            ? validationError.message
            : "Invalid file",
      };
    }

    // Extract optional fields
    const titleId = formData.get("titleId") as string | null;
    const notes = formData.get("notes") as string | null;

    // If title selected, verify author has access
    if (titleId && titleId !== "new") {
      const hasAccess = await verifyTitleAccess(
        authorContext.contactId,
        titleId,
        authorContext.tenantId,
      );

      if (!hasAccess) {
        return { success: false, error: "You don't have access to this title" };
      }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const s3Result = await uploadSubmissionToS3(
      buffer,
      authorContext.tenantId,
      authorContext.contactId,
      file.name,
      file.type,
    );

    // Get author's name for notification
    const authorContact = await adminDb.query.contacts.findFirst({
      where: eq(contacts.id, authorContext.contactId),
    });
    const authorName = authorContact
      ? `${authorContact.first_name} ${authorContact.last_name}`
      : "An author";

    // Create database record
    const [submission] = await db
      .insert(manuscriptSubmissions)
      .values({
        tenant_id: authorContext.tenantId,
        contact_id: authorContext.contactId,
        title_id: titleId && titleId !== "new" ? titleId : null,
        file_name: s3Result.fileName,
        s3_key: s3Result.key,
        content_type: file.type,
        file_size: s3Result.fileSize,
        notes: notes || null,
        status: "pending_review",
      })
      .returning({ id: manuscriptSubmissions.id });

    // Send notifications to editors/admins (AC-21.3.5)
    // Run async to not block the response
    notifyEditorsOfNewSubmission(
      submission.id,
      authorName,
      s3Result.fileName,
      authorContext.tenantId,
    ).catch((err) =>
      console.error("[uploadManuscriptSubmission] Notification failed:", err),
    );

    // Revalidate portal pages
    revalidatePath("/portal/manuscripts");
    revalidatePath("/portal");

    return {
      success: true,
      data: { submissionId: submission.id },
    };
  } catch (error) {
    console.error("[uploadManuscriptSubmission] Failed:", error);
    return {
      success: false,
      error: "Failed to upload manuscript. Please try again.",
    };
  }
}

/**
 * Create draft production project from manuscript submission
 *
 * Story 21.3: AC-21.3.4 - Create draft production project
 *
 * Called by editors/admins after accepting a manuscript submission.
 * Creates a production project and links it to the submission.
 *
 * @param submissionId - The manuscript submission ID
 * @returns ActionResult with production project ID on success
 */
export async function createDraftProductionProject(
  submissionId: string,
): Promise<ActionResult<{ projectId: string }>> {
  try {
    // Get authenticated user (editor/admin context)
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!["owner", "admin", "editor"].includes(user.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get the submission
    const [submission] = await adminDb
      .select()
      .from(manuscriptSubmissions)
      .where(
        and(
          eq(manuscriptSubmissions.id, submissionId),
          eq(manuscriptSubmissions.tenant_id, user.tenant_id),
        ),
      )
      .limit(1);

    if (!submission) {
      return { success: false, error: "Submission not found" };
    }

    if (submission.status === "in_production") {
      return {
        success: false,
        error: "Production project already exists for this submission",
      };
    }

    // Submission must have a title associated
    if (!submission.title_id) {
      return {
        success: false,
        error:
          "Submission must be associated with a title before creating production project",
      };
    }

    // Import production projects schema
    const { productionProjects } = await import(
      "@/db/schema/production-projects"
    );

    // Create draft production project
    const [project] = await db
      .insert(productionProjects)
      .values({
        tenantId: user.tenant_id,
        titleId: submission.title_id,
        status: "draft",
        workflowStage: "manuscript_received",
        manuscriptFileKey: submission.s3_key,
        manuscriptFileName: submission.file_name,
        manuscriptFileSize: String(submission.file_size),
        manuscriptUploadedAt: submission.created_at,
        notes: submission.notes
          ? `Author notes: ${submission.notes}`
          : undefined,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: productionProjects.id });

    // Link submission to production project and update status
    await db
      .update(manuscriptSubmissions)
      .set({
        production_project_id: project.id,
        status: "in_production",
        reviewed_by: user.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(manuscriptSubmissions.id, submissionId));

    // Revalidate pages
    revalidatePath("/portal/manuscripts");
    revalidatePath("/production");

    return {
      success: true,
      data: { projectId: project.id },
    };
  } catch (error) {
    console.error("[createDraftProductionProject] Failed:", error);
    return {
      success: false,
      error: "Failed to create production project. Please try again.",
    };
  }
}

// Re-export constants for client-side validation
export { MANUSCRIPT_ALLOWED_TYPES, MANUSCRIPT_MAX_SIZE };

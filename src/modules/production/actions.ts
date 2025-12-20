"use server";

/**
 * Production Project Server Actions
 *
 * Server-side actions for production project CRUD operations.
 * All actions use FormData for file upload support.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.6: All CRUD operations logged to audit_logs
 *
 * Pattern: Uses db for writes (with RLS), adminDb for reads in helpers
 */

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { adminDb, db } from "@/db";
import { titles, users } from "@/db/schema";
import { productionProjects } from "@/db/schema/production-projects";
import { logAuditEvent } from "@/lib/audit";

import {
  createProductionProjectSchema,
  isValidStatusTransition,
  type ProductionStatus,
  updateProductionProjectSchema,
} from "./schema";
import {
  deleteManuscript,
  uploadManuscript,
  validateManuscriptFile,
} from "./storage";
import type { ActionResult } from "./types";

/**
 * Get authenticated user with tenant context
 * Verifies user has owner/admin/editor role
 */
async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    throw new Error("No tenant context");
  }

  if (!["owner", "admin", "editor"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  return user;
}

/**
 * Create production project
 * AC-18.1.1: Select title, set target date, upload manuscript
 * AC-18.1.6: Audit log on create
 */
export async function createProductionProject(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Parse form data
    const input = {
      titleId: formData.get("titleId") as string,
      targetPublicationDate:
        (formData.get("targetPublicationDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    // Validate input
    const validation = createProductionProjectSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Verify title exists and belongs to tenant
    const title = await adminDb.query.titles.findFirst({
      where: and(
        eq(titles.id, input.titleId),
        eq(titles.tenant_id, user.tenant_id),
      ),
    });

    if (!title) {
      return { success: false, message: "Title not found" };
    }

    // Check for existing non-deleted project for this title
    const existing = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.titleId, input.titleId),
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt),
      ),
    });

    if (existing) {
      return {
        success: false,
        message: "A production project already exists for this title",
      };
    }

    // Create project
    const [project] = await db
      .insert(productionProjects)
      .values({
        tenantId: user.tenant_id,
        titleId: input.titleId,
        targetPublicationDate: input.targetPublicationDate,
        notes: input.notes,
        status: "draft",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();

    // Handle manuscript upload if provided
    const file = formData.get("manuscript") as File;
    if (file && file.size > 0) {
      try {
        validateManuscriptFile(file);

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadResult = await uploadManuscript(
          buffer,
          user.tenant_id,
          project.id,
          file.name,
          file.type,
        );

        await db
          .update(productionProjects)
          .set({
            manuscriptFileKey: uploadResult.key,
            manuscriptFileName: uploadResult.fileName,
            manuscriptFileSize: String(uploadResult.fileSize),
            manuscriptUploadedAt: new Date(),
          })
          .where(eq(productionProjects.id, project.id));
      } catch (uploadError) {
        // Log but don't fail the project creation
        console.error("[Production] Manuscript upload failed:", uploadError);
        // Could optionally return a warning message
      }
    }

    // Audit log (fire and forget)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "production_project",
      resourceId: project.id,
      changes: {
        after: {
          titleId: input.titleId,
          targetPublicationDate: input.targetPublicationDate,
          status: "draft",
        },
      },
    });

    revalidatePath("/production");
    return { success: true, id: project.id };
  } catch (error) {
    console.error("[Production] Create failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * Update production project
 * AC-18.1.5: Edit project details
 * AC-18.1.6: Audit log on update
 */
export async function updateProductionProject(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Parse form data
    const input = {
      targetPublicationDate:
        (formData.get("targetPublicationDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    // Validate input
    const validation = updateProductionProjectSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get existing project
    const project = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.id, projectId),
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt),
      ),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Update project
    await db
      .update(productionProjects)
      .set({
        targetPublicationDate: input.targetPublicationDate,
        notes: input.notes,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(productionProjects.id, projectId));

    // Handle manuscript upload if provided
    const file = formData.get("manuscript") as File;
    if (file && file.size > 0) {
      try {
        validateManuscriptFile(file);

        // Delete old manuscript if exists
        if (project.manuscriptFileKey) {
          await deleteManuscript(project.manuscriptFileKey);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadResult = await uploadManuscript(
          buffer,
          user.tenant_id,
          projectId,
          file.name,
          file.type,
        );

        await db
          .update(productionProjects)
          .set({
            manuscriptFileKey: uploadResult.key,
            manuscriptFileName: uploadResult.fileName,
            manuscriptFileSize: String(uploadResult.fileSize),
            manuscriptUploadedAt: new Date(),
          })
          .where(eq(productionProjects.id, projectId));
      } catch (uploadError) {
        console.error("[Production] Manuscript upload failed:", uploadError);
      }
    }

    // Audit log
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "production_project",
      resourceId: projectId,
      changes: {
        before: {
          targetPublicationDate: project.targetPublicationDate,
          notes: project.notes,
        },
        after: {
          targetPublicationDate: input.targetPublicationDate,
          notes: input.notes,
        },
      },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Update failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

/**
 * Update production project status
 * AC-18.1.2: Valid status transitions only
 * AC-18.1.6: Audit log on status change
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: ProductionStatus,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Get existing project
    const project = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.id, projectId),
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt),
      ),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Validate status transition
    if (
      !isValidStatusTransition(project.status as ProductionStatus, newStatus)
    ) {
      return {
        success: false,
        message: `Cannot transition from ${project.status} to ${newStatus}`,
      };
    }

    // Update status
    await db
      .update(productionProjects)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(productionProjects.id, projectId));

    // Audit log
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "production_project",
      resourceId: projectId,
      changes: {
        before: { status: project.status },
        after: { status: newStatus },
      },
      metadata: { action: "status_change" },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Status update failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Delete production project (soft delete)
 * AC-18.1.6: Audit log on delete
 */
export async function deleteProductionProject(
  projectId: string,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Only owner/admin can delete
    if (!["owner", "admin"].includes(user.role)) {
      return { success: false, message: "Only admins can delete projects" };
    }

    // Get existing project
    const project = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.id, projectId),
        eq(productionProjects.tenantId, user.tenant_id),
      ),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Soft delete
    await db
      .update(productionProjects)
      .set({
        deletedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(productionProjects.id, projectId));

    // Audit log
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "DELETE",
      resourceType: "production_project",
      resourceId: projectId,
      changes: {
        before: {
          titleId: project.titleId,
          status: project.status,
        },
      },
    });

    revalidatePath("/production");
    return { success: true };
  } catch (error) {
    console.error("[Production] Delete failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}

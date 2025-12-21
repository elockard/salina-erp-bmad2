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
import { productionTasks } from "@/db/schema/production-tasks";
import { titleAuthors } from "@/db/schema/title-authors";
import { logAuditEvent } from "@/lib/audit";
import { contactHasRole } from "@/modules/contacts/queries";
import { createProductionMilestoneNotification } from "@/modules/notifications/service";
import { sendProofCorrectionEmail } from "./proof-email-service";
import {
  approveProofSchema,
  createProductionProjectSchema,
  createProductionTaskSchema,
  isValidStatusTransition,
  isValidTaskStatusTransition,
  isValidWorkflowTransition,
  type ProductionStatus,
  requestCorrectionsSchema,
  type TaskStatus,
  updateProductionProjectSchema,
  updateProductionTaskSchema,
  type WorkflowStage,
  type WorkflowStageHistoryEntry,
} from "./schema";
import {
  deleteManuscript,
  uploadManuscript,
  validateManuscriptFile,
} from "./storage";
import { sendTaskAssignmentEmail } from "./task-email-service";
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

// =============================================================================
// Production Task Actions (Story 18.2)
// =============================================================================

/**
 * Create production task
 * AC-18.2.1: Create task with type, name, optional vendor, optional due date
 * AC-18.2.3: Vendor must be contact with vendor role
 * AC-18.2.4: Send email notification when vendor assigned
 * AC-18.2.7: Audit log on create
 */
export async function createProductionTask(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Parse form data
    const input = {
      projectId: formData.get("projectId") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      taskType: formData.get("taskType") as string,
      vendorId: (formData.get("vendorId") as string) || null,
      dueDate: (formData.get("dueDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    // Validate input
    const validation = createProductionTaskSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Verify project exists and is not cancelled
    const project = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.id, input.projectId),
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt),
      ),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    if (project.status === "cancelled") {
      return {
        success: false,
        message: "Cannot add tasks to cancelled projects",
      };
    }

    // Validate vendor if provided (AC-18.2.3)
    if (input.vendorId) {
      const hasVendorRole = await contactHasRole(input.vendorId, "vendor");
      if (!hasVendorRole) {
        return {
          success: false,
          message: "Selected contact is not a vendor",
        };
      }
    }

    // Create task
    const [task] = await db
      .insert(productionTasks)
      .values({
        tenantId: user.tenant_id,
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        taskType: input.taskType as
          | "editing"
          | "design"
          | "proofing"
          | "printing"
          | "other",
        vendorId: input.vendorId,
        dueDate: input.dueDate,
        notes: input.notes,
        status: "pending",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();

    // Send vendor notification if assigned (AC-18.2.4)
    let emailSent: boolean | undefined;
    if (input.vendorId) {
      try {
        const emailResult = await sendTaskAssignmentEmail({
          taskId: task.id,
          tenantId: user.tenant_id,
        });
        emailSent = emailResult.success;
        if (!emailResult.success) {
          console.error("[Production] Task email failed:", emailResult.error);
        }
      } catch (err) {
        emailSent = false;
        console.error("[Production] Task email failed:", err);
      }
    }

    // Audit log (AC-18.2.7)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "production_task",
      resourceId: task.id,
      changes: {
        after: {
          projectId: input.projectId,
          name: input.name,
          taskType: input.taskType,
          vendorId: input.vendorId,
          status: "pending",
        },
      },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${input.projectId}`);
    return { success: true, id: task.id, emailSent };
  } catch (error) {
    console.error("[Production] Create task failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

/**
 * Update production task
 * AC-18.2.6: Edit name, type, vendor, due date, notes
 * AC-18.2.4: Send email notification if vendor changed
 * AC-18.2.7: Audit log on update
 */
export async function updateProductionTask(
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Parse form data
    const input = {
      name: (formData.get("name") as string) || undefined,
      description: formData.has("description")
        ? (formData.get("description") as string) || null
        : undefined,
      taskType: (formData.get("taskType") as string) || undefined,
      vendorId: formData.has("vendorId")
        ? (formData.get("vendorId") as string) || null
        : undefined,
      dueDate: formData.has("dueDate")
        ? (formData.get("dueDate") as string) || null
        : undefined,
      notes: formData.has("notes")
        ? (formData.get("notes") as string) || null
        : undefined,
    };

    // Validate input
    const validation = updateProductionTaskSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get existing task
    const task = await adminDb.query.productionTasks.findFirst({
      where: and(
        eq(productionTasks.id, taskId),
        eq(productionTasks.tenantId, user.tenant_id),
        isNull(productionTasks.deletedAt),
      ),
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    // Validate vendor if changed (AC-18.2.3)
    const vendorChanged =
      input.vendorId !== undefined && input.vendorId !== task.vendorId;
    if (vendorChanged && input.vendorId) {
      const hasVendorRole = await contactHasRole(input.vendorId, "vendor");
      if (!hasVendorRole) {
        return {
          success: false,
          message: "Selected contact is not a vendor",
        };
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.taskType !== undefined) updateData.taskType = input.taskType;
    if (input.vendorId !== undefined) updateData.vendorId = input.vendorId;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Update task
    await db
      .update(productionTasks)
      .set(updateData)
      .where(eq(productionTasks.id, taskId));

    // Send email if vendor changed to a new vendor (AC-18.2.4)
    let emailSent: boolean | undefined;
    if (vendorChanged && input.vendorId) {
      try {
        const emailResult = await sendTaskAssignmentEmail({
          taskId,
          tenantId: user.tenant_id,
        });
        emailSent = emailResult.success;
        if (!emailResult.success) {
          console.error("[Production] Task email failed:", emailResult.error);
        }
      } catch (err) {
        emailSent = false;
        console.error("[Production] Task email failed:", err);
      }
    }

    // Audit log (AC-18.2.7)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "production_task",
      resourceId: taskId,
      changes: {
        before: {
          name: task.name,
          taskType: task.taskType,
          vendorId: task.vendorId,
          dueDate: task.dueDate,
        },
        after: {
          name: input.name ?? task.name,
          taskType: input.taskType ?? task.taskType,
          vendorId: input.vendorId ?? task.vendorId,
          dueDate: input.dueDate ?? task.dueDate,
        },
      },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${task.projectId}`);
    return { success: true, emailSent };
  } catch (error) {
    console.error("[Production] Update task failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

/**
 * Update task status
 * AC-18.2.2: Valid status transitions only
 * AC-18.2.7: Audit log on status change
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Get existing task
    const task = await adminDb.query.productionTasks.findFirst({
      where: and(
        eq(productionTasks.id, taskId),
        eq(productionTasks.tenantId, user.tenant_id),
        isNull(productionTasks.deletedAt),
      ),
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    // Validate status transition (AC-18.2.2)
    if (!isValidTaskStatusTransition(task.status as TaskStatus, newStatus)) {
      return {
        success: false,
        message: `Cannot transition from ${task.status} to ${newStatus}`,
      };
    }

    // Update status
    await db
      .update(productionTasks)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(productionTasks.id, taskId));

    // Audit log (AC-18.2.7)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "production_task",
      resourceId: taskId,
      changes: {
        before: { status: task.status },
        after: { status: newStatus },
      },
      metadata: { action: "status_change" },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${task.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Task status update failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update task status",
    };
  }
}

/**
 * Delete production task (soft delete)
 * AC-18.2.6: Delete task
 * AC-18.2.7: Audit log on delete
 */
export async function deleteProductionTask(
  taskId: string,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Get existing task
    const task = await adminDb.query.productionTasks.findFirst({
      where: and(
        eq(productionTasks.id, taskId),
        eq(productionTasks.tenantId, user.tenant_id),
        isNull(productionTasks.deletedAt),
      ),
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    // Soft delete
    await db
      .update(productionTasks)
      .set({
        deletedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(productionTasks.id, taskId));

    // Audit log (AC-18.2.7)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "DELETE",
      resourceType: "production_task",
      resourceId: taskId,
      changes: {
        before: {
          name: task.name,
          projectId: task.projectId,
          status: task.status,
        },
      },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${task.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Delete task failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

// =============================================================================
// Workflow Stage Actions (Story 18.3)
// =============================================================================

/**
 * Notify all authors of a title when a production milestone is reached.
 * Story 21.4 - AC 21.4.1, AC 21.4.2: Send notifications to credited authors.
 *
 * This is called asynchronously after stage transitions to avoid blocking.
 * Errors are logged but never thrown to avoid affecting production operations.
 */
async function notifyAuthorsOfMilestone(
  projectId: string,
  titleId: string,
  previousStage: WorkflowStage,
  newStage: WorkflowStage,
  tenantId: string,
): Promise<void> {
  try {
    // Get title name for notification
    const title = await adminDb.query.titles.findFirst({
      where: eq(titles.id, titleId),
    });

    if (!title) {
      console.warn(
        `[Production] Title ${titleId} not found for milestone notification`,
      );
      return;
    }

    // Get all authors for this title via title_authors
    const authorLinks = await adminDb.query.titleAuthors.findMany({
      where: eq(titleAuthors.title_id, titleId),
      with: {
        contact: true,
      },
    });

    // Notify each author
    for (const link of authorLinks) {
      const contact = link.contact;
      if (!contact || contact.status !== "active") continue;

      // Look up portal user for email and userId if author has portal access
      let userEmail: string | undefined;
      let portalUserId: string | undefined;

      if (contact.portal_user_id) {
        const portalUser = await adminDb.query.users.findFirst({
          where: eq(users.clerk_user_id, contact.portal_user_id),
        });
        userEmail = portalUser?.email ?? undefined;
        portalUserId = portalUser?.id; // AC 21.4.2: Scope notification to this author
      }

      // Fallback to contact email if no portal user email
      if (!userEmail && contact.email) {
        userEmail = contact.email;
      }

      const userName = `${contact.first_name} ${contact.last_name}`;

      // Create notification for this author (scoped to their userId for AC 21.4.2)
      await createProductionMilestoneNotification(
        {
          tenantId,
          contactId: contact.id,
          titleId,
          titleName: title.title,
          projectId,
          previousStage,
          newStage,
        },
        {
          userEmail,
          userName,
          userId: portalUserId, // Scope notification to author's user account
        },
      );
    }
  } catch (error) {
    // Log but never throw - notifications should not affect production operations
    console.error(
      `[Production] Failed to notify authors for project ${projectId}:`,
      error,
    );
  }
}

/**
 * Update workflow stage via drag-drop on production board
 * AC-18.3.3: Validate adjacent stage transition (+-1 only)
 * AC-18.3.4: Log transition to audit_logs and workflow_stage_history
 */
export async function updateWorkflowStage(
  projectId: string,
  newStage: WorkflowStage,
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

    // Cannot change stage of cancelled project (AC-18.3.2)
    if (project.status === "cancelled") {
      return {
        success: false,
        message: "Cannot change stage of cancelled project",
      };
    }

    // Validate transition (AC-18.3.3: only +-1 stage allowed)
    const currentStage = project.workflowStage as WorkflowStage;
    if (!isValidWorkflowTransition(currentStage, newStage)) {
      return {
        success: false,
        message: "Cannot skip stages. Move one stage at a time.",
      };
    }

    // Create history entry (AC-18.3.4)
    const historyEntry: WorkflowStageHistoryEntry = {
      from: currentStage,
      to: newStage,
      timestamp: new Date().toISOString(),
      userId: user.id,
    };

    const existingHistory = (project.workflowStageHistory ||
      []) as WorkflowStageHistoryEntry[];
    const newHistory = [...existingHistory, historyEntry];

    // Update project
    await db
      .update(productionProjects)
      .set({
        workflowStage: newStage,
        stageEnteredAt: new Date(),
        workflowStageHistory: newHistory,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(productionProjects.id, projectId));

    // Audit log (AC-18.3.4)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "STAGE_TRANSITION",
      resourceType: "production_project",
      resourceId: projectId,
      changes: {
        before: { workflow_stage: currentStage },
        after: { workflow_stage: newStage },
      },
    });

    // Story 21.4: Fire author notifications asynchronously (AC-21.4.1, AC-21.4.2)
    // Don't await - notifications should not block the stage transition
    notifyAuthorsOfMilestone(
      projectId,
      project.titleId,
      currentStage,
      newStage,
      user.tenant_id,
    ).catch((err) =>
      console.error("[Production] Author notification failed:", err),
    );

    revalidatePath("/production/board");
    revalidatePath(`/production/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Workflow stage update failed:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update workflow stage",
    };
  }
}

// =============================================================================
// Proof File Actions (Story 18.4)
// =============================================================================

import { max } from "drizzle-orm";
import { proofFiles } from "@/db/schema/proof-files";
import { updateProofNotesSchema, uploadProofFileSchema } from "./schema";
import { uploadProofToS3, validateProofFile } from "./storage";

/**
 * Upload proof file with auto-versioning
 * AC-18.4.1: Upload proof file with version number
 * AC-18.4.8: Audit log on upload
 */
export async function uploadProofFile(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Parse form data
    const input = {
      projectId: formData.get("projectId") as string,
      notes: (formData.get("notes") as string) || null,
    };

    // Validate input
    const validation = uploadProofFileSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get file from form data
    const file = formData.get("proofFile") as File;
    if (!file || file.size === 0) {
      return { success: false, message: "No file provided" };
    }

    // Validate file type and size
    try {
      validateProofFile(file);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Invalid file",
      };
    }

    // Verify project exists and belongs to tenant
    const project = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.id, input.projectId),
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt),
      ),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Calculate next version number
    // CRITICAL: Do NOT filter by deletedAt - versions must be strictly incrementing
    // If v1, v2, v3 exist and v2 is deleted, next upload must be v4, not v3
    const maxVersionResult = await adminDb
      .select({ maxVersion: max(proofFiles.version) })
      .from(proofFiles)
      .where(eq(proofFiles.projectId, input.projectId));

    const nextVersion = (maxVersionResult[0]?.maxVersion ?? 0) + 1;

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadProofToS3(
      buffer,
      user.tenant_id,
      input.projectId,
      nextVersion,
      file.name,
      file.type,
    );

    // Create proof file record
    const [proofFile] = await db
      .insert(proofFiles)
      .values({
        tenantId: user.tenant_id,
        projectId: input.projectId,
        version: nextVersion,
        fileKey: uploadResult.key,
        fileName: uploadResult.fileName,
        fileSize: String(uploadResult.fileSize),
        mimeType: file.type,
        notes: input.notes,
        uploadedBy: user.id,
      })
      .returning();

    // Audit log (AC-18.4.8)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "proof_file",
      resourceId: proofFile.id,
      changes: {
        after: {
          projectId: input.projectId,
          version: nextVersion,
          fileName: file.name,
          fileSize: uploadResult.fileSize,
        },
      },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${input.projectId}`);
    return { success: true, id: proofFile.id, version: nextVersion };
  } catch (error) {
    console.error("[Production] Upload proof failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to upload proof",
    };
  }
}

/**
 * Update proof file notes
 * AC-18.4.5: Edit notes for a proof version
 * AC-18.4.8: Audit log on update
 */
export async function updateProofNotes(
  proofId: string,
  notes: string | null,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Validate input
    const validation = updateProofNotesSchema.safeParse({ notes });
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get existing proof file
    const proof = await adminDb.query.proofFiles.findFirst({
      where: and(
        eq(proofFiles.id, proofId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    });

    if (!proof) {
      return { success: false, message: "Proof file not found" };
    }

    const previousNotes = proof.notes;

    // Update notes
    await db
      .update(proofFiles)
      .set({ notes })
      .where(eq(proofFiles.id, proofId));

    // Audit log (AC-18.4.8)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "proof_file",
      resourceId: proofId,
      changes: {
        before: { notes: previousNotes },
        after: { notes },
      },
    });

    revalidatePath(`/production/${proof.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Update proof notes failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update notes",
    };
  }
}

/**
 * Delete proof file (soft delete)
 * AC-18.4.6: Soft delete, retain S3 file, log to audit
 */
export async function deleteProofFile(proofId: string): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Only owner/admin can delete
    if (!["owner", "admin"].includes(user.role)) {
      return { success: false, message: "Only admins can delete proof files" };
    }

    // Get existing proof file
    const proof = await adminDb.query.proofFiles.findFirst({
      where: and(
        eq(proofFiles.id, proofId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    });

    if (!proof) {
      return { success: false, message: "Proof file not found" };
    }

    // Soft delete (AC-18.4.6: S3 file is NOT deleted for compliance)
    await db
      .update(proofFiles)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(proofFiles.id, proofId));

    // Audit log (AC-18.4.8)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "DELETE",
      resourceType: "proof_file",
      resourceId: proofId,
      changes: {
        before: {
          version: proof.version,
          fileName: proof.fileName,
          projectId: proof.projectId,
        },
      },
    });

    revalidatePath(`/production/${proof.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Delete proof failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete proof",
    };
  }
}

// ============================================================================
// Proof Approval Actions (Story 18.5)
// ============================================================================

/**
 * Approve a proof and move project to print_ready stage
 * AC-18.5.1: Approve proof, transition workflow stage
 * AC-18.5.6: Audit logging for approval
 */
export async function approveProof(proofId: string): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Validate input
    const validation = approveProofSchema.safeParse({ proofId });
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get proof and verify tenant
    const proof = await adminDb.query.proofFiles.findFirst({
      where: and(
        eq(proofFiles.id, proofId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    });

    if (!proof) {
      return { success: false, message: "Proof not found" };
    }

    // Get project and verify it's in proof stage
    const project = await adminDb.query.productionProjects.findFirst({
      where: eq(productionProjects.id, proof.projectId),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    if (project.workflowStage !== "proof") {
      return {
        success: false,
        message: "Project must be in proof stage to approve",
      };
    }

    // Update proof approval status
    await db
      .update(proofFiles)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        approvedBy: user.id,
      })
      .where(eq(proofFiles.id, proofId));

    // Transition project to print_ready stage (AC-18.5.1)
    const currentHistory =
      (project.workflowStageHistory as WorkflowStageHistoryEntry[]) || [];
    const newHistory: WorkflowStageHistoryEntry[] = [
      ...currentHistory,
      {
        from: "proof" as WorkflowStage,
        to: "print_ready" as WorkflowStage,
        timestamp: new Date().toISOString(),
        userId: user.id,
      },
    ];

    await db
      .update(productionProjects)
      .set({
        workflowStage: "print_ready",
        stageEnteredAt: new Date(),
        workflowStageHistory: newHistory,
      })
      .where(eq(productionProjects.id, proof.projectId));

    // Audit log (AC-18.5.6)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "proof_file",
      resourceId: proofId,
      changes: {
        before: { approvalStatus: "pending", workflowStage: "proof" },
        after: { approvalStatus: "approved", workflowStage: "print_ready" },
      },
    });

    revalidatePath("/production");
    revalidatePath("/production/board");
    revalidatePath(`/production/${proof.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Approve proof failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to approve proof",
    };
  }
}

/**
 * Request corrections on a proof
 * AC-18.5.2: Request corrections with required notes
 * AC-18.5.3: Vendor email notification (handled separately)
 * AC-18.5.6: Audit logging for correction request
 */
export async function requestProofCorrections(
  proofId: string,
  notes: string,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Validate input
    const validation = requestCorrectionsSchema.safeParse({ proofId, notes });
    if (!validation.success) {
      return { success: false, message: validation.error.issues[0]?.message };
    }

    // Get proof and verify tenant
    const proof = await adminDb.query.proofFiles.findFirst({
      where: and(
        eq(proofFiles.id, proofId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    });

    if (!proof) {
      return { success: false, message: "Proof not found" };
    }

    // Get project and verify it's in proof stage
    const project = await adminDb.query.productionProjects.findFirst({
      where: eq(productionProjects.id, proof.projectId),
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    if (project.workflowStage !== "proof") {
      return {
        success: false,
        message: "Project must be in proof stage to request corrections",
      };
    }

    // Update proof approval status and notes
    await db
      .update(proofFiles)
      .set({
        approvalStatus: "corrections_requested",
        approvalNotes: notes,
        approvedAt: new Date(),
        approvedBy: user.id,
      })
      .where(eq(proofFiles.id, proofId));

    // Project stays in "proof" stage - no stage transition

    // Audit log (AC-18.5.6)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "proof_file",
      resourceId: proofId,
      changes: {
        before: { approvalStatus: "pending" },
        after: {
          approvalStatus: "corrections_requested",
          approvalNotes: notes,
        },
      },
    });

    // Send vendor notification email (AC-18.5.3)
    let emailSent = false;
    let emailWarning: string | undefined;
    try {
      const emailResult = await sendProofCorrectionEmail({
        proofId,
        tenantId: user.tenant_id,
        requestedByUserId: user.id,
        correctionNotes: notes,
      });
      emailSent = emailResult.success && !emailResult.warning;
      emailWarning = emailResult.warning;
    } catch (emailError) {
      // Log but don't fail the action if email fails
      console.error("[Production] Correction email failed:", emailError);
    }

    revalidatePath("/production");
    revalidatePath("/production/board");
    revalidatePath(`/production/${proof.projectId}`);

    return { success: true, id: proof.projectId, emailSent, emailWarning };
  } catch (error) {
    console.error("[Production] Request corrections failed:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to request corrections",
    };
  }
}

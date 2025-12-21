/**
 * Task Assignment Email Service
 *
 * Handles sending task assignment emails to vendors.
 * Fetches task data, renders email template, and sends via Resend.
 *
 * Story: 18.2 - Assign Production Tasks to Vendors
 * Task 4.2-4.3: Create email service with Resend integration
 * AC-18.2.4: Email notification when task assigned
 */

import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { productionProjects } from "@/db/schema/production-projects";
import { productionTasks } from "@/db/schema/production-tasks";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { getDefaultFromEmail, sendEmail } from "@/lib/email";
import {
  generateTaskEmailSubject,
  renderTaskAssignmentEmail,
  type TaskAssignmentEmailProps,
} from "./task-assignment-email";

/**
 * Result from sending a task assignment email
 */
export interface TaskEmailResult {
  /** Whether email was sent successfully */
  success: boolean;
  /** Resend message ID (on success) */
  messageId?: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Parameters for sending a task assignment email
 */
export interface SendTaskAssignmentEmailParams {
  /** Task ID to send notification for */
  taskId: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
}

/**
 * Send a task assignment email to a vendor
 *
 * Fetches all necessary data (task, vendor, project, title, tenant) and sends
 * an email notification to the vendor.
 *
 * AC-18.2.4: Email includes task name, due date, project/title info
 *
 * @param params - Email parameters including taskId and tenantId
 * @returns Result with messageId on success, error on failure
 */
export async function sendTaskAssignmentEmail(
  params: SendTaskAssignmentEmailParams,
): Promise<TaskEmailResult> {
  const { taskId, tenantId } = params;

  try {
    // Step 1: Fetch task
    const task = await adminDb.query.productionTasks.findFirst({
      where: eq(productionTasks.id, taskId),
    });

    if (!task) {
      return {
        success: false,
        error: `Task not found: ${taskId}`,
      };
    }

    if (task.tenantId !== tenantId) {
      return {
        success: false,
        error: "Task does not belong to tenant",
      };
    }

    // Validate vendor is assigned
    if (!task.vendorId) {
      return {
        success: false,
        error: "No vendor assigned to task",
      };
    }

    // Step 2: Fetch vendor contact
    const vendor = await adminDb.query.contacts.findFirst({
      where: eq(contacts.id, task.vendorId),
    });

    if (!vendor) {
      return {
        success: false,
        error: `Vendor not found: ${task.vendorId}`,
      };
    }

    if (!vendor.email) {
      return {
        success: false,
        error: `Vendor ${vendor.first_name} ${vendor.last_name} has no email address`,
      };
    }

    // Step 3: Fetch project and title
    const project = await adminDb.query.productionProjects.findFirst({
      where: eq(productionProjects.id, task.projectId),
    });

    if (!project) {
      return {
        success: false,
        error: `Project not found: ${task.projectId}`,
      };
    }

    const title = await adminDb.query.titles.findFirst({
      where: eq(titles.id, project.titleId),
    });

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

    // Step 5: Prepare email template data
    const vendorName = `${vendor.first_name} ${vendor.last_name}`.trim();
    const projectTitle = title?.title || "Unknown Title";

    const templateProps: TaskAssignmentEmailProps = {
      vendorName,
      taskName: task.name,
      taskType: task.taskType,
      dueDate: task.dueDate
        ? format(new Date(task.dueDate), "MMM d, yyyy")
        : undefined,
      projectTitle,
      publisherName: tenant.name,
      notes: task.notes || undefined,
    };

    // Step 6: Render email HTML
    const html = await renderTaskAssignmentEmail(templateProps);
    const subject = generateTaskEmailSubject(task.name, tenant.name);

    // Step 7: Send via Resend
    const emailResult = await sendEmail({
      from: getDefaultFromEmail(),
      to: vendor.email,
      subject,
      html,
      tags: [
        { name: "type", value: "task-assignment" },
        { name: "tenant", value: tenantId },
        { name: "task", value: taskId },
      ],
    });

    if (!emailResult.success) {
      console.error(
        `[TaskEmail] Failed to send task ${taskId}:`,
        emailResult.error,
      );
      return {
        success: false,
        error: emailResult.error,
      };
    }

    console.log(
      `[TaskEmail] Sent task ${taskId} to ${vendor.email}: ${emailResult.messageId}`,
    );

    return {
      success: true,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email service error";
    console.error(`[TaskEmail] Error sending task ${taskId}:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

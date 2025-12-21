/**
 * Production Project Queries
 *
 * Read-only queries for production projects.
 * Uses adminDb to bypass RLS (server-side verified).
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.4: View list with filters
 * AC-18.1.5: View detail with manuscript download
 * AC-18.1.6: Tenant isolation
 */

import { auth } from "@clerk/nextjs/server";
import { differenceInDays } from "date-fns";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";

import { adminDb } from "@/db";
import { contacts, tenants, titles, users } from "@/db/schema";
import { productionProjects } from "@/db/schema/production-projects";
import { productionTasks } from "@/db/schema/production-tasks";
import { titleAuthors } from "@/db/schema/title-authors";
// Import getContactsByRole for internal use and re-export for other modules
import { getContactsByRole } from "@/modules/contacts/queries";
import type { ProductionStatus, TaskStatus, WorkflowStage } from "./schema";
import { formatFileSize, getManuscriptDownloadUrl } from "./storage";
import type {
  AuthorProductionProject,
  BoardProjectCard,
  LabelData,
  ProductionBoardData,
  ProductionProjectWithTitle,
  ProductionTaskWithVendor,
  TitleOption,
  VendorOption,
} from "./types";
export { getContactsByRole };

/**
 * Get current user with tenant context
 */
async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  return user;
}

/**
 * Get production projects list
 * AC-18.1.4: View list with status filter and title search
 */
export async function getProductionProjects(filter?: {
  status?: ProductionStatus;
  search?: string;
}): Promise<ProductionProjectWithTitle[]> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return [];

  // Build where clause
  let whereClause = and(
    eq(productionProjects.tenantId, user.tenant_id),
    isNull(productionProjects.deletedAt),
  );

  // Apply status filter
  if (filter?.status) {
    whereClause = and(
      whereClause,
      eq(productionProjects.status, filter.status),
    );
  }

  // Fetch projects with title relation
  const projects = await adminDb.query.productionProjects.findMany({
    where: whereClause,
    with: {
      title: {
        columns: {
          id: true,
          title: true,
          isbn: true,
        },
      },
    },
    orderBy: [
      asc(productionProjects.targetPublicationDate),
      desc(productionProjects.createdAt),
    ],
  });

  // Apply search filter (on title name, client-side for now)
  let filteredProjects = projects;
  if (filter?.search) {
    const searchLower = filter.search.toLowerCase();
    filteredProjects = projects.filter((p) =>
      p.title?.title?.toLowerCase().includes(searchLower),
    );
  }

  // Map to response type
  return filteredProjects.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    titleId: p.titleId,
    titleName: p.title?.title ?? "Unknown Title",
    isbn13: p.title?.isbn,
    targetPublicationDate: p.targetPublicationDate,
    status: p.status as ProductionStatus,
    manuscriptFileName: p.manuscriptFileName,
    manuscriptFileSize: p.manuscriptFileSize,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

/**
 * Get single production project by ID
 * AC-18.1.5: View detail with manuscript download URL
 */
export async function getProductionProject(
  projectId: string,
): Promise<ProductionProjectWithTitle | null> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return null;

  const project = await adminDb.query.productionProjects.findFirst({
    where: and(
      eq(productionProjects.id, projectId),
      eq(productionProjects.tenantId, user.tenant_id),
      isNull(productionProjects.deletedAt),
    ),
    with: {
      title: {
        columns: {
          id: true,
          title: true,
          isbn: true,
        },
      },
    },
  });

  if (!project) return null;

  // Generate download URL if manuscript exists
  let manuscriptDownloadUrl: string | undefined;
  if (project.manuscriptFileKey) {
    try {
      manuscriptDownloadUrl = await getManuscriptDownloadUrl(
        project.manuscriptFileKey,
      );
    } catch (error) {
      console.error("[Production] Failed to get download URL:", error);
    }
  }

  return {
    id: project.id,
    tenantId: project.tenantId,
    titleId: project.titleId,
    titleName: project.title?.title ?? "Unknown Title",
    isbn13: project.title?.isbn,
    targetPublicationDate: project.targetPublicationDate,
    status: project.status as ProductionStatus,
    manuscriptFileName: project.manuscriptFileName,
    manuscriptFileSize: project.manuscriptFileSize,
    manuscriptDownloadUrl,
    notes: project.notes,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Get production projects count
 * For dashboard widgets
 */
export async function getProductionProjectsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return 0;

  const result = await adminDb
    .select({ count: count() })
    .from(productionProjects)
    .where(
      and(
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

/**
 * Get in-progress production projects count
 * For dashboard widgets
 */
export async function getInProgressProjectsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return 0;

  const result = await adminDb
    .select({ count: count() })
    .from(productionProjects)
    .where(
      and(
        eq(productionProjects.tenantId, user.tenant_id),
        eq(productionProjects.status, "in-progress"),
        isNull(productionProjects.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

/**
 * Get titles available for production projects
 * (titles that don't already have an active production project)
 */
export async function getAvailableTitlesForProduction(): Promise<
  TitleOption[]
> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return [];

  // Get all tenant titles
  const allTitles = await adminDb.query.titles.findMany({
    where: eq(titles.tenant_id, user.tenant_id),
    columns: {
      id: true,
      title: true,
      isbn: true,
    },
    orderBy: asc(titles.title),
  });

  // Get titles that already have active production projects
  const existingProjects = await adminDb.query.productionProjects.findMany({
    where: and(
      eq(productionProjects.tenantId, user.tenant_id),
      isNull(productionProjects.deletedAt),
    ),
    columns: {
      titleId: true,
    },
  });

  const usedTitleIds = new Set(existingProjects.map((p) => p.titleId));

  // Return titles not already in production
  return allTitles
    .filter((t) => !usedTitleIds.has(t.id))
    .map((t) => ({
      id: t.id,
      name: t.title,
      isbn13: t.isbn,
    }));
}

// Re-export formatFileSize for components
export { formatFileSize };

// =============================================================================
// Production Task Queries (Story 18.2)
// =============================================================================

/**
 * Get production tasks for a project
 * AC-18.2.5: Task list with name, type, vendor, due date, status
 */
export async function getProductionTasks(
  projectId: string,
  filter?: { status?: TaskStatus },
): Promise<ProductionTaskWithVendor[]> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return [];

  // Build where clause
  let whereClause = and(
    eq(productionTasks.projectId, projectId),
    eq(productionTasks.tenantId, user.tenant_id),
    isNull(productionTasks.deletedAt),
  );

  // Apply status filter
  if (filter?.status) {
    whereClause = and(whereClause, eq(productionTasks.status, filter.status));
  }

  // Fetch tasks with vendor relation
  const tasks = await adminDb.query.productionTasks.findMany({
    where: whereClause,
    with: {
      vendor: {
        columns: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
    orderBy: [asc(productionTasks.dueDate), desc(productionTasks.createdAt)],
  });

  // Map to response type
  return tasks.map((t) => ({
    id: t.id,
    tenantId: t.tenantId,
    projectId: t.projectId,
    name: t.name,
    description: t.description,
    taskType: t.taskType,
    status: t.status as TaskStatus,
    vendorId: t.vendorId,
    vendorName: t.vendor
      ? `${t.vendor.first_name} ${t.vendor.last_name}`.trim()
      : null,
    vendorEmail: t.vendor?.email ?? null,
    dueDate: t.dueDate,
    notes: t.notes,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/**
 * Get single production task by ID
 */
export async function getProductionTask(
  taskId: string,
): Promise<ProductionTaskWithVendor | null> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return null;

  const task = await adminDb.query.productionTasks.findFirst({
    where: and(
      eq(productionTasks.id, taskId),
      eq(productionTasks.tenantId, user.tenant_id),
      isNull(productionTasks.deletedAt),
    ),
    with: {
      vendor: {
        columns: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
  });

  if (!task) return null;

  return {
    id: task.id,
    tenantId: task.tenantId,
    projectId: task.projectId,
    name: task.name,
    description: task.description,
    taskType: task.taskType,
    status: task.status as TaskStatus,
    vendorId: task.vendorId,
    vendorName: task.vendor
      ? `${task.vendor.first_name} ${task.vendor.last_name}`.trim()
      : null,
    vendorEmail: task.vendor?.email ?? null,
    dueDate: task.dueDate,
    notes: task.notes,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/**
 * Get production tasks count for a project
 */
export async function getProductionTasksCount(
  projectId: string,
): Promise<number> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return 0;

  const result = await adminDb
    .select({ count: count() })
    .from(productionTasks)
    .where(
      and(
        eq(productionTasks.projectId, projectId),
        eq(productionTasks.tenantId, user.tenant_id),
        isNull(productionTasks.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

/**
 * Get vendor options for task assignment dropdown
 * AC-18.2.3: Only active contacts with vendor role
 *
 * Uses getContactsByRole from contacts module (DO NOT duplicate)
 */
export async function getVendorOptions(): Promise<VendorOption[]> {
  const vendors = await getContactsByRole("vendor");

  return vendors.map((v) => {
    const vendorRole = v.roles.find((r) => r.role === "vendor");
    const roleData = vendorRole?.role_specific_data as
      | { lead_time_days?: number }
      | null
      | undefined;

    return {
      id: v.id,
      name: `${v.first_name} ${v.last_name}`.trim(),
      email: v.email,
      leadTimeDays: roleData?.lead_time_days ?? null,
    };
  });
}

// =============================================================================
// Production Board Queries (Story 18.3)
// =============================================================================

/**
 * Get production board data grouped by workflow stage
 * AC-18.3.1: Kanban board with columns per stage
 * AC-18.3.5: Filter by date range and search by title
 * AC-18.3.6: Include days in stage and overdue indicator
 */
export async function getProductionBoard(filters?: {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<ProductionBoardData> {
  const user = await getCurrentUser();

  // Initialize empty board if not authenticated
  if (!user?.tenant_id) {
    const emptyStages: Record<WorkflowStage, BoardProjectCard[]> = {
      manuscript_received: [],
      editing: [],
      design: [],
      proof: [],
      print_ready: [],
      complete: [],
    };
    return { stages: emptyStages, filters: filters || {} };
  }

  // Build where conditions
  const conditions: ReturnType<typeof and>[] = [
    eq(productionProjects.tenantId, user.tenant_id),
    isNull(productionProjects.deletedAt),
    ne(productionProjects.status, "cancelled"), // Hide cancelled from board
  ];

  // Date range filters on target_publication_date (AC-18.3.5)
  if (filters?.dateFrom) {
    conditions.push(
      gte(productionProjects.targetPublicationDate, filters.dateFrom),
    );
  }
  if (filters?.dateTo) {
    conditions.push(
      lte(productionProjects.targetPublicationDate, filters.dateTo),
    );
  }

  // Search filter on title name (AC-18.3.5)
  if (filters?.search) {
    conditions.push(ilike(titles.title, `%${filters.search}%`));
  }

  // Fetch projects with title info
  const projects = await adminDb
    .select({
      id: productionProjects.id,
      workflowStage: productionProjects.workflowStage,
      stageEnteredAt: productionProjects.stageEnteredAt,
      targetPublicationDate: productionProjects.targetPublicationDate,
      titleName: titles.title,
      isbn13: titles.isbn,
    })
    .from(productionProjects)
    .innerJoin(titles, eq(productionProjects.titleId, titles.id))
    .where(and(...conditions))
    .orderBy(asc(productionProjects.stageEnteredAt));

  // Get task counts for each project (AC-18.3.6)
  const projectIds = projects.map((p) => p.id);
  const taskCounts = await getTaskCountsByProject(projectIds, user.tenant_id);

  // Calculate days in stage and group by stage
  const now = new Date();
  const stages: Record<WorkflowStage, BoardProjectCard[]> = {
    manuscript_received: [],
    editing: [],
    design: [],
    proof: [],
    print_ready: [],
    complete: [],
  };

  for (const project of projects) {
    const daysInStage = project.stageEnteredAt
      ? differenceInDays(now, project.stageEnteredAt)
      : 0;

    const taskStat = taskCounts[project.id] || { total: 0, completed: 0 };

    // Overdue if target date passed and not complete (AC-18.3.6)
    const isOverdue =
      project.targetPublicationDate &&
      new Date(project.targetPublicationDate) < now &&
      project.workflowStage !== "complete";

    const workflowStage = project.workflowStage as WorkflowStage;

    stages[workflowStage].push({
      id: project.id,
      titleName: project.titleName,
      isbn13: project.isbn13,
      targetPublicationDate: project.targetPublicationDate,
      workflowStage,
      stageEnteredAt: project.stageEnteredAt,
      daysInStage,
      taskStats: taskStat,
      isOverdue: !!isOverdue,
    });
  }

  return { stages, filters: filters || {} };
}

/**
 * Batch query for task counts by project
 * Returns { [projectId]: { total: number, completed: number } }
 * AC-18.3.6: Task completion progress for board cards
 */
async function getTaskCountsByProject(
  projectIds: string[],
  tenantId: string,
): Promise<Record<string, { total: number; completed: number }>> {
  if (projectIds.length === 0) return {};

  const counts = await adminDb
    .select({
      projectId: productionTasks.projectId,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${productionTasks.status} = 'completed')::int`,
    })
    .from(productionTasks)
    .where(
      and(
        inArray(productionTasks.projectId, projectIds),
        eq(productionTasks.tenantId, tenantId),
        isNull(productionTasks.deletedAt),
      ),
    )
    .groupBy(productionTasks.projectId);

  return Object.fromEntries(
    counts.map((c) => [
      c.projectId,
      { total: c.total, completed: c.completed },
    ]),
  );
}

// =============================================================================
// Proof File Queries (Story 18.4)
// =============================================================================

import { max } from "drizzle-orm";
import { proofFiles } from "@/db/schema/proof-files";
import { getProofDownloadUrl } from "./storage";
import type { ProofFileSummary, ProofFileWithUrl } from "./types";

/**
 * Get all proof files for a project with download URLs
 * AC-18.4.2: Version history view (newest first)
 * AC-18.4.3: Download with custom filename
 */
export async function getProofFiles(
  projectId: string,
): Promise<ProofFileWithUrl[]> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return [];

  const proofs = await adminDb
    .select({
      id: proofFiles.id,
      version: proofFiles.version,
      fileName: proofFiles.fileName,
      fileSize: proofFiles.fileSize,
      mimeType: proofFiles.mimeType,
      fileKey: proofFiles.fileKey,
      notes: proofFiles.notes,
      uploadedAt: proofFiles.uploadedAt,
      uploadedBy: proofFiles.uploadedBy,
      uploaderEmail: users.email,
      // Story 18.5: Approval fields
      approvalStatus: proofFiles.approvalStatus,
      approvalNotes: proofFiles.approvalNotes,
      approvedAt: proofFiles.approvedAt,
      approvedBy: proofFiles.approvedBy,
    })
    .from(proofFiles)
    .innerJoin(users, eq(proofFiles.uploadedBy, users.id))
    .where(
      and(
        eq(proofFiles.projectId, projectId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    )
    .orderBy(desc(proofFiles.version));

  // Generate download URLs with custom filenames (AC-18.4.3)
  // Using Promise.all for parallel generation
  const results: ProofFileWithUrl[] = await Promise.all(
    proofs.map(async (proof) => {
      // Generate download filename: {title}-proof-v{version}.pdf
      const baseName = proof.fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      const downloadFileName = `${baseName}-v${proof.version}.pdf`;

      let downloadUrl = "";
      try {
        downloadUrl = await getProofDownloadUrl(
          proof.fileKey,
          downloadFileName,
        );
      } catch (error) {
        console.error("[Production] Failed to get proof URL:", error);
      }

      return {
        id: proof.id,
        version: proof.version,
        fileName: proof.fileName,
        fileSize: proof.fileSize,
        mimeType: proof.mimeType,
        notes: proof.notes,
        uploadedAt: proof.uploadedAt,
        uploadedBy: proof.uploadedBy,
        uploaderName: proof.uploaderEmail,
        downloadUrl,
        // Story 18.5: Approval fields
        approvalStatus: proof.approvalStatus,
        approvalNotes: proof.approvalNotes,
        approvedAt: proof.approvedAt,
        approvedBy: proof.approvedBy,
      };
    }),
  );

  return results;
}

/**
 * Get latest proof file for preview
 * AC-18.4.4: Preview latest proof inline
 */
export async function getLatestProof(
  projectId: string,
): Promise<ProofFileWithUrl | null> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return null;

  const proof = await adminDb
    .select({
      id: proofFiles.id,
      version: proofFiles.version,
      fileName: proofFiles.fileName,
      fileSize: proofFiles.fileSize,
      mimeType: proofFiles.mimeType,
      fileKey: proofFiles.fileKey,
      notes: proofFiles.notes,
      uploadedAt: proofFiles.uploadedAt,
      uploadedBy: proofFiles.uploadedBy,
      uploaderEmail: users.email,
      // Story 18.5: Approval fields
      approvalStatus: proofFiles.approvalStatus,
      approvalNotes: proofFiles.approvalNotes,
      approvedAt: proofFiles.approvedAt,
      approvedBy: proofFiles.approvedBy,
    })
    .from(proofFiles)
    .innerJoin(users, eq(proofFiles.uploadedBy, users.id))
    .where(
      and(
        eq(proofFiles.projectId, projectId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    )
    .orderBy(desc(proofFiles.version))
    .limit(1);

  if (proof.length === 0) {
    return null;
  }

  const p = proof[0];
  let downloadUrl = "";
  try {
    downloadUrl = await getProofDownloadUrl(
      p.fileKey,
      `${p.fileName.replace(/\.[^/.]+$/, "")}-v${p.version}.pdf`,
    );
  } catch (error) {
    console.error("[Production] Failed to get latest proof URL:", error);
  }

  return {
    id: p.id,
    version: p.version,
    fileName: p.fileName,
    fileSize: p.fileSize,
    mimeType: p.mimeType,
    notes: p.notes,
    uploadedAt: p.uploadedAt,
    uploadedBy: p.uploadedBy,
    uploaderName: p.uploaderEmail,
    downloadUrl,
    // Story 18.5: Approval fields
    approvalStatus: p.approvalStatus,
    approvalNotes: p.approvalNotes,
    approvedAt: p.approvedAt,
    approvedBy: p.approvedBy,
  };
}

/**
 * Get proof file summary for project
 * Used for quick count display without fetching all proofs
 */
export async function getProofFileSummary(
  projectId: string,
): Promise<ProofFileSummary> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) {
    return { totalVersions: 0, latestVersion: null, latestUploadedAt: null };
  }

  const result = await adminDb
    .select({
      totalVersions: sql<number>`count(*)::int`,
      latestVersion: max(proofFiles.version),
      latestUploadedAt: max(proofFiles.uploadedAt),
    })
    .from(proofFiles)
    .where(
      and(
        eq(proofFiles.projectId, projectId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt),
      ),
    );

  return {
    totalVersions: result[0]?.totalVersions ?? 0,
    latestVersion: result[0]?.latestVersion ?? null,
    latestUploadedAt: result[0]?.latestUploadedAt ?? null,
  };
}

// =============================================================================
// Calendar Queries (Story 18.6)
// =============================================================================

import { isBefore, startOfDay } from "date-fns";
import { isNotNull } from "drizzle-orm";
import type { CalendarEvent, CalendarEventType } from "./types";

/**
 * Check if publication date is overdue
 * Uses startOfDay for accurate comparison (today's items are NOT overdue)
 * AC-18.6.3: Overdue highlighting
 * @exported for unit testing
 */
export function isEventOverdue(
  targetDate: string,
  workflowStage: WorkflowStage,
): boolean {
  if (workflowStage === "complete") return false;
  return isBefore(new Date(targetDate), startOfDay(new Date()));
}

/**
 * Check if task is overdue
 * Uses startOfDay for accurate comparison (today's items are NOT overdue)
 * AC-18.6.3: Overdue highlighting
 * @exported for unit testing
 */
export function isTaskOverdue(dueDate: string, status: TaskStatus): boolean {
  if (status === "completed" || status === "cancelled") return false;
  return isBefore(new Date(dueDate), startOfDay(new Date()));
}

/**
 * Get calendar events for production calendar
 * AC-18.6.1: Calendar view with milestone dates (publication + task due dates)
 * AC-18.6.2: Filter by date range
 * AC-18.6.3: Overdue calculation
 *
 * @param dateFrom - Optional start of date range filter
 * @param dateTo - Optional end of date range filter
 * @returns Array of calendar events from projects and tasks
 */
export async function getCalendarEvents(
  dateFrom?: Date,
  dateTo?: Date,
): Promise<CalendarEvent[]> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return [];

  // Build date filter conditions for projects
  const projectConditions = [
    eq(productionProjects.tenantId, user.tenant_id),
    isNull(productionProjects.deletedAt),
    isNotNull(productionProjects.targetPublicationDate),
  ];

  if (dateFrom) {
    projectConditions.push(
      gte(productionProjects.targetPublicationDate, dateFrom.toISOString()),
    );
  }
  if (dateTo) {
    projectConditions.push(
      lte(productionProjects.targetPublicationDate, dateTo.toISOString()),
    );
  }

  // Get projects with target dates - MUST include title relation for name
  const projects = await adminDb.query.productionProjects.findMany({
    where: and(...projectConditions),
    with: {
      title: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Build date filter conditions for tasks
  const taskConditions = [
    eq(productionTasks.tenantId, user.tenant_id),
    isNull(productionTasks.deletedAt),
    isNotNull(productionTasks.dueDate),
  ];

  if (dateFrom) {
    taskConditions.push(gte(productionTasks.dueDate, dateFrom.toISOString()));
  }
  if (dateTo) {
    taskConditions.push(lte(productionTasks.dueDate, dateTo.toISOString()));
  }

  // Get tasks with due dates - MUST include project+title and vendor relations
  const tasks = await adminDb.query.productionTasks.findMany({
    where: and(...taskConditions),
    with: {
      project: {
        with: {
          title: {
            columns: {
              id: true,
              title: true,
            },
          },
        },
      },
      vendor: {
        columns: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  // Transform projects to calendar events
  const projectEvents: CalendarEvent[] = projects
    .filter((p) => p.targetPublicationDate && p.title)
    .map((p) => {
      const pubDate = p.targetPublicationDate as string;
      return {
        id: `pub-${p.id}`,
        title: `📅 Publication: ${p.title?.title ?? "Unknown"}`,
        start: new Date(pubDate),
        end: new Date(pubDate),
        type: "publication_date" as CalendarEventType,
        projectId: p.id,
        projectTitle: p.title?.title ?? "Unknown Title",
        workflowStage: p.workflowStage as WorkflowStage,
        isOverdue: isEventOverdue(pubDate, p.workflowStage as WorkflowStage),
      };
    });

  // Transform tasks to calendar events
  const taskEvents: CalendarEvent[] = tasks
    .filter((t) => t.dueDate && t.project)
    .map((t) => {
      const dueDate = t.dueDate as string;
      const vendorName = t.vendor
        ? `${t.vendor.first_name} ${t.vendor.last_name}`.trim()
        : null;

      return {
        id: `task-${t.id}`,
        title: `📋 ${t.name}`,
        start: new Date(dueDate),
        end: new Date(dueDate),
        type: "task_due_date" as CalendarEventType,
        projectId: t.projectId,
        projectTitle: t.project?.title?.title ?? "Unknown Title",
        workflowStage:
          (t.project?.workflowStage as WorkflowStage) ?? "manuscript_received",
        taskId: t.id,
        vendorName,
        isOverdue: isTaskOverdue(dueDate, t.status as TaskStatus),
      };
    });

  // Combine and return all events
  return [...projectEvents, ...taskEvents];
}

// =============================================================================
// Label Data Queries (Story 18.7)
// =============================================================================

/**
 * Get label data for a production project
 * AC-18.7.5: Access from production project detail
 * AC-18.7.6: Validation of ISBN existence
 *
 * Uses titleAuthors relation for multi-author support (Story 10.1)
 * Falls back to deprecated contact_id if no titleAuthors entry exists
 *
 * @param projectId - Production project ID
 * @returns Label data with ISBN, title, author, publisher or null if no ISBN
 */
export async function getLabelData(
  projectId: string,
): Promise<LabelData | null> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) return null;

  // Get project with title
  const project = await adminDb.query.productionProjects.findFirst({
    where: and(
      eq(productionProjects.id, projectId),
      eq(productionProjects.tenantId, user.tenant_id),
      isNull(productionProjects.deletedAt),
    ),
    with: {
      title: true,
    },
  });

  // AC-18.7.6: Validate ISBN exists
  if (!project?.title?.isbn) {
    return null;
  }

  // Get primary author from titleAuthors (Story 10.1 pattern)
  const primaryAuthor = await adminDb.query.titleAuthors.findFirst({
    where: and(
      eq(titleAuthors.title_id, project.titleId),
      eq(titleAuthors.is_primary, true),
    ),
    with: {
      contact: {
        columns: { first_name: true, last_name: true },
      },
    },
  });

  // Determine author name with fallback
  let authorName = "Unknown Author";
  if (primaryAuthor?.contact) {
    authorName =
      `${primaryAuthor.contact.first_name} ${primaryAuthor.contact.last_name}`.trim();
  } else {
    // Fallback to deprecated contact_id field
    if (project.title.contact_id) {
      const contact = await adminDb.query.contacts.findFirst({
        where: eq(contacts.id, project.title.contact_id),
        columns: { first_name: true, last_name: true },
      });
      if (contact) {
        authorName = `${contact.first_name} ${contact.last_name}`.trim();
      }
    }
  }

  // Get tenant name for publisher
  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, user.tenant_id),
    columns: { name: true },
  });

  return {
    isbn: project.title.isbn,
    title: project.title.title,
    author: authorName,
    publisher: tenant?.name ?? "Publisher",
  };
}

// =============================================================================
// Author Portal Queries (Story 21.1)
// =============================================================================

/**
 * Get production projects for an author (by contact ID)
 * Story 21.1: View Production Status in Author Portal
 *
 * AC-21.1.1: Author sees production status for their titles
 * AC-21.1.4: Include stage history for timeline visualization
 * AC-21.1.5: Calculate overdue status
 * AC-21.1.6: Return empty for titles without production projects
 *
 * Security: Uses tenant-isolated queries for defense-in-depth
 *
 * @param contactId - The author's contact ID
 * @param tenantId - The tenant ID for isolation
 * @returns Array of production projects for titles where contact is an author
 */
export async function getAuthorProductionProjects(
  contactId: string,
  tenantId: string,
): Promise<AuthorProductionProject[]> {
  try {
    // Step 1: Get all title IDs where this contact is an author
    // Join through titles to enforce tenant isolation (defense-in-depth)
    const authorTitleEntries = await adminDb
      .select({ titleId: titleAuthors.title_id })
      .from(titleAuthors)
      .innerJoin(titles, eq(titleAuthors.title_id, titles.id))
      .where(
        and(
          eq(titleAuthors.contact_id, contactId),
          eq(titles.tenant_id, tenantId),
        ),
      );

    if (authorTitleEntries.length === 0) {
      return [];
    }

    const titleIds = authorTitleEntries.map((e) => e.titleId);

    // Step 2: Get production projects for those titles
    const projects = await adminDb.query.productionProjects.findMany({
      where: and(
        eq(productionProjects.tenantId, tenantId),
        inArray(productionProjects.titleId, titleIds),
        isNull(productionProjects.deletedAt),
      ),
      with: {
        title: {
          columns: {
            id: true,
            title: true,
            isbn: true,
          },
        },
      },
      orderBy: [asc(productionProjects.targetPublicationDate)],
    });

    // Step 3: Map to AuthorProductionProject type with overdue calculation
    const now = new Date();
    const today = startOfDay(now);

    return projects.map((p) => {
      // Calculate overdue: past target date and not complete
      const isOverdue =
        p.targetPublicationDate !== null &&
        p.workflowStage !== "complete" &&
        isBefore(new Date(p.targetPublicationDate), today);

      return {
        projectId: p.id,
        titleId: p.titleId,
        titleName: p.title?.title ?? "Unknown Title",
        isbn: p.title?.isbn ?? null,
        workflowStage: p.workflowStage as WorkflowStage,
        stageEnteredAt: p.stageEnteredAt,
        targetPublicationDate: p.targetPublicationDate,
        isOverdue,
        stageHistory: p.workflowStageHistory ?? [],
      };
    });
  } catch (error) {
    console.error(
      "[getAuthorProductionProjects] Failed to fetch production projects:",
      error,
    );
    // Return empty array on error to gracefully degrade
    return [];
  }
}

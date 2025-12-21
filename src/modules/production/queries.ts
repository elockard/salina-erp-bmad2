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
import { titles, users } from "@/db/schema";
import { productionProjects } from "@/db/schema/production-projects";
import { productionTasks } from "@/db/schema/production-tasks";
// Import getContactsByRole for internal use and re-export for other modules
import { getContactsByRole } from "@/modules/contacts/queries";
import type { ProductionStatus, TaskStatus, WorkflowStage } from "./schema";
import { formatFileSize, getManuscriptDownloadUrl } from "./storage";
import type {
  BoardProjectCard,
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

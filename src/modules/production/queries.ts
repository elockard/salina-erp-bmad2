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
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";

import { adminDb } from "@/db";
import { titles, users } from "@/db/schema";
import { productionProjects } from "@/db/schema/production-projects";
import type { ProductionStatus } from "./schema";
import { formatFileSize, getManuscriptDownloadUrl } from "./storage";
import type { ProductionProjectWithTitle, TitleOption } from "./types";

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

/**
 * Manuscript Submissions Database Queries
 *
 * Query functions for manuscript submission management.
 * Uses tenant isolation pattern from Story 21.1/21.2.
 *
 * Story: 21.3 - Upload Manuscript Files
 * Task 3.2-3.5: Create submission queries with tenant isolation
 *
 * Security: Uses tenant-isolated queries for defense-in-depth
 */

import { and, desc, eq } from "drizzle-orm";

import { adminDb } from "@/db";
import { manuscriptSubmissions } from "@/db/schema/manuscript-submissions";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";

import type {
  AuthorManuscriptSubmission,
  AuthorTitleOption,
  ManuscriptSubmissionData,
} from "./types";

/**
 * Get manuscript submissions for an author
 *
 * Story 21.3: AC-21.3.6 - View submission history with status
 *
 * Security: Uses tenant-isolated queries for defense-in-depth
 * - Step 1: Filter by contact_id AND tenant_id
 * - Step 2: Join to titles for title info (if associated)
 *
 * @param contactId - The author's contact ID
 * @param tenantId - The tenant ID for isolation
 * @returns Array of author's manuscript submissions
 */
export async function getAuthorManuscriptSubmissions(
  contactId: string,
  tenantId: string,
): Promise<AuthorManuscriptSubmission[]> {
  try {
    // Get submissions with optional title info
    const submissions = await adminDb
      .select({
        id: manuscriptSubmissions.id,
        file_name: manuscriptSubmissions.file_name,
        content_type: manuscriptSubmissions.content_type,
        file_size: manuscriptSubmissions.file_size,
        notes: manuscriptSubmissions.notes,
        status: manuscriptSubmissions.status,
        created_at: manuscriptSubmissions.created_at,
        review_notes: manuscriptSubmissions.review_notes,
        title_id: manuscriptSubmissions.title_id,
        title_name: titles.title,
        isbn: titles.isbn,
      })
      .from(manuscriptSubmissions)
      .leftJoin(titles, eq(manuscriptSubmissions.title_id, titles.id))
      .where(
        and(
          eq(manuscriptSubmissions.contact_id, contactId),
          eq(manuscriptSubmissions.tenant_id, tenantId),
        ),
      )
      .orderBy(desc(manuscriptSubmissions.created_at));

    return submissions.map((s) => ({
      id: s.id,
      fileName: s.file_name,
      contentType: s.content_type,
      fileSize: s.file_size,
      notes: s.notes,
      status: s.status,
      createdAt: s.created_at,
      reviewNotes: s.review_notes,
      titleId: s.title_id,
      titleName: s.title_name,
      isbn: s.isbn,
    }));
  } catch (error) {
    console.error(
      "[getAuthorManuscriptSubmissions] Failed to fetch submissions:",
      error,
    );
    // Return empty array on error to gracefully degrade
    return [];
  }
}

/**
 * Get a submission by ID with tenant isolation
 *
 * @param submissionId - The submission ID
 * @param tenantId - The tenant ID for isolation
 * @returns Submission data or null if not found
 */
export async function getSubmissionById(
  submissionId: string,
  tenantId: string,
): Promise<ManuscriptSubmissionData | null> {
  try {
    const [submission] = await adminDb
      .select()
      .from(manuscriptSubmissions)
      .where(
        and(
          eq(manuscriptSubmissions.id, submissionId),
          eq(manuscriptSubmissions.tenant_id, tenantId),
        ),
      )
      .limit(1);

    return submission ?? null;
  } catch (error) {
    console.error("[getSubmissionById] Failed to fetch submission:", error);
    return null;
  }
}

/**
 * Get titles where contact is an author (for submission form dropdown)
 *
 * Story 21.3: AC-21.3.3 - Associate manuscript with author's titles
 *
 * Security: Uses innerJoin through titles for tenant isolation
 *
 * @param contactId - The author's contact ID
 * @param tenantId - The tenant ID for isolation
 * @returns Array of title options for dropdown
 */
export async function getAuthorTitleOptions(
  contactId: string,
  tenantId: string,
): Promise<AuthorTitleOption[]> {
  try {
    const authorTitles = await adminDb
      .select({
        id: titles.id,
        title: titles.title,
        isbn: titles.isbn,
      })
      .from(titleAuthors)
      .innerJoin(titles, eq(titleAuthors.title_id, titles.id))
      .where(
        and(
          eq(titleAuthors.contact_id, contactId),
          eq(titles.tenant_id, tenantId),
        ),
      )
      .orderBy(titles.title);

    return authorTitles;
  } catch (error) {
    console.error(
      "[getAuthorTitleOptions] Failed to fetch author titles:",
      error,
    );
    return [];
  }
}

/**
 * Verify author has access to a title
 *
 * Used before allowing manuscript submission for a specific title.
 *
 * @param contactId - The author's contact ID
 * @param titleId - The title ID to verify
 * @param tenantId - The tenant ID for isolation
 * @returns True if author has access to the title
 */
export async function verifyTitleAccess(
  contactId: string,
  titleId: string,
  tenantId: string,
): Promise<boolean> {
  try {
    const [authorEntry] = await adminDb
      .select({ titleId: titleAuthors.title_id })
      .from(titleAuthors)
      .innerJoin(titles, eq(titleAuthors.title_id, titles.id))
      .where(
        and(
          eq(titleAuthors.contact_id, contactId),
          eq(titleAuthors.title_id, titleId),
          eq(titles.tenant_id, tenantId),
        ),
      )
      .limit(1);

    return !!authorEntry;
  } catch (error) {
    console.error("[verifyTitleAccess] Failed to verify title access:", error);
    return false;
  }
}

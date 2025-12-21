/**
 * Manuscript Submissions Type Definitions
 *
 * TypeScript interfaces for manuscript submission management.
 *
 * Story: 21.3 - Upload Manuscript Files
 * Task 3.1: Create type interfaces
 */

// Re-export SubmissionStatus from schema for module consumers
export type { SubmissionStatus } from "@/db/schema/manuscript-submissions";

import type { SubmissionStatus } from "@/db/schema/manuscript-submissions";

/**
 * Manuscript submission as returned from database
 * Matches the manuscript_submissions table schema
 */
export interface ManuscriptSubmissionData {
  id: string;
  tenant_id: string;
  contact_id: string;
  title_id: string | null;
  file_name: string;
  s3_key: string;
  content_type: string;
  file_size: number;
  notes: string | null;
  status: SubmissionStatus;
  created_at: Date;
  updated_at: Date;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_notes: string | null;
  production_project_id: string | null;
}

/**
 * Manuscript submission for author portal display
 * Includes title information and display-friendly properties
 * AC-21.3.6: View submission history with status
 */
export interface AuthorManuscriptSubmission {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  notes: string | null;
  status: SubmissionStatus;
  createdAt: Date;
  reviewNotes: string | null;
  // Associated title info (null if new title submission)
  titleId: string | null;
  titleName: string | null;
  isbn: string | null;
}

/**
 * Title option for submission form dropdown
 * AC-21.3.3: Associate manuscript with author's titles
 */
export interface AuthorTitleOption {
  id: string;
  title: string;
  isbn: string | null;
}

/**
 * Result type for manuscript upload action
 */
export interface ManuscriptUploadResult {
  submissionId: string;
}

/**
 * Result type for manuscript download
 */
export interface ManuscriptDownloadResult {
  url: string;
}

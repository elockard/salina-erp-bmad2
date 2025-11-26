/**
 * Title Types
 *
 * TypeScript type definitions for title management.
 * Re-exports database types and defines additional application types.
 *
 * Story 2.4: Create Title Database Schema and Multi-Format Support
 */

import type { Title as DbTitle, InsertTitle } from "@/db/schema/titles";

/**
 * Title record as stored in database
 * Inferred from Drizzle schema
 */
export type Title = DbTitle;

/**
 * Title record for INSERT operations
 * Excludes auto-generated fields (id, created_at, updated_at)
 */
export type NewTitle = InsertTitle;

/**
 * Publication status values
 * Matches database enum: draft, pending, published, out_of_print
 */
export type PublicationStatus =
  | "draft"
  | "pending"
  | "published"
  | "out_of_print";

/**
 * Title with related author information
 * Used for list views and detail pages
 */
export interface TitleWithAuthor extends Title {
  author: {
    id: string;
    name: string;
    email: string | null;
  };
}

/**
 * Title list item for split-view display
 * Minimal fields needed for list rendering
 */
export interface TitleListItem {
  id: string;
  title: string;
  subtitle: string | null;
  author_id: string;
  author_name: string;
  publication_status: PublicationStatus;
  isbn: string | null;
  eisbn: string | null;
  publication_date: string | null;
}

/**
 * Title statistics for dashboard display
 */
export interface TitleStats {
  total: number;
  byStatus: {
    draft: number;
    pending: number;
    published: number;
    out_of_print: number;
  };
  withIsbn: number;
  withEisbn: number;
}

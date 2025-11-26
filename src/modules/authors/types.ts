import type { authors } from "@/db/schema/authors";

/** Author record from database */
export type Author = typeof authors.$inferSelect;

/** Author insert data (excludes auto-generated fields) */
export type InsertAuthor = typeof authors.$inferInsert;

/** Payment method options for authors */
export type PaymentMethod = "direct_deposit" | "check" | "wire_transfer";

/** Author with related titles for detail view */
export interface AuthorWithTitles extends Author {
  titles: {
    id: string;
    title: string;
    publication_status: string;
  }[];
}

/** Author with portal user info for detail view (Story 2.3) */
export interface AuthorWithPortalStatus extends Author {
  portalUser: {
    id: string;
    is_active: boolean;
    clerk_user_id: string | null;
  } | null;
}

/** Options for filtering author queries */
export interface AuthorFilters {
  includeInactive?: boolean;
  searchQuery?: string;
}

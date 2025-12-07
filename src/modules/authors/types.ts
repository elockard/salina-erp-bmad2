/**
 * @deprecated This module is deprecated. Use `@/modules/contacts/types` instead.
 *
 * Author Types
 *
 * Story 7.3: Migrate Authors to Contacts
 * Story 0.5: Consolidate Authors into Contacts
 *
 * Authors are now stored in the contacts table with role='author'.
 * All new code should use the contacts module types:
 *   - import type { ContactWithRoles } from "@/modules/contacts/types"
 *
 * These types are maintained for backward compatibility only.
 */

import type { authors } from "@/db/schema/authors";

/**
 * Base Author type from legacy authors table
 * @deprecated Kept for migration compatibility. Use contact-based types going forward.
 */
export type LegacyAuthor = typeof authors.$inferSelect;

/**
 * Author record - now based on contacts table with author role
 * Includes legacy fields for backward compatibility
 */
export interface Author {
  id: string;
  tenant_id: string;
  /** @deprecated Combined name from first_name + last_name. Use first_name/last_name directly. */
  name: string;
  email: string | null;
  phone: string | null;
  /** @deprecated Use address_line1 from contact. */
  address: string | null;
  tax_id: string | null;
  /** @deprecated Use payment_info JSONB from contact. */
  payment_method: string | null;
  portal_user_id: string | null;
  /** @deprecated Use status from contact (active/inactive). */
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  /** Contact first name (Story 7.3) */
  first_name?: string;
  /** Contact last name (Story 7.3) */
  last_name?: string;
  /** Contact ID reference (Story 7.3) - same as id after migration */
  contact_id?: string;
}

/** Author insert data (excludes auto-generated fields) */
export interface InsertAuthor {
  tenant_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  tax_id?: string | null;
  payment_method?: PaymentMethod | null;
  portal_user_id?: string | null;
  status?: "active" | "inactive";
}

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

/**
 * Contact-based author data (for new code)
 * This is the preferred type for new code after migration
 */
export interface ContactAuthor {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  payment_info: { method: PaymentMethod } | null;
  status: "active" | "inactive";
  portal_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  /** Author-specific role data from contact_roles */
  role_data?: {
    pen_name?: string;
    bio?: string;
    website?: string;
    social_links?: Record<string, string>;
  };
}

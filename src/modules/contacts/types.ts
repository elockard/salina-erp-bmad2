/**
 * Contact Module Types
 *
 * TypeScript interfaces for the unified contact system with multi-role support.
 * Defines role-specific data structures and payment information types.
 *
 * Story: 7.1 - Create Unified Contact Database Schema
 * Related FRs: FR82-FR87 (Contact Management)
 */

import type { contactRoles, contacts } from "@/db/schema/contacts";

// =============================================================================
// Base Types (from Drizzle schema)
// =============================================================================

/** Contact record from database */
export type Contact = typeof contacts.$inferSelect;

/** Contact insert data (excludes auto-generated fields) */
export type InsertContact = typeof contacts.$inferInsert;

/** Contact role record from database */
export type ContactRole = typeof contactRoles.$inferSelect;

/** Contact role insert data */
export type InsertContactRole = typeof contactRoles.$inferInsert;

// =============================================================================
// Address Type
// =============================================================================

/**
 * Address interface for nested address fields
 * Used in CustomerRoleData for billing/shipping addresses
 */
export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

// =============================================================================
// Payment Info Types (Discriminated Union)
// =============================================================================

/**
 * Direct deposit payment information
 * Bank account details for ACH transfers
 *
 * SECURITY NOTE: The routing_number field contains sensitive financial data.
 * Application layer MUST encrypt this field before storing in payment_info JSONB.
 * @see src/lib/encryption.ts for encryption utilities (to be implemented)
 */
export interface DirectDepositPaymentInfo {
  method: "direct_deposit";
  bank_name: string;
  account_type: "checking" | "savings";
  /**
   * Bank routing number (ABA number)
   * WARNING: Must be encrypted at application level before storage!
   */
  routing_number: string;
  /** Last 4 digits of account number (safe to store unencrypted) */
  account_number_last4: string;
}

/**
 * Check payment information
 * For physical check disbursement
 */
export interface CheckPaymentInfo {
  method: "check";
  payee_name?: string;
}

/**
 * Wire transfer payment information
 * For international or large transfers
 */
export interface WireTransferPaymentInfo {
  method: "wire_transfer";
  bank_name: string;
  swift_code: string;
  iban?: string;
}

/**
 * PaymentInfo discriminated union type
 * Supports multiple payment methods with method-specific fields
 */
export type PaymentInfo =
  | DirectDepositPaymentInfo
  | CheckPaymentInfo
  | WireTransferPaymentInfo;

// =============================================================================
// Role-Specific Data Types
// =============================================================================

/**
 * Social links for authors
 */
export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

/**
 * Author role-specific data
 * Stored in contact_roles.role_specific_data when role='author'
 */
export interface AuthorRoleData {
  pen_name?: string;
  bio?: string;
  website?: string;
  social_links?: SocialLinks;
}

/**
 * Customer role-specific data
 * Stored in contact_roles.role_specific_data when role='customer'
 */
export interface CustomerRoleData {
  billing_address?: Address;
  shipping_address?: Address;
  credit_limit?: number;
  payment_terms?: string; // e.g., "Net 30", "Due on receipt"
}

/**
 * Vendor role-specific data
 * Stored in contact_roles.role_specific_data when role='vendor'
 */
export interface VendorRoleData {
  vendor_code?: string;
  lead_time_days?: number;
  min_order_amount?: number;
}

/**
 * Distributor role-specific data
 * Stored in contact_roles.role_specific_data when role='distributor'
 */
export interface DistributorRoleData {
  territory?: string;
  commission_rate?: number; // Stored as decimal, e.g., 0.15 = 15%
  contract_terms?: string;
}

/**
 * RoleSpecificData discriminated union type
 * Maps role types to their specific data structures
 */
export type RoleSpecificData =
  | { role: "author"; data: AuthorRoleData }
  | { role: "customer"; data: CustomerRoleData }
  | { role: "vendor"; data: VendorRoleData }
  | { role: "distributor"; data: DistributorRoleData };

// =============================================================================
// Composite Types (for queries with relations)
// =============================================================================

/**
 * Contact with all assigned roles
 * Used for contact detail views
 */
export interface ContactWithRoles extends Contact {
  roles: ContactRole[];
}

/**
 * Contact with portal user info
 * Used for portal access management views
 */
export interface ContactWithPortalStatus extends Contact {
  portalUser: {
    id: string;
    is_active: boolean;
    clerk_user_id: string | null;
  } | null;
}

/**
 * Contact role type values
 */
export type ContactRoleType = "author" | "customer" | "vendor" | "distributor";

/**
 * Contact status values
 */
export type ContactStatusType = "active" | "inactive";

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Options for filtering contact queries
 */
export interface ContactFilters {
  /** Include inactive contacts in results */
  includeInactive?: boolean;
  /** Search by name or email */
  searchQuery?: string;
  /** Filter by role type */
  role?: ContactRoleType;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for AuthorRoleData
 */
export function isAuthorRoleData(data: unknown): data is AuthorRoleData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  // AuthorRoleData fields are all optional, but check for expected shape
  if (d.pen_name !== undefined && typeof d.pen_name !== "string") return false;
  if (d.bio !== undefined && typeof d.bio !== "string") return false;
  if (d.website !== undefined && typeof d.website !== "string") return false;
  return true;
}

/**
 * Type guard for CustomerRoleData
 */
export function isCustomerRoleData(data: unknown): data is CustomerRoleData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.credit_limit !== undefined && typeof d.credit_limit !== "number")
    return false;
  if (d.payment_terms !== undefined && typeof d.payment_terms !== "string")
    return false;
  return true;
}

/**
 * Type guard for VendorRoleData
 */
export function isVendorRoleData(data: unknown): data is VendorRoleData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.vendor_code !== undefined && typeof d.vendor_code !== "string")
    return false;
  if (d.lead_time_days !== undefined && typeof d.lead_time_days !== "number")
    return false;
  if (
    d.min_order_amount !== undefined &&
    typeof d.min_order_amount !== "number"
  )
    return false;
  return true;
}

/**
 * Type guard for DistributorRoleData
 */
export function isDistributorRoleData(
  data: unknown,
): data is DistributorRoleData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.territory !== undefined && typeof d.territory !== "string")
    return false;
  if (d.commission_rate !== undefined && typeof d.commission_rate !== "number")
    return false;
  if (d.contract_terms !== undefined && typeof d.contract_terms !== "string")
    return false;
  return true;
}

/**
 * Type guard for PaymentInfo
 */
export function isPaymentInfo(data: unknown): data is PaymentInfo {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.method !== "string") return false;

  switch (d.method) {
    case "direct_deposit":
      return (
        typeof d.bank_name === "string" &&
        (d.account_type === "checking" || d.account_type === "savings") &&
        typeof d.routing_number === "string" &&
        typeof d.account_number_last4 === "string"
      );
    case "check":
      return d.payee_name === undefined || typeof d.payee_name === "string";
    case "wire_transfer":
      return (
        typeof d.bank_name === "string" &&
        typeof d.swift_code === "string" &&
        (d.iban === undefined || typeof d.iban === "string")
      );
    default:
      return false;
  }
}

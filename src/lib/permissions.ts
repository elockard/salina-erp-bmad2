import type { UserRole } from "@/db/schema";

/**
 * Permission Matrix for Salina ERP
 * Maps business operations to allowed user roles
 * All permissions are enforced server-side via hasPermission() and requirePermission()
 */

/** Users who can manage tenant users (invite, deactivate, change roles) */
export const MANAGE_USERS: UserRole[] = ["owner", "admin"];

/** Users who can modify tenant settings (timezone, currency, fiscal year, etc.) */
export const MANAGE_SETTINGS: UserRole[] = ["owner", "admin"];

/** Users who can create/edit authors and titles */
export const CREATE_AUTHORS_TITLES: UserRole[] = ["owner", "admin", "editor"];

/** Users who can record sales transactions */
export const RECORD_SALES: UserRole[] = ["owner", "admin", "editor", "finance"];

/** Users who can record return requests (Story 3.5 AC 12) */
export const RECORD_RETURNS: UserRole[] = [
  "owner",
  "admin",
  "editor",
  "finance",
];

/** Users who can approve/reject return requests */
export const APPROVE_RETURNS: UserRole[] = ["owner", "admin", "finance"];

/** Users who can view returns history (Story 3.7 AC 12) */
export const VIEW_RETURNS: UserRole[] = ["owner", "admin", "editor", "finance"];

/** Users who can calculate royalties and generate statements */
export const CALCULATE_ROYALTIES: UserRole[] = ["owner", "admin", "finance"];

/**
 * Users who can view their own royalty statements
 * Story 2.3 AC 29, 30: Includes 'author' role for portal users
 */
export const VIEW_OWN_STATEMENTS: UserRole[] = [
  "owner",
  "admin",
  "editor",
  "finance",
  "author", // Portal users - AC 30
];

/** Users who can view all royalty statements in the tenant */
export const VIEW_ALL_STATEMENTS: UserRole[] = ["owner", "admin", "finance"];

/** Users who can view sensitive tax information (Tax ID) */
export const VIEW_TAX_ID: UserRole[] = ["owner", "admin", "finance"];

/** Users who can create/edit royalty contracts (Story 4.2 AC 9) */
export const MANAGE_CONTRACTS: UserRole[] = ["owner", "admin", "editor"];

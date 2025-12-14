/**
 * Platform Admin Authentication Helpers
 *
 * Story 13.1: Implement Platform Administrator Authentication
 *
 * Platform admins are identified by email whitelist in environment configuration.
 * This module provides helpers for checking platform admin status and enforcing
 * platform admin access on routes.
 *
 * Security Model:
 * - Clerk authentication required first
 * - Email whitelist in PLATFORM_ADMIN_EMAILS env var
 * - Separate from tenant user sessions
 * - All access logged to platform_audit_logs
 */

import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logPlatformAdminEvent } from "./platform-audit";

/**
 * Parse the platform admin emails from environment configuration
 * Format: comma-separated email list
 *
 * @returns Array of lowercase, trimmed email addresses
 */
function getPlatformAdminEmails(): string[] {
  const emails = process.env.PLATFORM_ADMIN_EMAILS || "";
  return emails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check if an email address belongs to a platform administrator
 *
 * AC-13.1.3: Platform admins are defined by email whitelist in environment configuration
 *
 * @param email - Email address to check
 * @returns true if email is in the platform admin whitelist
 */
export function isPlatformAdmin(email: string): boolean {
  return getPlatformAdminEmails().includes(email.toLowerCase());
}

/**
 * Platform admin user information
 */
export interface PlatformAdminInfo {
  clerkId: string;
  email: string;
  name: string;
}

/**
 * Get the current platform admin if authenticated
 *
 * @returns Platform admin info or null if not a platform admin
 */
export async function getCurrentPlatformAdmin(): Promise<PlatformAdminInfo | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email || !isPlatformAdmin(email)) {
    return null;
  }

  return {
    clerkId: user.id,
    email,
    name: user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : email,
  };
}

/**
 * Get the current request path from headers
 * Falls back to "/platform-admin" if not available
 */
async function getCurrentPath(): Promise<string> {
  try {
    const headersList = await headers();
    // Next.js sets x-invoke-path or we can use x-url
    const path =
      headersList.get("x-invoke-path") || headersList.get("x-pathname");
    if (path) return path;

    // Fallback: try to extract from referer or other headers
    const referer = headersList.get("referer");
    if (referer) {
      try {
        const url = new URL(referer);
        return url.pathname;
      } catch {
        // Invalid URL, use default
      }
    }
  } catch {
    // Headers not available (e.g., in tests)
  }
  return "/platform-admin";
}

/**
 * Require platform admin access for a route
 *
 * AC-13.1.1: Platform administrators authenticate using platform admin credentials
 * AC-13.1.6: Non-platform-admins receive 403 Forbidden on platform admin routes
 * AC-13.1.7: Platform admin authentication events are logged to platform audit trail
 *
 * Redirects to:
 * - /sign-in if not authenticated
 * - /platform-admin/forbidden if authenticated but not a platform admin
 *
 * @returns Platform admin info if authorized
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminInfo> {
  const user = await currentUser();
  const currentPath = await getCurrentPath();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email || !isPlatformAdmin(email)) {
    // Log forbidden attempt - fire and forget
    logPlatformAdminEvent({
      adminEmail: email || "unknown",
      adminClerkId: user.id,
      action: "forbidden",
      route: currentPath,
    });
    redirect("/platform-admin/forbidden");
  }

  const admin: PlatformAdminInfo = {
    clerkId: user.id,
    email,
    name: user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : email,
  };

  // Log successful access - fire and forget
  logPlatformAdminEvent({
    adminEmail: admin.email,
    adminClerkId: admin.clerkId,
    action: "access",
    route: currentPath,
  });

  return admin;
}

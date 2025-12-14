/**
 * Platform Admin 403 Forbidden Page
 *
 * Story 13.1: Implement Platform Administrator Authentication
 * AC-13.1.6: Non-platform-admins receive 403 Forbidden on platform admin routes
 *
 * Displayed when:
 * - User is authenticated with Clerk
 * - User's email is NOT in PLATFORM_ADMIN_EMAILS whitelist
 *
 * Note: The forbidden access attempt is already logged in requirePlatformAdmin()
 * before redirecting here, so we don't log again on this page.
 */

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-lg border border-red-800 bg-red-950/50 p-8">
        <h1 className="mb-4 text-4xl font-bold text-red-400">403</h1>
        <h2 className="mb-2 text-xl font-semibold text-white">Access Denied</h2>
        <p className="mb-6 max-w-md text-slate-400">
          You do not have platform administrator access. This area is restricted
          to authorized platform administrators only.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        >
          Return to Application
        </Link>
      </div>
    </div>
  );
}

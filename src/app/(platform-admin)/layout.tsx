/**
 * Platform Admin Layout
 *
 * Story 13.1: Implement Platform Administrator Authentication
 *
 * This layout wraps all platform admin routes with:
 * - Authentication check via requirePlatformAdmin()
 * - Red/dark header to distinguish from tenant app
 * - Sign out button
 * - Back to App link for admins who also have tenant roles
 *
 * Security: Only authenticated platform admins can access children.
 * Non-admins are redirected to /platform-admin/forbidden.
 */

import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="flex items-center justify-between bg-red-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">PLATFORM ADMIN</span>
          <span className="rounded bg-red-700 px-2 py-1 text-xs">
            Salina ERP
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{admin.email}</span>
          <Link
            href="/"
            className="rounded bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600"
          >
            Exit Admin
          </Link>
          <SignOutButton>
            <button
              type="button"
              className="rounded bg-red-700 px-3 py-1 text-xs hover:bg-red-600"
            >
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

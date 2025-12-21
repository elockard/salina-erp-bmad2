import { SignOutButton } from "@clerk/nextjs";
import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnnouncementBannerWrapper } from "@/components/announcement-banner-wrapper";
import { ImpersonationBannerWrapper } from "@/components/impersonation-banner-wrapper";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";

/**
 * Portal Layout - For Author Portal Users
 *
 * Story 5.6 - Build Author Portal Statement Access
 * AC-5.6.1: Portal accessible at /portal with simplified nav (Logo, "My Statements", Logout)
 *
 * Previously Story 2.3 - Updated with simplified navigation
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect unauthenticated users to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  // Only allow author role users
  if (user.role !== "author") {
    // Non-author users should use the dashboard
    redirect("/dashboard");
  }

  // Check if user is active
  if (!user.is_active) {
    // Inactive users cannot access the portal
    redirect("/sign-in?error=account-inactive");
  }

  return (
    <>
      {/* Impersonation banner (Story 13.6) - fixed at top when impersonating */}
      <ImpersonationBannerWrapper />

      {/* Platform announcements (Story 13.8) - displays active announcements */}
      <AnnouncementBannerWrapper userRole="author" />

      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* AC-5.6.1: Simplified header with Logo, My Statements, Logout */}
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo / Brand */}
            <Link
              href="/portal"
              className="flex items-center gap-2 text-lg font-semibold text-slate-800 hover:text-slate-600"
            >
              <FileText className="h-5 w-5" />
              Author Portal
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              {/* Dashboard link */}
              <Link
                href="/portal"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center px-2"
              >
                Dashboard
              </Link>

              {/* Manuscripts link - Story 21.3 */}
              <Link
                href="/portal/manuscripts"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center px-2"
              >
                Manuscripts
              </Link>

              {/* Settings link - Story 21.4 */}
              <Link
                href="/portal/settings"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center px-2"
              >
                Settings
              </Link>

              {/* Notification Bell - Story 21.4 AC-21.4.4: In-app notification center */}
              <NotificationBell />

              {/* Logout button */}
              <SignOutButton>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]" // Touch target
                >
                  Logout
                </Button>
              </SignOutButton>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

        {/* Footer */}
        <footer className="border-t bg-white py-4 text-center text-sm text-muted-foreground">
          <p>Salina ERP Author Portal</p>
        </footer>
      </div>
    </>
  );
}

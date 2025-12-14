import { redirect } from "next/navigation";
import { AnnouncementBannerWrapper } from "@/components/announcement-banner-wrapper";
import { ImpersonationBannerWrapper } from "@/components/impersonation-banner-wrapper";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getNavigationItems, type NavItem } from "@/lib/dashboard-nav";
import { APPROVE_RETURNS } from "@/lib/permissions";
import { getPendingReturnsCount } from "@/modules/returns/queries";
import { getTenantSettings } from "@/modules/tenant/actions";
import type { UserRole } from "@/modules/users/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Author users should be redirected to portal
  if (user.role === "author") {
    redirect("/portal");
  }

  // Get tenant settings for tenant name display
  const tenantResult = await getTenantSettings();
  const tenantName = tenantResult.success
    ? tenantResult.data.name
    : "Dashboard";

  // Get role-filtered navigation items
  let navItems = getNavigationItems(user.role as UserRole);

  // Fetch pending returns count for badge (Story 3.6 AC 10)
  // Only fetch for users with APPROVE_RETURNS permission (owner, admin, finance)
  if (APPROVE_RETURNS.includes(user.role as UserRole)) {
    try {
      const pendingCount = await getPendingReturnsCount();
      // Inject badge count into Returns nav item
      if (pendingCount > 0) {
        navItems = navItems.map((item: NavItem) => {
          if (item.badgeKey === "pendingReturns") {
            return { ...item, badgeCount: pendingCount };
          }
          return item;
        });
      }
    } catch (error) {
      console.error("Failed to fetch pending returns count:", error);
    }
  }

  // Extract user display name from email if no name available
  const userName = user.email?.split("@")[0] || "User";

  return (
    <>
      {/* Impersonation banner (Story 13.6) - fixed at top when impersonating */}
      <ImpersonationBannerWrapper />

      {/* Platform announcements (Story 13.8) - displays active announcements */}
      <AnnouncementBannerWrapper userRole={user.role} />

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <DashboardSidebar items={navItems} tenantName={tenantName} />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header with mobile menu + user dropdown */}
          <DashboardHeader
            userName={userName}
            userEmail={user.email}
            userRole={user.role}
            tenantName={tenantName}
            navItems={navItems}
          />

          {/* Page content */}
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}

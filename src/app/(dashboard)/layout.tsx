import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getNavigationItems } from "@/lib/dashboard-nav";
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
  const navItems = getNavigationItems(user.role as UserRole);

  // Extract user display name from email if no name available
  const userName = user.email?.split("@")[0] || "User";

  return (
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
  );
}

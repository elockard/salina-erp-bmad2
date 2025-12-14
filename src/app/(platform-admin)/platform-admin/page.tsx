/**
 * Platform Admin Landing Page
 *
 * Story 13.1: Implement Platform Administrator Authentication
 * Story 13.5: Build Platform Analytics Dashboard
 *
 * AC-13.1.5: The platform admin area is accessible at `/platform-admin` route
 * AC-13.5.1-7: Platform analytics dashboard with metrics and auto-refresh
 *
 * Shows welcome message, analytics dashboard, and feature navigation.
 *
 * Note: Authentication is handled by the parent layout via requirePlatformAdmin().
 * This page receives admin info from the layout - no duplicate auth check needed.
 */

import { Activity, Building2, Megaphone } from "lucide-react";
import Link from "next/link";

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { getPlatformDashboard } from "@/modules/platform-admin/actions";
import { PlatformDashboard } from "@/modules/platform-admin/components/platform-dashboard";

const activeFeatures = [
  {
    title: "Tenant Management",
    description: "View and search all tenants",
    href: "/platform-admin/tenants",
    icon: Building2,
    story: "13.2-13.4",
  },
  {
    title: "System Health",
    description: "Monitor database, jobs, and services",
    href: "/platform-admin/system",
    icon: Activity,
    story: "13.7",
  },
  {
    title: "Announcements",
    description: "Broadcast platform-wide messages",
    href: "/platform-admin/announcements",
    icon: Megaphone,
    story: "13.8",
  },
];

const upcomingFeatures: Array<{
  title: string;
  description: string;
  story: string;
}> = [];

export default async function PlatformAdminPage() {
  // Use getCurrentPlatformAdmin (non-redirecting) since layout already enforces auth
  // This avoids duplicate audit log entries and Clerk API calls
  const admin = await getCurrentPlatformAdmin();

  // Safety check - layout should have already redirected if not admin
  if (!admin) {
    return null;
  }

  // Fetch dashboard data (this also logs the VIEW_PLATFORM_DASHBOARD audit event)
  // Note: This is an RSC fetch - loading.tsx shows during navigation via Next.js streaming
  const dashboardResult = await getPlatformDashboard();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-3xl font-bold text-white">
        Welcome, {admin.name}
      </h1>
      <p className="mb-8 text-slate-400">Platform Administration Dashboard</p>

      {/* Platform Analytics Dashboard */}
      {dashboardResult.success && dashboardResult.data ? (
        <div className="mb-8">
          <PlatformDashboard initialData={dashboardResult.data} />
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-red-700 bg-red-900/20 p-4">
          <p className="text-red-400">
            Failed to load analytics:{" "}
            {!dashboardResult.success ? dashboardResult.error : "Unknown error"}
          </p>
        </div>
      )}

      {/* Active Features */}
      <h2 className="mb-4 text-xl font-semibold text-white">Quick Access</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeFeatures.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group rounded-lg border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-blue-500 hover:bg-slate-700"
          >
            <div className="mb-2 flex items-center gap-2">
              <feature.icon className="h-5 w-5 text-blue-400" />
              <h3 className="font-medium text-white group-hover:text-blue-400">
                {feature.title}
              </h3>
            </div>
            <p className="text-sm text-slate-400">{feature.description}</p>
          </Link>
        ))}
      </div>

      {/* Upcoming Features - only show if there are any */}
      {upcomingFeatures.length > 0 && (
        <>
          <h2 className="mb-4 text-xl font-semibold text-white">Coming Soon</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-slate-700 bg-slate-800 p-4"
              >
                <h3 className="mb-1 font-medium text-white">{feature.title}</h3>
                <p className="mb-2 text-sm text-slate-400">
                  {feature.description}
                </p>
                <span className="text-xs text-slate-500">
                  Story {feature.story}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

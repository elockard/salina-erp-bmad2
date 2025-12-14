/**
 * Tenant Management Page
 *
 * Story 13.2: Build Tenant List and Search Interface
 * AC: 1 - Platform admins can view all tenants on the platform
 *
 * Server component that fetches initial tenant data and passes to client component.
 */

import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  logPlatformAdminEvent,
  PLATFORM_ADMIN_ACTIONS,
} from "@/lib/platform-audit";
import { TenantList } from "@/modules/platform-admin/components/tenant-list";
import { getTenants } from "@/modules/platform-admin/queries";

export const metadata = {
  title: "Tenant Management | Platform Admin",
  description: "View and manage all tenants on the platform",
};

export default async function TenantsPage() {
  const admin = await requirePlatformAdmin();

  // Log tenant list access (fire and forget)
  logPlatformAdminEvent({
    adminEmail: admin.email,
    adminClerkId: admin.clerkId,
    action: PLATFORM_ADMIN_ACTIONS.TENANT_LIST,
    route: "/platform-admin/tenants",
  });

  const initialData = await getTenants();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
        <p className="text-slate-400">
          View and manage all tenants on the platform
        </p>
      </div>
      <TenantList initialData={initialData} />
    </div>
  );
}

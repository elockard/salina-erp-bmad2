/**
 * Tenant Detail Page
 *
 * Story 13.3: Build Tenant Detail View (AC: 1)
 * Displays comprehensive tenant information including users, metrics, and activity.
 */

import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getTenantDetail as getTenantDetailAction } from "@/modules/platform-admin/actions";
import { TenantActivityFeed } from "@/modules/platform-admin/components/tenant-activity-feed";
import { TenantInfoCard } from "@/modules/platform-admin/components/tenant-info-card";
import { TenantMetricsCards } from "@/modules/platform-admin/components/tenant-metrics-cards";
import { TenantUsersTable } from "@/modules/platform-admin/components/tenant-users-table";

/**
 * Cached tenant detail fetch to prevent duplicate queries
 * React cache deduplicates calls within a single request
 */
const getTenantDetail = cache(getTenantDetailAction);

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getTenantDetail(id);

  return {
    title: result.success
      ? `${result.data.name} | Platform Admin`
      : "Tenant Details | Platform Admin",
  };
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getTenantDetail(id);

  if (!result.success) {
    notFound();
  }

  const tenant = result.data;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/platform-admin/tenants"
        className="mb-6 inline-flex items-center text-sm text-slate-400 hover:text-white"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Tenants
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
        <p className="text-slate-400">
          {tenant.subdomain}.
          {process.env.NEXT_PUBLIC_APP_DOMAIN || "salina-erp.com"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TenantInfoCard tenant={tenant} />
          <TenantUsersTable
            users={tenant.users}
            tenantName={tenant.name}
            tenantStatus={tenant.status}
          />
        </div>
        <div className="space-y-6">
          <TenantMetricsCards metrics={tenant.metrics} />
          <TenantActivityFeed activity={tenant.activity} />
        </div>
      </div>
    </div>
  );
}

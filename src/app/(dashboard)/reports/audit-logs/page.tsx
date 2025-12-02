/**
 * Audit Logs Page
 *
 * Compliance audit log viewer with filtering, pagination, and CSV export.
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.6: Support filtering by action_type, resource_type, user, date range
 * AC-6.5.7: Results table shows: Timestamp, User, Action Type, Resource Type, Resource ID, Summary
 * AC-6.5.8: Expandable row reveals full before/after data
 * AC-6.5.9: Export CSV functionality
 *
 * Permission: owner, admin, finance (NOT editor, NOT author)
 */

import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth";
import { AuditLogsClient } from "@/modules/reports/components/audit-logs-client";
import { getAuditLogUsers } from "@/modules/reports/queries";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  // Block unauthorized roles from accessing audit logs
  const canAccess = await hasPermission(["owner", "admin", "finance"]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  // Fetch users for filter dropdown
  const users = await getAuditLogUsers();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View and export compliance audit trail for all data modifications
        </p>
      </div>

      <AuditLogsClient users={users} />
    </div>
  );
}

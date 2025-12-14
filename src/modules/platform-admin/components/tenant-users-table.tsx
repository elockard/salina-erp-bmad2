/**
 * Tenant Users Table Component
 *
 * Story 13.3: Build Tenant Detail View (AC: 4)
 * Story 13.6: Added impersonation support (AC: 1, 6, 8)
 * Displays list of users for a tenant with email, role, status, and impersonate action.
 *
 * NOTE: Users table has NO name column - email is the primary identifier.
 */

"use client";

import { format } from "date-fns";
import { UserCog, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TenantUser } from "../types";
import { ImpersonationConfirmDialog } from "./impersonation-confirm-dialog";

interface TenantUsersTableProps {
  users: TenantUser[];
  tenantName: string;
  tenantStatus: "active" | "suspended";
  isLoading?: boolean;
}

/**
 * Role badge color mapping
 */
const roleColors: Record<string, string> = {
  owner: "bg-purple-600 hover:bg-purple-700",
  admin: "bg-blue-600 hover:bg-blue-700",
  editor: "bg-green-600 hover:bg-green-700",
  finance: "bg-amber-600 hover:bg-amber-700",
  author: "bg-slate-600 hover:bg-slate-700",
};

export function TenantUsersTable({
  users,
  tenantName,
  tenantStatus,
  isLoading,
}: TenantUsersTableProps) {
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);

  const handleImpersonateClick = (user: TenantUser) => {
    setSelectedUser(user);
    setImpersonateDialogOpen(true);
  };

  const isSuspended = tenantStatus === "suspended";

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <Skeleton className="mb-4 h-6 w-32 bg-slate-700" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items
            <Skeleton key={i} className="h-12 w-full bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <div className="border-b border-slate-700 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Users className="h-5 w-5 text-slate-400" />
            Users ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-slate-600" />
            <p className="font-medium text-slate-400">No users found</p>
            <p className="text-sm text-slate-500">
              This tenant has no registered users
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Tenant users">
              <thead className="border-b border-slate-700 bg-slate-800/50">
                <tr className="text-left text-sm text-slate-400">
                  <th className="p-4 font-medium" scope="col">
                    Email
                  </th>
                  <th className="p-4 font-medium" scope="col">
                    Role
                  </th>
                  <th className="p-4 font-medium" scope="col">
                    Status
                  </th>
                  <th className="p-4 font-medium" scope="col">
                    Created
                  </th>
                  <th className="p-4 font-medium" scope="col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const canImpersonate = !!user.clerk_user_id && !isSuspended;
                  const tooltipMessage = isSuspended
                    ? "Cannot impersonate - tenant is suspended"
                    : !user.clerk_user_id
                      ? "User has no Clerk account"
                      : null;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-700 last:border-0"
                    >
                      <td className="p-4">
                        <span className="text-sm text-white">{user.email}</span>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={roleColors[user.role] || "bg-slate-600"}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            user.is_active
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-slate-600 hover:bg-slate-700"
                          }
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {format(new Date(user.created_at), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleImpersonateClick(user)}
                                  disabled={!canImpersonate}
                                  className="h-8 px-2 text-slate-400 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <UserCog className="h-4 w-4" />
                                  <span className="ml-1">Impersonate</span>
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {tooltipMessage && (
                              <TooltipContent>
                                <p>{tooltipMessage}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Impersonation Confirmation Dialog */}
      {selectedUser && (
        <ImpersonationConfirmDialog
          open={impersonateDialogOpen}
          onOpenChange={setImpersonateDialogOpen}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          tenantName={tenantName}
        />
      )}
    </>
  );
}

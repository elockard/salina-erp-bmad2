"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileCardSkeleton } from "@/components/ui/responsive-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { MANAGE_USERS } from "@/lib/permissions";
import {
  deactivateUser,
  getUsers,
  reactivateUser,
  updateUserRole,
} from "../actions";
import type { User, UserRole } from "../types";
import { RoleBadge } from "./role-badge";

/**
 * Mobile card component for user display
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 */
function UserMobileCard({
  user,
  canManage,
  loadingUserId,
  onRoleChange,
  onDeactivate,
  onReactivate,
}: {
  user: User;
  canManage: boolean;
  loadingUserId: string | null;
  onRoleChange: (userId: string, role: UserRole) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{user.email}</div>
          <div className="text-sm text-muted-foreground">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
        {user.is_active ? (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Inactive
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Role:</span>
        {canManage ? (
          <Select
            value={user.role}
            onValueChange={(value) => onRoleChange(user.id, value as UserRole)}
            disabled={loadingUserId === user.id}
          >
            <SelectTrigger className="w-[140px] h-11">
              <SelectValue>
                <RoleBadge role={user.role as UserRole} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="author">Author</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <RoleBadge role={user.role as UserRole} />
        )}
      </div>
      {canManage && (
        <div className="pt-2 border-t">
          {user.is_active ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeactivate(user.id)}
              disabled={loadingUserId === user.id}
              className="w-full h-11"
            >
              {loadingUserId === user.id ? "Deactivating..." : "Deactivate"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReactivate(user.id)}
              disabled={loadingUserId === user.id}
              className="w-full h-11"
            >
              {loadingUserId === user.id ? "Reactivating..." : "Reactivate"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function UserList() {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const canManage = useHasPermission(MANAGE_USERS);

  // Debounce search query to reduce server calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const result = await getUsers({
      page,
      pageSize,
      roleFilter,
      searchQuery: debouncedSearch,
    });

    if (result.success) {
      setUsers(result.data.users);
      setTotal(result.data.total);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, [page, pageSize, roleFilter, debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingUserId(userId);
    const result = await updateUserRole(userId, newRole);

    if (result.success) {
      toast.success("Role updated successfully");
      loadUsers();
    } else {
      toast.error(result.error);
    }
    setLoadingUserId(null);
  };

  const handleDeactivate = async (userId: string) => {
    setLoadingUserId(userId);
    const result = await deactivateUser(userId);

    if (result.success) {
      toast.success("User deactivated");
      loadUsers();
    } else {
      toast.error(result.error);
    }
    setLoadingUserId(null);
  };

  const handleReactivate = async (userId: string) => {
    setLoadingUserId(userId);
    const result = await reactivateUser(userId);

    if (result.success) {
      toast.success("User reactivated");
      loadUsers();
    } else {
      toast.error(result.error);
    }
    setLoadingUserId(null);
  };

  if (loading && users.length === 0) {
    // Mobile: Card skeletons (Story 20.4)
    if (isMobile) {
      return <MobileCardSkeleton count={5} />;
    }
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="author">Author</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Card layout (Story 20.4) */}
      {isMobile ? (
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 rounded-lg border">
              No users found
            </div>
          ) : (
            users.map((user) => (
              <UserMobileCard
                key={user.id}
                user={user}
                canManage={canManage}
                loadingUserId={loadingUserId}
                onRoleChange={handleRoleChange}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
              />
            ))
          )}
        </div>
      ) : (
        /* Desktop: Table layout */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-12"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value as UserRole)
                        }
                        disabled={loadingUserId === user.id}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue>
                            <RoleBadge role={user.role as UserRole} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="author">Author</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={user.role as UserRole} />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage &&
                      (user.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(user.id)}
                          disabled={loadingUserId === user.id}
                        >
                          {loadingUserId === user.id
                            ? "Deactivating..."
                            : "Deactivate"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(user.id)}
                          disabled={loadingUserId === user.id}
                        >
                          {loadingUserId === user.id
                            ? "Reactivating..."
                            : "Reactivate"}
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {total > pageSize && (
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

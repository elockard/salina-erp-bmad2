"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/db/schema";
import { checkPermissionAction } from "@/lib/actions";

/**
 * Client-side React hook to check if user has permission for a set of roles
 * Calls server to verify permissions and caches result
 * @param allowedRoles - Array of roles that are permitted
 * @returns boolean - true if user has permission, false otherwise
 *
 * @example
 * const canManageUsers = useHasPermission(['owner', 'admin'])
 * if (canManageUsers) {
 *   return <DeleteUserButton />
 * }
 */
export function useHasPermission(allowedRoles: UserRole[]): boolean {
  const [permitted, setPermitted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissionAction(allowedRoles)
      .then((result) => {
        setPermitted(result);
        setLoading(false);
      })
      .catch(() => {
        setPermitted(false);
        setLoading(false);
      });
  }, [allowedRoles]);

  // Return false while loading to avoid showing unauthorized UI
  return loading ? false : permitted;
}

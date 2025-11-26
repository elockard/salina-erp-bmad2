"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/db/schema";
import { useHasPermission } from "@/lib/hooks/useHasPermission";

interface PermissionGateProps {
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Permission-based conditional rendering component
 * Only renders children if user has one of the allowed roles
 * @param allowedRoles - Array of roles that are permitted
 * @param fallback - Optional component to render if user lacks permission (default: null)
 * @param children - Component(s) to render if user has permission
 *
 * @example
 * <PermissionGate allowedRoles={['owner', 'admin']}>
 *   <DeleteTenantButton />
 * </PermissionGate>
 *
 * @example
 * <PermissionGate
 *   allowedRoles={['finance', 'admin', 'owner']}
 *   fallback={<p>You need Finance role to view this</p>}
 * >
 *   <RoyaltyCalculationForm />
 * </PermissionGate>
 */
export function PermissionGate({
  allowedRoles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const hasPermission = useHasPermission(allowedRoles);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

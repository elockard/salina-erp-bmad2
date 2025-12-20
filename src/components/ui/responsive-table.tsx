"use client";

import type { ReactNode } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

/**
 * Responsive Table Wrapper Component
 *
 * Switches between table view (desktop) and card view (mobile)
 * based on viewport width.
 *
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   isMobile={isMobile}
 *   desktopView={<DataTable columns={columns} data={data} />}
 *   mobileView={
 *     <div className="space-y-3">
 *       {data.map(item => <MobileCard key={item.id} item={item} />)}
 *     </div>
 *   }
 * />
 * ```
 */

interface ResponsiveTableProps {
  /** Content to show on desktop (md breakpoint and above) */
  desktopView: ReactNode;
  /** Content to show on mobile (below md breakpoint) */
  mobileView: ReactNode;
  /** Optional: Override mobile detection with custom hook value */
  isMobileOverride?: boolean;
}

export function ResponsiveTable({
  desktopView,
  mobileView,
  isMobileOverride,
}: ResponsiveTableProps) {
  const isMobileDetected = useIsMobile();
  const isMobile = isMobileOverride ?? isMobileDetected;

  if (isMobile) {
    return <>{mobileView}</>;
  }

  return <>{desktopView}</>;
}

/**
 * Mobile Card Component for table row display
 *
 * Provides a consistent card layout for mobile table rows.
 */
interface MobileCardProps {
  /** Primary content - usually title or name */
  title: ReactNode;
  /** Secondary content - subtitle or description */
  subtitle?: ReactNode;
  /** Key-value pairs to display */
  fields?: Array<{ label: string; value: ReactNode }>;
  /** Action buttons or links */
  actions?: ReactNode;
  /** Click handler for the entire card */
  onClick?: () => void;
  /** Additional className for the card */
  className?: string;
}

export function MobileCard({
  title,
  subtitle,
  fields,
  actions,
  onClick,
  className = "",
}: MobileCardProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role="button" is conditionally set when onClick is provided
    <div
      className={`rounded-lg border bg-card p-4 space-y-2 min-h-[44px] ${onClick ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""} ${className}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Title */}
      <div className="font-medium text-foreground">{title}</div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      )}

      {/* Fields */}
      {fields && fields.length > 0 && (
        <div className="space-y-1">
          {fields.map((field, index) => (
            <div
              key={`${field.label}-${index}`}
              className="flex justify-between text-sm"
            >
              <span className="text-muted-foreground">{field.label}</span>
              <span className="text-foreground">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="pt-2 border-t flex gap-2 justify-end">{actions}</div>
      )}
    </div>
  );
}

/**
 * Empty state for mobile card lists
 */
interface MobileEmptyStateProps {
  message?: string;
  icon?: ReactNode;
}

export function MobileEmptyState({
  message = "No items found",
  icon,
}: MobileEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Loading skeleton for mobile cards
 */
interface MobileCardSkeletonProps {
  count?: number;
}

export function MobileCardSkeleton({ count = 3 }: MobileCardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton placeholders with no state
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

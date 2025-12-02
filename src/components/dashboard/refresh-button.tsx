"use client";

/**
 * Dashboard Refresh Button Component
 *
 * Client component that triggers a re-fetch of server component data.
 * Uses Next.js router.refresh() to invalidate and re-render.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-8: Dashboard includes refresh button (manual data refresh)
 */

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  /** Optional class name */
  className?: string;
}

export function RefreshButton({ className }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    startTransition(() => {
      router.refresh();
      // Reset after a short delay to show the animation
      setTimeout(() => setIsRefreshing(false), 1000);
    });
  };

  const isLoading = isPending || isRefreshing;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isLoading}
      className={className}
      aria-label="Refresh dashboard data"
    >
      <RefreshCw
        className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
      />
      {isLoading ? "Refreshing..." : "Refresh"}
    </Button>
  );
}

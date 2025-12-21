/**
 * Author Asset Library Skeleton Component
 *
 * Loading skeleton for the marketing asset library.
 * Used as Suspense fallback while assets are being fetched.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * Task 5.7: Add loading skeleton with Suspense wrapper
 */

import { FolderOpen } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Single Asset Item Skeleton
 */
function AssetItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      {/* Icon skeleton */}
      <Skeleton className="flex-shrink-0 w-10 h-10 rounded-lg" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Title Group Skeleton
 */
function TitleGroupSkeleton() {
  return (
    <div className="space-y-3">
      {/* Title header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Assets grid skeleton */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <AssetItemSkeleton />
        <AssetItemSkeleton />
      </div>
    </div>
  );
}

export function AuthorAssetLibrarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Marketing Assets
            </CardTitle>
            <CardDescription>
              Download promotional materials for your titles
            </CardDescription>
          </div>
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <TitleGroupSkeleton />
        <TitleGroupSkeleton />
      </CardContent>
    </Card>
  );
}

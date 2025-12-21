/**
 * Author Production Status Skeleton
 *
 * Loading state for the AuthorProductionStatus component.
 * M1 Fix: Add loading skeleton for better UX
 *
 * Story: 21.1 - View Production Status in Author Portal
 */

import { Factory } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthorProductionStatusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Production Status
            </CardTitle>
            <CardDescription>
              Track the production progress of your titles
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project card skeleton */}
        <div className="border rounded-lg p-4 space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          {/* Stage progress indicators */}
          <div className="flex items-center gap-1 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-3 w-12 hidden sm:block" />
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Author Publication Schedule Skeleton
 *
 * Loading state for the AuthorPublicationSchedule component.
 *
 * Story: 21.5 - View Publication Schedule
 */

import { Calendar } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthorPublicationScheduleSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Publication Schedule
            </CardTitle>
            <CardDescription>
              Plan your marketing around upcoming releases
            </CardDescription>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month group skeletons */}
        {[1, 2].map((monthIdx) => (
          <div key={monthIdx} className="space-y-3">
            {/* Month header */}
            <Skeleton className="h-6 w-32" />

            {/* Publication entries */}
            {[1, 2].map((entryIdx) => (
              <div
                key={entryIdx}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

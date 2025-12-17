"use client";

/**
 * Amazon Feed History Component
 *
 * Story 17.2 - AC5: Feed Status Polling
 * Story 17.2 - Task 6: Build feed history UI component
 *
 * Displays a list of all feed deliveries with status, counts, and Amazon processing info.
 * Shows Amazon-specific status (processing ID, error codes).
 */

import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChannelFeed } from "@/db/schema/channel-feeds";

interface AmazonFeedHistoryProps {
  feeds: ChannelFeed[];
}

/**
 * Map feed status to badge variant
 */
const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "default",
  pending: "secondary",
  generating: "secondary",
  uploading: "secondary",
  failed: "destructive",
  skipped: "outline",
};

/**
 * Map feed status to human-readable label
 */
const statusLabels: Record<string, string> = {
  success: "Success",
  pending: "Pending",
  generating: "Generating",
  uploading: "Uploading",
  failed: "Failed",
  skipped: "Skipped",
};

/**
 * Format file size for display
 */
function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AmazonFeedHistory({ feeds }: AmazonFeedHistoryProps) {
  // Filter to only show full/delta feed types
  const filteredFeeds = feeds.filter(
    (f) => f.feedType === "full" || f.feedType === "delta",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feed History</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredFeeds.length === 0 ? (
          <p className="text-muted-foreground">No feeds sent yet.</p>
        ) : (
          <div className="space-y-3">
            {filteredFeeds.map((feed) => {
              // Extract Amazon-specific metadata
              const metadata = feed.metadata as Record<string, unknown> | null;
              const amazonFeedId = metadata?.amazonFeedId as string | undefined;

              return (
                <div
                  key={feed.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={statusVariants[feed.status] || "secondary"}
                      >
                        {statusLabels[feed.status] || feed.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {feed.triggeredBy === "schedule"
                          ? "Scheduled"
                          : "Manual"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({feed.feedType === "full" ? "Full" : "Delta"})
                      </span>
                    </div>
                    <p className="text-sm">
                      {feed.createdAt
                        ? formatDistanceToNow(new Date(feed.createdAt), {
                            addSuffix: true,
                          })
                        : "Unknown time"}
                    </p>
                    {feed.fileName && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {feed.fileName}
                      </p>
                    )}
                    {amazonFeedId && (
                      <p className="text-xs text-muted-foreground">
                        Amazon Feed ID: {amazonFeedId}
                      </p>
                    )}
                    {feed.errorMessage && (
                      <p className="text-sm text-destructive line-clamp-2">
                        {feed.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm flex flex-col items-end gap-1">
                    <p className="font-medium">
                      {feed.productCount ?? 0} titles
                    </p>
                    <p className="text-muted-foreground">
                      {formatFileSize(feed.fileSize)}
                    </p>
                    {feed.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(feed.completedAt), "MMM d, HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

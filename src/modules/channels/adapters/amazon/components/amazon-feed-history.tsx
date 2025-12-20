"use client";

/**
 * Amazon Feed History Component
 *
 * Story 17.2 - AC5: Feed Status Polling
 * Story 17.5 - AC1, AC5: Enhanced feed history with detail modal
 *
 * Displays a list of all feed deliveries with status, counts, and Amazon processing info.
 * Shows Amazon-specific status (processing ID, error codes).
 * Clicking on a feed entry opens the detail modal with XML preview and retry options.
 */

import { format, formatDistanceToNow } from "date-fns";
import { Eye, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChannelFeed } from "@/db/schema/channel-feeds";
import { AmazonFeedDetailModal } from "./amazon-feed-detail-modal";

interface AmazonFeedHistoryProps {
  feeds: ChannelFeed[];
  onRefresh?: () => void;
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

export function AmazonFeedHistory({
  feeds,
  onRefresh,
}: AmazonFeedHistoryProps) {
  const [selectedFeed, setSelectedFeed] = useState<ChannelFeed | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  function handleViewDetails(feed: ChannelFeed) {
    setSelectedFeed(feed);
    setDetailModalOpen(true);
  }

  function handleRetryComplete() {
    // Trigger parent refresh if available
    onRefresh?.();
  }

  // Filter to only show full/delta feed types (not imports)
  const filteredFeeds = feeds.filter(
    (f) => f.feedType === "full" || f.feedType === "delta",
  );

  return (
    <>
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
                const metadata = feed.metadata as Record<
                  string,
                  unknown
                > | null;
                const amazonFeedId = metadata?.amazonFeedId as
                  | string
                  | undefined;

                return (
                  <button
                    key={feed.id}
                    type="button"
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
                    onClick={() => handleViewDetails(feed)}
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
                        {feed.retryOf && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Badge>
                        )}
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
                        <p className="text-sm text-destructive line-clamp-1">
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(feed);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AmazonFeedDetailModal
        feed={selectedFeed}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onRetryComplete={handleRetryComplete}
      />
    </>
  );
}

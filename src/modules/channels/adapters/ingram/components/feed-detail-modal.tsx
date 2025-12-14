"use client";

/**
 * Feed Detail Modal Component
 *
 * Story 16.5 - AC2, AC3, AC4, AC5: View Feed Content and Retry Failed Feeds
 * Displays detailed feed information with XML preview, error details, and retry functionality.
 */

import { format } from "date-fns";
import { Copy, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChannelFeed } from "@/db/schema/channel-feeds";
import { getFeedContent, retryFailedFeed } from "../actions";

interface FeedDetailModalProps {
  feed: ChannelFeed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryComplete?: () => void;
}

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
 * Common error resolutions for troubleshooting
 * Story 16.5 - AC3: Common errors have suggested resolutions
 */
const errorResolutions: Record<string, string> = {
  "connection refused":
    "Check if Ingram FTP server is accessible. Verify host and port settings.",
  "login authentication failed":
    "Verify your username and password are correct in settings.",
  etimedout:
    "Network timeout. Check your internet connection or try again later.",
  enotfound: "Host not found. Verify the FTP host address in settings.",
  "permission denied":
    "Your account may not have upload permissions. Contact Ingram support.",
  "disk quota exceeded": "Ingram storage is full. Contact Ingram to resolve.",
  econnreset:
    "Connection was reset. This may be a temporary network issue. Try again.",
  "certificate error":
    "SSL/TLS certificate issue. Contact support if this persists.",
};

function getErrorResolution(errorMessage: string | null): string | null {
  if (!errorMessage) return null;

  const lowerError = errorMessage.toLowerCase();
  for (const [pattern, resolution] of Object.entries(errorResolutions)) {
    if (lowerError.includes(pattern.toLowerCase())) {
      return resolution;
    }
  }
  return null;
}

export function FeedDetailModal({
  feed,
  open,
  onOpenChange,
  onRetryComplete,
}: FeedDetailModalProps) {
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [isLoadingXml, setIsLoadingXml] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!feed) return null;

  const duration =
    feed.startedAt && feed.completedAt
      ? Math.round(
          (new Date(feed.completedAt).getTime() -
            new Date(feed.startedAt).getTime()) /
            1000,
        )
      : null;

  const errorResolution = getErrorResolution(feed.errorMessage);

  async function loadXmlContent() {
    if (xmlContent || !feed) return; // Already loaded or no feed
    setIsLoadingXml(true);
    try {
      const result = await getFeedContent(feed.id);
      if (result.success && result.content) {
        setXmlContent(result.content);
      } else {
        toast.error(result.message || "Failed to load XML content");
      }
    } finally {
      setIsLoadingXml(false);
    }
  }

  async function handleCopyXml() {
    if (xmlContent) {
      await navigator.clipboard.writeText(xmlContent);
      toast.success("XML copied to clipboard");
    }
  }

  function handleDownloadXml() {
    if (xmlContent && feed) {
      const blob = new Blob([xmlContent], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = feed.fileName || `feed-${feed.id}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleRetry() {
    if (!feed) return;
    setIsRetrying(true);
    try {
      const result = await retryFailedFeed(feed.id);
      if (result.success) {
        toast.success("Feed retry started");
        onRetryComplete?.();
        onOpenChange(false);
      } else {
        toast.error(result.message || "Failed to retry feed");
      }
    } finally {
      setIsRetrying(false);
    }
  }

  // Reset XML content when modal closes
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setXmlContent(null);
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Feed Details
            <Badge variant={statusVariants[feed.status]}>{feed.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="details"
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content" onClick={loadXmlContent}>
              XML Content
            </TabsTrigger>
            {feed.status === "failed" && (
              <TabsTrigger value="error">Error Details</TabsTrigger>
            )}
          </TabsList>

          <TabsContent
            value="details"
            className="space-y-4 overflow-auto flex-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Feed Type</p>
                <p className="font-medium">
                  {feed.feedType === "full" ? "Full Feed" : "Delta Feed"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Triggered By</p>
                <p className="font-medium">
                  {feed.triggeredBy === "schedule" ? "Scheduled" : "Manual"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="font-medium">{feed.productCount ?? 0} titles</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {feed.fileSize
                    ? `${(feed.fileSize / 1024).toFixed(1)} KB`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started At</p>
                <p className="font-medium">
                  {feed.startedAt
                    ? format(new Date(feed.startedAt), "PPpp")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed At</p>
                <p className="font-medium">
                  {feed.completedAt
                    ? format(new Date(feed.completedAt), "PPpp")
                    : "-"}
                </p>
              </div>
              {duration !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{duration} seconds</p>
                </div>
              )}
              {feed.fileName && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium font-mono text-sm">
                    {feed.fileName}
                  </p>
                </div>
              )}
            </div>

            {feed.status === "failed" && (
              <div className="pt-4">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  variant="outline"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
                  />
                  {isRetrying ? "Retrying..." : "Retry Feed"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="content"
            className="flex-1 overflow-hidden flex flex-col"
          >
            {isLoadingXml ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading XML content...</p>
              </div>
            ) : xmlContent ? (
              <>
                <div className="flex gap-2 mb-2">
                  <Button size="sm" variant="outline" onClick={handleCopyXml}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadXml}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <pre className="flex-1 overflow-auto bg-muted p-4 rounded-md text-xs font-mono whitespace-pre-wrap">
                  {xmlContent.length > 50000
                    ? `${xmlContent.slice(0, 50000)}\n\n... (truncated, download for full content)`
                    : xmlContent}
                </pre>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">
                  XML content not available for this feed.
                </p>
              </div>
            )}
          </TabsContent>

          {feed.status === "failed" && (
            <TabsContent
              value="error"
              className="space-y-4 overflow-auto flex-1"
            >
              <div>
                <p className="text-sm text-muted-foreground">Error Message</p>
                <p className="font-medium text-destructive">
                  {feed.errorMessage || "Unknown error"}
                </p>
              </div>

              {errorResolution && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Suggested Resolution
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {errorResolution}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button onClick={handleRetry} disabled={isRetrying}>
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
                  />
                  {isRetrying ? "Retrying..." : "Retry This Feed"}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

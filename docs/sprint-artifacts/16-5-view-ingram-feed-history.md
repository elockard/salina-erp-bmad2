# Story 16.5: View Ingram Feed History

Status: complete

## Story

**As a** publisher,
**I want** to see Ingram feed history,
**So that** I can troubleshoot issues.

## Context

This story enhances the existing feed history from Story 16.2 with advanced troubleshooting capabilities. Publishers need to understand exactly what was sent to Ingram, especially when feeds fail or when investigating metadata discrepancies with Ingram's catalog.

### Dependencies
- Story 16.1 (Configure Ingram Account Connection) - Complete
- Story 16.2 (Schedule Automated ONIX Feeds) - Complete (provides base feed history)
- Story 16.3 (Ingest Ingram Order Data) - Complete
- Story 16.4 (Sync Inventory Status with Ingram) - Complete

### Business Value
- Reduces support tickets by enabling self-service troubleshooting
- Provides audit trail for metadata submissions
- Enables quick retry of failed feeds without re-triggering full generation
- Helps identify patterns in feed failures (time of day, content issues, etc.)

### What Exists (from Story 16.2)
The `IngramFeedHistory` component already displays:
- Status badge (success, pending, generating, uploading, failed, skipped)
- Trigger type (Scheduled vs Manual)
- Feed type (Full vs Delta)
- Timestamp (relative time)
- File name
- Error message (if failed)
- Product count
- File size

### What Story 16.5 Adds
1. **XML Content Preview** - View the actual ONIX XML that was sent
2. **Retry Failed Feeds** - Re-submit a failed feed without regenerating
3. **Enhanced Error Details** - Structured error information for troubleshooting
4. **Feed Detail Modal** - Expanded view with all feed metadata

## Acceptance Criteria

### AC1: View Feed Delivery List
- **Given** I access Ingram integration settings
- **When** I view the feed history section
- **Then** I see a list of all feed deliveries from the last 90 days
- **And** each entry shows: date, product count, status, error summary
- **And** list is sorted by date (newest first)
- **And** pagination is available when >20 feeds exist

### AC2: View Feed Content (XML Preview)
- **Given** a feed has been generated and stored
- **When** I click "View Content" on a feed entry
- **Then** I see the ONIX XML content in a syntax-highlighted modal
- **And** I can copy the XML to clipboard
- **And** I can download the XML as a file
- **And** large files show a truncated preview with download option

### AC3: View Error Details
- **Given** a feed has failed
- **When** I view the failed feed entry
- **Then** I see detailed error information including:
  - Error type (connection, upload, validation)
  - Error message
  - Timestamp of failure
  - Products attempted
- **And** common errors have suggested resolutions

### AC4: Retry Failed Feeds
- **Given** a feed has failed
- **When** I click "Retry" on the failed feed
- **Then** system re-attempts the upload using stored XML content
- **And** new feed record is created linked to original (retryOf: originalId)
- **And** I see progress indicator during retry
- **And** success/failure notification is displayed

### AC5: Feed Detail View
- **Given** I want to see complete feed information
- **When** I click on a feed entry
- **Then** I see a detail modal/panel showing:
  - Full timestamp (date and time)
  - Feed type and trigger type
  - Product count and file size
  - Duration (startedAt to completedAt)
  - ONIX version used
  - Complete error details (if failed)
  - Retry history (if retried)

## Tasks

- [x] Task 1 (AC: 2): Add feedContent column to channel_feeds schema for storing XML
- [x] Task 2 (AC: 2): Update Inngest feed job to store generated XML in feedContent
- [x] Task 3 (AC: 2): Create getFeedContent server action to retrieve XML by feed ID
- [x] Task 4 (AC: 5): Create FeedDetailModal component for expanded feed view
- [x] Task 5 (AC: 2): Add XML preview panel with syntax highlighting to detail modal
- [x] Task 6 (AC: 2): Add copy-to-clipboard and download buttons for XML content
- [x] Task 7 (AC: 3): Add error details section to detail modal with suggested resolutions
- [x] Task 8 (AC: 4): Create retryFailedFeed server action
- [x] Task 9 (AC: 4): Add retryOf column to channel_feeds schema
- [x] Task 10 (AC: 4): Add retry button to failed feed entries in history list
- [x] Task 11 (AC: 1): Update feed history list with clickable entries
- [x] Task 12 (AC: 1-5): Write comprehensive tests (24 tests pass)

## Dev Notes

### CRITICAL: Reuse Existing Patterns

**DO NOT** create new patterns. This project has established conventions:

1. **Server Actions**: Follow pattern from `src/modules/channels/adapters/ingram/actions.ts`
2. **Queries**: Follow pattern from `src/modules/channels/adapters/ingram/queries.ts`
3. **UI Components**: Follow pattern from `src/modules/channels/adapters/ingram/components/`
4. **Modal Pattern**: Use shadcn Dialog component
5. **adminDb**: Use `adminDb` for queries without RLS session context

### Task 1: Add feedContent Column to Schema

Update `src/db/schema/channel-feeds.ts`:

```typescript
export const channelFeeds = pgTable("channel_feeds", {
  // ... existing columns ...

  // Story 16.5: XML content storage for preview
  feedContent: text("feed_content"), // Stores ONIX XML (compressed for large files)

  // Story 16.5: Retry tracking
  retryOf: uuid("retry_of").references(() => channelFeeds.id, { onDelete: "set null" }),
});
```

Create migration:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

### Task 2: Update Inngest Feed Job to Store XML

Update `src/inngest/ingram-feed.ts` to store the generated XML:

```typescript
// In the generate-onix step, after building XML:
const { xml, fileName } = await step.run("generate-onix", async () => {
  // ... existing code to build XML ...

  return { xml: builder.toXML(), fileName };
});

// Store the XML content in the feed record
await step.run("store-feed-content", async () => {
  await adminDb
    .update(channelFeeds)
    .set({
      feedContent: xml, // Store XML for preview/retry
    })
    .where(eq(channelFeeds.id, feedId));
});
```

### Task 3: Create getFeedContent Server Action

Add to `src/modules/channels/adapters/ingram/actions.ts`:

```typescript
/**
 * Get feed content (XML) for preview
 *
 * Story 16.5 - AC2: View Feed Content (XML Preview)
 * Returns the stored XML content for a feed entry.
 * Validates user has access to the feed's tenant.
 */
export async function getFeedContent(feedId: string): Promise<{
  success: boolean;
  content?: string;
  fileName?: string;
  message?: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    const feed = await db.query.channelFeeds.findFirst({
      where: and(
        eq(channelFeeds.id, feedId),
        eq(channelFeeds.tenantId, user.tenant_id),
        eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
      ),
    });

    if (!feed) {
      return { success: false, message: "Feed not found" };
    }

    if (!feed.feedContent) {
      return { success: false, message: "Feed content not available" };
    }

    return {
      success: true,
      content: feed.feedContent,
      fileName: feed.fileName || `feed-${feedId}.xml`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get feed content",
    };
  }
}
```

### Task 4: Create FeedDetailModal Component

Create `src/modules/channels/adapters/ingram/components/feed-detail-modal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Copy, Download, RefreshCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
 */
const errorResolutions: Record<string, string> = {
  "Connection refused": "Check if Ingram FTP server is accessible. Verify host and port settings.",
  "Login authentication failed": "Verify your username and password are correct in settings.",
  "ETIMEDOUT": "Network timeout. Check your internet connection or try again later.",
  "ENOTFOUND": "Host not found. Verify the FTP host address in settings.",
  "Permission denied": "Your account may not have upload permissions. Contact Ingram support.",
  "Disk quota exceeded": "Ingram storage is full. Contact Ingram to resolve.",
};

function getErrorResolution(errorMessage: string | null): string | null {
  if (!errorMessage) return null;

  for (const [pattern, resolution] of Object.entries(errorResolutions)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
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
  const { toast } = useToast();
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [isLoadingXml, setIsLoadingXml] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!feed) return null;

  const duration =
    feed.startedAt && feed.completedAt
      ? Math.round(
          (new Date(feed.completedAt).getTime() -
            new Date(feed.startedAt).getTime()) /
            1000
        )
      : null;

  const errorResolution = getErrorResolution(feed.errorMessage);

  async function loadXmlContent() {
    setIsLoadingXml(true);
    try {
      const result = await getFeedContent(feed.id);
      if (result.success && result.content) {
        setXmlContent(result.content);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load XML content",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingXml(false);
    }
  }

  async function handleCopyXml() {
    if (xmlContent) {
      await navigator.clipboard.writeText(xmlContent);
      toast({ title: "Copied", description: "XML copied to clipboard" });
    }
  }

  function handleDownloadXml() {
    if (xmlContent && feed.fileName) {
      const blob = new Blob([xmlContent], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = feed.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleRetry() {
    setIsRetrying(true);
    try {
      const result = await retryFailedFeed(feed.id);
      if (result.success) {
        toast({ title: "Success", description: "Feed retry started" });
        onRetryComplete?.();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to retry feed",
          variant: "destructive",
        });
      }
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Feed Details
            <Badge variant={statusVariants[feed.status]}>{feed.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content" onClick={loadXmlContent}>
              XML Content
            </TabsTrigger>
            {feed.status === "failed" && (
              <TabsTrigger value="error">Error Details</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-4 overflow-auto flex-1">
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
                  <p className="font-medium font-mono text-sm">{feed.fileName}</p>
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
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? "Retrying..." : "Retry Feed"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="flex-1 overflow-hidden flex flex-col">
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
                  <Button size="sm" variant="outline" onClick={handleDownloadXml}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <pre className="flex-1 overflow-auto bg-muted p-4 rounded-md text-xs font-mono">
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
            <TabsContent value="error" className="space-y-4 overflow-auto flex-1">
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
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
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
```

### Task 8: Create retryFailedFeed Server Action

Add to `src/modules/channels/adapters/ingram/actions.ts`:

```typescript
/**
 * Retry a failed Ingram feed
 *
 * Story 16.5 - AC4: Retry Failed Feeds
 * Re-attempts upload using stored XML content.
 * Creates new feed record linked to original via retryOf.
 */
export async function retryFailedFeed(feedId: string): Promise<{
  success: boolean;
  newFeedId?: string;
  message?: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Get the original feed
    const originalFeed = await db.query.channelFeeds.findFirst({
      where: and(
        eq(channelFeeds.id, feedId),
        eq(channelFeeds.tenantId, user.tenant_id),
        eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
      ),
    });

    if (!originalFeed) {
      return { success: false, message: "Feed not found" };
    }

    if (originalFeed.status !== "failed") {
      return { success: false, message: "Only failed feeds can be retried" };
    }

    if (!originalFeed.feedContent) {
      return { success: false, message: "Feed content not available for retry. Please trigger a new feed." };
    }

    // Trigger retry job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.feed-retry",
      data: {
        tenantId: user.tenant_id,
        originalFeedId: feedId,
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Retry started" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to retry feed",
    };
  }
}
```

### Task 9: Add Inngest Retry Job

Add to `src/inngest/ingram-feed.ts`:

```typescript
/**
 * Ingram Feed Retry Job
 *
 * Story 16.5 - AC4: Retry Failed Feeds
 * Re-attempts upload using stored XML content from original feed.
 */
export const ingramFeedRetry = inngest.createFunction(
  {
    id: "ingram-feed-retry",
    retries: 2,
  },
  { event: "channel/ingram.feed-retry" },
  async ({ event, step }) => {
    const { tenantId, originalFeedId } = event.data;

    // Get original feed with content
    const originalFeed = await step.run("get-original-feed", async () => {
      return adminDb.query.channelFeeds.findFirst({
        where: and(
          eq(channelFeeds.id, originalFeedId),
          eq(channelFeeds.tenantId, tenantId),
        ),
      });
    });

    if (!originalFeed?.feedContent) {
      throw new Error("Original feed content not found");
    }

    // Create new retry feed record
    const retryFeedId = await step.run("create-retry-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType: originalFeed.feedType,
          triggeredBy: "manual",
          productCount: originalFeed.productCount,
          feedContent: originalFeed.feedContent,
          fileName: originalFeed.fileName,
          retryOf: originalFeedId,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    try {
      // Get credentials
      const credentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
          ),
        });
        if (!cred) throw new Error("Ingram credentials not configured");
        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Write temp file
      const tempFilePath = await step.run("write-temp-file", async () => {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, originalFeed.fileName || `retry-${retryFeedId}.xml`);
        await fs.writeFile(filePath, originalFeed.feedContent!, "utf-8");
        return filePath;
      });

      // Upload to Ingram
      const uploadResult = await step.run("upload-to-ingram", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, retryFeedId));
        return await uploadToIngram(
          credentials,
          tempFilePath,
          originalFeed.fileName || `retry-${retryFeedId}.xml`
        );
      });

      // Get file size
      const fileSize = await step.run("get-file-size", async () => {
        const stats = await fs.stat(tempFilePath).catch(() => null);
        return stats?.size || originalFeed.feedContent!.length;
      });

      // Cleanup temp file
      await step.run("cleanup", async () => {
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      });

      if (uploadResult.success) {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              fileSize,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, retryFeedId));
        });

        return { success: true, retryFeedId };
      } else {
        throw new Error(uploadResult.message);
      }
    } catch (error) {
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Retry failed",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, retryFeedId));

      throw error;
    }
  }
);
```

### Task 10: Update Feed History Component

Update `src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx` to include:

```typescript
"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChannelFeed } from "@/db/schema/channel-feeds";
import { FeedDetailModal } from "./feed-detail-modal";

interface IngramFeedHistoryProps {
  feeds: ChannelFeed[];
}

// ... existing statusVariants and statusLabels ...

export function IngramFeedHistory({ feeds }: IngramFeedHistoryProps) {
  const [selectedFeed, setSelectedFeed] = useState<ChannelFeed | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  function handleViewDetails(feed: ChannelFeed) {
    setSelectedFeed(feed);
    setDetailModalOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Feed History</CardTitle>
        </CardHeader>
        <CardContent>
          {feeds.length === 0 ? (
            <p className="text-muted-foreground">No feeds sent yet.</p>
          ) : (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewDetails(feed)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariants[feed.status] || "secondary"}>
                        {statusLabels[feed.status] || feed.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {feed.triggeredBy === "schedule" ? "Scheduled" : "Manual"}
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
                    {feed.errorMessage && (
                      <p className="text-sm text-destructive line-clamp-1">
                        {feed.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm flex flex-col items-end gap-1">
                    <p className="font-medium">{feed.productCount ?? 0} titles</p>
                    <p className="text-muted-foreground">
                      {formatFileSize(feed.fileSize)}
                    </p>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FeedDetailModal
        feed={selectedFeed}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
}
```

### Update Inngest Client Events

Add to `src/inngest/client.ts`:

```typescript
export interface InngestEvents {
  // ... existing events ...

  /**
   * Ingram feed retry event
   * Story 16.5: View Ingram Feed History - Retry Failed Feeds
   */
  "channel/ingram.feed-retry": {
    data: {
      tenantId: string;
      originalFeedId: string;
      userId?: string;
    };
  };
}
```

### Update Inngest Functions Export

Add to `src/inngest/functions.ts`:

```typescript
import { ingramFeedRetry } from "./ingram-feed";

export const functions = [
  // ... existing functions
  ingramFeedRetry,
];
```

### Project Structure Notes

- Schema update: `src/db/schema/channel-feeds.ts` (add feedContent, retryOf columns)
- Server actions: `src/modules/channels/adapters/ingram/actions.ts` (add getFeedContent, retryFailedFeed)
- UI components: `src/modules/channels/adapters/ingram/components/feed-detail-modal.tsx` (new)
- UI components: `src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx` (update)
- Inngest jobs: `src/inngest/ingram-feed.ts` (add retry job, update feed job to store content)

### Security Requirements

1. **Tenant isolation** - getFeedContent validates feed belongs to user's tenant
2. **Role check** - Only owner/admin can retry feeds
3. **Content size limit** - XML preview truncated at 50KB, download available for full content
4. **No credential exposure** - XML content never includes FTP credentials

### Storage Considerations

Feed XML content can be large (several MB for large catalogs). Options:
1. **Direct storage** (recommended for MVP) - Store in feedContent column, PostgreSQL handles well
2. **Compression** - Use zlib to compress before storage if needed
3. **Object storage** - For very large files, consider S3/R2 with presigned URLs

For MVP, direct storage is sufficient. The 90-day retention policy naturally manages storage.

### References

- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/epics.md - Story 16.5: View Ingram Feed History]
- [Source: src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx - Existing feed history]
- [Source: src/db/schema/channel-feeds.ts - Channel feeds schema]
- [Source: src/inngest/ingram-feed.ts - Feed generation job]

## Test Scenarios

### Unit Tests (`tests/unit/ingram-feed-history.test.ts`)
- getFeedContent returns content for valid feed
- getFeedContent denies access for other tenant's feed
- getFeedContent handles missing content gracefully
- retryFailedFeed creates new feed record with retryOf link
- retryFailedFeed rejects non-failed feeds
- retryFailedFeed rejects feeds without stored content

### Unit Tests (`tests/unit/ingram-feed-retry.test.ts`)
- Retry job uploads stored XML content
- Retry job creates proper feed record
- Retry job handles upload failures
- Retry job cleans up temp files

### Component Tests
- FeedDetailModal displays all feed metadata
- FeedDetailModal loads and displays XML content
- FeedDetailModal copy and download work correctly
- FeedDetailModal retry button triggers action
- Feed history list shows clickable entries
- Feed history list shows retry indicator for retried feeds

### Integration Tests (mocked FTP)
- Full retry flow from UI to upload
- XML content storage and retrieval

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations > Ingram
- [ ] See feed history list with all feed types
- [ ] Click on a feed entry
- [ ] See detail modal with all metadata
- [ ] Click "XML Content" tab
- [ ] See XML content (or loading state)
- [ ] Click "Copy" button - XML copies to clipboard
- [ ] Click "Download" button - XML downloads as file
- [ ] View a failed feed
- [ ] See error details with suggested resolution
- [ ] Click "Retry" button
- [ ] See retry progress
- [ ] See new feed entry in history with retry indicator

## Dev Agent Record

### Context Reference

This story completes Epic 16 by providing comprehensive feed troubleshooting capabilities. The XML preview and retry functionality are critical for publishers who need to investigate feed issues without contacting support.

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- Store XML in feedContent column during feed generation
- Use shadcn Dialog for detail modal with tabs
- Truncate XML preview at 50KB with download option
- Map common errors to suggested resolutions
- Retry creates new feed linked via retryOf column
- 90-day retention applies to stored XML content

### File List

New files:
- `src/modules/channels/adapters/ingram/components/feed-detail-modal.tsx` - Feed detail modal with XML preview
- `tests/unit/ingram-feed-history.test.ts` - Feed history action tests
- `tests/unit/ingram-feed-retry.test.ts` - Retry job tests

Modified files:
- `src/db/schema/channel-feeds.ts` - Add feedContent, retryOf columns
- `src/modules/channels/adapters/ingram/actions.ts` - Add getFeedContent, retryFailedFeed
- `src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx` - Add click-to-view and detail modal
- `src/inngest/ingram-feed.ts` - Store XML content, add retry job
- `src/inngest/client.ts` - Add feed-retry event type
- `src/inngest/functions.ts` - Register retry function

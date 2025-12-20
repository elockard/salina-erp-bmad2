# Story 17.5: View Amazon Feed History

Status: done

## Story

**As a** publisher,
**I want** to see Amazon feed history,
**So that** I can track feed status and troubleshoot issues.

## Context

This story completes Epic 17 (Amazon Integration) by providing comprehensive feed troubleshooting capabilities. It follows the exact pattern established in Story 16.5 (Ingram Feed History) which implemented XML preview, retry functionality, and enhanced error details.

### Dependencies

- Story 17.1 (Configure Amazon Account Connection) - Complete
- Story 17.2 (Schedule Automated ONIX Feeds to Amazon) - Complete (provides base feed history)
- Story 17.3 (Import Amazon Sales Data) - Complete
- Story 17.4 (Link Titles to ASINs) - Complete
- Story 16.5 (View Ingram Feed History) - Complete (provides the exact pattern to follow)

### Business Value

- **Self-service troubleshooting**: Publishers can diagnose feed issues without support
- **Audit trail**: Complete history of metadata submissions to Amazon
- **Quick retry**: Re-submit failed feeds without regenerating ONIX
- **Error diagnosis**: Amazon-specific error codes with suggested resolutions

### What Exists (from Story 17.2)

The `AmazonFeedHistory` component (`src/modules/channels/adapters/amazon/components/amazon-feed-history.tsx`) already displays:
- Status badge (success, pending, generating, uploading, failed, skipped)
- Trigger type (Scheduled vs Manual)
- Feed type (Full vs Delta)
- Timestamp (relative time)
- File name
- Error message (if failed)
- Product count
- File size
- Amazon Feed ID (from metadata)

### What Story 17.5 Adds

Following the **exact pattern from Story 16.5** (Ingram):

1. **XML Content Preview** - View the actual ONIX XML that was sent
2. **Retry Failed Feeds** - Re-submit a failed feed without regenerating
3. **Enhanced Error Details** - Amazon-specific error information for troubleshooting
4. **Feed Detail Modal** - Expanded view with all feed metadata

## Acceptance Criteria

### AC1: View Feed Delivery List (Enhanced)
- **Given** I access Amazon integration settings
- **When** I view the feed history section
- **Then** I see a list of all feed deliveries with clickable entries
- **And** clicking a feed entry opens the detail modal
- **And** list shows: date, product count, status, error summary, Amazon Feed ID
- **And** list is sorted by date (newest first)

### AC2: View Feed Content (XML Preview)
- **Given** a feed has been generated and stored
- **When** I click on a feed entry and select "XML Content" tab
- **Then** I see the ONIX XML content in a syntax-highlighted modal
- **And** I can copy the XML to clipboard
- **And** I can download the XML as a file
- **And** large files (>50KB) show a truncated preview with download option

### AC3: View Error Details
- **Given** a feed has failed
- **When** I view the failed feed entry
- **Then** I see detailed error information including:
  - Error type (connection, upload, validation, Amazon API error)
  - Error message (including Amazon error codes)
  - Timestamp of failure
  - Products attempted
- **And** common Amazon errors have suggested resolutions

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
- **Then** I see a detail modal showing:
  - Full timestamp (date and time)
  - Feed type and trigger type
  - Product count and file size
  - Duration (startedAt to completedAt)
  - Amazon Feed ID (processing ID)
  - Complete error details (if failed)
  - Retry history (if retried)

## Tasks

- [x] Task 1 (AC: 2, 5): Create AmazonFeedDetailModal component
- [x] Task 2 (AC: 2): Add getAmazonFeedContent server action
- [x] Task 3 (AC: 4): Add retryAmazonFeed server action
- [x] Task 4 (AC: 4): Add Inngest amazon feed retry job
- [x] Task 5 (AC: 3): Add Amazon-specific error resolutions (in Task 1)
- [x] Task 6 (AC: 1): Update AmazonFeedHistory to use detail modal
- [x] Task 7 (AC: 1): Update parent page for refresh capability
- [x] Task 8 (AC: 1-5): Write tests

## Dev Notes

### CRITICAL: Follow Story 16.5 Pattern Exactly

This story must follow the **exact same pattern** as Story 16.5 (Ingram Feed History). The implementation is nearly identical with only channel-specific differences:

| Ingram | Amazon |
|--------|--------|
| `CHANNEL_TYPES.INGRAM` | `CHANNEL_TYPES.AMAZON` |
| `getFeedContent` | `getAmazonFeedContent` |
| `retryFailedFeed` | `retryAmazonFeed` |
| `channel/ingram.feed-retry` | `channel/amazon.feed-retry` |
| FTP error resolutions | Amazon SP-API error resolutions |

---

## **WARNING: AMAZON UPLOAD FLOW IS MULTI-STEP**

Amazon SP-API feed upload requires **4 sequential steps** (unlike Ingram's single FTP upload):

1. `createFeedDocument()` - Get pre-signed S3 URL
2. `uploadFeedContent()` - Upload XML to S3 bucket
3. `createFeed()` - Submit feed to Amazon for processing
4. `getFeedStatus()` - Poll until DONE/FATAL/CANCELLED

**The retry job MUST follow this same flow.** See existing `amazonFeed` function in `src/inngest/amazon-feed.ts` lines 265-330 for the exact pattern.

---

### Task 1: Create AmazonFeedDetailModal Component

**Location**: `src/modules/channels/adapters/amazon/components/amazon-feed-detail-modal.tsx`

**Pattern**: Copy from `src/modules/channels/adapters/ingram/components/feed-detail-modal.tsx`

**Required Changes from Ingram version:**

1. **Update imports** (line 24):
   ```typescript
   import { getAmazonFeedContent, retryAmazonFeed } from "../actions";
   ```

2. **Replace error resolutions** (lines 49-64) with Amazon-specific errors:
   ```typescript
   const amazonErrorResolutions: Record<string, string> = {
     "access denied": "Verify your Amazon SP-API credentials have the required permissions.",
     "invalid credentials": "Check your LWA Client ID, Client Secret, and Refresh Token in settings.",
     "expired token": "Your refresh token may have expired. Re-authenticate with Amazon.",
     "throttled": "Amazon rate limit exceeded. Wait a few minutes and try again.",
     "quota exceeded": "Daily API quota reached. Try again tomorrow or contact Amazon.",
     "invalid xml": "ONIX XML validation failed. Check title metadata for errors.",
     "feed processing": "Amazon is still processing the feed. Check back in a few minutes.",
     "marketplace not authorized": "Your seller account is not authorized for this marketplace.",
     "network error": "Network connectivity issue. Check your internet connection.",
     "timeout": "Request timed out. Amazon servers may be experiencing delays.",
     "s3 upload failed": "Failed to upload to Amazon S3. Check network connectivity.",
     "create feed document": "Failed to initialize feed upload. Amazon API may be unavailable.",
   };
   ```

3. **Add Amazon Feed ID display** in details grid (after duration):
   ```typescript
   {amazonFeedId && (
     <div>
       <p className="text-sm text-muted-foreground">Amazon Feed ID</p>
       <p className="font-medium font-mono text-sm">{amazonFeedId}</p>
     </div>
   )}
   ```

4. **Extract amazonFeedId from metadata** (add near top of component):
   ```typescript
   const metadata = feed.metadata as Record<string, unknown> | null;
   const amazonFeedId = metadata?.amazonFeedId as string | undefined;
   ```

5. **Update download filename** (line 129):
   ```typescript
   a.download = feed.fileName || `amazon-feed-${feed.id}.xml`;
   ```

---

### Task 2: Add getAmazonFeedContent Server Action

**Location**: `src/modules/channels/adapters/amazon/actions.ts`

**Add after `triggerAmazonSalesImport` function (around line 448):**

```typescript
/**
 * Get Amazon feed content (XML) for preview
 *
 * Story 17.5 - AC2: View Feed Content (XML Preview)
 * Returns the stored XML content for a feed entry.
 * Validates user has access to the feed's tenant.
 */
export async function getAmazonFeedContent(feedId: string): Promise<{
  success: boolean;
  content?: string;
  fileName?: string;
  message?: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    const { channelFeeds } = await import("@/db/schema/channel-feeds");

    const feed = await db.query.channelFeeds.findFirst({
      where: and(
        eq(channelFeeds.id, feedId),
        eq(channelFeeds.tenantId, user.tenant_id),
        eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
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
      fileName: feed.fileName || `amazon-feed-${feedId}.xml`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get feed content",
    };
  }
}
```

---

### Task 3: Add retryAmazonFeed Server Action

**Location**: `src/modules/channels/adapters/amazon/actions.ts`

**Add after `getAmazonFeedContent` function:**

```typescript
/**
 * Retry a failed Amazon feed
 *
 * Story 17.5 - AC4: Retry Failed Feeds
 * Re-attempts upload using stored XML content.
 * Creates new feed record linked to original via retryOf.
 */
export async function retryAmazonFeed(feedId: string): Promise<{
  success: boolean;
  newFeedId?: string;
  message?: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    const { channelFeeds } = await import("@/db/schema/channel-feeds");

    // Get the original feed
    const originalFeed = await db.query.channelFeeds.findFirst({
      where: and(
        eq(channelFeeds.id, feedId),
        eq(channelFeeds.tenantId, user.tenant_id),
        eq(channelFeeds.channel, CHANNEL_TYPES.AMAZON),
      ),
    });

    if (!originalFeed) {
      return { success: false, message: "Feed not found" };
    }

    if (originalFeed.status !== "failed") {
      return { success: false, message: "Only failed feeds can be retried" };
    }

    if (!originalFeed.feedContent) {
      return {
        success: false,
        message:
          "Feed content not available for retry. Please trigger a new feed.",
      };
    }

    // Trigger retry job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/amazon.feed-retry",
      data: {
        tenantId: user.tenant_id,
        originalFeedId: feedId,
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Retry started" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to retry feed",
    };
  }
}
```

---

### Task 4: Add Inngest Amazon Feed Retry Job

## **CRITICAL: Use Existing Amazon API Functions**

The retry job MUST use the existing functions from `feeds-api-client.ts`:
- `createFeedDocument` - NOT a fictional `submitFeedToAmazon`
- `uploadFeedContent`
- `createFeed`
- `getFeedStatus`

**Location**: `src/inngest/amazon-feed.ts`

**Step 1: Add imports at top of file (if not already present):**

```typescript
import {
  createFeedDocument,
  uploadFeedContent,
  createFeed,
  getFeedStatus,
} from "@/modules/channels/adapters/amazon/feeds-api-client";
```

**Step 2: Add after the main `amazonFeed` function:**

```typescript
/**
 * Amazon Feed Retry Job
 *
 * Story 17.5 - AC4: Retry Failed Feeds
 * Re-attempts upload using stored XML content from original feed.
 *
 * CRITICAL: Must follow same multi-step flow as main amazonFeed:
 * 1. createFeedDocument - Get pre-signed S3 URL
 * 2. uploadFeedContent - Upload XML to S3
 * 3. createFeed - Submit to Amazon
 * 4. getFeedStatus - Poll for completion
 */
export const amazonFeedRetry = inngest.createFunction(
  {
    id: "amazon-feed-retry",
    retries: 2,
  },
  { event: "channel/amazon.feed-retry" },
  async ({ event, step }) => {
    const { tenantId, originalFeedId } = event.data as {
      tenantId: string;
      originalFeedId: string;
      userId?: string;
    };

    // Step 1: Get original feed with content
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

    // Capture feed content for closures
    const feedContent = originalFeed.feedContent;
    const fileName = originalFeed.fileName || `retry-${originalFeedId}.xml`;

    // Step 2: Create new retry feed record
    const retryFeedId = await step.run("create-retry-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.AMAZON,
          status: FEED_STATUS.PENDING,
          feedType: originalFeed.feedType,
          triggeredBy: "manual",
          productCount: originalFeed.productCount,
          feedContent,
          fileName,
          retryOf: originalFeedId,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    try {
      // Step 3: Get credentials
      const storedCredentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
          ),
        });
        if (!cred) throw new Error("Amazon credentials not configured");
        return JSON.parse(
          decryptCredentials(cred.credentials),
        ) as AmazonStoredCredentials;
      });

      // Build API credentials
      const apiCredentials: AmazonCredentials = {
        accessKeyId: storedCredentials.accessKeyId,
        secretAccessKey: storedCredentials.secretAccessKey,
        marketplaceId: storedCredentials.marketplaceId,
        region: getRegionForMarketplace(storedCredentials.marketplaceCode),
      };

      // Step 4: Create feed document (get pre-signed S3 URL)
      const feedDocument = await step.run("create-feed-document", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, retryFeedId));

        return await createFeedDocument(apiCredentials);
      });

      // Step 5: Upload XML to S3
      const uploadResult = await step.run("upload-to-s3", async () => {
        return await uploadFeedContent(feedDocument.url, feedContent);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "S3 upload failed");
      }

      // Step 6: Create feed submission
      const feedSubmission = await step.run("create-feed", async () => {
        return await createFeed(apiCredentials, feedDocument.feedDocumentId);
      });

      // Store Amazon feed ID in metadata
      await step.run("store-amazon-feed-id", async () => {
        await adminDb
          .update(channelFeeds)
          .set({
            metadata: {
              ...(originalFeed.metadata as Record<string, unknown> || {}),
              amazonFeedId: feedSubmission.feedId,
              feedDocumentId: feedDocument.feedDocumentId,
              retryOf: originalFeedId,
            },
          })
          .where(eq(channelFeeds.id, retryFeedId));
      });

      // Step 7: Poll for completion status (same as main amazonFeed)
      let feedStatus = await step.run("get-initial-status", async () => {
        return await getFeedStatus(apiCredentials, feedSubmission.feedId);
      });

      let pollAttempts = 0;
      const maxPollAttempts = 20; // 10 minutes at 30 second intervals

      while (
        (feedStatus.processingStatus === "IN_PROGRESS" ||
          feedStatus.processingStatus === "IN_QUEUE") &&
        pollAttempts < maxPollAttempts
      ) {
        await step.sleep(`poll-wait-${pollAttempts}`, "30 seconds");

        feedStatus = await step.run(`poll-status-${pollAttempts}`, async () => {
          return await getFeedStatus(apiCredentials, feedSubmission.feedId);
        });

        pollAttempts++;
      }

      // Step 8: Handle final status
      if (feedStatus.processingStatus === "DONE") {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              fileSize: feedContent.length,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, retryFeedId));
        });

        return {
          success: true,
          retryFeedId,
          amazonFeedId: feedSubmission.feedId,
        };
      } else if (
        feedStatus.processingStatus === "FATAL" ||
        feedStatus.processingStatus === "CANCELLED"
      ) {
        throw new Error(
          `Amazon feed processing ${feedStatus.processingStatus}`,
        );
      } else {
        throw new Error("Feed processing timed out after 10 minutes");
      }
    } catch (error) {
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage:
            error instanceof Error ? error.message : "Retry failed",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, retryFeedId));

      throw error;
    }
  },
);
```

**Step 3: Update exports at bottom of amazon-feed.ts:**

```typescript
// Ensure both functions are exported
export { amazonFeed, amazonFeedRetry };
```

**Step 4: Add event type to `src/inngest/client.ts`:**

Find the events type definition and add:

```typescript
"channel/amazon.feed-retry": {
  data: {
    tenantId: string;
    originalFeedId: string;
    userId?: string;
  };
};
```

**Step 5: Register in `src/inngest/functions.ts`:**

```typescript
import { amazonFeed, amazonFeedRetry } from "./amazon-feed";

export const functions = [
  // ... existing functions
  amazonFeed,
  amazonFeedRetry,
];
```

---

### Task 6: Update AmazonFeedHistory Component

**Location**: `src/modules/channels/adapters/amazon/components/amazon-feed-history.tsx`

**Pattern**: Follow `src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx`

**Key Changes:**

1. **Add state for modal:**
   ```typescript
   const [selectedFeed, setSelectedFeed] = useState<ChannelFeed | null>(null);
   const [detailModalOpen, setDetailModalOpen] = useState(false);
   ```

2. **Add click handler:**
   ```typescript
   function handleViewDetails(feed: ChannelFeed) {
     setSelectedFeed(feed);
     setDetailModalOpen(true);
   }
   ```

3. **Add onClick to feed rows** and `cursor-pointer hover:bg-muted/50` classes

4. **Add Details button:**
   ```typescript
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
   ```

5. **Add modal at bottom:**
   ```typescript
   <AmazonFeedDetailModal
     feed={selectedFeed}
     open={detailModalOpen}
     onOpenChange={setDetailModalOpen}
   />
   ```

6. **Add imports:**
   ```typescript
   import { Eye } from "lucide-react";
   import { useState } from "react";
   import { Button } from "@/components/ui/button";
   import { AmazonFeedDetailModal } from "./amazon-feed-detail-modal";
   ```

---

### Task 7: Update Parent Page for Refresh

## **GOTCHA: Server Component Cannot Pass Callbacks**

The parent page `src/app/(dashboard)/settings/integrations/amazon/page.tsx` is a **Server Component**. It cannot pass an `onRefresh` callback.

**Solution**: The `revalidatePath("/settings/integrations/amazon")` in `retryAmazonFeed` action handles server-side revalidation. For immediate client feedback, the modal closes on success and shows a toast. User can manually refresh or navigate away/back.

**No changes needed to parent page** - the server action's `revalidatePath` handles cache invalidation. Next page navigation will show updated data.

---

### Project Structure Notes

```
src/
├── modules/channels/adapters/amazon/
│   ├── actions.ts                         # MODIFY: Add getAmazonFeedContent, retryAmazonFeed
│   └── components/
│       ├── amazon-feed-detail-modal.tsx   # NEW: Copy from Ingram, apply changes above
│       └── amazon-feed-history.tsx        # MODIFY: Add click-to-view and modal
│
├── inngest/
│   ├── amazon-feed.ts                     # MODIFY: Add amazonFeedRetry, update exports
│   ├── client.ts                          # MODIFY: Add amazon.feed-retry event type
│   └── functions.ts                       # MODIFY: Register amazonFeedRetry
```

### Security Requirements

1. **Tenant isolation**: `getAmazonFeedContent` validates feed belongs to user's tenant
2. **Role check**: Only owner/admin can retry feeds (inherited from `getAuthenticatedUserWithTenant`)
3. **Content size limit**: XML preview truncated at 50KB, download available for full content
4. **No credential exposure**: XML content never includes Amazon API credentials

### Storage Considerations

Feed XML content is already stored in the `feedContent` column (added in Story 16.5). No schema changes needed - Amazon feeds use the same `channel_feeds` table.

### References

- `src/modules/channels/adapters/ingram/components/feed-detail-modal.tsx` - COPY THIS
- `src/modules/channels/adapters/ingram/actions.ts` - getFeedContent/retryFailedFeed pattern
- `src/inngest/ingram-feed.ts` - ingramFeedRetry pattern (lines 320-454)
- `src/inngest/amazon-feed.ts` - EXISTING amazonFeed with correct multi-step flow
- `src/modules/channels/adapters/amazon/feeds-api-client.ts` - createFeedDocument, uploadFeedContent, createFeed, getFeedStatus
- `src/db/schema/channel-feeds.ts` - feedContent column already exists

---

## Test Scenarios

### Unit Tests (`src/__tests__/amazon-feed-history.test.ts`)

- getAmazonFeedContent returns content for valid feed
- getAmazonFeedContent denies access for other tenant's feed
- getAmazonFeedContent handles missing content gracefully
- retryAmazonFeed creates new feed record with retryOf link
- retryAmazonFeed rejects non-failed feeds
- retryAmazonFeed rejects feeds without stored content

### Inngest Job Tests (`src/__tests__/amazon-feed-retry.test.ts`)

- Retry job follows complete 4-step upload flow
- Retry job creates proper feed record with retryOf reference
- Retry job polls for status until DONE
- Retry job handles S3 upload failures
- Retry job handles Amazon processing FATAL status
- Retry job stores Amazon Feed ID in metadata on success

### Component Tests

- AmazonFeedDetailModal displays all feed metadata including Amazon Feed ID
- AmazonFeedDetailModal loads and displays XML content
- AmazonFeedDetailModal copy and download work correctly
- AmazonFeedDetailModal retry button triggers action
- AmazonFeedHistory shows clickable entries
- AmazonFeedHistory opens detail modal on click
- Error resolutions display for Amazon-specific errors

### Manual Testing Checklist

- [ ] Navigate to Settings > Integrations > Amazon
- [ ] See feed history list with all feed types
- [ ] Click on a feed entry - detail modal opens
- [ ] See detail modal with all metadata including Amazon Feed ID
- [ ] Click "XML Content" tab - XML loads
- [ ] Click "Copy" button - XML copies to clipboard
- [ ] Click "Download" button - XML downloads as file
- [ ] View a failed feed - see error details tab
- [ ] See error details with suggested resolution
- [ ] Click "Retry" button on failed feed
- [ ] See retry progress
- [ ] See new feed entry in history with retry indicator
- [ ] Verify retried feed has correct retryOf reference

---

## Dev Agent Record

### Context Reference

This story completes Epic 17 by providing comprehensive feed troubleshooting capabilities for Amazon. It follows the exact pattern established in Story 16.5 (Ingram Feed History).

**Prior Stories Context:**
- Story 17.1 established Amazon SP-API authentication
- Story 17.2 implemented ONIX feed delivery to Amazon (created AmazonFeedHistory component)
- Story 17.3 implemented sales import
- Story 17.4 implemented ASIN linking
- Story 16.5 provides the EXACT PATTERN to follow (Ingram feed history)

**Key Files from Prior Stories:**
- `src/modules/channels/adapters/ingram/components/feed-detail-modal.tsx` - COPY THIS
- `src/modules/channels/adapters/ingram/actions.ts` - getFeedContent/retryFailedFeed pattern
- `src/inngest/ingram-feed.ts` - ingramFeedRetry function (BUT use Amazon's multi-step flow)
- `src/inngest/amazon-feed.ts` - EXISTING amazonFeed with correct upload flow
- `src/modules/channels/adapters/amazon/feeds-api-client.ts` - API functions to use

**Existing Patterns to Follow:**
- Server actions: See Amazon actions.ts for `getAuthenticatedUserWithTenant` pattern
- UI components: Use shadcn Dialog, Tabs, Badge, Button components
- Feed content storage: Already in `feedContent` column from Story 16.5
- Inngest jobs: Follow amazonFeed pattern with step functions
- **Amazon upload**: Use createFeedDocument → uploadFeedContent → createFeed → getFeedStatus

### Completion Notes List

- NO SCHEMA CHANGES NEEDED - feedContent and retryOf columns already exist from Story 16.5
- Copy FeedDetailModal from Ingram with Amazon-specific changes (error resolutions, Amazon Feed ID display)
- Server actions follow exact Ingram pattern, just change channel type
- **Inngest retry job MUST follow Amazon's multi-step upload flow** (not Ingram's single FTP upload)
- Amazon-specific error resolutions for SP-API errors
- Update existing AmazonFeedHistory component to add click-to-view functionality
- Parent page refresh handled by revalidatePath in server action

**Implementation Summary (2025-12-17):**
- Created AmazonFeedDetailModal component with Amazon-specific error resolutions
- Added getAmazonFeedContent and retryAmazonFeed server actions following Ingram pattern
- Implemented amazonFeedRetry Inngest job following Amazon's 4-step upload flow
- Updated AmazonFeedHistory with click-to-view modal integration
- Added comprehensive unit tests for feed history and retry functionality
- All TypeScript compilation passes
- No lint errors in new code

**Code Review Fixes Applied (2025-12-17):**
1. Added try/catch to clipboard copy in AmazonFeedDetailModal (error handling)
2. Improved tab loading UX with controlled tabs and spinner (UX improvement)
3. Added clarifying comment for intentional onFailure omission in retry job (documentation)

### File List

**New files:**
- `src/modules/channels/adapters/amazon/components/amazon-feed-detail-modal.tsx`
- `tests/unit/amazon-feed-history.test.ts`
- `tests/unit/amazon-feed-retry.test.ts`

**Modified files:**
- `src/modules/channels/adapters/amazon/actions.ts` - Add getAmazonFeedContent, retryAmazonFeed
- `src/modules/channels/adapters/amazon/components/amazon-feed-history.tsx` - Add click-to-view
- `src/inngest/amazon-feed.ts` - Add amazonFeedRetry function, update exports
- `src/inngest/client.ts` - Add amazon.feed-retry event type
- `src/inngest/functions.ts` - Register amazonFeedRetry function
- `src/inngest/ingram-feed.ts` - Add clarifying comment for retry job (code review)

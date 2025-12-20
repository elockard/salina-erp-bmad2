# Story 17.2: Schedule Automated ONIX Feeds to Amazon

Status: done

## Story

**As a** publisher,
**I want** to schedule automatic ONIX feeds to Amazon,
**So that** Amazon always has current metadata without manual intervention.

## Context

This story builds on Story 17.1 (Amazon Account Connection) to enable automated ONIX feed delivery to Amazon KDP/Advantage. The world's largest book retailer requires accurate metadata for optimal discoverability and sales.

### Dependencies
- Story 17.1 (Configure Amazon Account Connection) - Complete
- Epic 14 (ONIX Core) - Complete (provides ONIX 3.0/3.1 generation)
- Story 16.2 (Ingram Feed Scheduling) - Complete (provides `channel_feeds` infrastructure)

### Business Value
- Eliminates manual ONIX file uploads to Amazon
- Ensures Amazon always has current catalog metadata
- Reduces time-to-market for new titles
- Prevents metadata staleness causing lost sales on the world's largest retailer
- Amazon represents ~50% of US book sales

### Amazon Feed Delivery Method

**Amazon SP-API Feeds API:**
- POST `/feeds/2021-06-30/feeds` - Create feed
- GET `/feeds/2021-06-30/feeds/{feedId}` - Check processing status
- Feed types: `POST_PRODUCT_DATA` for ONIX metadata

**Feed Processing Flow:**
1. Create feed document (get upload URL)
2. Upload ONIX XML to pre-signed S3 URL
3. Create feed with document ID
4. Poll for completion status
5. Handle success/error

### Key Differences from Ingram (Story 16.2)

| Aspect | Ingram | Amazon |
|--------|--------|--------|
| Transport | FTPS | HTTP API (SP-API) |
| ONIX Version | 3.0 | 3.1 |
| Authentication | Username/Password | AWS Signature V4 |
| Status Check | Immediate (FTP success) | Poll for processing status |
| Response | Upload success/fail | Processing ID + status polling |

## Acceptance Criteria

### AC1: Feed Schedule Configuration
- **Given** I have Amazon configured (Story 17.1)
- **When** I access Amazon integration settings
- **Then** I see a "Feed Schedule" section
- **And** I can configure:
  - Frequency: disabled, daily, weekly
  - Time of day (for daily) or day + time (for weekly)
  - Title selection: all titles, changed since last feed only
- **And** schedule is saved and takes effect immediately

### AC2: ONIX 3.1 Format Generation
- **Given** feed generation is triggered
- **When** system generates the ONIX file
- **Then** format is ONIX 3.1 (Amazon's supported format)
- **And** all required elements are included per EDItEUR specification
- **And** Amazon-specific elements included (ASIN mapping if available)
- **And** file is named with timestamp: `{tenant_subdomain}_onix31_amazon_{YYYYMMDD_HHMMSS}.xml`

### AC3: Amazon Feeds API Upload
- **Given** ONIX file is generated
- **When** system uploads to Amazon
- **Then** file is uploaded via SP-API Feeds endpoint
- **And** upload uses credentials from Story 17.1
- **And** system receives feed processing ID
- **And** upload has 60-second timeout with retry

### AC4: Manual Feed Trigger
- **Given** I have Amazon configured
- **When** I click "Send Feed Now" button
- **Then** system generates and uploads ONIX feed immediately
- **And** I see progress indicator during generation/upload
- **And** I receive success/failure notification on completion

### AC5: Feed Status Polling
- **Given** feed is submitted to Amazon
- **When** Amazon processes the feed
- **Then** system polls for completion status (every 30 seconds, max 10 minutes)
- **And** feed record updated when processing completes
- **And** error details captured if processing fails
- **And** Amazon error codes displayed in feed history

### AC6: Changed Titles Detection
- **Given** "changed since last feed" is selected
- **When** system generates feed
- **Then** only titles updated since last successful feed are included
- **And** if no titles changed, feed is skipped (no empty feed sent)
- **And** status indicates "No changes - feed skipped"

### AC7: Scheduled Job Reliability
- **Given** a schedule is configured
- **When** scheduled time arrives
- **Then** Inngest job triggers feed generation
- **And** failed jobs retry 3x with exponential backoff
- **And** persistent failures update channel status to "error"

## Tasks

- [x] Task 1 (AC: 1): Add feed schedule configuration to Amazon settings page
  - [x] Create AmazonFeedSchedule component (follow IngramFeedSchedule pattern)
  - [x] Add schedule storage in channel_credentials.metadata
  - [x] Add saveAmazonSchedule server action

- [x] Task 2 (AC: 2, 3): Create Amazon Feeds API client
  - [x] Implement createFeedDocument for upload URL
  - [x] Implement uploadFeedContent for S3 upload
  - [x] Implement createFeed to submit feed
  - [x] Implement getFeedStatus for polling
  - [x] Use AWS Signature V4 from Story 17.1

- [x] Task 3 (AC: 2, 3, 5, 7): Create Inngest job for feed generation and upload
  - [x] Create amazon-feed.ts Inngest function
  - [x] Generate ONIX 3.1 using ONIXMessageBuilder
  - [x] Upload via Feeds API
  - [x] Poll for completion status
  - [x] Handle success/failure with status updates

- [x] Task 4 (AC: 4): Implement manual feed trigger with progress UI
  - [x] Add triggerAmazonFeed server action
  - [x] Add "Send Feed Now" button to Amazon settings page
  - [x] Show progress indicator during feed generation

- [x] Task 5 (AC: 6): Implement changed-titles detection logic
  - [x] Query titles updated since last successful Amazon feed
  - [x] Skip feed if no changes detected
  - [x] Update feed status to "skipped" with reason

- [x] Task 6 (AC: 5): Build feed history UI component
  - [x] Create AmazonFeedHistory component (follow IngramFeedHistory pattern)
  - [x] Show Amazon-specific status (processing ID, error codes)
  - [x] Add to Amazon settings page

- [x] Task 7 (AC: 7): Create Amazon feed scheduler cron job
  - [x] Create amazon-feed-scheduler.ts Inngest function
  - [x] Check active Amazon connections hourly
  - [x] Trigger feeds when schedule matches

- [x] Task 8 (AC: 1-7): Write comprehensive tests
  - [x] Unit tests for Amazon Feeds API client
  - [x] Unit tests for schedule validation
  - [x] Integration tests for feed job
  - [x] Test status polling logic

## Dev Notes

### CRITICAL: Reuse Existing Patterns

**DO NOT** create new patterns. This project has established conventions:

1. **Channel Feeds Table**: Reuse `channel_feeds` from Story 16.2 with `channel: 'amazon'`
2. **Inngest Jobs**: Follow `src/inngest/ingram-feed.ts` pattern
3. **Inngest Scheduler**: Follow `src/inngest/ingram-feed-scheduler.ts` for hourly cron pattern (Task 7)
4. **ONIX Builder**: Use `src/modules/onix/builder/message-builder.ts` with version `"3.1"`
5. **UI Components**: Follow `src/modules/channels/adapters/ingram/components/` pattern
6. **Server Actions**: Follow `src/modules/channels/adapters/amazon/actions.ts` pattern

### ALREADY EXISTS - Do Not Recreate

The following already exist in the codebase:

1. **`CHANNEL_TYPES.AMAZON`** - Already defined in `src/db/schema/channel-credentials.ts:60`
2. **Amazon adapter structure** - `src/modules/channels/adapters/amazon/` from Story 17.1
3. **AWS Signature V4 signing** - `signRequest()` in `api-client.ts` (see note below)

### CRITICAL: Export signRequest for Feeds API

The `signRequest()` function in `api-client.ts` is currently **private** (not exported). For the Feeds API client to reuse this function:

**Option A (Recommended):** Export signRequest from api-client.ts:
```typescript
// In api-client.ts, change:
function signRequest(...)  // private
// To:
export function signRequest(...)  // exported
```

**Option B:** Duplicate the signing logic in feeds-api-client.ts (not recommended - violates DRY)

### Amazon SP-API Feeds Endpoint

Reference: https://developer-docs.amazon.com/sp-api/docs/feeds-api-v2021-06-30-reference

**Step 1: Create Feed Document**
```typescript
POST /feeds/2021-06-30/documents
Content-Type: application/json

{
  "contentType": "text/xml; charset=UTF-8"
}

Response:
{
  "feedDocumentId": "amzn1.tortuga.4.na.xxxxxxxx",
  "url": "https://tortuga-prod-na.s3.amazonaws.com/..." // Pre-signed S3 URL
}
```

**Step 2: Upload to Pre-signed URL**
```typescript
PUT {url from step 1}
Content-Type: text/xml; charset=UTF-8

{ONIX XML content}
```

**Step 3: Create Feed**
```typescript
POST /feeds/2021-06-30/feeds
Content-Type: application/json

{
  "feedType": "POST_PRODUCT_DATA",
  "marketplaceIds": ["ATVPDKIKX0DER"],  // From stored credentials
  "inputFeedDocumentId": "amzn1.tortuga.4.na.xxxxxxxx"
}

Response:
{
  "feedId": "FeedId1234"
}
```

**Step 4: Poll for Status**
```typescript
GET /feeds/2021-06-30/feeds/{feedId}

Response:
{
  "feedId": "FeedId1234",
  "feedType": "POST_PRODUCT_DATA",
  "processingStatus": "DONE" | "IN_PROGRESS" | "CANCELLED" | "FATAL",
  "resultFeedDocumentId": "amzn1.tortuga.4.na.yyyyyyyy" // If errors
}
```

### Amazon Feeds API Client

Create `src/modules/channels/adapters/amazon/feeds-api-client.ts`:

```typescript
/**
 * Amazon SP-API Feeds Client
 *
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 *
 * Uses AWS Signature V4 for authentication (from Story 17.1 api-client.ts)
 * NOTE: First export signRequest from api-client.ts (see "Export signRequest" section above)
 */

import { signRequest } from "./api-client"; // Requires signRequest to be exported first
import type { AmazonStoredCredentials } from "./schema";

export interface CreateFeedDocumentResult {
  feedDocumentId: string;
  url: string; // Pre-signed S3 URL for upload
}

export interface CreateFeedResult {
  feedId: string;
}

export interface FeedStatus {
  feedId: string;
  feedType: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL";
  resultFeedDocumentId?: string;
}

/**
 * Create feed document to get upload URL
 */
export async function createFeedDocument(
  credentials: AmazonStoredCredentials
): Promise<CreateFeedDocumentResult> {
  // Implementation using AWS Sig V4
}

/**
 * Upload ONIX XML to pre-signed S3 URL
 */
export async function uploadFeedContent(
  uploadUrl: string,
  xmlContent: string
): Promise<{ success: boolean; message?: string }> {
  // PUT to pre-signed URL
}

/**
 * Create feed submission
 */
export async function createFeed(
  credentials: AmazonStoredCredentials,
  feedDocumentId: string
): Promise<CreateFeedResult> {
  // POST to /feeds endpoint
}

/**
 * Get feed processing status
 */
export async function getFeedStatus(
  credentials: AmazonStoredCredentials,
  feedId: string
): Promise<FeedStatus> {
  // GET feed status
}

/**
 * Poll for feed completion with timeout
 */
export async function pollFeedCompletion(
  credentials: AmazonStoredCredentials,
  feedId: string,
  maxWaitMs: number = 600000, // 10 minutes
  pollIntervalMs: number = 30000 // 30 seconds
): Promise<FeedStatus> {
  // Poll until DONE, CANCELLED, or FATAL
}
```

### Inngest Event Definition

Add to `src/inngest/client.ts`:

```typescript
export interface InngestEvents {
  // ... existing events

  /**
   * Amazon ONIX feed generation event
   * Story 17.2: Scheduled and manual feed delivery
   */
  "channel/amazon.feed": {
    data: {
      tenantId: string;
      feedType: "full" | "delta";
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
}
```

### Inngest Job: Amazon Feed

Create `src/inngest/amazon-feed.ts`:

```typescript
/**
 * Inngest: Amazon ONIX Feed Background Job
 *
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 *
 * Processing Steps:
 * 1. Create feed record with 'pending' status
 * 2. Get tenant's titles (all or changed-only based on feedType)
 * 3. Generate ONIX 3.1 XML using ONIXMessageBuilder
 * 4. Create feed document (get pre-signed upload URL)
 * 5. Upload ONIX XML to S3
 * 6. Create feed submission
 * 7. Poll for completion status
 * 8. Update feed record with success/failure
 */

import { inngest } from "./client";
import { adminDb } from "@/db";
import { channelFeeds, FEED_STATUS, CHANNEL_TYPES } from "@/db/schema";
// ... implementation following ingram-feed.ts pattern
```

### Schedule Storage

Store schedule in `channelCredentials.metadata` JSONB (same as Ingram):

```typescript
{
  schedule: {
    frequency: "daily" | "weekly" | "disabled",
    hour: 6,           // 0-23 UTC
    dayOfWeek: 1,      // 0-6, Sunday=0 (only for weekly)
    feedType: "delta"  // "full" | "delta"
  }
}
```

### UI Components

#### AmazonFeedSchedule Component
Create `src/modules/channels/adapters/amazon/components/amazon-feed-schedule.tsx`:
- Follow `ingram-feed-schedule.tsx` pattern exactly
- Replace Ingram references with Amazon

#### AmazonFeedHistory Component
Create `src/modules/channels/adapters/amazon/components/amazon-feed-history.tsx`:
- Follow `ingram-feed-history.tsx` pattern
- Add Amazon-specific status display (processing ID)

### Server Actions

Add to `src/modules/channels/adapters/amazon/actions.ts`:

```typescript
/**
 * Trigger manual Amazon feed
 * AC4: Manual Feed Trigger
 */
export async function triggerAmazonFeed(): Promise<{ success: boolean; message: string }> {
  // Follow triggerIngramFeed pattern
}

/**
 * Save feed schedule configuration
 * AC1: Feed Schedule Configuration
 */
export async function saveAmazonSchedule(schedule: {
  frequency: "disabled" | "daily" | "weekly";
  hour: number;
  dayOfWeek?: number;
  feedType: "full" | "delta";
}): Promise<{ success: boolean; message: string }> {
  // Follow saveIngramSchedule pattern
}
```

### Queries

Add to `src/modules/channels/adapters/amazon/queries.ts`:

```typescript
/**
 * Get feed history for tenant
 */
export async function getAmazonFeedHistory(limit = 50) {
  // Follow getIngramFeedHistory pattern with channel = AMAZON
}

/**
 * Get current schedule configuration
 */
export async function getAmazonSchedule() {
  // Extract schedule from metadata
}
```

### ONIX 3.1 vs 3.0

Amazon supports ONIX 3.1, use:
```typescript
const builder = new ONIXMessageBuilder(tenantId, tenant, "3.1");
```

Ingram uses ONIX 3.0:
```typescript
const builder = new ONIXMessageBuilder(tenantId, tenant, "3.0");
```

### Feed Status Polling Strategy

Amazon feed processing can take minutes. Polling strategy:

```typescript
// In Inngest job
const feedStatus = await step.run("poll-completion", async () => {
  return await pollFeedCompletion(credentials, feedId, {
    maxWaitMs: 600000,    // 10 minutes max
    pollIntervalMs: 30000, // Check every 30 seconds
  });
});
```

Use Inngest's step.sleep for polling to handle long waits properly:

```typescript
// Alternative: Use step.sleep for better Inngest integration
let status = await getFeedStatus(credentials, feedId);
let attempts = 0;
const maxAttempts = 20; // 10 minutes at 30 second intervals

while (status.processingStatus === "IN_PROGRESS" || status.processingStatus === "IN_QUEUE") {
  if (attempts >= maxAttempts) {
    throw new Error("Feed processing timed out");
  }
  await step.sleep(`poll-wait-${attempts}`, "30 seconds");
  status = await step.run(`poll-status-${attempts}`, async () => {
    return await getFeedStatus(credentials, feedId);
  });
  attempts++;
}
```

### Security Requirements

1. **AWS Signature V4** - All SP-API requests must be signed
2. **Role check** - Only owner/admin can configure schedules and trigger feeds
3. **Tenant isolation** - RLS on channel_feeds table
4. **Credential security** - Never log decrypted credentials
5. **Pre-signed URL security** - Upload URLs are time-limited

### Module Structure

```
src/modules/channels/adapters/amazon/
├── actions.ts                    # Add: triggerAmazonFeed, saveAmazonSchedule
├── api-client.ts                 # From Story 17.1
├── feeds-api-client.ts           # NEW: Feeds API operations
├── queries.ts                    # Add: getAmazonFeedHistory, getAmazonSchedule
├── schema.ts                     # From Story 17.1
├── types.ts                      # Add: FeedStatus, AmazonSchedule types
└── components/
    ├── amazon-settings-form.tsx  # From Story 17.1
    ├── amazon-feed-schedule.tsx  # NEW
    └── amazon-feed-history.tsx   # NEW
```

### References

- [Source: docs/architecture.md - Inngest background jobs]
- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/epics.md - Story 17.2: Schedule Automated ONIX Feeds to Amazon]
- [Source: docs/sprint-artifacts/16-2-schedule-automated-onix-feeds-to-ingram.md - Ingram pattern]
- [Source: docs/sprint-artifacts/17-1-configure-amazon-account-connection.md - Amazon connection]
- [Source: src/inngest/ingram-feed.ts - Inngest feed job pattern]
- [Source: src/modules/onix/builder/message-builder.ts - ONIX 3.1 generation]
- [Source: src/db/schema/channel-feeds.ts - Feed history table]
- [Amazon SP-API Feeds Reference](https://developer-docs.amazon.com/sp-api/docs/feeds-api-v2021-06-30-reference)

## Test Scenarios

### Unit Tests (`tests/unit/amazon-feeds-api-client.test.ts`)
- createFeedDocument returns document ID and URL
- uploadFeedContent handles success response
- uploadFeedContent handles S3 error
- createFeed returns feed ID
- getFeedStatus parses all status values
- pollFeedCompletion times out correctly
- AWS Signature V4 headers correct for Feeds API

### Unit Tests (`tests/unit/amazon-feed-schedule.test.ts`)
- Schedule schema validation (frequency, hour, day)
- Invalid hour (negative, >23) fails validation
- Weekly schedule requires dayOfWeek

### Integration Tests (mocked API)
- Full feed generation and upload flow
- Delta feed with changed titles only
- Delta feed skipped when no changes
- Manual feed trigger
- Scheduled feed trigger
- Feed status polling with retries
- Feed failure handling

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations > Amazon
- [ ] See Feed Schedule section (when connected)
- [ ] Configure daily schedule at specific hour
- [ ] Configure weekly schedule with day and hour
- [ ] Set feed type (full vs delta)
- [ ] Save schedule successfully
- [ ] Click "Send Feed Now" button
- [ ] See progress indication
- [ ] See success/failure notification
- [ ] View feed history with status and processing ID
- [ ] Verify ONIX 3.1 format in generated feed
- [ ] Verify feed submitted to Amazon via API

## Dev Agent Record

### Context Reference

This story extends the Amazon channel adapter from Story 17.1 with feed scheduling. It reuses the feed infrastructure from Story 16.2 (Ingram) - same `channel_feeds` table, same Inngest patterns, same UI component structure.

Key implementation notes from Story 17.1:
- Amazon adapter files exist in `src/modules/channels/adapters/amazon/`
- AWS Signature V4 signing implemented in `api-client.ts`
- Connection credentials stored encrypted in `channel_credentials` table
- Marketplace-specific regions and endpoints configured

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- Use ONIX 3.1 format for Amazon (pass `"3.1"` to ONIXMessageBuilder)
- Amazon Feeds API requires multi-step process: create document → upload → create feed → poll
- Feed processing can take 5-10 minutes - use step.sleep for polling
- Store Amazon feed processing ID in feed metadata for debugging
- Reuse channel_feeds table with channel='amazon'
- Follow Ingram patterns for UI components and server actions
- AC2 ASIN mapping: ASIN is assigned BY Amazon after submission, not provided by publishers. Including ASIN in feeds would require schema changes (new field) and feed result parsing - out of scope for this story.
- Code review fixes applied: N+1 query optimization (batch query), rate limiting on manual trigger, schema validation on schedule retrieval, barrel export for components

### File List

New files:
- `src/modules/channels/adapters/amazon/feeds-api-client.ts` - SP-API Feeds operations
- `src/modules/channels/adapters/amazon/components/amazon-feed-schedule.tsx` - Schedule UI
- `src/modules/channels/adapters/amazon/components/amazon-feed-history.tsx` - History UI
- `src/modules/channels/adapters/amazon/components/index.ts` - Barrel export for components
- `src/inngest/amazon-feed.ts` - Feed generation Inngest job
- `src/inngest/amazon-feed-scheduler.ts` - Hourly cron scheduler
- `tests/unit/amazon-feeds-api-client.test.ts` - Feeds API tests
- `tests/unit/amazon-feed-schedule.test.ts` - Schedule validation tests
- `tests/unit/amazon-feed-job.test.ts` - Inngest job tests

Modified files:
- `src/inngest/client.ts` - Add channel/amazon.feed event type
- `src/inngest/functions.ts` - Register amazonFeed and amazonFeedScheduler
- `src/modules/channels/adapters/amazon/actions.ts` - Add triggerAmazonFeed, saveAmazonSchedule, rate limiting
- `src/modules/channels/adapters/amazon/queries.ts` - Add getAmazonFeedHistory, getAmazonSchedule with validation
- `src/modules/channels/adapters/amazon/types.ts` - Add AmazonSchedule, FeedStatus types
- `src/modules/title-authors/queries.ts` - Add getTitlesWithAuthorsAdminBatch for N+1 optimization
- `src/app/(dashboard)/settings/integrations/amazon/page.tsx` - Add schedule and history sections

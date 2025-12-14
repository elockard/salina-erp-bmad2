# Story 16.2: Schedule Automated ONIX Feeds to Ingram

Status: complete

## Story

**As a** publisher,
**I want** to schedule automatic ONIX feeds to Ingram,
**So that** Ingram always has current metadata without manual intervention.

## Context

This story builds on Story 16.1 (Ingram Account Connection) to enable automated ONIX feed delivery. Publishers need reliable, scheduled delivery of catalog updates to Ingram Content Group - the largest US book distributor.

### Dependencies
- Story 16.1 (Configure Ingram Account Connection) - Complete
- Epic 14 (ONIX Core) - Complete (provides ONIX 3.0/3.1 generation)

### Business Value
- Eliminates manual ONIX file uploads
- Ensures Ingram always has current catalog metadata
- Reduces time-to-market for new titles
- Prevents metadata staleness causing lost sales

## Acceptance Criteria

### AC1: Feed Schedule Configuration
- **Given** I have Ingram configured (Story 16.1)
- **When** I access Ingram integration settings
- **Then** I see a "Feed Schedule" section
- **And** I can configure:
  - Frequency: disabled, daily, weekly
  - Time of day (for daily) or day + time (for weekly)
  - Title selection: all titles, changed since last feed only
- **And** schedule is saved and takes effect immediately

### AC2: ONIX 3.0 Format Generation
- **Given** feed generation is triggered
- **When** system generates the ONIX file
- **Then** format is ONIX 3.0 International (Ingram's preferred format)
- **And** all required elements are included per EDItEUR specification
- **And** file is named with timestamp: `{tenant_subdomain}_onix30_{YYYYMMDD_HHMMSS}.xml`

### AC3: Automated FTP Upload
- **Given** ONIX file is generated
- **When** system uploads to Ingram
- **Then** file is uploaded to `/inbound/` directory via FTPS
- **And** upload uses credentials from Story 16.1
- **And** upload has 60-second timeout with retry

### AC4: Manual Feed Trigger
- **Given** I have Ingram configured
- **When** I click "Send Feed Now" button
- **Then** system generates and uploads ONIX feed immediately
- **And** I see progress indicator during generation/upload
- **And** I receive success/failure notification on completion

### AC5: Feed History
- **Given** feeds have been sent
- **When** I view "Feed History" section
- **Then** I see list of all feed deliveries
- **And** each entry shows:
  - Timestamp
  - Product count
  - Status (pending, uploading, success, failed)
  - File size
  - Error message (if failed)
- **And** history shows last 90 days

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

- [x] Task 1 (AC: 5): Create `channel_feeds` database schema
- [x] Task 2 (AC: 1): Add feed schedule configuration to Ingram settings page
- [x] Task 3 (AC: 2, 3): Create Inngest job for feed generation and upload
- [x] Task 4 (AC: 4): Implement manual feed trigger with progress UI
- [x] Task 5 (AC: 6): Implement changed-titles detection logic
- [x] Task 6 (AC: 5): Build feed history UI component
- [x] Task 7 (AC: 1-7): Write comprehensive tests

## Dev Notes

### CRITICAL: Reuse Existing Patterns

**DO NOT** create new patterns. This project has established conventions:

1. **Inngest**: See `src/inngest/` for job patterns - especially `generate-statements-batch.ts`
2. **ONIX Builder**: Use `src/modules/onix/builder/message-builder.ts` with version `"3.0"`
3. **FTP Client**: Reuse `src/modules/channels/adapters/ingram/ftp-client.ts` - `uploadToIngram` is ready
4. **Credentials**: Use `getDecryptedIngramCredentials()` from `src/modules/channels/adapters/ingram/actions.ts`

### Database Schema: channel_feeds

Create `src/db/schema/channel-feeds.ts`:

```typescript
import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const channelFeeds = pgTable("channel_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // 'ingram', 'amazon'
  status: text("status").notNull().default("pending"), // 'pending', 'generating', 'uploading', 'success', 'failed', 'skipped'
  productCount: integer("product_count"),
  fileSize: integer("file_size"), // bytes
  fileName: text("file_name"),
  feedType: text("feed_type").notNull(), // 'full', 'delta'
  triggeredBy: text("triggered_by").notNull(), // 'schedule', 'manual'
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // { schedule_frequency, onix_version, etc. }
  startedAt: timestamp("started_at", { mode: "date", withTimezone: true }),
  completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ChannelFeed = typeof channelFeeds.$inferSelect;
export type InsertChannelFeed = typeof channelFeeds.$inferInsert;

export const FEED_STATUS = {
  PENDING: "pending",
  GENERATING: "generating",
  UPLOADING: "uploading",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export const FEED_TYPE = {
  FULL: "full",
  DELTA: "delta",
} as const;

export const TRIGGER_TYPE = {
  SCHEDULE: "schedule",
  MANUAL: "manual",
} as const;
```

### Feed Schedule Storage

**Decision:** Store schedule in `channelCredentials.metadata` JSONB field.

Rationale:
- No new table needed (simpler)
- Already has tenant context and RLS
- Schedule is channel-specific config, logical to co-locate
- Metadata is not encrypted (schedule isn't sensitive like credentials)

**Schema Update Required:** Add `metadata` column to `channel_credentials` table:

```typescript
// Add to src/db/schema/channel-credentials.ts in the channelCredentials table definition:
metadata: jsonb("metadata"), // Schedule config, non-sensitive settings
```

Then run `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate` to apply.

Store schedule as:

```typescript
// Example metadata structure
{
  schedule: {
    frequency: "daily" | "weekly" | "disabled",
    hour: 6,           // 0-23 UTC
    dayOfWeek: 1,      // 0-6, Sunday=0 (only for weekly)
    feedType: "delta"  // "full" | "delta"
  }
}
```

Update credentials with schedule via `saveIngramSchedule` action (see Server Actions section).

### Inngest Event Definition

Add to `src/inngest/client.ts`:

```typescript
export interface InngestEvents {
  // ... existing events

  /**
   * Ingram ONIX feed generation event
   * Story 16.2: Scheduled and manual feed delivery
   */
  "channel/ingram.feed": {
    data: {
      tenantId: string;
      feedType: "full" | "delta";
      triggeredBy: "schedule" | "manual";
      userId?: string; // For manual triggers
    };
  };
}
```

### Inngest Job: Ingram Feed

Create `src/inngest/ingram-feed.ts`:

```typescript
/**
 * Inngest: Ingram ONIX Feed Background Job
 *
 * Story 16.2 - Schedule Automated ONIX Feeds to Ingram
 *
 * Processing Steps:
 * 1. Create feed record with 'pending' status
 * 2. Get tenant's titles (all or changed-only based on feedType)
 * 3. Generate ONIX 3.0 XML using ONIXMessageBuilder
 * 4. Write to temp file
 * 5. Upload to Ingram via FTPS
 * 6. Update feed record with success/failure
 * 7. Clean up temp file
 */

import { inngest } from "./client";
import { adminDb } from "@/db";
import { channelFeeds, FEED_STATUS } from "@/db/schema/channel-feeds";
import { channelCredentials, CHANNEL_TYPES } from "@/db/schema/channel-credentials";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { eq, and, gt } from "drizzle-orm";
import { decryptCredentials } from "@/lib/channel-encryption";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import { getTitleWithAuthors } from "@/modules/title-authors/queries";
import { uploadToIngram } from "@/modules/channels/adapters/ingram/ftp-client";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

interface IngramFeedEventData {
  tenantId: string;
  feedType: "full" | "delta";
  triggeredBy: "schedule" | "manual";
  userId?: string;
}

export const ingramFeed = inngest.createFunction(
  {
    id: "ingram-feed",
    retries: 3,
  },
  { event: "channel/ingram.feed" },
  async ({ event, step }) => {
    const { tenantId, feedType, triggeredBy, userId } = event.data as IngramFeedEventData;

    // Step 1: Create feed record
    const feedId = await step.run("create-feed-record", async () => {
      const [feed] = await adminDb
        .insert(channelFeeds)
        .values({
          tenantId,
          channel: CHANNEL_TYPES.INGRAM,
          status: FEED_STATUS.PENDING,
          feedType,
          triggeredBy,
          startedAt: new Date(),
        })
        .returning();
      return feed.id;
    });

    try {
      // Step 2: Get credentials
      const credentials = await step.run("get-credentials", async () => {
        const cred = await adminDb.query.channelCredentials.findFirst({
          where: and(
            eq(channelCredentials.tenantId, tenantId),
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM)
          ),
        });

        if (!cred) throw new Error("Ingram credentials not configured");

        return JSON.parse(decryptCredentials(cred.credentials));
      });

      // Step 3: Get tenant info
      const tenant = await step.run("get-tenant", async () => {
        const t = await adminDb.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });
        if (!t) throw new Error("Tenant not found");
        return t;
      });

      // Step 4: Get titles to include
      // NOTE: Uses adminDb because Inngest jobs run outside HTTP request context (no RLS session)
      const titlesToExport = await step.run("get-titles", async () => {
        // Get last successful feed for delta calculation
        let lastSuccessfulFeed = null;
        if (feedType === "delta") {
          lastSuccessfulFeed = await adminDb.query.channelFeeds.findFirst({
            where: and(
              eq(channelFeeds.tenantId, tenantId),
              eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM),
              eq(channelFeeds.status, FEED_STATUS.SUCCESS)
            ),
            orderBy: (feeds, { desc }) => [desc(feeds.completedAt)],
          });
        }

        // Get all tenant titles first
        const allTitles = await adminDb.query.titles.findMany({
          where: eq(titles.tenant_id, tenantId),
        });

        // Filter for delta if needed
        let filteredTitles = allTitles;
        if (feedType === "delta" && lastSuccessfulFeed?.completedAt) {
          filteredTitles = allTitles.filter(
            (t) => t.updated_at && new Date(t.updated_at) > lastSuccessfulFeed!.completedAt!
          );
        }

        // Fetch authors for each title (pattern from src/modules/onix/actions.ts)
        const titlesWithAuthors = [];
        for (const title of filteredTitles) {
          const titleWithAuthors = await getTitleWithAuthors(title.id);
          if (titleWithAuthors) {
            titlesWithAuthors.push(titleWithAuthors);
          }
        }

        return titlesWithAuthors;
      });

      // Step 5: Check if we have titles to export
      if (titlesToExport.length === 0) {
        await step.run("mark-skipped", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SKIPPED,
              productCount: 0,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, feedId));
        });

        return {
          success: true,
          skipped: true,
          reason: "No titles to export",
          feedId,
        };
      }

      // Step 6: Generate ONIX XML
      const { xml, fileName } = await step.run("generate-onix", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.GENERATING })
          .where(eq(channelFeeds.id, feedId));

        // Use ONIX 3.0 for Ingram (per AC2)
        const builder = new ONIXMessageBuilder(tenantId, {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          subdomain: tenant.subdomain,
          default_currency: tenant.default_currency || "USD",
        }, "3.0");

        for (const title of titlesToExport) {
          builder.addTitle(title);
        }

        const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
        const fileName = `${tenant.subdomain}_onix30_${timestamp}.xml`;

        return { xml: builder.toXML(), fileName };
      });

      // Step 7: Write temp file
      const tempFilePath = await step.run("write-temp-file", async () => {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, xml, "utf-8");
        return filePath;
      });

      // Step 8: Upload to Ingram
      const uploadResult = await step.run("upload-to-ingram", async () => {
        await adminDb
          .update(channelFeeds)
          .set({ status: FEED_STATUS.UPLOADING })
          .where(eq(channelFeeds.id, feedId));

        return await uploadToIngram(credentials, tempFilePath, fileName);
      });

      // Step 9: Get file size BEFORE cleanup
      const fileSize = await step.run("get-file-size", async () => {
        const stats = await fs.stat(tempFilePath).catch(() => null);
        return stats?.size || xml.length;
      });

      // Step 10: Clean up temp file
      await step.run("cleanup", async () => {
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      });

      // Step 11: Update feed record
      if (uploadResult.success) {
        await step.run("mark-success", async () => {
          await adminDb
            .update(channelFeeds)
            .set({
              status: FEED_STATUS.SUCCESS,
              productCount: titlesToExport.length,
              fileSize,
              fileName,
              completedAt: new Date(),
            })
            .where(eq(channelFeeds.id, feedId));
        });

        return {
          success: true,
          feedId,
          productCount: titlesToExport.length,
          fileName,
        };
      } else {
        throw new Error(uploadResult.message);
      }
    } catch (error) {
      // Mark feed as failed
      await adminDb
        .update(channelFeeds)
        .set({
          status: FEED_STATUS.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(channelFeeds.id, feedId));

      throw error; // Re-throw for Inngest retry
    }
  }
);
```

### Register Inngest Functions

Update `src/inngest/functions.ts`:

```typescript
import { ingramFeed, ingramFeedScheduler } from "./ingram-feed";

export const functions = [
  generateStatementPdf,
  generateStatementsBatch,
  generateIsbnPrefixes,
  ingramFeed,           // Manual and event-triggered feeds
  ingramFeedScheduler,  // Hourly cron to check schedules
];
```

**Note:** Both functions should be in the same file (`ingram-feed.ts`) or split into `ingram-feed.ts` and `ingram-feed-scheduler.ts` - adjust imports accordingly.

### Scheduled Job via Inngest Cron

Inngest supports cron schedules. Create a cron function that checks all tenants:

```typescript
// src/inngest/ingram-feed-scheduler.ts
import { inngest } from "./client";
import { adminDb } from "@/db";
import { channelCredentials, CHANNEL_TYPES, CHANNEL_STATUS } from "@/db/schema/channel-credentials";
import { eq, and } from "drizzle-orm";

/**
 * Cron job that runs hourly and triggers feeds for tenants
 * whose schedule matches the current time.
 */
export const ingramFeedScheduler = inngest.createFunction(
  {
    id: "ingram-feed-scheduler",
  },
  { cron: "0 * * * *" }, // Every hour on the hour
  async ({ step }) => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay(); // 0 = Sunday

    // Find all active Ingram connections
    const activeConnections = await step.run("get-active-connections", async () => {
      return adminDb.query.channelCredentials.findMany({
        where: and(
          eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
          eq(channelCredentials.status, CHANNEL_STATUS.ACTIVE)
        ),
      });
    });

    const triggeredFeeds: string[] = [];

    for (const connection of activeConnections) {
      // Parse schedule from metadata JSONB field
      const result = await step.run(
        `check-schedule-${connection.tenantId}`,
        async () => {
          // Get schedule from metadata
          const metadata = connection.metadata as { schedule?: {
            frequency: "disabled" | "daily" | "weekly";
            hour: number;
            dayOfWeek?: number;
            feedType: "full" | "delta";
          }} | null;

          const schedule = metadata?.schedule;

          // Skip if no schedule or disabled
          if (!schedule || schedule.frequency === "disabled") {
            return { shouldTrigger: false, feedType: "delta" as const };
          }

          // Check daily schedule: trigger if hour matches
          if (schedule.frequency === "daily" && schedule.hour === currentHour) {
            return { shouldTrigger: true, feedType: schedule.feedType };
          }

          // Check weekly schedule: trigger if day AND hour match
          if (schedule.frequency === "weekly" &&
              schedule.dayOfWeek === currentDay &&
              schedule.hour === currentHour) {
            return { shouldTrigger: true, feedType: schedule.feedType };
          }

          return { shouldTrigger: false, feedType: "delta" as const };
        }
      );

      if (result.shouldTrigger) {
        await step.sendEvent(`trigger-feed-${connection.tenantId}`, {
          name: "channel/ingram.feed",
          data: {
            tenantId: connection.tenantId,
            feedType: result.feedType,
            triggeredBy: "schedule",
          },
        });
        triggeredFeeds.push(connection.tenantId);
      }
    }

    return {
      checkedConnections: activeConnections.length,
      triggeredFeeds,
    };
  }
);
```

### UI Components

#### Feed Schedule Form

Create `src/modules/channels/adapters/ingram/components/ingram-feed-schedule.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const scheduleSchema = z.object({
  frequency: z.enum(["disabled", "daily", "weekly"]),
  hour: z.number().min(0).max(23).default(6),
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Sunday
  feedType: z.enum(["full", "delta"]).default("delta"),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface IngramFeedScheduleProps {
  currentSchedule?: ScheduleFormData;
  onSave: (schedule: ScheduleFormData) => Promise<void>;
  onTriggerManual: () => Promise<void>;
  isConnected: boolean;
}

export function IngramFeedSchedule({
  currentSchedule,
  onSave,
  onTriggerManual,
  isConnected,
}: IngramFeedScheduleProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTriggeringManual, setIsTriggeringManual] = useState(false);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: currentSchedule || {
      frequency: "disabled",
      hour: 6,
      feedType: "delta",
    },
  });

  const frequency = form.watch("frequency");

  async function handleSubmit(data: ScheduleFormData) {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleManualTrigger() {
    setIsTriggeringManual(true);
    try {
      await onTriggerManual();
    } finally {
      setIsTriggeringManual(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feed Schedule</CardTitle>
        <CardDescription>
          Configure automatic ONIX feed delivery to Ingram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <p className="text-muted-foreground">
            Connect your Ingram account to configure feed scheduling.
          </p>
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="disabled">Disabled</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {frequency !== "disabled" && (
                  <>
                    <FormField
                      control={form.control}
                      name="hour"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time (UTC)</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i.toString().padStart(2, "0")}:00 UTC
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose when feeds are sent (times shown in UTC)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {frequency === "weekly" && (
                      <FormField
                        control={form.control}
                        name="dayOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(parseInt(v))}
                              defaultValue={(field.value ?? 1).toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="feedType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feed Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="delta">Changed titles only</SelectItem>
                              <SelectItem value="full">All titles</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Delta feeds include only titles changed since the last feed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Schedule"}
                </Button>
              </form>
            </Form>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Manual Feed</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Generate and send an ONIX feed to Ingram immediately.
              </p>
              <Button
                variant="outline"
                onClick={handleManualTrigger}
                disabled={isTriggeringManual}
              >
                {isTriggeringManual ? "Sending..." : "Send Feed Now"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

#### Feed History Component

Create `src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { ChannelFeed } from "@/db/schema/channel-feeds";

interface IngramFeedHistoryProps {
  feeds: ChannelFeed[];
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  pending: "secondary",
  generating: "secondary",
  uploading: "secondary",
  failed: "destructive",
  skipped: "outline",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IngramFeedHistory({ feeds }: IngramFeedHistoryProps) {
  return (
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
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[feed.status]}>
                      {feed.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {feed.triggeredBy === "schedule" ? "Scheduled" : "Manual"}
                    </span>
                  </div>
                  <p className="text-sm">
                    {feed.createdAt
                      ? formatDistanceToNow(new Date(feed.createdAt), {
                          addSuffix: true,
                        })
                      : "Unknown time"}
                  </p>
                  {feed.errorMessage && (
                    <p className="text-sm text-destructive">{feed.errorMessage}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p>{feed.productCount ?? 0} titles</p>
                  <p className="text-muted-foreground">
                    {formatFileSize(feed.fileSize)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Server Actions

Update `src/modules/channels/adapters/ingram/actions.ts` to add:

```typescript
/**
 * Trigger manual Ingram feed
 * AC4: Manual Feed Trigger
 */
export async function triggerIngramFeed(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check Ingram is configured
    const credentials = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id!),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM)
      ),
    });

    if (!credentials) {
      return { success: false, message: "Ingram is not configured" };
    }

    // Trigger Inngest job
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "channel/ingram.feed",
      data: {
        tenantId: user.tenant_id!,
        feedType: "full", // Manual triggers send all titles
        triggeredBy: "manual",
        userId: user.id,
      },
    });

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Feed generation started" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to trigger feed",
    };
  }
}

/**
 * Save feed schedule configuration
 * AC1: Feed Schedule Configuration
 *
 * Stores schedule in channelCredentials.metadata JSONB field
 */
export async function saveIngramSchedule(schedule: {
  frequency: "disabled" | "daily" | "weekly";
  hour: number;
  dayOfWeek?: number;
  feedType: "full" | "delta";
}): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Find existing Ingram credentials
    const existing = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id!),
        eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM)
      ),
    });

    if (!existing) {
      return { success: false, message: "Ingram is not configured" };
    }

    // Get existing metadata and merge with new schedule
    const existingMetadata = (existing.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      schedule: {
        frequency: schedule.frequency,
        hour: schedule.hour,
        ...(schedule.frequency === "weekly" && { dayOfWeek: schedule.dayOfWeek }),
        feedType: schedule.feedType,
      },
    };

    // Update metadata with schedule
    await db
      .update(channelCredentials)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(channelCredentials.id, existing.id));

    revalidatePath("/settings/integrations/ingram");

    return { success: true, message: "Schedule saved" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save schedule",
    };
  }
}
```

### Queries

Add to `src/modules/channels/adapters/ingram/queries.ts`:

```typescript
/**
 * Get feed history for tenant
 * AC5: Feed History
 */
export async function getIngramFeedHistory(limit = 50) {
  const { userId } = await auth();
  if (!userId) return [];

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) return [];

  return db.query.channelFeeds.findMany({
    where: and(
      eq(channelFeeds.tenantId, user.tenant_id),
      eq(channelFeeds.channel, CHANNEL_TYPES.INGRAM)
    ),
    orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
    limit,
  });
}
```

### Page Updates

Update `src/app/(dashboard)/settings/integrations/ingram/page.tsx` to include:

1. Feed schedule form (if connected)
2. Feed history list
3. Manual trigger button

### Project Structure Notes

- Feed history: `src/db/schema/channel-feeds.ts`
- Inngest job: `src/inngest/ingram-feed.ts`
- Scheduler: `src/inngest/ingram-feed-scheduler.ts`
- UI components: `src/modules/channels/adapters/ingram/components/`
- Export from: `src/db/schema/index.ts`

### Why `adminDb` in Inngest Jobs

Inngest background jobs run outside the HTTP request context, meaning there's no authenticated session for PostgreSQL RLS policies. The `adminDb` export (from `src/db/index.ts`) bypasses RLS for service-level operations.

**When to use:**
- `db` - Normal user-facing operations (Server Actions, API routes) - respects RLS
- `adminDb` - Background jobs (Inngest), system operations - bypasses RLS but must manually filter by tenant

Pattern reference: `src/modules/platform-admin/queries.ts` line 12

### Delta Feed Prerequisites

For delta feed detection to work correctly, the `titles.updated_at` column must be updated whenever title metadata changes. Verify the `titles` schema has:

```typescript
updated_at: timestamp("updated_at", { mode: "date", withTimezone: true })
  .defaultNow()
  .$onUpdate(() => new Date()),
```

If using Drizzle's `$onUpdate`, this happens automatically. If not, ensure title update actions explicitly set `updated_at: new Date()`.

### Timezone Handling

All schedule times are stored and compared in **UTC**. The UI (IngramFeedSchedule component) displays times with "UTC" label. Future enhancement could add tenant timezone support, but UTC-only simplifies implementation and avoids DST edge cases.

### FTP Upload Limits

The `uploadToIngram` function has a 60-second timeout. For very large catalogs (10,000+ titles), consider:
- Splitting into multiple feeds
- Compressing XML before upload (if Ingram supports)
- Increasing timeout for large tenants

Typical ONIX file sizes: ~1KB per product. 1,000 titles ≈ 1MB.

### Security Requirements

1. **Role check** - Only owner/admin can configure schedules and trigger feeds
2. **Tenant isolation** - RLS on channel_feeds table
3. **Credential security** - Never log decrypted credentials
4. **Temp file cleanup** - Always delete temp ONIX files after upload

### References

- [Source: docs/architecture.md - Inngest background jobs]
- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/epics.md - Story 16.2: Schedule Automated ONIX Feeds to Ingram]
- [Source: src/inngest/generate-statements-batch.ts - Inngest job pattern]
- [Source: src/modules/onix/builder/message-builder.ts - ONIX 3.0 generation]
- [Source: src/modules/channels/adapters/ingram/ftp-client.ts - uploadToIngram function]
- [Source: docs/sprint-artifacts/16-1-configure-ingram-account-connection.md - Previous story]

## Test Scenarios

### Unit Tests (`tests/unit/ingram-feed-schedule.test.ts`)
- Schedule schema validation (frequency, hour, day)
- Invalid hour (negative, >23) fails validation
- Weekly schedule requires dayOfWeek

### Unit Tests (`tests/unit/channel-feeds-schema.test.ts`)
- Feed insert with all required fields
- Feed status transitions
- Feed type constraints

### Integration Tests (mocked FTP)
- Full feed generation and upload flow
- Delta feed with changed titles only
- Delta feed skipped when no changes
- Manual feed trigger
- Scheduled feed trigger
- Feed failure and retry
- Feed history query

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations > Ingram
- [ ] See Feed Schedule section (when connected)
- [ ] Configure daily schedule at specific hour
- [ ] Configure weekly schedule with day and hour
- [ ] Set feed type (full vs delta)
- [ ] Save schedule successfully
- [ ] Click "Send Feed Now" button
- [ ] See progress indication
- [ ] See success/failure notification
- [ ] View feed history with status and counts
- [ ] Verify ONIX 3.0 format in generated file
- [ ] Verify file uploaded to Ingram FTP

## Dev Agent Record

### Context Reference

This story builds channel feed infrastructure that will be reused for:
- Story 16.3-16.5 (remaining Ingram features)
- Epic 17 (Amazon Integration)
- Future channel integrations

The `channel_feeds` table and feed scheduling pattern are reusable.

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- Use ONIX 3.0 format for Ingram (pass `"3.0"` to ONIXMessageBuilder)
- Inngest cron runs hourly; schedule matching done in application code
- Temp files written to `os.tmpdir()` and cleaned up after upload
- Feed history limited to last 90 days (query with date filter)
- Delta feeds compare title `updated_at` vs last successful feed `completedAt`

### File List

New files:
- `src/db/schema/channel-feeds.ts`
- `src/inngest/ingram-feed.ts`
- `src/inngest/ingram-feed-scheduler.ts`
- `src/modules/channels/adapters/ingram/components/ingram-feed-schedule.tsx`
- `src/modules/channels/adapters/ingram/components/ingram-feed-history.tsx`
- `tests/unit/ingram-feed-schedule.test.ts`
- `tests/unit/channel-feeds-schema.test.ts`
- `tests/unit/ingram-feed-job.test.ts`
- `tests/unit/ingram-feed-history.test.ts`

Modified files:
- `src/db/schema/index.ts` - Export channelFeeds
- `src/db/schema/channel-credentials.ts` - Add metadata JSONB column for schedule storage
- `src/inngest/client.ts` - Add feed event type
- `src/inngest/functions.ts` - Register ingramFeed and ingramFeedScheduler
- `src/modules/channels/adapters/ingram/actions.ts` - Add triggerIngramFeed, saveIngramSchedule
- `src/modules/channels/adapters/ingram/queries.ts` - Add getIngramFeedHistory, getIngramSchedule
- `src/modules/channels/adapters/ingram/types.ts` - Add IngramSchedule type
- `src/modules/title-authors/queries.ts` - Add getTitleWithAuthorsAdmin for background jobs
- `src/app/(dashboard)/settings/integrations/ingram/page.tsx` - Add schedule and history UI

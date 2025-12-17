/**
 * Inngest: Amazon Feed Scheduler Cron Job
 *
 * Story 17.2 - AC7: Scheduled Job Reliability
 * Story 17.3 - AC8: Scheduled Sales Import
 *
 * Runs hourly and triggers:
 * 1. Feed generation for tenants whose schedule matches the current UTC hour/day
 * 2. Sales import for all active Amazon connections
 *
 * Note: Schedule matching is done in application code because
 * Inngest cron doesn't support per-tenant dynamic schedules.
 * The cron runs every hour and checks all active connections.
 */

import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import {
  CHANNEL_STATUS,
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import type { AmazonSchedule } from "@/modules/channels/adapters/amazon/types";
import { inngest } from "./client";

/**
 * Amazon Feed Scheduler
 *
 * Story 17.2 AC7: Scheduled job reliability (ONIX feeds)
 * Story 17.3 AC8: Scheduled sales import
 *
 * - Runs hourly on the hour
 * - Checks all active Amazon connections
 * - Triggers ONIX feeds for matching schedules
 * - Triggers sales imports for all active connections
 * - Failed jobs retry 3x with exponential backoff (handled by individual jobs)
 * - Persistent failures update channel status to 'error' (handled by individual jobs)
 */
export const amazonFeedScheduler = inngest.createFunction(
  {
    id: "amazon-feed-scheduler",
  },
  { cron: "0 * * * *" }, // Every hour on the hour
  async ({ step }) => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay(); // 0 = Sunday

    // Find all active Amazon connections
    const activeConnections = await step.run(
      "get-active-connections",
      async () => {
        return adminDb.query.channelCredentials.findMany({
          where: and(
            eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
            eq(channelCredentials.status, CHANNEL_STATUS.ACTIVE),
          ),
        });
      },
    );

    const triggeredFeeds: string[] = [];
    const triggeredSalesImports: string[] = [];

    for (const connection of activeConnections) {
      // Parse schedule from metadata JSONB field
      const result = await step.run(
        `check-schedule-${connection.tenantId}`,
        async () => {
          // Get schedule from metadata
          const metadata = connection.metadata as {
            schedule?: AmazonSchedule;
          } | null;

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
          if (
            schedule.frequency === "weekly" &&
            schedule.dayOfWeek === currentDay &&
            schedule.hour === currentHour
          ) {
            return { shouldTrigger: true, feedType: schedule.feedType };
          }

          return { shouldTrigger: false, feedType: "delta" as const };
        },
      );

      // Trigger ONIX feed if schedule matches
      if (result.shouldTrigger) {
        await step.sendEvent(`trigger-feed-${connection.tenantId}`, {
          name: "channel/amazon.feed",
          data: {
            tenantId: connection.tenantId,
            feedType: result.feedType,
            triggeredBy: "schedule",
          },
        });
        triggeredFeeds.push(connection.tenantId);
      }

      // Story 17.3 AC8: Always trigger sales import for all active connections
      // Sales imports run hourly regardless of ONIX feed schedule
      await step.sendEvent(`trigger-sales-import-${connection.tenantId}`, {
        name: "channel/amazon.sales-import",
        data: {
          tenantId: connection.tenantId,
          triggeredBy: "schedule",
        },
      });
      triggeredSalesImports.push(connection.tenantId);
    }

    return {
      checkedConnections: activeConnections.length,
      triggeredFeeds,
      triggeredSalesImports,
      currentTime: {
        hour: currentHour,
        dayOfWeek: currentDay,
        utcTimestamp: now.toISOString(),
      },
    };
  },
);

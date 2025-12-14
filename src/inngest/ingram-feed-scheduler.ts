/**
 * Inngest: Ingram Feed Scheduler Cron Job
 *
 * Story 16.2 - AC7: Scheduled Job Reliability
 *
 * Runs hourly and triggers feed generation for tenants whose
 * schedule matches the current UTC hour/day.
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
import type { IngramSchedule } from "@/modules/channels/adapters/ingram/types";
import { inngest } from "./client";

/**
 * Ingram Feed Scheduler
 *
 * AC7: Scheduled job reliability
 * - Runs hourly on the hour
 * - Checks all active Ingram connections
 * - Triggers feeds for matching schedules
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
    const activeConnections = await step.run(
      "get-active-connections",
      async () => {
        return adminDb.query.channelCredentials.findMany({
          where: and(
            eq(channelCredentials.channel, CHANNEL_TYPES.INGRAM),
            eq(channelCredentials.status, CHANNEL_STATUS.ACTIVE),
          ),
        });
      },
    );

    const triggeredFeeds: string[] = [];

    for (const connection of activeConnections) {
      // Parse schedule from metadata JSONB field
      const result = await step.run(
        `check-schedule-${connection.tenantId}`,
        async () => {
          // Get schedule from metadata
          const metadata = connection.metadata as {
            schedule?: IngramSchedule;
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
      currentTime: {
        hour: currentHour,
        dayOfWeek: currentDay,
        utcTimestamp: now.toISOString(),
      },
    };
  },
);

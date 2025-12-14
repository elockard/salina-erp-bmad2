import {
  getIngramStatus,
  getIngramSchedule,
  getIngramFeedHistory,
} from "@/modules/channels/adapters/ingram/queries";
import { IngramSettingsForm } from "@/modules/channels/adapters/ingram/components/ingram-settings-form";
import { IngramFeedSchedule } from "@/modules/channels/adapters/ingram/components/ingram-feed-schedule";
import { IngramFeedHistory } from "@/modules/channels/adapters/ingram/components/ingram-feed-history";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Ingram Settings Page
 *
 * Story 16.1 - Configure Ingram Account Connection
 * Story 16.2 - Schedule Automated ONIX Feeds to Ingram
 * Allows publishers to configure their Ingram FTPS credentials and feed schedules.
 */
export default async function IngramSettingsPage() {
  const [status, schedule, feedHistory] = await Promise.all([
    getIngramStatus(),
    getIngramSchedule(),
    getIngramFeedHistory(),
  ]);

  const isConnected = status?.connected ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings/integrations"
          className="hover:text-foreground transition-colors flex items-center"
        >
          <ChevronLeft className="h-4 w-4" />
          Integrations
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Ingram Content Group
        </h2>
        <p className="text-muted-foreground">
          Connect your Ingram Content Group account for automated ONIX feed
          delivery.
        </p>
      </div>

      <IngramSettingsForm initialStatus={status} />

      <IngramFeedSchedule currentSchedule={schedule} isConnected={isConnected} />

      {isConnected && <IngramFeedHistory feeds={feedHistory} />}
    </div>
  );
}

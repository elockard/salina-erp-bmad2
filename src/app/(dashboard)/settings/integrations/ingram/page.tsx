import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { IngramFeedHistory } from "@/modules/channels/adapters/ingram/components/ingram-feed-history";
import { IngramFeedSchedule } from "@/modules/channels/adapters/ingram/components/ingram-feed-schedule";
import { IngramImportHistory } from "@/modules/channels/adapters/ingram/components/ingram-import-history";
import { IngramSettingsForm } from "@/modules/channels/adapters/ingram/components/ingram-settings-form";
import {
  getIngramFeedHistory,
  getIngramImportHistory,
  getIngramSchedule,
  getIngramStatus,
} from "@/modules/channels/adapters/ingram/queries";

/**
 * Ingram Settings Page
 *
 * Story 16.1 - Configure Ingram Account Connection
 * Story 16.2 - Schedule Automated ONIX Feeds to Ingram
 * Story 16.3 - Ingest Ingram Order Data
 * Allows publishers to configure their Ingram FTPS credentials, feed schedules, and view import history.
 */
export default async function IngramSettingsPage() {
  const [status, schedule, feedHistory, importHistory] = await Promise.all([
    getIngramStatus(),
    getIngramSchedule(),
    getIngramFeedHistory(),
    getIngramImportHistory(),
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

      <IngramFeedSchedule
        currentSchedule={schedule}
        isConnected={isConnected}
      />

      {isConnected && <IngramFeedHistory feeds={feedHistory} />}

      {isConnected && <IngramImportHistory imports={importHistory} />}
    </div>
  );
}

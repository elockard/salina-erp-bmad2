import { AmazonFeedHistory } from "@/modules/channels/adapters/amazon/components/amazon-feed-history";
import { AmazonFeedSchedule } from "@/modules/channels/adapters/amazon/components/amazon-feed-schedule";
import { AmazonSalesHistory } from "@/modules/channels/adapters/amazon/components/amazon-sales-history";
import { AmazonSettingsForm } from "@/modules/channels/adapters/amazon/components/amazon-settings-form";
import {
  getAmazonFeedHistory,
  getAmazonSalesImportHistory,
  getAmazonSchedule,
  getAmazonStatus,
} from "@/modules/channels/adapters/amazon/queries";

/**
 * Amazon Integration Settings Page
 *
 * Story 17.1 - Configure Amazon Account Connection
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 * Story 17.3 - Import Amazon Sales Data
 * AC1: Navigate to Settings > Integrations > Amazon
 */
export default async function AmazonSettingsPage() {
  const [status, schedule, feedHistory, salesImportHistory] = await Promise.all(
    [
      getAmazonStatus(),
      getAmazonSchedule(),
      getAmazonFeedHistory(),
      getAmazonSalesImportHistory(),
    ],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Amazon Integration
        </h2>
        <p className="text-muted-foreground">
          Connect your Amazon KDP or Advantage account for automated ONIX feed
          delivery.
        </p>
      </div>

      <AmazonSettingsForm initialStatus={status} />

      {/* Story 17.2 - AC1: Feed Schedule Configuration */}
      <AmazonFeedSchedule
        currentSchedule={schedule}
        isConnected={status?.connected ?? false}
      />

      {/* Story 17.2 - AC5: ONIX Feed History */}
      {status?.connected && <AmazonFeedHistory feeds={feedHistory} />}

      {/* Story 17.3 - AC8, AC9: Sales Import History */}
      {status?.connected && <AmazonSalesHistory imports={salesImportHistory} />}
    </div>
  );
}

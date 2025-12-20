/**
 * Webhook Settings Page
 *
 * Story 15.4 - FR147: Webhook subscription management UI
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhookList } from "@/modules/api/webhooks/components/webhook-list";

export const metadata: Metadata = {
  title: "Webhooks | Settings",
  description: "Manage webhook subscriptions for event notifications",
};

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
        <p className="text-muted-foreground">
          Configure webhook endpoints to receive real-time event notifications.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <WebhookList />
      </Suspense>
    </div>
  );
}

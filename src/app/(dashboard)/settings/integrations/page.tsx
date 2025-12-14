import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getChannelStatuses } from "@/modules/channels/queries";

/**
 * Integrations Landing Page
 *
 * Story 16.1 - AC1: FTP Credential Configuration
 * Lists available distribution channel integrations with connection status.
 */
export default async function IntegrationsPage() {
  const statuses = await getChannelStatuses();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external distribution channels and services.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Ingram Content Group */}
        <Link href="/settings/integrations/ingram">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Ingram Content Group
                  </CardTitle>
                  <CardDescription>
                    Automated ONIX feed delivery to the largest US book
                    distributor
                  </CardDescription>
                </div>
                <Badge variant={statuses.ingram ? "default" : "secondary"}>
                  {statuses.ingram ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {/* Amazon - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Amazon KDP/Advantage</CardTitle>
                <CardDescription>
                  Automated ONIX feed delivery and sales data import
                </CardDescription>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

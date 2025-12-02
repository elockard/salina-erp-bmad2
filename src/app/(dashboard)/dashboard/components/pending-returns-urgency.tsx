import { getFinanceDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";

/**
 * Pending Returns Urgency Widget
 *
 * Displays pending returns count with urgency breakdown.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-2: Pending returns with urgency
 */

export async function PendingReturnsUrgency() {
  const data = await getFinanceDashboardData();
  const { count, urgent } = data.pendingReturns;
  const normal = count - urgent;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{count}</span>
            <span className="text-sm text-muted-foreground">Total pending</span>
          </div>

          <div className="space-y-2">
            {urgent > 0 && (
              <div className="flex items-center justify-between p-2 bg-destructive/10 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Urgent (7+ days)</span>
                </div>
                <Badge variant="destructive">{urgent}</Badge>
              </div>
            )}

            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Normal priority</span>
              </div>
              <Badge variant="secondary">{normal}</Badge>
            </div>
          </div>

          {count === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No pending returns
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

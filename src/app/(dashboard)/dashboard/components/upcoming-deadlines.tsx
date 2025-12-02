import { getFinanceDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

/**
 * Upcoming Deadlines Widget
 *
 * Displays upcoming statement generation deadlines with countdown.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-2: Upcoming deadlines
 */

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function UpcomingDeadlines() {
  const data = await getFinanceDashboardData();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {data.upcomingDeadlines.map((deadline) => {
            const daysUntil = getDaysUntil(deadline.date);
            const isUrgent = daysUntil <= 14;

            return (
              <div
                key={`${deadline.date}-${deadline.description}`}
                className={`flex items-start justify-between p-3 rounded-md ${
                  isUrgent ? "bg-amber-500/10" : "bg-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Calendar
                    className={`h-4 w-4 mt-0.5 ${
                      isUrgent ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {deadline.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(deadline.date)}
                    </div>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    isUrgent ? "text-amber-600" : "text-muted-foreground"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {daysUntil} days
                </div>
              </div>
            );
          })}

          {data.upcomingDeadlines.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No upcoming deadlines
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { getAuthorPortalDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

/**
 * Author Next Statement Widget
 *
 * Displays the estimated next statement date.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-4: Next statement date
 */

interface AuthorNextStatementProps {
  authorId: string;
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function AuthorNextStatement({ authorId }: AuthorNextStatementProps) {
  const data = await getAuthorPortalDashboardData(authorId);
  const { nextStatementDate } = data;

  if (!nextStatementDate) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Next Statement</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[80px] text-muted-foreground text-sm">
            No scheduled statements
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysUntil = getDaysUntil(nextStatementDate);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Next Statement</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-lg font-semibold">
          {formatDate(nextStatementDate)}
        </div>
        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {daysUntil > 0
              ? `${daysUntil} days away`
              : daysUntil === 0
                ? "Today"
                : "Past due"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

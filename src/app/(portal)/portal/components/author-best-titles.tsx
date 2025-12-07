import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorPortalDashboardData } from "@/modules/reports/queries";

/**
 * Author Best Titles Widget
 *
 * Displays top performing titles by units sold.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-4: Best performing titles
 */

interface AuthorBestTitlesProps {
  authorId: string;
}

export async function AuthorBestTitles({ authorId }: AuthorBestTitlesProps) {
  const data = await getAuthorPortalDashboardData(authorId);

  if (data.bestPerformingTitles.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Best Performing Titles
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No sales data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Best Performing Titles
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {data.bestPerformingTitles.map((title, index) => (
            <div
              key={title.titleId}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700">
                  {index + 1}
                </div>
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {title.title}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {title.units.toLocaleString()} units
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

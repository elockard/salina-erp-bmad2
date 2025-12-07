import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorPortalDashboardData } from "@/modules/reports/queries";

/**
 * Author Earnings Timeline Widget
 *
 * Displays quarterly earnings as a bar chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-4: Earnings timeline
 * AC-5: Interactive with hover tooltips
 */

interface AuthorEarningsTimelineProps {
  authorId: string;
}

export async function AuthorEarningsTimeline({
  authorId,
}: AuthorEarningsTimelineProps) {
  const data = await getAuthorPortalDashboardData(authorId);

  const chartData = data.earningsTimeline.map((item) => ({
    name: item.quarter,
    value: item.earnings,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Earnings Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No earnings data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Earnings Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <BarChart
          data={chartData}
          height={200}
          formatterType="currency"
          legendLabel="Earnings"
          fillColor="#16a34a"
        />
      </CardContent>
    </Card>
  );
}

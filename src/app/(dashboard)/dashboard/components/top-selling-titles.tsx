import { getOwnerAdminDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";

/**
 * Top Selling Titles Widget
 *
 * Displays top 5 selling titles as a bar chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-1: Top selling titles
 * AC-5: Interactive with hover tooltips
 */

export async function TopSellingTitles() {
  const data = await getOwnerAdminDashboardData();

  const chartData = data.topSellingTitles.map((item) => ({
    name: item.title.length > 20 ? `${item.title.slice(0, 20)}...` : item.title,
    value: item.revenue,
    units: item.units,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top Selling Titles</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No sales data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Top Selling Titles</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <BarChart
          data={chartData}
          height={200}
          formatterType="currency"
          legendLabel="Revenue"
          fillColor="#2d5a87"
        />
      </CardContent>
    </Card>
  );
}

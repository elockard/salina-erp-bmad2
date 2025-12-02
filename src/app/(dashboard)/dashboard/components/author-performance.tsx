import { getOwnerAdminDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";

/**
 * Author Performance Widget
 *
 * Displays top 5 authors by revenue as a horizontal bar chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-1: Author performance
 * AC-5: Interactive with hover tooltips
 */

export async function AuthorPerformance() {
  const data = await getOwnerAdminDashboardData();

  const chartData = data.authorPerformance.map((item) => ({
    name: item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
    value: item.revenue,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Author Performance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No author data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Author Performance</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <BarChart
          data={chartData}
          height={200}
          formatterType="currency"
          legendLabel="Revenue"
          fillColor="#4a7ab0"
        />
      </CardContent>
    </Card>
  );
}

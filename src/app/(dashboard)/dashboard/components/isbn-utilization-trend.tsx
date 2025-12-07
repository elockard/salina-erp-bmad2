import { LineChart } from "@/components/charts/line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOwnerAdminDashboardData } from "@/modules/reports/queries";

/**
 * ISBN Utilization Trend Widget
 *
 * Displays 6-month ISBN utilization trend as a line chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-1: ISBN utilization trend
 * AC-5: Interactive with hover tooltips
 */

export async function IsbnUtilizationTrend() {
  const data = await getOwnerAdminDashboardData();

  const chartData = data.isbnUtilizationTrend.map((item) => ({
    name: item.month,
    value: item.utilization,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          ISBN Utilization Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <LineChart
          data={chartData}
          height={200}
          formatterType="percent"
          legendLabel="Utilization %"
          strokeColor="#7ba3cf"
        />
      </CardContent>
    </Card>
  );
}

import { getOwnerAdminDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";

/**
 * Revenue Trend Chart Widget
 *
 * Displays 6-month revenue trend as an area chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-1: Revenue trend (6 months)
 * AC-5: Interactive with hover tooltips
 */

export async function RevenueTrendChart() {
  const data = await getOwnerAdminDashboardData();

  const chartData = data.revenueTrend.map((item) => ({
    name: item.month,
    value: item.revenue,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <AreaChart
          data={chartData}
          height={200}
          formatterType="currency"
          legendLabel="Revenue"
          fillOpacity={0.4}
        />
      </CardContent>
    </Card>
  );
}

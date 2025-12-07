import { AreaChart } from "@/components/charts/area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinanceDashboardData } from "@/modules/reports/queries";

/**
 * Liability Trend Chart Widget
 *
 * Displays 12-month liability trend as an area chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-2: Liability trend (12 months)
 * AC-5: Interactive with hover tooltips
 */

export async function LiabilityTrendChart() {
  const data = await getFinanceDashboardData();

  const chartData = data.liabilityTrend.map((item) => ({
    name: item.month,
    value: item.liability,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Liability Trend (12 Months)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <AreaChart
          data={chartData}
          height={200}
          formatterType="currency"
          legendLabel="Liability"
          strokeColor="#dc2626"
          fillColor="#dc2626"
          fillOpacity={0.3}
        />
      </CardContent>
    </Card>
  );
}

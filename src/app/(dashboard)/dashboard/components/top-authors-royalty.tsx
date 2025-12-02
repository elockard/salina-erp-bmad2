import { getFinanceDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";

/**
 * Top Authors by Royalty Widget
 *
 * Displays top 5 authors by royalty owed as a bar chart.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-2: Top authors by royalty
 * AC-5: Interactive with hover tooltips
 */

export async function TopAuthorsRoyalty() {
  const data = await getFinanceDashboardData();

  const chartData = data.topAuthorsByRoyalty.map((item) => ({
    name: item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
    value: item.amount,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top Authors by Royalty</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No royalty data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Top Authors by Royalty</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <BarChart
          data={chartData}
          height={200}
          formatterType="currency"
          legendLabel="Owed"
          fillColor="#dc2626"
        />
      </CardContent>
    </Card>
  );
}

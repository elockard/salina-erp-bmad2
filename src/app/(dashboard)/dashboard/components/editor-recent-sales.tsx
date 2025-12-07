import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditorDashboardData } from "@/modules/reports/queries";

/**
 * Editor Recent Sales Widget
 *
 * Displays recent sales for titles in the tenant.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-3: Recent sales
 */

interface EditorRecentSalesProps {
  userId: string;
}

export async function EditorRecentSales({ userId }: EditorRecentSalesProps) {
  const data = await getEditorDashboardData(userId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Recent Sales (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.recentSales.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No recent sales
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentSales.map((sale) => (
              <div
                key={`${sale.title}-${sale.units}`}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="text-sm font-medium truncate max-w-[200px]">
                  {sale.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  {sale.units.toLocaleString()} units
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

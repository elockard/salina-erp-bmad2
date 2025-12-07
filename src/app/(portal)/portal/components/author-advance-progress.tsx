import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAuthorPortalDashboardData } from "@/modules/reports/queries";

/**
 * Author Advance Progress Widget
 *
 * Displays advance recoupment progress with a visual progress bar.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-4: Advance recoupment progress
 */

interface AuthorAdvanceProgressProps {
  authorId: string;
}

export async function AuthorAdvanceProgress({
  authorId,
}: AuthorAdvanceProgressProps) {
  const data = await getAuthorPortalDashboardData(authorId);
  const { total, recouped, remaining } = data.advanceRecoupmentProgress;

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const percentRecouped = total > 0 ? (recouped / total) * 100 : 0;

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Advance Recoupment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            No advances on record
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Advance Recoupment
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <Progress value={percentRecouped} className="h-3" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Total Advance</div>
            <div className="text-sm font-medium">{formatCurrency(total)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Recouped</div>
            <div className="text-sm font-medium text-green-600">
              {formatCurrency(recouped)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="text-sm font-medium text-amber-600">
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {percentRecouped.toFixed(1)}% recouped
        </div>
      </CardContent>
    </Card>
  );
}

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditorDashboardData } from "@/modules/reports/queries";

/**
 * Editor Pending Tasks Widget
 *
 * Displays pending tasks like titles without ISBNs.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-3: Pending tasks
 */

interface EditorPendingTasksProps {
  userId: string;
}

export async function EditorPendingTasks({ userId }: EditorPendingTasksProps) {
  const data = await getEditorDashboardData(userId);
  const totalTasks = data.pendingTasks.reduce(
    (sum, task) => sum + task.count,
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Pending Tasks</span>
          {totalTasks > 0 && <Badge variant="secondary">{totalTasks}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.pendingTasks.length === 0 || totalTasks === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No pending tasks
          </div>
        ) : (
          <div className="space-y-2">
            {data.pendingTasks.map(
              (task) =>
                task.count > 0 && (
                  <div
                    key={task.type}
                    className="flex items-center justify-between p-2 bg-amber-500/10 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">{task.type}</span>
                    </div>
                    <Badge variant="outline">{task.count}</Badge>
                  </div>
                ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

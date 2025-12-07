import { Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditorDashboardData } from "@/modules/reports/queries";

/**
 * Editor ISBN Assignments Widget
 *
 * Displays count of ISBNs assigned by the editor.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-3: My ISBN assignments
 */

interface EditorIsbnAssignmentsProps {
  userId: string;
}

export async function EditorIsbnAssignments({
  userId,
}: EditorIsbnAssignmentsProps) {
  const data = await getEditorDashboardData(userId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          My ISBN Assignments
        </CardTitle>
        <Hash className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data.myISBNAssignments}</div>
        <p className="text-xs text-muted-foreground">ISBNs you have assigned</p>
      </CardContent>
    </Card>
  );
}

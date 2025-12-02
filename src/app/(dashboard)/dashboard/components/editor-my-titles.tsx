import { getEditorDashboardData } from "@/modules/reports/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

/**
 * Editor My Titles Widget
 *
 * Displays count of titles with ISBNs assigned by the editor this quarter.
 * Server component that fetches data directly.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-3: My titles this quarter
 */

interface EditorMyTitlesProps {
  userId: string;
}

export async function EditorMyTitles({ userId }: EditorMyTitlesProps) {
  const data = await getEditorDashboardData(userId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Titles This Quarter</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data.myTitlesThisQuarter}</div>
        <p className="text-xs text-muted-foreground">
          Titles with ISBNs you assigned
        </p>
      </CardContent>
    </Card>
  );
}

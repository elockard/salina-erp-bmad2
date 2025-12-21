/**
 * Author Manuscript Submissions Component
 *
 * Displays submission history with status badges.
 * Async server component for portal page.
 *
 * Story: 21.3 - Upload Manuscript Files
 * AC-21.3.6: View submission history with status
 */

import { FileText, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getAuthorManuscriptSubmissions,
  type SubmissionStatus,
} from "@/modules/manuscripts";

interface AuthorManuscriptSubmissionsProps {
  contactId: string;
  tenantId: string;
}

/**
 * Get badge variant for submission status
 * AC-21.3.6: Status badges - pending (yellow), accepted (green), rejected (red), in_production (blue)
 */
function getStatusBadgeVariant(
  status: SubmissionStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "accepted":
      return "default"; // green
    case "in_production":
      return "secondary"; // blue
    case "pending_review":
      return "outline"; // yellow/neutral
    case "rejected":
      return "destructive"; // red
    default:
      return "outline";
  }
}

/**
 * Format submission status for display
 */
function formatStatus(status: SubmissionStatus): string {
  switch (status) {
    case "pending_review":
      return "Pending Review";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "in_production":
      return "In Production";
    default:
      return status;
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file type label from content type
 */
function getFileTypeLabel(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "PDF";
    case "application/msword":
      return "DOC";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX";
    default:
      return "File";
  }
}

export async function AuthorManuscriptSubmissions({
  contactId,
  tenantId,
}: AuthorManuscriptSubmissionsProps) {
  const submissions = await getAuthorManuscriptSubmissions(contactId, tenantId);

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            My Submissions
          </CardTitle>
          <CardDescription>
            Track the status of your manuscript submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No submissions yet</p>
            <p className="text-xs mt-1">
              Upload a manuscript above to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const pendingCount = submissions.filter(
    (s) => s.status === "pending_review",
  ).length;
  const inProductionCount = submissions.filter(
    (s) => s.status === "in_production",
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              My Submissions
            </CardTitle>
            <CardDescription>
              Track the status of your manuscript submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {pendingCount > 0 && (
              <span className="text-amber-600">
                {pendingCount} pending review
              </span>
            )}
            {inProductionCount > 0 && (
              <span className="text-blue-600">
                {inProductionCount} in production
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText
                      className={`h-5 w-5 ${
                        submission.contentType === "application/pdf"
                          ? "text-red-500"
                          : "text-blue-500"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm max-w-[200px] truncate">
                        {submission.fileName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getFileTypeLabel(submission.contentType)} &bull;{" "}
                        {formatFileSize(submission.fileSize)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {submission.titleName ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {submission.titleName}
                      </span>
                      {submission.isbn && (
                        <span className="text-xs text-muted-foreground">
                          {submission.isbn}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      New Title Submission
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(submission.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={getStatusBadgeVariant(submission.status)}>
                      {formatStatus(submission.status)}
                    </Badge>
                    {submission.reviewNotes && (
                      <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {submission.reviewNotes}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

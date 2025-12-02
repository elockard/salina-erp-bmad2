import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardChartWrapper } from "@/components/charts/dashboard-chart-wrapper";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { authors } from "@/db/schema/authors";
import { getCurrentUser, getDb } from "@/lib/auth";
import { PortalStatementList } from "@/modules/statements/components/portal-statement-list";
import { getMyStatements } from "@/modules/statements/queries";
import { AuthorAdvanceProgress } from "./components/author-advance-progress";
import { AuthorBestTitles } from "./components/author-best-titles";
import { AuthorEarningsTimeline } from "./components/author-earnings-timeline";
import { AuthorNextStatement } from "./components/author-next-statement";

/**
 * Author Portal Landing Page
 *
 * Story 5.6 - Build Author Portal Statement Access
 *
 * AC-5.6.1: Portal accessible at /portal with simplified nav
 * AC-5.6.2: Statement list shows only author's own statements
 *
 * Previously Story 2.3 - Updated from placeholder to statement list
 */
export default async function PortalPage() {
  const user = await getCurrentUser();

  // This should be caught by layout, but double-check
  if (!user || user.role !== "author") {
    redirect("/sign-in");
  }

  // Get author information linked to this portal user
  const db = await getDb();
  const author = await db.query.authors.findFirst({
    where: and(
      eq(authors.portal_user_id, user.id),
      eq(authors.is_active, true),
    ),
  });

  // If no author linked, something went wrong
  if (!author) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-destructive">
            Access Error
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your portal account is not properly linked. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Fetch author's statements
  const statements = await getMyStatements();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your Royalty Statements
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {author.name}. View and download your royalty statements
            below.
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Analytics Dashboard - AC-4: Earnings timeline, Best titles, Advance progress, Next statement */}
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardChartWrapper title="Earnings Timeline" height={200}>
          <AuthorEarningsTimeline authorId={author.id} />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Best Performing Titles" height={200}>
          <AuthorBestTitles authorId={author.id} />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Advance Recoupment" height={180}>
          <AuthorAdvanceProgress authorId={author.id} />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Next Statement" height={180}>
          <AuthorNextStatement authorId={author.id} />
        </DashboardChartWrapper>
      </div>

      {/* Statement list - AC-5.6.2 */}
      <PortalStatementList statements={statements} />

      {/* Account information card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your registered details with the publisher
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Name</div>
            <div className="font-medium">{author.name}</div>
          </div>
          {author.email && (
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{author.email}</div>
            </div>
          )}
          {author.payment_method && (
            <div>
              <div className="text-sm text-muted-foreground">
                Payment Method
              </div>
              <div className="font-medium capitalize">
                {author.payment_method.replace("_", " ")}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-4">
            To update your information, please contact your publisher.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

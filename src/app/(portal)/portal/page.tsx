import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardChartWrapper } from "@/components/charts/dashboard-chart-wrapper";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { contacts } from "@/db/schema/contacts";
import { getCurrentUser, getDb } from "@/lib/auth";
import { PortalStatementList } from "@/modules/statements/components/portal-statement-list";
import { getMyStatements } from "@/modules/statements/queries";
import { AuthorAdvanceProgress } from "./components/author-advance-progress";
import { AuthorAssetLibrary } from "./components/author-asset-library";
import { AuthorAssetLibrarySkeleton } from "./components/author-asset-library-skeleton";
import { AuthorBestTitles } from "./components/author-best-titles";
import { AuthorEarningsTimeline } from "./components/author-earnings-timeline";
import { AuthorMyTitles } from "./components/author-my-titles";
import { AuthorNextStatement } from "./components/author-next-statement";
import { AuthorProductionStatus } from "./components/author-production-status";
import { AuthorProductionStatusSkeleton } from "./components/author-production-status-skeleton";

/**
 * Author Portal Landing Page
 *
 * Story 5.6 - Build Author Portal Statement Access
 * Story 7.3 - Migrate Authors to Contacts
 *
 * AC-5.6.1: Portal accessible at /portal with simplified nav
 * AC-5.6.2: Statement list shows only author's own statements
 *
 * Authors are now stored as contacts with role='author'.
 */
export default async function PortalPage() {
  const user = await getCurrentUser();

  // This should be caught by layout, but double-check
  if (!user || user.role !== "author") {
    redirect("/sign-in");
  }

  // Get author contact linked to this portal user (Story 7.3)
  const db = await getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
    with: { roles: true },
  });

  // If no author contact linked, something went wrong
  if (!contact || !contact.roles.some((r) => r.role === "author")) {
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

  // Map contact to author-like object for template compatibility
  const author = {
    id: contact.id,
    name:
      `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
      "Unknown",
    email: contact.email,
    payment_method:
      (contact.payment_info as { method?: string } | null)?.method || null,
  };

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
            Welcome back, {author.name}. View and download your royalty
            statements below.
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

      {/* My Titles - Story 10.1: AC-10.1.7 - Author view of co-authored titles */}
      <AuthorMyTitles authorId={author.id} />

      {/* Production Status - Story 21.1: AC-21.1.1 - Author sees production status */}
      <Suspense fallback={<AuthorProductionStatusSkeleton />}>
        <AuthorProductionStatus
          authorId={author.id}
          tenantId={user.tenant_id}
        />
      </Suspense>

      {/* Marketing Assets - Story 21.2: AC-21.2.1 - Author sees marketing assets */}
      <Suspense fallback={<AuthorAssetLibrarySkeleton />}>
        <AuthorAssetLibrary authorId={author.id} tenantId={user.tenant_id} />
      </Suspense>

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

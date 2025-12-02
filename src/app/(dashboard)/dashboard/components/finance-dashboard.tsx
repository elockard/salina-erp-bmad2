/**
 * Finance Dashboard Component
 *
 * Displays finance-specific stats cards and quick actions.
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC-7: Finance dashboard displays stats cards: Total Revenue, Total Liability, Upcoming Statement Deadline
 * AC-8: Clicking a stat card opens the corresponding detailed report
 */

import {
  Calendar,
  DollarSign,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardChartWrapper } from "@/components/charts/dashboard-chart-wrapper";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import type { User } from "@/db/schema";
import type { DashboardStats } from "@/modules/dashboard/actions";
import { ISBNPoolWidget } from "@/modules/isbn/components/isbn-pool-widget";
import type { ISBNPoolStats } from "@/modules/isbn/types";
import { LiabilityTrendChart } from "./liability-trend-chart";
import { PendingReturnsUrgency } from "./pending-returns-urgency";
import { TopAuthorsRoyalty } from "./top-authors-royalty";
import { UpcomingDeadlines } from "./upcoming-deadlines";

interface FinanceDashboardProps {
  stats: DashboardStats["stats"];
  user: User;
  isbnStats?: ISBNPoolStats;
}

export function FinanceDashboard({
  stats,
  user,
  isbnStats,
}: FinanceDashboardProps) {
  // Format deadline for display
  const formatDeadline = (isoDate: string | number | undefined): string => {
    if (!isoDate || typeof isoDate !== "string") return "Not set";
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Not set";
    }
  };

  const daysUntilDeadline =
    typeof stats.daysUntilDeadline === "number"
      ? stats.daysUntilDeadline
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.email.split("@")[0]} (Finance)
          </h1>
          <p className="text-muted-foreground">
            Manage returns, royalties, and financial reporting
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* AC-7: Stats cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* AC-7 & AC-8: Total Revenue card - clickable to detailed report */}
        <Link href="/sales" className="block">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer border-l-4 border-l-[#1e3a5f]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#1e3a5f]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.currentRevenue || "$0.00"}
              </div>
              <p className="text-xs text-muted-foreground">
                Current month total
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* AC-7 & AC-8: Royalty Liability card - clickable to liability report */}
        <Link href="/royalties" className="block">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer border-l-4 border-l-[#1e3a5f]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Royalty Liability
              </CardTitle>
              <Users className="h-4 w-4 text-[#1e3a5f]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.royaltyLiability || "$0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Owed to authors</p>
            </CardContent>
          </Card>
        </Link>

        {/* AC-7 & AC-8: Upcoming Statement Deadline card - clickable to statements */}
        <Link href="/statements" className="block">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer border-l-4 border-l-[#1e3a5f]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Statement Deadline
              </CardTitle>
              <Calendar className="h-4 w-4 text-[#1e3a5f]" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatDeadline(stats.nextStatementDeadline as string)}
              </div>
              <p className="text-xs text-muted-foreground">
                {daysUntilDeadline !== null
                  ? `${daysUntilDeadline} days remaining`
                  : "Next quarterly deadline"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Returns card */}
        <Link href="/returns/pending" className="block">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Returns
              </CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReturns}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingReturnsTotal} awaiting approval
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ISBN Pool Widget (if available) */}
      {isbnStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ISBNPoolWidget stats={isbnStats} />
        </div>
      )}

      {/* Analytics Charts - AC-2: Liability trend, Pending returns, Upcoming deadlines, Top authors */}
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardChartWrapper title="Liability Trend" height={200}>
          <LiabilityTrendChart />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Top Authors by Royalty" height={200}>
          <TopAuthorsRoyalty />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Pending Returns" height={200}>
          <PendingReturnsUrgency />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Upcoming Deadlines" height={200}>
          <UpcomingDeadlines />
        </DashboardChartWrapper>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for financial operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              asChild
            >
              <Link href="/returns/pending">
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">Approve Returns</span>
                  {Number(stats.pendingReturns) > 0 && (
                    <Badge variant="destructive">{stats.pendingReturns}</Badge>
                  )}
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  Review pending returns
                </span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              asChild
            >
              <Link href="/statements/new">
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">Generate Statements</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  Create author statements
                </span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              asChild
            >
              <Link href="/sales/new">
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">Record Sale</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  Enter sales transaction
                </span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              asChild
            >
              <Link href="/sales">
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">View Reports</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  Revenue & liability analytics
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

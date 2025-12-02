import { BookOpen, DollarSign, Users } from "lucide-react";
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
import { EditorIsbnAssignments } from "./editor-isbn-assignments";
import { EditorMyTitles } from "./editor-my-titles";
import { EditorPendingTasks } from "./editor-pending-tasks";
import { EditorRecentSales } from "./editor-recent-sales";

interface EditorDashboardProps {
  stats: DashboardStats["stats"];
  user: User;
  isbnStats?: ISBNPoolStats;
}

export function EditorDashboard({
  stats,
  user,
  isbnStats,
}: EditorDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.email.split("@")[0]} (Editor)
          </h1>
          <p className="text-muted-foreground">
            Manage authors, titles, and ISBN assignments
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Authors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAuthors}</div>
            <p className="text-xs text-muted-foreground">Active authors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Titles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTitles}</div>
            <p className="text-xs text-muted-foreground">Books in catalog</p>
          </CardContent>
        </Card>

        {isbnStats && <ISBNPoolWidget stats={isbnStats} />}
      </div>

      {/* Analytics Widgets - AC-3: My titles, Recent sales, ISBN assignments, Pending tasks */}
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardChartWrapper title="My Titles This Quarter" height={100}>
          <EditorMyTitles userId={user.id} />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="My ISBN Assignments" height={100}>
          <EditorIsbnAssignments userId={user.id} />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Recent Sales" height={200}>
          <EditorRecentSales userId={user.id} />
        </DashboardChartWrapper>

        <DashboardChartWrapper title="Pending Tasks" height={200}>
          <EditorPendingTasks userId={user.id} />
        </DashboardChartWrapper>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for content management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              disabled
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">Create Author</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Add new author profile
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              disabled
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">Create Title</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Add title to catalog
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              disabled
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">Assign ISBN</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Allocate ISBN from pool
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              asChild
            >
              <Link href="/sales/new">
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">Record Sale</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  Enter sales transaction
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

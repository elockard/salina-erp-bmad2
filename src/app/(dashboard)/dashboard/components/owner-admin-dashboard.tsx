import { Activity, BookOpen, Users as UsersIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/db/schema";
import type { DashboardStats } from "@/modules/dashboard/actions";
import { ISBNPoolWidget } from "@/modules/isbn/components/isbn-pool-widget";
import type { ISBNPoolStats } from "@/modules/isbn/types";

interface OwnerAdminDashboardProps {
  stats: DashboardStats["stats"];
  user: User;
  isbnStats?: ISBNPoolStats;
}

export function OwnerAdminDashboard({
  stats,
  user,
  isbnStats,
}: OwnerAdminDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.email.split("@")[0]} ({user.role})
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your publishing platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Team members in your tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Titles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTitles}</div>
            <p className="text-xs text-muted-foreground">
              Books in your catalog
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {stats.recentActivity}
            </div>
          </CardContent>
        </Card>

        {isbnStats && <ISBNPoolWidget stats={isbnStats} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your publishing platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href="/settings/users"
              className="block rounded-lg border p-4 hover:bg-accent"
            >
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-muted-foreground">
                Invite and manage team members
              </div>
            </a>
            <a
              href="/settings"
              className="block rounded-lg border p-4 hover:bg-accent"
            >
              <div className="font-medium">Tenant Settings</div>
              <div className="text-sm text-muted-foreground">
                Configure timezone, currency, and more
              </div>
            </a>
            <a
              href="/sales/new"
              className="block rounded-lg border p-4 hover:bg-accent"
            >
              <div className="font-medium">Record Sale</div>
              <div className="text-sm text-muted-foreground">
                Enter sales transaction data
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

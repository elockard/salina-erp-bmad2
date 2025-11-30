import { Calendar, DollarSign, FileText, RotateCcw } from "lucide-react";
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
import type { User } from "@/db/schema";
import type { DashboardStats } from "@/modules/dashboard/actions";
import { ISBNPoolWidget } from "@/modules/isbn/components/isbn-pool-widget";
import type { ISBNPoolStats } from "@/modules/isbn/types";

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.email.split("@")[0]} (Finance)
        </h1>
        <p className="text-muted-foreground">
          Manage returns, royalties, and financial reporting
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Royalty Liability
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.royaltyLiability}</div>
            <p className="text-xs text-muted-foreground">Owed to authors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Statement
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{stats.lastStatementDate}</div>
            <p className="text-xs text-muted-foreground">Generation date</p>
          </CardContent>
        </Card>

        {isbnStats && <ISBNPoolWidget stats={isbnStats} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for financial operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
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
              disabled
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">Calculate Royalties</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Run royalty calculations
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start py-4"
              disabled
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">Generate Statements</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Create author statements
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

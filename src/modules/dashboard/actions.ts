"use server";

import { endOfQuarter } from "date-fns";
import Decimal from "decimal.js";
import { and, count, eq, sql, sum } from "drizzle-orm";
import { isbns } from "@/db/schema/isbns";
import { returns } from "@/db/schema/returns";
import { sales } from "@/db/schema/sales";
import { statements } from "@/db/schema/statements";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import type { ISBNPoolStats } from "@/modules/isbn/types";
import type { UserRole } from "@/modules/users/types";

export interface DashboardStats {
  role: UserRole;
  stats: Record<string, number | string>;
  isbnStats?: ISBNPoolStats;
}

export async function getDashboardStats(): Promise<
  ActionResult<DashboardStats>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    let stats: Record<string, number | string> = {};

    // Fetch ISBN stats for all dashboard users (AC 8: all authenticated users)
    const isbnStatsResult = await db
      .select({
        total: count(),
        available: sql<number>`count(*) filter (where ${isbns.status} = 'available')`,
        assigned: sql<number>`count(*) filter (where ${isbns.status} = 'assigned')`,
        registered: sql<number>`count(*) filter (where ${isbns.status} = 'registered')`,
        retired: sql<number>`count(*) filter (where ${isbns.status} = 'retired')`,
        physicalTotal: sql<number>`count(*) filter (where ${isbns.type} = 'physical')`,
        ebookTotal: sql<number>`count(*) filter (where ${isbns.type} = 'ebook')`,
        physicalAvailable: sql<number>`count(*) filter (where ${isbns.type} = 'physical' and ${isbns.status} = 'available')`,
        ebookAvailable: sql<number>`count(*) filter (where ${isbns.type} = 'ebook' and ${isbns.status} = 'available')`,
      })
      .from(isbns)
      .where(eq(isbns.tenant_id, tenantId));

    const isbnData = isbnStatsResult[0];
    const isbnStats: ISBNPoolStats = {
      total: isbnData?.total ?? 0,
      available: Number(isbnData?.available) ?? 0,
      assigned: Number(isbnData?.assigned) ?? 0,
      registered: Number(isbnData?.registered) ?? 0,
      retired: Number(isbnData?.retired) ?? 0,
      byType: {
        physical: Number(isbnData?.physicalTotal) ?? 0,
        ebook: Number(isbnData?.ebookTotal) ?? 0,
      },
      availableByType: {
        physical: Number(isbnData?.physicalAvailable) ?? 0,
        ebook: Number(isbnData?.ebookAvailable) ?? 0,
      },
    };

    switch (user.role) {
      case "owner":
      case "admin": {
        const [usersCount] = await Promise.all([
          db
            .select({ count: count() })
            .from(users)
            .where(
              and(eq(users.tenant_id, tenantId), eq(users.is_active, true)),
            ),
        ]);

        stats = {
          activeUsers: usersCount[0]?.count ?? 0,
          totalTitles: 0, // Placeholder - titles table doesn't exist in Epic 1
          recentActivity: "Coming soon",
        };
        break;
      }

      case "editor": {
        stats = {
          totalAuthors: 0, // Placeholder - authors table doesn't exist in Epic 1
          totalTitles: 0, // Placeholder - titles table doesn't exist in Epic 1
          isbnAvailable: 0, // Placeholder - isbns table doesn't exist in Epic 1
        };
        break;
      }

      case "finance": {
        // Fetch pending returns count and total (Story 3.6 AC 10)
        const pendingReturnsResult = await db
          .select({
            count: count(),
            total: sum(returns.total_amount),
          })
          .from(returns)
          .where(
            and(eq(returns.tenant_id, tenantId), eq(returns.status, "pending")),
          );

        const pendingData = pendingReturnsResult[0];
        const pendingCount = pendingData?.count ?? 0;
        const pendingTotal = pendingData?.total ?? "0.00";
        const formattedPendingTotal = parseFloat(pendingTotal).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD",
          },
        );

        // AC-7: Fetch current month revenue (Story 6.1)
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const currentMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        )
          .toISOString()
          .split("T")[0];

        const [revenueResult] = await db
          .select({ total: sum(sales.total_amount) })
          .from(sales)
          .where(
            and(
              eq(sales.tenant_id, tenantId),
              sql`${sales.sale_date} >= ${currentMonthStart}`,
              sql`${sales.sale_date} <= ${currentMonthEnd}`,
            ),
          );

        const currentRevenue = new Decimal(
          revenueResult?.total ?? "0",
        ).toNumber();
        const formattedRevenue = currentRevenue.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });

        // AC-7: Fetch total liability (Story 6.1)
        const [liabilityResult] = await db
          .select({ total: sum(statements.net_payable) })
          .from(statements)
          .where(eq(statements.tenant_id, tenantId));

        const totalLiability = new Decimal(
          liabilityResult?.total ?? "0",
        ).toNumber();
        const formattedLiability = totalLiability.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });

        // AC-7: Calculate next statement deadline (end of current quarter + 30 days)
        const currentQuarterEnd = endOfQuarter(now);
        const nextDeadline = new Date(currentQuarterEnd);
        nextDeadline.setDate(nextDeadline.getDate() + 30);
        const daysUntilDeadline = Math.max(
          0,
          Math.ceil(
            (nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        stats = {
          pendingReturns: pendingCount,
          pendingReturnsTotal: formattedPendingTotal,
          currentRevenue: formattedRevenue,
          royaltyLiability: formattedLiability,
          nextStatementDeadline: nextDeadline.toISOString(),
          daysUntilDeadline: daysUntilDeadline,
        };
        break;
      }

      default:
        stats = {};
    }

    return {
      success: true,
      data: {
        role: user.role as UserRole,
        stats,
        isbnStats,
      },
    };
  } catch (error) {
    console.error("Failed to load dashboard stats", error);
    return {
      success: false,
      error: "Failed to load dashboard statistics. Please try again.",
    };
  }
}

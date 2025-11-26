"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { isbns } from "@/db/schema/isbns";
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
        // Returns, royalties, statements tables don't exist yet - hardcode placeholders
        stats = {
          pendingReturns: 0, // Placeholder
          royaltyLiability: "$0.00 (coming soon)", // Placeholder
          lastStatementDate: "No statements generated yet", // Placeholder
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

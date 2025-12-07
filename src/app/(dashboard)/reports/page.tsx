/**
 * Reports Index Page
 *
 * Entry point for all reports. Provides navigation to specific report types.
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 1 (Users can access /reports/sales page)
 * AC: 10 (All users except Author role can access sales reports)
 *
 * Permission: owner, admin, editor, finance (NOT author)
 */

import { BarChart3, CreditCard, DollarSign, Hash, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  available: boolean;
}

const reportCards: ReportCard[] = [
  {
    title: "Sales Reports",
    description:
      "Analyze sales patterns with flexible filtering by date, title, author, format, and channel.",
    href: "/reports/sales",
    icon: <BarChart3 className="h-8 w-8 text-[#1e3a5f]" />,
    available: true,
  },
  {
    title: "ISBN Pool Status",
    description:
      "View ISBN allocation status, available inventory, and usage trends.",
    href: "/reports/isbn-pool",
    icon: <Hash className="h-8 w-8 text-[#1e3a5f]" />,
    available: true,
  },
  {
    title: "Royalty Liability",
    description:
      "Track outstanding royalty obligations and payment schedules by author.",
    href: "/reports/royalty-liability",
    icon: <DollarSign className="h-8 w-8 text-[#1e3a5f]" />,
    available: true,
  },
  {
    title: "Audit Logs",
    description:
      "View compliance audit trail for all data modifications and user actions.",
    href: "/reports/audit-logs",
    icon: <Shield className="h-8 w-8 text-[#1e3a5f]" />,
    available: true,
  },
  {
    title: "Accounts Receivable",
    description:
      "Track outstanding invoices, customer aging, and payment patterns.",
    href: "/reports/accounts-receivable",
    icon: <CreditCard className="h-8 w-8 text-[#1e3a5f]" />,
    available: true,
  },
  {
    title: "Revenue Trends",
    description:
      "Monitor revenue performance over time with period comparisons.",
    href: "/reports/revenue",
    icon: <TrendingUp className="h-8 w-8 text-muted-foreground" />,
    available: false,
  },
];

export default async function ReportsPage() {
  // AC-10: Block Author role from accessing reports
  const canAccess = await hasPermission([
    "owner",
    "admin",
    "editor",
    "finance",
  ]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and analyze business reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((card) => (
          <Card
            key={card.href}
            className={
              card.available
                ? "hover:border-[#1e3a5f] transition-colors cursor-pointer"
                : "opacity-60 cursor-not-allowed"
            }
          >
            {card.available ? (
              <Link href={card.href} className="block">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {card.icon}
                  </div>
                  <CardTitle className="mt-4">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Link>
            ) : (
              <CardHeader>
                <div className="flex items-center justify-between">
                  {card.icon}
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Coming Soon
                  </span>
                </div>
                <CardTitle className="mt-4">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

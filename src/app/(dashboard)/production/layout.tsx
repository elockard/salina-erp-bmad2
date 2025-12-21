"use client";

/**
 * Production Layout
 *
 * Provides tab navigation between Projects and Board views.
 * AC-18.3.7: Board as sub-navigation option alongside Projects
 *
 * Story: 18.3 - Track Production Workflow Stages
 */

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface ProductionLayoutProps {
  children: React.ReactNode;
}

export default function ProductionLayout({ children }: ProductionLayoutProps) {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Projects",
      href: "/production",
      icon: List,
      active: pathname === "/production",
    },
    {
      label: "Board",
      href: "/production/board",
      icon: LayoutGrid,
      active: pathname === "/production/board",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-4" aria-label="Production navigation">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors",
                tab.active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}

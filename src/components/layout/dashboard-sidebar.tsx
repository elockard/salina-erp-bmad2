"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  BookOpen,
  ClipboardList,
  DollarSign,
  Factory,
  FileText,
  Hash,
  Home,
  Receipt,
  RotateCcw,
  Server,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { IconName, NavItem } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";

// Map icon names to actual Lucide components
const iconMap: Record<IconName, LucideIcon> = {
  Home,
  Users,
  BookOpen,
  Hash,
  Receipt,
  RotateCcw,
  DollarSign,
  FileText,
  ClipboardList,
  BarChart,
  Settings,
  Server,
  Factory,
};

interface DashboardSidebarProps {
  items: NavItem[];
  tenantName: string;
}

export function DashboardSidebar({ items, tenantName }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-muted/40 md:block">
      <div className="flex h-full flex-col">
        {/* Logo / Tenant Name */}
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="text-lg">{tenantName}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = iconMap[item.icon];

            return (
              <Link
                key={item.href}
                href={item.comingSoon ? "#" : item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.comingSoon && "cursor-not-allowed opacity-60",
                )}
                onClick={(e) => {
                  if (item.comingSoon) {
                    e.preventDefault();
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {item.badgeCount}
                  </Badge>
                )}
                {item.comingSoon && (
                  <Badge variant="secondary" className="text-xs">
                    Soon
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

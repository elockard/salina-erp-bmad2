"use client";

import { SignOutButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  BookOpen,
  DollarSign,
  FileText,
  Hash,
  Home,
  LogOut,
  Menu,
  Receipt,
  RotateCcw,
  Server,
  Settings,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  BarChart,
  Settings,
  Server,
};

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
  tenantName: string;
  navItems: NavItem[];
}

export function DashboardHeader({
  userName,
  userEmail,
  userRole,
  tenantName,
  navItems,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:px-6">
      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{tenantName}</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex-1 space-y-1">
            {navItems.map((item) => {
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
                  {item.comingSoon && (
                    <Badge variant="secondary" className="text-xs">
                      Soon
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Tenant Name (visible on mobile) */}
      <div className="flex-1 md:hidden">
        <span className="font-semibold">{tenantName}</span>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden flex-1 md:block" />

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline-block">
              {userName || userEmail}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{userName || "User"}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Role: {userRole}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <SignOutButton>
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

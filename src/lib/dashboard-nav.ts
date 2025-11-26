import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  BookOpen,
  DollarSign,
  FileText,
  Hash,
  Home,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import type { UserRole } from "@/modules/users/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Users",
    href: "/settings/users",
    icon: Users,
    allowedRoles: ["owner", "admin"],
  },
  {
    label: "Authors",
    href: "/dashboard/authors",
    icon: Users,
    allowedRoles: ["owner", "admin", "editor"],
  },
  {
    label: "Titles",
    href: "/dashboard/titles",
    icon: BookOpen,
    allowedRoles: ["owner", "admin", "editor"],
  },
  {
    label: "ISBN Pool",
    href: "/isbn-pool",
    icon: Hash,
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: Receipt,
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Returns",
    href: "/dashboard/returns",
    icon: FileText,
    allowedRoles: ["owner", "admin", "finance"],
    comingSoon: true,
  },
  {
    label: "Royalties",
    href: "/dashboard/royalties",
    icon: DollarSign,
    allowedRoles: ["owner", "admin", "finance"],
    comingSoon: true,
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart,
    allowedRoles: ["owner", "admin", "editor", "finance"],
    comingSoon: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["owner", "admin"],
  },
];

export function getNavigationItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

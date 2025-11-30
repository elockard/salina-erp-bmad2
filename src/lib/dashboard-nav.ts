import type { UserRole } from "@/modules/users/types";

// Icon names that can be serialized (resolved in client component)
export type IconName =
  | "Home"
  | "Users"
  | "BookOpen"
  | "Hash"
  | "Receipt"
  | "RotateCcw"
  | "DollarSign"
  | "BarChart"
  | "Settings";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  allowedRoles: UserRole[];
  comingSoon?: boolean;
  /** Badge count to display (e.g., pending items) */
  badgeCount?: number;
  /** Key to identify this item for badge injection */
  badgeKey?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "Home",
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Users",
    href: "/settings/users",
    icon: "Users",
    allowedRoles: ["owner", "admin"],
  },
  {
    label: "Authors",
    href: "/dashboard/authors",
    icon: "Users",
    allowedRoles: ["owner", "admin", "editor"],
  },
  {
    label: "Titles",
    href: "/dashboard/titles",
    icon: "BookOpen",
    allowedRoles: ["owner", "admin", "editor"],
  },
  {
    label: "ISBN Pool",
    href: "/isbn-pool",
    icon: "Hash",
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: "Receipt",
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Returns",
    href: "/returns",
    icon: "RotateCcw",
    allowedRoles: ["owner", "admin", "editor", "finance"],
    badgeKey: "pendingReturns",
  },
  {
    label: "Royalties",
    href: "/royalties",
    icon: "DollarSign",
    allowedRoles: ["owner", "admin", "editor"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: "BarChart",
    allowedRoles: ["owner", "admin", "editor", "finance"],
    comingSoon: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    allowedRoles: ["owner", "admin"],
  },
];

export function getNavigationItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

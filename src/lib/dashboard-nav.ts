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
  | "FileText"
  | "ClipboardList"
  | "BarChart"
  | "Settings"
  | "Server"
  | "Factory";

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
    label: "Contacts",
    href: "/contacts",
    icon: "Users",
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "Titles",
    href: "/titles",
    icon: "BookOpen",
    allowedRoles: ["owner", "admin", "editor"],
  },
  {
    label: "Production",
    href: "/production",
    icon: "Factory",
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
    label: "Statements",
    href: "/statements",
    icon: "FileText",
    allowedRoles: ["owner", "admin", "finance"],
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: "ClipboardList",
    allowedRoles: ["owner", "admin", "finance"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "BarChart",
    allowedRoles: ["owner", "admin", "editor", "finance"],
  },
  {
    label: "System",
    href: "/admin/system",
    icon: "Server",
    allowedRoles: ["owner", "admin"],
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

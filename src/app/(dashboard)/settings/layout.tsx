"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNav = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/notifications", label: "Notifications", exact: false },
  { href: "/settings/users", label: "Users", exact: false },
  { href: "/settings/api-keys", label: "API Keys", exact: false },
  { href: "/settings/isbn-import", label: "ISBN Import", exact: false },
  { href: "/settings/isbn-prefixes", label: "ISBN Prefixes", exact: false },
  { href: "/settings/integrations", label: "Integrations", exact: false },
  { href: "/settings/webhooks", label: "Webhooks", exact: false },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>

      {/* Sub-navigation tabs */}
      <nav className="flex border-b mb-8">
        {settingsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive(item.href, item.exact)
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Mail, LayoutDashboard, History, CalendarDays, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activities", icon: CalendarDays },
  { href: "/admin/emails", label: "Email Templates", icon: Mail },
  { href: "/admin/emails/logs", label: "Send History", icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Admin</h2>
        <p className="text-sm text-muted-foreground">Management Console</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive = item.exact
            ? pathname === fullHref
            : pathname.startsWith(fullHref);
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Calculator,
  TrendingUp,
  Settings,
  Building2,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, segment: "" },
  { key: "members", icon: Users, segment: "members" },
  { key: "surveys", icon: ClipboardList, segment: "surveys" },
  { key: "reports", icon: FileBarChart, segment: "reports" },
  { key: "training", icon: GraduationCap, segment: "training" },
  { key: "roi", icon: Calculator, segment: "roi" },
  { key: "progress", icon: TrendingUp, segment: "progress" },
] as const;

export function EnterpriseSidebar({
  orgSlug,
  orgName,
  memberRole,
}: {
  orgSlug: string;
  orgName: string;
  memberRole: string;
}) {
  const t = useTranslations("enterprise");
  const pathname = usePathname();

  const basePath = `/enterprise/${orgSlug}`;

  function isActive(segment: string) {
    if (segment === "") {
      // Dashboard: exact match (with possible locale prefix)
      return pathname.endsWith(basePath) || pathname.endsWith(`${basePath}/`);
    }
    return pathname.includes(`${basePath}/${segment}`);
  }

  const showSettings = memberRole === "OWNER" || memberRole === "ADMIN";

  const allItems = [
    ...NAV_ITEMS,
    ...(showSettings
      ? [{ key: "settings" as const, icon: Settings, segment: "settings" }]
      : []),
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20">
          <div className="mb-4 flex items-center gap-2 px-3">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="truncate font-semibold">{orgName}</span>
          </div>
          <nav className="flex flex-col gap-1">
            {allItems.map(({ key, icon: Icon, segment }) => {
              const active = isActive(segment);
              const href = segment
                ? (`/enterprise/${orgSlug}/${segment}` as never)
                : (`/enterprise/${orgSlug}` as never);
              return (
                <Link
                  key={key}
                  href={href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(key)}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile horizontal tabs */}
      <div className="overflow-x-auto md:hidden">
        <nav className="flex gap-1 pb-2">
          {allItems.map(({ key, icon: Icon, segment }) => {
            const active = isActive(segment);
            const href = segment
              ? (`/enterprise/${orgSlug}/${segment}` as never)
              : (`/enterprise/${orgSlug}` as never);
            return (
              <Link
                key={key}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

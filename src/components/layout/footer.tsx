"use client";

import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  const footerLinks = [
    {
      title: t("platform"),
      links: [
        { href: "/challenges" as const, label: t("challenges") },
        { href: "/paths" as const, label: t("learningPaths") },
        { href: "/marketplace" as const, label: t("marketplace") },
        { href: "/community" as const, label: t("showcase") },
      ],
    },
    {
      title: t("community"),
      links: [
        { href: "https://github.com/AIInactionTop", label: t("github"), external: true },
        { href: "/community" as const, label: t("projects") },
        { href: "/jobs" as const, label: t("jobs") },
        { href: "/about" as const, label: t("about") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/privacy" as const, label: t("privacy") },
        { href: "/terms" as const, label: t("terms") },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-border bg-background">
      {/* Subtle grid */}
      <div className="sci-fi-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.78_0.145_195/0.25)]">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-display font-bold tracking-tight">
                AI In Action
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href as never}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}

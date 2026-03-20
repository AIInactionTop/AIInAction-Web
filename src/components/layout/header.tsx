"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Github, Moon, Sun, Zap, Plus, ChevronDown, Building2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeaderXPBadge } from "@/components/gamification/header-xp-badge";
import { HeaderCreditsBadge } from "@/components/billing/header-credits-badge";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Header() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [mobileLearnOpen, setMobileLearnOpen] = useState(false);

  const learnSubLinks = [
    { href: "/learn/challenges" as const, label: t("challenges") },
    { href: "/learn/paths" as const, label: t("paths") },
    { href: "/learn/activities" as const, label: t("activities") },
  ];

  const navLinks = [
    { href: "/marketplace" as const, label: t("marketplace") },
    { href: "/community" as const, label: t("community") },
    { href: "/ai-studio" as const, label: t("aiStudio") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_12px_oklch(0.78_0.145_195/0.3)] transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_oklch(0.78_0.145_195/0.5)]">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            AI In Action
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Learn dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setLearnOpen(true)}
            onMouseLeave={() => setLearnOpen(false)}
          >
            <Link
              href="/learn"
              className={`relative flex items-center gap-1 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                pathname.includes("/learn")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("learn")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${learnOpen ? "rotate-180" : ""}`} />
              {pathname.includes("/learn") && (
                <div className="absolute inset-x-1 -bottom-[1.125rem] h-px bg-primary shadow-[0_0_8px_oklch(0.78_0.145_195/0.5)]" />
              )}
            </Link>
            <AnimatePresence>
              {learnOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-popover p-1 shadow-md"
                >
                  {learnSubLinks.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`block rounded-sm px-3 py-2 text-sm transition-colors ${
                        pathname.includes(sub.href)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {navLinks.map((link) => {
            const isActive = pathname.includes(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive && (
                  <div className="absolute inset-x-1 -bottom-[1.125rem] h-px bg-primary shadow-[0_0_8px_oklch(0.78_0.145_195/0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {session?.user && (
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1.5 border-primary/25 hover:border-primary/50 hover:bg-primary/5 md:flex"
              asChild
            >
              <Link href="/learn/challenges/new">
                <Plus className="h-3.5 w-3.5" />
                {tc("create")}
              </Link>
            </Button>
          )}

          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* {session?.user?.id && (
            <HeaderCreditsBadge />
          )} */}

          {session?.user?.id && (
            <HeaderXPBadge userId={session.user.id} />
          )}

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={session.user.image || ""}
                      alt={session.user.name || ""}
                    />
                    <AvatarFallback>
                      {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/enterprise">
                    <Building2 className="mr-2 h-4 w-4" />
                    {t("enterprise")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/credits">Credits</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/membership">Membership</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${session.user.id}` as never}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  {tc("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => signIn("github")}
              className="gap-2"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">{tc("signIn")}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <nav className="flex flex-col gap-1 p-4">
              {/* Learn expandable section */}
              <button
                onClick={() => setMobileLearnOpen(!mobileLearnOpen)}
                className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname.includes("/learn")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("learn")}
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileLearnOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {mobileLearnOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 pl-4">
                      {learnSubLinks.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            pathname.includes(sub.href)
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname.includes(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {session?.user && (
                <>
                  <Link
                    href="/enterprise"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    {t("enterprise")}
                  </Link>
                  <Link
                    href="/credits"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Credits
                  </Link>
                  <Link
                    href="/membership"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Membership
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

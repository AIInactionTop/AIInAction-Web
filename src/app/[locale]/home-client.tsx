"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Gamepad2,
  Smartphone,
  Bot,
  Github,
  Users,
  Trophy,
  Sparkles,
  ChevronRight,
  Zap,
  Plus,
  Pen,
  ImageIcon,
  Video,
  BarChart3,
  AudioLines,
  Terminal,
  Shield,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signIn, useSession } from "next-auth/react";
import { difficultyConfig } from "@/lib/constants";
import { useTranslations } from "next-intl";

/* ── Animation variants ── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/* ── Icon map ── */

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  Gamepad2,
  Smartphone,
  Bot,
  Pen,
  Image: ImageIcon,
  Video,
  BarChart3,
  AudioLines,
  Terminal,
};

/* ── Types ── */

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
};

type FeaturedChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyConfig;
  estimatedTime: string | null;
  isOfficial: boolean;
  likesCount: number;
  category: { name: string } | null;
  author: { id: string; name: string | null; image: string | null } | null;
};

type Stats = {
  challengeCount: number;
  categoryCount: number;
  userCount: number;
  projectCount: number;
};

/* ── Main Component ── */

export function HomeClient({
  stats,
  categories,
  featured,
}: {
  stats: Stats;
  categories: Category[];
  featured: FeaturedChallenge[];
}) {
  const { data: session } = useSession();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");
  const td = useTranslations("difficulty");

  const statItems = [
    { value: String(stats.challengeCount), label: t("challengesStat"), icon: Trophy },
    { value: String(stats.categoryCount), label: t("categoriesStat"), icon: Sparkles },
    {
      value: String(stats.userCount || "Open"),
      label: stats.userCount ? t("buildersStat") : t("openSourceStat"),
      icon: stats.userCount ? Users : Github,
    },
    {
      value: String(stats.projectCount || "0"),
      label: t("sharedProjectsStat"),
      icon: FolderOpen,
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative flex min-h-[92vh] items-center">
        {/* Animated grid */}
        <div className="sci-fi-grid pointer-events-none absolute inset-0 opacity-60" />

        {/* Radial fade mask over grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 70%)",
          }}
        >
          <div className="sci-fi-grid absolute inset-0 opacity-40" />
        </div>

        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-float-slow absolute -top-32 left-1/2 h-[600px] w-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-[140px]" />
          <div className="animate-float-alt absolute bottom-[10%] right-[5%] h-[350px] w-[400px] rounded-full bg-purple-500/8 blur-[100px]" />
          <div className="animate-float-slow absolute left-[8%] top-[40%] h-[250px] w-[250px] rounded-full bg-primary/5 blur-[80px]" />
        </div>

        {/* Scan line */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="scan-line-sweep absolute left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, oklch(0.78 0.145 195 / 0.25) 30%, oklch(0.78 0.145 195 / 0.4) 50%, oklch(0.78 0.145 195 / 0.25) 70%, transparent 100%)",
            }}
          />
        </div>

        {/* Hero content */}
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-4xl text-center"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <Badge
                variant="outline"
                className="mb-8 gap-2 border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
              >
                <Zap className="h-3.5 w-3.5" />
                {t("badge")}
              </Badge>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="font-display text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl"
            >
              {t("titleLine1")}{" "}
              <span className="text-glow-cyan bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent dark:via-cyan-300">
                {t("titleHighlight")}
              </span>
              <br />
              <span className="text-foreground/90">{t("titleLine2")}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              {t("subtitle")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base shadow-[0_0_25px_oklch(0.78_0.145_195/0.25)] transition-shadow hover:shadow-[0_0_35px_oklch(0.78_0.145_195/0.4)]"
                asChild
              >
                <Link href="/challenges">
                  {t("startBuilding")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {session ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 gap-2 border-primary/25 px-8 text-base hover:border-primary/50 hover:bg-primary/5"
                  asChild
                >
                  <Link href="/challenges/new">
                    <Plus className="h-4 w-4" />
                    {t("createChallenge")}
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 gap-2 border-primary/25 px-8 text-base hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => signIn("github")}
                >
                  <Github className="h-4 w-4" />
                  {t("signInGithub")}
                </Button>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={staggerFast}
              initial="hidden"
              animate="visible"
              className="mt-20 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
            >
              {statItems.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={scaleIn}
                  className="rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-5 backdrop-blur-sm transition-colors hover:border-primary/25 hover:bg-primary/[0.06]"
                >
                  <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary/50" />
                  <div className="font-display text-2xl font-bold text-primary sm:text-3xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ═══════════════════ CATEGORIES ═══════════════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 sci-fi-grid opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("exploreTitle")}{" "}
                <span className="text-glow-cyan text-primary">{t("exploreHighlight")}</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("exploreSubtitle", { count: categories.length })}
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon || ""] || Zap;
                return (
                  <motion.div key={cat.slug} variants={fadeUp}>
                    <Link
                      href={`/challenges?categories=${cat.slug}`}
                      className="group block"
                    >
                      <div className="h-full rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
                        <div
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                          style={{
                            backgroundColor: `${cat.color}15`,
                          }}
                        >
                          <span style={{ color: cat.color || undefined }}>
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold transition-colors group-hover:text-primary">
                          {tCat.has(`${cat.slug}.name`) ? tCat(`${cat.slug}.name`) : cat.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {tCat.has(`${cat.slug}.description`) ? tCat(`${cat.slug}.description`) : cat.description}
                        </p>
                        <div className="mt-3 flex items-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ FEATURED CHALLENGES ═══════════════════ */}
      <section className="relative border-t border-border py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-[20%] h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              className="flex items-end justify-between"
            >
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {t("popularTitle")}{" "}
                  <span className="text-glow-cyan text-primary">
                    {t("popularHighlight")}
                  </span>
                </h2>
                <p className="mt-3 text-lg text-muted-foreground">
                  {t("popularSubtitle")}
                </p>
              </div>
              <Button
                variant="ghost"
                className="hidden gap-1 text-primary hover:bg-primary/10 hover:text-primary sm:flex"
                asChild
              >
                <Link href="/challenges">
                  {tc("viewAll")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c) => {
                const diff = difficultyConfig[c.difficulty];
                return (
                  <motion.div key={c.id} variants={fadeUp}>
                    <Link
                      href={`/challenges/${c.slug}`}
                      className="group block"
                    >
                      <div className="h-full rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/25 hover:bg-card/80 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {c.isOfficial ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-[10px]"
                              >
                                <Shield className="h-3 w-3" />
                                {tc("official")}
                              </Badge>
                            ) : c.author ? (
                              <div className="flex items-center gap-1.5">
                                {c.author.image && (
                                  <Image
                                    src={c.author.image}
                                    alt={c.author.name || ""}
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {c.author.name}
                                </span>
                              </div>
                            ) : null}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${diff.className}`}
                          >
                            {td.has(c.difficulty) ? td(c.difficulty) : diff.label}
                          </Badge>
                        </div>
                        <h3 className="mt-3 font-semibold transition-colors group-hover:text-primary">
                          {c.title}
                        </h3>
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          {c.category && <span>{c.category.name}</span>}
                          {c.estimatedTime && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-primary/20" />
                              <span>{c.estimatedTime}</span>
                            </>
                          )}
                          {c.likesCount > 0 && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-primary/20" />
                              <span>{tc("likes", { count: c.likesCount })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button
                variant="outline"
                className="gap-1 border-primary/25"
                asChild
              >
                <Link href="/challenges">
                  {t("viewAllChallenges")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative overflow-hidden rounded-2xl border border-primary/20 px-6 py-20 text-center sm:px-16"
          >
            {/* CTA background effects */}
            <div className="pointer-events-none absolute inset-0 sci-fi-grid opacity-30" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[140px]" />
              <div className="absolute bottom-0 left-1/4 h-[200px] w-[300px] rounded-full bg-purple-500/5 blur-[80px]" />
            </div>

            <div className="relative">
              <motion.h2
                variants={fadeUp}
                className="font-display text-3xl font-bold tracking-tight sm:text-5xl"
              >
                {t("ctaTitle")}{" "}
                <span className="text-glow-cyan text-primary">
                  {t("ctaHighlight")}
                </span>
                ?
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground"
              >
                {t("ctaSubtitle")}
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              >
                <Button
                  size="lg"
                  className="h-12 gap-2 px-8 shadow-[0_0_25px_oklch(0.78_0.145_195/0.25)] transition-shadow hover:shadow-[0_0_35px_oklch(0.78_0.145_195/0.4)]"
                  asChild
                >
                  <Link href="/challenges">
                    {t("browseChallenges")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 gap-2 border-primary/25 px-8 hover:border-primary/50 hover:bg-primary/5"
                  asChild
                >
                  <Link href="/challenges/new">
                    <Plus className="h-4 w-4" />
                    {t("createChallenge")}
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

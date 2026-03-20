"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  Users,
  Calendar,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { difficultyConfig } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useState } from "react";

/* ── Animation variants ── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

/* ── Types ── */

type Activity = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  externalUrl: string | null;
};

type InProgressChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: keyof typeof difficultyConfig;
  category: { name: string; slug: string } | null;
  path: { title: string; slug: string } | null;
};

type PathWithCount = {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  challengeCount: number;
};

type PopularChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyConfig;
  isOfficial: boolean;
  likesCount: number;
  category: { name: string; slug: string } | null;
  author: { id: string; name: string | null; image: string | null } | null;
  _count: { registrations: number };
};

/* ── Helpers ── */

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function activityTypeBadge(type: string) {
  const map: Record<string, string> = {
    HACKATHON: "Hackathon",
    THEMED: "Themed",
    EXTERNAL: "External",
    GENERAL: "General",
  };
  return map[type] || type;
}

/* ── Main Component ── */

export function LearnClient({
  activities,
  inProgressChallenges,
  paths,
  popularChallenges,
}: {
  activities: Activity[];
  inProgressChallenges: InProgressChallenge[];
  paths: PathWithCount[];
  popularChallenges: PopularChallenge[];
}) {
  const t = useTranslations("learn");
  const tc = useTranslations("common");
  const td = useTranslations("difficulty");
  const [challengeFilter, setChallengeFilter] = useState<
    "all" | "official" | "community"
  >("all");

  const filteredChallenges = popularChallenges.filter((c) => {
    if (challengeFilter === "official") return c.isOfficial;
    if (challengeFilter === "community") return !c.isOfficial;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* ═══════════════════ ACTIVITY BANNER ═══════════════════ */}
      {activities.length > 0 && (
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mb-12"
        >
          {activities.length === 1 ? (
            <motion.div variants={fadeUp}>
              <ActivityHeroCard activity={activities[0]} />
            </motion.div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  variants={fadeUp}
                  className="min-w-[320px] flex-shrink-0 sm:min-w-[400px]"
                >
                  <ActivityCard activity={activity} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* ═══════════════════ CONTINUE LEARNING ═══════════════════ */}
      {inProgressChallenges.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mb-12"
        >
          <motion.h2
            variants={fadeUp}
            className="mb-6 text-2xl font-bold tracking-tight"
          >
            {t("continueLearning")}
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {inProgressChallenges.map((challenge) => {
              const diff = difficultyConfig[challenge.difficulty];
              return (
                <motion.div key={challenge.id} variants={fadeUp}>
                  <Link
                    href={`/learn/challenges/${challenge.slug}`}
                    className="group block"
                  >
                    <Card className="h-full p-5 transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${diff.className}`}
                        >
                          {td.has(challenge.difficulty)
                            ? td(challenge.difficulty)
                            : diff.label}
                        </Badge>
                      </div>
                      <h3 className="mt-3 font-semibold transition-colors group-hover:text-primary">
                        {challenge.title}
                      </h3>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        {challenge.category && (
                          <span>{challenge.category.name}</span>
                        )}
                        {challenge.path && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-primary/20" />
                            <span>{challenge.path.title}</span>
                          </>
                        )}
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ═══════════════════ LEARNING PATHS ═══════════════════ */}
      {paths.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mb-12"
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 flex items-end justify-between"
          >
            <h2 className="text-2xl font-bold tracking-tight">
              {t("learningPaths")}
            </h2>
            <Button
              variant="ghost"
              className="hidden gap-1 text-primary hover:bg-primary/10 hover:text-primary sm:flex"
              asChild
            >
              <Link href="/learn/paths">
                {t("viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {paths.map((path) => (
              <motion.div
                key={path.slug}
                variants={fadeUp}
                className="min-w-[220px] flex-shrink-0"
              >
                <Link
                  href={`/learn/paths/${path.slug}`}
                  className="group block"
                >
                  <Card className="h-full p-5 transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
                    <div
                      className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                      style={{
                        backgroundColor: `${path.color || "#6366f1"}15`,
                      }}
                    >
                      {path.icon || "📚"}
                    </div>
                    <h3 className="font-semibold transition-colors group-hover:text-primary">
                      {path.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {path.challengeCount} {tc("challenges")}
                    </p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 text-center sm:hidden">
            <Button
              variant="outline"
              className="gap-1 border-primary/25"
              asChild
            >
              <Link href="/learn/paths">
                {t("viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.section>
      )}

      {/* ═══════════════════ POPULAR CHALLENGES ═══════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div
          variants={fadeUp}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <h2 className="text-2xl font-bold tracking-tight">
            {t("popularChallenges")}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-border p-1">
              {(["all", "official", "community"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChallengeFilter(filter)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    challengeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(filter)}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="hidden gap-1 text-primary hover:bg-primary/10 hover:text-primary sm:flex"
              asChild
            >
              <Link href="/learn/challenges">
                {t("viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredChallenges.map((c) => {
            const diff = difficultyConfig[c.difficulty];
            return (
              <motion.div key={c.id} variants={fadeUp}>
                <Link
                  href={`/learn/challenges/${c.slug}`}
                  className="group block"
                >
                  <Card className="h-full p-5 transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
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
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            {tc("community")}
                          </Badge>
                        )}
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
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {c.description}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      {c.category && <span>{c.category.name}</span>}
                      {c.likesCount > 0 && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-primary/20" />
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {c.likesCount}
                          </span>
                        </>
                      )}
                      {c._count?.registrations > 0 && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-primary/20" />
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {c._count.registrations}
                          </span>
                        </>
                      )}
                    </div>
                  </Card>
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
            <Link href="/learn/challenges">
              {t("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.section>
    </div>
  );
}

/* ── Activity Hero Card (single activity) ── */

function ActivityHeroCard({ activity }: { activity: Activity }) {
  const activityLink =
    activity.type === "EXTERNAL" && activity.externalUrl
      ? activity.externalUrl
      : `/learn/activities/${activity.slug}`;
  const isExternal = activity.type === "EXTERNAL" && activity.externalUrl;

  return (
    <Link
      href={activityLink}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group block"
    >
      <Card className="relative overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
        <div className="flex flex-col sm:flex-row">
          {activity.coverImage && (
            <div className="relative h-48 w-full flex-shrink-0 sm:h-auto sm:w-72">
              <img
                src={activity.coverImage}
                alt={activity.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center p-6">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {activityTypeBadge(activity.type)}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  activity.status === "ACTIVE"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {activity.status === "ACTIVE" ? "Active" : "Upcoming"}
              </Badge>
            </div>
            <h3 className="text-xl font-bold transition-colors group-hover:text-primary sm:text-2xl">
              {activity.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {activity.description}
            </p>
            {(activity.startDate || activity.endDate) && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {formatDate(activity.startDate)}
                  {activity.endDate && ` - ${formatDate(activity.endDate)}`}
                </span>
              </div>
            )}
            <div className="mt-4">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Learn more
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/* ── Activity Card (multiple activities) ── */

function ActivityCard({ activity }: { activity: Activity }) {
  const activityLink =
    activity.type === "EXTERNAL" && activity.externalUrl
      ? activity.externalUrl
      : `/learn/activities/${activity.slug}`;
  const isExternal = activity.type === "EXTERNAL" && activity.externalUrl;

  return (
    <Link
      href={activityLink}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group block"
    >
      <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_oklch(0.78_0.145_195/0.08)]">
        {activity.coverImage && (
          <div className="relative h-36 w-full">
            <img
              src={activity.coverImage}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {activityTypeBadge(activity.type)}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                activity.status === "ACTIVE"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {activity.status === "ACTIVE" ? "Active" : "Upcoming"}
            </Badge>
          </div>
          <h3 className="font-semibold transition-colors group-hover:text-primary">
            {activity.title}
          </h3>
          {(activity.startDate || activity.endDate) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDate(activity.startDate)}
                {activity.endDate && ` - ${formatDate(activity.endDate)}`}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

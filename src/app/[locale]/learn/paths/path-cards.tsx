"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Code2, Gamepad2, Smartphone, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

type PathWithStats = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  challengeCount: number;
  difficultyBreakdown: {
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
  };
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  Gamepad2,
  Smartphone,
  Bot,
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function PathCards({ paths }: { paths: PathWithStats[] }) {
  const t = useTranslations("paths");
  const td = useTranslations("difficulty");
  const tPath = useTranslations("pathContent");

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="mt-12 grid gap-6 md:grid-cols-2"
    >
      {paths.map((path) => {
        const Icon = iconMap[path.icon];
        return (
          <motion.div key={path.slug} variants={fadeUp}>
            <Link href={`/paths/${path.slug}`} className="group block">
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-6 transition-all hover:border-border hover:bg-card hover:shadow-lg sm:p-8">
                <div
                  className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10"
                  style={{ backgroundColor: path.color }}
                />
                <div className="relative">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${path.color}15` }}
                  >
                    {Icon && (
                      <span style={{ color: path.color }}>
                        <Icon className="h-6 w-6" />
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight">
                    {tPath.has(`${path.slug}.title`) ? tPath(`${path.slug}.title`) : path.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {tPath.has(`${path.slug}.description`) ? tPath(`${path.slug}.description`) : path.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                    >
                      {path.difficultyBreakdown.beginner} {td("BEGINNER")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
                    >
                      {path.difficultyBreakdown.intermediate} {td("INTERMEDIATE")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 text-[10px]"
                    >
                      {path.difficultyBreakdown.advanced} {td("ADVANCED")}
                    </Badge>
                    {path.difficultyBreakdown.expert > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]"
                      >
                        {path.difficultyBreakdown.expert} {td("EXPERT")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("challengeCount", { count: path.challengeCount })}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5">
                      {t("startPath")}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

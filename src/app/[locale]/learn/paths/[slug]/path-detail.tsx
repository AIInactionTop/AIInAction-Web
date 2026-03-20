"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Code2,
  Gamepad2,
  Smartphone,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { difficultyConfig } from "@/lib/constants";
import { useTranslations } from "next-intl";

type PathData = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
};

type ChallengeData = {
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyConfig;
  estimatedTime: string | null;
  order: number;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  Gamepad2,
  Smartphone,
  Bot,
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

export function PathDetail({
  path,
  challenges,
}: {
  path: PathData;
  challenges: ChallengeData[];
}) {
  const t = useTranslations("paths");
  const tPath = useTranslations("pathContent");
  const Icon = iconMap[path.icon];

  const pathTitle = tPath.has(`${path.slug}.title`) ? tPath(`${path.slug}.title`) : path.title;
  const pathDesc = tPath.has(`${path.slug}.description`) ? tPath(`${path.slug}.description`) : path.description;

  const grouped = {
    BEGINNER: challenges.filter((c) => c.difficulty === "BEGINNER"),
    INTERMEDIATE: challenges.filter((c) => c.difficulty === "INTERMEDIATE"),
    ADVANCED: challenges.filter((c) => c.difficulty === "ADVANCED"),
    EXPERT: challenges.filter((c) => c.difficulty === "EXPERT"),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/learn/paths"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToPaths")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{pathTitle}</span>
      </div>

      {/* Header */}
      <div className="mt-8">
        <div
          className="inline-flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${path.color}15` }}
        >
          {Icon && (
            <span style={{ color: path.color }}>
              <Icon className="h-7 w-7" />
            </span>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {pathTitle}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {pathDesc}
        </p>
        <div className="mt-4 text-sm text-muted-foreground">
          {t("challengeCount", { count: challenges.length })}
        </div>
      </div>

      {/* Challenge list by difficulty */}
      <div className="mt-12 space-y-10">
        {(
          Object.entries(grouped) as [
            keyof typeof difficultyConfig,
            ChallengeData[],
          ][]
        )
          .filter(([, items]) => items.length > 0)
          .map(([difficulty, items]) => {
            const config = difficultyConfig[difficulty];
            return (
              <section key={difficulty}>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {t("challengeCount", { count: items.length })}
                  </span>
                </div>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={stagger}
                  className="mt-4 space-y-2"
                >
                  {items.map((challenge) => (
                    <motion.div key={challenge.slug} variants={fadeUp}>
                      <Link
                        href={`/challenges/${challenge.slug}`}
                        className="group flex items-center gap-4 rounded-lg border border-border/40 bg-card/30 px-4 py-3.5 transition-all hover:border-border hover:bg-card hover:shadow-sm"
                      >
                        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                          #{String(challenge.order).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                            {challenge.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {challenge.description}
                          </p>
                        </div>
                        {challenge.estimatedTime && (
                          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                            <Clock className="h-3.5 w-3.5" />
                            {challenge.estimatedTime}
                          </div>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            );
          })}
      </div>
    </div>
  );
}

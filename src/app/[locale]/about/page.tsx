import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Zap,
  Route,
  Trophy,
  Presentation,
  Target,
  Rocket,
  Github,
  ArrowRight,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  };
}

const featureIcons = [Zap, Route, Presentation, Trophy];
const featureKeys = [
  "Challenges",
  "Paths",
  "Showcase",
  "Leaderboard",
] as const;
const featureHrefs = [
  "/challenges",
  "/paths",
  "/showcase",
  "/leaderboard",
] as const;
const featureColors = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-violet-500",
  "from-orange-500 to-amber-500",
  "from-emerald-500 to-teal-500",
];

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-linear-to-b from-primary/5 via-background to-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.78_0.145_195/0.12),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 text-lg font-medium text-primary sm:text-xl">
            {t("heroSubtitle")}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("heroDescription")}
          </p>
        </div>
      </section>

      {/* Core Features */}


      {/* Vision & Mission */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-linear-to-br from-primary/10 to-transparent blur-2xl" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{t("visionTitle")}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {t("visionContent")}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-linear-to-br from-orange-500/10 to-transparent blur-2xl" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-lg">
                  <Rocket className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{t("missionTitle")}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {t("missionContent")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("ctaTitle")}
        </h2>
        <p className="mt-3 text-muted-foreground">{t("ctaSubtitle")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            {t("browseChallenges")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/AIInactionTop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Github className="h-4 w-4" />
            {t("joinGithub")}
          </a>
        </div>
      </section>
    </div>
  );
}

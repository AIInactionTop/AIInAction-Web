"use client";

import { Suspense, lazy, useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ExternalLink,
  Rocket,
  Users,
  Zap,
  Shield,
  Code2,
  Megaphone,
  TrendingUp,
  Baby,
  Pen,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Target,
  Bot,
  Sparkles,
  Palette,
  Scale,
  UserSearch,
  GraduationCap,
  HeartPulse,
  Mic,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

const Hero3DScene = lazy(
  () => import("@/components/activities/hero-3d-scene")
);

/* ── Animation variants ── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

/* ── Static case config (colors, icons, URLs) ── */

const caseConfigs = [
  {
    id: "luxury-trade",
    name: "Vivian",
    icon: ShoppingBag,
    color: "from-amber-500 to-yellow-600",
    colorBg: "bg-amber-500/10",
    colorText: "text-amber-400",
    colorBorder: "border-amber-500/30",
    glowColor: "#f59e0b",
    htmlUrl: "/usercase/openclaw-luxury-trade-configuration-guide.html",
    htmlUrlEn: "/usercase/openclaw-luxury-trade-configuration-guide-en.html",
  },
  {
    id: "amazon-seller",
    name: "Marcus Liu",
    icon: ShoppingBag,
    color: "from-orange-600 to-amber-700",
    colorBg: "bg-orange-600/10",
    colorText: "text-orange-400",
    colorBorder: "border-orange-600/30",
    glowColor: "#ea580c",
    htmlUrl: "/usercase/amazon-seller-ai-agents.html",
    htmlUrlEn: "/usercase/amazon-seller-ai-agents-en.html",
  },
  {
    id: "investor-intelligence",
    name: "Kevin Luo",
    icon: TrendingUp,
    color: "from-sky-500 to-blue-600",
    colorBg: "bg-sky-500/10",
    colorText: "text-sky-400",
    colorBorder: "border-sky-500/30",
    glowColor: "#0ea5e9",
    htmlUrl: "/usercase/investor-intelligence-engine.html",
    htmlUrlEn: "/usercase/investor-intelligence-engine-en.html",
  },
  {
    id: "pm-brain-trust",
    name: "Aria Zhang",
    icon: Target,
    color: "from-rose-500 to-red-600",
    colorBg: "bg-rose-500/10",
    colorText: "text-rose-400",
    colorBorder: "border-rose-500/30",
    glowColor: "#e63946",
    htmlUrl: "/usercase/pm-ai-brain-trust.html",
    htmlUrlEn: "/usercase/pm-ai-brain-trust-en.html",
  },
  {
    id: "content-marketing",
    name: "林逸飞",
    icon: Megaphone,
    color: "from-orange-500 to-amber-600",
    colorBg: "bg-orange-500/10",
    colorText: "text-orange-400",
    colorBorder: "border-orange-500/30",
    glowColor: "#f97316",
    htmlUrl: "/usercase/content-marketing-automation.html",
    htmlUrlEn: "/usercase/content-marketing-automation-en.html",
  },
  {
    id: "indie-dev",
    name: "张明",
    icon: Code2,
    color: "from-blue-500 to-indigo-600",
    colorBg: "bg-blue-500/10",
    colorText: "text-blue-400",
    colorBorder: "border-blue-500/30",
    glowColor: "#3b82f6",
    htmlUrl: "/usercase/indie-developer-workflow.html",
    htmlUrlEn: "/usercase/indie-developer-workflow-en.html",
  },
  {
    id: "saas-sales",
    name: "Sarah Chen",
    icon: TrendingUp,
    color: "from-purple-500 to-violet-600",
    colorBg: "bg-purple-500/10",
    colorText: "text-purple-400",
    colorBorder: "border-purple-500/30",
    glowColor: "#a855f7",
    htmlUrl: "/usercase/saas-sales-growth-engine.html",
    htmlUrlEn: "/usercase/saas-sales-growth-engine-en.html",
  },
  {
    id: "dev-assistant",
    name: "张帆",
    icon: Zap,
    color: "from-teal-500 to-cyan-600",
    colorBg: "bg-teal-500/10",
    colorText: "text-teal-400",
    colorBorder: "border-teal-500/30",
    glowColor: "#14b8a6",
    htmlUrl: "/usercase/developer-ai-assistant-network.html",
    htmlUrlEn: "/usercase/developer-ai-assistant-network-en.html",
  },
  {
    id: "cybersecurity",
    name: "Simon Roses Femerling",
    icon: Shield,
    color: "from-red-500 to-rose-600",
    colorBg: "bg-red-500/10",
    colorText: "text-red-400",
    colorBorder: "border-red-500/30",
    glowColor: "#ef4444",
    htmlUrl: "/usercase/cybersecurity-automation.html",
    htmlUrlEn: "/usercase/cybersecurity-automation-en.html",
  },
  {
    id: "supermom",
    name: "Jesse Genet",
    icon: Baby,
    color: "from-pink-500 to-fuchsia-600",
    colorBg: "bg-pink-500/10",
    colorText: "text-pink-400",
    colorBorder: "border-pink-500/30",
    glowColor: "#ec4899",
    htmlUrl: "/usercase/supermom-ai-empowerment.html",
    htmlUrlEn: "/usercase/supermom-ai-empowerment-en.html",
  },
  {
    id: "content-creator",
    name: "张华",
    icon: Pen,
    color: "from-amber-500 to-orange-600",
    colorBg: "bg-amber-500/10",
    colorText: "text-amber-400",
    colorBorder: "border-amber-500/30",
    glowColor: "#d97706",
    htmlUrl: "/usercase/content-creator-passive-income.html",
    htmlUrlEn: "/usercase/content-creator-passive-income-en.html",
  },
  {
    id: "freelance-designer",
    name: "Maya Chen",
    icon: Palette,
    color: "from-violet-500 to-purple-600",
    colorBg: "bg-violet-500/10",
    colorText: "text-violet-400",
    colorBorder: "border-violet-500/30",
    glowColor: "#8b5cf6",
    htmlUrl: "/usercase/freelance-designer-automation.html",
    htmlUrlEn: "/usercase/freelance-designer-automation-en.html",
  },
  {
    id: "legal-advisor",
    name: "David Park",
    icon: Scale,
    color: "from-emerald-500 to-teal-600",
    colorBg: "bg-emerald-500/10",
    colorText: "text-emerald-400",
    colorBorder: "border-emerald-500/30",
    glowColor: "#10b981",
    htmlUrl: "/usercase/legal-advisor-automation.html",
    htmlUrlEn: "/usercase/legal-advisor-automation-en.html",
  },
  {
    id: "hr-recruiter",
    name: "Rachel Kim",
    icon: UserSearch,
    color: "from-indigo-500 to-blue-600",
    colorBg: "bg-indigo-500/10",
    colorText: "text-indigo-400",
    colorBorder: "border-indigo-500/30",
    glowColor: "#6366f1",
    htmlUrl: "/usercase/hr-recruiter-automation.html",
    htmlUrlEn: "/usercase/hr-recruiter-automation-en.html",
  },
  {
    id: "education-entrepreneur",
    name: "Alex Wu",
    icon: GraduationCap,
    color: "from-amber-500 to-yellow-600",
    colorBg: "bg-amber-500/10",
    colorText: "text-amber-400",
    colorBorder: "border-amber-500/30",
    glowColor: "#f59e0b",
    htmlUrl: "/usercase/education-entrepreneur-automation.html",
    htmlUrlEn: "/usercase/education-entrepreneur-automation-en.html",
  },
  {
    id: "healthcare-practitioner",
    name: "Dr. Emily Zhang",
    icon: HeartPulse,
    color: "from-cyan-500 to-teal-600",
    colorBg: "bg-cyan-500/10",
    colorText: "text-cyan-400",
    colorBorder: "border-cyan-500/30",
    glowColor: "#06b6d4",
    htmlUrl: "/usercase/healthcare-practitioner-automation.html",
    htmlUrlEn: "/usercase/healthcare-practitioner-automation-en.html",
  },
  {
    id: "podcaster-creator",
    name: "Jordan Rivera",
    icon: Mic,
    color: "from-rose-500 to-pink-600",
    colorBg: "bg-rose-500/10",
    colorText: "text-rose-400",
    colorBorder: "border-rose-500/30",
    glowColor: "#e11d48",
    htmlUrl: "/usercase/podcaster-creator-automation.html",
    htmlUrlEn: "/usercase/podcaster-creator-automation-en.html",
  },
  {
    id: "real-estate-agent",
    name: "Lisa Chen",
    icon: Home,
    color: "from-yellow-600 to-amber-700",
    colorBg: "bg-yellow-600/10",
    colorText: "text-yellow-400",
    colorBorder: "border-yellow-600/30",
    glowColor: "#d97706",
    htmlUrl: "/usercase/real-estate-agent-automation.html",
    htmlUrlEn: "/usercase/real-estate-agent-automation-en.html",
  },
];

const stepIcons = [Target, Bot, Rocket, Users];
const stepColors = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-orange-500 to-amber-600",
  "from-emerald-500 to-teal-600",
];

/* ── Glassmorphism Step Card ── */
function GlassStepCard({
  num,
  title,
  desc,
  color,
  icon: Icon,
}: {
  num: number;
  title: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div variants={scaleIn}>
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-500/5">
        {/* Background gradient glow */}
        <div
          className={`absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${color} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
        />

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-lg font-bold text-white shadow-lg`}
            >
              {num}
            </div>
            <Icon className="h-5 w-5 text-white/40 transition-colors group-hover:text-white/70" />
          </div>
          <h3 className="font-semibold text-white/90">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/50">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Glowing Case Card with 3D Tilt ── */
type CaseCardProps = {
  config: (typeof caseConfigs)[number];
  resolvedUrl: string;
  title: string;
  subtitle: string;
  persona: string;
  personaTag: string;
  stats: { value: string; label: string }[];
  highlights: string[];
  viewGuideLabel: string;
};

function GlowingCaseCard({
  config,
  resolvedUrl,
  title,
  subtitle,
  persona,
  personaTag,
  stats,
  highlights,
  viewGuideLabel,
}: CaseCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { stiffness: 300, damping: 30 };
  const xSpring = useSpring(mouseX, springConfig);
  const ySpring = useSpring(mouseY, springConfig);

  const rotateX = useTransform(ySpring, [0, 1], [5, -5]);
  const rotateY = useTransform(xSpring, [0, 1], [-5, 5]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.div variants={scaleIn}>
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block h-full"
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative h-full"
        >
          <div
            className={`relative h-full overflow-hidden rounded-2xl border ${config.colorBorder} bg-black/40 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl`}
            style={{
              boxShadow: `0 0 0 1px ${config.glowColor}15`,
            }}
          >
            {/* Animated gradient top bar */}
            <div className="relative h-1.5 overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-r ${config.color}`}
              />
              <div
                className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{
                  backgroundSize: "200% 100%",
                }}
              />
            </div>

            {/* Hover glow overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${config.glowColor}15 0%, transparent 60%)`,
              }}
            />

            <div className="relative z-10 p-5">
              {/* Icon + persona badge */}
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.colorBg} ring-1 ring-white/5`}
                >
                  <config.icon className={`h-5 w-5 ${config.colorText}`} />
                </div>
                <Badge
                  variant="outline"
                  className={`border-white/10 text-[10px] ${config.colorText} backdrop-blur-sm`}
                >
                  {personaTag}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="mt-4 font-semibold leading-snug text-white/90 transition-colors group-hover:text-white">
                {title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/40">
                {subtitle}
              </p>

              {/* Persona info */}
              <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
                <span className="font-medium text-white/60">{config.name}</span>
                <span>·</span>
                <span>{persona}</span>
              </div>

              {/* Stats */}
              <div className="mt-4 flex gap-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className={`text-lg font-bold ${config.colorText}`}>
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-white/30">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-white/40"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {h}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-5 flex items-center gap-1 text-sm font-medium text-white/0 transition-all duration-300 group-hover:text-white/80">
                {viewGuideLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </motion.div>
      </a>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function ActivitiesPage() {
  const t = useTranslations("activities");
  const locale = useLocale();

  const steps = [1, 2, 3, 4].map((num) => ({
    num,
    title: t(`step${num}Title` as Parameters<typeof t>[0]),
    desc: t(`step${num}Desc` as Parameters<typeof t>[0]),
    color: stepColors[num - 1],
    icon: stepIcons[num - 1],
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient background gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-pink-600/5 blur-[120px]" />
      </div>

      {/* ── Hero Section with 3D Scene ── */}
      <section className="relative min-h-[90vh] overflow-hidden">
        {/* 3D Background */}
        <Suspense
          fallback={
            <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent" />
          }
        >
          <Hero3DScene />
        </Suspense>

        {/* Vignette overlay for readability */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#0a0a0f]/30 via-transparent to-[#0a0a0f]" />

        {/* Content overlay */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex min-h-[90vh] flex-col items-center justify-center px-4 py-16 sm:py-24"
        >
          <motion.div variants={fadeUp}>
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              {t("heroBadge")}
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="max-w-4xl text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl"
          >
            <span className="text-white/90">{t("heroTitle1")}</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              {t("heroTitle2")}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-white/40"
          >
            {t("heroSubtitle")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 transition-shadow hover:shadow-xl hover:shadow-purple-500/30"
              asChild
            >
              <a href="#cases">
                {t("browseCases")}
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/5 text-white/70 backdrop-blur-sm hover:bg-white/10 hover:text-white"
              asChild
            >
              <a
                href="https://openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("learnOpenClaw")}
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/5 text-white/70 backdrop-blur-sm hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/learn/challenges/openclaw">
                {t("joinChallenge")}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Stats with glassmorphism */}
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8"
          >
            {[
              { value: "18", labelKey: "statCases" as const },
              { value: "70+", labelKey: "statAgents" as const },
              { value: "60%+", labelKey: "statEfficiency" as const },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-white/30">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div variants={fadeUp} className="mt-12">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-white/20"
            >
              <span className="text-xs">{t("scrollDown")}</span>
              <div className="h-8 w-[1px] bg-gradient-to-b from-white/20 to-transparent" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── How to Participate — Glass Cards ── */}
      <section className="relative z-10 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2"
            >
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-purple-500/50" />
              <span className="text-sm font-medium uppercase tracking-wider text-purple-400/70">
                {t("howToParticipate")}
              </span>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-purple-500/50" />
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="mt-4 text-2xl font-bold tracking-tight text-white/90 sm:text-4xl"
            >
              {t("howTitle")}
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-white/40">
              {t("howSubtitle")}
            </motion.p>
          </motion.div>

          {/* Steps flow line */}
          <div className="relative mt-14">
            {/* Connecting line (visible on lg) */}
            <div className="pointer-events-none absolute left-0 right-0 top-10 z-0 hidden h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block" />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {steps.map((step) => (
                <GlassStepCard key={step.num} {...step} />
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── User Cases Grid — Glowing Cards ── */}
      <section id="cases" className="relative z-10 px-4 py-20 sm:py-28">
        {/* Section background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2"
            >
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
              <span className="text-sm font-medium uppercase tracking-wider text-amber-400/70">
                {t("userCasesLabel")}
              </span>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="mt-4 text-2xl font-bold tracking-tight text-white/90 sm:text-4xl"
            >
              {t("userCasesTitle")}
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-white/40">
              {t("userCasesSubtitle")}
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
              {caseConfigs.map((config) => {
              const caseId = config.id as
                | "luxury-trade"
                | "content-marketing"
                | "indie-dev"
                | "saas-sales"
                | "dev-assistant"
                | "cybersecurity"
                | "supermom"
                | "content-creator"
                | "amazon-seller"
                | "investor-intelligence"
                | "pm-brain-trust"
                | "freelance-designer"
                | "legal-advisor"
                | "hr-recruiter"
                | "education-entrepreneur"
                | "healthcare-practitioner"
                | "podcaster-creator"
                | "real-estate-agent";
              const resolvedUrl =
                locale === "en" ? config.htmlUrlEn : config.htmlUrl;
              return (
                <GlowingCaseCard
                  key={config.id}
                  config={config}
                  resolvedUrl={resolvedUrl}
                  title={t(`cases.${caseId}.title`)}
                  subtitle={t(`cases.${caseId}.subtitle`)}
                  persona={t(`cases.${caseId}.persona`)}
                  personaTag={t(`cases.${caseId}.personaTag`)}
                  stats={[0, 1].map((i) => ({
                    value: t(`cases.${caseId}.stats.${i}.value` as Parameters<typeof t>[0]),
                    label: t(`cases.${caseId}.stats.${i}.label` as Parameters<typeof t>[0]),
                  }))}
                  highlights={[0, 1, 2].map((i) =>
                    t(`cases.${caseId}.highlights.${i}` as Parameters<typeof t>[0])
                  )}
                  viewGuideLabel={t("viewGuide")}
                />
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section — Glow Button ── */}
      <section className="relative z-10 px-4 py-20 sm:py-28">
        {/* Divider */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          {/* Animated glow orb */}
          <motion.div
            variants={fadeUp}
            className="relative mx-auto mb-8 h-20 w-20"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-xl"
            />
            <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl backdrop-blur-sm">
              🦞
            </div>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-2xl font-bold tracking-tight text-white/90 sm:text-4xl"
          >
            {t("ctaTitle")}{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              OpenClaw
            </span>{" "}
            {t("ctaTitle2")}
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-4 leading-relaxed text-white/40"
          >
            {t("ctaSubtitle")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i < 2 && <br />}
                </span>
              ))}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            {/* Primary CTA with pulse glow */}
            <div className="group relative">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 blur-lg transition-opacity group-hover:opacity-100"
              />
              <Button
                size="lg"
                className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                asChild
              >
                <a
                  href="https://openclaw.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("ctaVisitSite")}
                  <ExternalLink className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </div>

            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/5 text-white/70 backdrop-blur-sm hover:bg-white/10 hover:text-white"
              asChild
            >
              <a
                href="https://github.com/openclaw/openclaw"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("ctaGithub")}
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-8 text-xs text-white/20"
          >
            {t("ctaCommunity")}
          </motion.p>
        </motion.div>
      </section>

      {/* Shimmer animation keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

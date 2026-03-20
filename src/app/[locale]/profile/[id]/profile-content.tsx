"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Github,
  Calendar,
  Trophy,
  Code2,
  Pencil,
  Lock,
  Globe,
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Coins,
  Bot,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { difficultyConfig } from "@/lib/constants";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { XPProgress } from "@/components/gamification/xp-progress";
import { LevelBadge } from "@/components/gamification/level-badge";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { ContributionHeatmap } from "@/components/gamification/contribution-heatmap";
import { createApiKey, listApiKeys, deleteApiKey } from "@/actions/api-keys";
import { useCredits } from "@/components/billing/credits-provider";
import type { AchievementRarity } from "@prisma/client";
import type { Level } from "@/lib/xp";

type ApiKeyItem = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type User = {
  id: string;
  name: string | null;
  image: string | null;
  githubUrl: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    completions: number;
    projects: number;
    authoredChallenges: number;
  };
};

type PublishedChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyConfig;
  likesCount: number;
  category: { name: string } | null;
};

type StatsData = {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  levelInfo: Level;
};

type AchievementData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlockedAt: string | null;
};

type CompletionData = {
  id: string;
  reflection: string | null;
  isPublic: boolean;
  completedAt: string | null;
  challenge: {
    id: string;
    slug: string;
    title: string;
    difficulty: keyof typeof difficultyConfig;
    category: { name: string } | null;
  };
};

type UsageItem = {
  id: string;
  externalId: string | null;
  provider: string;
  model: string;
  status: string;
  inputTokens: string;
  outputTokens: string;
  cacheWriteTokens: string;
  cacheReadTokens: string;
  totalTokens: string;
  charged: {
    microcredits: string;
    credits: string;
  };
  pricingSnapshot: unknown;
  metadata: unknown;
  createdAt: string;
};

type UsageAggregationItem = {
  provider: string;
  model: string;
  requestCount: number;
  inputTokens: string;
  outputTokens: string;
  cacheWriteTokens: string;
  cacheReadTokens: string;
  totalTokens: string;
  charged: {
    microcredits: string;
    credits: string;
  };
};

export function ProfileContent({
  user,
  publishedChallenges,
  stats,
  achievements,
  heatmapData,
  completions,
}: {
  user: User;
  publishedChallenges: PublishedChallenge[];
  stats: StatsData;
  achievements: AchievementData[];
  heatmapData: Record<string, number>;
  completions: CompletionData[];
}) {
  const { data: session } = useSession();
  const isOwnProfile = session?.user?.id === user.id;
  const t = useTranslations("profile");

  // Filter reflections for non-own profiles
  const visibleCompletions = completions.map((c) => ({
    ...c,
    reflection: (isOwnProfile || c.isPublic) ? c.reflection : null,
  }));
  const tc = useTranslations("common");

  const displayName = user.name || t("aiBuilder");
  const joinYear = new Date(user.createdAt).getFullYear();

  const summaryStats = [
    { icon: Trophy, label: t("completed"), value: user._count.completions },
    { icon: Pencil, label: t("published"), value: user._count.authoredChallenges },
    { icon: Code2, label: t("projects"), value: user._count.projects },
  ];

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  return (
    <div>
      {/* Profile Header */}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
          <AvatarImage src={user.image || ""} alt={displayName} />
          <AvatarFallback className="text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {displayName}
            </h1>
            <LevelBadge levelInfo={stats.levelInfo} size="sm" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.bio || t("aiBuilder")}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("joined", { year: joinYear })}
            </span>
            {user.githubUrl && (
              <a
                href={user.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            )}
          </div>
        </div>
      </div>

      {/* XP & Streak */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/50 p-5">
          <XPProgress xp={stats.xp} levelInfo={stats.levelInfo} />
        </div>
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card/50 p-5">
          <StreakDisplay
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/60 bg-card/50 p-4 text-center"
          >
            <stat.icon className="mx-auto h-5 w-5 text-muted-foreground" />
            <div className="mt-2 text-2xl font-bold">{stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Contribution Heatmap */}
      <div className="mt-6 rounded-xl border border-border/60 bg-card/50 p-5">
        <ContributionHeatmap
          data={heatmapData}
          year={new Date().getFullYear()}
        />
      </div>

      <Separator className="my-8" />

      {/* Tabs */}
      <Tabs defaultValue="achievements">
        <TabsList>
          <TabsTrigger value="achievements">
            {t("achievementsTab", { unlocked: unlockedAchievements.length, total: achievements.length })}
          </TabsTrigger>
          <TabsTrigger value="completed">{t("completedTab")}</TabsTrigger>
          <TabsTrigger value="published">{t("publishedTab")}</TabsTrigger>
          <TabsTrigger value="projects">{t("projectsTab")}</TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="billing">
              <Coins className="mr-1.5 h-3.5 w-3.5" />
              Credits
            </TabsTrigger>
          )}
          {isOwnProfile && (
            <TabsTrigger value="api-keys">
              <Key className="mr-1.5 h-3.5 w-3.5" />
              API Keys
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="achievements" className="mt-6">
          {achievements.length > 0 ? (
            <div className="space-y-4">
              {unlockedAchievements.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {unlockedAchievements.map((a) => (
                    <AchievementCard key={a.id} {...a} />
                  ))}
                </div>
              )}
              {lockedAchievements.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground pt-2">
                    {t("locked")}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {lockedAchievements.map((a) => (
                      <AchievementCard key={a.id} {...a} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noAchievements")}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {visibleCompletions.length > 0 ? (
            <div className="space-y-3">
              {visibleCompletions.map((completion) => {
                const diff = difficultyConfig[completion.challenge.difficulty];
                return (
                  <div
                    key={completion.id}
                    className="rounded-lg border border-border/40 bg-card/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/learn/challenges/${completion.challenge.slug}`}
                        className="font-medium text-sm hover:text-primary transition-colors"
                      >
                        {completion.challenge.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        {completion.challenge.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {completion.challenge.category.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${diff.className}`}>
                          {diff.label}
                        </Badge>
                      </div>
                    </div>
                    {completion.completedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(completion.completedAt).toLocaleDateString()}
                      </p>
                    )}
                    {completion.reflection && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {completion.reflection}
                        </p>
                        {isOwnProfile && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {completion.isPublic ? (
                              <><Globe className="h-3 w-3" /> Public</>
                            ) : (
                              <><Lock className="h-3 w-3" /> Private</>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noCompletions")}
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/learn/challenges">{t("browseChallenges")}</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          {publishedChallenges.length > 0 ? (
            <div className="space-y-2">
              {publishedChallenges.map((challenge) => {
                const diff = difficultyConfig[challenge.difficulty];
                return (
                  <Link
                    key={challenge.id}
                    href={`/learn/challenges/${challenge.slug}`}
                    className="group flex items-center gap-4 rounded-lg border border-border/40 bg-card/30 px-4 py-3.5 transition-all hover:border-border hover:bg-card hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {challenge.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {challenge.description}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      {challenge.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {challenge.category.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${diff.className}`}>
                        {diff.label}
                      </Badge>
                    </div>
                    {challenge.likesCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {tc("likes", { count: challenge.likesCount })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noPublished")}
              </p>
              {isOwnProfile && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/learn/challenges/new">{t("createChallenge")}</Link>
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {user._count.projects === 0
                ? t("noProjects")
                : t("projectCount", { count: user._count.projects })}
            </p>
            {user._count.projects === 0 && (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/community?tab=showcase">{t("visitShowcase")}</Link>
              </Button>
            )}
          </div>
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="billing" className="mt-6">
            <BillingPanel />
          </TabsContent>
        )}

        {isOwnProfile && (
          <TabsContent value="api-keys" className="mt-6">
            <ApiKeysPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function BillingPanel() {
  const { balance, ledger, isLoading, error, refreshCredits } = useCredits();
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [aggregation, setAggregation] = useState<UsageAggregationItem[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError(null);

    try {
      const response = await fetch("/api/billing/usage", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            data?: {
              usage?: UsageItem[];
              aggregation?: UsageAggregationItem[];
            };
            error?: { message?: string };
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Failed to load usage history");
      }

      setUsage(payload?.data?.usage || []);
      setAggregation(payload?.data?.aggregation || []);
    } catch (fetchError) {
      setUsageError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load usage history"
      );
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Credits and AI usage</h3>
          <p className="text-sm text-muted-foreground">
            Review your prepaid balance, immutable ledger, and recent model usage charges.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refreshCredits();
            void fetchUsage();
          }}
          disabled={isLoading || usageLoading}
        >
          <Loader2
            className={`h-3.5 w-3.5 ${
              isLoading || usageLoading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {usageError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {usageError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {balance ? `${balance.balance.credits} credits` : "--"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime credited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {balance ? `${balance.lifetimeCredited.credits} credits` : "--"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime debited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {balance ? `${balance.lifetimeDebited.credits} credits` : "--"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle>Usage by provider and model</CardTitle>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : aggregation.length === 0 ? (
            <div className="rounded-lg border border-border/40 bg-card/30 p-6 text-sm text-muted-foreground">
              No usage aggregation yet. Your model spend summary will appear here after you use AI Studio.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {aggregation.map((item) => (
                <div
                  key={`${item.provider}-${item.model}`}
                  className="rounded-lg border border-border/40 bg-card/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {item.provider} / {item.model}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.requestCount} metered request
                        {item.requestCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.charged.credits}</p>
                      <p className="text-xs text-muted-foreground">credits spent</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>Total tokens: {item.totalTokens}</div>
                    <div>Input tokens: {item.inputTokens}</div>
                    <div>Output tokens: {item.outputTokens}</div>
                    <div>Cache write: {item.cacheWriteTokens}</div>
                    <div>Cache read: {item.cacheReadTokens}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle>Recent AI usage</CardTitle>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : usage.length === 0 ? (
              <div className="rounded-lg border border-border/40 bg-card/30 p-6 text-sm text-muted-foreground">
                No AI usage yet. Use AI Studio to create your first metered generation.
              </div>
            ) : (
              <div className="space-y-3">
                {usage.map((item) => {
                  const routeName =
                    typeof item.metadata === "object" &&
                    item.metadata &&
                    "routeName" in item.metadata
                      ? String(
                          (item.metadata as { routeName?: unknown }).routeName || ""
                        )
                      : null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/40 bg-card/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {item.provider} / {item.model}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                            {routeName ? ` · ${routeName}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">-{item.charged.credits}</p>
                          <p className="text-xs text-muted-foreground">credits</p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>Input tokens: {item.inputTokens}</div>
                        <div>Output tokens: {item.outputTokens}</div>
                        <div>Cache write: {item.cacheWriteTokens}</div>
                        <div>Cache read: {item.cacheReadTokens}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle>Recent credit ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !balance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !ledger.length ? (
              <div className="rounded-lg border border-border/40 bg-card/30 p-6 text-sm text-muted-foreground">
                No credit activity yet. Top up your balance or start a membership plan.
              </div>
            ) : (
              <div className="space-y-3">
                {ledger.map((entry) => {
                  const isPositive =
                    entry.type === "CREDIT" ||
                    entry.type === "REFUND" ||
                    entry.type === "ADJUSTMENT";

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border/40 bg-card/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {entry.description || entry.source.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              isPositive ? "text-emerald-600" : "text-foreground"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {entry.amount.credits}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance {entry.balanceAfter.credits}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/credits">Top up credits</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/membership">Membership</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const result = await listApiKeys();
      setKeys(result);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const result = await createApiKey(newKeyName.trim());
      setNewlyCreatedKey(result.key);
      setNewKeyName("");
      await fetchKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setDeleting(id);
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete API key");
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border/40 bg-card/30 p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Copy your API key now. It will not be shown again.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-sm break-all">
              {newlyCreatedKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(newlyCreatedKey)}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => setNewlyCreatedKey(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Create new key */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-4">
        <h3 className="text-sm font-medium">Generate New API Key</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          API keys allow AI agents (Claude Code, OpenClaw) to access the platform on your behalf.
          You can have up to 5 keys.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            placeholder="Key name (e.g. My Laptop)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="max-w-xs text-sm"
            disabled={creating || keys.length >= 5}
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating || keys.length >= 5}
          >
            {creating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Generate
          </Button>
        </div>
        {keys.length >= 5 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Maximum of 5 API keys reached. Delete an existing key to create a new one.
          </p>
        )}
      </div>

      {/* Key list */}
      {keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {apiKey.name}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Created {new Date(apiKey.createdAt).toLocaleDateString()}
                  </span>
                  {apiKey.lastUsedAt && (
                    <span>
                      Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(apiKey.id)}
                disabled={deleting === apiKey.id}
                className="text-muted-foreground hover:text-destructive"
              >
                {deleting === apiKey.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center">
          <Key className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No API keys yet. Generate one to get started.
          </p>
        </div>
      )}
    </div>
  );
}

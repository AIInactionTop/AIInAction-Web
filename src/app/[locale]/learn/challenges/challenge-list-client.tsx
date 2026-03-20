"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search, Plus, Shield, ChevronLeft, ChevronRight,
  SlidersHorizontal, X, Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "next-auth/react";
import { difficultyConfig } from "@/lib/constants";
import { useTranslations } from "next-intl";

type SerializedCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  isOfficial: boolean;
};

type SerializedChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyConfig;
  estimatedTime: string | null;
  isOfficial: boolean;
  likesCount: number;
  order: number;
  category: SerializedCategory | null;
  tags: { tag: { name: string } }[];
  author: { id: string; name: string | null; image: string | null } | null;
  _count?: { registrations: number };
};

type Filters = {
  categories: string[];
  difficulties: string[];
  search: string;
  tab: string[];
  sort: string;
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

const PAGE_SIZE = 30;

export function ChallengeListClient({
  challenges,
  categories,
  total,
  currentFilters,
  currentPage,
}: {
  challenges: SerializedChallenge[];
  categories: SerializedCategory[];
  total: number;
  currentFilters: Filters;
  currentPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const t = useTranslations("challenges");
  const tc = useTranslations("common");
  const td = useTranslations("difficulty");
  const tCat = useTranslations("categories");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sortOptions = [
    { key: "newest", label: t("sortNewest") },
    { key: "likes", label: t("sortLikes") },
    { key: "registrations", label: t("sortRegistrations") },
  ];

  const difficulties = [
    { key: "BEGINNER", label: td("BEGINNER") },
    { key: "INTERMEDIATE", label: td("INTERMEDIATE") },
    { key: "ADVANCED", label: td("ADVANCED") },
    { key: "EXPERT", label: td("EXPERT") },
  ];

  const typeOptions = [
    { key: "official", label: tc("official") },
    { key: "community", label: tc("community") },
  ];

  // Build URL params from current state with a toggle applied
  const buildParams = useCallback(
    (key: string, value: string, isMultiToggle: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (isMultiToggle) {
        const current = params.get(key)?.split(",").filter(Boolean) || [];
        const idx = current.indexOf(value);
        if (idx >= 0) {
          current.splice(idx, 1);
        } else {
          current.push(value);
        }
        if (current.length === 0) {
          params.delete(key);
        } else {
          params.set(key, current.join(","));
        }
      } else {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      params.delete("page");
      return params.toString();
    },
    [searchParams]
  );

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      router.push(`/challenges?${buildParams(key, value, true)}`);
    },
    [router, buildParams]
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      router.push(`/challenges?${buildParams(key, value, false)}`);
    },
    [router, buildParams]
  );

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      router.push(`/challenges?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const search = formData.get("search") as string;
      setFilter("search", search);
    },
    [setFilter]
  );

  const activeFilterCount =
    currentFilters.categories.length +
    currentFilters.difficulties.length +
    currentFilters.tab.length;

  const from = (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  const filterSidebar = (
    <div className="space-y-6">
      {/* Type filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t("filterType")}</h3>
        <div className="space-y-2">
          {typeOptions.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={currentFilters.tab.includes(opt.key)}
                onCheckedChange={() => toggleFilter("tab", opt.key)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t("filterCategory")}</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label
              key={cat.slug}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={currentFilters.categories.includes(cat.slug)}
                onCheckedChange={() => toggleFilter("categories", cat.slug)}
              />
              <span>
                {tCat.has(`${cat.slug}.name`)
                  ? tCat(`${cat.slug}.name`)
                  : cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Difficulty filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t("filterDifficulty")}</h3>
        <div className="space-y-2">
          {difficulties.map((d) => (
            <label
              key={d.key}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={currentFilters.difficulties.includes(d.key)}
                onCheckedChange={() => toggleFilter("difficulties", d.key)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("tab");
            params.delete("categories");
            params.delete("difficulties");
            params.delete("page");
            router.push(`/challenges?${params.toString()}`);
            setMobileFiltersOpen(false);
          }}
        >
          <X className="h-3.5 w-3.5" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {session && (
          <Button asChild className="gap-2 shrink-0">
            <Link href="/learn/challenges/new">
              <Plus className="h-4 w-4" />
              {tc("create")}
            </Link>
          </Button>
        )}
      </div>

      {/* Main layout: sidebar + content */}
      <div className="mt-8 flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("filters")}
            </h2>
            {filterSidebar}
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Search + Sort + Mobile filter toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder={t("searchPlaceholder")}
                defaultValue={currentFilters.search}
                className="pl-9"
              />
            </form>

            <div className="flex items-center gap-2">
              {/* Sort buttons */}
              <div className="flex items-center gap-1 rounded-lg border p-0.5">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFilter("sort", opt.key === "newest" ? "" : opt.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      currentFilters.sort === opt.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Mobile filter toggle */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("filters")}
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>{t("filters")}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">{filterSidebar}</div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {currentFilters.tab.map((tab) => (
                <Badge
                  key={tab}
                  variant="secondary"
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => toggleFilter("tab", tab)}
                >
                  {tab === "official" ? tc("official") : tc("community")}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {currentFilters.categories.map((cat) => {
                const catObj = categories.find((c) => c.slug === cat);
                const label = catObj
                  ? tCat.has(`${catObj.slug}.name`)
                    ? tCat(`${catObj.slug}.name`)
                    : catObj.name
                  : cat;
                return (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="cursor-pointer gap-1 text-xs"
                    onClick={() => toggleFilter("categories", cat)}
                  >
                    {label}
                    <X className="h-3 w-3" />
                  </Badge>
                );
              })}
              {currentFilters.difficulties.map((d) => (
                <Badge
                  key={d}
                  variant="secondary"
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => toggleFilter("difficulties", d)}
                >
                  {td.has(d) ? td(d) : d}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            {total > 0
              ? t("showingRange", { from, to, total })
              : null}
          </div>

          {/* Challenge grid */}
          <motion.div
            key={`${currentFilters.categories.join(",")}-${currentFilters.difficulties.join(",")}-${currentFilters.tab.join(",")}-${currentFilters.search}-${currentFilters.sort}-${currentPage}`}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.slug} challenge={challenge} />
            ))}
          </motion.div>

          {challenges.length === 0 && (
            <div className="mt-16 text-center">
              <p className="text-lg font-medium">{t("noResults")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("noResultsHint")}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {tc("prev")}
              </Button>
              <div className="flex items-center gap-1">
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dot-${i}`} className="px-2 text-sm text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(p as number)}
                      className="min-w-9"
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="gap-1"
              >
                {tc("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

function ChallengeCard({ challenge }: { challenge: SerializedChallenge }) {
  const diff = difficultyConfig[challenge.difficulty];
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");
  const td = useTranslations("difficulty");

  const cardTitle = challenge.title;
  const cardDesc = challenge.description;
  const catName = challenge.category && tCat.has(`${challenge.category.slug}.name`)
    ? tCat(`${challenge.category.slug}.name`) : challenge.category?.name;
  const diffLabel = td.has(challenge.difficulty) ? td(challenge.difficulty) : diff.label;
  const regCount = challenge._count?.registrations || 0;

  return (
    <motion.div variants={fadeUp}>
      <Link href={`/learn/challenges/${challenge.slug}`} className="group block">
        <div className="h-full rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {challenge.isOfficial ? (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Shield className="h-3 w-3" />
                  {tc("official")}
                </Badge>
              ) : challenge.author ? (
                <div className="flex items-center gap-1.5">
                  {challenge.author.image && (
                    <Image
                      src={challenge.author.image}
                      alt={challenge.author.name || ""}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {challenge.author.name}
                  </span>
                </div>
              ) : null}
            </div>
            <Badge variant="outline" className={`text-[10px] ${diff.className}`}>
              {diffLabel}
            </Badge>
          </div>
          <h3 className="mt-3 font-semibold leading-snug group-hover:text-primary transition-colors">
            {cardTitle}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {cardDesc}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {challenge.category && (
              <Badge variant="secondary" className="text-[10px]">
                {catName}
              </Badge>
            )}
            {challenge.estimatedTime && (
              <span className="text-xs text-muted-foreground">
                {challenge.estimatedTime}
              </span>
            )}
            {challenge.likesCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {tc("likes", { count: challenge.likesCount })}
              </span>
            )}
            {regCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {regCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

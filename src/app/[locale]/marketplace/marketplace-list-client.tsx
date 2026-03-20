"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search, Plus, ChevronLeft, ChevronRight, Star,
  SlidersHorizontal, X, ShoppingBag, Package, Wrench, FileCode, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

type SerializedItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  status: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  tags: string[];
  features: string[];
  viewsCount: number;
  salesCount: number;
  avgRating: number;
  reviewsCount: number;
  createdAt: string;
  seller: { id: string; name: string | null; image: string | null };
};

type Filters = {
  types: string[];
  search: string;
  sort: string;
  tag: string;
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

const PAGE_SIZE = 24;

const typeConfig: Record<string, { icon: typeof ShoppingBag; color: string }> = {
  SKILL: { icon: Sparkles, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  TEMPLATE: { icon: FileCode, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  PRODUCT: { icon: Package, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  SERVICE: { icon: Wrench, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
};

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export function MarketplaceListClient({
  items,
  total,
  stats,
  currentFilters,
  currentPage,
}: {
  items: SerializedItem[];
  total: number;
  stats: { totalItems: number; totalSellers: number; totalSales: number };
  currentFilters: Filters;
  currentPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const t = useTranslations("marketplace");
  const tc = useTranslations("common");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const typeOptions = [
    { key: "SKILL", label: t("typeSkill") },
    { key: "TEMPLATE", label: t("typeTemplate") },
    { key: "PRODUCT", label: t("typeProduct") },
    { key: "SERVICE", label: t("typeService") },
  ];

  const sortOptions = [
    { key: "newest", label: t("sortNewest") },
    { key: "rating", label: t("sortRating") },
    { key: "sales", label: t("sortSales") },
    { key: "price_asc", label: t("sortPriceAsc") },
    { key: "price_desc", label: t("sortPriceDesc") },
  ];

  const buildParams = useCallback(
    (key: string, value: string, isMultiToggle: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isMultiToggle) {
        const current = params.get(key)?.split(",").filter(Boolean) || [];
        const idx = current.indexOf(value);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(value);
        if (current.length === 0) params.delete(key);
        else params.set(key, current.join(","));
      } else {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      return params.toString();
    },
    [searchParams]
  );

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      router.push(`/marketplace?${buildParams(key, value, true)}`);
    },
    [router, buildParams]
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      router.push(`/marketplace?${buildParams(key, value, false)}`);
    },
    [router, buildParams]
  );

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) params.delete("page");
      else params.set("page", String(page));
      router.push(`/marketplace?${params.toString()}`);
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

  const activeFilterCount = currentFilters.types.length + (currentFilters.tag ? 1 : 0);
  const from = (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  const filterSidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t("filterType")}</h3>
        <div className="space-y-2">
          {typeOptions.map((opt) => (
            <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={currentFilters.types.includes(opt.key)}
                onCheckedChange={() => toggleFilter("types", opt.key)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("types");
            params.delete("tag");
            params.delete("page");
            router.push(`/marketplace?${params.toString()}`);
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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        {session && (
          <Button asChild className="gap-2 shrink-0">
            <Link href="/marketplace/new">
              <Plus className="h-4 w-4" />
              {t("publish")}
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 flex flex-wrap gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag className="h-4 w-4" />
          <span>{t("statsItems", { count: stats.totalItems })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4" />
          <span>{t("statsSellers", { count: stats.totalSellers })}</span>
        </div>
      </div>

      {/* Main layout */}
      <div className="mt-8 flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("filters")}
            </h2>
            {filterSidebar}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
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
              {currentFilters.types.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => toggleFilter("types", type)}
                >
                  {typeOptions.find((o) => o.key === type)?.label || type}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {currentFilters.tag && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => setFilter("tag", "")}
                >
                  {currentFilters.tag}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            {total > 0 ? t("showingRange", { from, to, total }) : null}
          </div>

          {/* Item grid */}
          <motion.div
            key={`${currentFilters.types.join(",")}-${currentFilters.search}-${currentFilters.sort}-${currentPage}`}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {items.map((item) => (
              <MarketplaceCard key={item.slug} item={item} />
            ))}
          </motion.div>

          {items.length === 0 && (
            <div className="mt-16 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-medium">{t("noResults")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("noResultsHint")}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                {tc("prev")}
              </Button>
              <div className="flex items-center gap-1">
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dot-${i}`} className="px-2 text-sm text-muted-foreground">...</span>
                  ) : (
                    <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => goToPage(p as number)} className="min-w-9">
                      {p}
                    </Button>
                  )
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} className="gap-1">
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

function MarketplaceCard({ item }: { item: SerializedItem }) {
  const t = useTranslations("marketplace");
  const cfg = typeConfig[item.type] || typeConfig.PRODUCT;
  const TypeIcon = cfg.icon;

  return (
    <motion.div variants={fadeUp}>
      <Link href={`/marketplace/${item.slug}`} className="group block">
        <div className="h-full rounded-xl border border-border/60 bg-card/50 overflow-hidden transition-all hover:border-border hover:bg-card hover:shadow-lg">
          {item.imageUrl && (
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                <TypeIcon className="h-3 w-3" />
                {t(`type${item.type.charAt(0)}${item.type.slice(1).toLowerCase()}`)}
              </Badge>
              <span className="text-sm font-bold text-primary">
                {formatPrice(item.price, item.currency)}
              </span>
            </div>
            <h3 className="mt-3 font-semibold leading-snug group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {item.seller.image && (
                  <Image
                    src={item.seller.image}
                    alt={item.seller.name || ""}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span className="text-xs text-muted-foreground">{item.seller.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {item.avgRating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {item.avgRating.toFixed(1)}
                  </span>
                )}
                {item.salesCount > 0 && (
                  <span>{t("salesCount", { count: item.salesCount })}</span>
                )}
              </div>
            </div>
            {item.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="secondary" className="text-[10px]">+{item.tags.length - 3}</Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

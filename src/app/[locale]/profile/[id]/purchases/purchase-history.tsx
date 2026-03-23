"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ShoppingBag, Package, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

type Purchase = {
  id: string;
  price: number;
  currency: string;
  createdAt: string;
  item: {
    title: string;
    slug: string;
    imageUrl: string | null;
    type: string;
  };
};

type Stats = {
  totals: { currency: string; amount: number; count: number }[];
  totalCount: number;
  lastPurchaseDate: string | null;
};

const typeColors: Record<string, string> = {
  SKILL: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  TEMPLATE: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PRODUCT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  SERVICE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function formatPrice(price: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export function PurchaseHistory({
  purchases,
  page,
  totalPages,
  stats,
}: {
  purchases: Purchase[];
  page: number;
  totalPages: number;
  stats: Stats;
}) {
  const t = useTranslations("purchases");
  const tc = useTranslations("common");
  const tm = useTranslations("marketplace");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  if (stats.totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground mb-6">{t("empty")}</p>
        <Button asChild>
          <Link href="/marketplace">{t("browseMarketplace")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("totalSpent")}</p>
          <div className="mt-1 space-y-0.5">
            {stats.totals.map((g) => (
              <p key={g.currency} className="text-2xl font-bold">
                {formatPrice(g.amount, g.currency, locale)}
              </p>
            ))}
            {stats.totals.length === 0 && (
              <p className="text-2xl font-bold">$0</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("totalCount")}</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalCount}</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("lastPurchase")}</p>
          <p className="mt-1 text-2xl font-bold">
            {stats.lastPurchaseDate
              ? new Date(stats.lastPurchaseDate).toLocaleDateString(locale)
              : t("noPurchases")}
          </p>
        </div>
      </div>

      {/* Purchase list */}
      <div className="space-y-3">
        {purchases.map((purchase) => (
          <Link
            key={purchase.id}
            href={`/marketplace/${purchase.item.slug}` as never}
            className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-accent/50"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {purchase.item.imageUrl ? (
                <Image
                  src={purchase.item.imageUrl}
                  alt={purchase.item.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{purchase.item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${typeColors[purchase.item.type] || ""}`}>
                  {tm(`type${purchase.item.type.charAt(0)}${purchase.item.type.slice(1).toLowerCase()}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(purchase.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold">{formatPrice(purchase.price, purchase.currency, locale)}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tc("prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("page", { current: page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            {tc("next")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

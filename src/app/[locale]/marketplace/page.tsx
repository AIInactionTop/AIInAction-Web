import type { Metadata } from "next";
import { getMarketplaceItems, getMarketplaceStats } from "@/lib/marketplace";
import type { MarketplaceItemType } from "@prisma/client";
import { MarketplaceListClient } from "./marketplace-list-client";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    types?: string;
    search?: string;
    sort?: string;
    page?: string;
    tag?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function MarketplacePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const types = (sp.types?.split(",").filter(Boolean) || []) as MarketplaceItemType[];
  const sortBy = (sp.sort as "newest" | "price_asc" | "price_desc" | "rating" | "sales") || "newest";

  const { items, total } = await getMarketplaceItems({
    types,
    search: sp.search,
    tag: sp.tag,
    sortBy,
    page: sp.page ? parseInt(sp.page) : 1,
  });

  const stats = await getMarketplaceStats();

  return (
    <MarketplaceListClient
      items={JSON.parse(JSON.stringify(items))}
      total={total}
      stats={stats}
      currentFilters={{
        types: types as string[],
        search: sp.search || "",
        sort: sortBy,
        tag: sp.tag || "",
      }}
      currentPage={sp.page ? parseInt(sp.page) : 1}
    />
  );
}

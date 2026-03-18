import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMarketplaceItemBySlug } from "@/lib/marketplace";
import { auth } from "@/lib/auth";
import { MarketplaceItemDetail } from "./marketplace-item-detail";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const item = await getMarketplaceItemBySlug(slug);
  if (!item) return { title: "Not Found" };
  return {
    title: `${item.title} - Marketplace`,
    description: item.description,
  };
}

export default async function MarketplaceItemPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const item = await getMarketplaceItemBySlug(slug, session?.user?.id);
  if (!item) notFound();

  return (
    <MarketplaceItemDetail
      item={JSON.parse(JSON.stringify(item))}
      currentUserId={session?.user?.id || null}
    />
  );
}

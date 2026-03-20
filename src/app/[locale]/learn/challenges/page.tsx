import type { Metadata } from "next";
import { getChallenges, getCategories } from "@/lib/challenges";
import type { Difficulty } from "@prisma/client";
import { ChallengeListClient } from "./challenge-list-client";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    categories?: string;
    difficulties?: string;
    search?: string;
    tab?: string;
    sort?: string;
    page?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("challengesTitle"),
    description: t("challengesDescription"),
  };
}

export default async function ChallengesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const categories = await getCategories();

  // Parse multi-select filters from comma-separated params
  const categorySlugs = sp.categories?.split(",").filter(Boolean) || [];
  const difficulties = sp.difficulties?.split(",").filter(Boolean) as Difficulty[] || [];

  // Parse type filter (official/community) - supports multi-select
  const tabValues = sp.tab?.split(",").filter(Boolean) || [];
  let official: boolean | undefined;
  if (tabValues.length === 1) {
    official = tabValues[0] === "official" ? true : tabValues[0] === "community" ? false : undefined;
  }
  // If both or neither are selected, show all

  const sortBy = (sp.sort as "newest" | "likes" | "registrations") || "newest";

  const { challenges, total } = await getChallenges({
    categorySlugs,
    difficulties,
    search: sp.search,
    official,
    sortBy,
    page: sp.page ? parseInt(sp.page) : 1,
  }, locale);

  return (
    <ChallengeListClient
      challenges={JSON.parse(JSON.stringify(challenges))}
      categories={JSON.parse(JSON.stringify(categories))}
      total={total}
      currentFilters={{
        categories: categorySlugs,
        difficulties: sp.difficulties?.split(",").filter(Boolean) || [],
        search: sp.search || "",
        tab: tabValues,
        sort: sortBy,
      }}
      currentPage={sp.page ? parseInt(sp.page) : 1}
    />
  );
}

import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getMarketplaceItemBySlug } from "@/lib/marketplace";
import { MarketplaceForm } from "@/components/marketplace-form";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketplaceForm" });
  return {
    title: t("editTitle"),
    description: t("editSubtitle"),
  };
}

export default async function EditMarketplaceItemPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const item = await getMarketplaceItemBySlug(slug, session.user.id);
  if (!item) notFound();
  if (item.seller.id !== session.user.id) redirect(`/marketplace/${slug}`);

  const t = await getTranslations("marketplaceForm");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("editTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("editSubtitle")}</p>
      <div className="mt-8">
        <MarketplaceForm
          itemId={item.id}
          defaultValues={{
            title: item.title,
            description: item.description,
            longDescription: item.longDescription,
            type: item.type,
            price: item.price,
            currency: item.currency,
            imageUrl: item.imageUrl,
            demoUrl: item.demoUrl,
            sourceUrl: item.sourceUrl,
            tags: item.tags,
            features: item.features,
          }}
        />
      </div>
    </div>
  );
}

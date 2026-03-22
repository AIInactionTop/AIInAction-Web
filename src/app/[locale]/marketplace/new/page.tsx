import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarketplaceForm } from "@/components/marketplace-form";
import { ConnectBanner } from "@/components/marketplace/connect-banner";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketplaceForm" });
  return {
    title: t("createTitle"),
    description: t("createSubtitle"),
  };
}

export default async function NewMarketplaceItemPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("marketplaceForm");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });
  const hasConnect = !!dbUser?.stripeConnectAccountId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("createTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("createSubtitle")}</p>
      <div className="mt-8">
        {!hasConnect && <ConnectBanner />}
        <MarketplaceForm />
      </div>
    </div>
  );
}

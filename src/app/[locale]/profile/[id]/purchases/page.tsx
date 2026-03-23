import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getUserPurchases, getUserPurchaseStats } from "@/lib/marketplace";
import { PurchaseHistory } from "./purchase-history";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "purchases" });
  return { title: t("title") };
}

export default async function PurchasesPage({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const { page } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id || session.user.id !== id) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const [purchaseData, stats] = await Promise.all([
    getUserPurchases(id, currentPage),
    getUserPurchaseStats(id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <PurchaseHistory
        purchases={JSON.parse(JSON.stringify(purchaseData.purchases))}
        total={purchaseData.total}
        page={purchaseData.page}
        totalPages={purchaseData.totalPages}
        stats={JSON.parse(JSON.stringify(stats))}
      />
    </div>
  );
}

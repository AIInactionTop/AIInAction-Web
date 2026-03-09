import { setRequestLocale } from "next-intl/server";
import { listCreditProducts } from "@/lib/billing/service";
import { CreditsPageClient } from "@/components/billing/billing-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CreditsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const products = await listCreditProducts({
    activeOnly: true,
    type: "TOP_UP",
  });

  return <CreditsPageClient products={products} />;
}

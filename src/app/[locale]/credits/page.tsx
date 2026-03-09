import { setRequestLocale } from "next-intl/server";
import { listAiModelPricing, listCreditProducts } from "@/lib/billing/service";
import { CreditsPageClient } from "@/components/billing/billing-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CreditsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [products, pricing] = await Promise.all([
    listCreditProducts({
      activeOnly: true,
      type: "TOP_UP",
    }),
    listAiModelPricing(true),
  ]);

  return <CreditsPageClient products={products} pricing={pricing} />;
}

import { setRequestLocale } from "next-intl/server";
import { listAiModelPricing, listCreditProducts } from "@/lib/billing/service";
import { MembershipPageClient } from "@/components/billing/billing-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MembershipPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [products, pricing] = await Promise.all([
    listCreditProducts({
      activeOnly: true,
      type: "MEMBERSHIP",
    }),
    listAiModelPricing(true),
  ]);

  return <MembershipPageClient products={products} pricing={pricing} />;
}

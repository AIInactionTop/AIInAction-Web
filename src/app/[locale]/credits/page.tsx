import { setRequestLocale } from "next-intl/server";
import { listAiModelPricing } from "@/lib/billing/service";
import { CreditsPageClient } from "@/components/billing/billing-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CreditsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const pricing = await listAiModelPricing(true);

  return <CreditsPageClient pricing={pricing} />;
}

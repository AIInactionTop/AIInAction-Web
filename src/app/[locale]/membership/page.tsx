import { setRequestLocale } from "next-intl/server";
import { listCreditProducts } from "@/lib/billing/service";
import { MembershipPageClient } from "@/components/billing/billing-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MembershipPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const products = await listCreditProducts({
    activeOnly: true,
    type: "MEMBERSHIP",
  });

  return <MembershipPageClient products={products} />;
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getOrganizationBySlug, getReports } from "@/lib/enterprise";
import { ROICalculatorClient } from "@/components/enterprise/roi-calculator-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("roi"),
  };
}

export default async function ROIPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const reports = await getReports(org.id);

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <ROICalculatorClient
      orgSlug={slug}
      reports={serialize(reports)}
    />
  );
}

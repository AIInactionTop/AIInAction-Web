import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getOrganizationBySlug, getProgressRecords } from "@/lib/enterprise";
import { ProgressDashboardClient } from "@/components/enterprise/progress-dashboard-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("progress"),
  };
}

export default async function ProgressPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const records = await getProgressRecords(org.id);

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <ProgressDashboardClient
      orgSlug={slug}
      records={serialize(records)}
    />
  );
}

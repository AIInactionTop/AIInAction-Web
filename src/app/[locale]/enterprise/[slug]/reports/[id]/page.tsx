import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReportById } from "@/lib/enterprise";
import { ReportDetailClient } from "@/components/enterprise/report-detail-client";

type Props = {
  params: Promise<{ locale: string; slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("reports"),
  };
}

export default async function ReportDetailPage({ params }: Props) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);

  const report = await getReportById(id);
  if (!report) notFound();

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <ReportDetailClient
      orgSlug={slug}
      report={serialize(report)}
    />
  );
}

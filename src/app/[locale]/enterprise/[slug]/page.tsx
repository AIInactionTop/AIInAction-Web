import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  getOrganizationBySlug,
  getSurveys,
  getReports,
  getProgressRecords,
} from "@/lib/enterprise";
import { DashboardClient } from "@/components/enterprise/dashboard-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("dashboard"),
  };
}

export default async function OrgDashboardPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const [surveysData, reports, progressRecords] = await Promise.all([
    getSurveys(org.id, { page: 1, pageSize: 5 }),
    getReports(org.id),
    getProgressRecords(org.id),
  ]);

  const latestReport = reports[0] ?? null;
  const latestProgress = progressRecords[progressRecords.length - 1] ?? null;
  const previousProgress =
    progressRecords.length >= 2
      ? progressRecords[progressRecords.length - 2]
      : null;

  // Compute response rate for latest active survey
  const activeSurvey = surveysData.surveys.find((s) => s.status === "ACTIVE");
  const responseRate =
    activeSurvey && org._count.members > 0
      ? Math.round(
          (activeSurvey._count.responses / org._count.members) * 100,
        )
      : null;

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <DashboardClient
      memberCount={org._count.members}
      responseRate={responseRate}
      latestReport={serialize(latestReport)}
      latestProgress={serialize(latestProgress)}
      previousProgress={serialize(previousProgress)}
      surveys={serialize(surveysData.surveys)}
    />
  );
}

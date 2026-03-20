import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationMember,
  getSurveys,
} from "@/lib/enterprise";
import { SurveysListClient } from "@/components/enterprise/surveys-list-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("surveys"),
  };
}

export default async function SurveysPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const currentMember = await getOrganizationMember(org.id, session.user.id);
  if (!currentMember) return null;

  const sp = await searchParams;
  const status = sp.status as "DRAFT" | "ACTIVE" | "CLOSED" | undefined;
  const page = sp.page ? parseInt(sp.page, 10) : 1;

  const surveysData = await getSurveys(org.id, { status, page, pageSize: 20 });

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <SurveysListClient
      orgSlug={slug}
      surveys={serialize(surveysData.surveys)}
      total={surveysData.total}
      page={surveysData.page}
      pageSize={surveysData.pageSize}
      currentStatus={status ?? null}
      currentUserRole={currentMember.role}
      locale={locale}
    />
  );
}

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationMember,
  getSurveyBySlug,
  getSurveyResponses,
  getSurveyInviteTokens,
} from "@/lib/enterprise";
import { SurveyDetailClient } from "@/components/enterprise/survey-detail-client";

type Props = {
  params: Promise<{ locale: string; slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const survey = await getSurveyBySlug(id);
  if (!survey) {
    const t = await getTranslations({ locale, namespace: "enterprise" });
    return { title: t("surveyNotFound") };
  }
  return { title: survey.title };
}

export default async function SurveyDetailPage({ params }: Props) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const currentMember = await getOrganizationMember(org.id, session.user.id);
  if (!currentMember) return null;

  const survey = await getSurveyBySlug(id);
  if (!survey || survey.organizationId !== org.id) notFound();

  const responses = await getSurveyResponses(survey.id);
  const inviteTokens = await getSurveyInviteTokens(survey.id);

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <SurveyDetailClient
      orgSlug={slug}
      survey={serialize(survey)}
      responses={serialize(responses)}
      memberCount={org._count.members}
      currentUserRole={currentMember.role}
      locale={locale}
      inviteTokens={serialize(inviteTokens)}
    />
  );
}

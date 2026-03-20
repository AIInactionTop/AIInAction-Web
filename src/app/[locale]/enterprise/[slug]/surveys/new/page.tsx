import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrganizationBySlug, getOrganizationMember } from "@/lib/enterprise";
import { SurveyForm } from "@/components/enterprise/survey-form";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("createSurvey"),
  };
}

export default async function NewSurveyPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const member = await getOrganizationMember(org.id, session.user.id);
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{(await getTranslations({ locale, namespace: "enterprise" }))("createSurvey")}</h1>
      </div>
      <SurveyForm orgSlug={slug} locale={locale} />
    </div>
  );
}

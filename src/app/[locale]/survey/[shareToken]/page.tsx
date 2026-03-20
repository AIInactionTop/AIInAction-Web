import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getSurveyByShareToken } from "@/lib/enterprise";
import { standardModules } from "@/data/survey-modules";
import { SurveyFillClient } from "@/components/enterprise/survey-fill-client";

type Props = {
  params: Promise<{ locale: string; shareToken: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  const survey = await getSurveyByShareToken(shareToken);
  return {
    title: survey?.title ?? "Survey",
  };
}

export default async function SurveyFillPage({ params }: Props) {
  const { locale, shareToken } = await params;
  setRequestLocale(locale);

  const survey = await getSurveyByShareToken(shareToken);
  if (!survey || survey.status !== "ACTIVE") notFound();

  // Get enabled standard modules
  const enabledModuleIds = survey.standardModules as string[];
  const enabledModules = standardModules.filter((m) =>
    enabledModuleIds.includes(m.id),
  );

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SurveyFillClient
        surveyId={survey.id}
        surveyTitle={survey.title}
        surveyDescription={survey.description}
        orgName={survey.organization.name}
        orgLogo={survey.organization.logo}
        modules={serialize(enabledModules)}
        customQuestions={serialize(survey.customQuestions)}
        locale={locale}
      />
    </div>
  );
}

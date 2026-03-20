import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getSurveyByShareToken, getSurveyInviteTokenByToken } from "@/lib/enterprise";
import { standardModules as defaultModules } from "@/data/survey-modules";
import type { StandardModule } from "@/data/survey-modules";
import { SurveyFillClient } from "@/components/enterprise/survey-fill-client";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; shareToken: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  const survey = await getSurveyByShareToken(shareToken);
  return {
    title: survey?.title ?? "Survey",
  };
}

export default async function SurveyFillPage({ params, searchParams }: Props) {
  const { locale, shareToken } = await params;
  const { t: inviteTokenParam } = await searchParams;
  setRequestLocale(locale);

  const survey = await getSurveyByShareToken(shareToken);
  if (!survey || survey.status !== "ACTIVE") notFound();

  // If invite token is provided, validate it
  let inviteToken: string | undefined;
  if (inviteTokenParam) {
    const tokenRecord = await getSurveyInviteTokenByToken(inviteTokenParam);
    if (!tokenRecord || tokenRecord.surveyId !== survey.id || tokenRecord.usedAt) {
      const t = await getTranslations({ locale, namespace: "enterprise" });
      return (
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-6 py-16">
              <XCircle className="h-16 w-16 text-destructive" />
              <h2 className="text-2xl font-bold">{t("invalidToken")}</h2>
            </CardContent>
          </Card>
        </div>
      );
    }
    inviteToken = inviteTokenParam;
  }

  // Get enabled standard modules.
  // New format: standardModules stores full module definitions.
  // Legacy format: standardModules stores an array of module ID strings.
  const rawModules = survey.standardModules as unknown;
  let enabledModules: StandardModule[];
  if (
    Array.isArray(rawModules) &&
    rawModules.length > 0 &&
    typeof rawModules[0] === "string"
  ) {
    // Legacy: array of IDs — look up from defaults
    enabledModules = (rawModules as string[])
      .map((id) => defaultModules.find((m) => m.id === id))
      .filter((m): m is StandardModule => !!m);
  } else {
    // New format: full module definitions
    enabledModules = (rawModules as StandardModule[]) || [];
  }

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
        inviteToken={inviteToken}
      />
    </div>
  );
}

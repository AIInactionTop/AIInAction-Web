import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChallengeBySlug } from "@/lib/challenges";
import { SubmitProjectForm } from "../submit-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ challenge?: string }>;
};

export default async function SubmitProjectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("showcase");

  let challengeSlug: string | undefined;
  let challengeName: string | undefined;

  if (sp.challenge) {
    const challenge = await getChallengeBySlug(sp.challenge, locale);
    if (challenge) {
      challengeSlug = challenge.slug;
      challengeName = challenge.title;
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href="/community?tab=showcase"
        className="mb-8 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToShowcase")}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t("sharePageTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("sharePageSubtitle")}
      </p>
      <div className="mt-8">
        <SubmitProjectForm challengeSlug={challengeSlug} challengeName={challengeName} />
      </div>
    </div>
  );
}

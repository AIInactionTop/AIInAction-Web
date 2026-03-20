import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getChallengeBySlug, getCategories } from "@/lib/challenges";
import { ChallengeForm } from "@/components/challenge-form";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "challengeForm" });
  return {
    title: t("editTitle"),
  };
}

export default async function EditChallengePage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  if (challenge.authorId !== session.user.id) {
    redirect(`/challenges/${slug}`);
  }

  const categories = await getCategories();
  const t = await getTranslations("challengeForm");

  const defaultValues = {
    title: challenge.title,
    description: challenge.description,
    difficulty: challenge.difficulty,
    categoryId: challenge.categoryId,
    tags: challenge.tags.map((ct) => ct.tag.name),
    objectives: challenge.objectives,
    hints: challenge.hints,
    resources: challenge.resources,
    estimatedTime: challenge.estimatedTime,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("editTitle")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("editSubtitle")}
      </p>
      <div className="mt-8">
        <ChallengeForm
          categories={JSON.parse(JSON.stringify(categories))}
          defaultValues={defaultValues}
          challengeId={challenge.id}
        />
      </div>
    </div>
  );
}

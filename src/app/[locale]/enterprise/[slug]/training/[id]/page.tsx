import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrainingPlanById } from "@/lib/enterprise";
import { TrainingDetailClient } from "@/components/enterprise/training-detail-client";

type Props = {
  params: Promise<{ locale: string; slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("trainingPlan"),
  };
}

export default async function TrainingDetailPage({ params }: Props) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);

  const plan = await getTrainingPlanById(id);
  if (!plan) notFound();

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <TrainingDetailClient
      orgSlug={slug}
      plan={serialize(plan)}
    />
  );
}

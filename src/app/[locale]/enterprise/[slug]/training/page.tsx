import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getOrganizationBySlug, getTrainingPlans } from "@/lib/enterprise";
import { TrainingListClient } from "@/components/enterprise/training-list-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("training"),
  };
}

export default async function TrainingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const plans = await getTrainingPlans(org.id);

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <TrainingListClient
      orgSlug={slug}
      plans={serialize(plans)}
    />
  );
}

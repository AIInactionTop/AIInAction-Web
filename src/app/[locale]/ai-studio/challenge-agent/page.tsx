import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCategories } from "@/lib/challenges";
import { AIStudioClient } from "../components/ai-studio-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ChallengeAgentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const categories = await getCategories();

  return <AIStudioClient categories={categories} locale={locale} />;
}

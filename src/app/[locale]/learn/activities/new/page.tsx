import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/activities";
import { ActivityForm } from "@/components/activity-form";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "activityForm" });
  return {
    title: t("createTitle"),
    description: t("createSubtitle"),
  };
}

export default async function NewActivityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.id)) redirect("/learn/activities");

  const t = await getTranslations("activityForm");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("createTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("createSubtitle")}</p>
      <div className="mt-8">
        <ActivityForm />
      </div>
    </div>
  );
}

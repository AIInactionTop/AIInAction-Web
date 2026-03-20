import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getActivityBySlug, isAdmin } from "@/lib/activities";
import { ActivityForm } from "@/components/activity-form";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "activityForm" });
  return {
    title: t("editTitle"),
    description: t("editSubtitle"),
  };
}

export default async function EditActivityPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  const isAuthor = session.user.id === activity.authorId;
  if (!isAuthor && !isAdmin(session.user.id)) {
    redirect("/learn/activities");
  }

  const t = await getTranslations("activityForm");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("editTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("editSubtitle")}</p>
      <div className="mt-8">
        <ActivityForm
          activityId={activity.id}
          defaultValues={{
            title: activity.title,
            description: activity.description,
            type: activity.type,
            status: activity.status,
            content: activity.content,
            externalUrl: activity.externalUrl,
            startDate: activity.startDate ? activity.startDate.toISOString() : null,
            endDate: activity.endDate ? activity.endDate.toISOString() : null,
            coverImage: activity.coverImage,
          }}
        />
      </div>
    </div>
  );
}

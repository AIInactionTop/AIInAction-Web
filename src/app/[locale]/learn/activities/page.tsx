import type { Metadata } from "next";
import { getActivities } from "@/lib/activities";
import { isAdmin } from "@/lib/activities";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/activity-card";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { ActivityType, ActivityStatus } from "@prisma/client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: string;
    status?: string;
    search?: string;
    page?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("activitiesTitle"),
    description: t("activitiesDescription"),
  };
}

export default async function ActivitiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const session = await auth();
  const userIsAdmin = session?.user?.id ? isAdmin(session.user.id) : false;

  const t = await getTranslations("activities");

  const filters = {
    type: sp.type as ActivityType | undefined,
    status: sp.status as ActivityStatus | undefined,
    search: sp.search,
    page: sp.page ? parseInt(sp.page) : 1,
  };

  const { activities } = await getActivities(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        {userIsAdmin && (
          <Link href="/learn/activities/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("create")}
            </Button>
          </Link>
        )}
      </div>

      {/* Activities Grid */}
      {activities.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={JSON.parse(JSON.stringify(activity))}
            />
          ))}
        </div>
      ) : (
        <div className="mt-20 text-center">
          <p className="text-lg text-muted-foreground">{t("noActivities")}</p>
        </div>
      )}
    </div>
  );
}

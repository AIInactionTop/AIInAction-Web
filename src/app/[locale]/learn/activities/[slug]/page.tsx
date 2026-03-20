import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getActivityBySlug, isAdmin } from "@/lib/activities";
import { auth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ReactMarkdown from "react-markdown";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

const typeColors: Record<string, string> = {
  HACKATHON: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  THEMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  EXTERNAL: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  GENERAL: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  UPCOMING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  ENDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const activity = await getActivityBySlug(slug);
  if (!activity) {
    return { title: "Activity Not Found" };
  }
  return {
    title: activity.title,
    description: activity.description,
  };
}

export default async function ActivityDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  const canEdit = userId && (userId === activity.authorId || isAdmin(userId));

  const t = await getTranslations("activities");

  const typeLabel = t(activity.type.toLowerCase() as "hackathon" | "themed" | "external" | "general");
  const statusLabel = t(activity.status.toLowerCase() as "draft" | "upcoming" | "active" | "ended");

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/learn/activities"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToActivities")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{activity.title}</span>
      </div>

      {/* Cover Image */}
      {activity.coverImage && (
        <div className="mt-6 relative aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={activity.coverImage}
            alt={activity.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={typeColors[activity.type] || ""} variant="secondary">
            {typeLabel}
          </Badge>
          <Badge className={statusColors[activity.status] || ""} variant="secondary">
            {statusLabel}
          </Badge>
          {(activity.startDate || activity.endDate) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDate(activity.startDate)}
                {activity.endDate && ` - ${formatDate(activity.endDate)}`}
              </span>
            </div>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {activity.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {activity.description}
        </p>

        {/* Author */}
        {activity.author && (
          <div className="mt-4 flex items-center gap-2">
            {activity.author.image && (
              <Image
                src={activity.author.image}
                alt={activity.author.name || ""}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <Link
              href={`/profile/${activity.author.id}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {activity.author.name}
            </Link>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {activity.type === "EXTERNAL" && activity.externalUrl && (
            <Button asChild>
              <a href={activity.externalUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t("visitSite")}
              </a>
            </Button>
          )}
          {canEdit && (
            <Link href={`/learn/activities/${activity.slug}/edit`}>
              <Button variant="outline" className="gap-2">
                <Pencil className="h-4 w-4" />
                {t("editActivity")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {activity.content && (
        <>
          <Separator className="my-8" />
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown>{activity.content}</ReactMarkdown>
          </div>
        </>
      )}

      {/* Associated Challenges */}
      {activity.challenges.length > 0 && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("associatedChallenges")}
            </h2>
            <div className="space-y-3">
              {activity.challenges.map(({ challenge }) => (
                <Link
                  key={challenge.id}
                  href={`/learn/challenges/${challenge.slug}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <h3 className="font-medium">{challenge.title}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

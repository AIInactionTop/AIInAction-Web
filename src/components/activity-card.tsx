"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type ActivityCardProps = {
  activity: {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    coverImage: string | null;
    externalUrl: string | null;
    author: { id: string; name: string | null; image: string | null } | null;
  };
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

export function ActivityCard({ activity }: ActivityCardProps) {
  const t = useTranslations("activities");

  const typeLabel = t(activity.type.toLowerCase() as "hackathon" | "themed" | "external" | "general");
  const statusLabel = t(activity.status.toLowerCase() as "draft" | "upcoming" | "active" | "ended");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const isExternal = activity.type === "EXTERNAL" && activity.externalUrl;

  const cardContent = (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {activity.coverImage && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={activity.coverImage}
            alt={activity.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge className={typeColors[activity.type] || ""} variant="secondary">
            {typeLabel}
          </Badge>
          <Badge className={statusColors[activity.status] || ""} variant="secondary">
            {statusLabel}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold leading-tight line-clamp-2">
          {activity.title}
        </h3>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {activity.description}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        {(activity.startDate || activity.endDate) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDate(activity.startDate)}
              {activity.endDate && ` - ${formatDate(activity.endDate)}`}
            </span>
          </div>
        )}
        {isExternal ? (
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <a href={activity.externalUrl!} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              {t("visitSite")}
            </a>
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            {t("viewDetails")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  if (isExternal) {
    return cardContent;
  }

  return (
    <Link href={`/learn/activities/${activity.slug}`} className="block">
      {cardContent}
    </Link>
  );
}

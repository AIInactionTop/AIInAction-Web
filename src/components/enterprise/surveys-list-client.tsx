"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "@/i18n/navigation";

type Survey = {
  id: string;
  slug: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { responses: number };
};

type Props = {
  orgSlug: string;
  surveys: Survey[];
  total: number;
  page: number;
  pageSize: number;
  currentStatus: string | null;
  currentUserRole: string;
  locale: string;
};

export function SurveysListClient({
  orgSlug,
  surveys,
  total,
  page,
  pageSize,
  currentStatus,
  currentUserRole,
}: Props) {
  const t = useTranslations("enterprise");
  const router = useRouter();

  const canCreate =
    currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const totalPages = Math.ceil(total / pageSize);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default" as const;
      case "CLOSED":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  function handleStatusChange(value: string) {
    const status = value === "all" ? "" : value;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.push(
      `/enterprise/${orgSlug}/surveys${params.toString() ? `?${params.toString()}` : ""}` as never,
    );
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (newPage > 1) params.set("page", String(newPage));
    router.push(
      `/enterprise/${orgSlug}/surveys${params.toString() ? `?${params.toString()}` : ""}` as never,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("surveys")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("membersCount", { count: total })}
          </p>
        </div>
        {canCreate && (
          <Link href={`/enterprise/${orgSlug}/surveys/new` as never}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("createSurvey")}
            </Button>
          </Link>
        )}
      </div>

      <Tabs
        value={currentStatus ?? "all"}
        onValueChange={handleStatusChange}
      >
        <TabsList>
          <TabsTrigger value="all">{t("allSurveys")}</TabsTrigger>
          <TabsTrigger value="DRAFT">{t("DRAFT")}</TabsTrigger>
          <TabsTrigger value="ACTIVE">{t("ACTIVE")}</TabsTrigger>
          <TabsTrigger value="CLOSED">{t("CLOSED")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("noSurveys")}</p>
            {canCreate && (
              <Link href={`/enterprise/${orgSlug}/surveys/new` as never}>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createSurvey")}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <Link
              key={survey.id}
              href={`/enterprise/${orgSlug}/surveys/${survey.slug}` as never}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate font-medium">{survey.title}</h3>
                      <Badge variant={statusBadgeVariant(survey.status)}>
                        {t(survey.status as "DRAFT" | "ACTIVE" | "CLOSED")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("responses")}: {survey._count.responses} &middot;{" "}
                      {t("createdAt")}:{" "}
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Pencil,
  Trash2,
  Send,
  XCircle,
  FileBarChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  publishSurvey,
  closeSurvey,
  deleteSurvey,
} from "@/actions/enterprise-surveys";
import { generateDiagnosticReport } from "@/actions/enterprise-reports";

type Survey = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  shareToken: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  _count: { responses: number };
};

type Response = {
  id: string;
  respondentEmail: string | null;
  department: string | null;
  aiReadinessScore: number | null;
  submittedAt: string;
  respondent: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type Props = {
  orgSlug: string;
  survey: Survey;
  responses: Response[];
  memberCount: number;
  currentUserRole: string;
  locale: string;
};

export function SurveyDetailClient({
  orgSlug,
  survey,
  responses,
  memberCount,
  currentUserRole,
}: Props) {
  const t = useTranslations("enterprise");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const canManage =
    currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const responseRate =
    memberCount > 0
      ? Math.round((survey._count.responses / memberCount) * 100)
      : 0;

  const shareUrl =
    survey.shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/survey/${survey.shareToken}`
      : null;

  function handleCopy() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePublish() {
    startTransition(async () => {
      await publishSurvey(survey.id);
      router.refresh();
    });
  }

  function handleClose() {
    startTransition(async () => {
      await closeSurvey(survey.id);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(t("deleteSurveyConfirm"))) return;
    startTransition(async () => {
      await deleteSurvey(survey.id);
      router.push(`/enterprise/${orgSlug}/surveys` as never);
    });
  }

  function handleGenerateReport() {
    startTransition(async () => {
      await generateDiagnosticReport(survey.id);
      router.push(`/enterprise/${orgSlug}/reports` as never);
    });
  }

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

  // Department breakdown
  const deptCounts: Record<string, number> = {};
  for (const r of responses) {
    const dept = r.department || "—";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/enterprise/${orgSlug}/surveys` as never}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToSurveys")}
          </Link>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          {survey.description && (
            <p className="mt-1 text-muted-foreground">{survey.description}</p>
          )}
        </div>
        <Badge
          variant={statusBadgeVariant(survey.status)}
          className="shrink-0"
        >
          {t(survey.status as "DRAFT" | "ACTIVE" | "CLOSED")}
        </Badge>
      </div>

      {/* Survey Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("surveyInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("createdAt")}
              </dt>
              <dd className="font-medium">
                {new Date(survey.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("startDate")}
              </dt>
              <dd className="font-medium">
                {survey.startsAt
                  ? new Date(survey.startsAt).toLocaleDateString()
                  : t("notStarted")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("endDate")}
              </dt>
              <dd className="font-medium">
                {survey.endsAt
                  ? new Date(survey.endsAt).toLocaleDateString()
                  : t("notEnded")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("responseRate")}
              </dt>
              <dd className="font-medium">
                {survey._count.responses} / {memberCount} ({responseRate}%)
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Share Link (when active) */}
      {survey.status === "ACTIVE" && shareUrl && (
        <Card>
          <CardHeader>
            <CardTitle>{t("shareLink")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">
                {shareUrl}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    {t("copied")}
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" />
                    {t("copy")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Breakdown */}
      {Object.keys(deptCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("departmentBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(deptCounts).map(([dept, count]) => (
                <div
                  key={dept}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{dept}</span>
                  <span className="ml-2 text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {canManage && (
        <div className="flex flex-wrap gap-3">
          {survey.status === "DRAFT" && (
            <>
              <Button onClick={handlePublish} disabled={isPending}>
                <Send className="mr-2 h-4 w-4" />
                {t("publish")}
              </Button>
              <Link
                href={
                  `/enterprise/${orgSlug}/surveys/${survey.slug}/edit` as never
                }
              >
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("editSurvey")}
                </Button>
              </Link>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("deleteSurvey")}
              </Button>
            </>
          )}
          {survey.status === "ACTIVE" && (
            <>
              <Button
                variant="destructive"
                onClick={handleClose}
                disabled={isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("close")}
              </Button>
              {survey._count.responses >= 1 && (
                <Button
                  variant="outline"
                  onClick={handleGenerateReport}
                  disabled={isPending}
                >
                  <FileBarChart className="mr-2 h-4 w-4" />
                  {t("generateReport")}
                </Button>
              )}
            </>
          )}
          {survey.status === "CLOSED" && survey._count.responses >= 1 && (
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={isPending}
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              {t("generateReport")}
            </Button>
          )}
        </div>
      )}

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("responses")} ({responses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {responses.length === 0 ? (
            <p className="px-6 py-8 text-center text-muted-foreground">
              {t("noResponses")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("respondent")}</TableHead>
                  <TableHead>{t("department")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("submittedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell>
                      {response.respondent?.name ||
                        response.respondentEmail ||
                        t("anonymous")}
                    </TableCell>
                    <TableCell>{response.department ?? "—"}</TableCell>
                    <TableCell>
                      {response.aiReadinessScore != null
                        ? Math.round(response.aiReadinessScore)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(response.submittedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

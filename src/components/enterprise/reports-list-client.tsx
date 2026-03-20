"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scoreToGrade } from "@/types/enterprise";

type Report = {
  id: string;
  overallScore: number;
  generatedAt: string;
  aiNarrative: string | null;
  survey: { id: string; title: string; slug: string };
};

type Props = {
  orgSlug: string;
  reports: Report[];
};

const gradeColors: Record<string, string> = {
  "A+": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  A: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "B+": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  B: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "C+": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  C: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function ReportsListClient({ orgSlug, reports }: Props) {
  const t = useTranslations("enterprise");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reports")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("reportsDescription")}
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("noReports")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const grade = scoreToGrade(report.overallScore);
            return (
              <Link
                key={report.id}
                href={`/enterprise/${orgSlug}/reports/${report.id}` as never}
                className="block"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="truncate font-medium">
                          {report.survey.title}
                        </h3>
                        <Badge
                          className={gradeColors[grade] || ""}
                          variant="secondary"
                        >
                          {grade} ({report.overallScore.toFixed(1)})
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("generatedAt")}:{" "}
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, GraduationCap } from "lucide-react";
import { scoreToGrade } from "@/types/enterprise";
import type { DimensionScores } from "@/types/enterprise";
import { createTrainingPlan } from "@/actions/enterprise-reports";

type Benchmark = {
  industryAvg: number;
  industryTop: number;
} | null;

type Recommendation = {
  dimension: string;
  label: string;
  score: number;
  suggestedCategories: string[];
};

type Report = {
  id: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  aiNarrative: string | null;
  recommendations: Recommendation[] | null;
  benchmarkComparison: Benchmark;
  generatedAt: string;
  survey: {
    id: string;
    title: string;
    slug: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type Props = {
  orgSlug: string;
  report: Report;
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

const dimensionKeys = [
  "aiAwareness",
  "aiUsage",
  "processAutomation",
  "learningWillingness",
] as const;

export function ReportDetailClient({ orgSlug, report }: Props) {
  const t = useTranslations("enterprise");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [narrative, setNarrative] = useState(report.aiNarrative);
  const [pollingActive, setPollingActive] = useState(!report.aiNarrative);

  const grade = scoreToGrade(report.overallScore);
  const scores = report.dimensionScores as DimensionScores;
  const benchmark = report.benchmarkComparison as Benchmark;

  // Poll for narrative if not yet available
  const pollNarrative = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/enterprise/reports/${report.id}/narrative`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.aiNarrative) {
          setNarrative(data.aiNarrative);
          setPollingActive(false);
        }
      }
    } catch {
      // silently retry
    }
  }, [report.id]);

  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(pollNarrative, 5000);
    return () => clearInterval(interval);
  }, [pollingActive, pollNarrative]);

  // Radar chart data
  const radarData = dimensionKeys.map((key) => ({
    dimension: t(key),
    score: scores[key],
    fullMark: 100,
  }));

  // Industry comparison data
  const comparisonData = benchmark
    ? [
        {
          name: t("overallScore"),
          org: report.overallScore,
          industryAvg: benchmark.industryAvg,
          industryTop: benchmark.industryTop,
        },
        ...dimensionKeys.map((key) => ({
          name: t(key),
          org: scores[key],
          industryAvg: benchmark.industryAvg,
          industryTop: benchmark.industryTop,
        })),
      ]
    : [];

  // Department breakdown data from dimension scores
  const departmentData = dimensionKeys.map((key) => ({
    name: t(key),
    score: scores[key],
  }));

  function handleGenerateTrainingPlan() {
    startTransition(async () => {
      try {
        const planId = await createTrainingPlan(report.id);
        router.push(
          `/enterprise/${orgSlug}/training/${planId}` as never,
        );
      } catch (err) {
        console.error("Failed to create training plan:", err);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {report.survey.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {new Date(report.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-3xl font-bold">
              {report.overallScore.toFixed(1)}
            </p>
            <Badge
              className={`mt-1 text-base ${gradeColors[grade] || ""}`}
              variant="secondary"
            >
              {grade}
            </Badge>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dimensions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                cx="50%"
                cy="50%"
                outerRadius="80%"
              >
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name={t("overallScore")}
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Industry Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>{t("industryComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          {benchmark ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="org"
                    name={report.organization.name}
                    fill="hsl(var(--primary))"
                  />
                  <Bar
                    dataKey="industryAvg"
                    name={t("industryAvg")}
                    fill="hsl(var(--muted-foreground))"
                  />
                  <Bar
                    dataKey="industryTop"
                    name={t("industryTop")}
                    fill="hsl(var(--chart-1))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {t("insufficientData")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t("departmentBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar
                  dataKey="score"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI Narrative */}
      <Card>
        <CardHeader>
          <CardTitle>{t("aiAnalysis")}</CardTitle>
        </CardHeader>
        <CardContent>
          {narrative ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {narrative.split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">{t("generating")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("recommendations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {report.recommendations.map(
                (rec: Recommendation, i: number) => (
                  <li
                    key={i}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{rec.label}</h4>
                      <Badge variant="outline">
                        {rec.score.toFixed(1)}
                      </Badge>
                    </div>
                    {rec.suggestedCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rec.suggestedCategories.map((cat) => (
                          <Badge key={cat} variant="secondary">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <a
            href={`/api/enterprise/reports/${report.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="mr-2 h-4 w-4" />
            {t("exportPdf")}
          </a>
        </Button>
        <Button
          onClick={handleGenerateTrainingPlan}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GraduationCap className="mr-2 h-4 w-4" />
          )}
          {t("generateTrainingPlan")}
        </Button>
      </div>
    </div>
  );
}

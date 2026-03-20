"use client";

import { useTranslations } from "next-intl";
import { Users, BarChart3, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { DimensionScores } from "@/types/enterprise";
import { scoreToGrade } from "@/types/enterprise";

type Report = {
  id: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  generatedAt: string;
} | null;

type Progress = {
  id: string;
  period: string;
  metrics: Record<string, number>;
} | null;

type Survey = {
  id: string;
  title: string;
  status: string;
  _count: { responses: number };
};

type Props = {
  memberCount: number;
  responseRate: number | null;
  latestReport: Report;
  latestProgress: Progress;
  previousProgress: Progress;
  surveys: Survey[];
};

export function DashboardClient({
  memberCount,
  responseRate,
  latestReport,
  latestProgress,
  previousProgress,
  surveys,
}: Props) {
  const t = useTranslations("enterprise");

  const grade = latestReport ? scoreToGrade(latestReport.overallScore) : null;

  // Calculate quarterly progress percentage
  let progressChange: number | null = null;
  if (latestProgress?.metrics?.overallScore && previousProgress?.metrics?.overallScore) {
    progressChange = Math.round(
      latestProgress.metrics.overallScore - previousProgress.metrics.overallScore,
    );
  }

  const dimensions = latestReport
    ? [
        { key: "aiAwareness", value: (latestReport.dimensionScores as DimensionScores).aiAwareness },
        { key: "aiUsage", value: (latestReport.dimensionScores as DimensionScores).aiUsage },
        { key: "processAutomation", value: (latestReport.dimensionScores as DimensionScores).processAutomation },
        { key: "learningWillingness", value: (latestReport.dimensionScores as DimensionScores).learningWillingness },
      ]
    : [];

  const radarData = dimensions.map((d) => ({
    dimension: t(d.key as "aiAwareness" | "aiUsage" | "processAutomation" | "learningWillingness"),
    score: d.value,
    fullMark: 100,
  }));

  const stats = [
    {
      label: t("totalMembers"),
      value: memberCount,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: t("responseRate"),
      value: responseRate !== null ? `${responseRate}%` : "N/A",
      icon: BarChart3,
      color: "text-green-500",
    },
    {
      label: t("aiMaturityGrade"),
      value: grade ?? "—",
      icon: Award,
      color: "text-purple-500",
    },
    {
      label: t("quarterlyProgress"),
      value:
        progressChange !== null
          ? `${progressChange > 0 ? "+" : ""}${progressChange}%`
          : "—",
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-lg bg-muted p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radar Chart */}
      {latestReport && radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dimensions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
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
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {surveys.length === 0 ? (
            <p className="text-muted-foreground">{t("noDataYet")}</p>
          ) : (
            <ul className="space-y-3">
              {surveys.map((survey) => (
                <li
                  key={survey.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{survey.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("surveyStatus", {
                        title: survey.title,
                        status: t(survey.status as "DRAFT" | "ACTIVE" | "CLOSED"),
                        count: survey._count.responses,
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

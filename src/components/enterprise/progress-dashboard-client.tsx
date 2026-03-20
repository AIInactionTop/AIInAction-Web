"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { DimensionScores } from "@/types/enterprise";

type Metrics = {
  overallScore: number;
  dimensionScores: DimensionScores;
  departmentScores?: Record<
    string,
    { overallScore: number; dimensionScores: DimensionScores }
  >;
  responseCount: number;
};

type ProgressRecord = {
  id: string;
  period: string;
  metrics: Metrics;
  createdAt: string;
  survey: { id: string; title: string; slug: string };
};

type Props = {
  records: ProgressRecord[];
};

export function ProgressDashboardClient({ records }: Props) {
  const t = useTranslations("enterprise");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const filteredRecords = useMemo(() => {
    if (selectedPeriod === "all") return records;
    return records.filter((r) => r.period === selectedPeriod);
  }, [records, selectedPeriod]);

  const periods = useMemo(
    () => [...new Set(records.map((r) => r.period))],
    [records],
  );

  // Build line chart data from all records
  const chartData = useMemo(
    () =>
      records.map((record) => {
        const scores = record.metrics.dimensionScores;
        return {
          period: record.period,
          [t("adoptionRate")]: scores.aiUsage,
          [t("avgProficiency")]: scores.aiAwareness,
          [t("automatedProcesses")]: scores.processAutomation,
          [t("trainingCompletion")]: scores.learningWillingness,
        };
      }),
    [records, t],
  );

  // Most improved departments
  const departmentImprovements = useMemo(() => {
    if (records.length < 2) return [];

    const first = records[0]?.metrics.departmentScores;
    const last = records[records.length - 1]?.metrics.departmentScores;
    if (!first || !last) return [];

    const improvements: { department: string; improvement: number }[] = [];
    for (const dept of Object.keys(last)) {
      if (first[dept]) {
        const diff = last[dept].overallScore - first[dept].overallScore;
        improvements.push({ department: dept, improvement: Math.round(diff * 10) / 10 });
      }
    }

    return improvements.sort((a, b) => b.improvement - a.improvement).slice(0, 5);
  }, [records]);

  if (records.length < 2) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("progressDashboard")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("progressDescription")}
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("needMoreSurveys")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lineColors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
  ];

  const metricLabels = [
    t("adoptionRate"),
    t("avgProficiency"),
    t("automatedProcesses"),
    t("trainingCompletion"),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("progressDashboard")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("progressDescription")}
          </p>
        </div>
        {periods.length > 2 && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPeriods")}</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {metricLabels.map((label, i) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={lineColors[i]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Most Improved Departments */}
      {departmentImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("topImproving")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departmentImprovements.map((dept, i) => (
                <div
                  key={dept.department}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="font-medium">{dept.department}</span>
                  </div>
                  <Badge
                    variant={dept.improvement > 0 ? "default" : "secondary"}
                  >
                    {dept.improvement > 0 ? "+" : ""}
                    {dept.improvement}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("periodDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">
                    {t("period")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("overallScore")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("aiAwareness")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("aiUsage")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("processAutomation")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("learningWillingness")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("responses")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{record.period}</td>
                    <td className="px-3 py-2">
                      {record.metrics.overallScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2">
                      {record.metrics.dimensionScores.aiAwareness.toFixed(1)}
                    </td>
                    <td className="px-3 py-2">
                      {record.metrics.dimensionScores.aiUsage.toFixed(1)}
                    </td>
                    <td className="px-3 py-2">
                      {record.metrics.dimensionScores.processAutomation.toFixed(
                        1,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {record.metrics.dimensionScores.learningWillingness.toFixed(
                        1,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {record.metrics.responseCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

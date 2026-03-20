"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
} from "lucide-react";
import { calculateROI } from "@/actions/enterprise-reports";

type Report = {
  id: string;
  overallScore: number;
  generatedAt: string;
  survey: { id: string; title: string; slug: string };
};

type Props = {
  orgSlug: string;
  reports: Report[];
};

type DepartmentRow = {
  name: string;
  count: number;
};

type ROIResult = {
  currentCost: number;
  projectedSavings: number;
  roiPercentage: number;
  paybackMonths: number;
  chartData: { name: string; cost: number; savings: number }[];
  aiAnalysis: string | null;
};

export function ROICalculatorClient({ orgSlug, reports }: Props) {
  const t = useTranslations("enterprise");
  const [isPending, startTransition] = useTransition();

  const [selectedReportId, setSelectedReportId] = useState(
    reports[0]?.id ?? "",
  );
  const [avgSalary, setAvgSalary] = useState(8000);
  const [aiToolCost, setAiToolCost] = useState(500);
  const [trainingBudget, setTrainingBudget] = useState(50000);
  const [timeline, setTimeline] = useState(6);
  const [departments, setDepartments] = useState<DepartmentRow[]>([
    { name: "Engineering", count: 20 },
    { name: "Marketing", count: 10 },
  ]);
  const [result, setResult] = useState<ROIResult | null>(null);

  function addDepartment() {
    setDepartments([...departments, { name: "", count: 1 }]);
  }

  function removeDepartment(index: number) {
    setDepartments(departments.filter((_, i) => i !== index));
  }

  function updateDepartment(
    index: number,
    field: "name" | "count",
    value: string | number,
  ) {
    const updated = [...departments];
    if (field === "name") {
      updated[index].name = value as string;
    } else {
      updated[index].count = Number(value) || 0;
    }
    setDepartments(updated);
  }

  function handleCalculate() {
    if (!selectedReportId) return;

    const headcounts: Record<string, number> = {};
    for (const dept of departments) {
      if (dept.name.trim()) {
        headcounts[dept.name.trim()] = dept.count;
      }
    }

    const roiInput = {
      averageMonthlySalary: avgSalary,
      departmentHeadcounts: headcounts,
      aiToolMonthlyCost: aiToolCost,
      trainingBudget,
      implementationMonths: timeline,
    };

    const formData = new FormData();
    formData.set("roiInput", JSON.stringify(roiInput));

    startTransition(async () => {
      try {
        await calculateROI(orgSlug, selectedReportId, formData);

        // Compute display values locally for immediate feedback
        const totalHeadcount = Object.values(headcounts).reduce(
          (s, v) => s + v,
          0,
        );
        const monthlyLabor = totalHeadcount * avgSalary;
        const currentCost = monthlyLabor * timeline;
        const savingsRate = 0.2;
        const projectedSavings = currentCost * savingsRate;
        const implCost =
          trainingBudget + aiToolCost * timeline * 1.5 + trainingBudget * 0.5;
        const roiPct =
          implCost > 0
            ? Math.round(((projectedSavings - implCost) / implCost) * 100)
            : 0;
        const paybackMonths =
          projectedSavings > 0
            ? Math.round((implCost / (projectedSavings / timeline)) * 10) / 10
            : 0;

        const chartData = departments
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name,
            cost: d.count * avgSalary * timeline,
            savings: Math.round(d.count * avgSalary * savingsRate * timeline),
          }));

        setResult({
          currentCost,
          projectedSavings,
          roiPercentage: roiPct,
          paybackMonths,
          chartData,
          aiAnalysis: null,
        });
      } catch (err) {
        console.error("Failed to calculate ROI:", err);
      }
    });
  }

  const metricCards = result
    ? [
        {
          label: t("currentCost"),
          value: `$${result.currentCost.toLocaleString()}`,
          icon: DollarSign,
          color: "text-red-500",
        },
        {
          label: t("projectedSavings"),
          value: `$${result.projectedSavings.toLocaleString()}`,
          icon: TrendingUp,
          color: "text-green-500",
        },
        {
          label: t("roiPercentage"),
          value: `${result.roiPercentage}%`,
          icon: BarChart3,
          color: "text-blue-500",
        },
        {
          label: t("paybackPeriod"),
          value: `${result.paybackMonths} ${t("months")}`,
          icon: Clock,
          color: "text-orange-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("roiCalculator")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("roiDescription")}
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("noReportsForROI")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t("roiInputs")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Selection */}
              <div className="space-y-2">
                <Label>{t("selectReport")}</Label>
                <Select
                  value={selectedReportId}
                  onValueChange={setSelectedReportId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reports.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.survey.title} (
                        {new Date(r.generatedAt).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("avgSalary")}</Label>
                  <Input
                    type="number"
                    value={avgSalary}
                    onChange={(e) => setAvgSalary(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("aiToolCost")}</Label>
                  <Input
                    type="number"
                    value={aiToolCost}
                    onChange={(e) => setAiToolCost(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("trainingBudget")}</Label>
                  <Input
                    type="number"
                    value={trainingBudget}
                    onChange={(e) =>
                      setTrainingBudget(Number(e.target.value))
                    }
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("timeline")}</Label>
                  <Input
                    type="number"
                    value={timeline}
                    onChange={(e) => setTimeline(Number(e.target.value))}
                    min={1}
                    max={36}
                  />
                </div>
              </div>

              {/* Department Headcounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("departmentHeadcounts")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDepartment}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {t("addDepartment")}
                  </Button>
                </div>
                {departments.map((dept, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      placeholder={t("departmentName")}
                      value={dept.name}
                      onChange={(e) =>
                        updateDepartment(i, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={dept.count}
                      onChange={(e) =>
                        updateDepartment(i, "count", e.target.value)
                      }
                      min={1}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDepartment(i)}
                      disabled={departments.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCalculate}
                disabled={isPending || !selectedReportId}
                className="w-full"
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("calculate")}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <>
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metricCards.map((card) => (
                  <Card key={card.label}>
                    <CardContent className="flex items-center gap-4 pt-6">
                      <div
                        className={`rounded-lg bg-muted p-3 ${card.color}`}
                      >
                        <card.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {card.label}
                        </p>
                        <p className="text-2xl font-bold">{card.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("costVsSavings")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) =>
                            `$${Number(value).toLocaleString()}`
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="cost"
                          name={t("currentCost")}
                          fill="hsl(var(--muted-foreground))"
                        />
                        <Bar
                          dataKey="savings"
                          name={t("projectedSavings")}
                          fill="hsl(var(--primary))"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

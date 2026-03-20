"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Plan = {
  id: string;
  targetRoles: string[];
  createdAt: string;
  report: {
    id: string;
    overallScore: number;
    generatedAt: string;
  };
};

type Props = {
  orgSlug: string;
  plans: Plan[];
};

export function TrainingListClient({ orgSlug, plans }: Props) {
  const t = useTranslations("enterprise");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("training")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("trainingDescription")}
        </p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("noTrainingPlans")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/enterprise/${orgSlug}/training/${plan.id}` as never}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate font-medium">
                        {t("trainingPlan")} -{" "}
                        {new Date(plan.report.generatedAt).toLocaleDateString()}
                      </h3>
                      <Badge variant="outline">
                        {t("overallScore")}: {plan.report.overallScore.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(plan.targetRoles as string[]).map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("createdAt")}:{" "}
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

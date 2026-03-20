"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Lightbulb, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

type Recommendation = {
  dimension: string;
  label: string;
  score: number;
  suggestedCategories: string[];
};

type Plan = {
  id: string;
  targetRoles: string[];
  recommendations: Recommendation[];
  aiSuggestions: string | null;
  createdAt: string;
  report: {
    id: string;
    overallScore: number;
    generatedAt: string;
    dimensionScores: Record<string, number>;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type Props = {
  orgSlug: string;
  plan: Plan;
};

export function TrainingDetailClient({ orgSlug, plan }: Props) {
  const t = useTranslations("enterprise");

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href={`/enterprise/${orgSlug}/training` as never}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("training")}
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {t("trainingPlan")} -{" "}
          {new Date(plan.report.generatedAt).toLocaleDateString()}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("createdAt")}: {new Date(plan.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Target Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("targetRoles")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(plan.targetRoles as string[]).map((role) => (
              <Badge key={role} variant="secondary" className="text-sm">
                {role}
              </Badge>
            ))}
            {(plan.targetRoles as string[]).length === 0 && (
              <p className="text-muted-foreground">{t("noTargetRoles")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("recommendedPaths")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(plan.recommendations as Recommendation[]).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(plan.recommendations as Recommendation[]).map(
                (rec, i) => (
                  <Card key={i} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{rec.label}</h4>
                        <Badge variant="outline">
                          {rec.score.toFixed(1)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("dimension")}: {rec.dimension}
                      </p>
                      {rec.suggestedCategories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {rec.suggestedCategories.map((cat) => (
                            <Link
                              key={cat}
                              href={`/challenges?category=${encodeURIComponent(cat)}` as never}
                            >
                              <Badge
                                variant="default"
                                className="cursor-pointer hover:opacity-80"
                              >
                                {cat}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noRecommendations")}</p>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {t("aiSuggestions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan.aiSuggestions ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {plan.aiSuggestions.split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noAiSuggestions")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

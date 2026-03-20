"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signIn } from "next-auth/react";
import {
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Calculator,
  TrendingUp,
  Building2,
  Users,
  ArrowRight,
  Plus,
} from "lucide-react";

type Org = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  _count: { members: number };
};

const FEATURES = [
  { key: "featureSurvey", descKey: "featureSurveyDesc", icon: ClipboardList },
  { key: "featureReport", descKey: "featureReportDesc", icon: FileBarChart },
  { key: "featureTraining", descKey: "featureTrainingDesc", icon: GraduationCap },
  { key: "featureROI", descKey: "featureROIDesc", icon: Calculator },
  { key: "featureProgress", descKey: "featureProgressDesc", icon: TrendingUp },
] as const;

export function EnterpriseLanding({
  orgs,
  isAuthenticated,
}: {
  orgs: Org[];
  isAuthenticated: boolean;
}) {
  const t = useTranslations("enterprise");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

{/* User section */}
<div className="mt-16">
        {isAuthenticated ? (
          orgs.length > 0 ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t("myOrgs")}</h2>
                <Button asChild>
                  <Link href="/enterprise/create">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("createOrg")}
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {orgs.map((org) => (
                  <Link
                    key={org.id}
                    href={`/enterprise/${org.slug}` as never}
                  >
                    <Card className="flex flex-col gap-3 p-6 transition-colors hover:border-primary/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">
                            {org.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t(org.industry as never)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {t("membersCount", { count: org._count.members })}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="mb-6 text-muted-foreground">{t("noOrgs")}</p>
              <Button asChild size="lg">
                <Link href="/enterprise/create">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createOrg")}
                </Link>
              </Button>
            </div>
          )
        ) : (
          <div className="text-center">
            <Button size="lg" onClick={() => signIn("github")}>
              {t("signInToStart")}
            </Button>
          </div>
        )}
      </div>
      
      {/* Feature cards */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, descKey, icon: Icon }) => (
          <Card
            key={key}
            className="flex flex-col gap-3 p-6 transition-colors hover:border-primary/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{t(key)}</h3>
            <p className="text-sm text-muted-foreground">{t(descKey)}</p>
          </Card>
        ))}
      </div>

      
    </div>
  );
}

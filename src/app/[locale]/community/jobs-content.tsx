"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Briefcase, MapPin, DollarSign, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import type { SerializedJob } from "./community-client";

function formatSalary(min: number | null, max: number | null, currency: string) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (min && max) return `${currency} ${fmt(min)} - ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  if (max) return `Up to ${currency} ${fmt(max)}`;
  return null;
}

export function JobsContent({
  jobs,
  totalJobs,
}: {
  jobs: SerializedJob[];
  totalJobs: number;
}) {
  const t = useTranslations("jobs");
  const { data: session } = useSession();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalJobs} {totalJobs === 1 ? "job" : "jobs"}
        </p>
        {session?.user ? (
          <Button size="sm" asChild>
            <Link href="/jobs/new">{t("postJob")}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href="/login">{t("signInPost")}</Link>
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
          <Briefcase className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-medium">{t("noJobs")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("noJobsHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}` as never}
              className="group block rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {job.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  job.status === "OPEN"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {t(job.status.toLowerCase() as "open" | "closed")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {t(job.type as "FULL_TIME")}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t(job.locationType as "REMOTE")}
                  {job.location && ` · ${job.location}`}
                </span>
                {(job.salaryMin || job.salaryMax) && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t("applicants", { count: job._count.applications })}
                </span>
              </div>

              {job.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.skills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{job.skills.length - 5}</span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {totalJobs > jobs.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/jobs">
              {t("title")}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Search,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Job = {
  id: string;
  slug: string;
  title: string;
  company: string;
  companyUrl: string | null;
  location: string | null;
  locationType: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skills: string[];
  status: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
  _count: { applications: number };
};

function formatSalary(min: number | null, max: number | null, currency: string) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (min && max) return `${currency} ${fmt(min)} - ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  if (max) return `Up to ${currency} ${fmt(max)}`;
  return null;
}

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"] as const;
const LOCATION_TYPES = ["REMOTE", "ONSITE", "HYBRID"] as const;

export function JobsListClient({
  jobs,
  total,
  page,
  pageSize,
}: {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("jobs");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`/jobs?${params.toString()}` as never, { scroll: false });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("search", searchValue || null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        {session?.user ? (
          <Button asChild className="gap-1.5">
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              {t("postJob")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/login">{t("signInPost")}</Link>
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
          />
        </form>
        <div className="flex gap-2">
          <Select
            value={searchParams.get("type") || "all"}
            onValueChange={(v) => updateParams("type", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {JOB_TYPES.map((jt) => (
                <SelectItem key={jt} value={jt}>{t(jt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("locationType") || "all"}
            onValueChange={(v) => updateParams("locationType", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("allLocations")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allLocations")}</SelectItem>
              {LOCATION_TYPES.map((lt) => (
                <SelectItem key={lt} value={lt}>{t(lt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("sort") || "newest"}
            onValueChange={(v) => updateParams("sort", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("sortNewest")}</SelectItem>
              <SelectItem value="salary">{t("sortSalary")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t("noJobs")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noJobsHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Link
                  href={`/jobs/${job.slug}` as never}
                  className="group block rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-lg">
                        {job.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      job.status === "OPEN"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}>
                      {t(job.status.toLowerCase() as "open" | "closed")}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
                      {job.skills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 6 && (
                        <span className="text-xs text-muted-foreground">+{job.skills.length - 6}</span>
                      )}
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(page - 1));
              router.replace(`/jobs?${params.toString()}` as never);
            }}
          >
            {t("sortNewest") ? "←" : "←"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(page + 1));
              router.replace(`/jobs?${params.toString()}` as never);
            }}
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}

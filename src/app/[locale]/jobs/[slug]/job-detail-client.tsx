"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  ArrowLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Globe,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { applyToJob, deleteJob, closeJob, reopenJob } from "@/actions/jobs";

type Job = {
  id: string;
  slug: string;
  title: string;
  description: string;
  company: string;
  companyUrl: string | null;
  companyLogo: string | null;
  location: string | null;
  locationType: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skills: string[];
  contactEmail: string | null;
  applyUrl: string | null;
  status: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; githubUrl: string | null };
  _count: { applications: number };
};

type Application = {
  id: string;
  status: string;
  coverLetter: string | null;
  createdAt: string;
};

function formatSalary(min: number | null, max: number | null, currency: string) {
  const fmt = (v: number) => new Intl.NumberFormat("en-US").format(v);
  if (min && max) return `${currency} ${fmt(min)} - ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  if (max) return `Up to ${currency} ${fmt(max)}`;
  return null;
}

export function JobDetailClient({
  job,
  userApplication,
  isOwner,
  isSignedIn,
}: {
  job: Job;
  userApplication: Application | null;
  isOwner: boolean;
  isSignedIn: boolean;
}) {
  const t = useTranslations("jobs");
  const router = useRouter();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteJob(job.id);
      router.replace("/jobs" as never);
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      await closeJob(job.id);
      router.refresh();
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      await reopenJob(job.id);
      router.refresh();
    });
  };

  const handleApply = (formData: FormData) => {
    startTransition(async () => {
      formData.set("jobId", job.id);
      await applyToJob(job.id, formData);
      router.refresh();
    });
  };

  const salaryText = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedDate = new Date(job.createdAt).toLocaleDateString();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToJobs")}
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                job.status === "OPEN"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}>
                {t(job.status.toLowerCase() as "open" | "closed")}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">{job.company}</span>
              {job.companyUrl && (
                <a href={job.companyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/jobs/${job.slug}/edit` as never}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t("editJob")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/jobs/${job.slug}/applications` as never}>
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  {t("applications")}
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            {t(job.type as "FULL_TIME")}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {t(job.locationType as "REMOTE")}
            {job.location && ` · ${job.location}`}
          </span>
          {salaryText && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {salaryText}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {t("applicants", { count: job._count.applications })}
          </span>
          {job.contactEmail && (
            <a href={`mailto:${job.contactEmail}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Mail className="h-4 w-4" />
              {job.contactEmail}
            </a>
          )}
        </div>

        {job.skills.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold">{t("skills")}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg bg-primary/5 px-3 py-1 text-sm text-primary border border-primary/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {job.description}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={job.author.image || ""} alt={job.author.name || ""} />
              <AvatarFallback>{job.author.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <span className="text-muted-foreground">{t("postedBy")} </span>
              <Link href={`/profile/${job.author.id}` as never} className="font-medium hover:text-primary transition-colors">
                {job.author.name}
              </Link>
              <span className="text-muted-foreground"> · {t("postedOn", { date: postedDate })}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="mt-6 flex gap-2 border-t border-border pt-6">
            {job.status === "OPEN" ? (
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
                {t("closeJob")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleReopen} disabled={isPending}>
                {t("reopenJob")}
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("deleteJob")}
            </Button>
          </div>
        )}

        {!isOwner && isSignedIn && job.status === "OPEN" && (
          <div className="mt-6 border-t border-border pt-6">
            {userApplication ? (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  {t("applied")} · {t(`status${userApplication.status.charAt(0) + userApplication.status.slice(1).toLowerCase()}` as "statusPending")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(userApplication.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : job.applyUrl ? (
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-1.5">
                  {t("apply")}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : showApplyForm ? (
              <form action={handleApply} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("coverLetter")}</label>
                  <Textarea
                    name="coverLetter"
                    placeholder={t("coverLetterPlaceholder")}
                    className="mt-1.5"
                    rows={5}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("resumeUrl")}</label>
                  <Input
                    name="resumeUrl"
                    placeholder={t("resumeUrlPlaceholder")}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {t("submitApplication")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowApplyForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setShowApplyForm(true)}>
                {t("apply")}
              </Button>
            )}
          </div>
        )}

        {!isSignedIn && job.status === "OPEN" && (
          <div className="mt-6 border-t border-border pt-6">
            <Button variant="outline" asChild>
              <Link href="/login">{t("signInPost")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

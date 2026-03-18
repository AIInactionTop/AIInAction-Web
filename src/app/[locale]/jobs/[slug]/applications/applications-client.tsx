"use client";

import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateApplicationStatus } from "@/actions/jobs";

type Application = {
  id: string;
  status: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
    githubUrl: string | null;
  };
};

type Job = {
  id: string;
  slug: string;
  title: string;
  company: string;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  REVIEWING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  WITHDRAWN: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export function ApplicationsClient({
  job,
  applications,
}: {
  job: Job;
  applications: Application[];
}) {
  const t = useTranslations("jobs");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (applicationId: string, status: "REVIEWING" | "ACCEPTED" | "REJECTED") => {
    startTransition(async () => {
      await updateApplicationStatus(applicationId, status);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href={`/jobs/${job.slug}` as never}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {job.title}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t("manageApplications")}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t("applicants", { count: applications.length })}
      </p>

      <div className="mt-8 space-y-4">
        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
            <p className="text-muted-foreground">{t("noApplications")}</p>
          </div>
        ) : (
          applications.map((app) => {
            const statusKey = `status${app.status.charAt(0) + app.status.slice(1).toLowerCase()}` as
              | "statusPending"
              | "statusReviewing"
              | "statusAccepted"
              | "statusRejected"
              | "statusWithdrawn";

            return (
              <div
                key={app.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={app.user.image || ""} alt={app.user.name || ""} />
                      <AvatarFallback>{app.user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/profile/${app.user.id}` as never}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {app.user.name || "Anonymous"}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {app.user.email && <span>{app.user.email}</span>}
                        {app.user.githubUrl && (
                          <a
                            href={app.user.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 hover:text-primary"
                          >
                            GitHub <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[app.status] || ""}`}>
                    {t(statusKey)}
                  </span>
                </div>

                {app.coverLetter && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t("coverLetter")}</p>
                    <p className="text-sm whitespace-pre-wrap">{app.coverLetter}</p>
                  </div>
                )}

                {app.resumeUrl && (
                  <div className="mt-2">
                    <a
                      href={app.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {t("resumeUrl")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  {app.status !== "WITHDRAWN" && (
                    <div className="flex gap-2">
                      {app.status !== "REVIEWING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStatusChange(app.id, "REVIEWING")}
                        >
                          {t("statusReviewing")}
                        </Button>
                      )}
                      {app.status !== "ACCEPTED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStatusChange(app.id, "ACCEPTED")}
                          className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        >
                          {t("statusAccepted")}
                        </Button>
                      )}
                      {app.status !== "REJECTED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStatusChange(app.id, "REJECTED")}
                          className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                        >
                          {t("statusRejected")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

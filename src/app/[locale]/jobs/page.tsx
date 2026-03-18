import type { Metadata } from "next";
import { getJobs } from "@/lib/jobs";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { JobsListClient } from "./jobs-list-client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("jobsTitle"),
    description: t("jobsDescription"),
  };
}

export default async function JobsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const page = sp.page ? parseInt(sp.page, 10) : 1;
  const type = sp.type as import("@prisma/client").JobType | undefined;
  const locationType = sp.locationType as import("@prisma/client").JobLocationType | undefined;

  const { jobs, total, pageSize } = await getJobs({
    search: sp.search,
    type,
    locationType,
    page,
    sortBy: (sp.sort as "newest" | "salary") || "newest",
  });

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return <JobsListClient jobs={serialize(jobs)} total={total} page={page} pageSize={pageSize} />;
}

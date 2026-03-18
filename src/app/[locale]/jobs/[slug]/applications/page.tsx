import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getJobBySlug, getJobApplications } from "@/lib/jobs";
import { setRequestLocale } from "next-intl/server";
import { ApplicationsClient } from "./applications-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ApplicationsPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const job = await getJobBySlug(slug);
  if (!job) notFound();
  if (job.authorId !== session.user.id) redirect(`/${locale}/jobs/${slug}`);

  const applications = await getJobApplications(job.id);
  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <ApplicationsClient
      job={serialize(job)}
      applications={serialize(applications)}
    />
  );
}

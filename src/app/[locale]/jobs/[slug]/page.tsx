import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/jobs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setRequestLocale } from "next-intl/server";
import { JobDetailClient } from "./job-detail-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function JobDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const session = await auth();
  let userApplication = null;
  if (session?.user?.id) {
    userApplication = await prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId: job.id, userId: session.user.id } },
    });
  }

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <JobDetailClient
      job={serialize(job)}
      userApplication={userApplication ? serialize(userApplication) : null}
      isOwner={session?.user?.id === job.authorId}
      isSignedIn={!!session?.user}
    />
  );
}

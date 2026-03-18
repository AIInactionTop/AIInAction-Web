"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (await prisma.job.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export async function createJob(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const company = formData.get("company") as string;
  const companyUrl = (formData.get("companyUrl") as string) || null;
  const location = (formData.get("location") as string) || null;
  const locationType = (formData.get("locationType") as string) || "REMOTE";
  const type = (formData.get("type") as string) || "FULL_TIME";
  const salaryMinRaw = formData.get("salaryMin") as string;
  const salaryMaxRaw = formData.get("salaryMax") as string;
  const salaryCurrency = (formData.get("salaryCurrency") as string) || "USD";
  const skillsRaw = formData.get("skills") as string;
  const contactEmail = (formData.get("contactEmail") as string) || null;
  const applyUrl = (formData.get("applyUrl") as string) || null;
  const locale = (formData.get("locale") as string) || "en";

  const slug = await generateUniqueSlug(title);
  const skills = skillsRaw
    ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const salaryMin = salaryMinRaw ? parseInt(salaryMinRaw, 10) : null;
  const salaryMax = salaryMaxRaw ? parseInt(salaryMaxRaw, 10) : null;

  await prisma.job.create({
    data: {
      slug,
      title,
      description,
      company,
      companyUrl,
      location,
      locationType: locationType as "REMOTE" | "ONSITE" | "HYBRID",
      type: type as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP",
      salaryMin,
      salaryMax,
      salaryCurrency,
      skills,
      contactEmail,
      applyUrl,
      authorId: session.user.id,
    },
  });

  revalidatePath(`/${locale}/jobs`);
  redirect(`/${locale}/jobs/${slug}`);
}

export async function updateJob(jobId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.authorId !== session.user.id) throw new Error("Forbidden");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const company = formData.get("company") as string;
  const companyUrl = (formData.get("companyUrl") as string) || null;
  const location = (formData.get("location") as string) || null;
  const locationType = (formData.get("locationType") as string) || "REMOTE";
  const type = (formData.get("type") as string) || "FULL_TIME";
  const salaryMinRaw = formData.get("salaryMin") as string;
  const salaryMaxRaw = formData.get("salaryMax") as string;
  const salaryCurrency = (formData.get("salaryCurrency") as string) || "USD";
  const skillsRaw = formData.get("skills") as string;
  const contactEmail = (formData.get("contactEmail") as string) || null;
  const applyUrl = (formData.get("applyUrl") as string) || null;
  const locale = (formData.get("locale") as string) || "en";

  const skills = skillsRaw
    ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const salaryMin = salaryMinRaw ? parseInt(salaryMinRaw, 10) : null;
  const salaryMax = salaryMaxRaw ? parseInt(salaryMaxRaw, 10) : null;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      title,
      description,
      company,
      companyUrl,
      location,
      locationType: locationType as "REMOTE" | "ONSITE" | "HYBRID",
      type: type as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP",
      salaryMin,
      salaryMax,
      salaryCurrency,
      skills,
      contactEmail,
      applyUrl,
    },
  });

  revalidatePath(`/${locale}/jobs`);
  revalidatePath(`/${locale}/jobs/${job.slug}`);
  redirect(`/${locale}/jobs/${job.slug}`);
}

export async function deleteJob(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.authorId !== session.user.id) throw new Error("Forbidden");

  await prisma.job.delete({ where: { id: jobId } });
  revalidatePath("/jobs");
}

export async function closeJob(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.authorId !== session.user.id) throw new Error("Forbidden");

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "CLOSED" },
  });
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
}

export async function reopenJob(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.authorId !== session.user.id) throw new Error("Forbidden");

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "OPEN" },
  });
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
}

export async function applyToJob(jobId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const coverLetter = (formData.get("coverLetter") as string) || null;
  const resumeUrl = (formData.get("resumeUrl") as string) || null;

  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_userId: { jobId, userId: session.user.id } },
  });
  if (existing) throw new Error("Already applied");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "OPEN") throw new Error("Job is not open");
  if (job.authorId === session.user.id) throw new Error("Cannot apply to own job");

  await prisma.jobApplication.create({
    data: {
      jobId,
      userId: session.user.id,
      coverLetter,
      resumeUrl,
    },
  });

  revalidatePath(`/jobs/${job.slug}`);
}

export async function withdrawApplication(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: { select: { slug: true } } },
  });
  if (!application || application.userId !== session.user.id) throw new Error("Forbidden");

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status: "WITHDRAWN" },
  });

  revalidatePath(`/jobs/${application.job.slug}`);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "REVIEWING" | "ACCEPTED" | "REJECTED",
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: { select: { authorId: true, slug: true } } },
  });
  if (!application || application.job.authorId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  revalidatePath(`/jobs/${application.job.slug}`);
}

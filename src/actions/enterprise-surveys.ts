"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateAiReadinessScore } from "@/lib/enterprise-scoring";
import { aggregateOrgScores } from "@/lib/enterprise-scoring";
import { headers, cookies } from "next/headers";
import crypto from "crypto";
import type { SurveyAnswers } from "@/types/enterprise";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSurveySlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "survey";
  let suffix = 0;
  while (await prisma.survey.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base) || "survey"}-${suffix}`;
  }
  return slug;
}

async function requireOrgRole(
  orgId: string,
  userId: string,
  allowedRoles: string[],
) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
  });
  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error("Forbidden");
  }
  return member;
}

export async function createSurvey(orgSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
  if (!org) throw new Error("Organization not found");

  await requireOrgRole(org.id, session.user.id, ["OWNER", "ADMIN"]);

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const standardModulesRaw = formData.get("standardModules") as string;
  const customQuestionsRaw = formData.get("customQuestions") as string;
  const locale = (formData.get("locale") as string) || "en";

  if (!title?.trim()) throw new Error("Title is required");

  const slug = await generateUniqueSurveySlug(title);
  const shareToken = crypto.randomBytes(16).toString("hex");

  const standardModules = standardModulesRaw
    ? JSON.parse(standardModulesRaw)
    : [];
  const customQuestions = customQuestionsRaw
    ? JSON.parse(customQuestionsRaw)
    : null;

  await prisma.survey.create({
    data: {
      slug,
      title: title.trim(),
      description,
      organizationId: org.id,
      shareToken,
      standardModules,
      customQuestions,
    },
  });

  revalidatePath(`/${locale}/enterprise/${orgSlug}/surveys`);
  redirect(`/${locale}/enterprise/${orgSlug}/surveys/${slug}`);
}

export async function updateSurvey(surveyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Can only edit draft surveys");

  await requireOrgRole(survey.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const standardModulesRaw = formData.get("standardModules") as string;
  const customQuestionsRaw = formData.get("customQuestions") as string;
  const locale = (formData.get("locale") as string) || "en";

  const data: Record<string, unknown> = {};
  if (title?.trim()) data.title = title.trim();
  if (description !== undefined) data.description = description;
  if (standardModulesRaw) data.standardModules = JSON.parse(standardModulesRaw);
  if (customQuestionsRaw) data.customQuestions = JSON.parse(customQuestionsRaw);

  await prisma.survey.update({
    where: { id: surveyId },
    data,
  });

  revalidatePath(
    `/${locale}/enterprise/${survey.organization.slug}/surveys/${survey.slug}`,
  );
}

export async function publishSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!survey) throw new Error("Survey not found");

  await requireOrgRole(survey.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  await prisma.survey.update({
    where: { id: surveyId },
    data: {
      status: "ACTIVE",
      startsAt: new Date(),
    },
  });

  revalidatePath(`/enterprise/${survey.organization.slug}/surveys`);
  revalidatePath(
    `/enterprise/${survey.organization.slug}/surveys/${survey.slug}`,
  );
}

export async function closeSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!survey) throw new Error("Survey not found");

  await requireOrgRole(survey.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  await prisma.survey.update({
    where: { id: surveyId },
    data: {
      status: "CLOSED",
      endsAt: new Date(),
    },
  });

  revalidatePath(`/enterprise/${survey.organization.slug}/surveys`);
  revalidatePath(
    `/enterprise/${survey.organization.slug}/surveys/${survey.slug}`,
  );
}

export async function submitSurveyResponse(
  surveyId: string,
  formData: FormData,
) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      organization: {
        include: { _count: { select: { members: true } } },
      },
    },
  });
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "ACTIVE") throw new Error("Survey is not active");

  // Get IP for rate limiting
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";

  // Rate limit: max 3 responses per IP per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentFromIp = await prisma.surveyResponse.count({
    where: {
      surveyId,
      ip,
      submittedAt: { gte: oneHourAgo },
    },
  });
  if (recentFromIp >= 3) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Check cookie for double submit
  const cookieStore = await cookies();
  const submitCookieName = `survey_submitted_${surveyId}`;
  if (cookieStore.get(submitCookieName)) {
    throw new Error("You have already submitted a response to this survey.");
  }

  // Parse answers
  const answersRaw = formData.get("answers") as string;
  if (!answersRaw) throw new Error("Answers are required");
  const answers = JSON.parse(answersRaw) as SurveyAnswers;

  // Calculate score
  const aiReadinessScore = calculateAiReadinessScore(answers);

  // Get optional respondent info
  const session = await auth();
  const respondentId = session?.user?.id || null;
  const respondentEmail = (formData.get("email") as string) || null;
  const department = (formData.get("department") as string) || null;
  const jobTitle = (formData.get("jobTitle") as string) || null;

  await prisma.surveyResponse.create({
    data: {
      surveyId,
      respondentId,
      respondentEmail,
      department,
      jobTitle,
      ip,
      answers: JSON.parse(JSON.stringify(answers)),
      aiReadinessScore,
    },
  });

  // Set cookie to prevent double submit (24 hours)
  cookieStore.set(submitCookieName, "1", {
    maxAge: 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
  });

  // Check if response rate >= 50% to auto-trigger report
  const responseCount = await prisma.surveyResponse.count({
    where: { surveyId },
  });
  const memberCount = survey.organization._count.members;

  if (memberCount > 0 && responseCount / memberCount >= 0.5) {
    // Check if a report already exists for this survey
    const existingReport = await prisma.diagnosticReport.findFirst({
      where: { surveyId, organizationId: survey.organizationId },
    });

    if (!existingReport) {
      // Auto-create report with aggregated scores
      const responses = await prisma.surveyResponse.findMany({
        where: { surveyId },
        select: { answers: true, department: true },
      });

      const { overallScore, dimensionScores, departmentScores } =
        aggregateOrgScores(
          responses.map((r) => ({
            answers: r.answers as unknown as SurveyAnswers,
            department: r.department || undefined,
          })),
        );

      await prisma.diagnosticReport.create({
        data: {
          surveyId,
          organizationId: survey.organizationId,
          overallScore,
          dimensionScores: JSON.parse(JSON.stringify(dimensionScores)),
          benchmarkComparison: JSON.parse(JSON.stringify(departmentScores)),
        },
      });
    }
  }

  revalidatePath(`/enterprise/${survey.organization.slug}/surveys`);
  revalidatePath(
    `/enterprise/${survey.organization.slug}/surveys/${survey.slug}`,
  );
}

export async function deleteSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") {
    throw new Error("Can only delete draft surveys");
  }

  await requireOrgRole(survey.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  await prisma.survey.delete({ where: { id: surveyId } });

  revalidatePath(`/enterprise/${survey.organization.slug}/surveys`);
}

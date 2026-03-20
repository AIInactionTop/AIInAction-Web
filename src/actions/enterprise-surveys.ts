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
import { standardModules as defaultModules } from "@/data/survey-modules";

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

  const parsedModules = standardModulesRaw
    ? JSON.parse(standardModulesRaw)
    : [];

  // If the input is an array of strings (module IDs), expand to full definitions.
  // If it's already full module objects (from the question editor), use as-is.
  let standardModules: unknown[];
  if (
    Array.isArray(parsedModules) &&
    parsedModules.length > 0 &&
    typeof parsedModules[0] === "string"
  ) {
    standardModules = (parsedModules as string[])
      .map((id) => defaultModules.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => JSON.parse(JSON.stringify(m)));
  } else {
    standardModules = parsedModules;
  }

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

  // Generate invite tokens for all org members
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: survey.organizationId },
    select: { id: true },
  });

  if (members.length > 0) {
    const tokenData = members.map((member) => ({
      surveyId,
      memberId: member.id,
      token: crypto.randomBytes(16).toString("hex"),
    }));

    await prisma.surveyInviteToken.createMany({
      data: tokenData,
      skipDuplicates: true,
    });
  }

  revalidatePath(`/enterprise/${survey.organization.slug}/surveys`);
  revalidatePath(
    `/enterprise/${survey.organization.slug}/surveys/${survey.slug}`,
  );

  return { tokensGenerated: members.length };
}

export async function sendSurveyInvites(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "ACTIVE") throw new Error("Survey is not active");

  await requireOrgRole(survey.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  const tokens = await prisma.surveyInviteToken.findMany({
    where: { surveyId, usedAt: null },
    include: {
      member: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  const baseUrl = process.env.NEXTAUTH_URL || "https://aiinaction.top";

  for (const inviteToken of tokens) {
    const email = inviteToken.member.user.email;
    if (!email) {
      skipped++;
      continue;
    }

    const surveyUrl = `${baseUrl}/survey/${survey.shareToken}?t=${inviteToken.token}`;
    const memberName = inviteToken.member.user.name?.split(" ")[0] || "there";

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "AI In Action <noreply@aiinaction.top>",
        to: email,
        subject: `Survey Invite: ${survey.title} - ${survey.organization.name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Hi ${memberName},</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              You have been invited to participate in the survey <strong>"${survey.title}"</strong> by <strong>${survey.organization.name}</strong>.
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Please click the button below to fill out the survey. This is a unique link for you — please do not share it.
            </p>
            <div style="margin-top: 32px;">
              <a href="${surveyUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
                Fill Survey
              </a>
            </div>
            <p style="color: #9a9a9a; font-size: 14px; margin-top: 40px;">
              — The ${survey.organization.name} Team
            </p>
          </div>
        `,
      });
      sent++;
    } catch {
      skipped++;
    }
  }

  return { sent, skipped };
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

  // Get IP for recording
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";

  const inviteTokenValue = (formData.get("inviteToken") as string) || null;
  let inviteTokenId: string | null = null;
  let tokenMemberDepartment: string | null = null;
  let tokenMemberJobTitle: string | null = null;
  let tokenMemberEmail: string | null = null;
  let tokenMemberUserId: string | null = null;

  if (inviteTokenValue) {
    // Token-based submission: validate the invite token
    const inviteToken = await prisma.surveyInviteToken.findUnique({
      where: { token: inviteTokenValue },
      include: {
        member: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!inviteToken) throw new Error("Invalid invite token");
    if (inviteToken.surveyId !== surveyId) throw new Error("Token does not match this survey");
    if (inviteToken.usedAt) throw new Error("This invite link has already been used");

    // Mark token as used
    await prisma.surveyInviteToken.update({
      where: { id: inviteToken.id },
      data: { usedAt: new Date() },
    });

    inviteTokenId = inviteToken.id;
    tokenMemberDepartment = inviteToken.member.department1;
    tokenMemberJobTitle = inviteToken.member.jobTitle;
    tokenMemberEmail = inviteToken.member.user.email;
    tokenMemberUserId = inviteToken.member.user.id;
  } else {
    // Anonymous/cookie-based submission: apply rate limiting

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

    // Set cookie to prevent double submit (24 hours)
    cookieStore.set(submitCookieName, "1", {
      maxAge: 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Parse answers
  const answersRaw = formData.get("answers") as string;
  if (!answersRaw) throw new Error("Answers are required");
  const answers = JSON.parse(answersRaw) as SurveyAnswers;

  // Calculate score
  const aiReadinessScore = calculateAiReadinessScore(answers);

  // Get respondent info: prefer token member data, fall back to form/session
  const session = await auth();
  const respondentId = tokenMemberUserId || session?.user?.id || null;
  const respondentEmail = tokenMemberEmail || (formData.get("email") as string) || null;
  const department = tokenMemberDepartment || (formData.get("department") as string) || null;
  const jobTitle = tokenMemberJobTitle || (formData.get("jobTitle") as string) || null;

  await prisma.surveyResponse.create({
    data: {
      surveyId,
      respondentId,
      respondentEmail,
      department,
      jobTitle,
      ip,
      inviteTokenId,
      answers: JSON.parse(JSON.stringify(answers)),
      aiReadinessScore,
    },
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

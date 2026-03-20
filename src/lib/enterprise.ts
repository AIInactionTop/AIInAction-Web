import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// ---------------------
// Organization queries
// ---------------------

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      _count: { select: { members: true, surveys: true } },
    },
  });
}

export async function getUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganizationMembers(orgId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getOrganizationMember(orgId: string, userId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
}

// ---------------------
// Survey queries
// ---------------------

export type SurveyFilters = {
  status?: "DRAFT" | "ACTIVE" | "CLOSED";
  page?: number;
  pageSize?: number;
};

export async function getSurveys(orgId: string, filters: SurveyFilters = {}) {
  const { status, page = 1, pageSize = 20 } = filters;

  const where: Prisma.SurveyWhereInput = { organizationId: orgId };
  if (status) where.status = status;

  const [surveys, total] = await Promise.all([
    prisma.survey.findMany({
      where,
      include: {
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.survey.count({ where }),
  ]);

  return { surveys, total, page, pageSize };
}

export async function getSurveyById(id: string) {
  return prisma.survey.findUnique({
    where: { id },
    include: {
      organization: true,
      _count: { select: { responses: true } },
    },
  });
}

export async function getSurveyByShareToken(shareToken: string) {
  return prisma.survey.findUnique({
    where: { shareToken },
    include: {
      organization: { select: { id: true, name: true, slug: true, logo: true } },
    },
  });
}

export async function getSurveyResponses(surveyId: string) {
  return prisma.surveyResponse.findMany({
    where: { surveyId },
    include: {
      respondent: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getSurveyResponseCount(surveyId: string): Promise<number> {
  return prisma.surveyResponse.count({ where: { surveyId } });
}

// ---------------------
// Report queries
// ---------------------

export async function getReports(orgId: string) {
  return prisma.diagnosticReport.findMany({
    where: { organizationId: orgId },
    include: {
      survey: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { generatedAt: "desc" },
  });
}

export async function getReportById(id: string) {
  return prisma.diagnosticReport.findUnique({
    where: { id },
    include: {
      survey: true,
      organization: true,
    },
  });
}

// ---------------------
// Training queries
// ---------------------

export async function getTrainingPlans(orgId: string) {
  return prisma.trainingPlan.findMany({
    where: { organizationId: orgId },
    include: {
      report: { select: { id: true, overallScore: true, generatedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTrainingPlanById(id: string) {
  return prisma.trainingPlan.findUnique({
    where: { id },
    include: {
      report: true,
      organization: true,
    },
  });
}

// ---------------------
// ROI queries
// ---------------------

export async function getROIEstimate(orgId: string, reportId: string) {
  return prisma.rOIEstimate.findFirst({
    where: { organizationId: orgId, reportId },
  });
}

// ---------------------
// Progress queries
// ---------------------

export async function getProgressRecords(orgId: string) {
  return prisma.transformationProgress.findMany({
    where: { organizationId: orgId },
    include: {
      survey: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { period: "asc" },
  });
}

// ---------------------
// Industry benchmark
// ---------------------

export async function getIndustryBenchmark(industry: string) {
  const reports = await prisma.diagnosticReport.findMany({
    where: {
      organization: { industry: industry as Prisma.EnumIndustryFilter["equals"] },
    },
    select: {
      overallScore: true,
      organizationId: true,
    },
  });

  // Group by organization to get one score per org
  const orgScores = new Map<string, number[]>();
  for (const r of reports) {
    const scores = orgScores.get(r.organizationId) ?? [];
    scores.push(r.overallScore);
    orgScores.set(r.organizationId, scores);
  }

  if (orgScores.size < 3) return null;

  // Use latest score per org (last entry since we didn't sort)
  const avgPerOrg = Array.from(orgScores.values()).map(
    (scores) => scores[scores.length - 1],
  );

  avgPerOrg.sort((a, b) => a - b);
  const industryAvg = avgPerOrg.reduce((s, v) => s + v, 0) / avgPerOrg.length;
  const topIdx = Math.max(0, Math.floor(avgPerOrg.length * 0.9) - 1);
  const industryTop = avgPerOrg[topIdx];

  return { industryAvg: Math.round(industryAvg * 10) / 10, industryTop: Math.round(industryTop * 10) / 10 };
}

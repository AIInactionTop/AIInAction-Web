"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { aggregateOrgScores } from "@/lib/enterprise-scoring";
import {
  generateDiagnosticNarrative,
  generateTrainingSuggestions,
  generateROIAnalysis,
} from "@/lib/enterprise-ai";
import { getIndustryBenchmark, getSurveyResponses } from "@/lib/enterprise";
import type { SurveyAnswers, ROIInput, DimensionScores } from "@/types/enterprise";

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

export async function generateDiagnosticReport(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      organization: true,
    },
  });
  if (!survey) throw new Error("Survey not found");

  await requireOrgRole(survey.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  // Fetch all responses
  const responses = await getSurveyResponses(surveyId);

  if (responses.length === 0) {
    throw new Error("No responses available to generate report");
  }

  // Aggregate scores
  const { overallScore, dimensionScores } =
    aggregateOrgScores(
      responses.map((r) => ({
        answers: r.answers as unknown as SurveyAnswers,
        department: r.department || undefined,
      })),
    );

  // Get industry benchmark
  const benchmark = await getIndustryBenchmark(survey.organization.industry);

  // Create report with scores (narrative will be generated asynchronously)
  const report = await prisma.diagnosticReport.create({
    data: {
      surveyId,
      organizationId: survey.organizationId,
      overallScore,
      dimensionScores: JSON.parse(JSON.stringify(dimensionScores)),
      benchmarkComparison: benchmark
        ? JSON.parse(JSON.stringify(benchmark))
        : undefined,
    },
  });

  // Trigger narrative generation in the background
  generateReportNarrative(report.id).then(() => {
    // Narrative generated successfully
  }).catch((err) => {
    console.error("Failed to generate report narrative:", err);
  });

  revalidatePath(`/enterprise/${survey.organization.slug}/reports`);
  revalidatePath(
    `/enterprise/${survey.organization.slug}/reports/${report.id}`,
  );

  return report.id;
}

export async function generateReportNarrative(reportId: string) {
  const report = await prisma.diagnosticReport.findUnique({
    where: { id: reportId },
    include: {
      organization: true,
      survey: true,
    },
  });
  if (!report) throw new Error("Report not found");

  // Fetch responses for open-ended summary
  const responses = await getSurveyResponses(report.surveyId);

  // Build open-ended summaries from responses
  const openEndedSummaries: Record<string, string[]> = {};
  for (const resp of responses) {
    const answers = resp.answers as unknown as SurveyAnswers;
    if (answers.custom) {
      for (const [qId, answer] of Object.entries(answers.custom)) {
        if (typeof answer === "string" && answer.trim()) {
          if (!openEndedSummaries[qId]) openEndedSummaries[qId] = [];
          openEndedSummaries[qId].push(answer.trim());
        }
      }
    }
  }

  // Aggregate department scores for narrative input
  const { dimensionScores, departmentScores } = aggregateOrgScores(
    responses.map((r) => ({
      answers: r.answers as unknown as SurveyAnswers,
      department: r.department || undefined,
    })),
  );

  const benchmark = report.benchmarkComparison as {
    industryAvg: number;
    industryTop: number;
  } | null;

  const result = await generateDiagnosticNarrative({
    orgName: report.organization.name,
    orgIndustry: report.organization.industry,
    orgSize: report.organization.size,
    overallScore: report.overallScore,
    dimensionScores: dimensionScores,
    departmentScores,
    benchmark,
    openEndedSummaries:
      Object.keys(openEndedSummaries).length > 0
        ? openEndedSummaries
        : undefined,
  });

  await prisma.diagnosticReport.update({
    where: { id: reportId },
    data: {
      aiNarrative: result.narrative,
      recommendations: result.recommendations,
    },
  });

  revalidatePath(`/enterprise/${report.organization.slug}/reports`);
  revalidatePath(
    `/enterprise/${report.organization.slug}/reports/${reportId}`,
  );
}

export async function createTrainingPlan(reportId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await prisma.diagnosticReport.findUnique({
    where: { id: reportId },
    include: {
      organization: true,
      survey: true,
    },
  });
  if (!report) throw new Error("Report not found");

  await requireOrgRole(report.organizationId, session.user.id, [
    "OWNER",
    "ADMIN",
  ]);

  const dimensionScores = report.dimensionScores as unknown as DimensionScores;

  // Find weak dimensions (score < 50)
  const weakDimensions: string[] = [];
  const dimensionLabels: Record<string, string> = {
    aiAwareness: "AI Awareness",
    aiUsage: "AI Tool Usage",
    processAutomation: "Workflow & Automation",
    learningWillingness: "Learning Willingness",
  };

  for (const [key, score] of Object.entries(dimensionScores)) {
    if (typeof score === "number" && score < 50) {
      weakDimensions.push(key);
    }
  }

  // Build department weaknesses from benchmark/department data
  const responses = await getSurveyResponses(report.surveyId);
  const { departmentScores } = aggregateOrgScores(
    responses.map((r) => ({
      answers: r.answers as unknown as SurveyAnswers,
      department: r.department || undefined,
    })),
  );

  const departmentWeaknesses: Record<string, string[]> = {};
  for (const [dept, data] of Object.entries(departmentScores)) {
    const weakAreas: string[] = [];
    for (const [dim, score] of Object.entries(data.dimensionScores)) {
      if (typeof score === "number" && score < 50) {
        weakAreas.push(dimensionLabels[dim] || dim);
      }
    }
    if (weakAreas.length > 0) {
      departmentWeaknesses[dept] = weakAreas;
    }
  }

  // Match weak dimensions to platform categories
  const categoryMapping: Record<string, string[]> = {
    aiAwareness: ["AI Agents", "AI Coding"],
    aiUsage: ["AI Writing", "AI Image", "AI Video", "AI Audio"],
    processAutomation: ["AI Data", "AI Agents"],
    learningWillingness: ["Web", "Game", "Mobile"],
  };

  const targetRoles = weakDimensions.flatMap(
    (dim) => categoryMapping[dim] || [],
  );
  const uniqueTargetRoles = [...new Set(targetRoles)];

  // Build recommendations based on weak areas
  const recommendations = weakDimensions.map((dim) => ({
    dimension: dim,
    label: dimensionLabels[dim] || dim,
    score: dimensionScores[dim as keyof DimensionScores],
    suggestedCategories: categoryMapping[dim] || [],
  }));

  // Gather learning preferences from responses
  const learningPreferences: string[] = [];
  for (const resp of responses) {
    const answers = resp.answers as unknown as SurveyAnswers;
    const prefs = answers.modules?.learningWillingness?.preferredFormats;
    if (Array.isArray(prefs)) {
      for (const p of prefs) {
        if (typeof p === "string" && !learningPreferences.includes(p)) {
          learningPreferences.push(p);
        }
      }
    }
  }

  // Generate AI suggestions
  const aiSuggestions = await generateTrainingSuggestions({
    dimensionScores,
    departmentWeaknesses,
    learningPreferences:
      learningPreferences.length > 0
        ? learningPreferences
        : ["online courses", "hands-on projects"],
    orgIndustry: report.organization.industry,
  });

  const plan = await prisma.trainingPlan.create({
    data: {
      organizationId: report.organizationId,
      reportId,
      targetRoles: uniqueTargetRoles,
      recommendations: JSON.parse(JSON.stringify(recommendations)),
      aiSuggestions,
    },
  });

  revalidatePath(`/enterprise/${report.organization.slug}/training`);

  return plan.id;
}

export async function calculateROI(
  orgSlug: string,
  reportId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
  if (!org) throw new Error("Organization not found");

  await requireOrgRole(org.id, session.user.id, ["OWNER", "ADMIN"]);

  const report = await prisma.diagnosticReport.findUnique({
    where: { id: reportId },
  });
  if (!report || report.organizationId !== org.id) {
    throw new Error("Report not found");
  }

  // Parse ROI inputs from formData
  const roiInputRaw = formData.get("roiInput") as string;
  if (!roiInputRaw) throw new Error("ROI input is required");
  const roiInput = JSON.parse(roiInputRaw) as ROIInput;

  // Calculate costs based on survey data and input
  const totalHeadcount = Object.values(roiInput.departmentHeadcounts).reduce(
    (s, v) => s + v,
    0,
  );
  const monthlyLaborCost = totalHeadcount * roiInput.averageMonthlySalary;

  // Estimate time savings based on AI readiness score
  // Higher readiness = less room for improvement but easier adoption
  const dimensionScores = report.dimensionScores as unknown as DimensionScores;
  const avgScore =
    (dimensionScores.aiAwareness +
      dimensionScores.aiUsage +
      dimensionScores.processAutomation +
      dimensionScores.learningWillingness) /
    4;

  // Estimate 10-30% savings depending on current readiness
  const savingsRate = Math.max(0.1, 0.3 - avgScore / 500);

  const currentCosts: Record<string, number> = {
    monthlyLabor: monthlyLaborCost,
    aiToolsCurrent: roiInput.aiToolMonthlyCost * roiInput.implementationMonths,
  };

  const projectedSavings: Record<string, number> = {};
  for (const [dept, count] of Object.entries(roiInput.departmentHeadcounts)) {
    projectedSavings[dept] =
      Math.round(
        count *
          roiInput.averageMonthlySalary *
          savingsRate *
          roiInput.implementationMonths *
          100,
      ) / 100;
  }

  const totalSavings = Object.values(projectedSavings).reduce(
    (s, v) => s + v,
    0,
  );

  const implementationCosts: Record<string, number> = {
    training: roiInput.trainingBudget,
    aiTools:
      roiInput.aiToolMonthlyCost * roiInput.implementationMonths * 1.5,
    integration: roiInput.trainingBudget * 0.5,
  };

  const totalImplementation = Object.values(implementationCosts).reduce(
    (s, v) => s + v,
    0,
  );
  const roiPercentage =
    totalImplementation > 0
      ? Math.round(
          ((totalSavings - totalImplementation) / totalImplementation) * 100,
        )
      : 0;

  // Generate AI analysis
  const aiAnalysis = await generateROIAnalysis({
    currentCosts,
    projectedSavings,
    implementationCosts,
    timelineMonths: roiInput.implementationMonths,
    roiPercentage,
    orgName: org.name,
  });

  // Upsert ROI estimate
  const existing = await prisma.rOIEstimate.findFirst({
    where: { organizationId: org.id, reportId },
  });

  if (existing) {
    await prisma.rOIEstimate.update({
      where: { id: existing.id },
      data: {
        currentCosts: JSON.parse(JSON.stringify(currentCosts)),
        projectedSavings: JSON.parse(JSON.stringify(projectedSavings)),
        implementationCosts: JSON.parse(JSON.stringify(implementationCosts)),
        timelineMonths: roiInput.implementationMonths,
        roiPercentage,
        aiAnalysis,
      },
    });
  } else {
    await prisma.rOIEstimate.create({
      data: {
        organizationId: org.id,
        reportId,
        currentCosts: JSON.parse(JSON.stringify(currentCosts)),
        projectedSavings: JSON.parse(JSON.stringify(projectedSavings)),
        implementationCosts: JSON.parse(JSON.stringify(implementationCosts)),
        timelineMonths: roiInput.implementationMonths,
        roiPercentage,
        aiAnalysis,
      },
    });
  }

  revalidatePath(`/enterprise/${orgSlug}/roi`);
}

export async function createProgressRecord(
  orgId: string,
  surveyId: string,
  period: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER", "ADMIN"]);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });
  if (!org) throw new Error("Organization not found");

  // Aggregate current metrics from survey responses
  const responses = await getSurveyResponses(surveyId);
  const { overallScore, dimensionScores, departmentScores } =
    aggregateOrgScores(
      responses.map((r) => ({
        answers: r.answers as unknown as SurveyAnswers,
        department: r.department || undefined,
      })),
    );

  const metrics = {
    overallScore,
    dimensionScores,
    departmentScores,
    responseCount: responses.length,
  };

  // Find previous period record to link
  const previousRecord = await prisma.transformationProgress.findFirst({
    where: {
      organizationId: orgId,
      nextPeriod: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const record = await prisma.transformationProgress.create({
    data: {
      organizationId: orgId,
      surveyId,
      period,
      metrics: JSON.parse(JSON.stringify(metrics)),
      previousPeriodId: previousRecord?.id || null,
    },
  });

  revalidatePath(`/enterprise/${org.slug}/progress`);

  return record.id;
}

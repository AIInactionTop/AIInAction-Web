import type { SurveyAnswers, DimensionScores } from "@/types/enterprise";
import { DIMENSION_WEIGHTS } from "@/types/enterprise";
import { standardModules } from "@/data/survey-modules";
import type { QuestionDef, StandardModuleId } from "@/data/survey-modules";

const SCORABLE_MODULES: StandardModuleId[] = [
  "aiAwareness",
  "aiUsage",
  "processAutomation",
  "learningWillingness",
];

function scoreQuestion(
  question: QuestionDef,
  answer: number | string | string[] | undefined,
): number {
  if (answer === undefined || answer === null || answer === "") return 0;

  const maxScore = question.maxScore ?? 0;

  switch (question.type) {
    case "rating": {
      const value = typeof answer === "number" ? answer : Number(answer);
      if (isNaN(value)) return 0;
      const min = question.min ?? 1;
      const max = question.max ?? 5;
      return ((value - min) / (max - min)) * maxScore;
    }

    case "single":
    case "judgment": {
      if (!question.options) return 0;
      const opt = question.options.find(
        (o) => String(o.value) === String(answer),
      );
      return opt?.score ?? 0;
    }

    case "multiple": {
      if (!question.options || !Array.isArray(answer)) return 0;
      const selected = answer as string[];
      let total = 0;
      for (const opt of question.options) {
        if (selected.includes(String(opt.value))) {
          total += opt.score ?? 0;
        }
      }
      return Math.min(total, maxScore);
    }

    case "number": {
      const value = typeof answer === "number" ? answer : Number(answer);
      if (isNaN(value)) return 0;
      const max = question.max ?? 100;
      return Math.min((value / max) * maxScore, maxScore);
    }

    case "open": {
      const text = String(answer).trim();
      if (!text) return 0;
      if (text.length < 20) return maxScore * 0.3;
      if (text.length < 50) return maxScore * 0.6;
      return maxScore;
    }

    case "matrix": {
      // Baseline heuristic: give half score if any data provided
      if (answer && (typeof answer === "object" || typeof answer === "string")) {
        const hasData =
          typeof answer === "string"
            ? answer.trim().length > 0
            : Array.isArray(answer)
              ? answer.length > 0
              : Object.keys(answer).length > 0;
        return hasData ? maxScore * 0.5 : 0;
      }
      return 0;
    }

    default:
      return 0;
  }
}

export function calculateDimensionScores(
  answers: SurveyAnswers,
): DimensionScores {
  const result: Record<string, number> = {};

  for (const moduleId of SCORABLE_MODULES) {
    const mod = standardModules.find((m) => m.id === moduleId);
    if (!mod || mod.maxScore === 0) {
      result[moduleId] = 0;
      continue;
    }

    const moduleAnswers = answers.modules?.[moduleId] ?? {};
    let totalScore = 0;

    for (const q of mod.questions) {
      if (!q.scorable) continue;
      totalScore += scoreQuestion(q, moduleAnswers[q.id]);
    }

    // Convert to 0-100 percentage
    result[moduleId] = Math.round((totalScore / mod.maxScore) * 100 * 10) / 10;
  }

  return result as unknown as DimensionScores;
}

export function calculateAiReadinessScore(answers: SurveyAnswers): number {
  const dimensions = calculateDimensionScores(answers);

  let score = 0;
  for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    score += (dimensions[key as keyof DimensionScores] ?? 0) * weight;
  }

  return Math.round(score * 10) / 10;
}

export function aggregateOrgScores(
  responses: { answers: SurveyAnswers; department?: string }[],
) {
  if (responses.length === 0) {
    return {
      overallScore: 0,
      dimensionScores: {
        aiAwareness: 0,
        aiUsage: 0,
        processAutomation: 0,
        learningWillingness: 0,
      } as DimensionScores,
      departmentScores: {} as Record<
        string,
        { overallScore: number; dimensionScores: DimensionScores; count: number }
      >,
    };
  }

  const allDimensions: DimensionScores[] = [];
  const allReadiness: number[] = [];
  const deptMap = new Map<
    string,
    { scores: number[]; dimensions: DimensionScores[] }
  >();

  for (const resp of responses) {
    const dims = calculateDimensionScores(resp.answers);
    const readiness = calculateAiReadinessScore(resp.answers);

    allDimensions.push(dims);
    allReadiness.push(readiness);

    // Group by department (from basicInfo module or the response-level field)
    const dept =
      resp.department ||
      (resp.answers.modules?.basicInfo?.department as string) ||
      "Unknown";

    if (!deptMap.has(dept)) {
      deptMap.set(dept, { scores: [], dimensions: [] });
    }
    const group = deptMap.get(dept)!;
    group.scores.push(readiness);
    group.dimensions.push(dims);
  }

  // Aggregate overall
  const overallScore =
    Math.round(
      (allReadiness.reduce((s, v) => s + v, 0) / allReadiness.length) * 10,
    ) / 10;

  const dimensionScores: DimensionScores = {
    aiAwareness: avg(allDimensions.map((d) => d.aiAwareness)),
    aiUsage: avg(allDimensions.map((d) => d.aiUsage)),
    processAutomation: avg(allDimensions.map((d) => d.processAutomation)),
    learningWillingness: avg(allDimensions.map((d) => d.learningWillingness)),
  };

  // Aggregate by department
  const departmentScores: Record<
    string,
    { overallScore: number; dimensionScores: DimensionScores; count: number }
  > = {};

  for (const [dept, group] of deptMap.entries()) {
    departmentScores[dept] = {
      overallScore: avg(group.scores),
      dimensionScores: {
        aiAwareness: avg(group.dimensions.map((d) => d.aiAwareness)),
        aiUsage: avg(group.dimensions.map((d) => d.aiUsage)),
        processAutomation: avg(
          group.dimensions.map((d) => d.processAutomation),
        ),
        learningWillingness: avg(
          group.dimensions.map((d) => d.learningWillingness),
        ),
      },
      count: group.scores.length,
    };
  }

  return { overallScore, dimensionScores, departmentScores };
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return (
    Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
  );
}

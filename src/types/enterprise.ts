// Answer structure stored in SurveyResponse.answers JSON field
export type SurveyAnswers = {
  modules: Record<string, Record<string, number | string | string[]>>;
  custom?: Record<string, number | string | string[]>;
};

// Dimension scores stored in DiagnosticReport.dimensionScores JSON field
// Aligned with the 4 scoring dimensions from spec Section 5
export type DimensionScores = {
  aiAwareness: number;          // AI 认知水平 (0-100) — from module 2
  aiUsage: number;              // AI 工具使用 (0-100) — from module 3
  processAutomation: number;    // 流程与自动化 (0-100) — from module 4
  learningWillingness: number;  // 学习意愿 (0-100) — from module 5
};

// Scoring weights
export const DIMENSION_WEIGHTS = {
  aiAwareness: 0.20,
  aiUsage: 0.30,
  processAutomation: 0.25,
  learningWillingness: 0.25,
} as const;

// Grade thresholds
export type Grade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
}

// Custom question types
export type QuestionType = "single" | "multiple" | "rating" | "open" | "matrix" | "number";

export type CustomQuestion = {
  id: string;
  type: QuestionType;
  question: string;
  questionZh?: string;
  options?: string[];
  optionsZh?: string[];
  min?: number;
  max?: number;
  required?: boolean;
};

// ROI input/output types
export type ROIInput = {
  averageMonthlySalary: number;
  departmentHeadcounts: Record<string, number>;
  aiToolMonthlyCost: number;
  trainingBudget: number;
  implementationMonths: number;
};

export type ROIOutput = {
  currentTimeCost: number;
  projectedSavings: number;
  implementationCost: number;
  roiPercentage: number;
  paybackMonths: number;
};

// Reserved slugs that conflict with static routes
export const RESERVED_SLUGS = ["create", "join", "new", "settings", "members", "surveys", "reports", "training", "roi", "progress"];

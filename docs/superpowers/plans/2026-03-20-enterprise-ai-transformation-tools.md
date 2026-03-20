# Enterprise AI Transformation Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete enterprise AI digital transformation toolkit to AIInAction — covering organization management, AI readiness surveys, diagnostic reports, training recommendations, ROI calculation, and progress tracking.

**Architecture:** New `/enterprise` route module with Prisma models for organizations and surveys. Scoring engine calculates AI readiness per response; Claude API generates narrative reports. All pages follow existing patterns: Server Components for data fetching, client components for interactivity, `next-intl` for i18n.

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL, NextAuth v5, `@anthropic-ai/sdk` (existing), Recharts (new), `@react-pdf/renderer` (new), Resend (existing), `next-intl` (existing)

**Spec:** `docs/superpowers/specs/2026-03-20-enterprise-ai-transformation-tools-design.md`

---

## File Structure Overview

### New Files

| File | Responsibility |
|------|---------------|
| `src/types/enterprise.ts` | TypeScript types for surveys, answers, scores, reports |
| `src/lib/enterprise.ts` | Query functions for orgs, surveys, reports, training, ROI, progress |
| `src/lib/enterprise-scoring.ts` | Rule engine: calculate per-response and per-org scores |
| `src/lib/enterprise-ai.ts` | AI report generation, training suggestions, ROI analysis |
| `src/actions/enterprise-org.ts` | Server Actions: org CRUD, members, invites |
| `src/actions/enterprise-surveys.ts` | Server Actions: survey CRUD, response submission |
| `src/actions/enterprise-reports.ts` | Server Actions: report generation, training plans, ROI |
| `src/data/survey-modules.ts` | Standard survey module definitions (questions, options, scoring rules) |
| `src/app/[locale]/enterprise/page.tsx` | Module landing page |
| `src/app/[locale]/enterprise/create/page.tsx` | Create organization page |
| `src/app/[locale]/enterprise/join/[token]/page.tsx` | Accept invite page |
| `src/app/[locale]/enterprise/[slug]/layout.tsx` | Shared layout with sidebar navigation |
| `src/app/[locale]/enterprise/[slug]/page.tsx` | Organization dashboard |
| `src/app/[locale]/enterprise/[slug]/members/page.tsx` | Member management page |
| `src/app/[locale]/enterprise/[slug]/settings/page.tsx` | Organization settings page |
| `src/app/[locale]/enterprise/[slug]/surveys/page.tsx` | Survey list page |
| `src/app/[locale]/enterprise/[slug]/surveys/new/page.tsx` | Create survey page |
| `src/app/[locale]/enterprise/[slug]/surveys/[id]/page.tsx` | Survey detail page |
| `src/app/[locale]/enterprise/[slug]/surveys/[id]/edit/page.tsx` | Edit survey page |
| `src/app/[locale]/enterprise/[slug]/reports/page.tsx` | Reports list page |
| `src/app/[locale]/enterprise/[slug]/reports/[id]/page.tsx` | Report detail page |
| `src/app/[locale]/enterprise/[slug]/training/page.tsx` | Training plans list |
| `src/app/[locale]/enterprise/[slug]/training/[id]/page.tsx` | Training plan detail |
| `src/app/[locale]/enterprise/[slug]/roi/page.tsx` | ROI calculator page |
| `src/app/[locale]/enterprise/[slug]/progress/page.tsx` | Progress dashboard page |
| `src/app/[locale]/survey/[shareToken]/page.tsx` | Public survey fill page |
| `src/components/enterprise/` | Client components directory (forms, charts, dashboards) |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 8 models, 4 enums, 3 User relations |
| `src/components/layout/header.tsx` | Add Enterprise link to user dropdown |
| `messages/en.json` | Add `enterprise` namespace |
| `messages/zh.json` | Add `enterprise` namespace |
| `package.json` | Add `recharts`, `@react-pdf/renderer` |

---

## Task 1: Install Dependencies and Update Prisma Schema

**Files:**
- Modify: `package.json`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install new dependencies**

```bash
pnpm add recharts @react-pdf/renderer
```

- [ ] **Step 2: Add enums to Prisma schema**

Add these enums at the end of `prisma/schema.prisma` (before any new models):

```prisma
enum Industry {
  TECHNOLOGY
  FINANCE
  HEALTHCARE
  EDUCATION
  MANUFACTURING
  RETAIL
  OTHER
}

enum OrganizationSize {
  SMALL_1_50
  MEDIUM_51_200
  LARGE_201_1000
  ENTERPRISE_1000_PLUS
}

enum OrgMemberRole {
  OWNER
  ADMIN
  MEMBER
}

enum SurveyStatus {
  DRAFT
  ACTIVE
  CLOSED
}
```

- [ ] **Step 3: Add Organization, OrganizationMember, OrganizationInvite models**

Copy models exactly from spec Section 1.1. Ensure `@@map` table names are correct.

- [ ] **Step 4: Add Survey, SurveyResponse models**

Copy from spec Section 1.2. Include `@@index([surveyId, submittedAt])` on SurveyResponse. Additionally, add an `ip` field for rate limiting:

```prisma
  ip              String?   // For rate limiting on public surveys
```

Add this field after `jobTitle` in the SurveyResponse model.

- [ ] **Step 5: Add DiagnosticReport model**

Copy from spec Section 1.3. Include `@@index([organizationId, generatedAt])`.

- [ ] **Step 6: Add TrainingPlan, ROIEstimate, TransformationProgress models**

Copy from spec Section 1.4. Include `@@unique([organizationId, period])` on TransformationProgress.

- [ ] **Step 7: Add reverse relations to User model**

In the `User` model (around line 78 of schema), add before the closing `}`:

```prisma
  ownedOrganizations      Organization[]          @relation("OrgOwner")
  organizationMemberships OrganizationMember[]
  surveyResponses         SurveyResponse[]
```

- [ ] **Step 8: Generate migration and Prisma client**

```bash
pnpm db:generate
pnpm exec prisma migrate dev --name add_enterprise
```

Verify: Migration file created in `prisma/migrations/`. No errors in output. Check with `pnpm db:studio` that new tables appear.

Note: Use `prisma migrate dev` (not `db:push`) to generate a proper migration file, per spec Section 7.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma package.json pnpm-lock.yaml
git commit -m "feat(enterprise): add Prisma schema for enterprise AI transformation tools"
```

---

## Task 2: TypeScript Types and Survey Module Definitions

**Files:**
- Create: `src/types/enterprise.ts`
- Create: `src/data/survey-modules.ts`

- [ ] **Step 1: Create TypeScript types**

Create `src/types/enterprise.ts` with all shared types:

```typescript
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
```

- [ ] **Step 2: Create standard survey module definitions**

Create `src/data/survey-modules.ts` — this defines all 5 standard modules with their questions, options, and scoring rules. This is the single source of truth for survey content.

```typescript
export type StandardModuleId = "basicInfo" | "aiAwareness" | "aiUsage" | "processAutomation" | "learningWillingness";

export type QuestionDef = {
  id: string;
  type: "single" | "multiple" | "rating" | "open" | "number" | "matrix" | "judgment";
  labelEn: string;
  labelZh: string;
  options?: { value: string | number; labelEn: string; labelZh: string; score?: number }[];
  min?: number;
  max?: number;
  scorable: boolean;
  maxScore?: number;
};

export type StandardModule = {
  id: StandardModuleId;
  nameEn: string;
  nameZh: string;
  descriptionEn: string;
  descriptionZh: string;
  questions: QuestionDef[];
  maxScore: number; // 0 for basicInfo
};

export const standardModules: StandardModule[] = [
  {
    id: "basicInfo",
    nameEn: "Basic Information",
    nameZh: "基本信息",
    descriptionEn: "General information about the respondent",
    descriptionZh: "填写者的基本工作信息",
    maxScore: 0,
    questions: [
      {
        id: "department",
        type: "open",
        labelEn: "Department",
        labelZh: "部门",
        scorable: false,
      },
      {
        id: "jobTitle",
        type: "open",
        labelEn: "Job Title",
        labelZh: "岗位名称",
        scorable: false,
      },
      {
        id: "yearsOfWork",
        type: "single",
        labelEn: "Years of work experience",
        labelZh: "工作年限",
        options: [
          { value: "0-2", labelEn: "0-2 years", labelZh: "0-2年" },
          { value: "3-5", labelEn: "3-5 years", labelZh: "3-5年" },
          { value: "6-10", labelEn: "6-10 years", labelZh: "6-10年" },
          { value: "10+", labelEn: "10+ years", labelZh: "10年以上" },
        ],
        scorable: false,
      },
      {
        id: "dailyWorkHours",
        type: "number",
        labelEn: "Average daily work hours",
        labelZh: "日均工作时长",
        min: 1,
        max: 16,
        scorable: false,
      },
      {
        id: "workContentTypes",
        type: "multiple",
        labelEn: "Main work content types",
        labelZh: "主要工作内容类型",
        options: [
          { value: "documents", labelEn: "Documents", labelZh: "文档" },
          { value: "data", labelEn: "Data", labelZh: "数据" },
          { value: "code", labelEn: "Code", labelZh: "代码" },
          { value: "design", labelEn: "Design", labelZh: "设计" },
          { value: "communication", labelEn: "Communication", labelZh: "沟通" },
          { value: "management", labelEn: "Management", labelZh: "管理" },
        ],
        scorable: false,
      },
    ],
  },
  {
    id: "aiAwareness",
    nameEn: "AI Awareness",
    nameZh: "AI 认知水平",
    descriptionEn: "Understanding of AI concepts and trends",
    descriptionZh: "对 AI 概念和趋势的了解程度",
    maxScore: 100,
    questions: [
      {
        id: "aiConceptUnderstanding",
        type: "rating",
        labelEn: "How well do you understand basic AI concepts?",
        labelZh: "对 AI 基本概念的了解程度？",
        min: 1, max: 5,
        scorable: true, maxScore: 25,
        // score = (value - 1) / 4 * 25
      },
      {
        id: "aiScenarioJudgment1",
        type: "judgment",
        labelEn: "AI can fully replace human creativity in all tasks",
        labelZh: "AI 可以在所有任务中完全替代人类创造力",
        options: [
          { value: "true", labelEn: "True", labelZh: "正确", score: 0 },
          { value: "false", labelEn: "False", labelZh: "错误", score: 8 },
        ],
        scorable: true, maxScore: 8,
      },
      {
        id: "aiScenarioJudgment2",
        type: "judgment",
        labelEn: "AI assistants can help summarize documents and extract key information",
        labelZh: "AI 助手可以帮助总结文档并提取关键信息",
        options: [
          { value: "true", labelEn: "True", labelZh: "正确", score: 8 },
          { value: "false", labelEn: "False", labelZh: "错误", score: 0 },
        ],
        scorable: true, maxScore: 8,
      },
      {
        id: "aiScenarioJudgment3",
        type: "judgment",
        labelEn: "AI models require no human oversight when making business decisions",
        labelZh: "AI 模型在做业务决策时不需要人工监督",
        options: [
          { value: "true", labelEn: "True", labelZh: "正确", score: 0 },
          { value: "false", labelEn: "False", labelZh: "错误", score: 9 },
        ],
        scorable: true, maxScore: 9,
      },
      {
        id: "aiTrendAwareness",
        type: "rating",
        labelEn: "How closely do you follow AI development trends?",
        labelZh: "对 AI 发展趋势的关注度？",
        min: 1, max: 5,
        scorable: true, maxScore: 25,
      },
      {
        id: "aiImpactAwareness",
        type: "open",
        labelEn: "How do you think AI will impact your work?",
        labelZh: "AI 对自身工作影响的认知",
        scorable: true, maxScore: 25,
        // Scored by length/quality heuristic: empty=0, <20chars=8, <50chars=16, >=50chars=25
      },
    ],
  },
  {
    id: "aiUsage",
    nameEn: "AI Tool Usage",
    nameZh: "AI 工具使用情况",
    descriptionEn: "Current AI tool usage frequency and depth",
    descriptionZh: "当前 AI 工具的使用频率和深度",
    maxScore: 100,
    questions: [
      {
        id: "aiToolFrequency",
        type: "single",
        labelEn: "How often do you use AI tools?",
        labelZh: "AI 工具使用频率？",
        options: [
          { value: "never", labelEn: "Never", labelZh: "从不", score: 0 },
          { value: "occasionally", labelEn: "Occasionally (1-2/week)", labelZh: "偶尔(每周1-2次)", score: 8 },
          { value: "frequently", labelEn: "Frequently (daily)", labelZh: "经常(每天)", score: 15 },
          { value: "deeply", labelEn: "Deeply dependent", labelZh: "深度依赖", score: 20 },
        ],
        scorable: true, maxScore: 20,
      },
      {
        id: "aiToolList",
        type: "multiple",
        labelEn: "Which AI tools do you use?",
        labelZh: "你主要使用哪些 AI 工具？",
        options: [
          { value: "chatgpt", labelEn: "ChatGPT", labelZh: "ChatGPT", score: 3 },
          { value: "claude", labelEn: "Claude", labelZh: "Claude", score: 3 },
          { value: "copilot", labelEn: "GitHub Copilot", labelZh: "GitHub Copilot", score: 3 },
          { value: "midjourney", labelEn: "Midjourney/DALL-E", labelZh: "Midjourney/DALL-E", score: 3 },
          { value: "other", labelEn: "Other", labelZh: "其他", score: 3 },
        ],
        scorable: true, maxScore: 15,
        // score = min(sum of selected scores, 15)
      },
      {
        id: "aiToolScenarios",
        type: "matrix",
        labelEn: "Usage scenarios for each tool",
        labelZh: "各工具的使用场景",
        scorable: true, maxScore: 15,
        // Matrix: rows=tools, cols=scenarios. Score based on breadth of usage.
      },
      {
        id: "aiEfficiency",
        type: "rating",
        labelEn: "How much has AI improved your efficiency?",
        labelZh: "使用 AI 后效率提升感受？",
        min: 1, max: 5,
        scorable: true, maxScore: 20,
      },
      {
        id: "aiObstacles",
        type: "multiple",
        labelEn: "Obstacles in using AI tools",
        labelZh: "AI 使用中遇到的障碍",
        options: [
          { value: "cost", labelEn: "Cost", labelZh: "费用", score: -2 },
          { value: "complexity", labelEn: "Too complex", labelZh: "太复杂", score: -2 },
          { value: "policy", labelEn: "Company policy", labelZh: "公司政策", score: -2 },
          { value: "privacy", labelEn: "Privacy concerns", labelZh: "隐私顾虑", score: -2 },
          { value: "none", labelEn: "No obstacles", labelZh: "没有障碍", score: 10 },
        ],
        scorable: true, maxScore: 10,
        // Inverse scoring: fewer obstacles = higher score. "none" = max.
      },
      {
        id: "weeklyAiHours",
        type: "number",
        labelEn: "Weekly hours using AI tools",
        labelZh: "每周使用 AI 的时间（小时）",
        min: 0, max: 40,
        scorable: true, maxScore: 20,
        // score = min(value / 10 * 20, 20)
      },
    ],
  },
  {
    id: "processAutomation",
    nameEn: "Workflow & Automation",
    nameZh: "工作流程与自动化",
    descriptionEn: "Current automation level and potential",
    descriptionZh: "当前自动化水平和潜力",
    maxScore: 100,
    questions: [
      {
        id: "repetitiveTaskRatio",
        type: "number",
        labelEn: "Percentage of daily repetitive tasks",
        labelZh: "日常重复性任务占比（%）",
        min: 0, max: 100,
        scorable: true, maxScore: 20,
        // Inverse: lower ratio = higher automation readiness is complex.
        // Use: score = 20 (acknowledging the baseline, actual scoring considers context)
      },
      {
        id: "automatedProcesses",
        type: "multiple",
        labelEn: "Currently automated processes",
        labelZh: "当前已自动化的流程",
        options: [
          { value: "email", labelEn: "Email filtering/templates", labelZh: "邮件过滤/模板", score: 4 },
          { value: "reports", labelEn: "Report generation", labelZh: "报告生成", score: 4 },
          { value: "data", labelEn: "Data entry/processing", labelZh: "数据录入/处理", score: 4 },
          { value: "scheduling", labelEn: "Scheduling", labelZh: "日程安排", score: 4 },
          { value: "none", labelEn: "None", labelZh: "无", score: 0 },
        ],
        scorable: true, maxScore: 20,
      },
      {
        id: "aiOptimizableAreas",
        type: "open",
        labelEn: "Which areas could AI optimize?",
        labelZh: "认为可以用 AI 优化的环节",
        scorable: true, maxScore: 20,
        // Scored by response quality heuristic
      },
      {
        id: "aiWorkflowWillingness",
        type: "rating",
        labelEn: "Willingness to adopt AI workflows",
        labelZh: "对引入 AI 工作流的意愿",
        min: 1, max: 5,
        scorable: true, maxScore: 20,
      },
      {
        id: "dataDecisionLevel",
        type: "rating",
        labelEn: "Degree of data-driven decision making",
        labelZh: "数据驱动决策的程度",
        min: 1, max: 5,
        scorable: true, maxScore: 20,
      },
    ],
  },
  {
    id: "learningWillingness",
    nameEn: "Learning Willingness & Needs",
    nameZh: "学习意愿与需求",
    descriptionEn: "Willingness to learn AI and preferred methods",
    descriptionZh: "学习 AI 的意愿和偏好方式",
    maxScore: 100,
    questions: [
      {
        id: "weeklyLearningHours",
        type: "number",
        labelEn: "Weekly hours willing to invest in learning AI",
        labelZh: "愿意投入学习 AI 的时间（每周小时）",
        min: 0, max: 20,
        scorable: true, maxScore: 25,
        // score = min(value / 5 * 25, 25)
      },
      {
        id: "learningMethods",
        type: "multiple",
        labelEn: "Preferred learning methods",
        labelZh: "偏好的学习方式",
        options: [
          { value: "video", labelEn: "Video courses", labelZh: "视频课程", score: 5 },
          { value: "docs", labelEn: "Documentation", labelZh: "文档", score: 5 },
          { value: "projects", labelEn: "Hands-on projects", labelZh: "实战项目", score: 5 },
          { value: "training", labelEn: "Training classes", labelZh: "培训班", score: 5 },
          { value: "peer", labelEn: "Peer guidance", labelZh: "同事指导", score: 5 },
        ],
        scorable: true, maxScore: 25,
      },
      {
        id: "learningAreas",
        type: "multiple",
        labelEn: "AI areas most interested in learning",
        labelZh: "最想学习的 AI 能力领域",
        options: [
          { value: "writing", labelEn: "AI Writing", labelZh: "AI 写作", score: 5 },
          { value: "coding", labelEn: "AI Coding", labelZh: "AI 编程", score: 5 },
          { value: "data", labelEn: "Data Analysis", labelZh: "数据分析", score: 5 },
          { value: "image", labelEn: "Image Generation", labelZh: "图像生成", score: 5 },
          { value: "video", labelEn: "Video Creation", labelZh: "视频创作", score: 5 },
          { value: "automation", labelEn: "Automation", labelZh: "自动化", score: 5 },
        ],
        scorable: true, maxScore: 25,
      },
      {
        id: "trainingExpectations",
        type: "open",
        labelEn: "Expectations for company AI training",
        labelZh: "对企业组织 AI 培训的期望",
        scorable: true, maxScore: 25,
        // Scored by response quality heuristic
      },
    ],
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/types/enterprise.ts src/data/survey-modules.ts
git commit -m "feat(enterprise): add TypeScript types and survey module definitions"
```

---

## Task 3: Query Functions (`src/lib/enterprise.ts`)

**Files:**
- Create: `src/lib/enterprise.ts`

- [ ] **Step 1: Create organization query functions**

Follow the pattern from `src/lib/jobs.ts`. Functions needed:

```typescript
import { prisma } from "./prisma";
import type { Prisma, OrgMemberRole } from "@prisma/client";

// Organization queries
export async function getOrganizationBySlug(slug: string) { ... }
export async function getUserOrganizations(userId: string) { ... }
export async function getOrganizationMembers(orgId: string) { ... }
export async function getOrganizationMember(orgId: string, userId: string) { ... }

// Survey queries
export type SurveyFilters = { status?: "DRAFT" | "ACTIVE" | "CLOSED"; page?: number; pageSize?: number };
export async function getSurveys(orgId: string, filters?: SurveyFilters) { ... }
export async function getSurveyById(id: string) { ... }
export async function getSurveyByShareToken(shareToken: string) { ... }
export async function getSurveyResponses(surveyId: string) { ... }
export async function getSurveyResponseCount(surveyId: string): Promise<number> { ... }

// Report queries
export async function getReports(orgId: string) { ... }
export async function getReportById(id: string) { ... }

// Training queries
export async function getTrainingPlans(orgId: string) { ... }
export async function getTrainingPlanById(id: string) { ... }

// ROI queries
export async function getROIEstimate(orgId: string, reportId: string) { ... }

// Progress queries
export async function getProgressRecords(orgId: string) { ... }

// Industry benchmark (anonymous aggregation)
export async function getIndustryBenchmark(industry: string) { ... }
```

Each function should:
- Use `prisma` from `@/lib/prisma`
- Include appropriate `include` clauses for relations
- Support pagination where applicable (follow `getJobs` pattern)
- Use `Promise.all` for parallel queries where beneficial

- [ ] **Step 2: Commit**

```bash
git add src/lib/enterprise.ts
git commit -m "feat(enterprise): add query functions for enterprise module"
```

---

## Task 4: Scoring Engine (`src/lib/enterprise-scoring.ts`)

**Files:**
- Create: `src/lib/enterprise-scoring.ts`

- [ ] **Step 1: Implement scoring engine**

```typescript
import type { SurveyAnswers, DimensionScores } from "@/types/enterprise";
import { DIMENSION_WEIGHTS } from "@/types/enterprise";
import { standardModules } from "@/data/survey-modules";

// Calculate individual AI readiness score from survey answers
export function calculateAiReadinessScore(answers: SurveyAnswers): number { ... }

// Calculate dimension scores from survey answers
export function calculateDimensionScores(answers: SurveyAnswers): DimensionScores { ... }

// Aggregate scores across multiple responses for an organization
export function aggregateOrgScores(responses: { answers: SurveyAnswers }[]): {
  overallScore: number;
  dimensionScores: DimensionScores;
  departmentScores: Record<string, { score: number; dimensions: DimensionScores; count: number }>;
} { ... }
```

Logic:
- For each response, iterate through scorable modules and sum weighted scores
- `aiReadinessScore` = weighted sum using `DIMENSION_WEIGHTS`
- Organization `overallScore` = mean of all individual scores
- Department breakdown: group by `answers.modules.basicInfo.department`, calculate per-group

- [ ] **Step 2: Commit**

```bash
git add src/lib/enterprise-scoring.ts
git commit -m "feat(enterprise): add AI readiness scoring engine"
```

---

## Task 5: AI Report Generation (`src/lib/enterprise-ai.ts`)

**Files:**
- Create: `src/lib/enterprise-ai.ts`

- [ ] **Step 1: Implement AI narrative generation**

Reuse the existing Anthropic client pattern from `src/lib/ai.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { DimensionScores } from "@/types/enterprise";

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
const client = new Anthropic({
  // @ts-expect-error httpAgent is supported at runtime but not in SDK types
  httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
});

type ReportInput = {
  orgName: string;
  industry: string;
  size: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  departmentScores: Record<string, { score: number; count: number }>;
  benchmark: { industryAvg: number; industryTop: number } | null;
  openEndedSummary: string; // Concatenated open-ended answers
};

// Generate diagnostic narrative (800-1500 words) + 3-5 recommendations
export async function generateDiagnosticNarrative(input: ReportInput): Promise<{
  narrative: string;
  recommendations: string[];
}> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildDiagnosticPrompt(input) }],
  });
  // Parse response...
}

// Generate training suggestions
export async function generateTrainingSuggestions(input: {
  dimensionScores: DimensionScores;
  departmentWeaknesses: Record<string, string[]>;
  learningPreferences: string[];
}): Promise<string> { ... }

// Generate ROI analysis narrative
export async function generateROIAnalysis(input: {
  roiPercentage: number;
  paybackMonths: number;
  currentCosts: number;
  projectedSavings: number;
}): Promise<string> { ... }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/enterprise-ai.ts
git commit -m "feat(enterprise): add AI narrative generation for reports and training"
```

---

## Task 6: Server Actions — Organization Management (`src/actions/enterprise-org.ts`)

**Files:**
- Create: `src/actions/enterprise-org.ts`

- [ ] **Step 1: Implement organization CRUD and member management**

Follow pattern from `src/actions/jobs.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RESERVED_SLUGS } from "@/types/enterprise";
import crypto from "crypto";

// Slug helpers (follow jobs.ts pattern)
function slugify(text: string): string { ... }
async function generateUniqueSlug(base: string): Promise<string> { ... }

// Validate slug is not reserved
function validateSlug(slug: string): boolean {
  return !RESERVED_SLUGS.includes(slug);
}

export async function createOrganization(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  // Extract form data, generate slug, validate not reserved
  // Create org + add owner as OrganizationMember with role OWNER
  // revalidatePath, redirect to /enterprise/[slug]
}

export async function updateOrganization(orgId: string, formData: FormData) {
  // Auth + ownership check (OWNER/ADMIN only)
  // Update org fields
}

export async function deleteOrganization(orgId: string) {
  // Auth + OWNER only check
  // Cascade delete handled by Prisma
}

export async function inviteMember(orgId: string, formData: FormData) {
  // Auth + OWNER/ADMIN check
  // Generate unique token, create OrganizationInvite
  // Send email via Resend (follow src/lib/email.ts pattern)
}

export async function acceptInvite(token: string) {
  // Find invite by token, check not expired, check not already accepted
  // Create OrganizationMember, mark invite accepted
}

export async function removeMember(orgId: string, memberId: string) {
  // Auth + OWNER only (ADMIN can't remove others)
  // Cannot remove self if OWNER
}

export async function updateMemberRole(orgId: string, memberId: string, role: OrgMemberRole) {
  // Auth + OWNER only
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/enterprise-org.ts
git commit -m "feat(enterprise): add server actions for organization management"
```

---

## Task 7: Server Actions — Surveys (`src/actions/enterprise-surveys.ts`)

**Files:**
- Create: `src/actions/enterprise-surveys.ts`

- [ ] **Step 1: Implement survey CRUD and response submission**

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateAiReadinessScore } from "@/lib/enterprise-scoring";
import crypto from "crypto";
import { cookies, headers } from "next/headers";

export async function createSurvey(orgSlug: string, formData: FormData) {
  // Auth + OWNER/ADMIN check
  // Generate slug and shareToken (crypto.randomBytes)
  // Parse standardModules (JSON) and customQuestions (JSON)
  // Create survey, redirect to detail page
}

export async function updateSurvey(surveyId: string, formData: FormData) {
  // Auth + OWNER/ADMIN check + survey must be DRAFT
}

export async function publishSurvey(surveyId: string) {
  // Change status to ACTIVE, set startsAt
}

export async function closeSurvey(surveyId: string) {
  // Change status to CLOSED, set endsAt
}

export async function submitSurveyResponse(surveyId: string, formData: FormData) {
  // Can be called by authenticated or anonymous users
  // Rate limiting: check IP (from headers) — max 3/hour per IP
  // Cookie check: if already submitted, reject
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  // Check recent submissions from same IP (max 3 per hour)
  const recentCount = await prisma.surveyResponse.count({
    where: {
      surveyId,
      ip,
      submittedAt: { gte: new Date(Date.now() - 3600000) },
    },
  });
  if (recentCount >= 3) throw new Error("Rate limit exceeded");

  // Parse answers JSON, calculate aiReadinessScore
  const answers = JSON.parse(formData.get("answers") as string);
  const score = calculateAiReadinessScore(answers);

  // Create SurveyResponse
  // Set cookie to prevent double submit

  // Check auto-trigger: if response rate >= 50%, trigger report generation
  const [responseCount, memberCount] = await Promise.all([
    prisma.surveyResponse.count({ where: { surveyId } }),
    prisma.organizationMember.count({ where: { organizationId: survey.organizationId } }),
  ]);
  if (responseCount / memberCount >= 0.5) {
    // Trigger report generation (call generateDiagnosticReport action)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/enterprise-surveys.ts
git commit -m "feat(enterprise): add server actions for survey management and response submission"
```

---

## Task 8: Server Actions — Reports, Training, ROI (`src/actions/enterprise-reports.ts`)

**Files:**
- Create: `src/actions/enterprise-reports.ts`

- [ ] **Step 1: Implement report generation and related actions**

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aggregateOrgScores } from "@/lib/enterprise-scoring";
import { generateDiagnosticNarrative, generateTrainingSuggestions, generateROIAnalysis } from "@/lib/enterprise-ai";
import { getIndustryBenchmark } from "@/lib/enterprise";
import { revalidatePath } from "next/cache";

export async function generateDiagnosticReport(surveyId: string) {
  // Auth + OWNER/ADMIN check
  // Fetch all responses for this survey
  // Run scoring engine: aggregateOrgScores
  // Get industry benchmark (may return null if insufficient data)
  // Create DiagnosticReport with scores (aiNarrative = null initially)
  // Kick off AI narrative generation (non-blocking)
  // revalidatePath
}

// Called after report creation to fill in AI narrative
export async function generateReportNarrative(reportId: string) {
  // Fetch report + org + responses
  // Call generateDiagnosticNarrative
  // Update report with aiNarrative and recommendations
  // revalidatePath
}

export async function generateTrainingPlan(reportId: string) {
  // Auth + OWNER/ADMIN check
  // Analyze weak dimensions (< 50)
  // Match to platform Categories and LearningPaths
  // Call generateTrainingSuggestions for AI narrative
  // Create TrainingPlan
}

export async function calculateROI(orgSlug: string, reportId: string, formData: FormData) {
  // Auth + OWNER/ADMIN check
  // Parse ROI inputs from formData
  // Calculate using survey data (repetitive task %, headcount)
  // Call generateROIAnalysis for narrative
  // Create or update ROIEstimate
}

export async function createProgressRecord(orgId: string, surveyId: string, period: string) {
  // Called after report generation
  // Snapshot key metrics
  // Link to previous period if exists
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/enterprise-reports.ts
git commit -m "feat(enterprise): add server actions for reports, training, and ROI"
```

---

## Task 9: i18n — Add Enterprise Namespace

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

- [ ] **Step 1: Add enterprise namespace to en.json**

Add an `"enterprise"` key to the top-level JSON object in `messages/en.json`:

```json
"enterprise": {
  "title": "Enterprise AI Transformation",
  "subtitle": "Comprehensive toolkit for enterprise AI digital transformation",
  "createOrg": "Create Organization",
  "joinOrg": "Join Organization",
  "myOrgs": "My Organizations",
  "noOrgs": "You haven't created or joined any organizations yet.",
  "orgName": "Organization Name",
  "orgDescription": "Description",
  "industry": "Industry",
  "orgSize": "Organization Size",
  "dashboard": "Dashboard",
  "members": "Members",
  "surveys": "Surveys",
  "reports": "Reports",
  "training": "Training",
  "roi": "ROI Calculator",
  "progress": "Progress",
  "settings": "Settings",
  "inviteMember": "Invite Member",
  "createSurvey": "Create Survey",
  "surveyTitle": "Survey Title",
  "surveyDescription": "Description",
  "standardModules": "Standard Modules",
  "customQuestions": "Custom Questions",
  "publish": "Publish",
  "close": "Close Survey",
  "shareLink": "Share Link",
  "responses": "Responses",
  "responseRate": "Response Rate",
  "generateReport": "Generate Report",
  "generating": "Generating...",
  "overallScore": "Overall Score",
  "aiReadiness": "AI Readiness",
  "dimensions": "Dimensions",
  "aiAwareness": "AI Awareness",
  "aiUsage": "AI Usage",
  "toolCoverage": "Tool Coverage",
  "processAutomation": "Process Automation",
  "dataDecisionMaking": "Data-Driven Decision Making",
  "industryComparison": "Industry Comparison",
  "insufficientData": "Insufficient data for comparison. More organizations needed.",
  "departmentBreakdown": "Department Breakdown",
  "aiAnalysis": "AI Analysis",
  "recommendations": "Recommendations",
  "exportPdf": "Export PDF",
  "trainingPlan": "Training Plan",
  "generateTrainingPlan": "Generate Training Plan",
  "recommendedPaths": "Recommended Learning Paths",
  "roiCalculator": "ROI Calculator",
  "avgSalary": "Average Monthly Salary",
  "aiToolCost": "AI Tool Monthly Cost",
  "trainingBudget": "Training Budget",
  "timeline": "Implementation Timeline (months)",
  "calculate": "Calculate ROI",
  "currentCost": "Current Time Cost",
  "projectedSavings": "Projected Savings",
  "roiPercentage": "ROI",
  "paybackPeriod": "Payback Period",
  "progressDashboard": "Transformation Progress",
  "period": "Period",
  "trend": "Trend",
  "adoptionRate": "AI Tool Adoption Rate",
  "avgProficiency": "Average AI Proficiency",
  "automatedProcesses": "Automated Processes",
  "trainingCompletion": "Training Completion Rate",
  "topImproving": "Most Improved Departments",
  "TECHNOLOGY": "Technology",
  "FINANCE": "Finance",
  "HEALTHCARE": "Healthcare",
  "EDUCATION": "Education",
  "MANUFACTURING": "Manufacturing",
  "RETAIL": "Retail",
  "OTHER": "Other",
  "SMALL_1_50": "1-50 employees",
  "MEDIUM_51_200": "51-200 employees",
  "LARGE_201_1000": "201-1000 employees",
  "ENTERPRISE_1000_PLUS": "1000+ employees",
  "OWNER": "Owner",
  "ADMIN": "Admin",
  "MEMBER": "Member"
}
```

- [ ] **Step 2: Add enterprise namespace to zh.json**

Add the Chinese translations under the same `"enterprise"` key. All labels should be translated to Chinese. Survey questions use the labels defined in `src/data/survey-modules.ts`.

- [ ] **Step 3: Add nav label**

Add to `"nav"` namespace in both files:
- en.json: `"enterprise": "Enterprise"`
- zh.json: `"enterprise": "企业转型"`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat(enterprise): add i18n translations for enterprise module"
```

---

## Task 10: Navigation — Add Enterprise to User Dropdown

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Add Enterprise link to user dropdown menu**

In `src/components/layout/header.tsx`, find the `<DropdownMenuContent>` section inside the user avatar dropdown (around line 130). Add an Enterprise link before the Profile link:

```tsx
<DropdownMenuItem asChild>
  <Link href="/enterprise">
    <Building2 className="mr-2 h-4 w-4" />
    {t("enterprise")}
  </Link>
</DropdownMenuItem>
```

Import `Building2` from `lucide-react`. The `Link` is already imported from `@/i18n/navigation` which auto-prepends locale — do NOT manually add locale prefix. The `t` function should include the nav namespace.

Also add to mobile menu if there's a separate logged-in section.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat(enterprise): add enterprise link to user dropdown navigation"
```

---

## Task 11: Enterprise Module Landing Page

**Files:**
- Create: `src/app/[locale]/enterprise/page.tsx`
- Create: `src/components/enterprise/enterprise-landing.tsx`

- [ ] **Step 1: Create landing page (Server Component)**

```typescript
// src/app/[locale]/enterprise/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/enterprise";
import { EnterpriseLanding } from "@/components/enterprise/enterprise-landing";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function EnterprisePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const orgs = session?.user?.id ? await getUserOrganizations(session.user.id) : [];
  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));
  return <EnterpriseLanding orgs={serialize(orgs)} isAuthenticated={!!session?.user} />;
}
```

- [ ] **Step 2: Create landing client component**

`src/components/enterprise/enterprise-landing.tsx` — Shows:
- Hero section explaining the module
- 5 tool cards (Survey, Report, Training, ROI, Progress) with icons and descriptions
- If authenticated: list of user's organizations + "Create Organization" button
- If not authenticated: "Sign in to get started" CTA

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/enterprise/ src/components/enterprise/
git commit -m "feat(enterprise): add module landing page"
```

---

## Task 12: Create Organization Page

**Files:**
- Create: `src/app/[locale]/enterprise/create/page.tsx`
- Create: `src/components/enterprise/org-form.tsx`

- [ ] **Step 1: Create the page and form**

Server page fetches translations, renders `OrgForm` client component.
`OrgForm` has fields: name, description, industry (select), size (select).
Form submits via `createOrganization` server action.

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/create/ src/components/enterprise/org-form.tsx
git commit -m "feat(enterprise): add create organization page and form"
```

---

## Task 13: Accept Invite Page

**Files:**
- Create: `src/app/[locale]/enterprise/join/[token]/page.tsx`

- [ ] **Step 1: Create join page**

Server component that:
- Looks up invite by token
- If expired/accepted, shows error
- If valid, shows org name + "Join" button
- Button calls `acceptInvite` server action
- Redirects to `/enterprise/[slug]` on success

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/join/
git commit -m "feat(enterprise): add invite acceptance page"
```

---

## Task 14: Enterprise Slug Layout (Sidebar Navigation)

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/layout.tsx`
- Create: `src/components/enterprise/enterprise-sidebar.tsx`

- [ ] **Step 1: Create shared layout with sidebar**

Layout should:
- Fetch organization by slug (404 if not found)
- Check user is a member (redirect to `/enterprise` if not)
- Render sidebar with nav items: Dashboard, Members, Surveys, Reports, Training, ROI, Progress, Settings
- Settings only visible to OWNER/ADMIN
- Pass org data and member role to children via props or context

Use `lucide-react` icons: `LayoutDashboard`, `Users`, `ClipboardList`, `FileBarChart`, `GraduationCap`, `Calculator`, `TrendingUp`, `Settings`.

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/layout.tsx src/components/enterprise/enterprise-sidebar.tsx
git commit -m "feat(enterprise): add enterprise layout with sidebar navigation"
```

---

## Task 15: Organization Dashboard Page

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/page.tsx`
- Create: `src/components/enterprise/dashboard-client.tsx`

- [ ] **Step 1: Create dashboard page**

Server component fetches:
- Organization details
- Member count
- Latest survey + response rate
- Latest report (if exists) — overall score + dimension scores
- Latest progress record (if exists)

Client component renders:
- 4 stat cards (members, response rate, AI maturity grade, quarterly progress)
- Radar chart (Recharts `RadarChart`) for 5 dimensions (if report exists)
- Recent activity list
- "No data yet" state if no surveys have been run

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/page.tsx src/components/enterprise/dashboard-client.tsx
git commit -m "feat(enterprise): add organization dashboard with stats and radar chart"
```

---

## Task 16: Members Management Page

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/members/page.tsx`
- Create: `src/components/enterprise/members-client.tsx`

- [ ] **Step 1: Create members page**

Server component fetches member list. Client component renders:
- Member table: avatar, name, email, department, jobTitle, role, joined date
- Invite form (OWNER/ADMIN): email + role select + send button
- Role change dropdown (OWNER only)
- Remove button (OWNER only, cannot remove self)
- Pending invites list

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/members/ src/components/enterprise/members-client.tsx
git commit -m "feat(enterprise): add member management page with invite and role controls"
```

---

## Task 17: Organization Settings Page

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/settings/page.tsx`
- Create: `src/components/enterprise/settings-form.tsx`

- [ ] **Step 1: Create settings page**

Only accessible to OWNER/ADMIN. Form to edit: name, description, industry, size, logo.
Danger zone: delete organization (OWNER only, with confirmation dialog).

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/settings/ src/components/enterprise/settings-form.tsx
git commit -m "feat(enterprise): add organization settings page"
```

---

## Task 18: Survey List and Create Pages

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/surveys/page.tsx`
- Create: `src/app/[locale]/enterprise/[slug]/surveys/new/page.tsx`
- Create: `src/components/enterprise/surveys-list-client.tsx`
- Create: `src/components/enterprise/survey-form.tsx`

- [ ] **Step 1: Create survey list page**

Server component fetches surveys for the org. Client component shows:
- Table/cards with: title, status badge, response count, created date
- "Create Survey" button (OWNER/ADMIN only)
- Filter by status tabs (All/Draft/Active/Closed)

- [ ] **Step 2: Create survey form page**

Survey creation form with:
- Title, description fields
- Standard module toggles (all 5 modules, checkboxes — all on by default)
- Custom questions builder (add/remove questions with type selector)
- Preview button
- Submit calls `createSurvey` server action

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/surveys/ src/components/enterprise/surveys-list-client.tsx src/components/enterprise/survey-form.tsx
git commit -m "feat(enterprise): add survey list and creation pages"
```

---

## Task 19: Survey Detail and Edit Pages

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/surveys/[id]/page.tsx`
- Create: `src/app/[locale]/enterprise/[slug]/surveys/[id]/edit/page.tsx`
- Create: `src/components/enterprise/survey-detail-client.tsx`

- [ ] **Step 1: Create survey detail page**

Shows:
- Survey info (title, status, dates)
- Share link (copy button) when status is ACTIVE
- Response stats: count, rate (responses / org members), by department
- Publish/Close buttons (OWNER/ADMIN)
- "Generate Report" button (when enough responses)
- Response list table (anonymous shows "Anonymous", otherwise user info)

- [ ] **Step 2: Create survey edit page**

Reuse `survey-form.tsx` in edit mode. Pre-fill existing data. Only editable when DRAFT.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/surveys/[id]/ src/components/enterprise/survey-detail-client.tsx
git commit -m "feat(enterprise): add survey detail and edit pages"
```

---

## Task 20: Public Survey Fill Page

**Files:**
- Create: `src/app/[locale]/survey/[shareToken]/page.tsx`
- Create: `src/components/enterprise/survey-fill-client.tsx`

- [ ] **Step 1: Create public survey fill page**

Server component:
- Fetch survey by shareToken via `getSurveyByShareToken`
- If not found or not ACTIVE, show error
- No auth required

Client component (`survey-fill-client.tsx`):
- Multi-step wizard with progress bar (one module per step)
- Question renderers for each type: single, multiple, rating (1-5 stars), open (textarea), number, matrix, judgment
- Navigation: previous/next module buttons
- Final step: review + submit
- Submit calls `submitSurveyResponse` server action
- Success/thank-you page after submit

This is the most complex UI component. Break it down:
- `SurveyFillClient` — wizard container with step state
- Question type renderers inline (each question type renders differently)
- Progress bar at top showing current module / total modules

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/survey/ src/components/enterprise/survey-fill-client.tsx
git commit -m "feat(enterprise): add public survey fill page with multi-step wizard"
```

---

## Task 21: Reports List and Detail Pages

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/reports/page.tsx`
- Create: `src/app/[locale]/enterprise/[slug]/reports/[id]/page.tsx`
- Create: `src/components/enterprise/report-detail-client.tsx`

- [ ] **Step 1: Create reports list page**

Simple list showing: report title (survey name + date), overall score/grade, generated date.

- [ ] **Step 2: Create report detail page**

The richest page. Shows:
- Overall score + grade badge
- Radar chart (Recharts `RadarChart`) for 5 dimensions
- Industry comparison section (or "insufficient data" placeholder)
- Department breakdown table with mini bar charts
- AI narrative section (loading spinner if `aiNarrative` is null, poll every 5s)
- Recommendations list
- "Export PDF" button (calls server-side PDF generation)
- "Generate Training Plan" button

Use Recharts components: `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `BarChart`, `Bar`.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/reports/ src/components/enterprise/report-detail-client.tsx
git commit -m "feat(enterprise): add report list and detail pages with charts"
```

---

## Task 22: Training Plan Pages

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/training/page.tsx`
- Create: `src/app/[locale]/enterprise/[slug]/training/[id]/page.tsx`
- Create: `src/components/enterprise/training-detail-client.tsx`

- [ ] **Step 1: Create training pages**

List page: Shows training plans with associated report date and target roles.

Detail page shows:
- Target roles/departments
- Recommended platform LearningPaths and Challenges (with links)
- AI-generated personalized suggestions
- Department-specific recommendations

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/training/ src/components/enterprise/training-detail-client.tsx
git commit -m "feat(enterprise): add training plan list and detail pages"
```

---

## Task 23: ROI Calculator Page

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/roi/page.tsx`
- Create: `src/components/enterprise/roi-calculator-client.tsx`

- [ ] **Step 1: Create ROI calculator**

Interactive form page:
- Input fields: average salary, department headcounts, AI tool monthly cost, training budget, timeline
- Pre-filled where possible from survey data (repetitive task %, AI usage hours)
- "Calculate" button calls `calculateROI` server action
- Results display: current cost, projected savings, ROI%, payback period
- Bar chart comparing costs vs savings (Recharts `BarChart`)
- AI analysis narrative section

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/roi/ src/components/enterprise/roi-calculator-client.tsx
git commit -m "feat(enterprise): add ROI calculator page"
```

---

## Task 24: Progress Dashboard Page

**Files:**
- Create: `src/app/[locale]/enterprise/[slug]/progress/page.tsx`
- Create: `src/components/enterprise/progress-dashboard-client.tsx`

- [ ] **Step 1: Create progress dashboard**

Shows multi-period comparison:
- Period selector (tabs or dropdown)
- Line chart (Recharts `LineChart`) for key metrics over time: adoption rate, proficiency, automation, training completion
- "Most improved departments" ranking
- AI-generated next-step suggestions
- Empty state if < 2 survey periods

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/enterprise/[slug]/progress/ src/components/enterprise/progress-dashboard-client.tsx
git commit -m "feat(enterprise): add transformation progress dashboard"
```

---

## Task 25: PDF Export (Server-Side)

**Files:**
- Create: `src/app/api/enterprise/reports/[id]/pdf/route.ts`

- [ ] **Step 1: Create PDF export API route**

Server-side only (never imported by client). Uses `@react-pdf/renderer`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReportById } from "@/lib/enterprise";
import { renderToBuffer } from "@react-pdf/renderer";
// Define PDF document component using @react-pdf/renderer primitives

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await getReportById(id);
  // Check user is org member
  // Render PDF
  // Return as download
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/enterprise/
git commit -m "feat(enterprise): add server-side PDF export for diagnostic reports"
```

---

## Task 26: Final Integration and Verification

- [ ] **Step 1: Run lint check**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 2: Run build check**

```bash
pnpm build
```

Fix any type errors or build failures.

- [ ] **Step 3: Manual smoke test**

Start dev server: `pnpm dev`
Verify these flows work:
1. Login → User dropdown shows "Enterprise" link
2. `/enterprise` — landing page renders
3. Create organization → redirects to dashboard
4. Dashboard shows empty state
5. Create survey → form works, modules toggle
6. Publish survey → share link appears
7. Open share link (incognito) → fill wizard works, submit succeeds
8. Survey detail → response count updates
9. Generate report → scores calculate, AI narrative generates
10. Report detail → radar chart renders, department breakdown shows
11. Generate training plan → recommendations appear
12. ROI calculator → form calculates, chart renders
13. Progress dashboard → shows data (or empty state)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(enterprise): final integration fixes and polish"
```

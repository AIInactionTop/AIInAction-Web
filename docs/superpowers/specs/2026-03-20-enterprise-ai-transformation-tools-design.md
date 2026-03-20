# 企业 AI 数字化转型工具 — 设计文档

## 概述

在 AIInAction 平台中新增"企业 AI 数字化转型工具"模块，提供一套完整的工具箱帮助企业评估 AI 现状、生成诊断报告、推荐培训方案、计算 ROI 并追踪转型进度。

**目标用户：** 多角色 — 员工填写调研，管理层/AI 推进团队查看报告和决策工具。

**商业模式：** 先全免费上线验证需求，后续再加付费逻辑。

## 0. User 模型扩展

需要在现有 `User` 模型中添加以下反向关系字段：

```prisma
// 在 User 模型中添加
ownedOrganizations     Organization[]          @relation("OrgOwner")
organizationMemberships OrganizationMember[]
surveyResponses        SurveyResponse[]
```

## 1. 数据模型

### 1.1 组织核心

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

model Organization {
  id          String             @id @default(cuid())
  name        String
  slug        String             @unique
  logo        String?
  description String?            @db.Text
  industry    Industry           @default(OTHER)
  size        OrganizationSize   @default(SMALL_1_50)

  ownerId     String             @map("owner_id")
  owner       User               @relation("OrgOwner", fields: [ownerId], references: [id])

  members     OrganizationMember[]
  invites     OrganizationInvite[]
  surveys     Survey[]
  reports     DiagnosticReport[]
  trainingPlans TrainingPlan[]
  roiEstimates  ROIEstimate[]
  progressRecords TransformationProgress[]

  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@map("organizations")
}

model OrganizationMember {
  id             String        @id @default(cuid())
  organizationId String        @map("organization_id")
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String        @map("user_id")
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           OrgMemberRole @default(MEMBER)
  department     String?
  jobTitle       String?       @map("job_title")
  joinedAt       DateTime      @default(now())

  @@unique([organizationId, userId])
  @@map("organization_members")
}

model OrganizationInvite {
  id             String        @id @default(cuid())
  organizationId String        @map("organization_id")
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  email          String
  token          String        @unique
  role           OrgMemberRole @default(MEMBER)
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime      @default(now())

  @@map("organization_invites")
}
```

### 1.2 调研系统

```prisma
enum SurveyStatus {
  DRAFT
  ACTIVE
  CLOSED
}

model Survey {
  id              String        @id @default(cuid())
  slug            String        @unique
  title           String
  description     String?       @db.Text
  organizationId  String        @map("organization_id")
  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  status          SurveyStatus  @default(DRAFT)
  shareToken      String?       @unique
  standardModules Json          // 启用的标准模块列表
  customQuestions Json?         // 自定义题目
  startsAt        DateTime?
  endsAt          DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  responses       SurveyResponse[]
  reports         DiagnosticReport[]
  progressRecords TransformationProgress[]

  @@map("surveys")
}

model SurveyResponse {
  id              String    @id @default(cuid())
  surveyId        String    @map("survey_id")
  survey          Survey    @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  respondentId    String?   @map("respondent_id")
  respondent      User?     @relation(fields: [respondentId], references: [id], onDelete: SetNull)
  respondentEmail String?   @map("respondent_email")
  department      String?
  jobTitle        String?   @map("job_title")
  answers         Json      // 结构化回答
  aiReadinessScore Float?   @map("ai_readiness_score")
  submittedAt     DateTime  @default(now())

  @@index([surveyId, submittedAt])
  @@map("survey_responses")
}
```

#### SurveyAnswers TypeScript 类型

```typescript
// src/types/enterprise.ts
type SurveyAnswers = {
  modules: Record<string, Record<string, number | string | string[]>>;
  // e.g. { "module2": { "q1": 3, "q2": ["ChatGPT", "Claude"], ... } }
  custom?: Record<string, number | string | string[]>;
};
```

### 1.3 诊断报告

```prisma
model DiagnosticReport {
  id                  String        @id @default(cuid())
  surveyId            String        @map("survey_id")
  survey              Survey        @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  organizationId      String        @map("organization_id")
  organization        Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  overallScore        Float         @map("overall_score")
  dimensionScores     Json          @map("dimension_scores")
  // 维度: AI认知, AI使用频率, 工具覆盖率, 流程自动化, 数据驱动决策
  aiNarrative         String?       @db.Text @map("ai_narrative")
  recommendations     Json?
  benchmarkComparison Json?         @map("benchmark_comparison")
  generatedAt         DateTime      @default(now())

  trainingPlans       TrainingPlan[]
  roiEstimates        ROIEstimate[]

  @@index([organizationId, generatedAt])
  @@map("diagnostic_reports")
}
```

### 1.4 培训推荐、ROI、进度追踪

```prisma
model TrainingPlan {
  id              String           @id @default(cuid())
  organizationId  String           @map("organization_id")
  organization    Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  reportId        String           @map("report_id")
  report          DiagnosticReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  targetRoles     Json             @map("target_roles")
  recommendations Json             // 推荐的 LearningPath 和 Challenge
  aiSuggestions   String?          @db.Text @map("ai_suggestions")
  createdAt       DateTime         @default(now())

  @@map("training_plans")
}

model ROIEstimate {
  id                  String           @id @default(cuid())
  organizationId      String           @map("organization_id")
  organization        Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  reportId            String           @map("report_id")
  report              DiagnosticReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  currentCosts        Json             @map("current_costs")
  projectedSavings    Json             @map("projected_savings")
  implementationCosts Json             @map("implementation_costs")
  timelineMonths      Int              @map("timeline_months")
  roiPercentage       Float            @map("roi_percentage")
  aiAnalysis          String?          @db.Text @map("ai_analysis")
  createdAt           DateTime         @default(now())

  @@map("roi_estimates")
}

model TransformationProgress {
  id               String              @id @default(cuid())
  organizationId   String              @map("organization_id")
  organization     Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  surveyId         String              @map("survey_id")
  survey           Survey              @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  period           String              // "2026-Q1"
  metrics          Json                // AI工具采用率, 平均AI熟练度, 自动化流程数, 培训完成率
  previousPeriodId String?             @map("previous_period_id")
  previousPeriod   TransformationProgress? @relation("ProgressChain", fields: [previousPeriodId], references: [id], onDelete: SetNull)
  nextPeriod       TransformationProgress? @relation("ProgressChain")
  createdAt        DateTime            @default(now())

  @@unique([organizationId, period])
  @@map("transformation_progress")
}
```

## 2. 路由结构

```
/enterprise                          → 模块首页（介绍 + 创建/加入企业入口）
/enterprise/create                   → 创建企业组织
/enterprise/join/[token]             → 接受邀请加入企业

── 企业管理面板（需 OWNER/ADMIN）──
/enterprise/[slug]                   → 企业概览仪表板
/enterprise/[slug]/members           → 成员管理（邀请/移除/角色）
/enterprise/[slug]/settings          → 企业设置

── 调研工具 ──
/enterprise/[slug]/surveys           → 调研列表
/enterprise/[slug]/surveys/new       → 创建调研
/enterprise/[slug]/surveys/[id]      → 调研详情（回收状态/数据概览）
/enterprise/[slug]/surveys/[id]/edit → 编辑调研
/survey/[shareToken]                 → 公开填写页面（无需登录）

── 诊断报告 ──
/enterprise/[slug]/reports           → 报告列表
/enterprise/[slug]/reports/[id]      → 报告详情

── 培训推荐 ──
/enterprise/[slug]/training          → 培训计划列表
/enterprise/[slug]/training/[id]     → 培训计划详情

── ROI 计算器 ──
/enterprise/[slug]/roi               → ROI 估算

── 进度追踪 ──
/enterprise/[slug]/progress          → 转型进度仪表板
```

所有路由位于 `src/app/[locale]/enterprise/` 下，公开填写页位于 `src/app/[locale]/survey/[shareToken]/`。

## 3. 角色权限矩阵

| 页面 | OWNER | ADMIN | MEMBER | 匿名 |
|------|-------|-------|--------|------|
| 企业概览仪表板 | 完整 | 完整 | 只看个人数据 | ❌ |
| 成员管理 | 全部操作 | 邀请/查看 | 查看列表 | ❌ |
| 企业设置 | ✅ | ✅ | ❌ | ❌ |
| 创建/编辑调研 | ✅ | ✅ | ❌ | ❌ |
| 填写调研 | ✅ | ✅ | ✅ | ✅ 通过链接 |
| 查看报告 | 完整 | 完整 | 个人报告 | ❌ |
| 培训计划 | 全局+个人 | 全局+个人 | 个人推荐 | ❌ |
| ROI 计算器 | ✅ | ✅ | ❌ | ❌ |
| 进度仪表板 | ✅ | ✅ | 只看个人 | ❌ |

## 4. 标准调研模块

### 模块 1: 基本信息（4 题，不计分）
- 部门 / 岗位名称
- 工作年限
- 日均工作时长
- 主要工作内容类型（多选：文档/数据/代码/设计/沟通/管理）

### 模块 2: AI 认知水平（5 题，满分 100）
- 对 AI 基本概念的了解程度（单选 1-5）
- 能否区分 AI 应用场景（判断题 × 3）
- 对 AI 发展趋势的关注度（单选 1-5）
- AI 对自身工作影响的认知（开放题）

### 模块 3: AI 工具使用情况（6 题，满分 100）
- AI 工具使用频率（从不/偶尔/经常/深度）
- 使用的 AI 工具列表（多选 + 自填）
- 各工具的使用场景（矩阵题）
- 使用 AI 后效率提升感受（1-5）
- AI 使用中遇到的障碍（多选）
- 每周使用 AI 的时间（小时）

### 模块 4: 工作流程与自动化（5 题，满分 100）
- 日常重复性任务占比（%）
- 当前已自动化的流程（多选）
- 认为可以用 AI 优化的环节（开放题）
- 对引入 AI 工作流的意愿（1-5）
- 数据驱动决策的程度（1-5）

### 模块 5: 学习意愿与需求（4 题，满分 100）
- 愿意投入学习 AI 的时间（每周小时）
- 偏好的学习方式（多选：视频/文档/实战项目/培训班/同事指导）
- 最想学习的 AI 能力领域（多选：写作/编程/数据分析/图像/视频/自动化）
- 对企业组织 AI 培训的期望（开放题）

### 自定义题目

企业可添加 6 种题型：单选、多选、评分（1-5 或 1-10）、开放题、矩阵题、数字题。自定义题目不计入标准评分，但会包含在 AI 诊断分析的输入中。

## 5. 评分体系

### 个人 AI 就绪度评分（aiReadinessScore）

| 维度 | 权重 |
|------|------|
| AI 认知水平 | 20% |
| AI 工具使用 | 30% |
| 流程与自动化 | 25% |
| 学习意愿 | 25% |

### 企业整体评级

| 等级 | 分数范围 |
|------|---------|
| A+ | 90-100 |
| A | 80-89 |
| B+ | 70-79 |
| B | 60-69 |
| C+ | 50-59 |
| C | 40-49 |
| D | 0-39 |

### 报告触发规则
- **自动触发：** 当调研回收率 ≥ 50%（回收数 / 组织成员数）时，在 `SurveyResponse` 创建的 Server Action 末尾检查并触发异步报告生成（调用单独的 `generateDiagnosticReport` Server Action）
- **手动触发：** 管理员可在调研详情页手动触发（任意回收量）
- **异步处理：** 报告生成在 Server Action 中同步计算评分，然后异步调用 Claude API 生成叙述。前端轮询 `DiagnosticReport` 的 `aiNarrative` 字段是否已填充来显示生成状态

## 6. AI 集成

### 诊断报告生成 Pipeline

1. **规则引擎评分** — 遍历回答按权重计算个人分，聚合企业维度均分，按部门分组，同行业对比
2. **AI 叙述生成** — Server Action 调用 Claude API，输入维度评分 + 部门分布 + 行业对比 + 开放题摘要，输出 800-1500 字诊断叙述 + 3-5 条建议，存入 `DiagnosticReport.aiNarrative`

### 培训推荐引擎

- **规则匹配：** 弱项维度（＜50 分）映射到平台 Category，按评分匹配难度（低→Beginner，高→Advanced），关联现有 LearningPath 和 Challenge
- **AI 生成：** 输入部门特点 + 弱项 + 学习偏好，输出针对不同角色的学习路线建议

### ROI 计算器

- **输入：** 管理员填写薪资、预算等 + 调研数据自动引用（重复任务占比、AI 使用现状）
- **输出：** 时间成本节省、ROI%、投资回收期、AI 详细分析

### 进度追踪

基于多次调研的纵向对比，每次新调研完成后自动生成 TransformationProgress 记录。展示趋势折线图、部门排名、AI 下一步建议。

## 7. 技术实现要点

- **AI 调用：** Server Action 中通过 `ANTHROPIC_API_KEY` 环境变量调用 Claude API（复用现有 `src/lib/ai.ts` 如已存在，否则新建 `src/lib/enterprise-ai.ts`）。报告生成为异步任务（生成中显示 loading 状态）
- **问卷存储：** `standardModules`、`customQuestions`、`answers` 均使用 JSON 字段
- **图表库：** Recharts（雷达图、折线图、柱状图）
- **PDF 导出：** @react-pdf/renderer
- **邀请机制：** 唯一 token 链接，通过 Resend 发送邮件（复用现有基础设施）
- **行业对比：** 匿名聚合同行业组织的 overallScore 和 dimensionScores
- **国际化：** 在 `messages/en.json` 和 `messages/zh.json` 中添加 `enterprise` 命名空间，包含所有调研题目和选项的翻译
- **公开调研防滥用：** `/survey/[shareToken]` 页面实施 IP 限流（同一 IP 每小时最多 3 次提交）+ 提交后设置 cookie 防重复填写
- **Slug 保留字：** 组织 slug 创建时校验黑名单（`create`、`join`、`new`、`settings` 等），避免与静态路由冲突
- **PDF 导出：** @react-pdf/renderer 仅在 Server Action / API Route 中使用，不打包到客户端
- **行业对比数据：** MVP 阶段平台数据不足时，显示"数据积累中"提示；后续可引入外部行业研究数据作为基准
- **数据库迁移：** 使用 `prisma migrate dev` 生成正式迁移文件

## 8. 文件结构

```
src/app/[locale]/enterprise/
  page.tsx                           # 模块首页
  create/page.tsx                    # 创建企业
  join/[token]/page.tsx              # 接受邀请
  [slug]/
    page.tsx                         # 企业概览仪表板
    layout.tsx                       # 企业子页面共享 layout（侧边导航）
    members/page.tsx                 # 成员管理
    settings/page.tsx                # 企业设置
    surveys/
      page.tsx                       # 调研列表
      new/page.tsx                   # 创建调研
      [id]/page.tsx                  # 调研详情
      [id]/edit/page.tsx             # 编辑调研
    reports/
      page.tsx                       # 报告列表
      [id]/page.tsx                  # 报告详情
    training/
      page.tsx                       # 培训计划列表
      [id]/page.tsx                  # 培训详情
    roi/page.tsx                     # ROI 计算器
    progress/page.tsx                # 进度仪表板

src/app/[locale]/survey/
  [shareToken]/page.tsx              # 公开填写页面

src/lib/enterprise.ts                # 查询函数
src/lib/enterprise-scoring.ts        # 评分规则引擎
src/lib/enterprise-ai.ts             # AI 报告生成
src/actions/enterprise-org.ts         # Server Actions — 组织 CRUD、成员、邀请
src/actions/enterprise-surveys.ts    # Server Actions — 调研 CRUD、回答提交
src/actions/enterprise-reports.ts    # Server Actions — 报告生成、培训、ROI
src/types/enterprise.ts              # TypeScript 类型定义（SurveyAnswers 等）
src/components/enterprise/           # 企业模块客户端组件
```

## 9. 导航集成

考虑到主导航已有 6 项，`/enterprise` 链接放在用户菜单下拉中（仅登录用户可见），而非主导航栏。企业子页面使用独立的 layout 提供侧边导航（概览/成员/调研/报告/培训/ROI/进度）。

## 10. 环境变量

在 `.env` 中新增：

```
ANTHROPIC_API_KEY    # Claude API key，用于 AI 报告生成和培训推荐
```

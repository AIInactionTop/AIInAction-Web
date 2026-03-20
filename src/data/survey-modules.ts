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
  maxScore: number;
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
        min: 1,
        max: 5,
        scorable: true,
        maxScore: 25,
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
        scorable: true,
        maxScore: 8,
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
        scorable: true,
        maxScore: 8,
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
        scorable: true,
        maxScore: 9,
      },
      {
        id: "aiTrendAwareness",
        type: "rating",
        labelEn: "How closely do you follow AI development trends?",
        labelZh: "对 AI 发展趋势的关注度？",
        min: 1,
        max: 5,
        scorable: true,
        maxScore: 25,
      },
      {
        id: "aiImpactAwareness",
        type: "open",
        labelEn: "How do you think AI will impact your work?",
        labelZh: "AI 对自身工作影响的认知",
        scorable: true,
        maxScore: 25,
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
        scorable: true,
        maxScore: 20,
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
        scorable: true,
        maxScore: 15,
      },
      {
        id: "aiToolScenarios",
        type: "matrix",
        labelEn: "Usage scenarios for each tool",
        labelZh: "各工具的使用场景",
        scorable: true,
        maxScore: 15,
      },
      {
        id: "aiEfficiency",
        type: "rating",
        labelEn: "How much has AI improved your efficiency?",
        labelZh: "使用 AI 后效率提升感受？",
        min: 1,
        max: 5,
        scorable: true,
        maxScore: 20,
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
        scorable: true,
        maxScore: 10,
      },
      {
        id: "weeklyAiHours",
        type: "number",
        labelEn: "Weekly hours using AI tools",
        labelZh: "每周使用 AI 的时间（小时）",
        min: 0,
        max: 40,
        scorable: true,
        maxScore: 20,
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
        min: 0,
        max: 100,
        scorable: true,
        maxScore: 20,
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
        scorable: true,
        maxScore: 20,
      },
      {
        id: "aiOptimizableAreas",
        type: "open",
        labelEn: "Which areas could AI optimize?",
        labelZh: "认为可以用 AI 优化的环节",
        scorable: true,
        maxScore: 20,
      },
      {
        id: "aiWorkflowWillingness",
        type: "rating",
        labelEn: "Willingness to adopt AI workflows",
        labelZh: "对引入 AI 工作流的意愿",
        min: 1,
        max: 5,
        scorable: true,
        maxScore: 20,
      },
      {
        id: "dataDecisionLevel",
        type: "rating",
        labelEn: "Degree of data-driven decision making",
        labelZh: "数据驱动决策的程度",
        min: 1,
        max: 5,
        scorable: true,
        maxScore: 20,
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
        min: 0,
        max: 20,
        scorable: true,
        maxScore: 25,
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
        scorable: true,
        maxScore: 25,
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
        scorable: true,
        maxScore: 25,
      },
      {
        id: "trainingExpectations",
        type: "open",
        labelEn: "Expectations for company AI training",
        labelZh: "对企业组织 AI 培训的期望",
        scorable: true,
        maxScore: 25,
      },
    ],
  },
];

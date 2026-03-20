import Anthropic from "@anthropic-ai/sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { DimensionScores } from "@/types/enterprise";
import { scoreToGrade } from "@/types/enterprise";

const proxyUrl =
  process.env.https_proxy ||
  process.env.HTTPS_PROXY ||
  process.env.http_proxy ||
  process.env.HTTP_PROXY;

const client = new Anthropic({
  // @ts-expect-error httpAgent is supported at runtime but not in SDK types
  httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
});

// ---------------------
// Types
// ---------------------

type ReportInput = {
  orgName: string;
  orgIndustry: string;
  orgSize: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  departmentScores: Record<
    string,
    { overallScore: number; dimensionScores: DimensionScores; count: number }
  >;
  benchmark?: { industryAvg: number; industryTop: number } | null;
  openEndedSummaries?: Record<string, string[]>;
  language?: string;
};

type TrainingSuggestionInput = {
  dimensionScores: DimensionScores;
  departmentWeaknesses: Record<string, string[]>;
  learningPreferences: string[];
  orgIndustry: string;
  language?: string;
};

type ROIAnalysisInput = {
  currentCosts: Record<string, number>;
  projectedSavings: Record<string, number>;
  implementationCosts: Record<string, number>;
  timelineMonths: number;
  roiPercentage: number;
  orgName: string;
  language?: string;
};

// ---------------------
// Diagnostic narrative
// ---------------------

export async function generateDiagnosticNarrative(input: ReportInput): Promise<{
  narrative: string;
  recommendations: string[];
}> {
  const grade = scoreToGrade(input.overallScore);
  const language = input.language || "zh";
  const langLabel = language === "zh" ? "Chinese (中文)" : "English";

  const deptBreakdown = Object.entries(input.departmentScores)
    .map(
      ([dept, data]) =>
        `- ${dept}: score=${data.overallScore}, awareness=${data.dimensionScores.aiAwareness}, usage=${data.dimensionScores.aiUsage}, automation=${data.dimensionScores.processAutomation}, learning=${data.dimensionScores.learningWillingness}, respondents=${data.count}`,
    )
    .join("\n");

  const benchmarkInfo = input.benchmark
    ? `Industry average: ${input.benchmark.industryAvg}, Industry top 10%: ${input.benchmark.industryTop}`
    : "No industry benchmark data available (fewer than 3 organizations in this industry)";

  const openEndedInfo = input.openEndedSummaries
    ? Object.entries(input.openEndedSummaries)
        .map(
          ([q, answers]) =>
            `Question "${q}": ${answers.slice(0, 5).join("; ")}`,
        )
        .join("\n")
    : "No open-ended responses available";

  const prompt = `You are an enterprise AI readiness consultant. Generate a diagnostic report for the following organization.

Organization: ${input.orgName}
Industry: ${input.orgIndustry}
Size: ${input.orgSize}

Overall AI Readiness Score: ${input.overallScore}/100 (Grade: ${grade})

Dimension Scores:
- AI Awareness: ${input.dimensionScores.aiAwareness}/100
- AI Tool Usage: ${input.dimensionScores.aiUsage}/100
- Workflow & Automation: ${input.dimensionScores.processAutomation}/100
- Learning Willingness: ${input.dimensionScores.learningWillingness}/100

Department Breakdown:
${deptBreakdown}

Benchmark:
${benchmarkInfo}

Open-ended Response Summaries:
${openEndedInfo}

Generate the report in ${langLabel}. Return a JSON object with:
{
  "narrative": "800-1500 word diagnostic narrative analyzing the organization's AI readiness, strengths, weaknesses, and comparison to benchmarks",
  "recommendations": ["3-5 specific, actionable recommendations based on the data"]
}

Important:
- Be specific and data-driven, reference actual scores
- Highlight both strengths and areas for improvement
- If benchmark data is available, compare the org to industry peers
- Recommendations should be concrete and implementable
- Return ONLY the JSON object, no markdown fences`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("No text response from AI");

  return JSON.parse(text) as { narrative: string; recommendations: string[] };
}

// ---------------------
// Training suggestions
// ---------------------

export async function generateTrainingSuggestions(
  input: TrainingSuggestionInput,
): Promise<string> {
  const language = input.language || "zh";
  const langLabel = language === "zh" ? "Chinese (中文)" : "English";

  const weaknesses = Object.entries(input.departmentWeaknesses)
    .map(([dept, areas]) => `- ${dept}: ${areas.join(", ")}`)
    .join("\n");

  const prompt = `You are an enterprise AI training consultant. Based on the following diagnostic data, generate training suggestions.

Dimension Scores:
- AI Awareness: ${input.dimensionScores.aiAwareness}/100
- AI Tool Usage: ${input.dimensionScores.aiUsage}/100
- Workflow & Automation: ${input.dimensionScores.processAutomation}/100
- Learning Willingness: ${input.dimensionScores.learningWillingness}/100

Department Weaknesses:
${weaknesses}

Preferred Learning Methods: ${input.learningPreferences.join(", ")}
Industry: ${input.orgIndustry}

Generate a comprehensive training suggestion document in ${langLabel} (600-1000 words) that includes:
1. Priority training areas based on the weakest dimensions
2. Recommended training modules for each department's specific weaknesses
3. Suggested timeline (phased approach)
4. Recommended learning formats based on preferences
5. Industry-specific AI use cases to incorporate

Return ONLY the training suggestion text, no JSON wrapping.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("No text response from AI");

  return text;
}

// ---------------------
// ROI analysis
// ---------------------

export async function generateROIAnalysis(
  input: ROIAnalysisInput,
): Promise<string> {
  const language = input.language || "zh";
  const langLabel = language === "zh" ? "Chinese (中文)" : "English";

  const costs = Object.entries(input.currentCosts)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const savings = Object.entries(input.projectedSavings)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const implCosts = Object.entries(input.implementationCosts)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const prompt = `You are an enterprise AI ROI analyst. Based on the following financial data, generate an ROI analysis narrative.

Organization: ${input.orgName}

Current Costs:
${costs}

Projected Savings (after AI adoption):
${savings}

Implementation Costs:
${implCosts}

Timeline: ${input.timelineMonths} months
ROI Percentage: ${input.roiPercentage}%

Generate an ROI analysis narrative in ${langLabel} (400-800 words) that includes:
1. Summary of the investment case
2. Analysis of cost savings by area
3. Implementation cost breakdown and justification
4. Expected timeline to break even
5. Risk factors and mitigation strategies
6. Long-term value beyond direct cost savings

Return ONLY the analysis text, no JSON wrapping.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("No text response from AI");

  return text;
}

import { generateText } from "ai";

export type ChallengeContent = {
  title: string;
  description: string;
  objectives: string[];
  hints: string[];
};

export type GeneratedChallenge = {
  en: ChallengeContent;
  zh: ChallengeContent;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  tags: string[];
  estimatedTime: string;
  resources: string[];
  categorySlug: string;
};

export async function generateChallenge(
  topic: string,
): Promise<GeneratedChallenge> {
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    maxOutputTokens: 4096,
    prompt: `Generate a hands-on AI challenge project about: "${topic}"

Return a JSON object with this exact structure:
{
  "en": {
    "title": "English title (concise, 3-8 words)",
    "description": "English description (2-3 sentences explaining what to build)",
    "objectives": ["objective 1", "objective 2", "objective 3", "objective 4", "objective 5"],
    "hints": ["hint 1", "hint 2", "hint 3"]
  },
  "zh": {
    "title": "Chinese title",
    "description": "Chinese description",
    "objectives": ["目标1", "目标2", "目标3", "目标4", "目标5"],
    "hints": ["提示1", "提示2", "提示3"]
  },
  "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
  "tags": ["tag1", "tag2", "tag3"],
  "estimatedTime": "e.g. 4-6 hours",
  "resources": ["https://relevant-resource-url.com"],
  "categorySlug": "one of: web, game, mobile, ai-agents, ai-writing, ai-image, ai-video, ai-data, ai-audio, ai-coding"
}

Important:
- The challenge should be a practical, buildable project
- Objectives should be specific and measurable
- Hints should guide without giving away the solution
- Chinese translations should be natural, not literal
- Return ONLY the JSON object, no markdown fences`,
  });

  if (!text) throw new Error("No text response from AI");
  return JSON.parse(text) as GeneratedChallenge;
}

export async function translateChallenge(
  content: ChallengeContent,
  sourceLocale: string,
  targetLocale: string,
): Promise<ChallengeContent> {
  const localeNames: Record<string, string> = {
    en: "English",
    zh: "Chinese",
  };

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    maxOutputTokens: 2048,
    prompt: `Translate this challenge content from ${localeNames[sourceLocale] || sourceLocale} to ${localeNames[targetLocale] || targetLocale}.

Source content:
${JSON.stringify(content, null, 2)}

Return a JSON object with the same structure:
{
  "title": "translated title",
  "description": "translated description",
  "objectives": ["translated objective 1", ...],
  "hints": ["translated hint 1", ...]
}

Important:
- Translate naturally, not literally
- Keep technical terms in their commonly used form for the target language
- Maintain the same level of detail and specificity
- Return ONLY the JSON object, no markdown fences`,
  });

  if (!text) throw new Error("No text response from AI");
  return JSON.parse(text) as ChallengeContent;
}

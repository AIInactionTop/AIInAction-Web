import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const systemPrompt = `You are an expert learning path designer for "AI In Action", a platform for learning AI through hands-on challenge projects.

Your task: When a user describes a learning goal, analyze it and create a structured learning path with progressive challenges.

IMPORTANT RULES:
1. Always respond in the SAME LANGUAGE the user writes in.
2. First, briefly analyze the learning goal (2-3 sentences).
3. Then output a JSON block wrapped in \`\`\`json ... \`\`\` fences with this structure:

\`\`\`json
{
  "pathTitle": "Learning path title",
  "pathDescription": "2-3 sentence description of the learning path",
  "icon": "emoji icon for the path",
  "color": "a tailwind color name (blue, green, purple, orange, etc.)",
  "categorySlug": "one of: web, game, mobile, ai-agents, ai-writing, ai-image, ai-video, ai-data, ai-audio, ai-coding",
  "challenges": [
    {
      "title": "Challenge title",
      "summary": "1-2 sentence summary of what to build",
      "difficulty": "BEGINNER | INTERMEDIATE | ADVANCED | EXPERT"
    }
  ]
}
\`\`\`

4. Create 3-8 challenges that progress from easier to harder.
5. Each challenge should be a practical, buildable project.
6. If the user asks to modify the outline, output the FULL updated JSON block.
7. Keep your analysis conversational and helpful.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}

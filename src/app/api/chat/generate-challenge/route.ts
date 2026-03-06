import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const systemPrompt = `You are an expert challenge content creator for "AI In Action", a platform for learning AI through hands-on projects.

Your task: Generate detailed content for a specific challenge within a learning path.

IMPORTANT RULES:
1. Always respond in the SAME LANGUAGE the user writes in.
2. First, briefly introduce what this challenge covers (1-2 sentences).
3. Then output a JSON block wrapped in \`\`\`json ... \`\`\` fences:

\`\`\`json
{
  "title": "Challenge title",
  "description": "2-3 sentences describing what to build",
  "knowledgeContent": "Markdown content (200-500 words) explaining key concepts, techniques, and background knowledge needed. Use headings, code examples, and bullet points.",
  "objectives": ["Specific, measurable objective 1", "objective 2", "objective 3"],
  "hints": ["Helpful hint 1", "hint 2", "hint 3"],
  "resources": ["https://relevant-doc-url.com - Description", "https://tutorial-url.com - Description"],
  "tags": ["tag1", "tag2", "tag3"],
  "estimatedTime": "e.g. 2-3 hours",
  "difficulty": "BEGINNER | INTERMEDIATE | ADVANCED | EXPERT"
}
\`\`\`

4. The knowledgeContent should teach the prerequisite knowledge needed to complete the challenge.
5. Objectives should be specific and verifiable.
6. Hints should guide without giving away the solution.
7. Resources should be real, commonly known documentation or tutorial URLs.
8. If the user asks to modify, output the FULL updated JSON.`;

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

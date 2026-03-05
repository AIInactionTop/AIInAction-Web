# AI Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an AI Studio page where users input a learning goal and AI generates a complete learning path with challenges, knowledge content, and resources through a conversational split-pane interface.

**Architecture:** Extend existing LearningPath + Challenge models with new fields (knowledgeContent, isDraft, authorId, isPublished). Use Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for streaming chat with `useChat` hook. Split-pane UI: left chat panel + right preview/edit panel. Zustand store manages client-side state.

**Tech Stack:** Next.js 16 App Router, Vercel AI SDK v4, @ai-sdk/anthropic, Zustand v5, TipTap, Prisma 7, next-intl v4, shadcn/ui

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Vercel AI SDK packages**

Run: `pnpm add ai @ai-sdk/anthropic`

**Step 2: Verify installation**

Run: `pnpm ls ai @ai-sdk/anthropic`
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add Vercel AI SDK (ai + @ai-sdk/anthropic)"
```

---

### Task 2: Extend Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:110-176` (LearningPath, Challenge, ChallengeTranslation models)

**Step 1: Add fields to LearningPath model (line 110-122)**

Add `authorId`, `author`, `isOfficial`, `isPublished` fields. Also add `learningPaths` relation to User model (line 40-66).

```prisma
model LearningPath {
  id          String      @id @default(cuid())
  slug        String      @unique
  title       String
  description String      @db.Text
  icon        String
  color       String
  order       Int         @default(0)
  challenges  Challenge[]
  createdAt   DateTime    @default(now()) @map("created_at")

  authorId    String?     @map("author_id")
  author      User?       @relation(fields: [authorId], references: [id])
  isOfficial  Boolean     @default(false) @map("is_official")
  isPublished Boolean     @default(false) @map("is_published")

  @@map("learning_paths")
}
```

Add to User model (after line 63, before `@@map("users")`):

```prisma
  learningPaths      LearningPath[]
```

**Step 2: Add fields to Challenge model (line 124-162)**

Add `knowledgeContent` and `isDraft` fields after `estimatedTime` (line 133):

```prisma
  knowledgeContent String?  @db.Text @map("knowledge_content")
  isDraft          Boolean  @default(false) @map("is_draft")
```

**Step 3: Add `knowledgeContent` to ChallengeTranslation model (line 164-176)**

Add after `hints` (line 171):

```prisma
  knowledgeContent String?  @db.Text @map("knowledge_content")
```

**Step 4: Push schema changes to DB**

Run: `pnpm db:push`
Expected: Schema synced successfully

**Step 5: Regenerate Prisma client**

Run: `pnpm db:generate`
Expected: Prisma client generated

**Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: extend LearningPath, Challenge, ChallengeTranslation for AI Studio"
```

---

### Task 3: Create Zustand Store for AI Studio

**Files:**
- Create: `src/stores/ai-studio-store.ts`

**Step 1: Create the store**

This store manages the client-side state for the AI Studio: the generated path outline, challenge details, and editing state.

```typescript
import { create } from "zustand";

export type OutlineChallenge = {
  id: string; // client-side temp ID
  title: string;
  summary: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  order: number;
  // Filled after detail generation
  description?: string;
  knowledgeContent?: string;
  objectives?: string[];
  hints?: string[];
  resources?: string[];
  tags?: string[];
  estimatedTime?: string;
  isDetailGenerated: boolean;
};

export type PathOutline = {
  title: string;
  description: string;
  icon: string;
  color: string;
  categorySlug: string;
  challenges: OutlineChallenge[];
};

type GenerationPhase = "idle" | "outlining" | "outline-done" | "generating-details" | "done";

type AIStudioState = {
  phase: GenerationPhase;
  pathOutline: PathOutline | null;
  activeChallenge: string | null; // ID of challenge being edited/generated

  // Actions
  setPhase: (phase: GenerationPhase) => void;
  setPathOutline: (outline: PathOutline) => void;
  updatePathField: (field: keyof Pick<PathOutline, "title" | "description" | "icon" | "color" | "categorySlug">, value: string) => void;
  updateChallenge: (id: string, updates: Partial<OutlineChallenge>) => void;
  addChallenge: (challenge: OutlineChallenge) => void;
  removeChallenge: (id: string) => void;
  reorderChallenges: (challenges: OutlineChallenge[]) => void;
  setActiveChallenge: (id: string | null) => void;
  reset: () => void;
};

const initialState = {
  phase: "idle" as GenerationPhase,
  pathOutline: null as PathOutline | null,
  activeChallenge: null as string | null,
};

export const useAIStudioStore = create<AIStudioState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setPathOutline: (outline) => set({ pathOutline: outline, phase: "outline-done" }),

  updatePathField: (field, value) =>
    set((state) => ({
      pathOutline: state.pathOutline ? { ...state.pathOutline, [field]: value } : null,
    })),

  updateChallenge: (id, updates) =>
    set((state) => ({
      pathOutline: state.pathOutline
        ? {
            ...state.pathOutline,
            challenges: state.pathOutline.challenges.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          }
        : null,
    })),

  addChallenge: (challenge) =>
    set((state) => ({
      pathOutline: state.pathOutline
        ? { ...state.pathOutline, challenges: [...state.pathOutline.challenges, challenge] }
        : null,
    })),

  removeChallenge: (id) =>
    set((state) => ({
      pathOutline: state.pathOutline
        ? {
            ...state.pathOutline,
            challenges: state.pathOutline.challenges.filter((c) => c.id !== id),
          }
        : null,
    })),

  reorderChallenges: (challenges) =>
    set((state) => ({
      pathOutline: state.pathOutline ? { ...state.pathOutline, challenges } : null,
    })),

  setActiveChallenge: (id) => set({ activeChallenge: id }),

  reset: () => set(initialState),
}));
```

**Step 2: Commit**

```bash
git add src/stores/ai-studio-store.ts
git commit -m "feat: add Zustand store for AI Studio state management"
```

---

### Task 4: Create AI Streaming API Routes

**Files:**
- Create: `src/app/api/chat/generate-outline/route.ts`
- Create: `src/app/api/chat/generate-challenge/route.ts`

**Step 1: Create outline generation API route**

This endpoint uses `streamText` from the AI SDK with the Anthropic provider. It accepts chat messages and returns a streaming response compatible with the `useChat` protocol.

```typescript
// src/app/api/chat/generate-outline/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
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
    messages,
  });

  return result.toDataStreamResponse();
}
```

**Step 2: Create challenge detail generation API route**

```typescript
// src/app/api/chat/generate-challenge/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
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
    messages,
  });

  return result.toDataStreamResponse();
}
```

**Step 3: Commit**

```bash
git add src/app/api/chat/generate-outline/route.ts src/app/api/chat/generate-challenge/route.ts
git commit -m "feat: add streaming API routes for AI outline and challenge generation"
```

---

### Task 5: Create Server Action for Saving AI-Generated Paths

**Files:**
- Create: `src/actions/ai-studio.ts`

**Step 1: Create the server action**

Reference `src/actions/challenges.ts:44-112` for the pattern. This action takes the full path outline with challenge details and batch-creates everything.

```typescript
// src/actions/ai-studio.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { translateChallenge, type ChallengeContent } from "@/lib/ai";
import { awardXP } from "@/lib/gamification";
import { Difficulty } from "@prisma/client";

type ChallengeInput = {
  title: string;
  description: string;
  difficulty: string;
  objectives: string[];
  hints: string[];
  resources: string[];
  tags: string[];
  estimatedTime: string;
  knowledgeContent: string;
  order: number;
};

type SavePathInput = {
  title: string;
  description: string;
  icon: string;
  color: string;
  categorySlug: string;
  challenges: ChallengeInput[];
  isPublished: boolean;
  locale: string;
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function saveAILearningPath(input: SavePathInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Find category
  const category = await prisma.category.findUnique({
    where: { slug: input.categorySlug },
  });

  // Generate unique path slug
  let pathSlug = generateSlug(input.title);
  const existingPath = await prisma.learningPath.findUnique({ where: { slug: pathSlug } });
  if (existingPath) {
    pathSlug = `${pathSlug}-${Date.now().toString(36)}`;
  }

  // Create learning path
  const learningPath = await prisma.learningPath.create({
    data: {
      slug: pathSlug,
      title: input.title,
      description: input.description,
      icon: input.icon,
      color: input.color,
      authorId: userId,
      isOfficial: false,
      isPublished: input.isPublished,
    },
  });

  // Create challenges in batch
  const targetLocale = input.locale === "en" ? "zh" : "en";

  for (const ch of input.challenges) {
    // Generate unique challenge slug
    let challengeSlug = generateSlug(ch.title);
    const existingChallenge = await prisma.challenge.findUnique({ where: { slug: challengeSlug } });
    if (existingChallenge) {
      challengeSlug = `${challengeSlug}-${Date.now().toString(36)}`;
    }

    const challenge = await prisma.challenge.create({
      data: {
        slug: challengeSlug,
        title: ch.title,
        description: ch.description,
        difficulty: ch.difficulty as Difficulty,
        objectives: ch.objectives,
        hints: ch.hints,
        resources: ch.resources,
        estimatedTime: ch.estimatedTime,
        knowledgeContent: ch.knowledgeContent,
        isDraft: !input.isPublished,
        order: ch.order,
        isOfficial: false,
        authorId: userId,
        categoryId: category?.id,
        pathId: learningPath.id,
      },
    });

    // Sync tags
    for (const tagName of ch.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName.toLowerCase().trim() },
        update: {},
        create: { name: tagName.toLowerCase().trim() },
      });
      await prisma.challengeTag.create({
        data: { challengeId: challenge.id, tagId: tag.id },
      });
    }

    // Create translation for source locale
    await prisma.challengeTranslation.create({
      data: {
        challengeId: challenge.id,
        locale: input.locale,
        title: ch.title,
        description: ch.description,
        objectives: ch.objectives,
        hints: ch.hints,
        knowledgeContent: ch.knowledgeContent,
      },
    });

    // Auto-translate to other locale
    try {
      const sourceContent: ChallengeContent = {
        title: ch.title,
        description: ch.description,
        objectives: ch.objectives,
        hints: ch.hints,
      };
      const translated = await translateChallenge(sourceContent, input.locale, targetLocale);
      await prisma.challengeTranslation.create({
        data: {
          challengeId: challenge.id,
          locale: targetLocale,
          title: translated.title,
          description: translated.description,
          objectives: translated.objectives,
          hints: translated.hints,
          // knowledgeContent translation could be added later for cost optimization
        },
      });
    } catch {
      // Translation failure is non-fatal
    }
  }

  // Award XP for creating a learning path
  await awardXP(userId, 50);

  revalidatePath("/paths");
  revalidatePath("/challenges");

  if (input.isPublished) {
    redirect(`/paths/${pathSlug}`);
  }

  return { pathSlug, pathId: learningPath.id };
}
```

**Step 2: Commit**

```bash
git add src/actions/ai-studio.ts
git commit -m "feat: add server action for saving AI-generated learning paths"
```

---

### Task 6: Add i18n Translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

**Step 1: Add AI Studio keys to en.json**

Add a new `"aiStudio"` section to `messages/en.json` (add after the last existing section):

```json
"aiStudio": {
  "title": "AI Studio",
  "subtitle": "Describe your learning goal and AI will create a personalized learning path",
  "inputPlaceholder": "e.g., I want to learn how to build AI agents with LangChain...",
  "send": "Send",
  "generating": "Generating...",
  "outlineTitle": "Learning Path Outline",
  "noOutline": "Start a conversation to generate your learning path",
  "challenges": "Challenges",
  "generateDetails": "Generate Details",
  "generatingDetails": "Generating challenge details...",
  "saveDraft": "Save Draft",
  "publish": "Publish",
  "editTitle": "Edit Title",
  "editDescription": "Edit Description",
  "knowledge": "Knowledge",
  "resources": "Resources",
  "objectives": "Objectives",
  "hints": "Hints",
  "step": "Step",
  "confirmOutline": "The outline looks good, please generate the details for all challenges.",
  "saved": "Learning path saved successfully!",
  "published": "Learning path published successfully!"
}
```

**Step 2: Add AI Studio keys to zh.json**

Add the corresponding Chinese translations:

```json
"aiStudio": {
  "title": "AI 工作室",
  "subtitle": "描述你的学习目标，AI 将为你创建个性化的学习路径",
  "inputPlaceholder": "例如：我想学习如何用 LangChain 构建 AI Agent...",
  "send": "发送",
  "generating": "生成中...",
  "outlineTitle": "学习路径大纲",
  "noOutline": "开始对话以生成你的学习路径",
  "challenges": "挑战",
  "generateDetails": "生成详情",
  "generatingDetails": "正在生成挑战详情...",
  "saveDraft": "保存草稿",
  "publish": "发布",
  "editTitle": "编辑标题",
  "editDescription": "编辑描述",
  "knowledge": "知识内容",
  "resources": "资源",
  "objectives": "目标",
  "hints": "提示",
  "step": "步骤",
  "confirmOutline": "大纲看起来不错，请为所有挑战生成详细内容。",
  "saved": "学习路径保存成功！",
  "published": "学习路径发布成功！"
}
```

**Step 3: Add nav link translation**

In `messages/en.json`, in the `"nav"` section, add:

```json
"aiStudio": "AI Studio"
```

In `messages/zh.json`, in the `"nav"` section, add:

```json
"aiStudio": "AI 工作室"
```

**Step 4: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "i18n: add AI Studio translations (en + zh)"
```

---

### Task 7: Add AI Studio Nav Link to Header

**Files:**
- Modify: `src/components/layout/header.tsx:31-37`

**Step 1: Add AI Studio to navLinks array**

At line 36, add the AI Studio link to the `navLinks` array (before the closing `]`):

```typescript
  const navLinks = [
    { href: "/challenges" as const, label: t("challenges") },
    { href: "/activities" as const, label: t("activities") },
    { href: "/paths" as const, label: t("paths") },
    { href: "/showcase" as const, label: t("showcase") },
    { href: "/leaderboard" as const, label: t("leaderboard") },
    { href: "/ai-studio" as const, label: t("aiStudio") },
  ];
```

**Step 2: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: add AI Studio link to navigation header"
```

---

### Task 8: Create AI Studio Page (Server Component)

**Files:**
- Create: `src/app/[locale]/ai-studio/page.tsx`

**Step 1: Create the page**

Reference `src/app/[locale]/challenges/new/page.tsx` for the auth + locale pattern.

```typescript
// src/app/[locale]/ai-studio/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCategories } from "@/lib/challenges";
import { AIStudioClient } from "./components/ai-studio-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AIStudioPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const categories = await getCategories();

  return <AIStudioClient categories={categories} locale={locale} />;
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/ai-studio/page.tsx
git commit -m "feat: add AI Studio server page with auth gate"
```

---

### Task 9: Create AI Studio Client Component (Main Layout)

**Files:**
- Create: `src/app/[locale]/ai-studio/components/ai-studio-client.tsx`

**Step 1: Create the split-pane client component**

This is the main client component that renders the split layout with chat panel (left) and preview panel (right).

```typescript
// src/app/[locale]/ai-studio/components/ai-studio-client.tsx
"use client";

import { useChat } from "ai/react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAIStudioStore, type OutlineChallenge, type PathOutline } from "@/stores/ai-studio-store";
import { ChatPanel } from "./chat-panel";
import { PreviewPanel } from "./preview-panel";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Props = {
  categories: Category[];
  locale: string;
};

function parseOutlineFromText(text: string): PathOutline | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;

  try {
    const data = JSON.parse(jsonMatch[1]);
    if (!data.pathTitle || !data.challenges) return null;

    return {
      title: data.pathTitle,
      description: data.pathDescription || "",
      icon: data.icon || "📚",
      color: data.color || "blue",
      categorySlug: data.categorySlug || "",
      challenges: data.challenges.map((c: { title: string; summary: string; difficulty: string }, i: number) => ({
        id: `challenge-${i}-${Date.now()}`,
        title: c.title,
        summary: c.summary,
        difficulty: c.difficulty || "BEGINNER",
        order: i,
        isDetailGenerated: false,
      })),
    };
  } catch {
    return null;
  }
}

export function AIStudioClient({ categories, locale }: Props) {
  const t = useTranslations("aiStudio");
  const { pathOutline, phase, setPathOutline, setPhase } = useAIStudioStore();
  const lastParsedRef = useRef<string>("");

  // Outline generation chat
  const outlineChat = useChat({
    api: "/api/chat/generate-outline",
    onFinish: (message) => {
      const outline = parseOutlineFromText(message.content);
      if (outline) {
        setPathOutline(outline);
      }
    },
  });

  // Challenge detail generation chat
  const detailChat = useChat({
    api: "/api/chat/generate-challenge",
  });

  // Parse streaming outline updates
  useEffect(() => {
    const lastAssistant = outlineChat.messages
      .filter((m) => m.role === "assistant")
      .at(-1);
    if (!lastAssistant || lastAssistant.content === lastParsedRef.current) return;

    const outline = parseOutlineFromText(lastAssistant.content);
    if (outline) {
      lastParsedRef.current = lastAssistant.content;
      setPathOutline(outline);
    }
  }, [outlineChat.messages, setPathOutline]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (phase === "idle" || phase === "outline-done" || phase === "outlining") {
        setPhase("outlining");
        outlineChat.append({ role: "user", content });
      }
    },
    [phase, setPhase, outlineChat]
  );

  const handleGenerateDetails = useCallback(
    (challenge: OutlineChallenge) => {
      const context = pathOutline
        ? `Learning Path: "${pathOutline.title}"\nChallenge to expand: "${challenge.title}" - ${challenge.summary}\nDifficulty: ${challenge.difficulty}\n\nPlease generate the full challenge details.`
        : "";
      detailChat.append({ role: "user", content: context });
    },
    [pathOutline, detailChat]
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl">
      {/* Left: Chat Panel */}
      <div className="flex w-[40%] flex-col border-r border-border">
        <ChatPanel
          messages={outlineChat.messages}
          isLoading={outlineChat.isLoading}
          onSend={handleSendMessage}
        />
      </div>

      {/* Right: Preview Panel */}
      <div className="flex w-[60%] flex-col overflow-y-auto">
        <PreviewPanel
          categories={categories}
          locale={locale}
          detailChat={detailChat}
          onGenerateDetails={handleGenerateDetails}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/ai-studio/components/ai-studio-client.tsx
git commit -m "feat: add AI Studio client component with split-pane layout"
```

---

### Task 10: Create Chat Panel Component

**Files:**
- Create: `src/app/[locale]/ai-studio/components/chat-panel.tsx`

**Step 1: Create the chat panel**

```typescript
// src/app/[locale]/ai-studio/components/chat-panel.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";
import type { Message } from "ai";
import ReactMarkdown from "react-markdown";

type Props = {
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
};

export function ChatPanel({ messages, isLoading, onSend }: Props) {
  const t = useTranslations("aiStudio");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              {message.role === "assistant" ? (
                <Bot className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-hidden">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && messages.at(-1)?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("generating")}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/ai-studio/components/chat-panel.tsx
git commit -m "feat: add AI Studio chat panel component"
```

---

### Task 11: Create Preview Panel Component

**Files:**
- Create: `src/app/[locale]/ai-studio/components/preview-panel.tsx`

**Step 1: Create the preview panel**

This renders the learning path outline and challenge details with inline editing.

```typescript
// src/app/[locale]/ai-studio/components/preview-panel.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Save, Globe, Sparkles } from "lucide-react";
import { useAIStudioStore, type OutlineChallenge } from "@/stores/ai-studio-store";
import { saveAILearningPath } from "@/actions/ai-studio";
import { ChallengeEditor } from "./challenge-editor";
import type { useChat } from "ai/react";
import { difficultyConfig } from "@/lib/constants";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Props = {
  categories: Category[];
  locale: string;
  detailChat: ReturnType<typeof useChat>;
  onGenerateDetails: (challenge: OutlineChallenge) => void;
};

function parseChallengeDetailFromText(text: string) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}

export function PreviewPanel({ categories, locale, detailChat, onGenerateDetails }: Props) {
  const t = useTranslations("aiStudio");
  const { pathOutline, phase, updatePathField, updateChallenge, setPhase } = useAIStudioStore();
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const generatingChallengeRef = useRef<string | null>(null);

  // Parse challenge detail from streaming response
  useEffect(() => {
    const lastAssistant = detailChat.messages
      .filter((m) => m.role === "assistant")
      .at(-1);
    if (!lastAssistant || !generatingChallengeRef.current) return;

    const detail = parseChallengeDetailFromText(lastAssistant.content);
    if (detail) {
      updateChallenge(generatingChallengeRef.current, {
        description: detail.description,
        knowledgeContent: detail.knowledgeContent,
        objectives: detail.objectives,
        hints: detail.hints,
        resources: detail.resources,
        tags: detail.tags,
        estimatedTime: detail.estimatedTime,
        difficulty: detail.difficulty,
        isDetailGenerated: true,
      });
    }
  }, [detailChat.messages, updateChallenge]);

  const toggleExpand = (id: string) => {
    setExpandedChallenges((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateDetail = useCallback(
    (challenge: OutlineChallenge) => {
      generatingChallengeRef.current = challenge.id;
      setExpandedChallenges((prev) => new Set(prev).add(challenge.id));
      onGenerateDetails(challenge);
    },
    [onGenerateDetails]
  );

  const handleGenerateAll = useCallback(() => {
    if (!pathOutline) return;
    setPhase("generating-details");
    // Generate details for all challenges sequentially
    const ungenerated = pathOutline.challenges.filter((c) => !c.isDetailGenerated);
    if (ungenerated.length > 0) {
      handleGenerateDetail(ungenerated[0]);
    }
  }, [pathOutline, setPhase, handleGenerateDetail]);

  // Auto-continue generating next challenge when current finishes
  useEffect(() => {
    if (phase !== "generating-details" || detailChat.isLoading || !pathOutline) return;

    const ungenerated = pathOutline.challenges.filter((c) => !c.isDetailGenerated);
    if (ungenerated.length > 0) {
      const timer = setTimeout(() => handleGenerateDetail(ungenerated[0]), 500);
      return () => clearTimeout(timer);
    } else {
      setPhase("done");
    }
  }, [phase, detailChat.isLoading, pathOutline, handleGenerateDetail, setPhase]);

  const handleSave = async (publish: boolean) => {
    if (!pathOutline) return;
    setSaving(true);
    try {
      await saveAILearningPath({
        title: pathOutline.title,
        description: pathOutline.description,
        icon: pathOutline.icon,
        color: pathOutline.color,
        categorySlug: pathOutline.categorySlug,
        isPublished: publish,
        locale,
        challenges: pathOutline.challenges.map((c) => ({
          title: c.title,
          description: c.description || c.summary,
          difficulty: c.difficulty,
          objectives: c.objectives || [],
          hints: c.hints || [],
          resources: c.resources || [],
          tags: c.tags || [],
          estimatedTime: c.estimatedTime || "",
          knowledgeContent: c.knowledgeContent || "",
          order: c.order,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!pathOutline) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{t("noOutline")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Path Header */}
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{pathOutline.icon}</span>
          <Input
            value={pathOutline.title}
            onChange={(e) => updatePathField("title", e.target.value)}
            className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
          />
        </div>
        <Input
          value={pathOutline.description}
          onChange={(e) => updatePathField("description", e.target.value)}
          className="text-sm text-muted-foreground border-none bg-transparent p-0 h-auto focus-visible:ring-0"
        />
        <div className="flex items-center gap-2">
          <select
            value={pathOutline.categorySlug}
            onChange={(e) => updatePathField("categorySlug", e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <Badge variant="secondary">
            {pathOutline.challenges.length} {t("challenges")}
          </Badge>
        </div>
      </div>

      {/* Challenges List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pathOutline.challenges.map((challenge, index) => (
          <div key={challenge.id} className="rounded-lg border border-border">
            {/* Challenge Header */}
            <button
              onClick={() => toggleExpand(challenge.id)}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
            >
              {expandedChallenges.has(challenge.id) ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {t("step")} {index + 1}
              </span>
              <span className="flex-1 font-medium">{challenge.title}</span>
              <Badge
                variant="outline"
                className="shrink-0"
                style={{ borderColor: difficultyConfig[challenge.difficulty]?.color }}
              >
                {challenge.difficulty}
              </Badge>
              {challenge.isDetailGenerated && (
                <Badge variant="secondary" className="shrink-0 text-green-600">
                  ✓
                </Badge>
              )}
            </button>

            {/* Challenge Detail (expanded) */}
            {expandedChallenges.has(challenge.id) && (
              <div className="border-t border-border p-3">
                {challenge.isDetailGenerated ? (
                  <ChallengeEditor
                    challenge={challenge}
                    onChange={(updates) => updateChallenge(challenge.id, updates)}
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{challenge.summary}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateDetail(challenge)}
                      disabled={detailChat.isLoading}
                    >
                      {detailChat.isLoading && generatingChallengeRef.current === challenge.id ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          {t("generatingDetails")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          {t("generateDetails")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-border p-4 flex gap-3">
        {phase === "outline-done" && (
          <Button onClick={handleGenerateAll} className="flex-1">
            <Sparkles className="mr-2 h-4 w-4" />
            {t("generateDetails")}
          </Button>
        )}
        {(phase === "done" || pathOutline.challenges.some((c) => c.isDetailGenerated)) && (
          <>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              {t("saveDraft")}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1"
            >
              <Globe className="mr-2 h-4 w-4" />
              {t("publish")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/ai-studio/components/preview-panel.tsx
git commit -m "feat: add AI Studio preview panel with outline display and editing"
```

---

### Task 12: Create Challenge Editor Component

**Files:**
- Create: `src/app/[locale]/ai-studio/components/challenge-editor.tsx`

**Step 1: Create the inline challenge editor**

This component renders the editable fields for a single challenge that has been fully generated.

```typescript
// src/app/[locale]/ai-studio/components/challenge-editor.tsx
"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutlineChallenge } from "@/stores/ai-studio-store";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

type Props = {
  challenge: OutlineChallenge;
  onChange: (updates: Partial<OutlineChallenge>) => void;
};

export function ChallengeEditor({ challenge, onChange }: Props) {
  const t = useTranslations("aiStudio");
  const [editingKnowledge, setEditingKnowledge] = useState(false);

  const updateListItem = (
    field: "objectives" | "hints" | "resources",
    index: number,
    value: string
  ) => {
    const list = [...(challenge[field] || [])];
    list[index] = value;
    onChange({ [field]: list });
  };

  const addListItem = (field: "objectives" | "hints" | "resources") => {
    const list = [...(challenge[field] || []), ""];
    onChange({ [field]: list });
  };

  const removeListItem = (field: "objectives" | "hints" | "resources", index: number) => {
    const list = (challenge[field] || []).filter((_, i) => i !== index);
    onChange({ [field]: list });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        value={challenge.title}
        onChange={(e) => onChange({ title: e.target.value })}
        className="font-medium"
      />

      {/* Description */}
      <textarea
        value={challenge.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        rows={2}
      />

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={challenge.difficulty}
          onChange={(e) => onChange({ difficulty: e.target.value as OutlineChallenge["difficulty"] })}
          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <Input
          value={challenge.estimatedTime || ""}
          onChange={(e) => onChange({ estimatedTime: e.target.value })}
          placeholder="Estimated time"
          className="w-32"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {(challenge.tags || []).map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => onChange({ tags: challenge.tags?.filter((_, idx) => idx !== i) })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Knowledge Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t("knowledge")}</h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingKnowledge(!editingKnowledge)}
          >
            {editingKnowledge ? "Preview" : "Edit"}
          </Button>
        </div>
        {editingKnowledge ? (
          <textarea
            value={challenge.knowledgeContent || ""}
            onChange={(e) => onChange({ knowledgeContent: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y min-h-[200px]"
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-border p-3 bg-muted/30">
            <ReactMarkdown>{challenge.knowledgeContent || ""}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Objectives */}
      <EditableList
        label={t("objectives")}
        items={challenge.objectives || []}
        onChange={(index, value) => updateListItem("objectives", index, value)}
        onAdd={() => addListItem("objectives")}
        onRemove={(index) => removeListItem("objectives", index)}
      />

      {/* Hints */}
      <EditableList
        label={t("hints")}
        items={challenge.hints || []}
        onChange={(index, value) => updateListItem("hints", index, value)}
        onAdd={() => addListItem("hints")}
        onRemove={(index) => removeListItem("hints", index)}
      />

      {/* Resources */}
      <EditableList
        label={t("resources")}
        items={challenge.resources || []}
        onChange={(index, value) => updateListItem("resources", index, value)}
        onAdd={() => addListItem("resources")}
        onRemove={(index) => removeListItem("resources", index)}
      />
    </div>
  );
}

function EditableList({
  label,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{label}</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              className="flex-1"
            />
            <button
              onClick={() => onRemove(index)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/ai-studio/components/challenge-editor.tsx
git commit -m "feat: add inline challenge editor for AI Studio preview panel"
```

---

### Task 13: Verify Build and Fix Issues

**Step 1: Run the build**

Run: `pnpm build`
Expected: Build succeeds without errors

**Step 2: Fix any TypeScript or import errors**

Common issues to watch for:
- `react-markdown` may need to be installed: `pnpm add react-markdown`
- `difficultyConfig` import path may need adjustment — check `src/lib/constants.ts`
- Prisma types may need regeneration after schema changes
- `useChat` import path: ensure `ai/react` is correct for AI SDK v4

**Step 3: Run linter**

Run: `pnpm lint`
Expected: No errors (warnings are acceptable)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues for AI Studio feature"
```

---

### Task 14: Manual Integration Test

**Step 1: Start dev server**

Run: `pnpm dev`

**Step 2: Verify the following**

1. Navigate to `/ai-studio` — should redirect to `/login` if not authenticated
2. After login, `/ai-studio` shows split-pane layout
3. Header shows "AI Studio" nav link
4. Type a learning goal (e.g., "I want to learn how to build RAG applications") → AI streams response
5. Right panel updates with outline structure as AI generates
6. Can click "Generate Details" on individual challenges
7. Can edit challenge content inline
8. "Save Draft" creates the learning path (check in DB or `/paths`)
9. Test both English and Chinese locale

**Step 3: Final commit if any tweaks needed**

```bash
git add -A
git commit -m "fix: polish AI Studio based on integration testing"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Install AI SDK dependencies | None |
| 2 | Extend Prisma schema | None |
| 3 | Create Zustand store | None |
| 4 | Create streaming API routes | Task 1 |
| 5 | Create save server action | Task 2 |
| 6 | Add i18n translations | None |
| 7 | Add header nav link | Task 6 |
| 8 | Create AI Studio page | Task 2 |
| 9 | Create main client component | Tasks 3, 4 |
| 10 | Create chat panel | Task 9 |
| 11 | Create preview panel | Tasks 3, 5 |
| 12 | Create challenge editor | Task 11 |
| 13 | Verify build | All above |
| 14 | Integration test | Task 13 |

**Parallel execution groups:**
- Group A (no deps): Tasks 1, 2, 3, 6
- Group B (after Group A): Tasks 4, 5, 7, 8
- Group C (after Group B): Tasks 9, 10, 11, 12
- Group D (final): Tasks 13, 14

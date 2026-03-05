# AI Studio - AI-Powered Learning Path & Challenge Generation

## Overview

Add an AI Studio feature (`/ai-studio`) that lets users input a learning goal, then uses AI to analyze, decompose, and generate a complete learning path with challenges, knowledge content, and resources. Users interact with AI via a chat interface (left panel) while previewing and editing generated content in real-time (right panel).

## Key Decisions

- **Data model**: Extend existing `LearningPath` + `Challenge` models (no new top-level models)
- **Generation flow**: Conversational — AI generates outline first, user confirms/adjusts, then AI generates challenge details
- **UI**: Split-pane — left chat panel (40%) + right preview/edit panel (60%)
- **Learning materials**: AI-generated knowledge content (Markdown) + external resource links
- **Visibility**: Default private (draft), user can publish to make public
- **Streaming**: Full streaming via Vercel AI SDK (`useChat` + `streamObject`), compatible with AI SDK UI protocol
- **Entry point**: Independent top-level page at `/ai-studio`

## Data Model Changes

### Challenge (extend)

```prisma
model Challenge {
  // ...existing fields...
  knowledgeContent  String?    // AI-generated knowledge explanation (Markdown)
  isDraft           Boolean    @default(false)
}
```

### ChallengeTranslation (extend)

```prisma
model ChallengeTranslation {
  // ...existing fields...
  knowledgeContent  String?    // Translated knowledge content
}
```

### LearningPath (extend)

```prisma
model LearningPath {
  // ...existing fields...
  authorId    String?
  author      User?      @relation(fields: [authorId], references: [id])
  isOfficial  Boolean    @default(false)
  isPublished Boolean    @default(false)
}
```

## Architecture

### New Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/ai-studio` | Page | Main AI Studio UI (split-pane chat + preview) |
| `/api/chat/generate-outline` | API Route | Stream learning path outline generation |
| `/api/chat/generate-challenge` | API Route | Stream individual challenge detail generation |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| AI SDK | `ai` + `@ai-sdk/anthropic` (Vercel AI SDK) |
| Chat state | `useChat` hook |
| Streaming | `streamObject` / `streamText` with AI SDK stream protocol |
| Rich text editing | TipTap (existing) for knowledge content |
| State management | Zustand store for current path + challenges data |
| Persistence | Server Actions → Prisma (LearningPath + Challenge batch create) |
| i18n | Auto-translate via existing `translateChallenge()` + extend for knowledgeContent |

### UI Layout

```
+--------------------------------------------------+
|  AI Studio - Header                              |
+----------------------+---------------------------+
|                      |                           |
|   Chat Panel (40%)   |   Preview Panel (60%)     |
|                      |                           |
|  [User] I want to    |   Learning Path Preview   |
|  learn...            |   +- Step 1: title        |
|                      |   |  Knowledge | Resources|
|  [AI] Analyzing...   |   +- Step 2: title        |
|  Here's the outline: |   |  Knowledge | Resources|
|  1. xxx              |   +- Step 3: title        |
|  2. xxx              |                           |
|                      |   [Each step editable]    |
|  [Input box]         |   [Save Draft] [Publish]  |
+----------------------+---------------------------+
```

### Interaction Flow

1. User enters learning goal in chat
2. AI analyzes goal, streams analysis + outline (path name + N challenge summaries)
3. Right panel updates in real-time with outline structure
4. User adjusts via chat ("split step 2", "add a step about X") or edits directly in preview
5. User confirms outline → triggers detail generation
6. AI generates each challenge's full content sequentially (streamed):
   - Knowledge content (Markdown)
   - Objectives, hints
   - External resources
   - Difficulty, estimated time, tags
7. Right panel expands each challenge card as content streams in
8. User edits any generated content directly in preview panel
9. Save as draft or publish

### AI Prompt Design

**Phase 1 — Outline Generation**

System prompt instructs AI to:
- Analyze the learning goal
- Break down into 3-8 progressive challenges
- Assign difficulty levels (beginner → advanced progression)
- Suggest a category
- Output structured JSON: `{ pathTitle, pathDescription, challenges: [{ title, summary, difficulty }] }`

Supports conversational refinement (user can ask to adjust).

**Phase 2 — Challenge Detail Generation**

For each challenge, system prompt instructs AI to:
- Write knowledge explanation content (Markdown, 200-500 words)
- Define 3-5 concrete objectives
- Provide 2-3 hints
- Recommend 2-4 external resources (docs, tutorials, videos)
- Suggest tags and estimated time
- Output structured JSON per challenge

Both phases maintain conversation context for coherent dialogue.

### Save Flow

```
User clicks "Save Draft" or "Publish"
    |
    v
Server Action: createAILearningPath(data)
    |
    v
1. Create LearningPath (authorId = current user, isPublished = true/false)
2. Batch create Challenges (knowledgeContent, isDraft, linked to pathId)
3. Create ChallengeTranslation for each challenge (en + zh via AI translation)
4. Award XP
    |
    v
Redirect to /paths/[slug] (if published) or /ai-studio?draft=xxx (if draft)
```

## Dependencies to Add

```json
{
  "ai": "^4.x",
  "@ai-sdk/anthropic": "^1.x"
}
```

## Files to Create/Modify

### New Files
- `src/app/[locale]/ai-studio/page.tsx` — Main page (server component, auth gate)
- `src/app/[locale]/ai-studio/components/chat-panel.tsx` — Left chat panel
- `src/app/[locale]/ai-studio/components/preview-panel.tsx` — Right preview/edit panel
- `src/app/[locale]/ai-studio/components/challenge-editor.tsx` — Inline challenge editor
- `src/app/[locale]/ai-studio/components/path-outline.tsx` — Path outline view
- `src/app/api/chat/generate-outline/route.ts` — Outline generation API
- `src/app/api/chat/generate-challenge/route.ts` — Challenge detail generation API
- `src/actions/ai-studio.ts` — Server actions for save/publish
- `src/stores/ai-studio-store.ts` — Zustand store for AI Studio state

### Modified Files
- `prisma/schema.prisma` — Add new fields to Challenge, ChallengeTranslation, LearningPath
- `src/lib/ai.ts` — Add outline/challenge generation prompts and helpers
- `src/components/header.tsx` — Add AI Studio nav link
- `messages/en.json` + `messages/zh.json` — Add AI Studio UI translations

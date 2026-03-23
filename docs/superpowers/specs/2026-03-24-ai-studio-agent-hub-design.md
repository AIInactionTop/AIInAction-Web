# AI Studio Agent Hub Design

## Summary

Refactor the AI Studio page from a single-purpose Challenge Agent into a multi-agent hub. The current functionality moves to a sub-route, and the main page becomes an agent listing with cards for available and upcoming agents.

## Requirements

1. `/ai-studio` becomes an agent list page showing all available AI agents
2. Current AI Studio functionality moves to `/ai-studio/challenge-agent` as "Challenge Agent"
3. Add placeholder cards for "Prototype Agent" and "Writer Agent" (coming soon, not clickable, visually dimmed)
4. All agents consume token credits (shown on the list page)

## Route Structure

```
/ai-studio                    → Agent list page (new)
/ai-studio/challenge-agent    → Current AI Studio (moved)
/ai-studio/prototype-agent    → Future
/ai-studio/writer-agent       → Future
```

## Agent List Page Design

### Layout
- Header: title "AI Studio" + subtitle explaining this is an AI agent hub, all agents consume credits
- Responsive card grid: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Auth required (redirect to `/${locale}/login` if unauthenticated)

### Agent Card Structure
Each card contains:
- Icon (emoji)
- Agent name
- Short description (1-2 sentences)
- Status badge: "Available" (green) or "Coming Soon" (muted)

### Agent Definitions

| Agent | Icon | Description | Status |
|-------|------|-------------|--------|
| Challenge Agent | 🎯 | Describe your learning goal and AI will create a personalized learning path with progressive challenges | Available |
| Prototype Agent | 🛠️ | Quickly prototype and iterate on UI designs with AI assistance | Coming Soon |
| Writer Agent | ✍️ | Generate and refine technical documentation, blog posts, and tutorials | Coming Soon |

### Interaction
- **Available agents**: Clickable card using Next.js `Link` component, navigates to sub-route (e.g. `/ai-studio/challenge-agent`)
- **Coming Soon agents**: Non-interactive, reduced opacity, "Coming Soon" badge, no cursor pointer

### Navigation
- The existing header nav link to `/ai-studio` will now land on the hub page — this is intentional
- No shared `layout.tsx` needed for now; each page is self-contained

## File Changes

### Modified Files
1. **`src/app/[locale]/ai-studio/page.tsx`** — Rewrite as agent list page (server component, auth required)

### New Files
2. **`src/app/[locale]/ai-studio/challenge-agent/page.tsx`** — Move original page.tsx logic here (auth + getCategories + AIStudioClient)

### Unchanged Files
- `src/app/[locale]/ai-studio/components/*` — All existing components stay in place, referenced by challenge-agent page
- `src/stores/ai-studio-store.ts` — No changes
- `src/actions/ai-studio.ts` — No changes
- `src/app/api/chat/generate-outline/route.ts` — No changes
- `src/app/api/chat/generate-challenge/route.ts` — No changes
- `src/components/billing/credits-provider.tsx` — No changes

### i18n Updates

Add keys under `aiStudio.hub` namespace (existing `aiStudio.*` keys stay for the challenge agent components):

**English (`messages/en.json`)**:
```json
"hub": {
  "title": "AI Studio",
  "subtitle": "AI-powered agents to help you learn, build, and create. All agents consume credits.",
  "available": "Available",
  "comingSoon": "Coming Soon",
  "challengeAgent": {
    "name": "Challenge Agent",
    "description": "Describe your learning goal and AI will create a personalized learning path with progressive challenges."
  },
  "prototypeAgent": {
    "name": "Prototype Agent",
    "description": "Quickly prototype and iterate on UI designs with AI assistance."
  },
  "writerAgent": {
    "name": "Writer Agent",
    "description": "Generate and refine technical documentation, blog posts, and tutorials."
  }
}
```

**Chinese (`messages/zh.json`)**: Equivalent translations under the same key structure.

## Implementation Notes

- The list page is a server component (needs `auth()` check)
- Agent card data can be a static array defined in the list page component — no database needed
- Use existing shadcn/ui components (Card, Badge) and Tailwind for styling
- Follow existing site patterns for card layouts (similar to category cards on landing page)

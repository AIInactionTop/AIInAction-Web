# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Next.js with Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm db:generate  # Regenerate Prisma client after schema changes
pnpm db:push      # Push schema changes to DB (no migration file)
pnpm db:seed      # Seed Categories, LearningPaths, Challenges, and Tags from src/data/challenges.ts
pnpm db:studio    # Open Prisma Studio GUI
```

## Architecture

**AI In Action** is a Next.js 16 app (App Router) for learning AI through hands-on challenge projects across 10 categories (Web, Game, Mobile, AI Agents, AI Writing, AI Image, AI Video, AI Data, AI Audio, AI Coding). Supports both official challenges and user-generated community challenges.

### Data Flow

All runtime reads come from **PostgreSQL via Prisma**. Query functions in **`src/lib/challenges.ts`** handle filtering, pagination, and search. **`src/data/challenges.ts`** is the seed source for official challenges and categories — run `pnpm db:seed` to sync.

Server Actions in **`src/actions/`** handle all writes:
- `challenges.ts` — create, update, delete, fork challenges
- `likes.ts` — toggle challenge likes
- `comments.ts` — create/delete challenge comments
- `completions.ts` — mark challenges as complete
- `api-keys.ts` — generate, list, delete API keys

### Auth

GitHub OAuth via **NextAuth v5** (`src/lib/auth.ts`). The `auth()` helper is used server-side; `useSession()` / `signIn()` from `next-auth/react` are used in client components. The Prisma adapter stores sessions in PostgreSQL.

### Database

PostgreSQL via **Prisma with `@prisma/adapter-pg`** (driver adapter pattern). The singleton client is in `src/lib/prisma.ts`. Schema: `prisma/schema.prisma`. The DB URL is set via `DATABASE_URL` in `.env`.

Key models: `Category`, `Challenge` (with `isOfficial`, `authorId`, `forkedFromId`, `likesCount`), `Tag`/`ChallengeTag`, `ChallengeLike`, `ChallengeComment`, `LearningPath`, `ChallengeCompletion`, `SharedProject`, `ApiKey`.

### Key Environment Variables

```
DATABASE_URL      # PostgreSQL connection string
AUTH_SECRET       # NextAuth secret (generate with: openssl rand -base64 32)
GITHUB_ID         # GitHub OAuth app client ID
GITHUB_SECRET     # GitHub OAuth app client secret
NEXTAUTH_URL      # Base URL (e.g. http://localhost:3000)
AI_GATEWAY_API_KEY # Vercel AI Gateway API key (routes all AI calls)
RESEND_API_KEY    # Resend API key for sending emails
GOOGLE_ID         # Google OAuth client ID
GOOGLE_SECRET     # Google OAuth client secret
```

### UI

shadcn/ui components (Radix UI + Tailwind CSS v4) in `src/components/ui/`. Layout wraps pages in Header + Footer with `ThemeProvider` (next-themes) and `SessionProvider`. Framer Motion is used for animations on list pages. Client-safe constants (e.g. `difficultyConfig`) live in `src/lib/constants.ts`.

### Route Structure

- `/` — Landing page (dynamic stats, 10 category cards, popular challenges)
- `/challenges` — Challenge list with All/Official/Community tabs, category + difficulty filters
- `/challenges/new` — Create community challenge (requires auth)
- `/challenges/[slug]` — Challenge detail with likes, comments, fork
- `/challenges/[slug]/edit` — Edit own challenge (requires auth + ownership)
- `/paths` — Learning paths list
- `/paths/[slug]` — Path detail with its challenges
- `/showcase` — Community projects gallery
- `/showcase/submit` — Project submission form (requires auth)
- `/profile/[id]` — User profile with Completed/Published/Projects tabs
- `/login` — GitHub OAuth sign-in page
- `/api/auth/[...nextauth]` — NextAuth route handler
- `/api/v1/challenges` — REST API: list/create challenges
- `/api/v1/challenges/[slug]` — REST API: get/update challenge
- `/api/v1/challenges/[slug]/complete` — REST API: mark challenge complete
- `/api/v1/categories` — REST API: list categories
- `/api/v1/me` — REST API: get authenticated user profile
- `/api/v1/me/keys` — REST API: manage API keys

### Adding Official Challenges

Add entries to `src/data/challenges.ts` (static `challenges`, `learningPaths`, and `officialCategories` arrays), then run `pnpm db:seed` to sync to the DB.

### Adding Community Challenges

Users create challenges via `/challenges/new`. They can also fork existing challenges to create variants.

### Agent Skill API

REST API at `/api/v1/` enables AI agents (Claude Code, OpenClaw) to interact with the platform. Authentication uses per-user API keys (prefix `aia_`, stored hashed). The skill definition is at `public/skill.md` (served at `https://aiinaction.top/skill.md`). API key auth middleware lives in `src/lib/api-auth.ts`.

### Welcome Email

New users receive a welcome email via **Resend** (`src/lib/email.ts`). Triggered by NextAuth's `events.createUser` hook. Skips silently if user has no email.

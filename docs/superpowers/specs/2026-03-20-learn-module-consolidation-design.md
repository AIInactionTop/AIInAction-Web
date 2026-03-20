# Learn Module Consolidation Design

## Overview

Consolidate Challenges, Learning Paths, and Activities into a unified **Learn** module (`/learn`), with a discovery-style homepage and redesigned information architecture. Activities evolves from a single static page into a DB-backed module supporting multiple activity types.

## Goals

- Single entry point (`/learn`) replacing three separate nav items
- Discovery homepage that surfaces the most relevant content
- Activities module with CRUD, supporting hackathons, themed events, external events, and general activities
- Maximize reuse of existing code; minimize breaking changes

## Non-Goals

- Activity registration/sign-up system (future)
- Activity leaderboards/rankings (future)
- Merging Challenge and Activity into a single data model
- Changes to the REST API (`/api/v1/`)

---

## 1. Route Structure

```
/learn                          → Discovery homepage
/learn/challenges               → Challenge list (migrated from /challenges)
/learn/challenges/new           → Create challenge
/learn/challenges/[slug]        → Challenge detail
/learn/challenges/[slug]/edit   → Edit challenge
/learn/paths                    → Learning paths list (migrated from /paths)
/learn/paths/[slug]             → Path detail
/learn/activities               → Activity list
/learn/activities/new           → Create activity (requires auth, admin only)
/learn/activities/[slug]        → Activity detail
/learn/activities/[slug]/edit   → Edit activity (requires auth + ownership or admin)
```

### 301 Redirects (in `src/proxy.ts`)

| Old Route | New Route |
|-----------|-----------|
| `/challenges` | `/learn/challenges` |
| `/challenges/*` | `/learn/challenges/*` |
| `/paths` | `/learn/paths` |
| `/paths/*` | `/learn/paths/*` |
| `/activities` | `/learn/activities` |

#### Redirect Implementation Details

Redirects are implemented in `src/proxy.ts` **before** the `handleI18nRouting` call. The redirect logic must:

1. Extract the raw pathname from the request
2. Strip the locale prefix if present (e.g., `/en/challenges` → `/challenges`)
3. Match against old route patterns (`/challenges`, `/challenges/*`, `/paths`, `/paths/*`, `/activities`)
4. Build the new URL with `/learn/` prefix, preserving the locale prefix and any query params
5. Return a 301 redirect response

Example: `/en/challenges/my-challenge` → 301 → `/en/learn/challenges/my-challenge`
Example: `/challenges` (no locale) → handled by i18n first, then redirected with locale

### Navigation

Header merges three nav items into one **"Learn"** dropdown:
- Challenges → `/learn/challenges`
- Learning Paths → `/learn/paths`
- Activities → `/learn/activities`

Clicking "Learn" itself navigates to `/learn` (discovery page).

---

## 2. Discovery Homepage (`/learn`)

Four sections, top to bottom:

### 2.1 Activity Banner (conditional)
- Shows **ACTIVE** or **UPCOMING** activities as a carousel or single hero card
- Displays: title, type badge (Hackathon/Themed/External/General), date range, CTA button
- Hidden when no active/upcoming activities exist

### 2.2 Continue Learning (authenticated users only)
- Up to 4 horizontal cards of challenges the user is working on
- **Query logic:** challenges where the user has a `ChallengeRegistration` but either no `ChallengeCompletion` record or a `ChallengeCompletion` with status `IN_PROGRESS`
- Each card: title, difficulty badge, path name (if any), progress status
- Hidden for unauthenticated users or when no in-progress challenges

### 2.3 Learning Paths
- Horizontal scrollable row of all published learning paths
- Each card: icon, name, challenge count, user completion progress (if authenticated)
- "View All" link → `/learn/paths`

### 2.4 Popular Challenges
- 8-12 challenge cards in a grid, sorted by popularity (likes + registrations weighted)
- Quick-filter tabs: All / Official / Community
- "View All" link → `/learn/challenges`

**Design principle:** The homepage is for discovery and navigation. No search or complex filtering — those belong on the list pages.

---

## 3. Activity Data Model

### New Prisma Models

```prisma
model Activity {
  id          String          @id @default(cuid())
  slug        String          @unique
  title       String
  description String          @db.Text
  coverImage  String?         @map("cover_image")

  type        ActivityType
  status      ActivityStatus

  startDate   DateTime?       @map("start_date")
  endDate     DateTime?       @map("end_date")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  externalUrl String?         @map("external_url")
  content     String?         @db.Text

  authorId    String          @map("author_id")
  author      User            @relation(fields: [authorId], references: [id], onDelete: Cascade)
  challenges  ActivityChallenge[]
  translations ActivityTranslation[]

  @@index([status])
  @@index([type])
  @@map("activities")
}

model ActivityChallenge {
  activityId  String          @map("activity_id")
  challengeId String          @map("challenge_id")
  order       Int             @default(0)
  activity    Activity        @relation(fields: [activityId], references: [id], onDelete: Cascade)
  challenge   Challenge       @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  @@id([activityId, challengeId])
  @@map("activity_challenges")
}

model ActivityTranslation {
  id          String          @id @default(cuid())
  activityId  String          @map("activity_id")
  locale      String
  title       String
  description String          @db.Text
  content     String?         @db.Text
  activity    Activity        @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@unique([activityId, locale])
  @@map("activity_translations")
}

enum ActivityType {
  HACKATHON   // Timed competition
  THEMED      // Themed content collection
  EXTERNAL    // External event (link out)
  GENERAL     // General activity
}

enum ActivityStatus {
  DRAFT
  UPCOMING
  ACTIVE
  ENDED
}
```

### Existing Model Updates

The following reverse relations must be added to existing models:

- **`User` model**: add `activities Activity[]`
- **`Challenge` model**: add `activityChallenges ActivityChallenge[]`

### Activity Status Lifecycle

Status transitions are **manual** — the activity author (or admin) updates the status via the edit form. No cron jobs or automated transitions at this stage. The discovery homepage queries by `status` field directly. Automated status transitions (e.g., auto-activate on `startDate`) can be added later if needed.

### Authorization

Activity creation is restricted to **admin users only** (not all authenticated users). This prevents spam and ensures activity quality. The `User` model already has a `role` field that can be checked. Activity editing requires ownership or admin role.

### Design Decisions

- **`type`** distinguishes activity format; **`status`** tracks lifecycle
- **`ActivityChallenge`** join table: hackathons and themed events can associate a set of challenges
- **`externalUrl`**: for external activities like the current OpenClaw page
- **`content`**: Markdown for the activity detail page body
- **Translations**: same pattern as `ChallengeTranslation`
- **`@@map` and `@map`**: follows existing schema convention of snake_case table/column names
- **`onDelete: Cascade`**: follows existing schema convention for user-owned models
- **`@db.Text`**: used on all long-form text fields, matching existing patterns
- Registration, leaderboards, and prizes are intentionally omitted — add when needed

---

## 4. Migration Strategy

### File Moves

| From | To | Notes |
|------|----|-------|
| `src/app/[locale]/challenges/` | `src/app/[locale]/learn/challenges/` | Move directory, update imports |
| `src/app/[locale]/paths/` | `src/app/[locale]/learn/paths/` | Move directory, update imports |
| `src/app/[locale]/activities/` | `src/app/[locale]/learn/activities/` | Replace with new Activity module |
| (new) | `src/app/[locale]/learn/page.tsx` | Discovery homepage |
| (new) | `src/app/[locale]/learn/layout.tsx` | Learn layout wrapper |

Old route directories (`/challenges`, `/paths`, `/activities`) become thin redirect pages.

### New Files

| File | Purpose |
|------|---------|
| `src/lib/activities.ts` | Query functions: `getActivities`, `getActivityBySlug`, `getActiveActivities`, `getUpcomingActivities` |
| `src/actions/activities.ts` | Server Actions: create, update, delete activities |
| `src/app/[locale]/learn/page.tsx` | Discovery homepage |
| `src/app/[locale]/learn/layout.tsx` | Shared layout for Learn module |
| `src/app/[locale]/learn/activities/page.tsx` | Activity list |
| `src/app/[locale]/learn/activities/[slug]/page.tsx` | Activity detail |
| `src/app/[locale]/learn/activities/new/page.tsx` | Create activity form |
| `src/app/[locale]/learn/activities/[slug]/edit/page.tsx` | Edit activity form |
| `src/components/activity-form.tsx` | Activity creation/edit form component |
| `src/components/activity-card.tsx` | Activity card for lists and homepage |

### Internal Link Updates

All internal `Link` components and `href` references pointing to old routes must be updated to new `/learn/` paths. This is critical because client-side navigation via Next.js `Link` does NOT trigger proxy redirects. Files that need updating include (but are not limited to):

- `src/app/[locale]/home-client.tsx`
- `src/app/[locale]/profile/[id]/profile-content.tsx`
- `src/app/[locale]/about/page.tsx`
- `src/app/[locale]/showcase/[id]/detail-client.tsx`
- `src/components/layout/footer.tsx`
- `src/components/layout/header.tsx`
- `src/lib/email.ts`

A codebase-wide search for `/challenges`, `/paths`, and `/activities` hrefs should be performed during implementation to catch all references.

### Unchanged

- Prisma models: `Challenge`, `LearningPath`, `Category`, `Tag`, etc. — schema unchanged (only reverse relation fields added)
- Server Actions: `challenges.ts`, `completions.ts`, `likes.ts`, `comments.ts` — no changes
- Query functions in `src/lib/challenges.ts` — no changes, just referenced from new routes
- Component logic: `challenge-list-client.tsx`, `path-cards.tsx`, `path-detail.tsx` — reused as-is, only import paths updated
- API routes `/api/v1/` — no changes
- Gamification system — no changes

### Redirect Implementation

In `src/proxy.ts`, add redirect rules **before** the `handleI18nRouting` call, mapping old routes to new `/learn/` equivalents. All redirects are 301 (permanent). See Section 1 for implementation details.

### SEO & Sitemap

Update `src/app/sitemap.ts` to generate URLs under `/learn/challenges/*`, `/learn/paths/*`, and `/learn/activities/*` instead of old paths. Update `src/app/robots.ts` if any rules reference old paths.

### i18n

- Add `learn` and `activities` namespaces to `messages/en.json` and `messages/zh.json`
- Activity translations handled by `ActivityTranslation` model (same pattern as challenges)

---

## 5. Header Navigation Update

Current:
```
Challenges | Activities | Learning Paths | Marketplace | Community | AI Studio
```

New:
```
Learn (dropdown) | Marketplace | Community | AI Studio
```

Learn dropdown items:
- **Challenges** → `/learn/challenges`
- **Learning Paths** → `/learn/paths`
- **Activities** → `/learn/activities`

Clicking "Learn" text navigates to `/learn`.

---

## 6. Summary of Changes

| Area | Scope |
|------|-------|
| New pages | Discovery homepage, Activity CRUD (list/detail/new/edit) |
| Migrated pages | Challenges and Paths move under `/learn/` |
| New data model | Activity, ActivityChallenge, ActivityTranslation + enums |
| Existing model updates | Reverse relations on User and Challenge |
| New data layer | `src/lib/activities.ts`, `src/actions/activities.ts` |
| New components | Activity form, activity card |
| Navigation | 3 items → 1 dropdown |
| Redirects | 301 from old routes via `src/proxy.ts` |
| Internal links | Update all `Link` hrefs across codebase |
| SEO | Update sitemap and robots |
| Unchanged | Challenge/Path data models, existing server actions, API routes, gamification, components (reused) |

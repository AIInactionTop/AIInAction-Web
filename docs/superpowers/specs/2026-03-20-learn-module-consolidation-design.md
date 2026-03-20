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
/learn/activities/new           → Create activity (requires auth)
/learn/activities/[slug]        → Activity detail
/learn/activities/[slug]/edit   → Edit activity (requires auth + ownership)
```

### 301 Redirects (in `src/proxy.ts`)

| Old Route | New Route |
|-----------|-----------|
| `/challenges` | `/learn/challenges` |
| `/challenges/*` | `/learn/challenges/*` |
| `/paths` | `/learn/paths` |
| `/paths/*` | `/learn/paths/*` |
| `/activities` | `/learn/activities` |

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
- Up to 4 horizontal cards of challenges the user has **registered but not completed**
- Each card: title, difficulty badge, path name (if any), progress status
- Hidden for unauthenticated users or when no in-progress challenges

### 2.3 Learning Paths
- Horizontal scrollable row of 10 path cards
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
  description String
  coverImage  String?

  type        ActivityType
  status      ActivityStatus

  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  externalUrl String?
  content     String?         // Markdown rich content

  authorId    String
  author      User            @relation(fields: [authorId], references: [id])
  challenges  ActivityChallenge[]
  translations ActivityTranslation[]

  @@index([status])
  @@index([type])
}

model ActivityChallenge {
  activityId  String
  challengeId String
  order       Int             @default(0)
  activity    Activity        @relation(fields: [activityId], references: [id])
  challenge   Challenge       @relation(fields: [challengeId], references: [id])

  @@id([activityId, challengeId])
}

model ActivityTranslation {
  id          String          @id @default(cuid())
  activityId  String
  locale      String
  title       String
  description String
  content     String?
  activity    Activity        @relation(fields: [activityId], references: [id])

  @@unique([activityId, locale])
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

### Design Decisions

- **`type`** distinguishes activity format; **`status`** tracks lifecycle
- **`ActivityChallenge`** join table: hackathons and themed events can associate a set of challenges
- **`externalUrl`**: for external activities like the current OpenClaw page
- **`content`**: Markdown for the activity detail page body
- **Translations**: same pattern as `ChallengeTranslation`
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

### Unchanged

- Prisma models: `Challenge`, `LearningPath`, `Category`, `Tag`, etc. — no changes
- Server Actions: `challenges.ts`, `completions.ts`, `likes.ts`, `comments.ts` — no changes
- Query functions in `src/lib/challenges.ts` — no changes, just referenced from new routes
- Component logic: `challenge-list-client.tsx`, `path-cards.tsx`, `path-detail.tsx` — reused as-is, only import paths updated
- API routes `/api/v1/` — no changes
- Gamification system — no changes

### Redirect Implementation

In `src/proxy.ts`, add redirect rules mapping old routes to new `/learn/` equivalents. All redirects are 301 (permanent).

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
| New data layer | `src/lib/activities.ts`, `src/actions/activities.ts` |
| New components | Activity form, activity card |
| Navigation | 3 items → 1 dropdown |
| Redirects | 301 from old routes via `src/proxy.ts` |
| Unchanged | Challenge/Path data models, existing server actions, API routes, gamification, components (reused) |

# Learn Module Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Challenges, Learning Paths, and Activities into a unified `/learn` module with a discovery homepage and new Activity CRUD.

**Architecture:** Move existing Challenges and Paths pages under `/learn/`, add new Activity data model and CRUD pages, build a discovery homepage at `/learn`, update navigation to a single "Learn" dropdown, and 301 redirect old routes.

**Tech Stack:** Next.js 16 (App Router), Prisma (PostgreSQL), next-intl v4, shadcn/ui, Tailwind CSS v4, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-20-learn-module-consolidation-design.md`

---

## Task 1: Add Activity models to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma` (User model ~line 40, Challenge model ~line 140, add new models at end)

- [ ] **Step 1: Add ActivityType and ActivityStatus enums**

Add after the existing enums (after `Difficulty` enum):

```prisma
enum ActivityType {
  HACKATHON
  THEMED
  EXTERNAL
  GENERAL
}

enum ActivityStatus {
  DRAFT
  UPCOMING
  ACTIVE
  ENDED
}
```

- [ ] **Step 2: Add Activity model**

Add at end of schema:

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
```

- [ ] **Step 3: Add ActivityChallenge join table**

```prisma
model ActivityChallenge {
  activityId  String          @map("activity_id")
  challengeId String          @map("challenge_id")
  order       Int             @default(0)
  activity    Activity        @relation(fields: [activityId], references: [id], onDelete: Cascade)
  challenge   Challenge       @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  @@id([activityId, challengeId])
  @@map("activity_challenges")
}
```

- [ ] **Step 4: Add ActivityTranslation model**

```prisma
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
```

- [ ] **Step 5: Add reverse relations to User and Challenge**

In the `User` model (~line 40), add after the `marketplacePurchases` line:

```prisma
  activities         Activity[]
```

In the `Challenge` model (~line 140), add after the `translations` line:

```prisma
  activityChallenges ActivityChallenge[]
```

- [ ] **Step 6: Generate Prisma client and push schema**

Run:
```bash
pnpm db:generate && pnpm db:push
```

Expected: Schema pushed successfully, no errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Activity, ActivityChallenge, ActivityTranslation models to Prisma schema"
```

---

## Task 2: Create Activity data layer

**Files:**
- Create: `src/lib/activities.ts`
- Create: `src/actions/activities.ts`

**Note on admin authorization:** The `User` model currently has no `role` field. For now, use an environment variable `ADMIN_USER_IDS` (comma-separated list of user IDs) to gate activity creation/management. This is simple and appropriate for the current scale. A proper `role` field can be added later when more role-based features are needed. Add a helper function `isAdmin(userId: string)` in `src/lib/auth.ts` or `src/lib/activities.ts`.

- [ ] **Step 1: Create query functions in `src/lib/activities.ts`**

```typescript
import { prisma } from "@/lib/prisma";
import type { ActivityType, ActivityStatus } from "@prisma/client";

export type ActivityFilters = {
  type?: ActivityType;
  status?: ActivityStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

const activityInclude = {
  author: { select: { id: true, name: true, image: true } },
  challenges: {
    include: { challenge: { select: { id: true, slug: true, title: true, difficulty: true } } },
    orderBy: { order: "asc" as const },
  },
  translations: true,
};

export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return adminIds.includes(userId);
}

export async function getActivities(filters: ActivityFilters = {}) {
  const { type, status, search, page = 1, pageSize = 12 } = filters;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities, total, page, pageSize };
}

export async function getActivityBySlug(slug: string) {
  return prisma.activity.findUnique({
    where: { slug },
    include: activityInclude,
  });
}

export async function getActiveActivities() {
  return prisma.activity.findMany({
    where: { status: "ACTIVE" },
    include: activityInclude,
    orderBy: { startDate: "asc" },
  });
}

export async function getUpcomingActivities() {
  return prisma.activity.findMany({
    where: { status: "UPCOMING" },
    include: activityInclude,
    orderBy: { startDate: "asc" },
  });
}
```

- [ ] **Step 2: Create server actions in `src/actions/activities.ts`**

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/activities";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActivityType, ActivityStatus } from "@prisma/client";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    + "-" + Date.now().toString(36);
}

export async function createActivity(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!isAdmin(session.user.id)) throw new Error("Forbidden: admin only");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as ActivityType;
  const content = formData.get("content") as string | null;
  const externalUrl = formData.get("externalUrl") as string | null;
  const startDate = formData.get("startDate") as string | null;
  const endDate = formData.get("endDate") as string | null;
  const coverImage = formData.get("coverImage") as string | null;

  const slug = generateSlug(title);

  const activity = await prisma.activity.create({
    data: {
      slug,
      title,
      description,
      type,
      status: "DRAFT",
      content: content || null,
      externalUrl: externalUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImage || null,
      authorId: session.user.id,
    },
  });

  revalidatePath("/learn/activities", "layout");
  redirect(`/learn/activities/${activity.slug}`);
}

export async function updateActivity(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  if (existing.authorId !== session.user.id && !isAdmin(session.user.id)) {
    throw new Error("Forbidden");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as ActivityType;
  const status = formData.get("status") as ActivityStatus;
  const content = formData.get("content") as string | null;
  const externalUrl = formData.get("externalUrl") as string | null;
  const startDate = formData.get("startDate") as string | null;
  const endDate = formData.get("endDate") as string | null;
  const coverImage = formData.get("coverImage") as string | null;

  await prisma.activity.update({
    where: { id },
    data: {
      title,
      description,
      type,
      status,
      content: content || null,
      externalUrl: externalUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImage || null,
    },
  });

  revalidatePath("/learn/activities", "layout");
  redirect(`/learn/activities/${existing.slug}`);
}

export async function deleteActivity(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  if (existing.authorId !== session.user.id && !isAdmin(session.user.id)) {
    throw new Error("Forbidden");
  }

  await prisma.activity.delete({ where: { id } });
  revalidatePath("/learn/activities", "layout");
  redirect("/learn/activities");
}
```

- [ ] **Step 3: Verify Prisma types resolve**

Run:
```bash
pnpm db:generate
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/activities.ts src/actions/activities.ts
git commit -m "feat: add Activity query functions and server actions"
```

---

## Task 3: Move Challenges and Paths routes under `/learn`

**Files:**
- Move: `src/app/[locale]/challenges/` → `src/app/[locale]/learn/challenges/`
- Move: `src/app/[locale]/paths/` → `src/app/[locale]/learn/paths/`
- Create: `src/app/[locale]/learn/layout.tsx`

- [ ] **Step 1: Create learn directory and layout**

Create `src/app/[locale]/learn/layout.tsx`:

```typescript
export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

- [ ] **Step 2: Move challenges directory**

```bash
mv src/app/\[locale\]/challenges src/app/\[locale\]/learn/challenges
```

- [ ] **Step 3: Move paths directory**

```bash
mv src/app/\[locale\]/paths src/app/\[locale\]/learn/paths
```

- [ ] **Step 4: Update internal links in moved files**

In `src/app/[locale]/learn/challenges/[slug]/page.tsx`, update the breadcrumb link from `href="/challenges"` to `href="/learn/challenges"`.

In `src/app/[locale]/learn/challenges/challenge-list-client.tsx`, update the "Create" link from `href="/challenges/new"` to `href="/learn/challenges/new"`.

In `src/app/[locale]/learn/paths/[slug]/path-detail.tsx`, update the breadcrumb link from `href="/paths"` to `href="/learn/paths"`.

- [ ] **Step 5: Verify build succeeds**

Run:
```bash
pnpm build
```

Expected: Build succeeds with no errors. Pages should be listed under `/learn/challenges` and `/learn/paths`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: move challenges and paths routes under /learn"
```

---

## Task 4: Update all internal links across codebase

**Files:**
- Modify: `src/components/layout/header.tsx` (lines 32-39)
- Modify: `src/components/layout/footer.tsx` (lines 14-15)
- Modify: `src/app/[locale]/home-client.tsx` (lines 231, 382, 464, 517)
- Modify: `src/app/[locale]/profile/[id]/profile-content.tsx` (line 375)
- Modify: `src/app/[locale]/about/page.tsx` (line 116)

- [ ] **Step 1: Update header navigation**

In `src/components/layout/header.tsx`, replace the `navLinks` array (lines 32-39) with a Learn dropdown structure. Replace the three separate links (`/challenges`, `/activities`, `/paths`) with a single `/learn` entry that has sub-items. The desktop nav needs a dropdown component; the mobile nav needs an expandable section.

Desktop nav: Replace the flat `navLinks.map()` loop with a structure that renders "Learn" as a dropdown trigger with sub-links for Challenges, Learning Paths, and Activities, plus the remaining flat links (Marketplace, Community, AI Studio).

Mobile nav: Same approach but with an expandable/collapsible section.

The Learn dropdown items:
- Challenges → `/learn/challenges`
- Learning Paths → `/learn/paths`
- Activities → `/learn/activities`

The "Learn" text itself links to `/learn`.

Also update the "Create" button link (~line 86): `href="/challenges/new"` → `href="/learn/challenges/new"`.

- [ ] **Step 2: Update footer links**

In `src/components/layout/footer.tsx`, change:
- `{ href: "/challenges" as const, label: t("challenges") }` → `{ href: "/learn/challenges" as const, label: t("challenges") }`
- `{ href: "/paths" as const, label: t("learningPaths") }` → `{ href: "/learn/paths" as const, label: t("learningPaths") }`

- [ ] **Step 3: Update home-client.tsx links**

In `src/app/[locale]/home-client.tsx`, update all occurrences:
- `href="/challenges"` → `href="/learn/challenges"` (lines ~231, ~382, ~464, ~517)

- [ ] **Step 4: Update profile-content.tsx links**

In `src/app/[locale]/profile/[id]/profile-content.tsx`:
- `href="/challenges"` → `href="/learn/challenges"` (line ~375)

- [ ] **Step 5: Update about page links**

In `src/app/[locale]/about/page.tsx`:
- `href="/challenges"` → `href="/learn/challenges"` (line ~116)

- [ ] **Step 6: Search for any remaining old hrefs**

Run a codebase-wide grep for remaining references:
```bash
rg 'href="/(challenges|paths|activities)' src/ --glob '*.tsx' --glob '*.ts'
```

Update any remaining references found (excluding the old route redirect pages we'll create in Task 6).

- [ ] **Step 7: Verify build succeeds**

Run:
```bash
pnpm build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: update all internal links to /learn/* paths"
```

---

## Task 5: Update i18n translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

- [ ] **Step 1: Add learn namespace to en.json**

Add a `"learn"` key to `messages/en.json`:

```json
"learn": {
  "title": "Learn",
  "subtitle": "Discover challenges, learning paths, and activities",
  "continueLearning": "Continue Learning",
  "popularChallenges": "Popular Challenges",
  "learningPaths": "Learning Paths",
  "activeActivities": "Activities",
  "viewAll": "View All",
  "all": "All",
  "official": "Official",
  "community": "Community"
}
```

Add metadata entries to the existing `"metadata"` namespace:

```json
"learnTitle": "Learn - AI In Action",
"learnDescription": "Discover AI challenges, learning paths, and activities",
"activitiesTitle": "Activities - AI In Action",
"activitiesDescription": "Join hackathons, themed events, and community activities"
```

Add an `"activities"` key:

```json
"activities": {
  "title": "Activities",
  "subtitle": "Join hackathons, themed events, and community activities",
  "create": "Create Activity",
  "type": "Type",
  "status": "Status",
  "startDate": "Start Date",
  "endDate": "End Date",
  "externalUrl": "External URL",
  "content": "Content",
  "coverImage": "Cover Image",
  "hackathon": "Hackathon",
  "themed": "Themed",
  "external": "External",
  "general": "General",
  "draft": "Draft",
  "upcoming": "Upcoming",
  "active": "Active",
  "ended": "Ended",
  "noActivities": "No activities yet",
  "viewDetails": "View Details",
  "joinNow": "Join Now",
  "visitSite": "Visit Site"
}
```

Update `"nav"` to add a learn entry:

```json
"nav": {
  "learn": "Learn",
  ...existing keys...
}
```

- [ ] **Step 2: Add corresponding zh.json translations**

Add the same `"learn"` and `"activities"` namespaces with Chinese translations to `messages/zh.json`. Update `"nav"` to add `"learn": "学习"`.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat: add learn and activities i18n translations"
```

---

## Task 6: Add 301 redirects in proxy.ts

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Add redirect logic before i18n routing**

Update `src/proxy.ts` to add redirect logic. The current file:

```typescript
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  const response = handleI18nRouting(request);
  if (response.status === 200) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return response;
}
```

Add a redirect check before `handleI18nRouting`. Import `locales` from i18n config. Strip locale prefix from pathname, check if it matches old routes (`/challenges`, `/paths`, `/activities` and their sub-paths), and if so, build a redirect URL with `/learn/` inserted, preserving locale prefix and query params. Return `NextResponse.redirect(url, 301)`.

Concrete logic — only redirect locale-prefixed paths (bare paths like `/challenges` go through i18n first which adds the locale, then get caught on the next request):

```typescript
import { locales } from './i18n/config';

// Extract locale prefix and bare path
const pathname = request.nextUrl.pathname;
let locale = '';
let barePath = pathname;
for (const l of locales) {
  if (pathname.startsWith(`/${l}/`) || pathname === `/${l}`) {
    locale = l;
    barePath = pathname.slice(`/${l}`.length) || '/';
    break;
  }
}

// Only redirect if we have a locale prefix — bare paths go through i18n first
if (locale) {
  const oldRoutes = ['/challenges', '/paths', '/activities'];
  const needsRedirect = oldRoutes.some(
    (route) => barePath === route || barePath.startsWith(route + '/')
  );

  if (needsRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/learn${barePath}`;
    return NextResponse.redirect(url, 301);
  }
}
```

- [ ] **Step 2: Verify redirects work**

Run:
```bash
pnpm dev
```

Test manually:
- `http://localhost:3000/challenges` should 301 → `/en/learn/challenges` (or `/learn/challenges` depending on locale)
- `http://localhost:3000/en/challenges/some-slug` should 301 → `/en/learn/challenges/some-slug`
- `http://localhost:3000/paths` should 301 → `/en/learn/paths`

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add 301 redirects from old routes to /learn/*"
```

---

## Task 7: Update sitemap

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Update all route references**

In `src/app/sitemap.ts`, update:
- `"/challenges"` → `"/learn/challenges"`
- `"/paths"` → `"/learn/paths"`
- `"/activities"` → `"/learn/activities"`
- `` `/challenges/${c.slug}` `` → `` `/learn/challenges/${c.slug}` ``
- `` `/paths/${p.slug}` `` → `` `/learn/paths/${p.slug}` ``

Add activity detail pages to sitemap:

```typescript
const allActivities = await prisma.activity.findMany({
  where: { status: { not: "DRAFT" } },
  select: { slug: true },
});
```

Add to the Promise.all and generate entries:

```typescript
const activityPages = allActivities.map((a) =>
  localizedEntry(`/learn/activities/${a.slug}`, {
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  })
);
```

Add `"/learn"` as a static page entry with priority 0.95.

Return: `[...staticPages, ...paths, ...challenges, ...activityPages]`

- [ ] **Step 2: Verify robots.ts**

Check `src/app/robots.ts` — the current file only disallows `/api/` and `/profile/`, no old route references. No changes needed.

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: update sitemap to use /learn/* routes and include activities"
```

---

## Task 8: Build Activity pages (list, detail, new, edit)

**Files:**
- Create: `src/components/activity-card.tsx`
- Create: `src/components/activity-form.tsx`
- Create: `src/app/[locale]/learn/activities/page.tsx`
- Create: `src/app/[locale]/learn/activities/[slug]/page.tsx`
- Create: `src/app/[locale]/learn/activities/new/page.tsx`
- Create: `src/app/[locale]/learn/activities/[slug]/edit/page.tsx`

- [ ] **Step 1: Create activity-card.tsx component**

A card component that displays an activity's title, description, type badge, status badge, date range, and cover image. Follow the same card pattern used by challenge cards in the existing codebase. Use shadcn `Badge` for type/status, `Card` for container. Link to `/learn/activities/[slug]`.

For EXTERNAL type activities, the CTA should say "Visit Site" and link to `externalUrl`. For others, link to the detail page.

- [ ] **Step 2: Create activity list page**

`src/app/[locale]/learn/activities/page.tsx` — Server component that calls `getActivities()` with filters from searchParams. Renders a grid of `ActivityCard` components. Support filtering by type and status via query params. Follow the same pattern as the challenges list page (server component fetching data, passing to client component).

- [ ] **Step 3: Create activity detail page**

`src/app/[locale]/learn/activities/[slug]/page.tsx` — Server component that calls `getActivityBySlug(slug)`. Renders:
- Cover image (if any)
- Title, type badge, status badge
- Date range (if any)
- Author info
- Markdown content (rendered from `content` field)
- Associated challenges list (from `ActivityChallenge` relation)
- External URL button (if EXTERNAL type)
- Edit button (if author)

Use a Markdown renderer for the content field. Follow existing detail page patterns.

- [ ] **Step 4: Create activity-form.tsx component**

A form component for creating/editing activities. Fields:
- title (text input)
- description (textarea)
- type (select: HACKATHON, THEMED, EXTERNAL, GENERAL)
- status (select: DRAFT, UPCOMING, ACTIVE, ENDED — only on edit)
- content (textarea/markdown editor)
- externalUrl (text input, shown when type is EXTERNAL)
- startDate (date input)
- endDate (date input)
- coverImage (text input for URL)

Follow the same pattern as `src/components/challenge-form.tsx`. Use shadcn form components.

- [ ] **Step 5: Create activity new page**

`src/app/[locale]/learn/activities/new/page.tsx` — Requires auth + admin check via `isAdmin()`. If not admin, redirect to `/learn/activities`. Renders `ActivityForm` with `createActivity` action.

- [ ] **Step 6: Create activity edit page**

`src/app/[locale]/learn/activities/[slug]/edit/page.tsx` — Requires auth + (ownership or admin via `isAdmin()`). Fetches activity, checks permissions, renders `ActivityForm` pre-filled, with `updateActivity` action.

- [ ] **Step 7: Verify all activity pages work**

Run:
```bash
pnpm dev
```

Test:
- `/learn/activities` — should show empty list
- `/learn/activities/new` — should show creation form (when logged in)
- Create an activity, verify it appears in the list
- Click into detail page, verify all fields display
- Edit the activity, verify changes persist

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Activity CRUD pages (list, detail, new, edit)"
```

---

## Task 9: Build Discovery Homepage (`/learn`)

**Files:**
- Create: `src/app/[locale]/learn/page.tsx`
- Create: `src/app/[locale]/learn/learn-client.tsx`

- [ ] **Step 1: Create server page component**

`src/app/[locale]/learn/page.tsx` — Fetches all data needed for the four sections:

```typescript
import { getChallenges, getAllPaths } from "@/lib/challenges";
import { getActiveActivities } from "@/lib/activities";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LearnClient } from "./learn-client";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

// ... generateMetadata, fetch active activities, user in-progress challenges,
// all paths, popular challenges, pass all to LearnClient
```

For "Continue Learning" section, query:
```typescript
// Only if user is authenticated
const registrations = await prisma.challengeRegistration.findMany({
  where: {
    userId: session.user.id,
    challenge: {
      completions: {
        none: { userId: session.user.id, status: "COMPLETED" },
      },
    },
  },
  include: {
    challenge: {
      include: {
        category: true,
        path: true,
      },
    },
  },
  take: 4,
  orderBy: { createdAt: "desc" },
});
```

For popular challenges:
```typescript
const { challenges: popularChallenges } = await getChallenges({
  sortBy: "likes",
  pageSize: 12,
}, locale);
```

- [ ] **Step 2: Create client component**

`src/app/[locale]/learn/learn-client.tsx` — Renders the four sections:

1. **Activity Banner** — Carousel or single card for active/upcoming activities. Use Framer Motion for transitions. Hidden if no activities.
2. **Continue Learning** — Horizontal card row, hidden if not authenticated or no in-progress challenges.
3. **Learning Paths** — Horizontal scrollable row of path cards with icon, name, challenge count.
4. **Popular Challenges** — Grid of challenge cards with All/Official/Community tab filter.

Each section has a header with title and "View All" link. Follow existing UI patterns (shadcn Card, Badge, Framer Motion animations).

- [ ] **Step 3: Verify homepage renders**

Run:
```bash
pnpm dev
```

Navigate to `/learn`. Verify:
- Activity banner shows if there are active activities (or is hidden)
- Continue Learning shows for logged-in users with registrations (or is hidden)
- Learning paths display in a horizontal row
- Popular challenges display in a grid
- All "View All" links navigate correctly

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: build /learn discovery homepage with four content sections"
```

---

## Task 10: Final verification and cleanup

**Files:**
- Various files for final fixes

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 3: Test all redirects**

Start dev server and verify:
- `/challenges` → 301 → `/learn/challenges`
- `/challenges/some-slug` → 301 → `/learn/challenges/some-slug`
- `/paths` → 301 → `/learn/paths`
- `/paths/some-slug` → 301 → `/learn/paths/some-slug`
- `/activities` → 301 → `/learn/activities`
- `/en/challenges` → 301 → `/en/learn/challenges`
- `/zh/challenges` → 301 → `/zh/learn/challenges`

- [ ] **Step 4: Test all pages render**

Verify:
- `/learn` — Discovery homepage renders with all sections
- `/learn/challenges` — Challenge list works with all filters
- `/learn/challenges/[slug]` — Detail page works
- `/learn/challenges/new` — Creation form works
- `/learn/paths` — Paths list works
- `/learn/paths/[slug]` — Path detail works
- `/learn/activities` — Activity list works
- `/learn/activities/new` — Activity creation works (when logged in)
- Header "Learn" dropdown works on desktop and mobile
- Footer links point to correct paths

- [ ] **Step 5: Remove old activities page if still present**

If `src/app/[locale]/activities/` still exists (the old OpenClaw activities page), remove it since it's been replaced by the new Activity module and redirects handle old URLs.

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification for Learn module consolidation"
```

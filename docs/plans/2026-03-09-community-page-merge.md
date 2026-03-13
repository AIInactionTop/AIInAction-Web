# Community Page Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge Leaderboard and Showcase into a single Community page with three tabs (Showcase, Leaderboard, Members), and update navigation accordingly.

**Architecture:** Create a new `/community` route with a server component that fetches all data (projects, leaderboard, members) in parallel, then passes to a client component with URL-synced tabs. Reuse existing `ShowcaseClient` and `LeaderboardContent` as embedded sub-components. Add a new `MembersContent` component with member cards.

**Tech Stack:** Next.js App Router, Prisma, next-intl, Framer Motion, shadcn/ui Tabs, Radix UI

---

### Task 1: Add translation keys for Community page

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

**Step 1: Add community namespace to en.json**

In the `nav` section, replace `"showcase"` and `"leaderboard"` with:
```json
"community": "Community"
```

Add a new `"community"` namespace:
```json
"community": {
  "title": "Community",
  "subtitle": "Connect with fellow AI builders. Explore projects, rankings, and members.",
  "showcaseTab": "Showcase",
  "leaderboardTab": "Leaderboard",
  "membersTab": "Members",
  "sortByXP": "Sort by XP",
  "sortByNewest": "Sort by Newest",
  "searchMembers": "Search members...",
  "noMembers": "No members found.",
  "challengesCompleted": "Challenges",
  "projectsShared": "Projects",
  "joinedOn": "Joined {date}"
}
```

**Step 2: Add community namespace to zh.json**

Same structure in Chinese:
```json
"community": "社区"
```

```json
"community": {
  "title": "社区",
  "subtitle": "与 AI 开发者们交流。探索项目、排名和成员。",
  "showcaseTab": "项目展示",
  "leaderboardTab": "排行榜",
  "membersTab": "成员",
  "sortByXP": "按经验排序",
  "sortByNewest": "按最新排序",
  "searchMembers": "搜索成员...",
  "noMembers": "未找到成员。",
  "challengesCompleted": "挑战",
  "projectsShared": "项目",
  "joinedOn": "加入于 {date}"
}
```

**Step 3: Commit**
```bash
git add messages/en.json messages/zh.json
git commit -m "feat: add community page translation keys"
```

---

### Task 2: Add getMembers data function

**Files:**
- Modify: `src/lib/gamification.ts`

**Step 1: Add getMembers function**

Add to `src/lib/gamification.ts`:

```typescript
export type MemberInfo = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  githubUrl: string | null;
  createdAt: Date;
  xp: number;
  level: number;
  currentStreak: number;
  levelInfo: Level;
  challengesCompleted: number;
  projectsShared: number;
};

export async function getMembers(
  sortBy: "xp" | "newest" = "xp",
  limit = 50
): Promise<MemberInfo[]> {
  const users = await prisma.user.findMany({
    take: limit,
    orderBy: sortBy === "newest" ? { createdAt: "desc" } : undefined,
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      githubUrl: true,
      createdAt: true,
      stats: true,
      _count: {
        select: {
          completions: { where: { status: "COMPLETED" } },
          projects: true,
        },
      },
    },
  });

  const members = users.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    bio: u.bio,
    githubUrl: u.githubUrl,
    createdAt: u.createdAt,
    xp: u.stats?.xp ?? 0,
    level: u.stats?.level ?? 1,
    currentStreak: u.stats?.currentStreak ?? 0,
    levelInfo: getLevelFromXP(u.stats?.xp ?? 0),
    challengesCompleted: u._count.completions,
    projectsShared: u._count.projects,
  }));

  if (sortBy === "xp") {
    members.sort((a, b) => b.xp - a.xp);
  }

  return members;
}
```

**Step 2: Commit**
```bash
git add src/lib/gamification.ts
git commit -m "feat: add getMembers data function for community page"
```

---

### Task 3: Create MembersContent client component

**Files:**
- Create: `src/app/[locale]/community/members-content.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Github, Trophy, FolderOpen, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Level } from "@/lib/xp";

export type SerializedMember = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  githubUrl: string | null;
  createdAt: string;
  xp: number;
  level: number;
  currentStreak: number;
  levelInfo: Level;
  challengesCompleted: number;
  projectsShared: number;
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export function MembersContent({
  members,
  defaultSort = "xp",
}: {
  members: SerializedMember[];
  defaultSort?: "xp" | "newest";
}) {
  const t = useTranslations("community");
  const tl = useTranslations("levels");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"xp" | "newest">(defaultSort);

  const sorted = [...members].sort((a, b) =>
    sortBy === "newest"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : b.xp - a.xp
  );

  const filtered = search.trim()
    ? sorted.filter(
        (m) =>
          m.name?.toLowerCase().includes(search.toLowerCase()) ||
          m.bio?.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchMembers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "xp" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("xp")}
          >
            {t("sortByXP")}
          </Button>
          <Button
            variant={sortBy === "newest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("newest")}
          >
            {t("sortByNewest")}
          </Button>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((member) => {
          const displayName = member.name || "AI Builder";
          return (
            <motion.div key={member.id} variants={fadeUp}>
              <Link href={`/profile/${member.id}` as never}>
                <div className="group h-full rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.image || ""} alt={displayName} />
                      <AvatarFallback>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </div>
                      <Badge
                        variant="secondary"
                        className="mt-0.5 text-[10px]"
                        style={{ color: member.levelInfo.color }}
                      >
                        Lv.{member.level} {tl(String(member.level))}
                      </Badge>
                    </div>
                    {member.githubUrl && (
                      <a
                        href={member.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {member.bio && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {member.bio}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-primary" />
                      {member.xp.toLocaleString()} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3.5 w-3.5" />
                      {member.challengesCompleted} {t("challengesCompleted")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      {member.currentStreak}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground/60">
                    {t("joinedOn", {
                      date: new Date(member.createdAt).toLocaleDateString(),
                    })}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/app/[locale]/community/members-content.tsx
git commit -m "feat: add MembersContent component for community page"
```

---

### Task 4: Create CommunityClient wrapper with URL-synced tabs

**Files:**
- Create: `src/app/[locale]/community/community-client.tsx`

**Step 1: Create the wrapper component**

This component uses the `tab` search param and renders Showcase, Leaderboard, Members as tab content. It reuses existing `ShowcaseClient` and `LeaderboardContent` components.

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { ShowcaseClient } from "../showcase/showcase-client";
import { LeaderboardContent } from "../leaderboard/leaderboard-content";
import { MembersContent, type SerializedMember } from "./members-content";

// Re-export types from existing components as needed
type LeaderboardEntry = {
  userId: string;
  userName: string | null;
  userImage: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  levelInfo: import("@/lib/xp").Level;
};

type SerializedProject = {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  demoUrl: string | null;
  imageUrl: string | null;
  tags: string[];
  likes: number;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
  challenge: { id: string; slug: string; title: string } | null;
};

export function CommunityClient({
  projects,
  totalProjects,
  likedProjectIds,
  xpBoard,
  streakBoard,
  members,
}: {
  projects: SerializedProject[];
  totalProjects: number;
  likedProjectIds: string[];
  xpBoard: LeaderboardEntry[];
  streakBoard: LeaderboardEntry[];
  members: SerializedMember[];
}) {
  const t = useTranslations("community");
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "showcase";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/community?${params.toString()}` as never, { scroll: false });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="mt-8">
      <TabsList>
        <TabsTrigger value="showcase">{t("showcaseTab")}</TabsTrigger>
        <TabsTrigger value="leaderboard">{t("leaderboardTab")}</TabsTrigger>
        <TabsTrigger value="members">{t("membersTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="showcase" className="mt-6">
        <ShowcaseClient
          projects={projects}
          total={totalProjects}
          likedProjectIds={likedProjectIds}
        />
      </TabsContent>

      <TabsContent value="leaderboard" className="mt-6">
        <LeaderboardContent xpBoard={xpBoard} streakBoard={streakBoard} />
      </TabsContent>

      <TabsContent value="members" className="mt-6">
        <MembersContent members={members} />
      </TabsContent>
    </Tabs>
  );
}
```

**Step 2: Commit**
```bash
git add src/app/[locale]/community/community-client.tsx
git commit -m "feat: add CommunityClient wrapper with URL-synced tabs"
```

---

### Task 5: Create Community page server component

**Files:**
- Create: `src/app/[locale]/community/page.tsx`

**Step 1: Create the server page**

```tsx
import type { Metadata } from "next";
import { getProjects } from "@/lib/challenges";
import { getLeaderboard, getMembers } from "@/lib/gamification";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CommunityClient } from "./community-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "community" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("community");

  const session = await auth();

  const [{ projects, total }, xpBoard, streakBoard, members, likedProjectIds] =
    await Promise.all([
      getProjects(),
      getLeaderboard("xp", 50),
      getLeaderboard("streak", 50),
      getMembers("xp", 100),
      session?.user?.id
        ? prisma.sharedProjectLike
            .findMany({
              where: { userId: session.user.id },
              select: { projectId: true },
            })
            .then((likes) => likes.map((l) => l.projectId))
        : Promise.resolve([] as string[]),
    ]);

  const serialize = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>

      <CommunityClient
        projects={serialize(projects)}
        totalProjects={total}
        likedProjectIds={likedProjectIds}
        xpBoard={serialize(xpBoard)}
        streakBoard={serialize(streakBoard)}
        members={serialize(members)}
      />
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/app/[locale]/community/page.tsx
git commit -m "feat: add community page server component"
```

---

### Task 6: Update ShowcaseClient to work embedded (remove outer wrapper when embedded)

**Files:**
- Modify: `src/app/[locale]/showcase/showcase-client.tsx`

**Step 1: Make the outer layout optional**

The `ShowcaseClient` currently renders its own title, subtitle, and outer padding. When embedded in the Community page, it should skip the outer wrapper. Add an `embedded` prop.

Change the component signature to accept `embedded?: boolean` and conditionally skip the title section and outer padding when embedded.

**Step 2: Commit**
```bash
git add src/app/[locale]/showcase/showcase-client.tsx
git commit -m "feat: add embedded mode to ShowcaseClient for community page"
```

---

### Task 7: Update LeaderboardContent to work embedded

**Files:**
- Modify: `src/app/[locale]/leaderboard/leaderboard-content.tsx`

The leaderboard content is already a pure component without outer wrappers (title/padding are in the page.tsx). No changes needed — it can be reused as-is.

---

### Task 8: Update Header navigation

**Files:**
- Modify: `src/components/layout/header.tsx`

**Step 1: Replace showcase + leaderboard with community**

In the `navLinks` array, replace:
```typescript
{ href: "/showcase" as const, label: t("showcase") },
{ href: "/leaderboard" as const, label: t("leaderboard") },
```

With:
```typescript
{ href: "/community" as const, label: t("community") },
```

**Step 2: Commit**
```bash
git add src/components/layout/header.tsx
git commit -m "feat: merge showcase and leaderboard into community nav link"
```

---

### Task 9: Update Footer if it references showcase/leaderboard

**Files:**
- Check and modify: `src/components/layout/footer.tsx`

Check if footer has links to `/showcase` or `/leaderboard` and update them to `/community` or `/community?tab=showcase` / `/community?tab=leaderboard`.

**Step 1: Commit**
```bash
git add src/components/layout/footer.tsx
git commit -m "feat: update footer links to community page"
```

---

### Task 10: Update showcase sub-routes breadcrumbs

**Files:**
- Modify: `src/app/[locale]/showcase/[id]/page.tsx` (if it links back to /showcase)
- Modify: `src/app/[locale]/showcase/[id]/detail-client.tsx` (back link)
- Modify: `src/app/[locale]/showcase/submit/page.tsx` (breadcrumb)

Update any "Back to Showcase" links to point to `/community?tab=showcase`.

**Step 1: Commit**
```bash
git add src/app/[locale]/showcase/
git commit -m "feat: update showcase sub-route breadcrumbs to community page"
```

---

### Task 11: Add metadata translations

**Files:**
- Modify: `messages/en.json` (metadata section)
- Modify: `messages/zh.json` (metadata section)

Add `communityTitle` and `communityDescription` to the metadata namespace if it exists.

**Step 1: Commit**
```bash
git add messages/en.json messages/zh.json
git commit -m "feat: add community metadata translations"
```

---

### Task 12: Verify and test

**Step 1:** Run `pnpm build` to ensure no TypeScript errors.

**Step 2:** Run `pnpm dev` and manually verify:
- `/community` loads with 3 tabs
- Showcase tab shows projects grid with search + submit button
- Leaderboard tab shows XP/streak rankings
- Members tab shows member cards with search + sort
- Tab switching updates URL params
- `/showcase/[id]` still works with correct back link
- Navigation header shows "Community" link
- Both en/zh translations work

**Step 3: Final commit**
```bash
git commit -m "feat: community page merge complete"
```

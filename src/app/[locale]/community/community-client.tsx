"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FolderOpen, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShowcaseClient } from "../showcase/showcase-client";
import { LeaderboardContent } from "../leaderboard/leaderboard-content";
import { MembersContent, type SerializedMember } from "./members-content";
import type { Level } from "@/lib/xp";

type LeaderboardEntry = {
  userId: string;
  userName: string | null;
  userImage: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  levelInfo: Level;
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

  const tabs = [
    { value: "showcase", icon: FolderOpen, label: t("showcaseTab"), count: totalProjects },
    { value: "leaderboard", icon: Trophy, label: t("leaderboardTab") },
    { value: "members", icon: Users, label: t("membersTab"), count: members.length },
  ] as const;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border px-4 py-5 text-center transition-all sm:flex-row sm:gap-3 sm:px-6 sm:py-4 sm:text-left",
                isActive
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border/60 bg-card/50 hover:border-border hover:bg-card hover:shadow-sm"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-semibold transition-colors sm:text-base",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                >
                  {tab.label}
                </div>
                {"count" in tab && tab.count != null && (
                  <div className="text-xs text-muted-foreground">
                    {tab.count.toLocaleString()}
                  </div>
                )}
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary sm:bottom-auto sm:left-0 sm:top-1/2 sm:h-8 sm:w-0.5 sm:-translate-x-0 sm:-translate-y-1/2" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {currentTab === "showcase" && (
          <ShowcaseClient
            projects={projects}
            total={totalProjects}
            likedProjectIds={likedProjectIds}
            embedded
          />
        )}
        {currentTab === "leaderboard" && (
          <LeaderboardContent xpBoard={xpBoard} streakBoard={streakBoard} />
        )}
        {currentTab === "members" && (
          <MembersContent members={members} />
        )}
      </div>
    </div>
  );
}

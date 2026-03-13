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
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(member.githubUrl!, "_blank", "noopener,noreferrer");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(member.githubUrl!, "_blank", "noopener,noreferrer");
                          }
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Github className="h-4 w-4" />
                      </span>
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

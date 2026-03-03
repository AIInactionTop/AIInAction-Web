"use client";

import { useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Github,
  ExternalLink,
  Heart,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SubmitProjectForm } from "./submit-form";
import { toggleProjectLike } from "@/actions/projects";
import Image from "next/image";

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

export function ShowcaseClient({
  projects,
  total,
  likedProjectIds = [],
}: {
  projects: SerializedProject[];
  total: number;
  likedProjectIds?: string[];
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set(likedProjectIds));
  const [likesMap, setLikesMap] = useState<Record<string, number>>(
    Object.fromEntries(projects.map((p) => [p.id, p.likes]))
  );
  const t = useTranslations("showcase");

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.some((tag) => tag.includes(search.toLowerCase()))
      )
    : projects;

  const handleLike = useCallback(
    async (e: React.MouseEvent, projectId: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!session) {
        signIn("github");
        return;
      }

      const wasLiked = likedSet.has(projectId);
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(projectId);
        else next.add(projectId);
        return next;
      });
      setLikesMap((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || 0) + (wasLiked ? -1 : 1),
      }));

      try {
        await toggleProjectLike(projectId);
      } catch {
        setLikedSet((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(projectId);
          else next.delete(projectId);
          return next;
        });
        setLikesMap((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || 0) + (wasLiked ? 1 : -1),
        }));
      }
    },
    [session, likedSet]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {session ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("shareProject")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("shareTitle")}</DialogTitle>
              </DialogHeader>
              <SubmitProjectForm onSuccess={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        ) : (
          <Button className="gap-2" onClick={() => signIn("github")}>
            <Github className="h-4 w-4" />
            {t("signInShare")}
          </Button>
        )}
      </div>

      <div className="mt-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((project) => {
          const isLiked = likedSet.has(project.id);
          const currentLikes = likesMap[project.id] ?? project.likes;

          return (
            <motion.div key={project.id} variants={fadeUp}>
              <div
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/showcase/${project.id}`)}
                onKeyDown={(e) => { if (e.key === "Enter") router.push(`/showcase/${project.id}`); }}
                className="block cursor-pointer"
              >
                <div className="group h-full rounded-xl border border-border/60 bg-card/50 transition-all hover:border-border hover:bg-card hover:shadow-lg overflow-hidden">
                  {project.imageUrl && (
                    <div className="relative h-40 w-full overflow-hidden border-b border-border/40">
                      <Image
                        src={project.imageUrl}
                        alt={project.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/profile/${project.user.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={project.user.image || ""} />
                          <AvatarFallback className="text-xs">
                            {project.user.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {project.user.name}
                        </span>
                      </Link>
                      <button
                        onClick={(e) => handleLike(e, project.id)}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                          isLiked
                            ? "bg-red-50 text-red-500 dark:bg-red-950/30"
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`}
                        />
                        {currentLikes}
                      </button>
                    </div>

                    <h3 className="mt-4 font-semibold group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                      {project.description.replace(/<[^>]*>/g, "")}
                    </p>

                    {project.challenge && (
                      <Badge variant="secondary" className="mt-3 text-[10px]">
                        {project.challenge.title}
                      </Badge>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Github className="h-3.5 w-3.5" />
                          {t("source")}
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("demo")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-lg font-medium">{t("noProjects")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("noProjectsHint")}
          </p>
        </div>
      )}
    </div>
  );
}

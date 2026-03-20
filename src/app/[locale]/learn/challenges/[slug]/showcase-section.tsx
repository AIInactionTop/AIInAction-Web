"use client";

import Image from "next/image";
import { Github, ExternalLink, FolderOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

type Project = {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  demoUrl: string | null;
  tags: string[];
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export function ShowcaseSection({ projects }: { projects: Project[] }) {
  const t = useTranslations("challengeShowcase");

  if (projects.length === 0) return null;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <FolderOpen className="h-5 w-5 text-primary" />
        {t("title")} ({projects.length})
      </h2>
      <div className="mt-4 space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-lg border border-border/60 bg-card/50 p-4"
          >
            <div className="flex items-center gap-2">
              {project.user.image && (
                <Image
                  src={project.user.image}
                  alt={project.user.name || ""}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <Link
                href={`/profile/${project.user.id}`}
                className="text-sm font-medium hover:underline"
              >
                {project.user.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-medium">{project.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {project.description}
            </p>
            {project.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-3">
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                {t("source")}
              </a>
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("demo")}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Heart,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "@/i18n/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toggleProjectLike, deleteProject } from "@/actions/projects";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";

type Project = {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  demoUrl: string | null;
  imageUrl: string | null;
  tags: string[];
  likes: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    githubUrl: string | null;
  };
  challenge: { id: string; slug: string; title: string } | null;
};

export function ShowcaseDetailClient({
  project,
  initialLiked,
}: {
  project: Project;
  initialLiked: boolean;
}) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(project.likes);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("showcase");
  const router = useRouter();

  const isOwner = session?.user?.id === project.user.id;

  const handleLike = async () => {
    if (!session) {
      signIn("github");
      return;
    }
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      await toggleProjectLike(project.id);
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.push("/community?tab=showcase");
    } catch {
      setDeleting(false);
    }
  };

  const date = new Date(project.createdAt);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href="/community?tab=showcase"
        className="mb-8 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToShowcase")}
      </Link>

      {project.imageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl border border-border">
          <Image
            src={project.imageUrl}
            alt={project.title}
            width={800}
            height={400}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {project.title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <>
              <Link href={`/showcase/${project.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("editPageTitle")}
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("deleteConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteConfirmDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? t("deleting") : t("deleteConfirmButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            disabled={liking}
            className="gap-1.5"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {likesCount}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Link href={`/profile/${project.user.id}`}>
          <Avatar className="h-8 w-8 transition-opacity hover:opacity-80">
            <AvatarImage src={project.user.image || ""} />
            <AvatarFallback className="text-xs">
              {project.user.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link
            href={`/profile/${project.user.id}`}
            className="text-sm font-medium hover:underline"
          >
            {project.user.name}
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {project.challenge && (
        <div className="mt-4">
          <Link href={`/challenges/${project.challenge.slug}`}>
            <Badge
              variant="secondary"
              className="transition-colors hover:bg-secondary/80"
            >
              {t("linkedToChallenge")} {project.challenge.title}
            </Badge>
          </Link>
        </div>
      )}

      <div
        className="prose prose-sm dark:prose-invert mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: project.description }}
      />

      {project.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <Github className="h-4 w-4" />
              {t("source")}
            </Button>
          </a>
        )}
        {project.demoUrl && (
          <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t("demo")}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

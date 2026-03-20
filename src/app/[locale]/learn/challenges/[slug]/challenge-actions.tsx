"use client";

import { useState, useTransition } from "react";
import { Github, Share2, CheckCircle, Heart, GitFork, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signIn } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { toggleLike } from "@/actions/likes";
import { forkChallenge, deleteChallenge } from "@/actions/challenges";
import { markComplete, saveReflection, type CompletionResult } from "@/actions/completions";
import { registerForChallenge } from "@/actions/registrations";
import { CompletionModal } from "@/components/gamification/completion-modal";
import { useTranslations } from "next-intl";

type Props = {
  challengeId: string;
  slug: string;
  likesCount: number;
  liked: boolean;
  completed: boolean;
  registered: boolean;
  isAuthor: boolean;
};

export function ChallengeActions({ challengeId, slug, likesCount, liked, completed, registered, isAuthor }: Props) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const t = useTranslations("challenge");
  const tc = useTranslations("common");

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "AI In Action Challenge",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleLike = () => {
    startTransition(() => toggleLike(challengeId));
  };

  const handleFork = () => {
    startTransition(() => forkChallenge(slug));
  };

  const handleRegister = () => {
    startTransition(() => registerForChallenge(challengeId));
  };

  const handleComplete = () => {
    startTransition(async () => {
      const result = await markComplete(challengeId);
      setCompletionResult(result);
      setShowModal(true);
    });
  };

  const handleSubmitReflection = (reflection: string, isPublic: boolean) => {
    startTransition(() => saveReflection(challengeId, reflection, isPublic));
  };

  const handleDelete = () => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(() => deleteChallenge(challengeId));
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        {session ? (
          <>
            <Button
              variant={liked ? "default" : "outline"}
              className="gap-2"
              onClick={handleLike}
              disabled={isPending}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likesCount}
            </Button>
            {/* <Button variant="outline" className="gap-2" onClick={handleFork} disabled={isPending}>
              <GitFork className="h-4 w-4" />
              {t("fork")}
            </Button> */}
            {completed ? (
              <Button variant="outline" className="gap-2 text-green-600 border-green-600/30 pointer-events-none" disabled>
                <CheckCircle className="h-4 w-4 fill-green-600 text-white" />
                {t("completed")}
              </Button>
            ) : registered ? (
              <Button className="gap-2" onClick={handleComplete} disabled={isPending}>
                <CheckCircle className="h-4 w-4" />
                {t("markComplete")}
              </Button>
            ) : (
              <Button className="gap-2" onClick={handleRegister} disabled={isPending}>
                <UserPlus className="h-4 w-4" />
                {t("register")}
              </Button>
            )}
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/showcase/submit?challenge=${slug}`}>
                <Github className="h-4 w-4" />
                {t("shareSolution")}
              </Link>
            </Button>
            {isAuthor && (
              <>
                <Button variant="outline" className="gap-2" asChild>
                  <Link href={`/challenges/${slug}/edit`}>
                    <Pencil className="h-4 w-4" />
                    {tc("edit")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  {tc("delete")}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" className="gap-2" disabled>
              <Heart className="h-4 w-4" />
              {likesCount}
            </Button>
            <Button className="gap-2" onClick={() => signIn("github")}>
              <Github className="h-4 w-4" />
              {t("signInTrack")}
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <CompletionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        result={completionResult}
        onSubmitReflection={handleSubmitReflection}
      />
    </>
  );
}

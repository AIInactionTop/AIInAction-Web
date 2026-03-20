"use client";

import { useTransition, useRef } from "react";
import Image from "next/image";
import { MessageCircle, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signIn } from "next-auth/react";
import { createComment, deleteComment } from "@/actions/comments";
import { useTranslations } from "next-intl";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type Props = {
  challengeId: string;
  comments: Comment[];
  totalComments: number;
  currentUserId: string | null;
};

export function CommentSection({ challengeId, comments, totalComments, currentUserId }: Props) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("comments");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get("content") as string;
    if (!content.trim()) return;

    startTransition(async () => {
      await createComment(challengeId, content);
      formRef.current?.reset();
    });
  };

  const handleDelete = (commentId: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(() => deleteComment(commentId));
  };

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <MessageCircle className="h-5 w-5 text-primary" />
        {t("title")} ({totalComments})
      </h2>

      {/* Comment form */}
      {session ? (
        <form ref={formRef} onSubmit={handleSubmit} className="mt-4">
          <textarea
            name="content"
            placeholder={t("placeholder")}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            required
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" className="gap-2" disabled={isPending}>
              <Send className="h-3.5 w-3.5" />
              {t("submit")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <button
              onClick={() => signIn("github")}
              className="text-primary hover:underline font-medium"
            >
              {t("signIn")}
            </button>{" "}
            {t("signInHint")}
          </p>
        </div>
      )}

      {/* Comments list */}
      <div className="mt-6 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            {comment.user.image ? (
              <Image
                src={comment.user.image}
                alt={comment.user.name || ""}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
                {currentUserId === comment.userId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noComments")}
          </p>
        )}
      </div>
    </section>
  );
}

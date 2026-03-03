"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { createProject } from "@/actions/projects";
import { useRouter } from "next/navigation";

type Props = {
  onSuccess?: () => void;
  challengeSlug?: string;
  challengeName?: string;
};

export function SubmitProjectForm({ onSuccess, challengeSlug, challengeName }: Props) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("showcase");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createProject(formData);
      router.refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/showcase");
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {challengeSlug && <input type="hidden" name="challengeSlug" value={challengeSlug} />}
      {challengeName && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          {t("linkedToChallenge")}{" "}
          <span className="font-medium">{challengeName}</span>
        </div>
      )}
      <div>
        <label className="text-sm font-medium">{t("projectTitle")}</label>
        <Input
          name="title"
          placeholder={t("projectTitlePlaceholder")}
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("githubUrl")}</label>
        <div className="relative mt-1.5">
          <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="githubUrl"
            placeholder={t("githubUrlPlaceholder")}
            required
            className="pl-9"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">
          {t("demoUrl")}{" "}
          <span className="text-muted-foreground font-normal">{t("demoUrlOptional")}</span>
        </label>
        <Input
          name="demoUrl"
          placeholder={t("demoUrlPlaceholder")}
          className="mt-1.5"
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("description")}</label>
        <textarea
          name="description"
          placeholder={t("descriptionPlaceholder")}
          required
          rows={3}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          {t("tags")}{" "}
          <span className="text-muted-foreground font-normal">
            {t("tagsHint")}
          </span>
        </label>
        <Input
          name="tags"
          placeholder={t("tagsPlaceholder")}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("sharing") : t("submitButton")}
      </Button>
    </form>
  );
}

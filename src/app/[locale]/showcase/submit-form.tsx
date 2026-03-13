"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichEditor } from "@/components/ui/rich-editor";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslations } from "next-intl";
import { createProject, updateProject } from "@/actions/projects";
import { useRouter } from "next/navigation";

type Props = {
  onSuccess?: () => void;
  challengeSlug?: string;
  challengeName?: string;
  projectId?: string;
  defaultValues?: {
    title: string;
    description: string;
    githubUrl: string;
    demoUrl: string | null;
    imageUrl: string | null;
    tags: string[];
  };
};

export function SubmitProjectForm({
  onSuccess,
  challengeSlug,
  challengeName,
  projectId,
  defaultValues,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(defaultValues?.description || "");
  const [imageUrl, setImageUrl] = useState(defaultValues?.imageUrl || "");
  const t = useTranslations("showcase");
  const router = useRouter();
  const isEdit = !!projectId;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("description", description);
      if (imageUrl) {
        formData.set("imageUrl", imageUrl);
      }
      if (isEdit) {
        await updateProject(projectId, formData);
        router.push(`/showcase/${projectId}`);
      } else {
        await createProject(formData);
        router.refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/community?tab=showcase");
        }
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
          defaultValue={defaultValues?.title}
          className="mt-1.5"
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("description")}</label>
        <div className="mt-1.5">
          <RichEditor
            onChange={setDescription}
            placeholder={t("descriptionPlaceholder")}
            content={defaultValues?.description}
          />
        </div>
      </div>
      <ImageUpload
        value={imageUrl}
        onChange={setImageUrl}
        label={t("projectImage")}
        hint={t("projectImageHint")}
      />
      <div>
        <label className="text-sm font-medium">
          {t("githubUrl")}
        <span className="text-muted-foreground font-normal">{t("demoUrlOptional")}</span>
        </label>
        <div className="relative mt-1.5">
          <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="githubUrl"
            placeholder={t("githubUrlPlaceholder")}
            defaultValue={defaultValues?.githubUrl}
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
          defaultValue={defaultValues?.demoUrl || ""}
          className="mt-1.5"
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
          defaultValue={defaultValues?.tags.join(", ")}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !description.trim()}>
        {loading
          ? isEdit ? t("updating") : t("sharing")
          : isEdit ? t("updateButton") : t("submitButton")
        }
      </Button>
    </form>
  );
}

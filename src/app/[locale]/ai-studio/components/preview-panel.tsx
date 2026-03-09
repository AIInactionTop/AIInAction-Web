"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Save, Globe, Sparkles } from "lucide-react";
import { useAIStudioStore, type OutlineChallenge } from "@/stores/ai-studio-store";
import { saveAILearningPath } from "@/actions/ai-studio";
import { ChallengeEditor } from "./challenge-editor";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Props = {
  categories: Category[];
  locale: string;
  isDetailLoading: boolean;
  generatingChallengeId: string | null;
  onGenerateDetails: (challenge: OutlineChallenge) => void;
  onGenerateAll: () => void;
};

export function PreviewPanel({ categories, locale, isDetailLoading, generatingChallengeId, onGenerateDetails, onGenerateAll }: Props) {
  const t = useTranslations("aiStudio");
  const { pathOutline, phase, updatePathField, updateChallenge } = useAIStudioStore();
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedChallenges((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateDetail = (challenge: OutlineChallenge) => {
    setExpandedChallenges((prev) => new Set(prev).add(challenge.id));
    onGenerateDetails(challenge);
  };

  const handleSave = async (publish: boolean) => {
    if (!pathOutline) return;
    setSaving(true);
    try {
      await saveAILearningPath({
        title: pathOutline.title,
        description: pathOutline.description,
        icon: pathOutline.icon,
        color: pathOutline.color,
        categorySlug: pathOutline.categorySlug,
        isPublished: publish,
        locale,
        challenges: pathOutline.challenges.map((c) => ({
          title: c.title,
          description: c.description || c.summary,
          difficulty: c.difficulty,
          objectives: c.objectives || [],
          hints: c.hints || [],
          resources: c.resources || [],
          tags: c.tags || [],
          estimatedTime: c.estimatedTime || "",
          knowledgeContent: c.knowledgeContent || "",
          order: c.order,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!pathOutline) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{t("noOutline")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{pathOutline.icon}</span>
          <Input
            value={pathOutline.title}
            onChange={(e) => updatePathField("title", e.target.value)}
            className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
          />
        </div>
        <Input
          value={pathOutline.description}
          onChange={(e) => updatePathField("description", e.target.value)}
          className="text-sm text-muted-foreground border-none bg-transparent p-0 h-auto focus-visible:ring-0"
        />
        <div className="flex items-center gap-2">
          <select
            value={pathOutline.categorySlug}
            onChange={(e) => updatePathField("categorySlug", e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <Badge variant="secondary">
            {pathOutline.challenges.length} {t("challenges")}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pathOutline.challenges.map((challenge, index) => (
          <div key={challenge.id} className="rounded-lg border border-border">
            <button
              onClick={() => toggleExpand(challenge.id)}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
            >
              {expandedChallenges.has(challenge.id) ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {t("step")} {index + 1}
              </span>
              <span className="flex-1 font-medium">{challenge.title}</span>
              <Badge variant="outline" className="shrink-0">
                {challenge.difficulty}
              </Badge>
              {challenge.isDetailGenerated && (
                <Badge variant="secondary" className="shrink-0 text-green-600">
                  ✓
                </Badge>
              )}
            </button>

            {expandedChallenges.has(challenge.id) && (
              <div className="border-t border-border p-3">
                {challenge.isDetailGenerated ? (
                  <ChallengeEditor
                    challenge={challenge}
                    onChange={(updates) => updateChallenge(challenge.id, updates)}
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{challenge.summary}</p>
                    {isDetailLoading && generatingChallengeId === challenge.id ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t("generatingDetails")}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateDetail(challenge)}
                        disabled={isDetailLoading}
                      >
                        <Sparkles className="mr-2 h-3 w-3" />
                        {t("generateDetails")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4 flex gap-3">
        {phase === "outline-done" && (
          <Button onClick={onGenerateAll} className="flex-1">
            <Sparkles className="mr-2 h-4 w-4" />
            {t("generateDetails")}
          </Button>
        )}
        {phase === "generating-details" && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("generatingDetails")}
          </div>
        )}
        {(phase === "done" || pathOutline.challenges.some((c) => c.isDetailGenerated)) && (
          <>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              {t("saveDraft")}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1"
            >
              <Globe className="mr-2 h-4 w-4" />
              {t("publish")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

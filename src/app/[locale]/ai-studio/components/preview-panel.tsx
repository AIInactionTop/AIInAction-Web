"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Save, Globe, Sparkles } from "lucide-react";
import { useAIStudioStore, type OutlineChallenge } from "@/stores/ai-studio-store";
import { saveAILearningPath } from "@/actions/ai-studio";
import { ChallengeEditor } from "./challenge-editor";
import type { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Props = {
  categories: Category[];
  locale: string;
  detailChat: ReturnType<typeof useChat>;
  onGenerateDetails: (challenge: OutlineChallenge) => void;
};

function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function parseChallengeDetailFromText(text: string) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}

export function PreviewPanel({ categories, locale, detailChat, onGenerateDetails }: Props) {
  const t = useTranslations("aiStudio");
  const { pathOutline, phase, updatePathField, updateChallenge, setPhase } = useAIStudioStore();
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const generatingChallengeRef = useRef<string | null>(null);

  useEffect(() => {
    const lastAssistant = detailChat.messages
      .filter((m) => m.role === "assistant")
      .at(-1);
    if (!lastAssistant || !generatingChallengeRef.current) return;

    const detail = parseChallengeDetailFromText(getTextFromMessage(lastAssistant));
    if (detail) {
      updateChallenge(generatingChallengeRef.current, {
        description: detail.description,
        knowledgeContent: detail.knowledgeContent,
        objectives: detail.objectives,
        hints: detail.hints,
        resources: detail.resources,
        tags: detail.tags,
        estimatedTime: detail.estimatedTime,
        difficulty: detail.difficulty,
        isDetailGenerated: true,
      });
    }
  }, [detailChat.messages, updateChallenge]);

  const toggleExpand = (id: string) => {
    setExpandedChallenges((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateDetail = useCallback(
    (challenge: OutlineChallenge) => {
      generatingChallengeRef.current = challenge.id;
      setExpandedChallenges((prev) => new Set(prev).add(challenge.id));
      onGenerateDetails(challenge);
    },
    [onGenerateDetails]
  );

  const handleGenerateAll = useCallback(() => {
    if (!pathOutline) return;
    setPhase("generating-details");
    const ungenerated = pathOutline.challenges.filter((c) => !c.isDetailGenerated);
    if (ungenerated.length > 0) {
      handleGenerateDetail(ungenerated[0]);
    }
  }, [pathOutline, setPhase, handleGenerateDetail]);

  useEffect(() => {
    if (phase !== "generating-details" || (detailChat.status === "submitted" || detailChat.status === "streaming") || !pathOutline) return;

    const ungenerated = pathOutline.challenges.filter((c) => !c.isDetailGenerated);
    if (ungenerated.length > 0) {
      const timer = setTimeout(() => handleGenerateDetail(ungenerated[0]), 500);
      return () => clearTimeout(timer);
    } else {
      setPhase("done");
    }
  }, [phase, detailChat.status, pathOutline, handleGenerateDetail, setPhase]);

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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateDetail(challenge)}
                      disabled={(detailChat.status === "submitted" || detailChat.status === "streaming")}
                    >
                      {(detailChat.status === "submitted" || detailChat.status === "streaming") && generatingChallengeRef.current === challenge.id ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          {t("generatingDetails")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          {t("generateDetails")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4 flex gap-3">
        {phase === "outline-done" && (
          <Button onClick={handleGenerateAll} className="flex-1">
            <Sparkles className="mr-2 h-4 w-4" />
            {t("generateDetails")}
          </Button>
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

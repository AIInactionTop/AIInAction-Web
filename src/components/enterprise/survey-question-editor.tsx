"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StandardModule, QuestionDef } from "@/data/survey-modules";

type Props = {
  modules: StandardModule[];
  onChange: (modules: StandardModule[]) => void;
  locale: string;
};

export function SurveyQuestionEditor({ modules, onChange, locale }: Props) {
  const t = useTranslations("enterprise");
  const isZh = locale.startsWith("zh");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  function toggleExpanded(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }

  function updateModule(moduleIndex: number, updatedModule: StandardModule) {
    const updated = [...modules];
    updated[moduleIndex] = updatedModule;
    onChange(updated);
  }

  function updateQuestion(
    moduleIndex: number,
    questionIndex: number,
    updatedQuestion: QuestionDef,
  ) {
    const mod = modules[moduleIndex];
    const updatedQuestions = [...mod.questions];
    updatedQuestions[questionIndex] = updatedQuestion;
    updateModule(moduleIndex, { ...mod, questions: updatedQuestions });
  }

  function removeQuestion(moduleIndex: number, questionIndex: number) {
    const mod = modules[moduleIndex];
    const updatedQuestions = mod.questions.filter((_, i) => i !== questionIndex);
    updateModule(moduleIndex, { ...mod, questions: updatedQuestions });
  }

  function addQuestion(moduleIndex: number) {
    const mod = modules[moduleIndex];
    const id = crypto.randomUUID();
    const newQuestion: QuestionDef = {
      id: `custom_${id}`,
      type: "open",
      labelEn: "",
      labelZh: "",
      scorable: false,
    };
    updateModule(moduleIndex, {
      ...mod,
      questions: [...mod.questions, newQuestion],
    });
  }

  function moveQuestion(moduleIndex: number, fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= modules[moduleIndex].questions.length) return;
    const mod = modules[moduleIndex];
    const updatedQuestions = [...mod.questions];
    const [moved] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, moved);
    updateModule(moduleIndex, { ...mod, questions: updatedQuestions });
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, moduleIndex) => {
        const isExpanded = expandedModules.has(mod.id);
        return (
          <Card key={mod.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpanded(mod.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {isZh ? mod.nameZh : mod.nameEn}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isZh ? mod.descriptionZh : mod.descriptionEn} &middot;{" "}
                  {mod.questions.length} {t("questionsCount")}
                </div>
              </div>
            </button>

            {isExpanded && (
              <CardContent className="space-y-4 border-t pt-4">
                {mod.questions.map((question, questionIndex) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    questionIndex={questionIndex}
                    totalQuestions={mod.questions.length}
                    onChange={(updated) =>
                      updateQuestion(moduleIndex, questionIndex, updated)
                    }
                    onRemove={() => removeQuestion(moduleIndex, questionIndex)}
                    onMoveUp={() =>
                      moveQuestion(moduleIndex, questionIndex, questionIndex - 1)
                    }
                    onMoveDown={() =>
                      moveQuestion(moduleIndex, questionIndex, questionIndex + 1)
                    }
                  />
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion(moduleIndex)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addQuestion")}
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// -------- Single Question Editor --------

function QuestionEditor({
  question,
  questionIndex,
  totalQuestions,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  question: QuestionDef;
  questionIndex: number;
  totalQuestions: number;
  onChange: (updated: QuestionDef) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = useTranslations("enterprise");

  function updateField<K extends keyof QuestionDef>(
    field: K,
    value: QuestionDef[K],
  ) {
    onChange({ ...question, [field]: value });
  }

  function updateOption(
    optionIndex: number,
    field: string,
    value: string | number,
  ) {
    if (!question.options) return;
    const updated = [...question.options];
    updated[optionIndex] = { ...updated[optionIndex], [field]: value };
    onChange({ ...question, options: updated });
  }

  function addOption() {
    const newOption = {
      value: `opt_${Date.now()}`,
      labelEn: "",
      labelZh: "",
      score: 0,
    };
    onChange({
      ...question,
      options: [...(question.options || []), newOption],
    });
  }

  function removeOption(optionIndex: number) {
    if (!question.options) return;
    onChange({
      ...question,
      options: question.options.filter((_, i) => i !== optionIndex),
    });
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-start gap-2">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={questionIndex === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
            title="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={questionIndex === totalQuestions - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
            title="Move down"
          >
            ▼
          </button>
        </div>

        <div className="flex-1 space-y-3">
          {/* Question label (En) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {t("questionTextEn")}
            </Label>
            <Input
              value={question.labelEn}
              onChange={(e) => updateField("labelEn", e.target.value)}
              placeholder="Question text (English)"
            />
          </div>

          {/* Question label (Zh) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {t("questionTextZh")}
            </Label>
            <Input
              value={question.labelZh}
              onChange={(e) => updateField("labelZh", e.target.value)}
              placeholder="Question text (Chinese)"
            />
          </div>

          {/* Type display */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {t("questionType")}: <span className="font-medium">{t(question.type as "single" | "multiple" | "rating" | "open" | "number")}</span>
            </div>
            {question.scorable && (
              <div className="text-sm text-muted-foreground">
                {t("score")}: {question.maxScore ?? "—"}
              </div>
            )}
          </div>

          {/* Options editor for single/multiple/judgment */}
          {(question.type === "single" ||
            question.type === "multiple" ||
            question.type === "judgment") &&
            question.options && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("options")}
                </Label>
                {question.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={option.labelEn}
                      onChange={(e) =>
                        updateOption(optIndex, "labelEn", e.target.value)
                      }
                      placeholder="EN"
                      className="flex-1"
                    />
                    <Input
                      value={option.labelZh}
                      onChange={(e) =>
                        updateOption(optIndex, "labelZh", e.target.value)
                      }
                      placeholder="ZH"
                      className="flex-1"
                    />
                    {question.scorable && (
                      <Input
                        type="number"
                        value={option.score ?? 0}
                        onChange={(e) =>
                          updateOption(
                            optIndex,
                            "score",
                            Number(e.target.value),
                          )
                        }
                        className="w-20"
                        placeholder={t("optionScore")}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(optIndex)}
                      className="shrink-0 text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t("addOption")}
                </Button>
              </div>
            )}

          {/* Rating min/max editor */}
          {question.type === "rating" && (
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={question.min ?? 1}
                  onChange={(e) => updateField("min", Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  value={question.max ?? 5}
                  onChange={(e) => updateField("max", Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          )}

          {/* Number min/max editor */}
          {question.type === "number" && (
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={question.min ?? ""}
                  onChange={(e) =>
                    updateField(
                      "min",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="w-20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  value={question.max ?? ""}
                  onChange={(e) =>
                    updateField(
                      "max",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="w-20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Remove question button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

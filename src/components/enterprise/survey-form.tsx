"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { standardModules as defaultModules } from "@/data/survey-modules";
import type { StandardModule } from "@/data/survey-modules";
import { createSurvey, updateSurvey } from "@/actions/enterprise-surveys";
import { SurveyQuestionEditor } from "@/components/enterprise/survey-question-editor";
import type { CustomQuestion } from "@/types/enterprise";

type SurveyData = {
  id: string;
  title: string;
  description: string | null;
  standardModules: StandardModule[];
  customQuestions: CustomQuestion[] | null;
};

type Props = {
  orgSlug: string;
  locale: string;
  survey?: SurveyData;
};

export function SurveyForm({ orgSlug, locale, survey }: Props) {
  const t = useTranslations("enterprise");
  const [isPending, startTransition] = useTransition();

  const isZh = locale.startsWith("zh");

  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");

  // When editing, survey.standardModules is the full module definitions.
  // When creating, start with all default modules enabled.
  const [enabledModuleIds, setEnabledModuleIds] = useState<string[]>(() => {
    if (survey?.standardModules) {
      return survey.standardModules.map((m) => m.id);
    }
    return defaultModules.map((m) => m.id);
  });

  // Store the full module definitions (deep cloned from defaults or from survey)
  const [moduleDefinitions, setModuleDefinitions] = useState<
    Record<string, StandardModule>
  >(() => {
    const defs: Record<string, StandardModule> = {};
    if (survey?.standardModules) {
      // Editing: use the stored definitions
      for (const m of survey.standardModules) {
        defs[m.id] = JSON.parse(JSON.stringify(m));
      }
    }
    // Fill in any missing modules from defaults
    for (const m of defaultModules) {
      if (!defs[m.id]) {
        defs[m.id] = JSON.parse(JSON.stringify(m));
      }
    }
    return defs;
  });

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>(
    survey?.customQuestions ?? [],
  );

  // Build the enabled modules list from IDs + definitions
  const enabledModules = useMemo(() => {
    return enabledModuleIds
      .map((id) => moduleDefinitions[id])
      .filter(Boolean);
  }, [enabledModuleIds, moduleDefinitions]);

  function toggleModule(moduleId: string) {
    setEnabledModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  }

  function handleModulesChange(updatedModules: StandardModule[]) {
    const updated = { ...moduleDefinitions };
    for (const m of updatedModules) {
      updated[m.id] = m;
    }
    setModuleDefinitions(updated);
  }

  function addCustomQuestion() {
    setCustomQuestions((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        type: "open",
        question: "",
      },
    ]);
  }

  function updateCustomQuestion(
    index: number,
    field: keyof CustomQuestion,
    value: string,
  ) {
    setCustomQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  }

  function removeCustomQuestion(index: number) {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!title.trim()) return;

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description);
    // Always send full module definitions (not just IDs)
    formData.set("standardModules", JSON.stringify(enabledModules));
    formData.set(
      "customQuestions",
      JSON.stringify(customQuestions.filter((q) => q.question.trim())),
    );
    formData.set("locale", locale);

    startTransition(async () => {
      if (survey) {
        await updateSurvey(survey.id, formData);
      } else {
        await createSurvey(orgSlug, formData);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="title">{t("surveyTitle")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("surveyTitle")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("surveyDescription")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("surveyDescription")}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Standard Modules Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t("standardModules")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultModules.map((module) => (
            <div
              key={module.id}
              className="flex items-start gap-3 rounded-md border p-4"
            >
              <Checkbox
                id={`module-${module.id}`}
                checked={enabledModuleIds.includes(module.id)}
                onCheckedChange={() => toggleModule(module.id)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={`module-${module.id}`}
                  className="cursor-pointer font-medium"
                >
                  {isZh ? module.nameZh : module.nameEn}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isZh ? module.descriptionZh : module.descriptionEn}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(moduleDefinitions[module.id] || module).questions.length}{" "}
                  {t("questionsCount")}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Customize Questions in Enabled Modules */}
      {enabledModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("customizeQuestions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SurveyQuestionEditor
              modules={enabledModules}
              onChange={handleModulesChange}
              locale={locale}
            />
          </CardContent>
        </Card>
      )}

      {/* Custom Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("customQuestions")}</CardTitle>
            <Button variant="outline" size="sm" onClick={addCustomQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              {t("addQuestion")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {customQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("customQuestions")} — {t("addQuestion")}
            </p>
          ) : (
            customQuestions.map((question, index) => (
              <div
                key={question.id}
                className="flex items-start gap-3 rounded-md border p-4"
              >
                <div className="flex-1 space-y-3">
                  <Input
                    value={question.question}
                    onChange={(e) =>
                      updateCustomQuestion(index, "question", e.target.value)
                    }
                    placeholder={t("questionText")}
                  />
                  <Select
                    value={question.type}
                    onValueChange={(value) =>
                      updateCustomQuestion(index, "type", value)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("questionType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t("single")}</SelectItem>
                      <SelectItem value="multiple">{t("multiple")}</SelectItem>
                      <SelectItem value="rating">{t("rating")}</SelectItem>
                      <SelectItem value="open">{t("open")}</SelectItem>
                      <SelectItem value="number">{t("number")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomQuestion(index)}
                  className="shrink-0 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
          {survey ? t("save") : t("createSurvey")}
        </Button>
      </div>
    </div>
  );
}

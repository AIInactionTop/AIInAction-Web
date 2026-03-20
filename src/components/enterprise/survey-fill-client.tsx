"use client";

import { useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CheckCircle2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { submitSurveyResponse } from "@/actions/enterprise-surveys";
import type { StandardModule, QuestionDef } from "@/data/survey-modules";
import type { CustomQuestion, SurveyAnswers } from "@/types/enterprise";

type Props = {
  surveyId: string;
  surveyTitle: string;
  surveyDescription: string | null;
  orgName: string;
  orgLogo: string | null;
  modules: StandardModule[];
  customQuestions: CustomQuestion[] | null;
  locale: string;
  inviteToken?: string;
};

// Use a simple radio group component since we might not have RadioGroup from shadcn
// Actually we do have it listed — let me check. We don't see it in the ui folder.
// We'll implement radio and checkbox inline using standard HTML + shadcn styles.

export function SurveyFillClient({
  surveyId,
  surveyTitle,
  surveyDescription,
  orgName,
  orgLogo,
  modules,
  customQuestions,
  locale,
  inviteToken,
}: Props) {
  const t = useTranslations("enterprise");
  const isZh = locale.startsWith("zh");
  const [isPending, startTransition] = useTransition();

  // Total steps: modules + (custom questions step if any) + review step
  const hasCustom = customQuestions && customQuestions.length > 0;
  const totalSteps = modules.length + (hasCustom ? 1 : 0) + 1; // +1 for review
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers state
  const [moduleAnswers, setModuleAnswers] = useState<
    Record<string, Record<string, number | string | string[]>>
  >(() => {
    const init: Record<string, Record<string, number | string | string[]>> = {};
    for (const m of modules) {
      init[m.id] = {};
    }
    return init;
  });

  const [customAnswers, setCustomAnswers] = useState<
    Record<string, number | string | string[]>
  >({});

  const updateModuleAnswer = useCallback(
    (moduleId: string, questionId: string, value: number | string | string[]) => {
      setModuleAnswers((prev) => ({
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [questionId]: value,
        },
      }));
    },
    [],
  );

  const updateCustomAnswer = useCallback(
    (questionId: string, value: number | string | string[]) => {
      setCustomAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    },
    [],
  );

  const progressValue = Math.round(((currentStep + 1) / totalSteps) * 100);

  function goNext() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSubmit() {
    setError(null);
    const answers: SurveyAnswers = {
      modules: moduleAnswers,
    };
    if (hasCustom) {
      answers.custom = customAnswers;
    }

    const formData = new FormData();
    formData.set("answers", JSON.stringify(answers));
    if (inviteToken) {
      formData.set("inviteToken", inviteToken);
    }

    // Extract department and jobTitle from basicInfo module if available
    const basicInfo = moduleAnswers["basicInfo"];
    if (basicInfo) {
      if (basicInfo["department"])
        formData.set("department", String(basicInfo["department"]));
      if (basicInfo["jobTitle"])
        formData.set("jobTitle", String(basicInfo["jobTitle"]));
    }

    startTransition(async () => {
      try {
        await submitSurveyResponse(surveyId, formData);
        setSubmitted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submission failed");
      }
    });
  }

  // Thank you page
  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-16">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold">{t("thankYou")}</h2>
          <p className="text-center text-muted-foreground">
            {t("thankYouMessage")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine what to render at the current step
  const isModuleStep = currentStep < modules.length;
  const isCustomStep = hasCustom && currentStep === modules.length;
  const isReviewStep = currentStep === totalSteps - 1;

  return (
    <div className="space-y-6">
      {/* Survey Header */}
      <div className="flex items-center gap-3">
        {orgLogo ? (
          <Image
            src={orgLogo}
            alt={orgName}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{surveyTitle}</h1>
          <p className="text-sm text-muted-foreground">{orgName}</p>
        </div>
      </div>

      {surveyDescription && (
        <p className="text-muted-foreground">{surveyDescription}</p>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {t("step", { current: currentStep + 1, total: totalSteps })}
          </span>
          <span>{progressValue}%</span>
        </div>
        <Progress value={progressValue} />
      </div>

      {/* Module Step */}
      {isModuleStep && (
        <ModuleRenderer
          module={modules[currentStep]}
          answers={moduleAnswers[modules[currentStep].id] || {}}
          onAnswer={(qId, val) =>
            updateModuleAnswer(modules[currentStep].id, qId, val)
          }
          isZh={isZh}
        />
      )}

      {/* Custom Questions Step */}
      {isCustomStep && customQuestions && (
        <Card>
          <CardHeader>
            <CardTitle>{t("customQuestions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {customQuestions.map((q) => (
              <CustomQuestionRenderer
                key={q.id}
                question={q}
                value={customAnswers[q.id]}
                onChange={(val) => updateCustomAnswer(q.id, val)}
                isZh={isZh}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review Step */}
      {isReviewStep && (
        <Card>
          <CardHeader>
            <CardTitle>{t("review")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((m) => {
              const answers = moduleAnswers[m.id] || {};
              const answeredCount = Object.keys(answers).filter(
                (k) =>
                  answers[k] !== undefined &&
                  answers[k] !== "" &&
                  !(Array.isArray(answers[k]) && (answers[k] as string[]).length === 0),
              ).length;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <span className="font-medium">
                    {isZh ? m.nameZh : m.nameEn}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {answeredCount} / {m.questions.length}
                  </span>
                </div>
              );
            })}
            {hasCustom && customQuestions && (
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <span className="font-medium">{t("customQuestions")}</span>
                <span className="text-sm text-muted-foreground">
                  {
                    Object.keys(customAnswers).filter(
                      (k) =>
                        customAnswers[k] !== undefined &&
                        customAnswers[k] !== "",
                    ).length
                  }{" "}
                  / {customQuestions.length}
                </span>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          {t("previous")}
        </Button>
        {isReviewStep ? (
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? t("generating") : t("submitSurvey")}
          </Button>
        ) : (
          <Button onClick={goNext}>{t("next")}</Button>
        )}
      </div>
    </div>
  );
}

// -------- Module Renderer --------

function ModuleRenderer({
  module: mod,
  answers,
  onAnswer,
  isZh,
}: {
  module: StandardModule;
  answers: Record<string, number | string | string[]>;
  onAnswer: (questionId: string, value: number | string | string[]) => void;
  isZh: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? mod.nameZh : mod.nameEn}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isZh ? mod.descriptionZh : mod.descriptionEn}
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {mod.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onAnswer(q.id, val)}
            isZh={isZh}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// -------- Question Renderer --------

function QuestionRenderer({
  question,
  value,
  onChange,
  isZh,
}: {
  question: QuestionDef;
  value: number | string | string[] | undefined;
  onChange: (value: number | string | string[]) => void;
  isZh: boolean;
}) {
  const label = isZh ? question.labelZh : question.labelEn;

  switch (question.type) {
    case "rating":
      return (
        <RatingQuestion
          label={label}
          value={value as number | undefined}
          onChange={onChange}
          min={question.min ?? 1}
          max={question.max ?? 5}
        />
      );

    case "single":
    case "judgment":
      return (
        <SingleChoiceQuestion
          label={label}
          options={
            question.options?.map((o) => ({
              value: String(o.value),
              label: isZh ? o.labelZh : o.labelEn,
            })) ?? []
          }
          value={value as string | undefined}
          onChange={(v) => onChange(v)}
        />
      );

    case "multiple":
      return (
        <MultipleChoiceQuestion
          label={label}
          options={
            question.options?.map((o) => ({
              value: String(o.value),
              label: isZh ? o.labelZh : o.labelEn,
            })) ?? []
          }
          value={(value as string[] | undefined) ?? []}
          onChange={onChange}
        />
      );

    case "open":
      return (
        <OpenQuestion
          label={label}
          value={(value as string | undefined) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );

    case "number":
      return (
        <NumberQuestion
          label={label}
          value={value as number | undefined}
          onChange={(v) => onChange(v)}
          min={question.min}
          max={question.max}
        />
      );

    case "matrix":
      // Simplified: render as a rating question
      return (
        <RatingQuestion
          label={label}
          value={value as number | undefined}
          onChange={onChange}
          min={1}
          max={5}
        />
      );

    default:
      return null;
  }
}

// -------- Rating Question --------

function RatingQuestion({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  const numbers = [];
  for (let i = min; i <= max; i++) numbers.push(i);

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <div className="flex gap-2">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary hover:bg-primary/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// -------- Single Choice Question --------

function SingleChoiceQuestion({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <RadioGroup value={value ?? ""} onValueChange={onChange}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${label}-${option.value}`} />
            <Label
              htmlFor={`${label}-${option.value}`}
              className="cursor-pointer font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

// -------- Multiple Choice Question --------

function MultipleChoiceQuestion({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${label}-${option.value}`}
              checked={value.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
            />
            <Label
              htmlFor={`${label}-${option.value}`}
              className="cursor-pointer font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------- Open Question --------

function OpenQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

// -------- Number Question --------

function NumberQuestion({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-40"
      />
    </div>
  );
}

// -------- Custom Question Renderer --------

function CustomQuestionRenderer({
  question,
  value,
  onChange,
  isZh,
}: {
  question: CustomQuestion;
  value: number | string | string[] | undefined;
  onChange: (value: number | string | string[]) => void;
  isZh: boolean;
}) {
  const label = (isZh && question.questionZh) ? question.questionZh : question.question;

  switch (question.type) {
    case "rating":
      return (
        <RatingQuestion
          label={label}
          value={value as number | undefined}
          onChange={onChange}
          min={question.min ?? 1}
          max={question.max ?? 5}
        />
      );

    case "single":
      return (
        <SingleChoiceQuestion
          label={label}
          options={
            (isZh && question.optionsZh ? question.optionsZh : question.options)?.map(
              (o) => ({ value: o, label: o }),
            ) ?? []
          }
          value={value as string | undefined}
          onChange={(v) => onChange(v)}
        />
      );

    case "multiple":
      return (
        <MultipleChoiceQuestion
          label={label}
          options={
            (isZh && question.optionsZh ? question.optionsZh : question.options)?.map(
              (o) => ({ value: o, label: o }),
            ) ?? []
          }
          value={(value as string[] | undefined) ?? []}
          onChange={onChange}
        />
      );

    case "open":
      return (
        <OpenQuestion
          label={label}
          value={(value as string | undefined) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );

    case "number":
      return (
        <NumberQuestion
          label={label}
          value={value as number | undefined}
          onChange={(v) => onChange(v)}
          min={question.min}
          max={question.max}
        />
      );

    default:
      return (
        <OpenQuestion
          label={label}
          value={(value as string | undefined) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );
  }
}

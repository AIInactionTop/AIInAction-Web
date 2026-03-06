"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutlineChallenge } from "@/stores/ai-studio-store";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

type Props = {
  challenge: OutlineChallenge;
  onChange: (updates: Partial<OutlineChallenge>) => void;
};

export function ChallengeEditor({ challenge, onChange }: Props) {
  const t = useTranslations("aiStudio");
  const [editingKnowledge, setEditingKnowledge] = useState(false);

  const updateListItem = (
    field: "objectives" | "hints" | "resources",
    index: number,
    value: string
  ) => {
    const list = [...(challenge[field] || [])];
    list[index] = value;
    onChange({ [field]: list });
  };

  const addListItem = (field: "objectives" | "hints" | "resources") => {
    const list = [...(challenge[field] || []), ""];
    onChange({ [field]: list });
  };

  const removeListItem = (field: "objectives" | "hints" | "resources", index: number) => {
    const list = (challenge[field] || []).filter((_: string, i: number) => i !== index);
    onChange({ [field]: list });
  };

  return (
    <div className="space-y-4">
      <Input
        value={challenge.title}
        onChange={(e) => onChange({ title: e.target.value })}
        className="font-medium"
      />

      <textarea
        value={challenge.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        rows={2}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={challenge.difficulty}
          onChange={(e) => onChange({ difficulty: e.target.value as OutlineChallenge["difficulty"] })}
          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <Input
          value={challenge.estimatedTime || ""}
          onChange={(e) => onChange({ estimatedTime: e.target.value })}
          placeholder="Estimated time"
          className="w-32"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {(challenge.tags || []).map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => onChange({ tags: challenge.tags?.filter((_: string, idx: number) => idx !== i) })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t("knowledge")}</h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingKnowledge(!editingKnowledge)}
          >
            {editingKnowledge ? "Preview" : "Edit"}
          </Button>
        </div>
        {editingKnowledge ? (
          <textarea
            value={challenge.knowledgeContent || ""}
            onChange={(e) => onChange({ knowledgeContent: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y min-h-[200px]"
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-border p-3 bg-muted/30">
            <ReactMarkdown>{challenge.knowledgeContent || ""}</ReactMarkdown>
          </div>
        )}
      </div>

      <EditableList
        label={t("objectives")}
        items={challenge.objectives || []}
        onChange={(index, value) => updateListItem("objectives", index, value)}
        onAdd={() => addListItem("objectives")}
        onRemove={(index) => removeListItem("objectives", index)}
      />

      <EditableList
        label={t("hints")}
        items={challenge.hints || []}
        onChange={(index, value) => updateListItem("hints", index, value)}
        onAdd={() => addListItem("hints")}
        onRemove={(index) => removeListItem("hints", index)}
      />

      <EditableList
        label={t("resources")}
        items={challenge.resources || []}
        onChange={(index, value) => updateListItem("resources", index, value)}
        onAdd={() => addListItem("resources")}
        onRemove={(index) => removeListItem("resources", index)}
      />
    </div>
  );
}

function EditableList({
  label,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{label}</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              className="flex-1"
            />
            <button
              onClick={() => onRemove(index)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

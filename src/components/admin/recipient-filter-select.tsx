"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecipientFilter } from "@/lib/admin-emails";

const filterOptions: { value: RecipientFilter; label: string; description: string }[] = [
  { value: "all", label: "All Users", description: "All registered users with email" },
  { value: "active_30d", label: "Active (30 days)", description: "Users active in the last 30 days" },
  { value: "completed_challenge", label: "Completed Challenge", description: "Users who completed at least one challenge" },
  { value: "has_project", label: "Has Project", description: "Users who submitted a project" },
];

type Props = {
  value: RecipientFilter | "";
  onChange: (value: RecipientFilter) => void;
  recipientCount: number | null;
  loading: boolean;
};

export function RecipientFilterSelect({ value, onChange, recipientCount, loading }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Select Recipients</label>
      <Select value={value} onValueChange={(v) => onChange(v as RecipientFilter)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a recipient filter..." />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="font-medium">{opt.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <p className="text-sm text-muted-foreground">
          {loading ? "Counting recipients..." : `${recipientCount} recipients match this filter`}
        </p>
      )}
    </div>
  );
}

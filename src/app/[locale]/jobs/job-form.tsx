"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"] as const;
const LOCATION_TYPES = ["REMOTE", "ONSITE", "HYBRID"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "JPY", "CAD", "AUD"] as const;

type JobData = {
  id?: string;
  title?: string;
  description?: string;
  company?: string;
  companyUrl?: string | null;
  location?: string | null;
  locationType?: string;
  type?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  skills?: string[];
  contactEmail?: string | null;
  applyUrl?: string | null;
};

export function JobForm({
  action,
  defaultValues,
  submitLabel,
  locale,
}: {
  action: (formData: FormData) => void;
  defaultValues?: JobData;
  submitLabel: string;
  locale: string;
}) {
  const t = useTranslations("jobs");

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">
            {t("titleLabel")} <span className="text-red-500">*</span>
          </label>
          <Input
            name="title"
            required
            placeholder={t("titlePlaceholder")}
            defaultValue={defaultValues?.title || ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            {t("companyLabel")} <span className="text-red-500">*</span>
          </label>
          <Input
            name="company"
            required
            placeholder={t("companyPlaceholder")}
            defaultValue={defaultValues?.company || ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t("companyUrlLabel")}</label>
          <Input
            name="companyUrl"
            placeholder={t("companyUrlPlaceholder")}
            defaultValue={defaultValues?.companyUrl || ""}
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">
            {t("descriptionLabel")} <span className="text-red-500">*</span>
          </label>
          <Textarea
            name="description"
            required
            placeholder={t("descriptionPlaceholder")}
            defaultValue={defaultValues?.description || ""}
            className="mt-1.5"
            rows={8}
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t("typeLabel")}</label>
          <Select name="type" defaultValue={defaultValues?.type || "FULL_TIME"}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((jt) => (
                <SelectItem key={jt} value={jt}>{t(jt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">{t("locationTypeLabel")}</label>
          <Select name="locationType" defaultValue={defaultValues?.locationType || "REMOTE"}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((lt) => (
                <SelectItem key={lt} value={lt}>{t(lt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">{t("locationLabel")}</label>
          <Input
            name="location"
            placeholder={t("locationPlaceholder")}
            defaultValue={defaultValues?.location || ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t("salaryLabel")}</label>
          <div className="mt-1.5 flex gap-2">
            <Input
              name="salaryMin"
              type="number"
              placeholder={t("salaryMinPlaceholder")}
              defaultValue={defaultValues?.salaryMin ?? ""}
            />
            <span className="flex items-center text-muted-foreground">-</span>
            <Input
              name="salaryMax"
              type="number"
              placeholder={t("salaryMaxPlaceholder")}
              defaultValue={defaultValues?.salaryMax ?? ""}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">{t("currencyLabel")}</label>
          <Select name="salaryCurrency" defaultValue={defaultValues?.salaryCurrency || "USD"}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">{t("skillsLabel")}</label>
          <Input
            name="skills"
            placeholder={t("skillsPlaceholder")}
            defaultValue={defaultValues?.skills?.join(", ") || ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t("contactEmailLabel")}</label>
          <Input
            name="contactEmail"
            type="email"
            placeholder={t("contactEmailPlaceholder")}
            defaultValue={defaultValues?.contactEmail || ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t("applyUrlLabel")}</label>
          <Input
            name="applyUrl"
            placeholder={t("applyUrlPlaceholder")}
            defaultValue={defaultValues?.applyUrl || ""}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("applyUrlHint")}</p>
        </div>
      </div>

      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}

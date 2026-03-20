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
import { createOrganization } from "@/actions/enterprise-org";

const INDUSTRIES = [
  "TECHNOLOGY",
  "FINANCE",
  "HEALTHCARE",
  "EDUCATION",
  "MANUFACTURING",
  "RETAIL",
  "OTHER",
] as const;

const SIZES = [
  "SMALL_1_50",
  "MEDIUM_51_200",
  "LARGE_201_1000",
  "ENTERPRISE_1000_PLUS",
] as const;

export function OrgForm({ locale }: { locale: string }) {
  const t = useTranslations("enterprise");

  return (
    <form action={createOrganization} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className="text-sm font-medium">
          {t("orgName")} <span className="text-red-500">*</span>
        </label>
        <Input
          name="name"
          required
          placeholder={t("orgNamePlaceholder")}
          className="mt-1.5"
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("orgDescription")}</label>
        <Textarea
          name="description"
          placeholder={t("orgDescPlaceholder")}
          className="mt-1.5"
          rows={4}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">{t("industry")}</label>
          <Select name="industry" defaultValue="TECHNOLOGY">
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {t(ind)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">{t("orgSize")}</label>
          <Select name="size" defaultValue="SMALL_1_50">
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" size="lg">
        {t("create")}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createActivity, updateActivity } from "@/actions/activities";
import { useTranslations } from "next-intl";

type DefaultValues = {
  title: string;
  description: string;
  type: string;
  status: string;
  content: string | null;
  externalUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImage: string | null;
};

type Props = {
  defaultValues?: DefaultValues;
  activityId?: string;
};

export function ActivityForm({ defaultValues, activityId }: Props) {
  const isEdit = !!activityId;
  const t = useTranslations("activityForm");
  const ta = useTranslations("activities");

  const [type, setType] = useState(defaultValues?.type || "");

  const handleAction = isEdit
    ? updateActivity.bind(null, activityId!)
    : createActivity;

  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().split("T")[0];
  };

  return (
    <form action={handleAction} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
          {t("titleLabel")} {t("required")}
        </label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder={t("titlePlaceholder")}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
          {t("descriptionLabel")} {t("required")}
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={defaultValues?.description}
          placeholder={t("descriptionPlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Type + Status row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-1.5">
            {t("typeLabel")} {t("required")}
          </label>
          <select
            id="type"
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="" disabled>{t("selectType")}</option>
            <option value="HACKATHON">{ta("hackathon")}</option>
            <option value="THEMED">{ta("themed")}</option>
            <option value="EXTERNAL">{ta("external")}</option>
            <option value="GENERAL">{ta("general")}</option>
          </select>
        </div>

        {isEdit && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1.5">
              {t("statusLabel")}
            </label>
            <select
              id="status"
              name="status"
              defaultValue={defaultValues?.status || "DRAFT"}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="DRAFT">{ta("draft")}</option>
              <option value="UPCOMING">{ta("upcoming")}</option>
              <option value="ACTIVE">{ta("active")}</option>
              <option value="ENDED">{ta("ended")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1.5">
          {t("contentLabel")}
        </label>
        <textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={defaultValues?.content || ""}
          placeholder={t("contentPlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
        />
      </div>

      {/* External URL (conditional) */}
      {type === "EXTERNAL" && (
        <div>
          <label htmlFor="externalUrl" className="block text-sm font-medium mb-1.5">
            {t("externalUrlLabel")}
          </label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            defaultValue={defaultValues?.externalUrl || ""}
            placeholder={t("externalUrlPlaceholder")}
          />
        </div>
      )}

      {/* Date row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium mb-1.5">
            {t("startDateLabel")}
          </label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={formatDateForInput(defaultValues?.startDate || null)}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-1.5">
            {t("endDateLabel")}
          </label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={formatDateForInput(defaultValues?.endDate || null)}
          />
        </div>
      </div>

      {/* Cover Image */}
      <div>
        <label htmlFor="coverImage" className="block text-sm font-medium mb-1.5">
          {t("coverImageLabel")}
        </label>
        <Input
          id="coverImage"
          name="coverImage"
          type="url"
          defaultValue={defaultValues?.coverImage || ""}
          placeholder={t("coverImagePlaceholder")}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg">
          {isEdit ? t("updateButton") : t("createButton")}
        </Button>
      </div>
    </form>
  );
}

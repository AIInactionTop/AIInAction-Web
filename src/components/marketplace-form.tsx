"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMarketplaceItem, updateMarketplaceItem } from "@/actions/marketplace";
import { useTranslations } from "next-intl";

type DefaultValues = {
  title: string;
  description: string;
  longDescription: string | null;
  type: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  demoUrl: string | null;
  sourceUrl: string | null;
  tags: string[];
  features: string[];
};

type Props = {
  defaultValues?: DefaultValues;
  itemId?: string;
};

export function MarketplaceForm({ defaultValues, itemId }: Props) {
  const isEdit = !!itemId;
  const t = useTranslations("marketplaceForm");

  const [features, setFeatures] = useState<string[]>(
    defaultValues?.features.length ? defaultValues.features : [""]
  );

  const addFeature = () => setFeatures((prev) => [...prev, ""]);
  const removeFeature = (index: number) => setFeatures((prev) => prev.filter((_, i) => i !== index));
  const updateFeature = (index: number, value: string) =>
    setFeatures((prev) => prev.map((item, i) => (i === index ? value : item)));

  const handleAction = async (formData: FormData) => {
    if (isEdit) {
      formData.set("itemId", itemId!);
      await updateMarketplaceItem(formData);
    } else {
      await createMarketplaceItem(formData);
    }
  };

  return (
    <form action={handleAction} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
          {t("titleLabel")} *
        </label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder={t("titlePlaceholder")}
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-1.5">
          {t("typeLabel")} *
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue={defaultValues?.type || ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>{t("selectType")}</option>
          <option value="SKILL">{t("typeSkill")}</option>
          <option value="TEMPLATE">{t("typeTemplate")}</option>
          <option value="PRODUCT">{t("typeProduct")}</option>
          <option value="SERVICE">{t("typeService")}</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
          {t("descriptionLabel")} *
        </label>
        <textarea
          id="description"
          name="description"
          required
          defaultValue={defaultValues?.description}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Long Description */}
      <div>
        <label htmlFor="longDescription" className="block text-sm font-medium mb-1.5">
          {t("longDescriptionLabel")}
        </label>
        <textarea
          id="longDescription"
          name="longDescription"
          defaultValue={defaultValues?.longDescription || ""}
          placeholder={t("longDescriptionPlaceholder")}
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1.5">
            {t("priceLabel")}
          </label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues ? (defaultValues.price / 100).toFixed(2) : "0"}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("priceHint")}</p>
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium mb-1.5">
            {t("currencyLabel")}
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={defaultValues?.currency || "usd"}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="cny">CNY</option>
          </select>
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-1.5">
          {t("imageUrlLabel")}
        </label>
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={defaultValues?.imageUrl || ""}
          placeholder={t("imageUrlPlaceholder")}
        />
      </div>

      {/* Demo URL */}
      <div>
        <label htmlFor="demoUrl" className="block text-sm font-medium mb-1.5">
          {t("demoUrlLabel")}
        </label>
        <Input
          id="demoUrl"
          name="demoUrl"
          type="url"
          defaultValue={defaultValues?.demoUrl || ""}
          placeholder={t("demoUrlPlaceholder")}
        />
      </div>

      {/* Source URL */}
      <div>
        <label htmlFor="sourceUrl" className="block text-sm font-medium mb-1.5">
          {t("sourceUrlLabel")}
        </label>
        <Input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          defaultValue={defaultValues?.sourceUrl || ""}
          placeholder={t("sourceUrlPlaceholder")}
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium mb-1.5">
          {t("tagsLabel")}
        </label>
        <Input
          id="tags"
          name="tags"
          defaultValue={defaultValues?.tags.join(", ")}
          placeholder={t("tagsPlaceholder")}
        />
      </div>

      {/* Features */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t("featuresLabel")}</label>
        <div className="space-y-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                name="features"
                value={feature}
                onChange={(e) => updateFeature(i, e.target.value)}
                placeholder={t("featuresPlaceholder")}
              />
              {features.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(i)}
                  className="h-9 w-9 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addFeature}>
            <Plus className="h-3.5 w-3.5" />
            {t("addFeature")}
          </Button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg">
          {isEdit ? t("updateButton") : t("createButton")}
        </Button>
      </div>
    </form>
  );
}

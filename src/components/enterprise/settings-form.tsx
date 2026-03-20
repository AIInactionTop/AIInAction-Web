"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  updateOrganization,
  deleteOrganization,
} from "@/actions/enterprise-org";

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

type Org = {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  size: string;
  slug: string;
};

type Props = {
  org: Org;
  isOwner: boolean;
  locale: string;
};

export function SettingsForm({ org, isOwner, locale }: Props) {
  const t = useTranslations("enterprise");
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    formData.set("locale", locale);
    startTransition(async () => {
      await updateOrganization(org.id, formData);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteOrganization(org.id);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSave} className="space-y-6">
            <div>
              <label className="text-sm font-medium">
                {t("orgName")} <span className="text-red-500">*</span>
              </label>
              <Input
                name="name"
                required
                defaultValue={org.name}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("orgDescription")}
              </label>
              <Textarea
                name="description"
                defaultValue={org.description ?? ""}
                className="mt-1.5"
                rows={4}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">{t("industry")}</label>
                <Select name="industry" defaultValue={org.industry}>
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
                <Select name="size" defaultValue={org.size}>
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

            <Button type="submit" disabled={isPending}>
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("dangerZone")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("deleteOrgWarning")}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">{t("deleteOrg")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteOrgConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteOrgWarning")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

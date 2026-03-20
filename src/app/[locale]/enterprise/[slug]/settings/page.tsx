import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationMember,
} from "@/lib/enterprise";
import { SettingsForm } from "@/components/enterprise/settings-form";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("settings"),
  };
}

export default async function SettingsPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const member = await getOrganizationMember(org.id, session.user.id);
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    redirect(`/${locale}/enterprise/${slug}`);
  }

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <SettingsForm
      org={serialize({
        id: org.id,
        name: org.name,
        description: org.description,
        industry: org.industry,
        size: org.size,
        slug: org.slug,
      })}
      isOwner={member.role === "OWNER"}
      locale={locale}
    />
  );
}

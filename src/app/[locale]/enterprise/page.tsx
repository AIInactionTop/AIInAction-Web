import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/enterprise";
import { EnterpriseLanding } from "@/components/enterprise/enterprise-landing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function EnterprisePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const orgs = session?.user?.id
    ? await getUserOrganizations(session.user.id)
    : [];

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <EnterpriseLanding
      orgs={serialize(orgs)}
      isAuthenticated={!!session?.user}
    />
  );
}

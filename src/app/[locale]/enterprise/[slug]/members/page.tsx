import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationMembers,
  getOrganizationMember,
  getPendingInvites,
} from "@/lib/enterprise";
import { MembersClient } from "@/components/enterprise/members-client";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("members"),
  };
}

export default async function MembersPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const currentMember = await getOrganizationMember(org.id, session.user.id);
  if (!currentMember) return null;

  const [members, pendingInvites] = await Promise.all([
    getOrganizationMembers(org.id),
    getPendingInvites(org.id),
  ]);

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <MembersClient
      orgId={org.id}
      orgSlug={slug}
      members={serialize(members)}
      pendingInvites={serialize(pendingInvites)}
      currentUserRole={currentMember.role}
      locale={locale}
    />
  );
}

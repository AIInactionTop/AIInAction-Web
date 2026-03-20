import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getOrganizationBySlug, getOrganizationMember } from "@/lib/enterprise";
import { EnterpriseSidebar } from "@/components/enterprise/enterprise-sidebar";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  children: React.ReactNode;
};

export default async function EnterpriseOrgLayout({ params, children }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const member = await getOrganizationMember(org.id, session.user.id);
  if (!member) redirect(`/${locale}/enterprise`);

  const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row lg:px-8">
      <EnterpriseSidebar
        orgSlug={slug}
        orgName={org.name}
        memberRole={serialize(member.role)}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

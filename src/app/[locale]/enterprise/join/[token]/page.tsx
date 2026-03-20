import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AcceptInviteButton } from "@/components/enterprise/accept-invite-button";
import { Building2, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enterprise" });
  return {
    title: t("joinOrgTitle"),
  };
}

export default async function JoinPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: "enterprise" });

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true, slug: true } },
    },
  });

  // Determine error state
  let error: string | null = null;
  if (!invite) {
    error = t("inviteNotFound");
  } else if (invite.acceptedAt) {
    error = t("inviteAccepted");
  } else if (invite.expiresAt < new Date()) {
    error = t("inviteExpired");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">{t("joinOrgTitle")}</h1>
        <p className="mt-4 text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Building2 className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">{t("joinOrgTitle")}</h1>
      <p className="mt-4 text-lg">
        {invite!.organization.name}
      </p>
      <div className="mt-8">
        <AcceptInviteButton token={token} />
      </div>
    </div>
  );
}

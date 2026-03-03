import { getProjects } from "@/lib/challenges";
import { ShowcaseClient } from "./showcase-client";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "showcase" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function ShowcasePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { projects, total } = await getProjects();

  const session = await auth();
  let likedProjectIds: string[] = [];
  if (session?.user?.id) {
    const likes = await prisma.sharedProjectLike.findMany({
      where: { userId: session.user.id },
      select: { projectId: true },
    });
    likedProjectIds = likes.map((l) => l.projectId);
  }

  return (
    <ShowcaseClient
      projects={JSON.parse(JSON.stringify(projects))}
      total={total}
      likedProjectIds={likedProjectIds}
    />
  );
}

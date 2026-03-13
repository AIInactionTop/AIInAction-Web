import type { Metadata } from "next";
import { getProjects } from "@/lib/challenges";
import { getLeaderboard, getMembers } from "@/lib/gamification";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CommunityClient } from "./community-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "community" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("community");

  const session = await auth();

  const [{ projects, total }, xpBoard, streakBoard, members, likedProjectIds] =
    await Promise.all([
      getProjects(),
      getLeaderboard("xp", 50),
      getLeaderboard("streak", 50),
      getMembers("xp", 100),
      session?.user?.id
        ? prisma.sharedProjectLike
            .findMany({
              where: { userId: session.user.id },
              select: { projectId: true },
            })
            .then((likes) => likes.map((l) => l.projectId))
        : Promise.resolve([] as string[]),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialize = (data: any) => JSON.parse(JSON.stringify(data));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>

      <CommunityClient
        projects={serialize(projects)}
        totalProjects={total}
        likedProjectIds={likedProjectIds}
        xpBoard={serialize(xpBoard)}
        streakBoard={serialize(streakBoard)}
        members={serialize(members)}
      />
    </div>
  );
}

import { getChallenges, getAllPaths, getChallengesByPath } from "@/lib/challenges";
import { getActiveActivities, getUpcomingActivities } from "@/lib/activities";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LearnClient } from "./learn-client";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("learnTitle"),
    description: t("learnDescription"),
  };
}

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 1. Active & upcoming activities
  const [activeActivities, upcomingActivities] = await Promise.all([
    getActiveActivities(),
    getUpcomingActivities(),
  ]);
  const activities = [...activeActivities, ...upcomingActivities];

  // 2. Continue Learning (auth users only)
  const session = await auth();
  let inProgressChallenges: Array<Record<string, unknown>> = [];
  if (session?.user?.id) {
    const registrations = await prisma.challengeRegistration.findMany({
      where: {
        userId: session.user.id,
        challenge: {
          completions: {
            none: { userId: session.user.id, status: "COMPLETED" },
          },
        },
      },
      include: {
        challenge: {
          include: { category: true, path: true },
        },
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    });
    inProgressChallenges = registrations.map((r) => r.challenge);
  }

  // 3. Learning Paths with challenge counts
  const paths = await getAllPaths();
  const pathsWithCounts = await Promise.all(
    paths.map(async (path) => {
      const challenges = await getChallengesByPath(path.slug);
      return {
        slug: path.slug,
        title: path.title,
        description: path.description,
        icon: path.icon,
        color: path.color,
        order: path.order,
        challengeCount: challenges.length,
      };
    })
  );

  // 4. Popular Challenges
  const { challenges: popularChallenges } = await getChallenges(
    { sortBy: "likes", pageSize: 12 },
    locale
  );

  return (
    <LearnClient
      activities={JSON.parse(JSON.stringify(activities))}
      inProgressChallenges={JSON.parse(JSON.stringify(inProgressChallenges))}
      paths={JSON.parse(JSON.stringify(pathsWithCounts))}
      popularChallenges={JSON.parse(JSON.stringify(popularChallenges))}
    />
  );
}

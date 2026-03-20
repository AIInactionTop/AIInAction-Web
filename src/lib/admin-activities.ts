import { prisma } from "@/lib/prisma";
import type { ActivityStatus } from "@prisma/client";

export async function getAdminActivities() {
  return prisma.activity.findMany({
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { challenges: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAdminActivity(id: string) {
  return prisma.activity.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      challenges: {
        include: {
          challenge: {
            select: { id: true, slug: true, title: true, difficulty: true },
          },
        },
        orderBy: { order: "asc" },
      },
      translations: true,
    },
  });
}

export async function getActivityStats() {
  const [total, active, upcoming, ended] = await Promise.all([
    prisma.activity.count(),
    prisma.activity.count({ where: { status: "ACTIVE" } }),
    prisma.activity.count({ where: { status: "UPCOMING" } }),
    prisma.activity.count({ where: { status: "ENDED" } }),
  ]);
  return { total, active, upcoming, ended };
}

export async function searchChallenges(query: string, excludeIds: string[] = []) {
  return prisma.challenge.findMany({
    where: {
      title: { contains: query, mode: "insensitive" },
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: { id: true, slug: true, title: true, difficulty: true },
    take: 10,
    orderBy: { title: "asc" },
  });
}

export async function getNextChallengeOrder(activityId: string): Promise<number> {
  const last = await prisma.activityChallenge.findFirst({
    where: { activityId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

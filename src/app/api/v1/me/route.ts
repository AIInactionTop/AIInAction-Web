import { requireAuth, jsonSuccess } from "@/lib/api-auth";
import { getCreditBalanceSummary } from "@/lib/billing/service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const [stats, completionCount, challengeCount, credits] = await Promise.all([
    prisma.userStats.findUnique({
      where: { userId: user!.id },
    }),
    prisma.challengeCompletion.count({
      where: { userId: user!.id, status: "COMPLETED" },
    }),
    prisma.challenge.count({
      where: { authorId: user!.id },
    }),
    getCreditBalanceSummary(user!.id),
  ]);

  return jsonSuccess({
    ...user,
    stats: stats
      ? { xp: stats.xp, level: stats.level, currentStreak: stats.currentStreak }
      : { xp: 0, level: 1, currentStreak: 0 },
    completedChallenges: completionCount,
    publishedChallenges: challengeCount,
    credits,
  });
}

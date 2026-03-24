import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { XP_BY_DIFFICULTY } from "@/lib/xp";
import { awardXP, updateStreak } from "@/lib/gamification";
import { checkAndAwardAchievements } from "@/lib/achievements";
import type { Difficulty } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, difficulty: true },
  });

  if (!challenge) return jsonError("NOT_FOUND", "Challenge not found", 404);

  const userId = user!.id;

  const existing = await prisma.challengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });

  const alreadyCompleted = existing?.status === "COMPLETED";

  await prisma.challengeCompletion.upsert({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
    update: { status: "COMPLETED", completedAt: new Date() },
    create: {
      userId,
      challengeId: challenge.id,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  let xpGained = 0;
  if (!alreadyCompleted) {
    xpGained = XP_BY_DIFFICULTY[challenge.difficulty as Difficulty];
    await updateStreak(userId);
    await awardXP(userId, xpGained);
  }

  const newAchievements = await checkAndAwardAchievements(
    userId,
    "challenge_complete"
  );

  let achievementXP = 0;
  for (const a of newAchievements) achievementXP += a.xpReward;
  if (achievementXP > 0) {
    await awardXP(userId, achievementXP);
    xpGained += achievementXP;
  }

  return jsonSuccess({
    completed: true,
    alreadyCompleted,
    xpGained,
    achievements: newAchievements.map((a) => ({
      name: a.name,
      icon: a.icon,
      xpReward: a.xpReward,
    })),
  });
}

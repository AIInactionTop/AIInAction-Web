"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { XP_BY_DIFFICULTY } from "@/lib/xp";
import { awardXP, updateStreak } from "@/lib/gamification";
import { checkAndAwardAchievements } from "@/lib/achievements";
import type { Difficulty, AchievementRarity } from "@prisma/client";

export type CompletionResult = {
  xpGained: number;
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  levelTitle: string;
  levelColor: string;
  newAchievements: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
    rarity: AchievementRarity;
  }[];
};

export async function markComplete(
  challengeId: string
): Promise<CompletionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Check if user is registered
  const registration = await prisma.challengeRegistration.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  });
  if (!registration) throw new Error("Must register first");

  // Check if already completed
  const existing = await prisma.challengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  });

  const alreadyCompleted = existing?.status === "COMPLETED";

  await prisma.challengeCompletion.upsert({
    where: {
      userId_challengeId: { userId, challengeId },
    },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    create: {
      userId,
      challengeId,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { slug: true, difficulty: true },
  });

  // Award XP only if not already completed
  let xpGained = 0;
  let xpResult = {
    xp: 0,
    level: 1,
    leveledUp: false,
    newLevel: { level: 1, xpRequired: 0, title: "AI 新手", color: "#9CA3AF" },
  };

  if (!alreadyCompleted && challenge) {
    xpGained = XP_BY_DIFFICULTY[challenge.difficulty as Difficulty];
    await updateStreak(userId);
    xpResult = await awardXP(userId, xpGained);
  }

  // Check achievements regardless (streak might have updated)
  const newAchievements = await checkAndAwardAchievements(
    userId,
    "challenge_complete"
  );

  // Award bonus XP for achievements
  let achievementXP = 0;
  for (const a of newAchievements) {
    achievementXP += a.xpReward;
  }
  if (achievementXP > 0) {
    xpResult = await awardXP(userId, achievementXP);
    xpGained += achievementXP;
  }

  if (challenge) {
    revalidatePath(`/learn/challenges/${challenge.slug}`);
  }

  return {
    xpGained,
    newXP: xpResult.xp,
    newLevel: xpResult.newLevel.level,
    leveledUp: xpResult.leveledUp,
    levelTitle: xpResult.newLevel.title,
    levelColor: xpResult.newLevel.color,
    newAchievements,
  };
}

export async function saveReflection(
  challengeId: string,
  reflection: string,
  isPublic: boolean
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const completion = await prisma.challengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
    include: { challenge: { select: { slug: true } } },
  });

  if (!completion || completion.status !== "COMPLETED") {
    throw new Error("Challenge not completed");
  }

  await prisma.challengeCompletion.update({
    where: { userId_challengeId: { userId, challengeId } },
    data: { reflection, isPublic },
  });

  if (completion.challenge) {
    revalidatePath(`/learn/challenges/${completion.challenge.slug}`);
  }
}

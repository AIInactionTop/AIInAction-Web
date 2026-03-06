import { prisma } from "./prisma";
import { getLevelFromXP, type Level } from "./xp";

export async function awardXP(
  userId: string,
  amount: number
): Promise<{ xp: number; level: number; leveledUp: boolean; newLevel: Level }> {
  // Upsert stats if not exists, then atomically increment XP
  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: { userId, xp: amount, level: 1 },
    update: { xp: { increment: amount } },
  });

  const levelInfo = getLevelFromXP(stats.xp);
  const leveledUp = levelInfo.level > stats.level;

  // Update level if changed
  if (leveledUp) {
    await prisma.userStats.update({
      where: { userId },
      data: { level: levelInfo.level },
    });
  }

  return {
    xp: stats.xp,
    level: levelInfo.level,
    leveledUp,
    newLevel: levelInfo,
  };
}

export async function updateStreak(userId: string): Promise<void> {
  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: new Date() },
    update: {},
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (stats.lastActiveDate) {
    const lastActive = new Date(stats.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Same day, no streak update needed
      return;
    } else if (diffDays === 1) {
      // Consecutive day: streak +1
      const newStreak = stats.currentStreak + 1;
      const newLongest = Math.max(newStreak, stats.longestStreak);
      await prisma.userStats.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: new Date(),
        },
      });
    } else {
      // Gap: reset streak to 1
      await prisma.userStats.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActiveDate: new Date(),
        },
      });
    }
  } else {
    // First activity ever
    await prisma.userStats.update({
      where: { userId },
      data: {
        currentStreak: 1,
        longestStreak: Math.max(1, stats.longestStreak),
        lastActiveDate: new Date(),
      },
    });
  }
}

export type UserStatsWithLevel = {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  levelInfo: Level;
};

export async function getUserStats(
  userId: string
): Promise<UserStatsWithLevel> {
  const stats = await prisma.userStats.findUnique({ where: { userId } });

  if (!stats) {
    const defaultLevel = getLevelFromXP(0);
    return {
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      levelInfo: defaultLevel,
    };
  }

  // Check if streak has expired (last activity was more than 1 day ago)
  let currentStreak = stats.currentStreak;
  if (stats.lastActiveDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = new Date(stats.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 1) {
      currentStreak = 0;
    }
  }

  return {
    xp: stats.xp,
    level: stats.level,
    currentStreak,
    longestStreak: stats.longestStreak,
    lastActiveDate: stats.lastActiveDate,
    levelInfo: getLevelFromXP(stats.xp),
  };
}

export async function getCompletionHeatmap(
  userId: string,
  year?: number
): Promise<Record<string, number>> {
  const targetYear = year ?? new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  const completions = await prisma.challengeCompletion.findMany({
    where: {
      userId,
      status: "COMPLETED",
      completedAt: { gte: startDate, lte: endDate },
    },
    select: { completedAt: true },
  });

  const heatmap: Record<string, number> = {};
  for (const c of completions) {
    if (!c.completedAt) continue;
    const dateKey = c.completedAt.toISOString().split("T")[0];
    heatmap[dateKey] = (heatmap[dateKey] || 0) + 1;
  }

  return heatmap;
}

export type LeaderboardEntry = {
  userId: string;
  userName: string | null;
  userImage: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  levelInfo: Level;
};

export async function getLeaderboard(
  sortBy: "xp" | "streak" = "xp",
  limit = 50
): Promise<LeaderboardEntry[]> {
  const orderBy =
    sortBy === "streak"
      ? { currentStreak: "desc" as const }
      : { xp: "desc" as const };

  const stats = await prisma.userStats.findMany({
    orderBy,
    take: limit,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return stats.map((s) => ({
    userId: s.user.id,
    userName: s.user.name,
    userImage: s.user.image,
    xp: s.xp,
    level: s.level,
    currentStreak: s.currentStreak,
    levelInfo: getLevelFromXP(s.xp),
  }));
}

export async function getUserAchievements(userId: string) {
  const allAchievements = await prisma.achievement.findMany({
    orderBy: { createdAt: "asc" },
  });

  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, unlockedAt: true },
  });

  const unlockedMap = new Map(
    userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt])
  );

  return allAchievements.map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));
}
